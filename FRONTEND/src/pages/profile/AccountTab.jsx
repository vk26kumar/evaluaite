import { useEffect, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { LuCheck, LuEye, LuEyeOff, LuKeyRound, LuLogOut, LuMail, LuTriangleAlert, LuX } from "react-icons/lu";
import { api } from "../../lib/api";
import { useProviders } from "../../lib/providers";
import { useAuth, useToast } from "../../context/contexts";
import Field from "../../components/Field";

function SubjectsInput({ value, onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const subject = draft.trim().replace(/,$/, "");
    if (subject && !value.some((s) => s.toLowerCase() === subject.toLowerCase()) && value.length < 10) {
      onChange([...value, subject.slice(0, 40)]);
    }
    setDraft("");
  };
  return (
    <div className="chips-input">
      {value.map((subject) => (
        <span key={subject} className="chip">
          {subject}
          <button type="button" onClick={() => onChange(value.filter((s) => s !== subject))} aria-label={`Remove ${subject}`}>
            <LuX aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        className="chips-field"
        value={draft}
        placeholder={value.length ? "Add another" : "e.g. Physics, then press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        aria-label="Add a subject"
        disabled={value.length >= 10}
      />
    </div>
  );
}

function ProfileForm({ user, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState({
    name: user.name,
    designation: user.designation || "",
    institution: user.institution || "",
    subjects: user.subjects || [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const dirty =
    values.name !== user.name ||
    values.designation !== (user.designation || "") ||
    values.institution !== (user.institution || "") ||
    values.subjects.join("|") !== (user.subjects || []).join("|");

  const save = async (event) => {
    event.preventDefault();
    if (values.name.trim().length < 2) {
      setErrors({ name: "Name must be at least 2 characters." });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const { user: updated } = await api.patch("/api/profile", {
        name: values.name.trim(),
        designation: values.designation.trim(),
        institution: values.institution.trim(),
        subjects: values.subjects,
      });
      onSaved(updated);
      toast.success("Profile saved.");
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card card-pad settings-card" onSubmit={save} noValidate>
      <div className="settings-head">
        <h3>Profile details</h3>
        <p className="muted small">Your school name is printed on new question papers, and subjects are suggested when you create one.</p>
      </div>
      <div className="form-grid">
        <Field label="Full name" error={errors.name}>
          {(props) => <input {...props} className="input" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} maxLength={80} autoComplete="name" />}
        </Field>
        <Field label="Role" optional error={errors.designation}>
          {(props) => (
            <input
              {...props}
              className="input"
              placeholder="e.g. Physics teacher, Head of Science"
              value={values.designation}
              onChange={(e) => setValues({ ...values, designation: e.target.value })}
              maxLength={80}
              autoComplete="organization-title"
            />
          )}
        </Field>
        <div className="span-2">
          <Field label="School or institution" optional error={errors.institution}>
            {(props) => (
              <input
                {...props}
                className="input"
                placeholder="e.g. Delhi Public School, Bokaro"
                value={values.institution}
                onChange={(e) => setValues({ ...values, institution: e.target.value })}
                maxLength={120}
                autoComplete="organization"
              />
            )}
          </Field>
        </div>
        <div className="span-2 field">
          <span className="field-label">
            Subjects you teach <span className="optional">(optional)</span>
          </span>
          <SubjectsInput value={values.subjects} onChange={(subjects) => setValues({ ...values, subjects })} />
        </div>
      </div>
      <div className="settings-actions">
        <button type="submit" className="btn btn-ink" disabled={!dirty} data-loading={saving || undefined}>
          <LuCheck aria-hidden="true" /> Save changes
        </button>
      </div>
    </form>
  );
}

function PasswordForm({ hasPassword, onChanged }) {
  const { signIn } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    const found = {};
    if (hasPassword && !values.currentPassword) found.currentPassword = "Enter your current password.";
    if (values.newPassword.length < 8 || !/[A-Za-z]/.test(values.newPassword) || !/\d/.test(values.newPassword)) {
      found.newPassword = "Use 8+ characters with at least one letter and one number.";
    }
    if (values.confirm !== values.newPassword) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const { user, token } = await api.post("/api/profile/password", {
        currentPassword: hasPassword ? values.currentPassword : undefined,
        newPassword: values.newPassword,
      });
      signIn({ token, user });
      toast.success(
        hasPassword
          ? "Password changed. Any other devices have been signed out."
          : "Password added. You can now sign in with your email too."
      );
      setValues({ currentPassword: "", newPassword: "", confirm: "" });
      onChanged(user);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!Object.keys(err.fieldErrors || {}).length) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const type = show ? "text" : "password";
  return (
    <form className="card card-pad settings-card" onSubmit={save} noValidate>
      <div className="settings-head">
        <h3>
          <LuKeyRound aria-hidden="true" /> {hasPassword ? "Change password" : "Add a password"}
        </h3>
        <p className="muted small">
          {hasPassword ? "Use at least 8 characters with a letter and a number." : "Your account uses Google sign-in. Add a password to also sign in with your email."}
        </p>
      </div>
      <div className="form-grid">
        {hasPassword && (
          <div className="span-2">
            <Field label="Current password" error={errors.currentPassword}>
              {(props) => <input {...props} className="input" type={type} autoComplete="current-password" value={values.currentPassword} onChange={(e) => setValues({ ...values, currentPassword: e.target.value })} />}
            </Field>
          </div>
        )}
        <Field label="New password" error={errors.newPassword}>
          {(props) => <input {...props} className="input" type={type} autoComplete="new-password" value={values.newPassword} onChange={(e) => setValues({ ...values, newPassword: e.target.value })} />}
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          {(props) => <input {...props} className="input" type={type} autoComplete="new-password" value={values.confirm} onChange={(e) => setValues({ ...values, confirm: e.target.value })} />}
        </Field>
      </div>
      <div className="settings-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow((value) => !value)}>
          {show ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />} {show ? "Hide" : "Show"} passwords
        </button>
        <button type="submit" className="btn btn-ink" data-loading={saving || undefined}>
          {hasPassword ? "Change password" : "Add password"}
        </button>
      </div>
    </form>
  );
}

function SignOutOtherDevices() {
  const { signIn, user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { token } = await api.post("/api/profile/sessions/revoke");
      signIn({ token, user });
      toast.success("Signed out on every other device.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sessions-row">
      <p className="muted small">Signed in on a shared or lost computer? Sign out everywhere except this device.</p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={run} data-loading={busy || undefined}>
        <LuLogOut aria-hidden="true" /> Sign out other devices
      </button>
    </div>
  );
}

function ConfirmEmail() {
  const toast = useToast();
  const { email } = useProviders();
  const [state, setState] = useState("idle");

  if (!email) return <span className="badge">Not confirmed</span>;
  if (state === "sent") return <span className="badge">Link sent</span>;

  const send = async () => {
    setState("sending");
    try {
      await api.post("/api/profile/email/verification");
      setState("sent");
      toast.success("Confirmation link sent. Check your inbox and spam folder.");
    } catch (err) {
      setState("idle");
      toast.error(err.message);
    }
  };

  return (
    <button type="button" className="btn btn-sm" onClick={send} data-loading={state === "sending" || undefined}>
      Send confirmation link
    </button>
  );
}

function DeleteAccount({ hasPassword }) {
  const { signOut } = useAuth();
  const toast = useToast();
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete("/api/profile", { body: { confirm: typed, password: hasPassword ? password : undefined } });
      signOut("/");
      toast.success("Your account and all its data have been deleted.");
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <section className="card card-pad settings-card danger-zone" aria-labelledby="danger-title">
      <div className="settings-head">
        <h3 id="danger-title">
          <LuTriangleAlert aria-hidden="true" /> Delete account
        </h3>
        <p className="muted small">Permanently removes your account, question papers, graded sheets and history. This can&apos;t be undone.</p>
      </div>
      <div className="settings-actions">
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
          Delete my account
        </button>
      </div>

      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="delete-account-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setOpen(false);
        }}
      >
        <div className="dialog-body">
          <h2 id="delete-account-title">Delete your account?</h2>
          <p>Everything will be removed right away: papers, graded sheets, student marks and history.</p>
          <label className="field" style={{ marginTop: 16 }}>
            <span className="field-label">Type DELETE to confirm</span>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </label>
          {hasPassword && (
            <label className="field" style={{ marginTop: 12 }}>
              <span className="field-label">Your password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={remove} disabled={typed !== "DELETE" || (hasPassword && !password)} data-loading={busy || undefined}>
            Delete everything
          </button>
        </div>
      </dialog>
    </section>
  );
}

export default function AccountTab({ user, onUserChange }) {
  const methods = user.signInMethods || {};
  return (
    <div className="settings">
      <ProfileForm user={user} onSaved={onUserChange} />

      <section className="card card-pad settings-card" aria-labelledby="signin-title">
        <div className="settings-head">
          <h3 id="signin-title">Sign-in methods</h3>
          <p className="muted small">{user.email}</p>
        </div>
        <ul className="method-list">
          <li>
            <LuMail aria-hidden="true" />
            <span>Email address</span>
            {user.emailVerified ? <span className="badge badge-good">Confirmed</span> : <ConfirmEmail />}
          </li>
          <li>
            <LuKeyRound aria-hidden="true" />
            <span>Email and password</span>
            <span className={`badge ${methods.password ? "badge-good" : ""}`}>{methods.password ? "On" : "Not set"}</span>
          </li>
          <li>
            <FcGoogle aria-hidden="true" />
            <span>Google</span>
            <span className={`badge ${methods.google ? "badge-good" : ""}`}>{methods.google ? "Connected" : "Not connected"}</span>
          </li>
        </ul>
        <SignOutOtherDevices />
      </section>

      <PasswordForm hasPassword={Boolean(methods.password)} onChanged={onUserChange} />
      <DeleteAccount hasPassword={Boolean(methods.password)} />
    </div>
  );
}
