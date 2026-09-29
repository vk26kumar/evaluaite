const config = require("../config/env");
const EmailToken = require("../models/EmailToken");
const logger = require("../utils/logger");
const email = require("./email.service");
const { randomToken, sha256 } = require("./token.service");
const { passwordResetEmail, verifyEmailEmail, passwordChangedEmail } = require("./emailTemplates");

const RESET_MINUTES = 30;
const VERIFY_HOURS = 24;

async function issueToken(userId, purpose, ttlMs) {
  await EmailToken.deleteMany({ user: userId, purpose });
  const token = randomToken(32);
  await EmailToken.create({ user: userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

function findToken(token, purpose) {
  return EmailToken.findOne({ tokenHash: sha256(String(token)), purpose, expiresAt: { $gt: new Date() } });
}

function consumeToken(token, purpose) {
  return EmailToken.findOneAndDelete({ tokenHash: sha256(String(token)), purpose, expiresAt: { $gt: new Date() } });
}

const appLink = (path, token) => `${config.clientUrl}/#${path}?token=${encodeURIComponent(token)}`;

async function deliver(user, message, kind) {
  try {
    await email.sendEmail({ to: user.email, ...message });
    return true;
  } catch (err) {
    logger.error("Could not send email", { kind, user: String(user._id), error: logger.serializeError(err) });
    return false;
  }
}

async function sendPasswordReset(user) {
  const token = await issueToken(user._id, "password_reset", RESET_MINUTES * 60 * 1000);
  const message = passwordResetEmail({ name: user.name, url: appLink("/reset-password", token), minutes: RESET_MINUTES });
  return deliver(user, message, "password_reset");
}

async function sendVerification(user) {
  const token = await issueToken(user._id, "email_verification", VERIFY_HOURS * 60 * 60 * 1000);
  const message = verifyEmailEmail({ name: user.name, url: appLink("/verify-email", token), hours: VERIFY_HOURS });
  return deliver(user, message, "email_verification");
}

function sendPasswordChanged(user) {
  return deliver(user, passwordChangedEmail({ name: user.name }), "password_changed");
}

function inBackground(task) {
  if (!email.isConfigured()) return;
  Promise.resolve()
    .then(task)
    .catch((err) => logger.error("Background email failed", { error: logger.serializeError(err) }));
}

module.exports = {
  isEnabled: email.isConfigured,
  sendPasswordReset,
  sendVerification,
  sendPasswordChanged,
  findToken,
  consumeToken,
  inBackground,
};
