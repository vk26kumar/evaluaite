/** A number input with − and + buttons. Buttons are skipped by Tab; arrow keys and typing still work. */
export default function Stepper({ id, value, onChange, min = 0, max = 100, step = 1, invalid, label }) {
  const clamp = (next) => Math.min(max, Math.max(min, Math.round(next / step) * step));
  const numeric = Number(value) || 0;

  return (
    <div className="marks-input" data-invalid={invalid || undefined}>
      <button
        type="button"
        onClick={() => onChange(clamp(numeric - step))}
        disabled={numeric <= min}
        aria-label={`Decrease ${label}`}
        tabIndex={-1}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        onBlur={() => value !== "" && onChange(clamp(numeric))}
        aria-invalid={invalid || undefined}
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(numeric + step))}
        disabled={numeric >= max}
        aria-label={`Increase ${label}`}
        tabIndex={-1}
      >
        +
      </button>
    </div>
  );
}
