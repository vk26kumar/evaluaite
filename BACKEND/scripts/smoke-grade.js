/**
 * Grades the sample handwritten sheet in test/fixtures against a small answer
 * key, using the real Gemini API. No database needed.
 *
 *   npm run smoke:grade            # Medium strictness
 *   npm run smoke:grade -- Tough   # Easy | Medium | Tough
 */
const fs = require("fs");
const path = require("path");
const config = require("../src/config/env");
const { transcribeSheet, gradeTranscription } = require("../src/services/grading.service");

const difficulty = process.argv[2] || "Medium";

const answerKey = [
  {
    question: "Explain normalisation and its need.",
    referenceAnswer:
      "Normalisation is the process of organising data in a relational database to minimise redundancy and " +
      "dependency, by dividing large tables into smaller related tables linked by keys. It is needed to " +
      "eliminate insertion, update and deletion anomalies and to keep data consistent. For example, storing " +
      "department details in every employee row means a department cannot be added without an employee " +
      "(insertion anomaly), changing a department requires updating many rows (update anomaly), and deleting " +
      "the last employee of a department loses the department (deletion anomaly).",
    maxMarks: 10,
  },
  {
    question: "What is a primary key?",
    referenceAnswer: "A column or set of columns that uniquely identifies each row in a table and cannot be null.",
    maxMarks: 2,
  },
];

async function main() {
  if (!config.gemini.apiKey) {
    console.error("Set GEMINI_API_KEY in BACKEND/.env first.");
    process.exitCode = 1;
    return;
  }

  const buffer = fs.readFileSync(path.join(__dirname, "..", "test", "fixtures", "sample-answer-sheet.jpg"));
  console.log(`Model: ${config.gemini.model} | Strictness: ${difficulty}\n`);

  console.time("transcribe");
  const transcription = await transcribeSheet(answerKey, [{ buffer, mimeType: "image/jpeg" }]);
  console.timeEnd("transcribe");

  console.time("grade");
  const result = await gradeTranscription(answerKey, transcription, difficulty);
  console.timeEnd("grade");

  for (const [index, q] of result.questions.entries()) {
    console.log(`\nQ${index + 1}. ${q.question}`);
    console.log(`  ${q.awardedMarks}/${q.maxMarks}  legibility=${q.legibility}  confidence=${q.confidence}`);
    console.log(`  Feedback: ${q.feedback}`);
    for (const point of q.keyPoints) console.log(`   [${point.coverage.padEnd(7)}] ${point.point}`);
    if (q.studentAnswer) console.log(`  Transcription (first 200 chars): ${q.studentAnswer.slice(0, 200).replace(/\n/g, " / ")}`);
  }
  console.log("\nOverall:", JSON.stringify(result.overall, null, 2));
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
