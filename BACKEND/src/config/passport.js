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
  const emailVerified = profile.emails?.[0]?.verified === true;
  const avatarUrl = profile.photos?.[0]?.value;

  const existing = await User.findOne({ googleId: profile.id });
  if (existing) return { user: existing, passwordRemoved: false };

  if (!email) throw new Error("Google did not share an email address for this account.");

  const byEmail = await User.findByEmail(email, { withPassword: true });
  if (byEmail) {
    if (!emailVerified) throw new Error("This Google account's email address isn't verified.");

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

module.exports = { configurePassport, findOrCreateGoogleUser };
