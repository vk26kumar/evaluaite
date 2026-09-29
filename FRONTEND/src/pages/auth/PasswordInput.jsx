import { useState } from "react";
import { LuCheck, LuEye, LuEyeOff } from "react-icons/lu";
import Field from "../../components/Field";
import { PASSWORD_RULES } from "../../lib/password";

export default function PasswordInput({ label = "Password", value, onChange, error, autoComplete = "new-password", autoFocus, showRules = false }) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Field label={label} error={error}>
        {(props) => (
          <div className="input-group">
            <input
              {...props}
              className="input"
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              value={value}
              onChange={onChange}
              autoFocus={autoFocus}
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? "Hide password" : "Show password"}
            >
              {visible ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}
            </button>
          </div>
        )}
      </Field>
      {showRules && (
        <ul className="password-rules" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(value);
            return (
              <li key={rule.id} data-met={met}>
                <LuCheck aria-hidden="true" />
                {rule.label}
                <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
