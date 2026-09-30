import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import ThemeProvider from "./context/ThemeProvider";
import ToastProvider from "./context/ToastProvider";
import AuthProvider from "./context/AuthProvider";
import App from "./App";

function upgradeHashUrl() {
  if (!window.location.hash.startsWith("#/")) return false;
  window.history.replaceState(null, "", window.location.hash.slice(1));
  return true;
}

upgradeHashUrl();
window.addEventListener("hashchange", () => {
  if (upgradeHashUrl()) window.dispatchEvent(new PopStateEvent("popstate"));
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
