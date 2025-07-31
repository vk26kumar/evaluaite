const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

// utils/geminiHelper.js

const evaluateAnswers = async (referenceAnswers, extractedAnswers, difficulty) => {
  console.log("🧪 Simulating evaluation...");

  // Only compare as many extracted answers as there are references
  const limitedExtracted = extractedAnswers.slice(0, referenceAnswers.length);

  const marks = limitedExtracted.map((ans, idx) => {
    const ref = referenceAnswers[idx].answer || "";
    const lengthScore = ans.length > 30 ? 4 : 2;
    const matchScore = ref && typeof ref === "string" && ans.toLowerCase().includes(ref.split(" ")[0].toLowerCase()) ? 1 : 0;
    return lengthScore + matchScore; // total out of 5
  });

  const comments = limitedExtracted.map((ans) => {
    if (ans.length > 50) return "Well explained";
    if (ans.length > 20) return "Satisfactory";
    return "Needs more elaboration";
  });

  const insights = {
    positives: ["Relevant keywords used", "Decent structure"],
    negatives: ["Lacks clarity in some answers", "Few missing points"]
  };

  return {
    marks,
    comments,
    insights
  };
};

module.exports = { evaluateAnswers };
