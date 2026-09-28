const mongoose = require("mongoose");
const multer = require("multer");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const { MAX_FILES, MAX_FILE_BYTES } = require("./upload");

function notFound(req, res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}.`));
}

function toApiError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new ApiError(413, `Each file must be ${MAX_FILE_BYTES / 1024 / 1024} MB or smaller.`);
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return ApiError.badRequest(`Upload up to ${MAX_FILES} files in the "files" field.`);
    }
    return ApiError.badRequest("The upload could not be processed.");
  }

  // Raised by express.json()
  if (err.type === "entity.parse.failed") return ApiError.badRequest("Request body is not valid JSON.");
  if (err.type === "entity.too.large") return new ApiError(413, "Request body is too large.");

  if (err instanceof mongoose.Error.CastError) return ApiError.badRequest("Invalid identifier.");
  if (err instanceof mongoose.Error.ValidationError) {
    return ApiError.badRequest(
      "Some fields need attention.",
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    );
  }
  if (err.code === 11000) return ApiError.conflict("That record already exists.");

  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiError = toApiError(err);
  const status = apiError?.status || 500;

  if (status >= 500) {
    logger.error("Request failed", { method: req.method, path: req.originalUrl, error: logger.serializeError(err) });
  }

  if (res.headersSent) return;

  res.status(status).json({
    error: {
      message: apiError ? apiError.message : "Something went wrong on our side. Please try again.",
      code: apiError ? apiError.code : "INTERNAL_ERROR",
      ...(apiError?.details ? { details: apiError.details } : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
