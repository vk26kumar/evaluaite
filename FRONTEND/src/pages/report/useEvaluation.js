import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";

export const IN_PROGRESS = ["queued", "reading", "grading"];

/** Poll quickly at first, then back off: most sheets finish within a minute. */
function nextDelay(elapsedMs) {
  if (elapsedMs < 30_000) return 2_000;
  if (elapsedMs < 120_000) return 4_000;
  return 8_000;
}

/**
 * Loads an evaluation and keeps polling while it is being graded.
 * A failed poll keeps the last good data on screen and simply retries.
 */
export function useEvaluation(id) {
  const [state, setState] = useState({ phase: "loading", evaluation: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer;
    let failures = 0;

    const load = async () => {
      try {
        const { evaluation } = await api.get(`/api/evaluations/${id}`, { signal: controller.signal });
        failures = 0;
        setState({ phase: "ready", evaluation, error: null });
        if (IN_PROGRESS.includes(evaluation.status)) {
          timer = setTimeout(load, nextDelay(Date.now() - startedAt));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const transient = error.status === 0 || error.status >= 500;
        failures += 1;
        setState((current) => {
          if (current.evaluation && transient) return current;
          return { phase: "error", evaluation: null, error };
        });
        if (transient && failures < 6) timer = setTimeout(load, 3_000 * failures);
      }
    };

    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, reloadKey]);

  const setEvaluation = useCallback((evaluation) => setState({ phase: "ready", evaluation, error: null }), []);
  const reload = useCallback(() => {
    setState({ phase: "loading", evaluation: null, error: null });
    setReloadKey((key) => key + 1);
  }, []);

  return { ...state, setEvaluation, reload };
}
