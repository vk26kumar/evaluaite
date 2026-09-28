// The three marking levels. Values match the server enum; labels are what teachers see.
export const STRICTNESS = [
  {
    value: "Easy",
    label: "Lenient",
    tagline: "Quick quizzes, early drafts",
    rules: ["Credits the core idea", "Generous partial credit", "Ignores spelling and grammar"],
  },
  {
    value: "Medium",
    label: "Balanced",
    tagline: "Class tests and homework",
    rules: ["Marks each key point", "Partial credit by coverage", "Small deductions for slips"],
  },
  {
    value: "Tough",
    label: "Strict",
    tagline: "Mock and final exams",
    rules: ["Needs every key point", "Precise terms required", "Vague answers earn nothing"],
  },
];

export const strictnessLabel = (value) => STRICTNESS.find((option) => option.value === value)?.label ?? value;
