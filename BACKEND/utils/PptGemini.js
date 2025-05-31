const { GoogleGenerativeAI } = require("@google/generative-ai");
const PptxGenJS = require("pptxgenjs");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

const generateSlides = async (topic) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
      Generate 5 PowerPoint slides for the topic: **${topic}**.
  
      For each slide, return:
      - A **subheading** summarizing the slide.
      - **Detailed content** explaining the subheading. Keep every content to 5 bullet points with a maximum of 20 words each.
  
      Format:
      Slide <Number>
      Subheading: <Subheading>
      Content:
      * <Point 1>
      * <Point 2>
      * <Point 3>
      * <Point 4>
      * <Point 5>
    `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    const slidesData = responseText.split(/(?=\*\*Slide \d+\*\*)/).slice(1);

    return slidesData
      .map((section, index) => {
        const subheadingMatch = section.match(/Subheading:\s*(.+)/);
        const contentMatch = section.match(/Content:\s*([\s\S]*)/);

        let content = contentMatch
          ? contentMatch[1]
              .trim()
              .split("\n")
              .map((line) => line.trim())
          : [];

        return {
          title: `Slide ${index + 1}`,
          subheading: subheadingMatch
            ? subheadingMatch[1].trim()
            : "No Subheading",
          content: content.length > 0 ? content.join("\n") : "No Content",
        };
      })
      .slice(0, 5);
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    return [];
  }
};

const generatePPT = async (title, slides) => {
  let ppt = new PptxGenJS();

  ppt.defineLayout({ name: "A4", width: 8.5, height: 11 });
  ppt.layout = "A4";

  let slide1 = ppt.addSlide();
  slide1.background = { fill: "FFA500" };
  slide1.addText(title, {
    x: "10%",
    y: "40%",
    w: "80%",
    fontSize: 36,
    bold: true,
    color: "000000",
    align: "center",
  });

  slides.forEach((slideData, index) => {
    let { subheading, content } = slideData;

    let slide = ppt.addSlide();
    slide.background = { fill: "FFA500" };

    slide.addText(`Slide ${index + 1}: ${subheading}`, {
      x: "10%",
      y: "10%",
      w: "80%",
      fontSize: 28,
      bold: true,
      color: "000000",
      align: "center",
    });

    let bulletPoints = content
      .split("\n")
      .map((point) => ({
        text: point,
        options: { fontSize: 20, color: "FFFFFF" },
      }));

    slide.addText(bulletPoints, {
      x: "10%",
      y: "30%",
      w: "80%",
      h: "60%",
      fontSize: 20,
      color: "FFFFFF",
      align: "left",
      bullet: true,
    });
  });

  const fileName = `lecture_${Date.now()}.pptx`;
  await ppt.writeFile({ fileName });

  return fileName;
};

module.exports = { generateSlides, generatePPT };
