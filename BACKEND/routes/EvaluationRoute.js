const express = require("express");
const multer = require("multer");
const extractTextFromImage = require("../utils/geminiExtractor");
const Evaluation = require("../models/Evaluation");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { referenceAnswers, difficulty } = req.body;
    const imageFile = req.file;

    if (
      !imageFile ||
      !referenceAnswers ||
      referenceAnswers.length === 0 ||
      !difficulty
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const parsedReferenceAnswers = JSON.parse(referenceAnswers);

    const extractedAnswers = await extractTextFromImage(imageFile.buffer);

    const newEvaluation = new Evaluation({
      referenceAnswers: parsedReferenceAnswers,
      extractedAnswers,
      difficulty,
    });

    await newEvaluation.save();

    return res
      .status(201)
      .json({ message: "Evaluation created", id: newEvaluation._id });
  } catch (error) {
    console.error("🚨 Evaluation creation failed:", error.message || error);
    res
      .status(500)
      .json({ error: "Evaluation failed", details: error.message });
  }
});

module.exports = router;
