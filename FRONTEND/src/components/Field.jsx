import { useId } from "react";
import { LuCircleAlert } from "react-icons/lu";

export default function Field({ label, hint, error, optional, aside, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const control = children({
    id,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
  });

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={id}>
          <span>
            {label} {optional && <span className="optional">(optional)</span>}
          </span>
          {aside}
        </label>
      )}
      {control}
      {hint && !error && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId}>
          <LuCircleAlert aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
