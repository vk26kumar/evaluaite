const PptxGenJS = require("pptxgenjs");
const ApiError = require("../utils/ApiError");
const { cleanString, cleanList } = require("../utils/text");
const gemini = require("./gemini");
const { SLIDES_SYSTEM, SLIDES_SCHEMA, buildSlidesPrompt } = require("../prompts/slides");

const THEME = {
  paper: "F7F2E8",
  ink: "1C2230",
  muted: "5E6677",
  red: "C63D2F",
  rule: "DCD2C1",
  heading: "Georgia",
  body: "Calibri",
};

function normalizeOutline(raw, { topic, slideCount }) {
  const slides = (Array.isArray(raw?.slides) ? raw.slides : [])
    .map((slide) => ({
      title: cleanString(slide?.title, 90),
      bullets: cleanList(slide?.bullets, { maxItems: 6, maxLength: 160 }).map((b) => b.replace(/[.;]+$/, "")),
      speakerNotes: cleanString(slide?.speakerNotes, 900),
    }))
    .filter((slide) => slide.title && slide.bullets.length > 0)
    .slice(0, slideCount);

  if (slides.length === 0) {
    throw new ApiError(422, "We couldn't build slides for that topic. Try describing it differently.", {
      code: "SLIDES_EMPTY",
    });
  }

  return {
    title: cleanString(raw?.title, 90) || cleanString(topic, 90),
    subtitle: cleanString(raw?.subtitle, 140),
    slides,
  };
}

async function generateOutline({ topic, slideCount, audience }) {
  const raw = await gemini.generateJson({
    label: "slides",
    system: SLIDES_SYSTEM,
    schema: SLIDES_SCHEMA,
    parts: [gemini.textPart(buildSlidesPrompt({ topic, slideCount, audience }))],
  });
  return normalizeOutline(raw, { topic, slideCount });
}

function accentBar(slide, { x, y, w }) {
  slide.addShape("rect", { x, y, w, h: 0.06, fill: { color: THEME.red }, line: { color: THEME.red, width: 0 } });
}

function marginRule(slide) {
  slide.addShape("line", { x: 0.9, y: 0, w: 0, h: 7.5, line: { color: THEME.red, width: 1.25 } });
}

async function buildDeck(outline) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = outline.title;
  pptx.subject = outline.subtitle;
  pptx.author = "AI-EvaluAIte";
  pptx.company = "AI-EvaluAIte";

  pptx.defineSlideMaster({
    title: "CONTENT",
    background: { color: THEME.paper },
    objects: [
      { line: { x: 0.9, y: 0, w: 0, h: 7.5, line: { color: THEME.red, width: 1.25 } } },
      { line: { x: 1.3, y: 6.85, w: 11.6, h: 0, line: { color: THEME.rule, width: 0.75 } } },
      {
        text: {
          text: outline.title,
          options: { x: 1.3, y: 6.9, w: 9, h: 0.4, fontFace: THEME.body, fontSize: 10, color: THEME.muted },
        },
      },
    ],
    slideNumber: {
      x: 12.3,
      y: 6.9,
      w: 0.6,
      h: 0.4,
      fontFace: THEME.body,
      fontSize: 10,
      color: THEME.muted,
      align: "right",
    },
  });

  const cover = pptx.addSlide();
  cover.background = { color: THEME.paper };
  marginRule(cover);
  cover.addText("LECTURE", {
    x: 1.3,
    y: 1.9,
    w: 8,
    h: 0.4,
    fontFace: THEME.body,
    fontSize: 12,
    bold: true,
    color: THEME.red,
    charSpacing: 4,
  });
  cover.addText(outline.title, {
    x: 1.3,
    y: 2.35,
    w: 10.8,
    h: 1.9,
    fontFace: THEME.heading,
    fontSize: 44,
    color: THEME.ink,
    valign: "top",
    fit: "shrink",
  });
  accentBar(cover, { x: 1.3, y: 4.35, w: 1.2 });
  if (outline.subtitle) {
    cover.addText(outline.subtitle, {
      x: 1.3,
      y: 4.6,
      w: 10.8,
      h: 0.9,
      fontFace: THEME.body,
      fontSize: 20,
      color: THEME.muted,
      valign: "top",
    });
  }

  outline.slides.forEach((content) => {
    const slide = pptx.addSlide({ masterName: "CONTENT" });
    slide.addText(content.title, {
      x: 1.3,
      y: 0.55,
      w: 11.6,
      h: 0.9,
      fontFace: THEME.heading,
      fontSize: 30,
      color: THEME.ink,
      valign: "bottom",
      fit: "shrink",
    });
    accentBar(slide, { x: 1.3, y: 1.55, w: 0.8 });
    slide.addText(
      content.bullets.map((bullet) => ({
        text: bullet,
        options: { bullet: { indent: 22 }, paraSpaceAfter: 14, breakLine: true },
      })),
      {
        x: 1.3,
        y: 1.9,
        w: 11.2,
        h: 4.7,
        fontFace: THEME.body,
        fontSize: 21,
        color: THEME.ink,
        valign: "top",
        fit: "shrink",
      }
    );
    if (content.speakerNotes) slide.addNotes(content.speakerNotes);
  });

  const closing = pptx.addSlide();
  closing.background = { color: THEME.paper };
  marginRule(closing);
  closing.addText("Questions & discussion", {
    x: 1.3,
    y: 2.9,
    w: 10.8,
    h: 1.2,
    fontFace: THEME.heading,
    fontSize: 40,
    color: THEME.ink,
  });
  accentBar(closing, { x: 1.3, y: 4.2, w: 1.2 });

  return pptx.write({ outputType: "nodebuffer" });
}

module.exports = { generateOutline, buildDeck, normalizeOutline };
