const ApiError = require("../utils/ApiError");
const { cleanString, cleanList, pickEnum } = require("../utils/text");
const { QUESTION_TYPES, DIFFICULTY_LEVELS } = require("../constants/questionTypes");
const gemini = require("./gemini");
const { QUESTION_PAPER_SYSTEM, QUESTION_PAPER_SCHEMA, buildQuestionPaperPrompt } = require("../prompts/questionPaper");

const OPTION_LABEL = /^\s*(?:\(?[A-Da-d][).:]|\(?[ivx]+[).])\s+/;

function cleanOptions(options) {
  return (Array.isArray(options) ? options : [])
    .map((option) => cleanString(String(option ?? "").replace(OPTION_LABEL, ""), 300))
    .filter(Boolean);
}

function normalizePaper(raw, questionTypes) {
  const source = raw && typeof raw === "object" ? raw : {};
  const rawSections = Array.isArray(source.sections) ? source.sections : [];
  const shortfall = [];
  let number = 0;

  const sections = questionTypes.map((row, index) => {
    const type = QUESTION_TYPES[row.type];
    const rawSection = rawSections[index] || {};

    const questions = (Array.isArray(rawSection.questions) ? rawSection.questions : [])
      .map((q) => {
        const text = cleanString(q?.text, 3000);
        let options = row.type === "mcq" ? cleanOptions(q?.options) : [];
        if (row.type === "mcq") {
          if (options.length < 4) return null;
          options = options.slice(0, 4);
        }
        if (!text) return null;
        return {
          text,
          difficulty: pickEnum(q?.difficulty, DIFFICULTY_LEVELS, "Moderate"),
          options,
          answer: cleanString(q?.answer, 4000),
        };
      })
      .filter(Boolean)
      .slice(0, row.count)
      .map((q) => {
        number += 1;
        return { ...q, number, marks: row.marks };
      });

    if (questions.length < row.count) shortfall.push({ type: row.type, requested: row.count, got: questions.length });

    return {
      label: String.fromCharCode(65 + index),
      type: row.type,
      title: type.sectionTitle,
      instruction: cleanString(rawSection.instruction, 300) || type.instruction,
      questions,
    };
  });

  const generalInstructions = cleanList(source.generalInstructions, { maxItems: 6, maxLength: 240 });

  return {
    paper: {
      generalInstructions: generalInstructions.length ? generalInstructions : ["All questions are compulsory."],
      sections,
      notes: "",
    },
    shortfall,
    sourceNotes: cleanString(source.sourceNotes, 4000),
  };
}

function totalsOf(paper) {
  let questions = 0;
  let marks = 0;
  for (const section of paper.sections) {
    for (const q of section.questions) {
      questions += 1;
      marks += q.marks;
    }
  }
  return { totalQuestions: questions, totalMarks: Math.round(marks * 2) / 2 };
}

function describeShortfall(shortfall) {
  return shortfall
    .map(({ type, requested, got }) => `${got} of ${requested} ${QUESTION_TYPES[type].label.toLowerCase()} questions`)
    .join(", ");
}

async function generatePaper(assignment, { file, referenceText = "", avoid = [], meta } = {}) {
  const parts = [
    gemini.textPart(buildQuestionPaperPrompt(assignment, { hasFile: Boolean(file), referenceText, avoid })),
  ];
  if (file) parts.push(gemini.filePart(file.buffer, file.mimeType));

  let best = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const raw = await gemini.generateJson({
      label: "question-paper",
      system: QUESTION_PAPER_SYSTEM,
      schema: QUESTION_PAPER_SCHEMA,
      parts,
      meta,
    });
    const result = normalizePaper(raw, assignment.questionTypes);
    const got = totalsOf(result.paper).totalQuestions;
    if (!best || got > totalsOf(best.paper).totalQuestions) best = result;
    if (result.shortfall.length === 0) break;
  }

  if (best.paper.sections.some((section) => section.questions.length === 0)) {
    throw new ApiError(422, "The AI couldn't write questions for every section. Try again, or simplify the paper.", {
      code: "PAPER_INCOMPLETE",
    });
  }
  if (best.shortfall.length > 0) {
    best.paper.notes = `Generated ${describeShortfall(best.shortfall)}. Regenerate to try for the full set.`;
  }

  return { ...best, ...totalsOf(best.paper) };
}

module.exports = { generatePaper, normalizePaper, totalsOf, cleanOptions };
