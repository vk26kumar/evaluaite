import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/contexts";
import { useDocumentTitle } from "../../lib/hooks";
import { ErrorState, PageLoader } from "../../components/Feedback";

/** Exchanges the one-time code from Google sign-in for a session. */
export default function AuthCallback() {
  useDocumentTitle("Signing you in");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [error, setError] = useState("");
  // The code is single-use; make sure a re-render or StrictMode's double
  // effect never spends it twice.
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
        navigate("/evaluations", { replace: true });
      })
      .catch((err) => setError(err.message));
  }, [params, navigate, signIn]);

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
