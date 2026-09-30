import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/contexts";
import { useDocumentTitle } from "../../lib/hooks";
import { destinationLabel } from "../../lib/features";
import Field from "../../components/Field";
import AuthLayout, { GoogleButton } from "./AuthLayout";
import PasswordInput from "./PasswordInput";

const OAUTH_ERRORS = {
  google: "Google sign-in didn't finish. Please try again.",
  google_unavailable: "Google sign-in isn't set up on this server yet. Use your email and password instead.",
};

export default function Login() {
  useDocumentTitle("Sign in");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(OAUTH_ERRORS[params.get("error")] || "");
  const [submitting, setSubmitting] = useState(false);
  const destination = destinationLabel(location.state?.from);

  const update = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!values.email.trim()) errors.email = "Enter your email address.";
    if (!values.password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      const result = await api.post("/api/auth/login", values);
      signIn(result);
      navigate(location.state?.from || "/evaluations", { replace: true });
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      notice={destination ? `Sign in to use ${destination}. You'll go straight there afterwards.` : null}
      footer={
        <>
          New here? <Link to="/signup" state={location.state}>Create an account</Link>
        </>
      }
    >
      <GoogleButton />
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && (
          <p className="auth-error" role="alert">
            {formError}
          </p>
        )}
        <Field label="Email" error={fieldErrors.email}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={values.email}
              onChange={update("email")}
              autoFocus
            />
          )}
        </Field>
        <PasswordInput
          value={values.password}
          onChange={update("password")}
          error={fieldErrors.password}
          autoComplete="current-password"
        />
        <p className="auth-row">
          <Link to="/forgot-password" state={{ email: values.email.trim() }}>
            Forgot password?
          </Link>
        </p>
        <button type="submit" className="btn btn-ink btn-lg btn-block" data-loading={submitting || undefined}>
          Sign in
        </button>
      </form>
    </AuthLayout>
  );
}
