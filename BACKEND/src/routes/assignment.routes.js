const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { z } = require("zod");
const Assignment = require("../models/Assignment");
const Evaluation = require("../models/Evaluation");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { detectMimeType } = require("../utils/fileType");
const { slugify } = require("../utils/text");
const { requireAuth } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimit");
const { parseOrThrow, validateBody } = require("../middleware/validate");
const { QUESTION_TYPE_KEYS, DIFFICULTY_MIXES } = require("../constants/questionTypes");
const gemini = require("../services/gemini");
const jobs = require("../services/assignment.jobs");
const { logActivity } = require("../services/activity");
const { renderPaperPdf } = require("../services/paperPdf.service");

const router = express.Router();
router.use(requireAuth);

const MAX_TOTAL_QUESTIONS = 60;
const MAX_REFERENCE_TEXT = 30_000;

const referenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5, fieldSize: 64 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest("Reference material must be a PDF, an image (JPG, PNG, WEBP) or a .txt file."));
  },
}).single("file");

const halfStep = (value) => Number.isInteger(value * 2);
const optionalText = (max) => z.string().trim().max(max).optional().default("");

const dueDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid due date." });
      return z.NEVER;
    }
    return date;
  });

const details = {
  title: z.string().trim().min(1, "Give the paper a title.").max(120),
  subject: z.string().trim().min(1, "Enter the subject.").max(80),
  className: z.string().trim().min(1, "Enter the class or level.").max(40),
  schoolName: optionalText(120),
  dueDate,
  timeAllowed: z.string().trim().min(1, "Enter the time allowed.").max(40).default("45 minutes"),
};

const createSchema = z
  .object({
    ...details,
    difficultyMix: z.enum(Object.keys(DIFFICULTY_MIXES)).default("balanced"),
    questionTypes: z
      .array(
        z.object({
          type: z.enum(QUESTION_TYPE_KEYS),
          count: z.coerce.number().int().min(1, "At least 1 question.").max(50, "At most 50 questions per type."),
          marks: z.coerce
            .number()
            .min(0.5, "At least 0.5 marks.")
            .max(25, "At most 25 marks per question.")
            .refine(halfStep, "Marks must be in steps of 0.5."),
        })
      )
      .min(1, "Add at least one question type.")
      .max(7, "Use at most 7 question types."),
    additionalInstructions: optionalText(1500),
  })
  .refine((data) => data.questionTypes.reduce((sum, row) => sum + row.count, 0) <= MAX_TOTAL_QUESTIONS, {
    message: `A paper can have at most ${MAX_TOTAL_QUESTIONS} questions.`,
    path: ["questionTypes"],
  });

const editSchema = z.object(details).partial();

const questionEditSchema = z
  .object({
    text: z.string().trim().min(3, "The question needs some text.").max(3000).optional(),
    options: z.array(z.string().trim().min(1).max(300)).length(4, "Multiple choice needs exactly 4 options.").optional(),
    answer: z.string().trim().max(4000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Nothing to update.");

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(80).optional(),
  status: z.enum(["queued", "generating", "completed", "failed"]).optional(),
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function loadOwned(req, { withNotes = false } = {}) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound("Assignment not found.");
  const query = Assignment.findOne({ _id: id, owner: req.user._id });
  const assignment = await (withNotes ? query.select("+reference.notes") : query);
  if (!assignment) throw ApiError.notFound("Assignment not found.");
  return assignment;
}

function requireAi() {
  if (!gemini.isConfigured()) {
    throw ApiError.unavailable(
      "AI generation isn't configured on the server yet. Set GEMINI_API_KEY and restart the server.",
      "AI_NOT_CONFIGURED"
    );
  }
  if (!jobs.hasCapacity()) {
    throw ApiError.unavailable("The generator is busy right now. Please try again in a minute.", "BUSY");
  }
}

function readReference(file) {
  if (!file) return {};
  if (file.mimetype === "text/plain") {
    const text = file.buffer.toString("utf8");
    if (text.includes("\u0000") || text.includes("�")) {
      throw ApiError.badRequest(`"${file.originalname}" isn't a readable text file.`);
    }
    return {
      referenceText: text.slice(0, MAX_REFERENCE_TEXT),
      meta: { name: file.originalname.slice(0, 200), mimeType: "text/plain", size: file.size },
    };
  }
  const mimeType = detectMimeType(file.buffer);
  if (!mimeType) throw ApiError.badRequest(`"${file.originalname}" doesn't look like a PDF or image file.`);
  return {
    file: { buffer: file.buffer, mimeType },
    meta: { name: file.originalname.slice(0, 200), mimeType, size: file.size },
  };
}

const entityOf = (assignment) => ({ kind: "assignment", id: assignment._id, title: assignment.title });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, search, status } = parseOrThrow(listSchema, req.query);
    const filter = { owner: req.user._id };
    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: pattern }, { subject: pattern }, { className: pattern }];
    }

    const [items, total] = await Promise.all([
      Assignment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-paper.sections.questions.answer"),
      Assignment.countDocuments(filter),
    ]);

    await Promise.all(items.map((item) => jobs.failIfStale(item)));

    const counts = await Evaluation.aggregate([
      { $match: { owner: req.user._id, assignment: { $in: items.map((item) => item._id) } } },
      { $group: { _id: "$assignment", count: { $sum: 1 } } },
    ]);
    const gradedBy = new Map(counts.map((row) => [String(row._id), row.count]));

    res.json({
      items: items.map((item) => {
        const full = item.toClient({ includeAnswers: false });
        const { paper, additionalInstructions, ...summary } = full;
        return { ...summary, sheetsGraded: gradedBy.get(full.id) || 0 };
      }),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  })
);

