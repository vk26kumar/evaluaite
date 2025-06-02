const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

const evaluateAnswers = async (teacherAnswers, studentAnswers, difficulty) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Evaluate the student's answers based on the teacher's answers. Strict checking is required—focus on logic rather than words.
    Difficulty Level: ${difficulty} - base your scores on the difficulty level.
    means if easy ignore the minor mistake and give full marks , if medium then cut very less marks on mistake and if tough difficuilty level the give marks fairly.
  - Award marks out of 5 based on accuracy, completeness, and logical correctness.

   The Comment part should contain a small explanation of the score given.

  - Format:
    - Question 1: Score - X/5, Comment: "..."
    - Question 2: Score - Y/5, Comment: "..."

    
    

  At the end, provide an overall insight in this format:
  Overall Insights:
  - Positives: "Positive insight 1", "Positive insight 2", "Positive insight 3"
  - Negatives: "Negative insight 1", "Negative insight 2", "Negative insight 3"

  Teacher's Answers:
  ${teacherAnswers
    .map((q, i) => `Q${i + 1}: ${q.question}\nA: ${q.answer}`)
    .join("\n")}

  Student's Answers:
  ${studentAnswers.map((a, i) => `Q${i + 1}: ${a}`).join("\n")}
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    // Extract marks and comments using regex
    const marksArray = responseText
      .split("\n")
      .map((line) => {
        const match = line.match(/Score - (\d+)\/5/);
        return match ? parseInt(match[1]) : null;
      })
      .filter((mark) => mark !== null);

    const commentsArray = responseText
      .split("\n")
      .map((line) => {
        const match = line.match(/Comment:\s*(.*)/);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean);

    // Extract insights (positives & negatives)
    const positivesArray =
      responseText
        .match(/- Positives:\s*(.*)/)?.[1]
        ?.split('", "')
        .map((p) => p.replace(/"/g, "").trim()) || [];

    const negativesArray =
      responseText
        .match(/- Negatives:\s*(.*)/)?.[1]
        ?.split('", "')
        .map((n) => n.replace(/"/g, "").trim()) || [];

    return {
      marks: marksArray,
      comments: commentsArray,
      insights: {
        positives: positivesArray,
        negatives: negativesArray,
      },
    };
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    return {
      marks: [],
      comments: [],
      insights: { positives: [], negatives: [] },
    };
  }
};

module.exports = { evaluateAnswers };
