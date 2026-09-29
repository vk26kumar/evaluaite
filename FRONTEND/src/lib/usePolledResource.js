import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

function nextDelay(elapsedMs) {
  if (elapsedMs < 30_000) return 2_000;
  if (elapsedMs < 120_000) return 4_000;
  return 8_000;
}

export function usePolledResource(path, select, isPending) {
  const [state, setState] = useState({ phase: "loading", data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer;
    let failures = 0;

    const load = async () => {
      try {
        const data = select(await api.get(path, { signal: controller.signal }));
        failures = 0;
        setState({ phase: "ready", data, error: null });
        if (isPending(data)) timer = setTimeout(load, nextDelay(Date.now() - startedAt));
      } catch (error) {
        if (controller.signal.aborted) return;
        const transient = error.status === 0 || error.status >= 500;
        failures += 1;
        setState((current) => (current.data && transient ? current : { phase: "error", data: null, error }));
        if (transient && failures < 6) timer = setTimeout(load, 3_000 * failures);
      }
    };

    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, reloadKey]);

  const setData = useCallback((data) => setState({ phase: "ready", data, error: null }), []);
  const reload = useCallback(() => {
    setState({ phase: "loading", data: null, error: null });
    setReloadKey((key) => key + 1);
  }, []);

  return { ...state, setData, reload };
}
