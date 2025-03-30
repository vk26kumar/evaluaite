const express = require("express");
const { generateSlides, generatePPT } = require("../utils/PptGemini");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const slides = await generateSlides(topic);
    if (slides.length === 0) {
      return res.status(500).json({ error: "Failed to generate slides" });
    }

    const fileName = await generatePPT(topic, slides);
    const filePath = path.resolve(__dirname, "..", fileName);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("File download error:", err);
        res.status(500).json({ error: "Error sending file" });
      }

      setTimeout(() => fs.unlinkSync(filePath), 5000);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
