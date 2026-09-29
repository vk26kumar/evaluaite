export const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple choice", hint: "4 options, one correct", defaultMarks: 1 },
  { value: "true_false", label: "True or false", hint: "One clear statement", defaultMarks: 1 },
  { value: "fill_blank", label: "Fill in the blanks", hint: "One or two blanks", defaultMarks: 1 },
  { value: "short", label: "Short answer", hint: "2 to 4 sentences", defaultMarks: 2 },
  { value: "long", label: "Long answer", hint: "Structured, detailed answer", defaultMarks: 5 },
  { value: "numerical", label: "Numerical problems", hint: "Working and units", defaultMarks: 3 },
  { value: "diagram", label: "Diagram / graph based", hint: "Draw or interpret", defaultMarks: 3 },
];

export const typeLabel = (value) => QUESTION_TYPES.find((type) => type.value === value)?.label ?? value;

export const DIFFICULTY_MIXES = [
  { value: "easier", label: "Easier", split: { Easy: 50, Moderate: 40, Challenging: 10 }, hint: "Revision and practice" },
  { value: "balanced", label: "Balanced", split: { Easy: 30, Moderate: 50, Challenging: 20 }, hint: "Most class tests" },
  { value: "harder", label: "Harder", split: { Easy: 15, Moderate: 45, Challenging: 40 }, hint: "Top sets and finals" },
];

export const TIME_PRESETS = ["20 minutes", "30 minutes", "45 minutes", "1 hour", "1 hour 30 minutes", "2 hours", "3 hours"];

export const PAPER_PRESETS = [
  {
    id: "quiz",
    label: "Quick quiz",
    description: "10 multiple choice",
    timeAllowed: "20 minutes",
    rows: [{ type: "mcq", count: 10, marks: 1 }],
  },
  {
    id: "test",
    label: "Class test",
    description: "MCQ, short and long answers",
    timeAllowed: "45 minutes",
    rows: [
      { type: "mcq", count: 5, marks: 1 },
      { type: "short", count: 5, marks: 2 },
      { type: "long", count: 2, marks: 5 },
    ],
  },
  {
    id: "exam",
    label: "Full exam",
    description: "Five sections, 63 marks",
    timeAllowed: "3 hours",
    rows: [
      { type: "mcq", count: 10, marks: 1 },
      { type: "true_false", count: 5, marks: 1 },
      { type: "short", count: 6, marks: 3 },
      { type: "long", count: 4, marks: 5 },
      { type: "numerical", count: 2, marks: 5 },
    ],
  },
];

export const MAX_QUESTION_TYPES = 7;
export const MAX_PAPER_QUESTIONS = 60;
