import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth, useToast } from "../../context/contexts";
import { useDocumentTitle } from "../../lib/hooks";
import { ErrorState, PageLoader } from "../../components/Feedback";

export default function AuthCallback() {
  useDocumentTitle("Signing you in");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const toast = useToast();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get("code");
    if (!code) {
      navigate("/login?error=google", { replace: true });
      return;
    }

    api
      .post("/api/auth/google/exchange", { code })
      .then((result) => {
        signIn(result);
        if (result.notice === "password_removed") {
          toast.info(
            "Google is now linked to your account. For your security, the old password was removed and other devices were signed out. You can add a new password in Profile → Account.",
            { duration: 12_000 }
          );
        }
        navigate("/evaluations", { replace: true });
      })
      .catch((err) => setError(err.message));
  }, [params, navigate, signIn, toast]);

  if (error) {
    return (
      <div className="container container-narrow page">
        <ErrorState title="Sign-in didn't finish" message={error} />
        <p style={{ textAlign: "center" }}>
          <Link to="/login" className="btn">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return <PageLoader label="Signing you in…" />;
}
