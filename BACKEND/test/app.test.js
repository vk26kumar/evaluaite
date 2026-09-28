require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

let server;
let base;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test("unknown routes return a JSON 404", async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error.code, "NOT_FOUND");
});

test("protected routes require a session token", async () => {
  for (const path of ["/api/evaluations", "/api/auth/me"]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 401, path);
  }
  const slides = await fetch(`${base}/api/slides`, { method: "POST" });
  assert.equal(slides.status, 401);
  const draft = await fetch(`${base}/api/ai/reference-answer`, { method: "POST" });
  assert.equal(draft.status, 401);
  for (const [method, path] of [
    ["GET", "/api/assignments"],
    ["POST", "/api/assignments"],
    ["GET", "/api/assignments/0123456789abcdef01234567/pdf"],
    ["GET", "/api/profile"],
    ["GET", "/api/profile/students"],
    ["GET", "/api/profile/activity"],
    ["DELETE", "/api/profile"],
  ]) {
    const res = await fetch(`${base}${path}`, { method });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test("forged tokens are rejected", async () => {
  const res = await fetch(`${base}/api/evaluations`, { headers: { Authorization: "Bearer not.a.jwt" } });
  assert.equal(res.status, 401);
});

test("signup validates input before touching the database", async () => {
  const res = await fetch(`${base}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A", email: "not-an-email", password: "short" }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  const fields = body.error.details.map((d) => d.field).sort();
  assert.deepEqual(fields, ["email", "name", "password"]);
});

test("malformed JSON gets a 400, not a 500", async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad json",
  });
  assert.equal(res.status, 400);
});

test("CORS allows the configured client and nothing else", async () => {
  const allowed = await fetch(`${base}/api/auth/providers`, { headers: { Origin: "http://localhost:5173" } });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const denied = await fetch(`${base}/api/auth/providers`, { headers: { Origin: "https://evil.example" } });
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});

test("security headers are set", async () => {
  const res = await fetch(`${base}/api/auth/providers`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("health reports the database as down when it isn't connected", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.database, "down");
  assert.equal(body.ai, "not_configured");
});
