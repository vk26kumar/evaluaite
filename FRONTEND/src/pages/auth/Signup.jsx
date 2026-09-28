import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuCheck, LuEye, LuEyeOff } from "react-icons/lu";
import { api } from "../../lib/api";
import { useAuth } from "../../context/contexts";
import { useDocumentTitle } from "../../lib/hooks";
import { destinationLabel } from "../../lib/features";
import Field from "../../components/Field";
import AuthLayout, { GoogleButton } from "./AuthLayout";

const PASSWORD_RULES = [
  { id: "length", label: "8+ characters", test: (value) => value.length >= 8 },
  { id: "letter", label: "A letter", test: (value) => /[A-Za-z]/.test(value) },
  { id: "number", label: "A number", test: (value) => /\d/.test(value) },
];

export default function Signup() {
  useDocumentTitle("Create an account");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const destination = destinationLabel(location.state?.from);

  const update = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (values.name.trim().length < 2) errors.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
    if (!PASSWORD_RULES.every((rule) => rule.test(values.password))) {
      errors.password = "Use 8+ characters with at least one letter and one number.";
    }
    return errors;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      const result = await api.post("/api/auth/signup", {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      signIn(result);
      navigate(location.state?.from || "/evaluate", { replace: true });
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFormError(error.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up an answer key once, then grade the whole class against it."
      notice={destination ? `Create an account to use ${destination}. It takes under a minute.` : null}
      footer={
        <>
          Already have an account? <Link to="/login" state={location.state}>Sign in</Link>
        </>
      }
    >
      <GoogleButton label="Sign up with Google" />
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && (
          <p className="auth-error" role="alert">
            {formError}{" "}
            {formError.toLowerCase().includes("already exists") && <Link to="/login">Sign in instead</Link>}
          </p>
        )}
        <Field label="Your name" error={fieldErrors.name}>
          {(props) => (
            <input
              {...props}
              className="input"
              autoComplete="name"
              value={values.name}
              onChange={update("name")}
              autoFocus
            />
          )}
        </Field>
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
            />
          )}
        </Field>
        <Field label="Password" error={fieldErrors.password}>
          {(props) => (
            <div className="input-group">
              <input
                {...props}
                className="input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={values.password}
                onChange={update("password")}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}
              </button>
            </div>
          )}
        </Field>
        <ul className="password-rules" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(values.password);
            return (
              <li key={rule.id} data-met={met}>
                <LuCheck aria-hidden="true" />
                {rule.label}
                <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
              </li>
            );
          })}
        </ul>
        <button type="submit" className="btn btn-primary btn-lg btn-block" data-loading={submitting || undefined}>
          Create account
        </button>
      </form>
    </AuthLayout>
  );
}
