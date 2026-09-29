const fs = require("fs");
const os = require("os");
const path = require("path");
const config = require("../src/config/env");
const { plannedTotals } = require("../src/models/Assignment");
const { generatePaper } = require("../src/services/questionPaper.service");
const { renderPaperPdf } = require("../src/services/paperPdf.service");

const questionTypes = [
  { type: "mcq", count: 4, marks: 1 },
  { type: "true_false", count: 2, marks: 1 },
  { type: "short", count: 2, marks: 2 },
  { type: "numerical", count: 2, marks: 3 },
];

const assignment = {
  title: "Unit test: Electricity",
  subject: "Physics",
  className: "Class 10",
  schoolName: "Sample School",
  timeAllowed: "45 minutes",
  difficultyMix: "balanced",
  questionTypes,
  additionalInstructions: "Focus on Ohm's law and series and parallel circuits.",
  ...plannedTotals(questionTypes),
};

async function main() {
  if (!config.gemini.apiKey) {
    console.error("Set GEMINI_API_KEY in BACKEND/.env first.");
    process.exitCode = 1;
    return;
  }

  const meta = {};
  console.time("generate");
  const result = await generatePaper(assignment, { meta });
  console.timeEnd("generate");
  console.log(`Model: ${meta.model} | ${result.totalQuestions} questions, ${result.totalMarks} marks`);
  if (result.paper.notes) console.log(`Note: ${result.paper.notes}`);

  for (const section of result.paper.sections) {
    console.log(`\nSection ${section.label} · ${section.title}`);
    for (const q of section.questions) {
      console.log(`  ${q.number}. [${q.difficulty}] ${q.text}`);
      q.options.forEach((option, i) => console.log(`       ${"ABCD"[i]}) ${option}`));
      console.log(`     Answer: ${q.answer.replace(/\n/g, " / ")}`);
    }
  }

  const paper = { ...assignment, ...result };
  for (const variant of ["student", "teacher"]) {
    const file = path.join(os.tmpdir(), `smoke-paper-${variant}.pdf`);
    fs.writeFileSync(file, await renderPaperPdf(paper, { variant }));
    console.log(`\nPDF (${variant}): ${file}`);
  }
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exitCode = 1;
});
