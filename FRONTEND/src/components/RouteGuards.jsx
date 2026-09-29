import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/contexts";
import { ErrorState, PageLoader } from "./Feedback";

export function RequireAuth() {
  const { status, retry, exitTo } = useAuth();
  const location = useLocation();
  const [wasSignedIn, setWasSignedIn] = useState(status === "authenticated");

  useEffect(() => {
    if (status === "authenticated") setWasSignedIn(true);
  }, [status]);

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
    if (wasSignedIn && exitTo) return <Navigate to={exitTo} replace />;
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") return <PageLoader label="Checking your session…" />;
  if (status === "authenticated") {
    const home = location.pathname === "/signup" ? "/evaluate" : "/evaluations";
    return <Navigate to={location.state?.from || home} replace />;
  }
  return <Outlet />;
}
