const APP_NAME = "AI-EvaluAIte";

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function layout({ greeting, paragraphs, action, footnote }) {
  const body = paragraphs.map((text) => `<p style="margin:0 0 16px">${escapeHtml(text)}</p>`).join("");
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#1f2328;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(action.label)}</a></p>
<p style="margin:0 0 16px;color:#57606a;font-size:13px">If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(action.url)}</span></p>`
    : "";
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f4ef">
<div style="max-width:520px;margin:0 auto;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1f2328">
<p style="margin:0 0 24px;font-size:18px;font-weight:700">${APP_NAME}</p>
<p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
${body}${button}
<p style="margin:24px 0 0;color:#57606a;font-size:13px">${escapeHtml(footnote)}</p>
</div>
</body></html>`;

  const text = [greeting, ...paragraphs, action ? `${action.label}: ${action.url}` : "", footnote, `- ${APP_NAME}`]
    .filter(Boolean)
    .join("\n\n");

  return { html, text };
}

const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "there";

function passwordResetEmail({ name, url, minutes }) {
  return {
    subject: `Reset your ${APP_NAME} password`,
    ...layout({
      greeting: `Hi ${firstName(name)},`,
      paragraphs: [
        "Someone asked to reset the password for your account. If that was you, choose a new password with the button below.",
        `The link works once and expires in ${minutes} minutes.`,
      ],
      action: { label: "Choose a new password", url },
      footnote: "If you didn't ask for this, you can ignore this email. Your password won't change.",
    }),
  };
}

function verifyEmailEmail({ name, url, hours }) {
  return {
    subject: `Confirm your email for ${APP_NAME}`,
    ...layout({
      greeting: `Hi ${firstName(name)},`,
      paragraphs: [
        "Please confirm this is your email address. Confirmed addresses can always recover their account.",
        `The link expires in ${hours} hours.`,
      ],
      action: { label: "Confirm my email", url },
      footnote: "If you didn't create an account, you can ignore this email.",
    }),
  };
}

function passwordChangedEmail({ name }) {
  return {
    subject: `Your ${APP_NAME} password was changed`,
    ...layout({
      greeting: `Hi ${firstName(name)},`,
      paragraphs: [
        "The password for your account was just changed, and every other device was signed out.",
        "If you made this change, there's nothing else to do.",
      ],
      footnote: "If you didn't change it, reset your password now from the sign-in page and contact us by replying to this email.",
    }),
  };
}

module.exports = { passwordResetEmail, verifyEmailEmail, passwordChangedEmail, escapeHtml };
