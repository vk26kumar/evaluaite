const express = require("express");
const passport = require("passport");
const { z } = require("zod");
const config = require("../config/env");
const User = require("../models/User");
const AuthCode = require("../models/AuthCode");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");
const { passwordSchema, assertNotPersonal, hashPassword, verifyPassword, DUMMY_HASH } = require("../utils/password");
const { validateBody } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const {
  signupLimiter,
  loginLimiter,
  linkLimiter,
  loginAccountLimiter,
  emailRequestLimiter,
  emailAddressLimiter,
} = require("../middleware/rateLimit");
const { signSessionToken, randomToken, sha256 } = require("../services/token.service");
const { logActivity } = require("../services/activity");
const accountEmail = require("../services/accountEmail.service");
const { hashCode } = require("../services/recoveryCodes.service");

const router = express.Router();

const AUTH_CODE_TTL_MS = 60 * 1000;

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")).pipe(z.string().max(254));
const token = z.string().min(20).max(200);

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name is too long."),
  email,
  password: passwordSchema,
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
});

const exchangeSchema = z.object({ code: token });
const forgotSchema = z.object({ email });
const resetSchema = z.object({ token, password: passwordSchema });
const verifySchema = z.object({ token });
const recoverSchema = z.object({ email, code: z.string().trim().min(8).max(40), password: passwordSchema });

const LINK_EXPIRED = "This link has expired or was already used. Request a new one.";
const CODE_MISMATCH = "That email and recovery code don't match.";

function session(user) {
  void user.recordLogin().catch(() => {});
  return { user: user.toPublic(), token: signSessionToken(user) };
}

function redirectToClient(res, path) {
  res.redirect(`${config.clientUrl}${path}`);
}

function requireEmail() {
  if (!accountEmail.isEnabled()) {
    throw ApiError.unavailable("Email isn't set up on this server yet. Contact the administrator.", "EMAIL_NOT_CONFIGURED");
  }
}

router.get("/providers", (req, res) => {
  res.json({ google: config.google.enabled, email: accountEmail.isEnabled() });
});

router.post(
  "/signup",
  signupLimiter,
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const { name, email: address, password } = req.body;
    assertNotPersonal(password, address);

    if (await User.findByEmail(address)) {
      throw ApiError.conflict("An account with this email already exists. Sign in instead.");
    }

    const user = await User.create({ name, email: address, password: await hashPassword(password) });

    void logActivity(user, "account.created", { kind: "account", meta: { method: "password" } });
    accountEmail.inBackground(() => accountEmail.sendVerification(user));
    res.status(201).json(session(user));
  })
);

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  loginAccountLimiter,
  asyncHandler(async (req, res) => {
    const { email: address, password } = req.body;
    const user = await User.findByEmail(address, { withPassword: true });

    if (user && !user.password) {
      throw ApiError.badRequest("This account uses Google sign-in. Continue with Google, or reset your password to add one.");
    }

    const matches = await verifyPassword(password, user?.password || DUMMY_HASH);
    if (!user || !matches) throw ApiError.unauthorized("Incorrect email or password.");

    res.json(session(user));
  })
);

router.post(
  "/password/forgot",
  emailRequestLimiter,
  validateBody(forgotSchema),
  emailAddressLimiter,
  asyncHandler(async (req, res) => {
    requireEmail();
    const user = await User.findByEmail(req.body.email);
    if (user) accountEmail.inBackground(() => accountEmail.sendPasswordReset(user));
    res.json({ message: "If an account exists for that email, we've sent a link to reset the password." });
  })
);

router.post(
  "/password/reset",
  linkLimiter,
  validateBody(resetSchema),
  asyncHandler(async (req, res) => {
    const pending = await accountEmail.findToken(req.body.token, "password_reset");
    const user = pending && (await User.findById(pending.user).select("+password"));
    if (!user) throw ApiError.badRequest(LINK_EXPIRED, [{ field: "token", message: LINK_EXPIRED }]);

    assertNotPersonal(req.body.password, user.email);
    if (!(await accountEmail.consumeToken(req.body.token, "password_reset"))) {
      throw ApiError.badRequest(LINK_EXPIRED, [{ field: "token", message: LINK_EXPIRED }]);
    }

    user.password = await hashPassword(req.body.password);
    user.emailVerified = true;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    void logActivity(user, "account.password_reset", { kind: "account" });
    accountEmail.inBackground(() => accountEmail.sendPasswordChanged(user));
    res.json(session(user));
  })
);

router.post(
  "/password/recover",
  linkLimiter,
  validateBody(recoverSchema),
  loginAccountLimiter,
  asyncHandler(async (req, res) => {
    const { email: address, code, password } = req.body;
    const codeHash = hashCode(code);
    const user = await User.findByEmail(address).select("+password +recoveryCodes");
    if (!user || !user.recoveryCodes?.includes(codeHash)) {
      throw ApiError.badRequest(CODE_MISMATCH, [{ field: "code", message: CODE_MISMATCH }]);
    }
    assertNotPersonal(password, user.email);

    const used = await User.updateOne({ _id: user._id, recoveryCodes: codeHash }, { $pull: { recoveryCodes: codeHash } });
    if (used.modifiedCount === 0) throw ApiError.badRequest(CODE_MISMATCH, [{ field: "code", message: CODE_MISMATCH }]);

    user.password = await hashPassword(password);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.recoveryCodes = user.recoveryCodes.filter((hash) => hash !== codeHash);
    await user.save();

    const codesLeft = user.recoveryCodes.length;
    void logActivity(user, "account.password_recovered", { kind: "account", meta: { codesLeft } });
    accountEmail.inBackground(() => accountEmail.sendPasswordChanged(user));
    res.json({ ...session(user), codesLeft });
  })
);

router.post(
  "/email/verify",
  linkLimiter,
  validateBody(verifySchema),
  asyncHandler(async (req, res) => {
    const record = await accountEmail.consumeToken(req.body.token, "email_verification");
    if (!record) throw ApiError.badRequest(LINK_EXPIRED, [{ field: "token", message: LINK_EXPIRED }]);

    await User.updateOne({ _id: record.user }, { $set: { emailVerified: true } });
    void logActivity(record.user, "account.email_verified", { kind: "account" });
    res.json({ verified: true });
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

  passport.authenticate("google", { session: false }, async (err, user, info) => {
    if (err || !user) {
      if (err) logger.warn("Google sign-in failed", { message: err.message });
      return redirectToClient(res, "/login?error=google");
    }
    try {
      const code = randomToken(32);
      await AuthCode.create({
        codeHash: sha256(code),
        user: user._id,
        notice: info?.passwordRemoved ? "password_removed" : undefined,
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
  linkLimiter,
  validateBody(exchangeSchema),
  asyncHandler(async (req, res) => {
    const record = await AuthCode.findOneAndDelete({
      codeHash: sha256(req.body.code),
      expiresAt: { $gt: new Date() },
    });
    if (!record) throw ApiError.unauthorized("This sign-in link has expired. Please try again.");

    const user = await User.findById(record.user);
    if (!user) throw ApiError.unauthorized("This account no longer exists.");

    res.json(record.notice ? { ...session(user), notice: record.notice } : session(user));
  })
);

module.exports = router;
