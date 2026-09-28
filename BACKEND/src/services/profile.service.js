/**
 * Pure helpers that turn a teacher's graded sheets into per-student records
 * and headline numbers for the profile page.
 */
const { summarizeScores } = require("../models/Evaluation");

/** "  aman   VERMA " and "Aman Verma" are the same student. */
function studentKey(name) {
  return String(name || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const round1 = (value) => Math.round(value * 10) / 10;

/**
 * @param {Array<object>} evaluations completed evaluations (lean) with
 *   _id, title, studentName, assignment, questions[{maxMarks, awardedMarks}], createdAt
 */
function buildStudentReport(evaluations) {
  const students = new Map();
  let unnamedSheets = 0;

  for (const evaluation of evaluations) {
    const key = studentKey(evaluation.studentName);
    if (!key) {
      unnamedSheets += 1;
      continue;
    }
    const score = summarizeScores(evaluation.questions);
    const record = {
      id: String(evaluation._id),
      title: evaluation.title,
      assignmentId: evaluation.assignment ? String(evaluation.assignment) : null,
      date: evaluation.createdAt,
      awarded: score.awarded,
      max: score.max,
      percentage: score.percentage,
    };

    if (!students.has(key)) students.set(key, { key, name: "", latest: -Infinity, evaluations: [] });
    const student = students.get(key);
    student.evaluations.push(record);
    // Show the spelling of the name used on the most recent sheet.
    const time = new Date(evaluation.createdAt).getTime();
    if (time >= student.latest) {
      student.latest = time;
      student.name = evaluation.studentName.trim().replace(/\s+/g, " ");
    }
  }

  const rows = [...students.values()].map((student) => {
    const sheets = student.evaluations.sort((a, b) => new Date(b.date) - new Date(a.date));
    const percentages = sheets.map((sheet) => sheet.percentage);
    return {
      key: student.key,
      name: student.name,
      sheets: sheets.length,
      averagePercentage: round1(percentages.reduce((sum, p) => sum + p, 0) / sheets.length),
      bestPercentage: Math.max(...percentages),
      latestPercentage: sheets[0].percentage,
      latestAt: sheets[0].date,
      evaluations: sheets,
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return { students: rows, unnamedSheets };
}

/**
 * @param {Array<object>} evaluations all of the user's evaluations (lean, minimal fields)
 */
function evaluationStats(evaluations) {
  const completed = evaluations.filter((e) => e.status === "completed");
  const percentages = completed.map((e) => summarizeScores(e.questions).percentage);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  return {
    total: evaluations.length,
    completed: completed.length,
    failed: evaluations.filter((e) => e.status === "failed").length,
    inProgress: evaluations.filter((e) => ["queued", "reading", "grading"].includes(e.status)).length,
    thisMonth: evaluations.filter((e) => new Date(e.createdAt) >= monthStart).length,
    averagePercentage: percentages.length ? round1(percentages.reduce((sum, p) => sum + p, 0) / percentages.length) : null,
    students: new Set(completed.map((e) => studentKey(e.studentName)).filter(Boolean)).size,
  };
}

module.exports = { studentKey, buildStudentReport, evaluationStats };
