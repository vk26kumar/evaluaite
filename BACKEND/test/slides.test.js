require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeOutline, buildDeck } = require("../src/services/slides.service");

test("normalizeOutline drops empty slides and respects the slide count", () => {
  const outline = normalizeOutline(
    {
      title: "Cells",
      slides: [
        { title: "One", bullets: ["a."], speakerNotes: "" },
        { title: "", bullets: ["b"] },
        { title: "Two", bullets: [] },
        { title: "Three", bullets: ["c", "d"] },
      ],
    },
    { topic: "cells", slideCount: 1 }
  );
  assert.equal(outline.slides.length, 1);
  assert.deepEqual(outline.slides[0].bullets, ["a"]);
});

test("normalizeOutline rejects an outline with no usable slides", () => {
  assert.throws(() => normalizeOutline({ slides: [] }, { topic: "x", slideCount: 5 }), /couldn't build slides/);
});

test("buildDeck returns a valid .pptx (zip) buffer", async () => {
  const buffer = await buildDeck({
    title: "Photosynthesis",
    subtitle: "How plants turn light into food",
    slides: [{ title: "Why it matters", bullets: ["Feeds almost every food chain"], speakerNotes: "Start here." }],
  });
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  assert.ok(buffer.length > 10_000);
});
