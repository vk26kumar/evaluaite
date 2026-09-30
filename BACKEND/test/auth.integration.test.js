require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server-core");
const config = require("../src/config/env");
const { createApp } = require("../src/app");
const User = require("../src/models/User");
const Activity = require("../src/models/Activity");
const AuthCode = require("../src/models/AuthCode");
const { findOrCreateGoogleUser } = require("../src/config/passport");
const { signSessionToken, sha256 } = require("../src/services/token.service");
const { COMMON_PASSWORDS } = require("../src/utils/password");
const { PASSWORD, NEW_PASSWORD, OTHER_PASSWORD, WRONG_PASSWORD } = require("./credentials");

let mongo;
let server;
let base;

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "auth-test" });
  await User.init();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server?.close();
  await mongoose.disconnect();
  await mongo?.stop();
});

async function call(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function signUp(email, password = PASSWORD) {
  const res = await call("POST", "/api/auth/signup", { body: { name: "Test Teacher", email, password } });
  assert.equal(res.status, 201);
  return res.body;
}

const logIn = (email, password = PASSWORD) => call("POST", "/api/auth/login", { body: { email, password } });
const me = (token) => call("GET", "/api/auth/me", { token });

const googleProfile = (id, email, verified) => ({
  id,
  displayName: "Google Teacher",
  emails: [{ value: email, verified }],
  photos: [{ value: "https://example.com/photo.jpg" }],
});

async function waitForActivity(filter) {
  for (let i = 0; i < 20; i += 1) {
    const found = await Activity.findOne(filter);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
}

test("changing the password signs out other sessions and keeps this one", async () => {
  const { token: thisDevice } = await signUp("change@school.example");
  const { body: other } = await logIn("change@school.example");

  const res = await call("POST", "/api/profile/password", {
    token: thisDevice,
    body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.token, "returns a fresh token for this device");

  const stale = await me(other.token);
  assert.equal(stale.status, 401);
  assert.equal(stale.body.error.code, "SESSION_REVOKED");
  assert.equal((await me(thisDevice)).status, 401, "the token used for the change is retired too");
  assert.equal((await me(res.body.token)).status, 200);

  assert.equal((await logIn("change@school.example")).status, 401, "old password no longer works");
  assert.equal((await logIn("change@school.example", NEW_PASSWORD)).status, 200);
});

test("signing out other devices retires every older token", async () => {
  const { token: first } = await signUp("devices@school.example");
  const { body: second } = await logIn("devices@school.example");

  const res = await call("POST", "/api/profile/sessions/revoke", { token: first });
  assert.equal(res.status, 200);
  assert.equal((await me(second.token)).status, 401);
  assert.equal((await me(first)).status, 401);
  assert.equal((await me(res.body.token)).status, 200);
  assert.ok(await waitForActivity({ type: "account.sessions_revoked" }));
});

test("tokens issued before session versions existed keep working", async () => {
  const { user } = await signUp("legacy@school.example");
  const legacy = jwt.sign({ sub: user.id }, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: "1h",
  });
  assert.equal((await me(legacy)).status, 200);
});

test("linking Google removes a password nobody verified and signs out its sessions", async () => {
  const { token: squatter } = await signUp("claimed@school.example");

  const { user, passwordRemoved } = await findOrCreateGoogleUser(googleProfile("g-claimed", "Claimed@School.example", true));
  assert.equal(passwordRemoved, true);
  assert.equal(user.googleId, "g-claimed");

  assert.equal((await me(squatter)).status, 401, "the earlier session is signed out");
  const login = await logIn("claimed@school.example");
  assert.equal(login.status, 400, "the old password no longer signs in");

  const stored = await User.findById(user._id).select("+password");
  assert.equal(stored.password, undefined);
  assert.equal(stored.emailVerified, true);

  const activity = await waitForActivity({ user: user._id, type: "account.google_linked" });
  assert.equal(activity?.meta.passwordRemoved, true);

  const session = signSessionToken(stored);
  const added = await call("POST", "/api/profile/password", { token: session, body: { newPassword: OTHER_PASSWORD } });
  assert.equal(added.status, 200);
  const again = await findOrCreateGoogleUser(googleProfile("g-claimed", "claimed@school.example", true));
  assert.equal(again.passwordRemoved, false);
  assert.equal((await logIn("claimed@school.example", OTHER_PASSWORD)).status, 200);
});

test("linking Google keeps the password when the address was already verified", async () => {
  await User.create({
    name: "Verified Teacher",
    email: "verified@school.example",
    password: await bcrypt.hash(PASSWORD, 4),
    emailVerified: true,
  });
  const { passwordRemoved } = await findOrCreateGoogleUser(googleProfile("g-verified", "verified@school.example", true));
  assert.equal(passwordRemoved, false);
  assert.equal((await logIn("verified@school.example")).status, 200);
});

test("Google never links an address it hasn't verified", async () => {
  await signUp("unverified@school.example");
  for (const verified of [false, undefined]) {
    await assert.rejects(findOrCreateGoogleUser(googleProfile("g-unverified", "unverified@school.example", verified)));
  }
  const stored = await User.findByEmail("unverified@school.example", { withPassword: true });
  assert.equal(stored.googleId, undefined);
  assert.ok(stored.password);
});

test("a brand-new Google account is created with a verified email", async () => {
  const { user, passwordRemoved } = await findOrCreateGoogleUser(googleProfile("g-new", "New@School.example", true));
  assert.equal(passwordRemoved, false);
  assert.equal(user.email, "new@school.example");
  assert.equal(user.emailVerified, true);
});

test("the Google code exchange passes on the password-removed notice once", async () => {
  const user = await User.create({ name: "Notice", email: "notice@school.example", googleId: "g-notice" });
  const code = "a-one-time-code-that-is-long-enough";
  await AuthCode.create({
    codeHash: sha256(code),
    user: user._id,
    notice: "password_removed",
    expiresAt: new Date(Date.now() + 60_000),
  });

  const res = await call("POST", "/api/auth/google/exchange", { body: { code } });
  assert.equal(res.status, 200);
  assert.equal(res.body.notice, "password_removed");
  assert.equal((await me(res.body.token)).status, 200);

  const reused = await call("POST", "/api/auth/google/exchange", { body: { code } });
  assert.equal(reused.status, 401, "codes are single-use");
});

const outbox = [];
const emailService = require("../src/services/email.service");
emailService.sendEmail = async (message) => {
  outbox.push(message);
};

async function nextEmail(to, subject) {
  for (let i = 0; i < 40; i += 1) {
    const index = outbox.findIndex((message) => message.to === to && subject.test(message.subject));
    if (index >= 0) return outbox.splice(index, 1)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
}

const tokenIn = (message) => /token=([\w-]+)/.exec(message.text)?.[1];

test("forgot password answers the same whether or not the account exists", async () => {
  await signUp("forgot@school.example");
  const known = await call("POST", "/api/auth/password/forgot", { body: { email: "Forgot@School.example" } });
  const unknown = await call("POST", "/api/auth/password/forgot", { body: { email: "nobody@school.example" } });
  assert.equal(known.status, 200);
  assert.deepEqual(known.body, unknown.body);
  assert.ok(await nextEmail("forgot@school.example", /reset/i), "the real account gets a reset email");
  assert.equal(await nextEmail("nobody@school.example", /reset/i), null);
});

test("a reset link sets a new password, signs out other sessions and works once", async () => {
  const { token: oldSession } = await signUp("reset@school.example");
  await call("POST", "/api/auth/password/forgot", { body: { email: "reset@school.example" } });
  const link = tokenIn(await nextEmail("reset@school.example", /reset/i));
  assert.ok(link);

  const weak = await call("POST", "/api/auth/password/reset", { body: { token: link, password: [...COMMON_PASSWORDS][0] } });
  assert.equal(weak.status, 400);
  const personal = await call("POST", "/api/auth/password/reset", { body: { token: link, password: `reset${NEW_PASSWORD}` } });
  assert.equal(personal.status, 400, "a password containing the email name is refused");

  const res = await call("POST", "/api/auth/password/reset", { body: { token: link, password: NEW_PASSWORD } });
  assert.equal(res.status, 200, "refused attempts didn't use up the link");
  assert.equal((await me(res.body.token)).status, 200, "signs the user in");
  assert.equal(res.body.user.emailVerified, true, "resetting proves the inbox belongs to them");
  assert.equal((await me(oldSession)).status, 401);
  assert.equal((await logIn("reset@school.example", NEW_PASSWORD)).status, 200);
  assert.ok(await nextEmail("reset@school.example", /changed/i), "sends a password-changed notice");

  const reused = await call("POST", "/api/auth/password/reset", { body: { token: link, password: OTHER_PASSWORD } });
  assert.equal(reused.status, 400);
});

test("a newer reset email replaces the older link", async () => {
  await signUp("twice@school.example");
  await call("POST", "/api/auth/password/forgot", { body: { email: "twice@school.example" } });
  const first = tokenIn(await nextEmail("twice@school.example", /reset/i));
  await call("POST", "/api/auth/password/forgot", { body: { email: "twice@school.example" } });
  const second = tokenIn(await nextEmail("twice@school.example", /reset/i));
  const old = await call("POST", "/api/auth/password/reset", { body: { token: first, password: NEW_PASSWORD } });
  assert.equal(old.status, 400);
  const fresh = await call("POST", "/api/auth/password/reset", { body: { token: second, password: NEW_PASSWORD } });
  assert.equal(fresh.status, 200);
});

test("expired reset links are refused", async () => {
  const EmailToken = require("../src/models/EmailToken");
  const { user } = await signUp("expired@school.example");
  const link = "an-expired-token-that-is-long-enough";
  await EmailToken.create({
    user: user.id,
    purpose: "password_reset",
    tokenHash: sha256(link),
    expiresAt: new Date(Date.now() - 1000),
  });
  const res = await call("POST", "/api/auth/password/reset", { body: { token: link, password: NEW_PASSWORD } });
  assert.equal(res.status, 400);
});

test("sign-up sends a confirmation email and the link verifies the address", async () => {
  const { token, user } = await signUp("confirm@school.example");
  assert.equal(user.emailVerified, false);
  const link = tokenIn(await nextEmail("confirm@school.example", /confirm/i));
  assert.ok(link);

  const res = await call("POST", "/api/auth/email/verify", { body: { token: link } });
  assert.equal(res.status, 200);
  assert.equal((await me(token)).body.user.emailVerified, true);
  const reused = await call("POST", "/api/auth/email/verify", { body: { token: link } });
  assert.equal(reused.status, 400, "links work once");

  const again = await call("POST", "/api/profile/email/verification", { token });
  assert.equal(again.body.alreadyVerified, true);
});

test("an unconfirmed user can ask for a new confirmation email", async () => {
  const { token } = await signUp("resend@school.example");
  await nextEmail("resend@school.example", /confirm/i);
  const res = await call("POST", "/api/profile/email/verification", { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.sent, true);
  assert.ok(await nextEmail("resend@school.example", /confirm/i));
});

test("deleting an account needs the password when it has one", async () => {
  const { token } = await signUp("leaving@school.example");
  const wrong = await call("DELETE", "/api/profile", { token, body: { confirm: "DELETE", password: WRONG_PASSWORD } });
  assert.equal(wrong.status, 400);
  const missing = await call("DELETE", "/api/profile", { token, body: { confirm: "DELETE" } });
  assert.equal(missing.status, 400);
  const ok = await call("DELETE", "/api/profile", { token, body: { confirm: "DELETE", password: PASSWORD } });
  assert.equal(ok.status, 204);
  assert.equal((await me(token)).status, 401);
});
