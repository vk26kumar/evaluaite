require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../src/config/env");
const email = require("../src/services/email.service");
const { passwordResetEmail, escapeHtml } = require("../src/services/emailTemplates");

function captureFetch(status = 201) {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    return new Response(status < 300 ? "{}" : "bad key", { status });
  };
  return { calls, restore: () => (global.fetch = original) };
}

function useProvider(provider) {
  const saved = { ...config.email };
  Object.assign(config.email, { provider, apiKey: "test-key", from: "noreply@school.example", fromName: "AI-EvaluAIte" });
  return () => Object.assign(config.email, saved);
}

const message = { to: "teacher@school.example", subject: "Hello", html: "<p>Hi</p>", text: "Hi" };

test("Brevo gets the sender, recipient and both bodies", async () => {
  const reset = useProvider("brevo");
  const { calls, restore } = captureFetch();
  try {
    await email.sendEmail(message);
    assert.equal(calls[0].url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(calls[0].headers["api-key"], "test-key");
    assert.deepEqual(calls[0].body.to, [{ email: "teacher@school.example" }]);
    assert.equal(calls[0].body.sender.email, "noreply@school.example");
    assert.equal(calls[0].body.textContent, "Hi");
  } finally {
    restore();
    reset();
  }
});

test("Resend gets a bearer key and a named sender", async () => {
  const reset = useProvider("resend");
  const { calls, restore } = captureFetch(200);
  try {
    await email.sendEmail(message);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    assert.equal(calls[0].headers.Authorization, "Bearer test-key");
    assert.equal(calls[0].body.from, "AI-EvaluAIte <noreply@school.example>");
    assert.deepEqual(calls[0].body.to, ["teacher@school.example"]);
  } finally {
    restore();
    reset();
  }
});

test("a provider error is raised, not swallowed", async () => {
  const reset = useProvider("brevo");
  const { restore } = captureFetch(401);
  try {
    await assert.rejects(email.sendEmail(message), /401/);
  } finally {
    restore();
    reset();
  }
});

test("email is off until a key and sender are set", () => {
  const reset = useProvider("brevo");
  try {
    config.email.apiKey = undefined;
    assert.equal(email.isConfigured(), false);
    config.email.provider = "none";
    assert.equal(email.isConfigured(), false);
  } finally {
    reset();
  }
});

test("templates escape names and include a plain-text link", () => {
  const { html, text, subject } = passwordResetEmail({
    name: "<b>Riya</b> Sen",
    url: "https://app.example/#/reset-password?token=abc",
    minutes: 30,
  });
  assert.match(subject, /Reset/);
  assert.ok(!html.includes("<b>Riya</b>"));
  assert.ok(html.includes(escapeHtml("<b>Riya</b>")));
  assert.ok(text.includes("https://app.example/#/reset-password?token=abc"));
});
