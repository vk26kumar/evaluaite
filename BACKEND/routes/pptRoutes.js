const express = require("express");
const { generateSlides, generatePPT } = require("../utils/PptGemini");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    const slides = await generateSlides(topic);
    if (!slides.length) return res.status(500).json({ error: "Failed to generate slides" });

    const fileName = await generatePPT(topic, slides);
    const filePath = path.join(__dirname, "..", fileName);
    if (!fs.existsSync(filePath)) {
  console.error("❌ PPT file not found at:", filePath);
  return res.status(500).json({ error: "Generated PPT file not found" });
}

    console.log(`📂 Sending file: ${filePath}`);

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("❌ Error sending file:", err);
        return res.status(500).json({ error: "Error sending file" });
      }

      setTimeout(() => {
        console.log(`🗑️ Deleting file: ${filePath}`);
        fs.unlinkSync(filePath);
      }, 5000);
    });

  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
