// Session and account-linking rules, against a real (in-memory) MongoDB.
// The first run downloads a MongoDB binary, which takes a minute.
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

async function signUp(email, password = "chalk1234") {
  const res = await call("POST", "/api/auth/signup", { body: { name: "Test Teacher", email, password } });
  assert.equal(res.status, 201);
  return res.body;
}

const logIn = (email, password = "chalk1234") => call("POST", "/api/auth/login", { body: { email, password } });
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
    body: { currentPassword: "chalk1234", newPassword: "newchalk99" },
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.token, "returns a fresh token for this device");

  const stale = await me(other.token);
  assert.equal(stale.status, 401);
  assert.equal(stale.body.error.code, "SESSION_REVOKED");
  assert.equal((await me(thisDevice)).status, 401, "the token used for the change is retired too");
  assert.equal((await me(res.body.token)).status, 200);

  assert.equal((await logIn("change@school.example")).status, 401, "old password no longer works");
  assert.equal((await logIn("change@school.example", "newchalk99")).status, 200);
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
  // Someone registers the address first, with a password of their choosing...
  const { token: squatter } = await signUp("claimed@school.example");

  // ...then the real owner signs in with Google.
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

  // The owner can then add a password of their own, and later Google sign-ins keep it.
  const session = signSessionToken(stored);
  const added = await call("POST", "/api/profile/password", { token: session, body: { newPassword: "owner12345" } });
  assert.equal(added.status, 200);
  const again = await findOrCreateGoogleUser(googleProfile("g-claimed", "claimed@school.example", true));
  assert.equal(again.passwordRemoved, false);
  assert.equal((await logIn("claimed@school.example", "owner12345")).status, 200);
});

test("linking Google keeps the password when the address was already verified", async () => {
  await User.create({
    name: "Verified Teacher",
    email: "verified@school.example",
    password: await bcrypt.hash("chalk1234", 4),
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
