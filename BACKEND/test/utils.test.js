require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { detectMimeType } = require("../src/utils/fileType");
const { roundToHalf, slugify, cleanList, cleanString } = require("../src/utils/text");

test("detects real file types from magic bytes", () => {
  const jpg = fs.readFileSync(path.join(__dirname, "fixtures", "sample-answer-sheet.jpg"));
  assert.equal(detectMimeType(jpg), "image/jpeg");
  assert.equal(detectMimeType(Buffer.from("%PDF-1.7\n1 0 obj << >> endobj")), "application/pdf");
  assert.equal(detectMimeType(Buffer.from("<html><script>alert(1)</script></html>")), null);
});

test("roundToHalf clamps and rounds", () => {
  assert.equal(roundToHalf(3.26, 5), 3.5);
  assert.equal(roundToHalf(-2, 5), 0);
  assert.equal(roundToHalf("abc", 5), 0);
  assert.equal(roundToHalf(12, 10), 10);
});

test("slugify produces safe file names", () => {
  assert.equal(slugify('Photosynthesis: "Light" & Dark reactions!'), "photosynthesis-light-dark-reactions");
  assert.equal(slugify("../../etc/passwd"), "etc-passwd");
  assert.equal(slugify(""), "");
});

test("cleanList trims, de-duplicates and caps", () => {
  assert.deepEqual(cleanList([" a ", "A", "", 5, "b"], { maxItems: 5 }), ["a", "b"]);
  assert.equal(cleanString("x".repeat(20), 10).length, 10);
});
