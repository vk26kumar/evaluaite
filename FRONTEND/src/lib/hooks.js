import { useEffect } from "react";

const APP_NAME = "AI-EvaluAIte";

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} · AI grading for handwritten answer sheets`;
  }, [title]);
}

/** Warns before leaving the page while `when` is true (e.g. unsaved work). */
export function useBeforeUnload(when) {
  useEffect(() => {
    if (!when) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);
}
