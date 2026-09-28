import { STRICTNESS } from "../../lib/strictness";

export default function StrictnessPicker({ value, onChange }) {
  return (
    <div className="strictness" role="radiogroup" aria-label="Marking strictness">
      {STRICTNESS.map((option, index) => {
        const selected = value === option.value;
        return (
          <label key={option.value} className="strictness-option" data-selected={selected || undefined}>
            <input
              type="radio"
              name="strictness"
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="strictness-meter" aria-hidden="true">
              {[0, 1, 2].map((bar) => (
                <span key={bar} data-on={bar <= index || undefined} />
              ))}
            </span>
            <span className="strictness-label">{option.label}</span>
            <span className="strictness-tagline">{option.tagline}</span>
            <ul className="strictness-rules">
              {option.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </label>
        );
      })}
    </div>
  );
}
