import { useCallback, useEffect, useMemo, useState } from "react";
import { api, onSessionExpired, session } from "../lib/api";
import { AuthContext, useToast } from "./contexts";

/**
 * Session state machine:
 *   checking      a stored token is being verified with the server
 *   authenticated user is known
 *   anonymous     no valid session
 *   unreachable   a token exists but the server couldn't be reached to verify it
 */
export default function AuthProvider({ children }) {
  const toast = useToast();
  const [state, setState] = useState(() => ({
    status: session.getToken() ? "checking" : "anonymous",
    user: null,
  }));

  const verify = useCallback(async (signal) => {
    try {
      const { user } = await api.get("/api/auth/me", { signal, timeout: 70_000 });
      setState({ status: "authenticated", user });
    } catch (error) {
      if (signal?.aborted) return;
      if (error.status === 401) setState({ status: "anonymous", user: null });
      else setState({ status: "unreachable", user: null });
    }
  }, []);

  useEffect(() => {
    if (state.status !== "checking") return undefined;
    const controller = new AbortController();
    verify(controller.signal);
    return () => controller.abort();
  }, [state.status, verify]);

  // Any request that comes back 401 ends the session everywhere.
  useEffect(
    () =>
      onSessionExpired(() => {
        setState({ status: "anonymous", user: null });
        toast.info("Your session expired. Please sign in again.");
      }),
    [toast]
  );

  // Signing out in one tab signs out every tab.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === "evaluaite.session" && !event.newValue) setState({ status: "anonymous", user: null });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = useCallback(({ token, user }) => {
    session.setToken(token);
    setState({ status: "authenticated", user });
  }, []);

  const signOut = useCallback(() => {
    session.clear();
    setState({ status: "anonymous", user: null });
  }, []);

  const retry = useCallback(() => setState({ status: "checking", user: null }), []);

  // After a profile edit, so the header and menus show the new details at once.
  const updateUser = useCallback(
    (user) => setState((current) => (current.status === "authenticated" ? { ...current, user } : current)),
    []
  );

  const value = useMemo(
    () => ({ ...state, isAuthenticated: state.status === "authenticated", signIn, signOut, retry, updateUser }),
    [state, signIn, signOut, retry, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
