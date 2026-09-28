const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const { z } = require("zod");
const config = require("../config/env");
const User = require("../models/User");
const AuthCode = require("../models/AuthCode");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");
const { validateBody } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const { signSessionToken, randomToken, sha256 } = require("../services/token.service");
const { logActivity } = require("../services/activity");

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const AUTH_CODE_TTL_MS = 60 * 1000;
// Compared against when an email is unknown, so a miss takes as long as a hit
// and response timing doesn't reveal which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync("timing-safe-placeholder", BCRYPT_ROUNDS);

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")).pipe(z.string().max(254));

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name is too long."),
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters.")
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use at least one letter and one number."),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
});

const exchangeSchema = z.object({ code: z.string().min(20).max(200) });

function session(user) {
  void user.recordLogin().catch(() => {});
  return { user: user.toPublic(), token: signSessionToken(user) };
}

function redirectToClient(res, path) {
  res.redirect(`${config.clientUrl}/#${path}`);
}

router.get("/providers", (req, res) => {
  res.json({ google: config.google.enabled });
});

router.post(
  "/signup",
  authLimiter,
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const { name, email: address, password } = req.body;

    if (await User.findByEmail(address)) {
      throw ApiError.conflict("An account with this email already exists. Sign in instead.");
    }

    const user = await User.create({
      name,
      email: address,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
    });

    void logActivity(user, "account.created", { kind: "account", meta: { method: "password" } });
    res.status(201).json(session(user));
  })
);

router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email: address, password } = req.body;
    const user = await User.findByEmail(address, { withPassword: true });

    if (user && !user.password) {
      throw ApiError.badRequest("This account uses Google sign-in. Continue with Google instead.");
    }

    const matches = await bcrypt.compare(password, user?.password || DUMMY_HASH);
    if (!user || !matches) throw ApiError.unauthorized("Incorrect email or password.");

    res.json(session(user));
  })
);

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

router.get("/google", (req, res, next) => {
  if (!config.google.enabled) return redirectToClient(res, "/login?error=google_unavailable");
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account",
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  if (!config.google.enabled) return redirectToClient(res, "/login?error=google_unavailable");

  passport.authenticate("google", { session: false }, async (err, user) => {
    if (err || !user) {
      if (err) logger.warn("Google sign-in failed", { message: err.message });
      return redirectToClient(res, "/login?error=google");
    }
    try {
      // Hand the browser a one-time code instead of the session token, so the
      // token never lands in browser history, proxies or server logs.
      const code = randomToken(32);
      await AuthCode.create({
        codeHash: sha256(code),
        user: user._id,
        expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
      });
      redirectToClient(res, `/auth/callback?code=${encodeURIComponent(code)}`);
    } catch (error) {
      next(error);
    }
  })(req, res, next);
});

router.post(
  "/google/exchange",
  authLimiter,
  validateBody(exchangeSchema),
  asyncHandler(async (req, res) => {
    const record = await AuthCode.findOneAndDelete({
      codeHash: sha256(req.body.code),
      expiresAt: { $gt: new Date() },
    });
    if (!record) throw ApiError.unauthorized("This sign-in link has expired. Please try again.");

    const user = await User.findById(record.user);
    if (!user) throw ApiError.unauthorized("This account no longer exists.");

    res.json(session(user));
  })
);

module.exports = router;
