import { useEffect, useState } from "react";
import { api } from "./api";

let providersPromise;

function loadProviders() {
  providersPromise ??= api.get("/api/auth/providers", { timeout: 70_000 }).catch(() => {
    providersPromise = undefined;
    return { google: false, email: false };
  });
  return providersPromise;
}

export function useProviders() {
  const [providers, setProviders] = useState({ google: false, email: false });

  useEffect(() => {
    let active = true;
    loadProviders().then((result) => active && setProviders({ google: Boolean(result.google), email: Boolean(result.email) }));
    return () => {
      active = false;
    };
  }, []);

  return providers;
}
