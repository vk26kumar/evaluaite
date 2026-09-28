const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifySessionToken } = require("../services/token.service");

const requireAuth = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifySessionToken(token);
  } catch {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }

  // Look the user up on every request so deleted accounts lose access immediately.
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("Your session has expired. Please sign in again.");

  req.user = user;
  next();
});

module.exports = { requireAuth };
