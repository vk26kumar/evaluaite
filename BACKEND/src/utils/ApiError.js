/**
 * An error whose message is safe to show to API clients.
 * Anything thrown that is not an ApiError is treated as an internal error.
 */
class ApiError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code || defaultCode(status);
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, { code: "BAD_REQUEST", details });
  }

  static unauthorized(message = "Please sign in to continue.") {
    return new ApiError(401, message, { code: "UNAUTHORIZED" });
  }

  static forbidden(message = "You don't have access to this resource.") {
    return new ApiError(403, message, { code: "FORBIDDEN" });
  }

  static notFound(message = "Not found.") {
    return new ApiError(404, message, { code: "NOT_FOUND" });
  }

  static conflict(message) {
    return new ApiError(409, message, { code: "CONFLICT" });
  }

  static unavailable(message, code = "UNAVAILABLE") {
    return new ApiError(503, message, { code });
  }
}

function defaultCode(status) {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 422) return "UNPROCESSABLE";
  if (status === 429) return "RATE_LIMITED";
  if (status === 502) return "UPSTREAM_ERROR";
  if (status === 503) return "UNAVAILABLE";
  return "INTERNAL_ERROR";
}

module.exports = ApiError;
