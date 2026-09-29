const { cleanString, cleanList, pickEnum, roundToHalf } = require("../utils/text");

const LEGIBILITY = ["clear", "partial", "illegible"];
const CONFIDENCE = ["high", "medium", "low"];
const COVERAGE = ["full", "partial", "none"];

function entryFor(entries, index) {
  if (!Array.isArray(entries)) return undefined;
  const hasNumber = (entry) =>
    entry?.questionNumber != null && Number.isInteger(Number(entry.questionNumber));
  const byNumber = entries.find((entry) => hasNumber(entry) && Number(entry.questionNumber) === index + 1);
  if (byNumber) return byNumber;
  return entries.some(hasNumber) ? undefined : entries[index];
}

function normalizeTranscription(raw, questionCount) {
  const source = raw && typeof raw === "object" ? raw : {};

  const answers = Array.from({ length: questionCount }, (_, index) => {
    const entry = entryFor(source.answers, index);
    const transcription = cleanString(entry?.transcription, 12000);
    const found = Boolean(entry?.found) && transcription.length > 0 && entry?.legibility !== "missing";
    return {
      found,
      legibility: found ? pickEnum(entry.legibility, LEGIBILITY, "partial") : "missing",
      transcription: found ? transcription : "",
    };
  });

  return {
    sheetReadable: source.sheetReadable !== false,
    sheetNotes: cleanString(source.sheetNotes, 400),
    unmatchedContent: cleanString(source.unmatchedContent, 400),
    graderDirectedText: cleanList(source.graderDirectedText, { maxItems: 5, maxLength: 300 }),
    answers,
  };
}

function defaultFeedback(answer) {
  if (!answer.found) return "No answer to this question was found on the answer sheet.";
  if (answer.legibility === "illegible") return "This answer couldn't be read, so it could not be marked. Please review the sheet.";
  return "";
}

function mergeQuestions(keyQuestions, transcription, grading) {
  const graded = grading && typeof grading === "object" ? grading.questions : undefined;

  return keyQuestions.map((key, index) => {
    const answer = transcription.answers[index];
    const entry = entryFor(graded, index);
    const markable = answer.found && answer.legibility !== "illegible";

    let confidence = pickEnum(entry?.confidence, CONFIDENCE, "medium");
    if (!answer.found) confidence = "high";
    else if (answer.legibility === "illegible") confidence = "low";
    else if (answer.legibility === "partial" && confidence === "high") confidence = "medium";

    const aiMarks = markable ? roundToHalf(entry?.awardedMarks, key.maxMarks) : 0;

    return {
      question: key.question,
      referenceAnswer: key.referenceAnswer,
      maxMarks: key.maxMarks,
      studentAnswer: answer.transcription,
      answerFound: answer.found,
      legibility: answer.legibility,
      aiMarks,
      awardedMarks: aiMarks,
      overridden: false,
      teacherNote: "",
      feedback: (markable && cleanString(entry?.feedback, 1200)) || defaultFeedback(answer),
      keyPoints: (Array.isArray(entry?.keyPoints) ? entry.keyPoints : [])
        .slice(0, 8)
        .map((point) => ({
          point: cleanString(point?.point, 200),
          coverage: markable ? pickEnum(point?.coverage, COVERAGE, "none") : "none",
        }))
        .filter((point) => point.point),
      strengths: markable ? cleanList(entry?.strengths, { maxItems: 5, maxLength: 200 }) : [],
      missingPoints: cleanList(entry?.missingPoints, { maxItems: 6, maxLength: 200 }),
      confidence,
    };
  });
}

function mergeOverall(transcription, grading) {
  const overall = grading?.overall && typeof grading.overall === "object" ? grading.overall : {};

  const integrityFlags = [
    ...transcription.graderDirectedText.map((text) => `Text addressed to the grader: "${text}"`),
    ...cleanList(grading?.integrityFlags, { maxItems: 5, maxLength: 300 }),
  ];

  return {
    summary: cleanString(overall.summary, 800),
    strengths: cleanList(overall.strengths, { maxItems: 4, maxLength: 240 }),
    improvements: cleanList(overall.improvements, { maxItems: 4, maxLength: 240 }),
    integrityFlags: [...new Set(integrityFlags)].slice(0, 6),
    sheetNotes: [transcription.sheetNotes, transcription.unmatchedContent].filter(Boolean).join(" "),
  };
}

module.exports = { normalizeTranscription, mergeQuestions, mergeOverall };
