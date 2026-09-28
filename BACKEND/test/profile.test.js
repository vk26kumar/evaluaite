require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildStudentReport, evaluationStats, studentKey } = require("../src/services/profile.service");

const sheet = (id, studentName, awarded, max, date, status = "completed") => ({
  _id: id,
  title: `Test ${id}`,
  studentName,
  status,
  assignment: null,
  createdAt: new Date(date),
  questions: [{ maxMarks: max, awardedMarks: awarded }],
});

test("student names match regardless of case and spacing", () => {
  assert.equal(studentKey("  aman   VERMA "), "aman verma");
  assert.equal(studentKey(""), "");
});

test("sheets are grouped per student with averages, best and latest", () => {
  const report = buildStudentReport([
    sheet("a", "Aman Verma", 8, 10, "2026-09-01"),
    sheet("b", "aman  verma", 6, 10, "2026-09-10"),
    sheet("c", "Riya", 9, 10, "2026-09-05"),
    sheet("d", "", 5, 10, "2026-09-06"),
  ]);
  assert.equal(report.unnamedSheets, 1);
  assert.equal(report.students.length, 2);

  const aman = report.students.find((s) => s.key === "aman verma");
  assert.equal(aman.sheets, 2);
  assert.equal(aman.averagePercentage, 70);
  assert.equal(aman.bestPercentage, 80);
  assert.equal(aman.latestPercentage, 60, "latest is the most recent sheet, not the best one");
  assert.equal(aman.name, "aman verma", "the most recent spelling of the name is shown");
  assert.equal(aman.evaluations[0].id, "b", "sheets are newest first");
});

test("stats count statuses, students and the average score", () => {
  const stats = evaluationStats([
    sheet("a", "Aman", 8, 10, "2020-01-01"),
    sheet("b", "Riya", 4, 10, "2020-01-01"),
    sheet("c", "Aman", 0, 10, "2020-01-01", "failed"),
    sheet("d", "Kabir", 0, 10, "2020-01-01", "grading"),
  ]);
  assert.equal(stats.total, 4);
  assert.equal(stats.completed, 2);
  assert.equal(stats.failed, 1);
  assert.equal(stats.inProgress, 1);
  assert.equal(stats.averagePercentage, 60);
  assert.equal(stats.students, 2);
});
