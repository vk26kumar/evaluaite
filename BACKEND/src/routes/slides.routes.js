const express = require("express");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const { slugify } = require("../utils/text");
const { requireAuth } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimit");
const { validateBody } = require("../middleware/validate");
const { generateOutline, buildDeck } = require("../services/slides.service");
const { AUDIENCES } = require("../prompts/slides");
const { logActivity } = require("../services/activity");

const router = express.Router();

const slidesSchema = z.object({
  topic: z.string().trim().min(3, "Describe the topic in a few words.").max(200, "Keep the topic under 200 characters."),
  slideCount: z.coerce.number().int().min(3).max(12).default(6),
  audience: z.enum(Object.keys(AUDIENCES)).default("general"),
});

router.post(
  "/",
  requireAuth,
  aiLimiter,
  validateBody(slidesSchema),
  asyncHandler(async (req, res) => {
    const outline = await generateOutline(req.body);
    const buffer = await buildDeck(outline);
    const fileName = `${slugify(outline.title) || "lecture"}.pptx`;
    void logActivity(req.user, "slides.generated", {
      kind: "slides",
      title: outline.title,
      meta: { slides: outline.slides.length + 2, audience: req.body.audience, topic: req.body.topic },
    });

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": buffer.length,
      "Cache-Control": "no-store",
    });
    res.send(buffer);
  })
);

module.exports = router;
