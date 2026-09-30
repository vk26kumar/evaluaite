const express = require("express");
const { z } = require("zod");
const User = require("../models/User");
const Evaluation = require("../models/Evaluation");
const Assignment = require("../models/Assignment");
const Activity = require("../models/Activity");
const AuthCode = require("../models/AuthCode");
const EmailToken = require("../models/EmailToken");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { accountLimiter, verificationLimiter } = require("../middleware/rateLimit");
const { parseOrThrow, validateBody } = require("../middleware/validate");
const { logActivity } = require("../services/activity");
const { signSessionToken } = require("../services/token.service");
const accountEmail = require("../services/accountEmail.service");
const { passwordSchema: newPassword, assertNotPersonal, hashPassword, verifyPassword } = require("../utils/password");
const { buildStudentReport, evaluationStats, studentKey } = require("../services/profile.service");
const { generateCodes } = require("../services/recoveryCodes.service");

const router = express.Router();
router.use(requireAuth);

const MAX_SHEETS_FOR_STATS = 5000;

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
  newPassword,
});

const activitySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(["all", "assignment", "evaluation", "slides", "account"]).default("all"),
});

const deleteSchema = z.object({
  confirm: z.literal("DELETE", { message: 'Type "DELETE" to confirm.' }),
  password: z.string().max(128).optional(),
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
  accountLimiter,
  validateBody(passwordSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("+password");
    const { currentPassword, newPassword } = req.body;

    if (user.password) {
      if (!currentPassword || !(await verifyPassword(currentPassword, user.password))) {
        throw ApiError.badRequest("Your current password is incorrect.", [
          { field: "currentPassword", message: "Your current password is incorrect." },
        ]);
      }
      if (await verifyPassword(newPassword, user.password)) {
        throw ApiError.badRequest("Choose a password you haven't used here before.", [
          { field: "newPassword", message: "Choose a different password from your current one." },
        ]);
      }
    }

    assertNotPersonal(newPassword, user.email, "newPassword");

    const hadPassword = Boolean(user.password);
    user.password = await hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    void logActivity(req.user, "account.password_changed", { kind: "account", meta: { added: !hadPassword } });
    if (hadPassword) accountEmail.inBackground(() => accountEmail.sendPasswordChanged(user));
    res.json({ user: user.toPublic(), token: signSessionToken(user) });
  })
);

router.post(
  "/sessions/revoke",
  accountLimiter,
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } }, { new: true });
    void logActivity(req.user, "account.sessions_revoked", { kind: "account" });
    res.json({ token: signSessionToken(user) });
  })
);

const recoveryCodesSchema = z.object({ password: z.string().max(128).optional() });

router.get(
  "/recovery-codes",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("+recoveryCodes");
    res.json({ remaining: user.recoveryCodes?.length || 0, createdAt: user.recoveryCodesCreatedAt || null });
  })
);

router.post(
  "/recovery-codes",
  accountLimiter,
  validateBody(recoveryCodesSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("+password");
    if (user.password && !(await verifyPassword(req.body.password || "", user.password))) {
      throw ApiError.badRequest("Your password is incorrect.", [{ field: "password", message: "Your password is incorrect." }]);
    }

    const { codes, hashes } = generateCodes();
    const createdAt = new Date();
    await User.updateOne({ _id: user._id }, { $set: { recoveryCodes: hashes, recoveryCodesCreatedAt: createdAt } });
    void logActivity(req.user, "account.recovery_codes_created", { kind: "account" });
    res.json({ codes, remaining: codes.length, createdAt });
  })
);

router.post(
  "/email/verification",
  verificationLimiter,
  asyncHandler(async (req, res) => {
    if (req.user.emailVerified) return res.json({ sent: false, alreadyVerified: true });
    if (!accountEmail.isEnabled()) {
      throw ApiError.unavailable("Email isn't set up on this server yet.", "EMAIL_NOT_CONFIGURED");
    }
    const sent = await accountEmail.sendVerification(req.user);
    if (!sent) throw new ApiError(502, "We couldn't send the email just now. Please try again shortly.", { code: "EMAIL_FAILED" });
    res.json({ sent: true });
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
  accountLimiter,
  validateBody(deleteSchema),
  asyncHandler(async (req, res) => {
    const owner = req.user._id;
    const user = await User.findById(owner).select("+password");
    if (user.password && !(await verifyPassword(req.body.password || "", user.password))) {
      throw ApiError.badRequest("Your password is incorrect.", [{ field: "password", message: "Your password is incorrect." }]);
    }

    await Promise.all([
      Evaluation.deleteMany({ owner }),
      Assignment.deleteMany({ owner }),
      Activity.deleteMany({ user: owner }),
      AuthCode.deleteMany({ user: owner }),
      EmailToken.deleteMany({ user: owner }),
    ]);
    await User.deleteOne({ _id: owner });
    res.status(204).end();
  })
);

module.exports = router;
