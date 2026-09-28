const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

function serializeError(err) {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: err.message, status: err.status, stack: err.stack };
}

function write(level, message, meta) {
  if (isTest) return;
  const payload = meta instanceof Error ? { error: serializeError(meta) } : meta;
  const stream = level === "error" || level === "warn" ? console.error : console.log;

  if (isProd) {
    // One JSON object per line so log drains can parse it.
    stream(JSON.stringify({ time: new Date().toISOString(), level, message, ...payload }));
    return;
  }

  const suffix = payload && Object.keys(payload).length ? ` ${JSON.stringify(payload)}` : "";
  stream(`[${level}] ${message}${suffix}`);
}

module.exports = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
  serializeError,
};
