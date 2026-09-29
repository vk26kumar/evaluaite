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

/**
 * Returns `{ user, passwordRemoved }`. `passwordRemoved` is true when linking
 * Google to an existing account removed a password nobody had verified.
 */
async function findOrCreateGoogleUser(profile) {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  const emailVerified = profile.emails?.[0]?.verified === true;
  const avatarUrl = profile.photos?.[0]?.value;

  const existing = await User.findOne({ googleId: profile.id });
  if (existing) return { user: existing, passwordRemoved: false };

  if (!email) throw new Error("Google did not share an email address for this account.");

  // Link to an existing email/password account, but only when Google has
  // verified the address, so nobody can take over an account by claiming it.
  const byEmail = await User.findByEmail(email, { withPassword: true });
  if (byEmail) {
    if (!emailVerified) throw new Error("This Google account's email address isn't verified.");

    // Nobody proved they owned this address when the password was set, so it
    // may belong to someone who registered the address first and waited for
    // the real owner to arrive. Google has now proved ownership: remove that
    // password and sign out every earlier session, leaving the owner in sole
    // control. They can add a new password from their profile.
    const passwordRemoved = Boolean(byEmail.password) && !byEmail.emailVerified;
    if (passwordRemoved) {
      byEmail.password = undefined;
      byEmail.tokenVersion = (byEmail.tokenVersion || 0) + 1;
    }
    byEmail.googleId = profile.id;
    byEmail.emailVerified = true;
    if (!byEmail.avatarUrl && avatarUrl) byEmail.avatarUrl = avatarUrl;
    await byEmail.save();

    void logActivity(byEmail, "account.google_linked", { kind: "account", meta: { passwordRemoved } });
    return { user: byEmail, passwordRemoved };
  }

  const user = await User.create({
    googleId: profile.id,
    name: profile.displayName || email.split("@")[0],
    email,
    emailVerified,
    avatarUrl,
  });
  void logActivity(user, "account.created", { kind: "account", meta: { method: "google" } });
  return { user, passwordRemoved: false };
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
          .then(({ user, passwordRemoved }) => done(null, user, { passwordRemoved }))
          .catch((err) => done(err));
      }
    )
  );

  return passport;
}

module.exports = { configurePassport, CookieStateStore, readCookie, findOrCreateGoogleUser };
