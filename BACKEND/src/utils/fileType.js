/**
 * Detects a file's real type from its first bytes. The browser-supplied
 * mimetype is only a hint and must not be trusted.
 */
const SIGNATURES = [
  { mimeType: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mimeType: "image/png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mimeType: "image/webp",
    test: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
  { mimeType: "application/pdf", test: (b) => b.toString("ascii", 0, 5) === "%PDF-" },
];

const SUPPORTED_MIME_TYPES = SIGNATURES.map((s) => s.mimeType);

function detectMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  const match = SIGNATURES.find((signature) => signature.test(buffer));
  return match ? match.mimeType : null;
}

module.exports = { detectMimeType, SUPPORTED_MIME_TYPES };
