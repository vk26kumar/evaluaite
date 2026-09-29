const ApiError = require("../utils/ApiError");
const gemini = require("./gemini");
const { normalizeTranscription, mergeQuestions, mergeOverall } = require("./grading.normalize");
const { TRANSCRIPTION_SYSTEM, TRANSCRIPTION_SCHEMA, buildTranscriptionPrompt } = require("../prompts/transcription");
const { GRADING_SYSTEM, GRADING_SCHEMA, buildGradingPrompt } = require("../prompts/grading");

async function transcribeSheet(keyQuestions, files, meta) {
  const raw = await gemini.generateJson({
    label: "transcribe",
    system: TRANSCRIPTION_SYSTEM,
    schema: TRANSCRIPTION_SCHEMA,
    parts: [
      gemini.textPart(buildTranscriptionPrompt(keyQuestions, files.length)),
      ...files.map((file) => gemini.filePart(file.buffer, file.mimeType)),
    ],
    meta,
  });

  const transcription = normalizeTranscription(raw, keyQuestions.length);
  const foundCount = transcription.answers.filter((answer) => answer.found).length;

  if (foundCount === 0) {
    const reason = !transcription.sheetReadable
      ? `We couldn't read this answer sheet. ${
          transcription.sheetNotes || "Try a sharper, well-lit photo with the whole page in frame."
        }`
      : "None of the answers on this sheet match the questions in your answer key. Check that you uploaded the right sheet.";
    throw new ApiError(422, reason, { code: "SHEET_UNREADABLE" });
  }

  return transcription;
}

async function gradeTranscription(keyQuestions, transcription, difficulty, meta) {
  const raw = await gemini.generateJson({
    label: "grade",
    system: GRADING_SYSTEM,
    schema: GRADING_SCHEMA,
    parts: [gemini.textPart(buildGradingPrompt(keyQuestions, transcription.answers, difficulty))],
    meta,
  });

  return {
    questions: mergeQuestions(keyQuestions, transcription, raw),
    overall: mergeOverall(transcription, raw),
  };
}

module.exports = { transcribeSheet, gradeTranscription };
