const config = require("../config/env");
const logger = require("../utils/logger");

const TIMEOUT_MS = 10_000;

async function post(url, headers, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw Object.assign(new Error(`Email provider responded with ${response.status}: ${detail}`), { status: response.status });
  }
}

const providers = {
  brevo: ({ to, subject, html, text }) =>
    post(
      "https://api.brevo.com/v3/smtp/email",
      { "api-key": config.email.apiKey },
      {
        sender: { email: config.email.from, name: config.email.fromName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }
    ),
  resend: ({ to, subject, html, text }) =>
    post(
      "https://api.resend.com/emails",
      { Authorization: `Bearer ${config.email.apiKey}` },
      { from: `${config.email.fromName} <${config.email.from}>`, to: [to], subject, html, text }
    ),
  log: async ({ to, subject, text }) => {
    logger.info("Email not sent (EMAIL_PROVIDER=log)", { to, subject, text });
  },
};

function isConfigured() {
  const { provider, apiKey, from } = config.email;
  if (provider === "log") return true;
  return Boolean(providers[provider] && apiKey && from);
}

async function sendEmail(message) {
  if (!isConfigured()) throw new Error("Email is not configured.");
  await providers[config.email.provider](message);
  logger.info("Email sent", { provider: config.email.provider, subject: message.subject });
}

module.exports = { isConfigured, sendEmail };
