const mongoose = require("mongoose");

const EvaluationSchema = new mongoose.Schema(
  {
    referenceAnswers: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    extractedAnswers: [{ type: String }],
    difficulty: { type: String, required: true, enum: ["Easy", "Medium", "Tough"] },
    marks: [{ type: Number }],
    commentsArray: [{ type: String }],
    insights: {
      positives: [{ type: String,  }], 
      negatives: [{ type: String,  }], 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Evaluation", EvaluationSchema);
