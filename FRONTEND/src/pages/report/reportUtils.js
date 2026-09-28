/** A mark worth checking by hand: the grader was unsure or couldn't read everything. */
export function needsReview(question) {
  return question.confidence === "low" || question.legibility === "partial" || question.legibility === "illegible";
}

export function lostMarks(question) {
  return (question.awardedMarks ?? 0) < question.maxMarks;
}
