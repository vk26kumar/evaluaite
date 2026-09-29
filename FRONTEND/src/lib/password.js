export const PASSWORD_RULES = [
  { id: "length", label: "8+ characters", test: (value) => value.length >= 8 },
  { id: "letter", label: "A letter", test: (value) => /[A-Za-z]/.test(value) },
  { id: "number", label: "A number", test: (value) => /[0-9]/.test(value) },
];

export const meetsPasswordRules = (value) => PASSWORD_RULES.every((rule) => rule.test(value));
