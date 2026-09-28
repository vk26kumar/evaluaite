const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const ApiError = require("../utils/ApiError");
const config = require("../config/env");

function limiter({ windowMs, limit, message, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: () => config.isTest,
    keyGenerator,
    handler: (req, res, next) => next(new ApiError(429, message, { code: "RATE_LIMITED" })),
  });
}

const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: "Too many requests. Please slow down and try again in a few minutes.",
});

// Counts failed attempts only, which throttles password guessing without
// locking out people who sign in successfully.
const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
});

// AI calls cost money, so they are limited per account rather than per IP.
const aiLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => (req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip)),
  message: "You've reached the hourly limit for AI requests. Please try again later.",
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
