const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

function fileToGenerativePart(imageBuffer, mimeType = "image/png") {
  return {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType,
    },
  };
}

const extractTextFromImage = async (imageBuffer) => {
  try {
    console.log("📝 Simulating local text extraction...");

    // Simulate extracting exactly 3 answers from image
    const extractedAnswers = [
      "Newton's laws of motion describe how objects behave when forces act on them.",
      "The first law, also known as the law of inertia, states that an object remains in uniform motion unless acted upon by an external force.",
      "The third law states that for every action, there is an equal and opposite reaction."
    ];

    console.log("📤 Final extracted answers array:", extractedAnswers);
    return extractedAnswers;
  } catch (error) {
    console.error("❌ Error extracting text:", error);
    return [];
  }
};

module.exports = extractTextFromImage;
