import { useCallback, useEffect, useMemo, useState } from "react";
import { readStorage, writeStorage } from "../lib/storage";
import { ThemeContext } from "./contexts";

const STORAGE_KEY = "evaluaite.theme";
const THEME_COLORS = { light: "#f4efe4", dark: "#111714" };
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function resolve(preference) {
  if (preference === "light" || preference === "dark") return preference;
  return media().matches ? "dark" : "light";
}

export default function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readStorage(STORAGE_KEY, "system"));
  const [resolved, setResolved] = useState(() => resolve(preference));

  useEffect(() => {
    const apply = () => {
      const theme = resolve(preference);
      setResolved(theme);
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
    };
    apply();
    if (preference !== "system") return undefined;
    const query = media();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [preference]);

  const setPreference = useCallback((next) => {
    writeStorage(STORAGE_KEY, next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
