require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePaper, totalsOf, cleanOptions } = require("../src/services/questionPaper.service");
const { buildQuestionPaperPrompt } = require("../src/prompts/questionPaper");
const { renderPaperPdf } = require("../src/services/paperPdf.service");

const config = [
  { type: "mcq", count: 2, marks: 1 },
  { type: "short", count: 2, marks: 3 },
];

const mcq = (text, options = ["A) One", "B) Two", "C) Three", "D) Four"]) => ({
  text,
  difficulty: "Easy",
  options,
  answer: "B) Two",
});

test("marks come from the settings and numbering runs across sections", () => {
  const { paper, shortfall } = normalizePaper(
    {
      generalInstructions: ["All questions are compulsory."],
      sections: [
        { instruction: "Pick one.", questions: [mcq("Q one?"), mcq("Q two?")] },
        {
          instruction: "Be brief.",
          questions: [
            { text: "Define a cell.", difficulty: "Moderate", options: [], answer: "- Basic unit of life", marks: 99 },
            { text: "Name two organelles.", difficulty: "Weird", options: ["stray"], answer: "- Nucleus" },
          ],
        },
      ],
    },
    config
  );
  assert.equal(shortfall.length, 0);
  assert.deepEqual(
    paper.sections.flatMap((s) => s.questions.map((q) => [q.number, q.marks])),
    [
      [1, 1],
      [2, 1],
      [3, 3],
      [4, 3],
    ]
  );
  assert.equal(paper.sections[1].questions[1].difficulty, "Moderate");
  assert.deepEqual(paper.sections[1].questions[1].options, [], "non-MCQ questions never carry options");
  assert.equal(paper.sections[0].label, "A");
  assert.equal(paper.sections[1].label, "B");
  assert.deepEqual(totalsOf(paper), { totalQuestions: 4, totalMarks: 8 });
});

test("option letters the model adds are stripped, and MCQs without 4 options are dropped", () => {
  assert.deepEqual(cleanOptions(["A) Speed", "(b) Distance", "c. Velocity", "D: Time"]), [
    "Speed",
    "Distance",
    "Velocity",
    "Time",
  ]);
  assert.deepEqual(cleanOptions(["A cell wall", "An atom"]), ["A cell wall", "An atom"], "real words starting with A are kept");

  const { paper, shortfall } = normalizePaper(
    { sections: [{ questions: [mcq("Good?"), mcq("Too few?", ["Yes", "No"])] }, { questions: [] }] },
    config
  );
  assert.equal(paper.sections[0].questions.length, 1);
  assert.deepEqual(shortfall, [
    { type: "mcq", requested: 2, got: 1 },
    { type: "short", requested: 2, got: 0 },
  ]);
});

test("extra questions are trimmed to the requested count", () => {
  const { paper } = normalizePaper({ sections: [{ questions: [mcq("1"), mcq("2"), mcq("3")] }] }, [config[0]]);
  assert.equal(paper.sections[0].questions.length, 2);
});

test("garbage output never throws", () => {
  const { paper, shortfall } = normalizePaper("nonsense", config);
  assert.equal(paper.sections.length, 2);
  assert.equal(shortfall.length, 2);
  assert.ok(paper.generalInstructions.length > 0);
});

test("the prompt carries the structure, the difficulty split and the regeneration context", () => {
  const prompt = buildQuestionPaperPrompt(
    {
      title: "Unit test",
      subject: "Biology",
      className: "Class 9",
      timeAllowed: "1 hour",
      totalMarks: 8,
      difficultyMix: "harder",
      questionTypes: config,
      additionalInstructions: "Focus on chapter 3.",
    },
    { avoid: ["What is a cell?"] }
  );
  assert.match(prompt, /questions="2" marks_each="1"/);
  assert.match(prompt, /Challenging 40%/);
  assert.match(prompt, /Focus on chapter 3/);
  assert.match(prompt, /What is a cell\?/);
});

test("PDF renders for both copies, and only the teacher copy has the answer key", async () => {
  const { paper } = normalizePaper(
    {
      generalInstructions: ["Use g = 9.8 m/s² and √2 ≈ 1.41."],
      sections: [
        { questions: [mcq("Which is a vector?"), mcq("Unit of force?")] },
        { questions: [{ text: "Define efficiency.", difficulty: "Easy", options: [], answer: "SECRET-ANSWER" }] },
      ],
    },
    config
  );
  const assignment = {
    title: "Physics test",
    subject: "Physics",
    className: "9",
    schoolName: "Test School",
    timeAllowed: "1 hour",
    totalMarks: 5,
    paper,
  };
  const student = await renderPaperPdf(assignment, { variant: "student" });
  const teacher = await renderPaperPdf(assignment, { variant: "teacher" });
  assert.equal(student.subarray(0, 5).toString(), "%PDF-");
  assert.ok(teacher.length > student.length, "the teacher copy has an extra answer-key page");
});
