const mongoose = require("mongoose");

const DIFFICULTIES = ["Easy", "Medium", "Tough"];
const STATUSES = ["queued", "reading", "grading", "completed", "failed"];
const IN_PROGRESS = ["queued", "reading", "grading"];
const LEGIBILITY = ["clear", "partial", "illegible", "missing"];
const CONFIDENCE = ["high", "medium", "low"];
const COVERAGE = ["full", "partial", "none"];

const KeyPointSchema = new mongoose.Schema(
  {
    point: { type: String, required: true },
    coverage: { type: String, enum: COVERAGE, default: "none" },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true, maxlength: 2000 },
  referenceAnswer: { type: String, required: true, maxlength: 8000 },
  maxMarks: { type: Number, required: true, min: 0.5, max: 100 },

  studentAnswer: { type: String, default: "" },
  answerFound: { type: Boolean, default: false },
  legibility: { type: String, enum: LEGIBILITY, default: "missing" },

  aiMarks: { type: Number, default: null },
  awardedMarks: { type: Number, default: null },
  overridden: { type: Boolean, default: false },
  teacherNote: { type: String, default: "" },

  feedback: { type: String, default: "" },
  keyPoints: { type: [KeyPointSchema], default: [] },
  strengths: { type: [String], default: [] },
  missingPoints: { type: [String], default: [] },
  confidence: { type: String, enum: CONFIDENCE, default: "medium" },
});

const EvaluationSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Set when the answer key came from a generated question paper.
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", default: null },
    title: { type: String, trim: true, required: true, maxlength: 120 },
    studentName: { type: String, trim: true, default: "", maxlength: 120 },
    difficulty: { type: String, enum: DIFFICULTIES, default: "Medium" },
    questions: { type: [QuestionSchema], default: [] },

    overall: {
      summary: { type: String, default: "" },
      strengths: { type: [String], default: [] },
      improvements: { type: [String], default: [] },
      integrityFlags: { type: [String], default: [] },
      sheetNotes: { type: String, default: "" },
    },

    status: { type: String, enum: STATUSES, default: "queued" },
    failureReason: { type: String, default: "" },
    files: [
      {
        _id: false,
        name: String,
        mimeType: String,
        size: Number,
      },
    ],
    model: { type: String, default: "" },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

EvaluationSchema.index({ owner: 1, createdAt: -1 });
EvaluationSchema.index({ status: 1, updatedAt: 1 });
EvaluationSchema.index({ owner: 1, assignment: 1 });

function summarizeScores(questions = []) {
  let awarded = 0;
  let max = 0;
  for (const q of questions) {
    max += q.maxMarks || 0;
    awarded += q.awardedMarks || 0;
  }
  const percentage = max > 0 ? Math.round((awarded / max) * 1000) / 10 : 0;
  return { awarded: Math.round(awarded * 2) / 2, max, percentage };
}

EvaluationSchema.methods.toClient = function toClient() {
  return {
    id: String(this._id),
    assignmentId: this.assignment ? String(this.assignment) : null,
    title: this.title,
    studentName: this.studentName,
    difficulty: this.difficulty,
    status: this.status,
    failureReason: this.failureReason || null,
    score: this.status === "completed" ? summarizeScores(this.questions) : null,
    questions: this.questions.map((q) => ({
      id: String(q._id),
      question: q.question,
      referenceAnswer: q.referenceAnswer,
      maxMarks: q.maxMarks,
      studentAnswer: q.studentAnswer,
      answerFound: q.answerFound,
      legibility: q.legibility,
      aiMarks: q.aiMarks,
      awardedMarks: q.awardedMarks,
      overridden: q.overridden,
      teacherNote: q.teacherNote,
      feedback: q.feedback,
      keyPoints: q.keyPoints.map((k) => ({ point: k.point, coverage: k.coverage })),
      strengths: q.strengths,
      missingPoints: q.missingPoints,
      confidence: q.confidence,
    })),
    overall: {
      summary: this.overall?.summary || "",
      strengths: this.overall?.strengths || [],
      improvements: this.overall?.improvements || [],
      integrityFlags: this.overall?.integrityFlags || [],
      sheetNotes: this.overall?.sheetNotes || "",
    },
    files: this.files,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    completedAt: this.completedAt || null,
  };
};

const Evaluation = mongoose.model("Evaluation", EvaluationSchema);

module.exports = Evaluation;
module.exports.DIFFICULTIES = DIFFICULTIES;
module.exports.IN_PROGRESS = IN_PROGRESS;
module.exports.LEGIBILITY = LEGIBILITY;
module.exports.CONFIDENCE = CONFIDENCE;
module.exports.COVERAGE = COVERAGE;
module.exports.summarizeScores = summarizeScores;
