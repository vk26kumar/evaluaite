import { useCallback, useMemo, useRef, useState } from "react";
import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from "react-icons/lu";
import { ToastContext } from "./contexts";

const ICONS = { success: LuCircleCheck, error: LuCircleAlert, info: LuInfo };
const DURATION = { success: 4000, info: 5000, error: 7000 };

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (tone, message, { duration } = {}) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((list) => [...list.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), duration || DURATION[tone]);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message, options) => show("success", message, options),
      error: (message, options) => show("error", message, options),
      info: (message, options) => show("info", message, options),
      dismiss,
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div key={toast.id} className="toast" data-tone={toast.tone}>
              <Icon aria-hidden="true" />
              <div className="toast-body">{toast.message}</div>
              <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                <LuX aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