router.post(
  "/",
  aiLimiter,
  referenceUpload,
  asyncHandler(async (req, res) => {
    requireAi();

    let payload;
    try {
      payload = JSON.parse(req.body.payload || "{}");
    } catch {
      throw ApiError.badRequest('The "payload" field must be valid JSON.');
    }
    const data = parseOrThrow(createSchema, payload);
    const reference = readReference(req.file);

    const assignment = await Assignment.create({
      ...data,
      schoolName: data.schoolName || req.user.institution || "",
      owner: req.user._id,
      reference: reference.meta || undefined,
      ...Assignment.plannedTotals(data.questionTypes),
      status: "queued",
    });

    jobs.enqueue(assignment._id, { file: reference.file, referenceText: reference.referenceText });
    void logActivity(req.user, "assignment.created", {
      ...entityOf(assignment),
      meta: { subject: assignment.subject, className: assignment.className, questions: assignment.totalQuestions },
    });

    res.status(202).location(`/api/assignments/${assignment._id}`).json({ assignment: assignment.toClient() });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const assignment = await loadOwned(req);
    await jobs.failIfStale(assignment);
    res.set("Cache-Control", "no-store");
    res.json({ assignment: assignment.toClient() });
  })
);

router.patch(
  "/:id",
  validateBody(editSchema),
  asyncHandler(async (req, res) => {
    const assignment = await loadOwned(req);
    Object.assign(assignment, req.body);
    await assignment.save();
    void logActivity(req.user, "assignment.edited", { ...entityOf(assignment), meta: { fields: Object.keys(req.body) } });
    res.json({ assignment: assignment.toClient() });
  })
);

router.patch(
  "/:id/questions/:questionId",
  validateBody(questionEditSchema),
  asyncHandler(async (req, res) => {
    const assignment = await loadOwned(req);
    if (assignment.status !== "completed") throw ApiError.conflict("Questions can be edited once the paper is ready.");

    let target = null;
    let section = null;
    for (const candidate of assignment.paper.sections) {
      const found = candidate.questions.id(req.params.questionId);
      if (found) {
        target = found;
        section = candidate;
        break;
      }
    }
    if (!target) throw ApiError.notFound("Question not found.");
    if (req.body.options && section.type !== "mcq") {
      throw ApiError.badRequest("Only multiple choice questions have options.");
    }

    Object.assign(target, req.body);
    await assignment.save();
    void logActivity(req.user, "assignment.edited", {
      ...entityOf(assignment),
      meta: { question: target.number, fields: Object.keys(req.body) },
    });
    res.json({ assignment: assignment.toClient() });
  })
);

router.post(
  "/:id/regenerate",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const assignment = await loadOwned(req);
    requireAi();
    if (Assignment.IN_PROGRESS.includes(assignment.status)) {
      throw ApiError.conflict("This paper is already being generated.");
    }

    assignment.status = "queued";
    assignment.failureReason = "";
    await assignment.save();
    jobs.enqueue(assignment._id, { regenerate: true });

    res.status(202).json({ assignment: assignment.toClient() });
  })
);

router.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const source = await loadOwned(req, { withNotes: true });
    if (source.status !== "completed") throw ApiError.conflict("Only a finished paper can be copied.");

    const { _id, createdAt, updatedAt, owner, duplicatedFrom, ...fields } = source.toObject();
    const copy = await Assignment.create({
      ...fields,
      owner: req.user._id,
      title: `Copy of ${source.title}`.slice(0, 120),
      duplicatedFrom: source._id,
      generationCount: 0,
      failureReason: "",
      paper: {
        ...fields.paper,
        sections: fields.paper.sections.map((section) => ({
          ...section,
          questions: section.questions.map(({ _id: questionId, ...question }) => question),
        })),
      },
    });

    void logActivity(req.user, "assignment.duplicated", {
      ...entityOf(copy),
      meta: { sourceId: String(source._id), sourceTitle: source.title },
    });
    res.status(201).json({ assignment: copy.toClient() });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const assignment = await loadOwned(req);
    await assignment.deleteOne();
    await Evaluation.updateMany({ owner: req.user._id, assignment: assignment._id }, { $set: { assignment: null } });
    void logActivity(req.user, "assignment.deleted", {
      ...entityOf(assignment),
      meta: { questions: assignment.totalQuestions, subject: assignment.subject },
    });
    res.status(204).end();
  })
);

router.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const assignment = await loadOwned(req);
    if (assignment.status !== "completed") throw ApiError.conflict("The paper isn't ready yet.");
    const variant = req.query.variant === "teacher" ? "teacher" : "student";

    const buffer = await renderPaperPdf(assignment.toObject(), { variant });
    const base = slugify(`${assignment.title}-${assignment.className}`) || "question-paper";
    const fileName = `${base}${variant === "teacher" ? "-answer-key" : ""}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": buffer.length,
      "Cache-Control": "no-store",
    });
    res.send(buffer);
  })
);

router.get(
  "/:id/evaluations",
  asyncHandler(async (req, res) => {
    const assignment = await loadOwned(req);
    const evaluations = await Evaluation.find({ owner: req.user._id, assignment: assignment._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .select("title studentName status questions.maxMarks questions.awardedMarks createdAt completedAt");

    res.json({
      items: evaluations.map((item) => ({
        id: String(item._id),
        studentName: item.studentName,
        status: item.status,
        score: item.status === "completed" ? Evaluation.summarizeScores(item.questions) : null,
        createdAt: item.createdAt,
      })),
    });
  })
);

module.exports = router;
