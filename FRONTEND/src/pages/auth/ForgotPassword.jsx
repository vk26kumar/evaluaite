import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LuMailCheck } from "react-icons/lu";
import { api } from "../../lib/api";
import { useDocumentTitle } from "../../lib/hooks";
import Field from "../../components/Field";
import AuthLayout from "./AuthLayout";

export default function ForgotPassword() {
  useDocumentTitle("Reset your password");
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/auth/password/forgot", { email: address });
      setSentTo(address);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send you a link to choose a new password."
      footer={
        <>
          Remembered it? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {sentTo ? (
        <div className="auth-form">
          <div className="auth-success" role="status">
            <LuMailCheck aria-hidden="true" />
            <p>
              If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It works once and expires
              in 30 minutes. Check your spam folder if it doesn&apos;t arrive in a few minutes.
            </p>
          </div>
          <Link to="/login" className="btn btn-ink btn-lg btn-block">
            Back to sign in
          </Link>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setSentTo("")}>
            Use a different email
          </button>
        </div>
      ) : (
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
      )}
    </AuthLayout>
  );
}
