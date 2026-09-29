const ApiError = require("../utils/ApiError");

function formatIssues(issues) {
  const byField = new Map();
  for (const issue of issues) {
    const field = issue.path.join(".");
    if (!byField.has(field)) byField.set(field, { field, message: issue.message });
  }
  return [...byField.values()];
}

function parseOrThrow(schema, value, message = "Some fields need attention.") {
  const result = schema.safeParse(value);
  if (!result.success) throw ApiError.badRequest(message, formatIssues(result.error.issues));
  return result.data;
}

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = parseOrThrow(schema, req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validateBody, parseOrThrow };
