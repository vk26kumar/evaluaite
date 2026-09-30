import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LuMailCheck } from "react-icons/lu";
import { api } from "../../lib/api";
import { useAuth, useToast } from "../../context/contexts";
import { useDocumentTitle } from "../../lib/hooks";
import { useProviders } from "../../lib/providers";
import { meetsPasswordRules } from "../../lib/password";
import Field from "../../components/Field";
import AuthLayout from "./AuthLayout";
import PasswordInput from "./PasswordInput";

const looksLikeEmail = (value) => /^\S+@\S+\.\S+$/.test(value.trim());

function EmailLinkForm({ email, setEmail }) {
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!looksLikeEmail(email)) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/auth/password/forgot", { email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="auth-form">
        <div className="auth-success" role="status">
          <LuMailCheck aria-hidden="true" />
          <p>
            If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It works once and expires in
            30 minutes. Check your spam folder if it doesn&apos;t arrive in a few minutes.
          </p>
        </div>
        <Link to="/login" className="btn btn-ink btn-lg btn-block">
          Back to sign in
        </Link>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setSentTo("")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <Field label="Email" error={error}>
        {(props) => (
          <input
            {...props}
            className="input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            autoFocus
          />
        )}
      </Field>
      <button type="submit" className="btn btn-ink btn-lg btn-block" data-loading={submitting || undefined}>
        Send reset link
      </button>
    </form>
  );
}

function RecoveryCodeForm({ email, setEmail }) {
  const { signIn } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ code: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!looksLikeEmail(email)) found.email = "Enter the email address you signed up with.";
    if (values.code.replace(/[^a-z0-9]/gi, "").length < 10) found.code = "Enter one of your recovery codes, e.g. ABCDE-12345.";
    if (!meetsPasswordRules(values.password)) found.password = "Use 8+ characters with at least one letter and one number.";
    if (values.confirm !== values.password) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const result = await api.post("/api/auth/password/recover", { email: email.trim(), code: values.code, password: values.password });
      signIn(result);
      toast.success(
        result.codesLeft > 2
          ? `Password updated. You have ${result.codesLeft} recovery codes left.`
          : `Password updated. Only ${result.codesLeft} recovery codes left: create new ones in Profile, Account.`,
        { duration: 9000 }
      );
    } catch (err) {
      setErrors(Object.keys(err.fieldErrors).length ? err.fieldErrors : { code: err.message });
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <Field label="Email" error={errors.email}>
        {(props) => (
          <input
            {...props}
            className="input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            autoFocus={!email}
          />
        )}
      </Field>
      <Field label="Recovery code" error={errors.code} hint="One of the codes you saved from Profile, Account. Each code works once.">
        {(props) => (
          <input
            {...props}
            className="input mono"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCDE-12345"
            value={values.code}
            onChange={update("code")}
            autoFocus={Boolean(email)}
          />
        )}
      </Field>
      <PasswordInput label="New password" value={values.password} onChange={update("password")} error={errors.password} showRules />
      <PasswordInput label="Confirm new password" value={values.confirm} onChange={update("confirm")} error={errors.confirm} />
      <button type="submit" className="btn btn-ink btn-lg btn-block" data-loading={submitting || undefined}>
        Save new password
      </button>
      <p className="auth-legal">No recovery codes? If your account uses Google, sign in with Google instead.</p>
    </form>
  );
}

export default function ForgotPassword() {
  useDocumentTitle("Reset your password");
  const location = useLocation();
  const providers = useProviders();
  const [email, setEmail] = useState(location.state?.email || "");
  const [method, setMethod] = useState("auto");
  const useCode = method === "code" || (method === "auto" && !providers.email);

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        useCode
          ? "Enter your email, one of your saved recovery codes, and a new password."
          : "Enter the email you signed up with and we'll send you a link to choose a new password."
      }
      footer={
        <>
          Remembered it? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {useCode ? <RecoveryCodeForm email={email} setEmail={setEmail} /> : <EmailLinkForm email={email} setEmail={setEmail} />}
      {providers.email && (
        <p className="auth-row auth-switch">
          <button type="button" className="auth-link" onClick={() => setMethod(useCode ? "email" : "code")}>
            {useCode ? "Email me a reset link instead" : "Use a recovery code instead"}
          </button>
        </p>
      )}
    </AuthLayout>
  );
}
