const config = require("../config/env");
const Assignment = require("../models/Assignment");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const gemini = require("./gemini");
const jobQueue = require("./jobQueue");
const { logActivity } = require("./activity");
const { generatePaper } = require("./questionPaper.service");

const { IN_PROGRESS } = Assignment;

function enqueue(assignmentId, { file, referenceText, regenerate = false } = {}) {
  jobQueue.enqueue(`assignment:${assignmentId}`, () =>
    runJob({ assignmentId: String(assignmentId), file, referenceText, regenerate })
  );
}

function hasPaper(assignment) {
  return assignment.paper?.sections?.some((section) => section.questions.length > 0);
}

async function runJob({ assignmentId, file, referenceText, regenerate }) {
  const assignment = await Assignment.findById(assignmentId).select("+reference.notes");
  if (!assignment) return;

  const moved = await Assignment.updateOne(
    { _id: assignmentId, status: { $in: IN_PROGRESS } },
    { $set: { status: "generating" } }
  );
  if (moved.matchedCount === 0) return;

  const entity = { kind: "assignment", id: assignment._id, title: assignment.title };

  try {
    const avoid = regenerate
      ? assignment.paper.sections.flatMap((section) => section.questions.map((q) => q.text)).slice(0, 60)
      : [];
    const meta = {};
    const result = await generatePaper(assignment.toObject(), {
      file,
      referenceText: referenceText || assignment.reference?.notes || "",
      avoid,
      meta,
    });

    const update = {
      status: "completed",
      failureReason: "",
      paper: result.paper,
      totalQuestions: result.totalQuestions,
      totalMarks: result.totalMarks,
      model: meta.model || gemini.modelName(),
      generatedAt: new Date(),
    };
    if (result.sourceNotes) update["reference.notes"] = result.sourceNotes;

    const saved = await Assignment.updateOne(
      { _id: assignmentId, status: "generating" },
      { $set: update, $inc: { generationCount: 1 } },
      { runValidators: true }
    );
    if (saved.modifiedCount > 0) {
      void logActivity(assignment.owner, regenerate ? "assignment.regenerated" : "assignment.generated", {
        ...entity,
        meta: { questions: result.totalQuestions, marks: result.totalMarks },
      });
    }
    logger.info("Question paper generated", { assignmentId, questions: result.totalQuestions });
  } catch (err) {
    const reason =
      err instanceof ApiError ? err.message : "Generating the paper failed unexpectedly. Please try again.";
    if (!(err instanceof ApiError)) {
      logger.error("Question paper generation failed", { assignmentId, error: logger.serializeError(err) });
    }

    const keepPrevious = regenerate && hasPaper(assignment);
    await Assignment.updateOne(
      { _id: assignmentId },
      {
        $set: keepPrevious
          ? { status: "completed", failureReason: `Couldn't create a new version: ${reason} The previous version is kept.` }
          : { status: "failed", failureReason: reason },
      }
    );
    void logActivity(assignment.owner, "assignment.failed", { ...entity, meta: { reason } });
  }
}

async function failIfStale(assignment) {
  const stale =
    IN_PROGRESS.includes(assignment.status) &&
    Date.now() - new Date(assignment.updatedAt).getTime() > config.jobs.staleAfterMs;
  if (!stale) return false;
  const keep = hasPaper(assignment);
  const update = keep
    ? { status: "completed", failureReason: "A new version was interrupted. The previous version is kept." }
    : { status: "failed", failureReason: "Generation was interrupted before it finished. Please try again." };
  const result = await Assignment.updateOne(
    { _id: assignment._id, status: { $in: IN_PROGRESS }, updatedAt: assignment.updatedAt },
    { $set: update }
  );
  if (result.modifiedCount === 0) return false;
  Object.assign(assignment, update);
  return true;
}

async function recoverInterruptedJobs() {
  const stuck = await Assignment.find({ status: { $in: IN_PROGRESS } }).select("paper.sections.questions._id");
  for (const assignment of stuck) {
    const keep = hasPaper(assignment);
    await Assignment.updateOne(
      { _id: assignment._id },
      {
        $set: keep
          ? { status: "completed", failureReason: "A new version was interrupted. The previous version is kept." }
          : { status: "failed", failureReason: "Generation was interrupted before it finished. Please try again." },
      }
    );
  }
  if (stuck.length > 0) logger.warn("Recovered interrupted question papers", { count: stuck.length });
}

module.exports = { enqueue, recoverInterruptedJobs, failIfStale, hasCapacity: jobQueue.hasCapacity };
