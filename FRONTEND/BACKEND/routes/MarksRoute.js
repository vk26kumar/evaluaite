const express = require("express");
const router = express.Router();
const Evaluation = require("../models/Evaluation");
const { evaluateAnswers } = require("../utils/geminiHelper");

router.get("/", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: "Missing evaluation ID" });
    }

    const evaluation = await Evaluation.findById(id);

    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }

    if (
      !evaluation.extractedAnswers ||
      evaluation.extractedAnswers.length === 0
    ) {
      return res.status(400).json({ message: "Extracted answers are missing" });
    }

    const evaluationResult = await evaluateAnswers(
      evaluation.referenceAnswers,
      evaluation.extractedAnswers,
      evaluation.difficulty
    );

    if (
      !evaluationResult ||
      typeof evaluationResult !== "object" ||
      !evaluationResult.marks
    ) {
      console.error(
        "❌ Gemini evaluation returned an unexpected format:",
        evaluationResult
      );
      return res
        .status(500)
        .json({ message: "Gemini evaluation returned unexpected data" });
    }

    const marksArray = evaluationResult.marks || [];
    const commentsArray = evaluationResult.comments || [];
    const insightsData = evaluationResult.insights || {
      positives: [],
      negatives: [],
    };

    evaluation.marks = marksArray;
    evaluation.commentsArray = commentsArray;
    evaluation.insights = insightsData;
    await evaluation.save();

    res.json({
      message: "Evaluation successful",
      evaluation,
    });
  } catch (error) {
    console.error("🚨 Error in /api/evaluations GET:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

module.exports = router;
