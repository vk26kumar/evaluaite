const crypto = require("crypto");
const { sha256 } = require("./token.service");

const CODE_COUNT = 10;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  const bytes = crypto.randomBytes(10);
  const chars = [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join("");
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

const normalize = (code) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const hashCode = (code) => sha256(`recovery:${normalize(code)}`);

function generateCodes() {
  const codes = Array.from({ length: CODE_COUNT }, randomCode);
  return { codes, hashes: codes.map(hashCode) };
}

module.exports = { generateCodes, hashCode, normalize, CODE_COUNT };
