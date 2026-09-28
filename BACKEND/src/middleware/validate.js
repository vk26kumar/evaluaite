const ApiError = require("../utils/ApiError");

/** One message per field, the first one found, which is what a form shows. */
function formatIssues(issues) {
  const byField = new Map();
  for (const issue of issues) {
    const field = issue.path.join(".");
    if (!byField.has(field)) byField.set(field, { field, message: issue.message });
  }
  return [...byField.values()];
}

/** Parses a value with a zod schema, throwing a 400 ApiError on failure. */
function parseOrThrow(schema, value, message = "Some fields need attention.") {
  const result = schema.safeParse(value);
  if (!result.success) throw ApiError.badRequest(message, formatIssues(result.error.issues));
  return result.data;
}

/** Express middleware that validates and replaces req.body. */
const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = parseOrThrow(schema, req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validateBody, parseOrThrow };
