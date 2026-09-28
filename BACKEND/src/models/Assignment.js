const mongoose = require("mongoose");
const { QUESTION_TYPE_KEYS, DIFFICULTY_MIXES, DIFFICULTY_LEVELS } = require("../constants/questionTypes");

const STATUSES = ["queued", "generating", "completed", "failed"];
const IN_PROGRESS = ["queued", "generating"];

const SectionConfigSchema = new mongoose.Schema(
  {
    type: { type: String, enum: QUESTION_TYPE_KEYS, required: true },
    count: { type: Number, required: true, min: 1, max: 50 },
    marks: { type: Number, required: true, min: 0.5, max: 25 },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  text: { type: String, required: true, maxlength: 3000 },
  difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: "Moderate" },
  marks: { type: Number, required: true },
  options: { type: [String], default: [] },
  answer: { type: String, default: "", maxlength: 4000 },
});

const SectionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPE_KEYS, required: true },
    title: { type: String, required: true },
    instruction: { type: String, default: "" },
    questions: { type: [QuestionSchema], default: [] },
  },
  { _id: false }
);

const AssignmentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, trim: true, required: true, maxlength: 120 },
    subject: { type: String, trim: true, required: true, maxlength: 80 },
    className: { type: String, trim: true, required: true, maxlength: 40 },
    schoolName: { type: String, trim: true, default: "", maxlength: 120 },
    dueDate: { type: Date, default: null },
    timeAllowed: { type: String, trim: true, default: "45 minutes", maxlength: 40 },
    difficultyMix: { type: String, enum: Object.keys(DIFFICULTY_MIXES), default: "balanced" },
    questionTypes: {
      type: [SectionConfigSchema],
      validate: [(value) => value.length >= 1 && value.length <= 7, "Use 1 to 7 question types."],
    },
    additionalInstructions: { type: String, trim: true, default: "", maxlength: 1500 },

    // The uploaded file itself is never stored. The model's condensed notes on
    // it are kept so the paper can be regenerated from the same material.
    reference: {
      name: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
      notes: { type: String, default: "", select: false },
    },

    status: { type: String, enum: STATUSES, default: "queued" },
    failureReason: { type: String, default: "" },
    paper: {
      generalInstructions: { type: [String], default: [] },
      sections: { type: [SectionSchema], default: [] },
      notes: { type: String, default: "" },
    },
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },

    model: { type: String, default: "" },
    generatedAt: { type: Date },
    generationCount: { type: Number, default: 0 },
    duplicatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", default: null },
  },
  { timestamps: true }
);

AssignmentSchema.index({ owner: 1, createdAt: -1 });
AssignmentSchema.index({ status: 1, updatedAt: 1 });

AssignmentSchema.methods.toClient = function toClient({ includeAnswers = true } = {}) {
  return {
    id: String(this._id),
    title: this.title,
    subject: this.subject,
    className: this.className,
    schoolName: this.schoolName,
    dueDate: this.dueDate,
    timeAllowed: this.timeAllowed,
    difficultyMix: this.difficultyMix,
    questionTypes: this.questionTypes.map(({ type, count, marks }) => ({ type, count, marks })),
    additionalInstructions: this.additionalInstructions,
    reference: this.reference?.name
      ? { name: this.reference.name, mimeType: this.reference.mimeType, size: this.reference.size }
      : null,
    status: this.status,
    failureReason: this.failureReason || null,
    paper:
      this.status === "completed"
        ? {
            generalInstructions: this.paper.generalInstructions,
            notes: this.paper.notes || "",
            sections: this.paper.sections.map((section) => ({
              label: section.label,
              type: section.type,
              title: section.title,
              instruction: section.instruction,
              questions: section.questions.map((q) => ({
                id: String(q._id),
                number: q.number,
                text: q.text,
                difficulty: q.difficulty,
                marks: q.marks,
                options: q.options,
                ...(includeAnswers ? { answer: q.answer } : {}),
              })),
            })),
          }
        : null,
    totalQuestions: this.totalQuestions,
    totalMarks: this.totalMarks,
    generatedAt: this.generatedAt || null,
    generationCount: this.generationCount,
    duplicatedFrom: this.duplicatedFrom ? String(this.duplicatedFrom) : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/** Totals from the requested structure, used before a paper exists. */
function plannedTotals(questionTypes) {
  let questions = 0;
  let marks = 0;
  for (const row of questionTypes) {
    questions += row.count;
    marks += row.count * row.marks;
  }
  return { totalQuestions: questions, totalMarks: Math.round(marks * 2) / 2 };
}

const Assignment = mongoose.model("Assignment", AssignmentSchema);

module.exports = Assignment;
module.exports.IN_PROGRESS = IN_PROGRESS;
module.exports.plannedTotals = plannedTotals;
