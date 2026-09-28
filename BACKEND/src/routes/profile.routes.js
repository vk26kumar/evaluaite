const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");
const Evaluation = require("../models/Evaluation");
const Assignment = require("../models/Assignment");
const Activity = require("../models/Activity");
const AuthCode = require("../models/AuthCode");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const { parseOrThrow, validateBody } = require("../middleware/validate");
const { logActivity } = require("../services/activity");
const { buildStudentReport, evaluationStats, studentKey } = require("../services/profile.service");

const router = express.Router();
router.use(requireAuth);

const BCRYPT_ROUNDS = 12;
const MAX_SHEETS_FOR_STATS = 5000;

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use at least one letter and one number.");

const updateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
    institution: z.string().trim().max(120),
    designation: z.string().trim().max(80),
    subjects: z.array(z.string().trim().min(1).max(40)).max(10, "Add at most 10 subjects."),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update.");

const passwordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: password,
});

const activitySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(["all", "assignment", "evaluation", "slides", "account"]).default("all"),
});

const deleteSchema = z.object({
  confirm: z.literal("DELETE", { message: 'Type "DELETE" to confirm.' }),
});

async function publicProfile(userId) {
  const user = await User.findById(userId).select("+password");
  return user.toPublic();
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const owner = req.user._id;
    const [user, evaluations, assignmentGroups, activityCounts] = await Promise.all([
      publicProfile(owner),
      Evaluation.find({ owner })
        .sort({ createdAt: -1 })
        .limit(MAX_SHEETS_FOR_STATS)
        .select("status studentName questions.maxMarks questions.awardedMarks createdAt")
        .lean(),
      Assignment.aggregate([
        { $match: { owner } },
        { $group: { _id: "$status", count: { $sum: 1 }, questions: { $sum: "$totalQuestions" } } },
      ]),
      Activity.aggregate([
        { $match: { user: owner, type: { $in: ["slides.generated", "evaluation.mark_adjusted"] } } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = Object.fromEntries(assignmentGroups.map((group) => [group._id, group]));
    const countOf = (type) => activityCounts.find((row) => row._id === type)?.count || 0;

    res.json({
      user,
      stats: {
        evaluations: evaluationStats(evaluations),
        assignments: {
          total: assignmentGroups.reduce((sum, group) => sum + group.count, 0),
          completed: byStatus.completed?.count || 0,
          questionsGenerated: byStatus.completed?.questions || 0,
        },
        slidesGenerated: countOf("slides.generated"),
        marksAdjusted: countOf("evaluation.mark_adjusted"),
      },
    });
  })
);

router.patch(
  "/",
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    if (updates.subjects) updates.subjects = [...new Set(updates.subjects)];
    await User.updateOne({ _id: req.user._id }, { $set: updates }, { runValidators: true });
    void logActivity(req.user, "account.updated", { kind: "account", meta: { fields: Object.keys(updates) } });
    res.json({ user: await publicProfile(req.user._id) });
  })
);

router.post(
  "/password",
  authLimiter,
  validateBody(passwordSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("+password");
    const { currentPassword, newPassword } = req.body;

    // Google-only accounts can add a password without a current one.
    if (user.password) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        throw ApiError.badRequest("Your current password is incorrect.", [
          { field: "currentPassword", message: "Your current password is incorrect." },
        ]);
      }
      if (await bcrypt.compare(newPassword, user.password)) {
        throw ApiError.badRequest("Choose a password you haven't used here before.", [
          { field: "newPassword", message: "Choose a different password from your current one." },
        ]);
      }
    }

    const hadPassword = Boolean(user.password);
    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await user.save();
    void logActivity(req.user, "account.password_changed", { kind: "account", meta: { added: !hadPassword } });
    res.json({ user: user.toPublic() });
  })
);

router.get(
  "/activity",
  asyncHandler(async (req, res) => {
    const { page, limit, category } = parseOrThrow(activitySchema, req.query);
    const filter = { user: req.user._id };
    if (category !== "all") filter.type = new RegExp(`^${category}\\.`);

    const [items, total] = await Promise.all([
      Activity.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Activity.countDocuments(filter),
    ]);

    // Tell the client which items still exist, so it only links to live ones.
    const idsOf = (kind) => items.filter((item) => item.entity?.kind === kind && item.entity.id).map((item) => item.entity.id);
    const [liveAssignments, liveEvaluations] = await Promise.all([
      Assignment.find({ _id: { $in: idsOf("assignment") }, owner: req.user._id }).distinct("_id"),
      Evaluation.find({ _id: { $in: idsOf("evaluation") }, owner: req.user._id }).distinct("_id"),
    ]);
    const live = new Set([...liveAssignments, ...liveEvaluations].map(String));

    res.json({
      items: items.map((item) => {
        const entry = item.toClient();
        if (entry.entity?.id) entry.entity.exists = live.has(entry.entity.id);
        return entry;
      }),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  })
);

router.get(
  "/students",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? studentKey(req.query.search).slice(0, 80) : "";
    const evaluations = await Evaluation.find({ owner: req.user._id, status: "completed" })
      .sort({ createdAt: -1 })
      .limit(MAX_SHEETS_FOR_STATS)
      .select("title studentName assignment questions.maxMarks questions.awardedMarks createdAt")
      .lean();

    const report = buildStudentReport(evaluations);
    const students = search ? report.students.filter((student) => student.key.includes(search)) : report.students;
    res.json({ students, unnamedSheets: report.unnamedSheets, totalStudents: report.students.length });
  })
);

router.delete(
  "/",
  authLimiter,
  validateBody(deleteSchema),
  asyncHandler(async (req, res) => {
    const owner = req.user._id;
    await Promise.all([
      Evaluation.deleteMany({ owner }),
      Assignment.deleteMany({ owner }),
      Activity.deleteMany({ user: owner }),
      AuthCode.deleteMany({ user: owner }),
    ]);
    await User.deleteOne({ _id: owner });
    res.status(204).end();
  })
);

module.exports = router;
