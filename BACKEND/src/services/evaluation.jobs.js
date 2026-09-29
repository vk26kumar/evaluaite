const config = require("../config/env");
const Evaluation = require("../models/Evaluation");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const gemini = require("./gemini");
const jobQueue = require("./jobQueue");
const { logActivity } = require("./activity");
const { transcribeSheet, gradeTranscription } = require("./grading.service");

const { IN_PROGRESS, summarizeScores } = Evaluation;
const INTERRUPTED_REASON = "Grading was interrupted before it finished. Please submit the answer sheet again.";

function enqueue(evaluationId, files) {
  jobQueue.enqueue(`evaluation:${evaluationId}`, () => runJob({ evaluationId: String(evaluationId), files }));
}

async function setStatus(id, status) {
  const result = await Evaluation.updateOne({ _id: id, status: { $in: IN_PROGRESS } }, { $set: { status } });
  return result.matchedCount > 0;
}

function activityEntity(evaluation) {
  return {
    kind: "evaluation",
    id: evaluation._id,
    title: evaluation.studentName ? `${evaluation.title} · ${evaluation.studentName}` : evaluation.title,
  };
}

async function runJob({ evaluationId, files }) {
  const evaluation = await Evaluation.findById(evaluationId);
  if (!evaluation) return;

  const keyQuestions = evaluation.questions.map((q) => ({
    question: q.question,
    referenceAnswer: q.referenceAnswer,
    maxMarks: q.maxMarks,
  }));

  try {
    const readMeta = {};
    const gradeMeta = {};
    if (!(await setStatus(evaluationId, "reading"))) return;
    const transcription = await transcribeSheet(keyQuestions, files, readMeta);

    if (!(await setStatus(evaluationId, "grading"))) return;
    const { questions, overall } = await gradeTranscription(keyQuestions, transcription, evaluation.difficulty, gradeMeta);
    const models = [...new Set([readMeta.model, gradeMeta.model].filter(Boolean))];

    const withIds = questions.map((q, index) => ({ ...q, _id: evaluation.questions[index]._id }));

    const saved = await Evaluation.updateOne(
      { _id: evaluationId, status: "grading" },
      {
        $set: {
          questions: withIds,
          overall,
          status: "completed",
          failureReason: "",
          model: models.join(" + ") || gemini.modelName(),
          completedAt: new Date(),
        },
      },
      { runValidators: true }
    );
    if (saved.modifiedCount > 0) {
      const score = summarizeScores(questions);
      void logActivity(evaluation.owner, "evaluation.completed", {
        ...activityEntity(evaluation),
        meta: { awarded: score.awarded, max: score.max, percentage: score.percentage },
      });
    }
    logger.info("Evaluation graded", { evaluationId, questions: questions.length });
  } catch (err) {
    const reason =
      err instanceof ApiError ? err.message : "Grading failed unexpectedly. Please try submitting the sheet again.";
    if (!(err instanceof ApiError)) {
      logger.error("Evaluation failed", { evaluationId, error: logger.serializeError(err) });
    }
    await Evaluation.updateOne({ _id: evaluationId }, { $set: { status: "failed", failureReason: reason } });
    void logActivity(evaluation.owner, "evaluation.failed", { ...activityEntity(evaluation), meta: { reason } });
  }
}

function isStale(evaluation) {
  return (
    IN_PROGRESS.includes(evaluation.status) &&
    Date.now() - new Date(evaluation.updatedAt).getTime() > config.jobs.staleAfterMs
  );
}

async function failIfStale(evaluation) {
  if (!isStale(evaluation)) return false;
  const result = await Evaluation.updateOne(
    { _id: evaluation._id, status: { $in: IN_PROGRESS }, updatedAt: evaluation.updatedAt },
    { $set: { status: "failed", failureReason: INTERRUPTED_REASON } }
  );
  if (result.modifiedCount === 0) return false;
  evaluation.status = "failed";
  evaluation.failureReason = INTERRUPTED_REASON;
  return true;
}

async function recoverInterruptedJobs() {
  const result = await Evaluation.updateMany(
    { status: { $in: IN_PROGRESS } },
    { $set: { status: "failed", failureReason: INTERRUPTED_REASON } }
  );
  if (result.modifiedCount > 0) {
    logger.warn("Marked interrupted evaluations as failed", { count: result.modifiedCount });
  }
}

module.exports = {
  enqueue,
  hasCapacity: jobQueue.hasCapacity,
  stats: jobQueue.stats,
  failIfStale,
  recoverInterruptedJobs,
  activityEntity,
};
