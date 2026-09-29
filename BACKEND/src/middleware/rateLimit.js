const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const ApiError = require("../utils/ApiError");
const config = require("../config/env");

const MINUTE = 60 * 1000;

function limiter({ windowMs, limit, message, keyGenerator, failuresOnly = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: failuresOnly,
    skip: () => config.isTest,
    keyGenerator,
    handler: (req, res, next) => next(new ApiError(429, message, { code: "RATE_LIMITED" })),
  });
}

const emailKey = (req) => `email:${String(req.body?.email || "").trim().toLowerCase()}`;
const userKey = (req) => (req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip));

const apiLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 600,
  message: "Too many requests. Please slow down and try again in a few minutes.",
});

const signupLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 20,
  message: "Too many accounts were created from this network. Please try again in an hour.",
});

const loginLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  failuresOnly: true,
  message: "Too many failed sign-in attempts from this network. Please wait 15 minutes and try again.",
});

const loginAccountLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  failuresOnly: true,
  keyGenerator: emailKey,
  message: "Too many failed sign-in attempts for this account. Please wait 15 minutes or reset your password.",
});

const linkLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  failuresOnly: true,
  message: "Too many invalid links were tried. Please wait 15 minutes and try again.",
});

const accountLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  failuresOnly: true,
  keyGenerator: userKey,
  message: "Too many failed attempts. Please wait 15 minutes and try again.",
});

const emailRequestLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  message: "Too many email requests. Please wait 15 minutes and try again.",
});

const emailAddressLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 3,
  keyGenerator: emailKey,
  message: "We've already sent a few emails to this address. Check your inbox and spam folder, or try again in an hour.",
});

const verificationLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 3,
  keyGenerator: userKey,
  message: "We've already sent a few confirmation emails. Check your inbox and spam folder, or try again in an hour.",
});

const aiLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 60,
  keyGenerator: userKey,
  message: "You've reached the hourly limit for AI requests. Please try again later.",
});

module.exports = {
  apiLimiter,
  signupLimiter,
  loginLimiter,
  loginAccountLimiter,
  linkLimiter,
  accountLimiter,
  emailRequestLimiter,
  emailAddressLimiter,
  verificationLimiter,
  aiLimiter,
};
