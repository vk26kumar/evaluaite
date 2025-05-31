const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

// Converts an image buffer to base64 format
function fileToGenerativePart(imageBuffer, mimeType = "image/png") {
  console.log("🔍 Converting image buffer to base64...");
  return {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType,
    },
  };
}

const extractTextFromImage = async (imageBuffer) => {
  try {
    if (!imageBuffer || imageBuffer.length === 0) {
      console.error("❌ Error: Invalid image buffer received.");
      throw new Error("Invalid image buffer received.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Extract all the text from this handwritten answer sheet without skipping anything. 
    The image contains only answers (not questions). Each answer begins with Answer N: where N is the answer number in the given image.
    Return the answers in this structured format: 

    Answer 1: (Extracted text)
    Answer 2: (Extracted text)
    Answer 3: (Extracted text)

    This is the just format example  the actual image can have any number of answers.
    
    Ensure each answer appears exactly as written, without modifications. Use your logic to separate different answers from each other.`;

    const imagePart = fileToGenerativePart(imageBuffer);

    const generatedContent = await model.generateContent([prompt, imagePart]);

    const extractedText = generatedContent.response?.text?.() || "";

    // Correctly extract multi-line answers
    const answersArray = [];
    const regex = /Answer \d+:\s*([\s\S]+?)(?=\nAnswer \d+:|\n*$)/gs;
    let match;

    while ((match = regex.exec(extractedText)) !== null) {
      answersArray.push(match[1].trim());
    }

    return answersArray;
  } catch (error) {
    console.error("❌ Error extracting text:", error);
    return [];
  }
};

module.exports = extractTextFromImage;
