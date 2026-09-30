import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LuMailCheck } from "react-icons/lu";
import { api } from "../../lib/api";
import { useAuth } from "../../context/contexts";
import { useDocumentTitle } from "../../lib/hooks";
import { PageLoader } from "../../components/Feedback";
import AuthLayout from "./AuthLayout";

export default function VerifyEmail() {
  useDocumentTitle("Confirm your email");
  const [params] = useSearchParams();
  const { isAuthenticated, user, updateUser } = useAuth();
  const token = params.get("token");
  const [state, setState] = useState(() =>
    token ? { status: "working", message: "" } : { status: "error", message: "This link is incomplete. Open the link from the email again." }
  );
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    api
      .post("/api/auth/email/verify", { token })
      .then(() => setState({ status: "done", message: "" }))
      .catch((err) => setState({ status: "error", message: err.message }));
  }, [token]);

  useEffect(() => {
    if (state.status === "done" && user && !user.emailVerified) updateUser({ ...user, emailVerified: true });
  }, [state.status, user, updateUser]);

  if (state.status === "working") return <PageLoader label="Confirming your email…" />;
  const done = state.status === "done" || Boolean(user?.emailVerified);

  const next = isAuthenticated ? { to: "/evaluations", label: "Continue to the app" } : { to: "/login", label: "Sign in" };

  return (
    <AuthLayout
      title={done ? "Email confirmed" : "We couldn't confirm your email"}
      subtitle={done ? "Thanks. You can always recover your account through this address." : null}
    >
      <div className="auth-form">
        {done ? (
          <div className="auth-success" role="status">
            <LuMailCheck aria-hidden="true" />
            <p>Your email address is confirmed.</p>
          </div>
        ) : (
          <p className="auth-error" role="alert">
            {state.message} You can send a new link from Profile, Account.
          </p>
        )}
        <Link to={next.to} className="btn btn-ink btn-lg btn-block">
          {next.label}
        </Link>
      </div>
    </AuthLayout>
  );
}
