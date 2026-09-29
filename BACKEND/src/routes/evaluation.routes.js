const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");
const Evaluation = require("../models/Evaluation");
const Assignment = require("../models/Assignment");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { detectMimeType } = require("../utils/fileType");
const { requireAuth } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimit");
const { parseOrThrow, validateBody } = require("../middleware/validate");
const { answerSheetUpload, MAX_TOTAL_BYTES } = require("../middleware/upload");
const gemini = require("../services/gemini");
const jobs = require("../services/evaluation.jobs");
const { logActivity } = require("../services/activity");

const router = express.Router();
router.use(requireAuth);

const halfStep = (value) => Number.isInteger(value * 2);

const marks = z.coerce
  .number()
  .min(0.5, "Each question must be worth at least 0.5 marks.")
  .max(100, "A question can be worth at most 100 marks.")
  .refine(halfStep, "Marks must be in steps of 0.5.");

const createSchema = z.object({
  title: z.string().trim().min(1, "Give this evaluation a title.").max(120),
  studentName: z.string().trim().max(120).optional().default(""),
  difficulty: z.enum(Evaluation.DIFFICULTIES).default("Medium"),
  assignmentId: z.string().optional().nullable(),
  questions: z
    .array(
      z.object({
        question: z.string().trim().min(3, "Each question needs some text.").max(2000),
        referenceAnswer: z.string().trim().min(1, "Each question needs a reference answer.").max(8000),
        maxMarks: marks,
      })
    )
    .min(1, "Add at least one question.")
    .max(60, "An evaluation can have at most 60 questions."),
});

const overrideSchema = z.object({
  awardedMarks: z.coerce.number().min(0).refine(halfStep, "Marks must be in steps of 0.5."),
  teacherNote: z.string().trim().max(1000).optional(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  assignment: z.string().optional(),
});

async function loadOwned(req) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound("Evaluation not found.");
  const evaluation = await Evaluation.findOne({ _id: id, owner: req.user._id });
  if (!evaluation) throw ApiError.notFound("Evaluation not found.");
  return evaluation;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, assignment } = parseOrThrow(listSchema, req.query);
    const filter = { owner: req.user._id };
    if (assignment && mongoose.isValidObjectId(assignment)) filter.assignment = assignment;

    const [items, total] = await Promise.all([
      Evaluation.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("title studentName difficulty status failureReason assignment questions.maxMarks questions.awardedMarks createdAt updatedAt completedAt"),
      Evaluation.countDocuments(filter),
    ]);

    await Promise.all(items.map((item) => jobs.failIfStale(item)));

    res.json({
      items: items.map((item) => ({
        id: String(item._id),
        assignmentId: item.assignment ? String(item.assignment) : null,
        title: item.title,
        studentName: item.studentName,
        difficulty: item.difficulty,
        status: item.status,
        failureReason: item.failureReason || null,
        questionCount: item.questions.length,
        score: item.status === "completed" ? Evaluation.summarizeScores(item.questions) : null,
        createdAt: item.createdAt,
        completedAt: item.completedAt || null,
      })),
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
  answerSheetUpload,
  asyncHandler(async (req, res) => {
    if (!gemini.isConfigured()) {
      throw ApiError.unavailable(
        "AI grading isn't configured on the server yet. Set GEMINI_API_KEY and restart the server.",
        "AI_NOT_CONFIGURED"
      );
    }
    if (!jobs.hasCapacity()) {
      throw ApiError.unavailable("The grader is busy right now. Please try again in a minute.", "BUSY");
    }

    let payload;
    try {
      payload = JSON.parse(req.body.payload || "{}");
    } catch {
      throw ApiError.badRequest('The "payload" field must be valid JSON.');
    }
    const data = parseOrThrow(createSchema, payload);

    let assignmentId = null;
    if (data.assignmentId) {
      const linked = mongoose.isValidObjectId(data.assignmentId)
        ? await Assignment.exists({ _id: data.assignmentId, owner: req.user._id })
        : null;
      if (!linked) throw ApiError.badRequest("The linked question paper no longer exists.");
      assignmentId = data.assignmentId;
    }

    const uploads = req.files || [];
    if (uploads.length === 0) throw ApiError.badRequest("Upload at least one page of the answer sheet.");

    const totalBytes = uploads.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new ApiError(413, `All files together must be ${MAX_TOTAL_BYTES / 1024 / 1024} MB or smaller.`);
    }

    const files = uploads.map((file) => {
      const mimeType = detectMimeType(file.buffer);
      if (!mimeType) {
        throw ApiError.badRequest(`"${file.originalname}" doesn't look like a JPG, PNG, WEBP or PDF file.`);
      }
      return { name: file.originalname, mimeType, size: file.size, buffer: file.buffer };
    });

    const evaluation = await Evaluation.create({
      owner: req.user._id,
      assignment: assignmentId,
      title: data.title,
      studentName: data.studentName,
      difficulty: data.difficulty,
      questions: data.questions,
      files: files.map(({ name, mimeType, size }) => ({ name: name.slice(0, 200), mimeType, size })),
      status: "queued",
    });

    jobs.enqueue(evaluation._id, files);
    void logActivity(req.user, "evaluation.created", {
      ...jobs.activityEntity(evaluation),
      meta: { questions: data.questions.length, pages: files.length },
    });

    res.status(202).location(`/api/evaluations/${evaluation._id}`).json({ evaluation: evaluation.toClient() });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const evaluation = await loadOwned(req);
    await jobs.failIfStale(evaluation);
    res.set("Cache-Control", "no-store");
    res.json({ evaluation: evaluation.toClient() });
  })
);

router.patch(
  "/:id/questions/:questionId",
  validateBody(overrideSchema),
  asyncHandler(async (req, res) => {
    const evaluation = await loadOwned(req);
    if (evaluation.status !== "completed") {
      throw ApiError.conflict("Scores can be adjusted once grading has finished.");
    }

    const question = evaluation.questions.id(req.params.questionId);
    if (!question) throw ApiError.notFound("Question not found.");

    const { awardedMarks, teacherNote } = req.body;
    if (awardedMarks > question.maxMarks) {
      throw ApiError.badRequest(`This question is worth at most ${question.maxMarks} marks.`);
    }

    const previous = question.awardedMarks;
    question.awardedMarks = awardedMarks;
    question.overridden = awardedMarks !== question.aiMarks;
    if (teacherNote !== undefined) question.teacherNote = teacherNote;
    await evaluation.save();
    if (previous !== awardedMarks) {
      void logActivity(req.user, "evaluation.mark_adjusted", {
        ...jobs.activityEntity(evaluation),
        meta: {
          question: evaluation.questions.indexOf(question) + 1,
          from: previous,
          to: awardedMarks,
          max: question.maxMarks,
        },
      });
    }

    res.json({ evaluation: evaluation.toClient() });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const evaluation = await loadOwned(req);
    await evaluation.deleteOne();
    const score = evaluation.status === "completed" ? Evaluation.summarizeScores(evaluation.questions) : null;
    void logActivity(req.user, "evaluation.deleted", {
      ...jobs.activityEntity(evaluation),
      meta: score ? { awarded: score.awarded, max: score.max, percentage: score.percentage } : {},
    });
    res.status(204).end();
  })
);

module.exports = router;
