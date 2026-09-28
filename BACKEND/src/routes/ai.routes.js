const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const { cleanString, cleanList } = require("../utils/text");
const ApiError = require("../utils/ApiError");
const { requireAuth } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimit");
const { validateBody } = require("../middleware/validate");
const gemini = require("../services/gemini");
const {
  REFERENCE_ANSWER_SYSTEM,
  REFERENCE_ANSWER_SCHEMA,
  buildReferenceAnswerPrompt,
} = require("../prompts/referenceAnswer");

const router = express.Router();

const referenceSchema = z.object({
  question: z.string().trim().min(3, "Type the question first.").max(2000),
  maxMarks: z.coerce.number().min(0.5).max(100).default(5),
  subject: z.string().trim().max(120).optional(),
});

router.post(
  "/reference-answer",
  requireAuth,
  aiLimiter,
  validateBody(referenceSchema),
  asyncHandler(async (req, res) => {
    const raw = await gemini.generateJson({
      label: "reference-answer",
      system: REFERENCE_ANSWER_SYSTEM,
      schema: REFERENCE_ANSWER_SCHEMA,
      parts: [gemini.textPart(buildReferenceAnswerPrompt(req.body))],
    });

    const answer = cleanString(raw?.answer, 4000);
    if (!answer) {
      throw new ApiError(422, "We couldn't draft an answer for that question. Try rewording it.", {
        code: "ANSWER_EMPTY",
      });
    }

    res.json({ answer, keyPoints: cleanList(raw?.keyPoints, { maxItems: 6, maxLength: 160 }) });
  })
);

module.exports = router;
