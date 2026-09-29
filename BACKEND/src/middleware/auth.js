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

  // Tokens from before the last password change or "sign out everywhere" are
  // retired. Tokens issued before versions existed carry none and count as 0.
  if ((payload.ver || 0) !== (user.tokenVersion || 0)) {
    throw new ApiError(401, "You were signed out because your account's sign-in details changed. Please sign in again.", {
      code: "SESSION_REVOKED",
    });
  }

  req.user = user;
  next();
});

module.exports = { requireAuth };
