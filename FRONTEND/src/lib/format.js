export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Marks read naturally: 4, 4.5, 10 — never 4.0. */
export function formatMarks(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "–";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "";
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

export function formatRelative(value) {
  if (!value) return "";
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;
}

/** Performance band shown on the report. Deliberately neutral wording. */
export function scoreBand(percentage) {
  if (percentage >= 85) return { label: "Excellent", tone: "good" };
  if (percentage >= 70) return { label: "Good", tone: "good" };
  if (percentage >= 50) return { label: "Fair", tone: "warn" };
  return { label: "Needs support", tone: "bad" };
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
