import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/contexts";
import { ErrorState, PageLoader } from "./Feedback";

/**
 * Waits for the stored session to be verified before deciding. Rendering a
 * redirect before that check finishes is what used to bounce signed-in users
 * to the sign-up page.
 */
export function RequireAuth() {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === "checking") return <PageLoader label="Checking your session…" />;
  if (status === "unreachable") {
    return (
      <ErrorState
        title="Can't reach the server"
        message="The server may be waking up. This can take up to a minute on the first visit."
        onRetry={retry}
      />
    );
  }
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Sign-in and sign-up pages: signed-in users go straight to the app. */
export function PublicOnly() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") return <PageLoader label="Checking your session…" />;
  if (status === "authenticated") return <Navigate to={location.state?.from || "/evaluations"} replace />;
  return <Outlet />;
}
