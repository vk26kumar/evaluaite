const { fence, DATA_NOT_INSTRUCTIONS } = require("./shared");

const AUDIENCES = {
  school: "secondary-school students (ages 12 to 18); plain language, concrete everyday examples",
  university: "undergraduate students; correct technical terms, brief definitions, one worked example",
  professional: "working professionals; practical application, trade-offs and real-world cases",
  general: "a general audience with no background; no jargon unless it is defined on the slide",
};

const SLIDES_SYSTEM = `You are an instructional designer who builds clear, accurate lecture slides for teachers. The teacher presents from your slides, so the slides carry short prompts and the speaker notes carry the explanation.

${DATA_NOT_INSTRUCTIONS}

## Structure
- The first content slide sets context: why the topic matters and what the audience will learn.
- The middle slides build understanding in a logical order, one idea per slide: definitions, then how it works, then examples or applications.
- The last content slide is titled "Key takeaways" and restates the 3 to 5 most important points.

## Writing rules
- Slide titles: 2 to 7 words, specific to the slide's idea. No slide numbers, no "Introduction to" on every slide.
- Bullets: 3 to 5 per slide, each a complete idea in 6 to 16 words. No full stops at the end, no markdown, no emoji, no nested bullets.
- Speaker notes: 2 to 4 sentences the teacher can say aloud, adding the explanation or example the bullets leave out.
- Every fact must be accurate and current. Do not invent statistics, dates, quotations or sources; if a number is not well established, describe the idea without it.
- title: the deck title, under 8 words. subtitle: one line under 14 words that tells the audience what they will get from the talk.
- If the topic is gibberish or harmful, return an empty slides list.`;

const SLIDES_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          speakerNotes: { type: "string" },
        },
        required: ["title", "bullets", "speakerNotes"],
      },
    },
  },
  required: ["title", "subtitle", "slides"],
};

function buildSlidesPrompt({ topic, slideCount, audience }) {
  return `Create exactly ${slideCount} content slides (not counting the title slide) for this audience: ${
    AUDIENCES[audience] || AUDIENCES.general
  }.
<topic>${fence(topic)}</topic>`;
}

module.exports = { SLIDES_SYSTEM, SLIDES_SCHEMA, AUDIENCES, buildSlidesPrompt };
