import { useEffect, useRef } from "react";
import { LuCircleAlert, LuRefreshCw } from "react-icons/lu";

export function Spinner({ size = 20, label }) {
  return (
    <span role={label ? "status" : undefined} style={{ display: "inline-grid", placeItems: "center" }}>
      <span className="spinner" style={{ "--size": `${size}px` }} aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div style={{ display: "grid", justifyItems: "center", gap: "12px" }}>
        <span className="spinner" style={{ "--size": "28px" }} aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="empty" role="alert">
      <LuCircleAlert size={32} color="var(--bad)" aria-hidden="true" />
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          <LuRefreshCw aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

/** Accessible confirmation built on the native <dialog> element. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "danger", busy, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onCancel();
      }}
    >
      <div className="dialog-body">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={tone === "danger" ? "btn btn-danger" : "btn btn-primary"}
          onClick={onConfirm}
          data-loading={busy ? "true" : undefined}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
