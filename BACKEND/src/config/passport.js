const crypto = require("crypto");
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const config = require("./env");
const User = require("../models/User");
const { logActivity } = require("../services/activity");

const STATE_COOKIE = "oauth_state";
const STATE_COOKIE_PATH = "/api/auth/google";

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * Stores the OAuth `state` value in a short-lived, httpOnly cookie instead of
 * a server session. The callback only succeeds in the browser that started
 * the sign-in, which blocks login-CSRF without needing session storage.
 */
class CookieStateStore {
  store(req, callback) {
    const state = crypto.randomBytes(24).toString("base64url");
    req.res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: STATE_COOKIE_PATH,
    });
    callback(null, state);
  }

  verify(req, providedState, callback) {
    const expected = readCookie(req, STATE_COOKIE);
    req.res.clearCookie(STATE_COOKIE, { path: STATE_COOKIE_PATH });

    const valid =
      typeof expected === "string" &&
      typeof providedState === "string" &&
      expected.length === providedState.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedState));

    if (!valid) return callback(null, false, { message: "Sign-in link expired. Please try again." });
    callback(null, true);
  }
}

async function findOrCreateGoogleUser(profile) {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  const emailVerified = profile.emails?.[0]?.verified !== false;
  const avatarUrl = profile.photos?.[0]?.value;

  const existing = await User.findOne({ googleId: profile.id });
  if (existing) return existing;

  if (!email) throw new Error("Google did not share an email address for this account.");

  // Link to an existing email/password account, but only when Google has
  // verified the address, so nobody can take over an account by claiming it.
  const byEmail = await User.findByEmail(email);
  if (byEmail) {
    if (!emailVerified) throw new Error("This Google account's email address isn't verified.");
    byEmail.googleId = profile.id;
    if (!byEmail.avatarUrl && avatarUrl) byEmail.avatarUrl = avatarUrl;
    return byEmail.save();
  }

  const user = await User.create({
    googleId: profile.id,
    name: profile.displayName || email.split("@")[0],
    email,
    avatarUrl,
  });
  void logActivity(user, "account.created", { kind: "account", meta: { method: "google" } });
  return user;
}

function configurePassport() {
  if (!config.google.enabled) return passport;

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        store: new CookieStateStore(),
      },
      (accessToken, refreshToken, profile, done) => {
        findOrCreateGoogleUser(profile)
          .then((user) => done(null, user))
          .catch((err) => done(err));
      }
    )
  );

  return passport;
}

module.exports = { configurePassport, CookieStateStore, readCookie };
