router.post("/", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      console.error("Error: No topic provided");
      return res.status(400).json({ error: "Topic is required" });
    }

    console.log(`Generating slides for topic: ${topic}`);
    
    const slides = await generateSlides(topic);
    if (slides.length === 0) {
      console.error("Error: No slides were generated.");
      return res.status(500).json({ error: "Failed to generate slides" });
    }

    console.log("Slides generated successfully:", slides);

    const fileName = await generatePPT(topic, slides);
    const filePath = path.resolve(__dirname, "..", fileName);

    console.log(`Sending PPT file: ${filePath}`);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("File download error:", err);
        return res.status(500).json({ error: "Error sending file" });
      }

      setTimeout(() => {
        console.log(`Deleting file: ${filePath}`);
        fs.unlinkSync(filePath);
      }, 5000);
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});
