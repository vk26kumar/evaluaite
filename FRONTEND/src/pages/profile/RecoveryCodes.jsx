import { useEffect, useState } from "react";
import { LuCopy, LuDownload, LuLifeBuoy } from "react-icons/lu";
import { api } from "../../lib/api";
import { useToast } from "../../context/contexts";
import { formatDate } from "../../lib/format";

const fileText = (codes) =>
  [
    "AI-EvaluAIte recovery codes",
    "Each code works once. Use one on the sign-in page under \"Forgot password?\".",
    "",
    ...codes,
    "",
    `Created ${new Date().toISOString().slice(0, 10)}`,
  ].join("\r\n");

export default function RecoveryCodes({ hasPassword }) {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [codes, setCodes] = useState(null);
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/api/profile/recovery-codes", { signal: controller.signal })
      .then(setStatus)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const create = async (event) => {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.post("/api/profile/recovery-codes", { password: hasPassword ? password : undefined });
      setCodes(result.codes);
      setStatus({ remaining: result.remaining, createdAt: result.createdAt });
      setAsking(false);
      setPassword("");
    } catch (err) {
      setError(err.fieldErrors.password || err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = () =>
    navigator.clipboard
      .writeText(fileText(codes))
      .then(() => toast.success("Recovery codes copied."))
      .catch(() => toast.error("Couldn't copy. Download them instead."));

  const download = () => {
    const url = URL.createObjectURL(new Blob([fileText(codes)], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "evaluaite-recovery-codes.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const remaining = status?.remaining || 0;

  return (
    <section className="card card-pad settings-card" aria-labelledby="codes-title">
      <div className="settings-head">
        <h3 id="codes-title">
          <LuLifeBuoy aria-hidden="true" /> Recovery codes
        </h3>
        <p className="muted small">
          If you forget your password, one of these codes lets you choose a new one from the sign-in page. Keep them
          somewhere safe, such as a password manager or a printed copy.
        </p>
      </div>

      {codes ? (
        <div className="codes-reveal">
          <p className="codes-warning" role="alert">
            Save these now. They won&apos;t be shown again, and each one works once.
          </p>
          <ol className="codes-grid mono" aria-label="Your recovery codes">
            {codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ol>
          <div className="settings-actions">
            <button type="button" className="btn btn-sm" onClick={copy}>
              <LuCopy aria-hidden="true" /> Copy
            </button>
            <button type="button" className="btn btn-sm" onClick={download}>
              <LuDownload aria-hidden="true" /> Download
            </button>
            <button type="button" className="btn btn-ink btn-sm" onClick={() => setCodes(null)}>
              I&apos;ve saved them
            </button>
          </div>
        </div>
      ) : asking ? (
        <form className="codes-confirm" onSubmit={create} noValidate>
          <label className="field">
            <span className="field-label">Confirm with your password</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              aria-invalid={error ? "true" : undefined}
              autoFocus
            />
          </label>
          {error && <p className="field-error">{error}</p>}
          <div className="settings-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-ink btn-sm" disabled={!password} data-loading={busy || undefined}>
              {remaining ? "Replace my codes" : "Create codes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="sessions-row">
          <p className="muted small">
            {remaining
              ? `${remaining} of 10 codes left, created ${formatDate(status.createdAt)}. New codes replace the old ones.`
              : "You haven't created recovery codes yet."}
          </p>
          <button
            type="button"
            className={`btn btn-sm ${remaining ? "" : "btn-ink"}`}
            onClick={() => (hasPassword ? setAsking(true) : create())}
            data-loading={busy || undefined}
          >
            {remaining ? "Create new codes" : "Create recovery codes"}
          </button>
        </div>
      )}
      {error && !asking && <p className="field-error">{error}</p>}
    </section>
  );
}
