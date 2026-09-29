function cleanString(value, maxLength = 2000) {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/\r\n/g, "\n").trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1).trimEnd()}…` : trimmed;
}

function cleanList(value, { maxItems = 6, maxLength = 300 } = {}) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const items = [];
  for (const entry of value) {
    const text = cleanString(entry, maxLength);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function pickEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function roundToHalf(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const clamped = Math.min(Math.max(number, 0), max);
  return Math.round(clamped * 2) / 2;
}

function slugify(value, maxLength = 60) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

module.exports = { cleanString, cleanList, pickEnum, roundToHalf, slugify };
