import { readStorage, writeStorage } from "../../lib/storage";

export const MAX_QUESTIONS = 60;
const DRAFT_KEY = "evaluaite.answer-key-draft";

let nextId = 0;
export function newQuestion(values = {}) {
  nextId += 1;
  return { id: `q-${Date.now().toString(36)}-${nextId}`, question: "", referenceAnswer: "", maxMarks: 5, ...values };
}

/** Turns questions from a saved evaluation back into editable ones. */
export function fromEvaluation(evaluation) {
  return {
    title: evaluation.title,
    difficulty: evaluation.difficulty,
    assignment: evaluation.assignmentId ? { id: evaluation.assignmentId, title: evaluation.title } : null,
    questions: evaluation.questions.map(({ question, referenceAnswer, maxMarks }) =>
      newQuestion({ question, referenceAnswer, maxMarks })
    ),
  };
}

/**
 * Builds a grading answer key from a generated question paper. Options are
 * kept in the question text so the grader knows what "B" means, and the
 * paper's answer becomes the model answer.
 */
export function fromAssignment(assignment) {
  const letters = ["A", "B", "C", "D"];
  return {
    title: assignment.title,
    difficulty: "Medium",
    assignment: { id: assignment.id, title: assignment.title },
    questions: assignment.paper.sections.flatMap((section) =>
      section.questions.map((q) =>
        newQuestion({
          question: q.options.length
            ? `${q.text}\n${q.options.map((option, index) => `${letters[index]}) ${option}`).join("\n")}`
            : q.text,
          referenceAnswer: q.answer || "",
          maxMarks: q.marks,
        })
      )
    ),
  };
}

export function loadDraft() {
  const draft = readStorage(DRAFT_KEY);
  if (!draft || !Array.isArray(draft.questions) || draft.questions.length === 0) return null;
  return {
    title: typeof draft.title === "string" ? draft.title : "",
    difficulty: ["Easy", "Medium", "Tough"].includes(draft.difficulty) ? draft.difficulty : "Medium",
    assignment: draft.assignment?.id ? { id: String(draft.assignment.id), title: String(draft.assignment.title || "") } : null,
    questions: draft.questions.slice(0, MAX_QUESTIONS).map((q) =>
      newQuestion({
        question: String(q.question || ""),
        referenceAnswer: String(q.referenceAnswer || ""),
        maxMarks: Number(q.maxMarks) || 5,
      })
    ),
  };
}

export function saveDraft({ title, difficulty, questions, assignment = null }) {
  const hasContent = title.trim() || questions.some((q) => q.question.trim() || q.referenceAnswer.trim());
  writeStorage(
    DRAFT_KEY,
    hasContent
      ? {
          title,
          difficulty,
          assignment,
          questions: questions.map(({ question, referenceAnswer, maxMarks }) => ({ question, referenceAnswer, maxMarks })),
        }
      : null
  );
}

export function clearDraft() {
  writeStorage(DRAFT_KEY, null);
}

/** Mirrors the server's rules so problems show up before uploading. */
export function validate({ title, questions, pages, totalBytes, maxTotalBytes }) {
  const errors = { questions: {} };

  if (!title.trim()) errors.title = "Give this evaluation a title, e.g. “Unit 3 test”.";
  if (pages.length === 0) errors.pages = "Add at least one page of the answer sheet.";
  else if (totalBytes > maxTotalBytes) errors.pages = "The pages are too large together. Remove one or use smaller files.";

  for (const q of questions) {
    const e = {};
    if (q.question.trim().length < 3) e.question = "Type the question.";
    if (!q.referenceAnswer.trim()) e.referenceAnswer = "Add a model answer, or draft one with AI.";
    const marks = Number(q.maxMarks);
    if (!Number.isFinite(marks) || marks < 0.5 || marks > 100 || !Number.isInteger(marks * 2)) {
      e.maxMarks = "Marks must be between 0.5 and 100, in steps of 0.5.";
    }
    if (Object.keys(e).length) errors.questions[q.id] = e;
  }

  const hasErrors = Boolean(errors.title || errors.pages || Object.keys(errors.questions).length);
  return hasErrors ? errors : null;
}
