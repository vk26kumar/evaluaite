export function needsReview(question) {
  return question.confidence === "low" || question.legibility === "partial" || question.legibility === "illegible";
}

export function lostMarks(question) {
  return (question.awardedMarks ?? 0) < question.maxMarks;
}
