import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth, useToast } from "../../context/contexts";
import { useDocumentTitle } from "../../lib/hooks";
import { meetsPasswordRules } from "../../lib/password";
import AuthLayout from "./AuthLayout";
import PasswordInput from "./PasswordInput";

export default function ResetPassword() {
  useDocumentTitle("Choose a new password");
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const toast = useToast();

  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [linkError, setLinkError] = useState(token ? "" : "This link is incomplete. Open the link from the email again, or request a new one.");
  const [submitting, setSubmitting] = useState(false);

  const update = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!meetsPasswordRules(values.password)) found.password = "Use 8+ characters with at least one letter and one number.";
    if (values.confirm !== values.password) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const result = await api.post("/api/auth/password/reset", { token, password: values.password });
      signIn(result);
      toast.success("Password updated. You're signed in, and any other devices were signed out.");
      navigate("/evaluations", { replace: true });
    } catch (err) {
      if (err.fieldErrors.token) setLinkError(err.fieldErrors.token);
      else setErrors(err.fieldErrors.password ? err.fieldErrors : { password: err.message });
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick something you don't use on other websites."
      footer={
        <>
          Remembered it? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {linkError ? (
        <div className="auth-form">
          <p className="auth-error" role="alert">
            {linkError}
          </p>
          <Link to="/forgot-password" className="btn btn-ink btn-lg btn-block">
            Request a new link
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <PasswordInput label="New password" value={values.password} onChange={update("password")} error={errors.password} autoFocus showRules />
          <PasswordInput label="Confirm new password" value={values.confirm} onChange={update("confirm")} error={errors.confirm} />
          <button type="submit" className="btn btn-ink btn-lg btn-block" data-loading={submitting || undefined}>
            Save new password
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
