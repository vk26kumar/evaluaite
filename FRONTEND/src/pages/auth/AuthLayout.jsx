import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { LuLock } from "react-icons/lu";
import { api, apiUrl } from "../../lib/api";
import { PenCircle, PenTick } from "../../components/RedPen";
import "./auth.css";

let providersPromise;
function loadProviders() {
  providersPromise ??= api.get("/api/auth/providers", { timeout: 70_000 }).catch(() => {
    providersPromise = undefined;
    return { google: false };
  });
  return providersPromise;
}

export function GoogleButton({ label = "Continue with Google" }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    loadProviders().then((providers) => active && setEnabled(Boolean(providers.google)));
    return () => {
      active = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <a className="btn btn-lg btn-block google-btn" href={apiUrl("/api/auth/google")}>
        <FcGoogle aria-hidden="true" /> {label}
      </a>
      <div className="auth-divider">
        <span>or with email</span>
      </div>
    </>
  );
}

export default function AuthLayout({ title, subtitle, notice, children, footer }) {
  return (
    <div className="auth-page">
      <div className="container auth-grid">
        <section className="auth-form-wrap">
          <div className="auth-card card">
            <h1>{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
            {notice && (
              <p className="auth-notice" role="status">
                <LuLock aria-hidden="true" /> {notice}
              </p>
            )}
            <div className="auth-body">{children}</div>
          </div>
          {footer && <p className="auth-footer">{footer}</p>}
        </section>

        <aside className="auth-aside paper ruled margin-rule" aria-hidden="true">
          <p className="eyebrow">Examiner&apos;s note</p>
          <blockquote>
            <p className="ink">“Clear definition, all three anomalies named. Add one example for full marks.”</p>
          </blockquote>
          <div className="auth-aside-score">
            <span className="hand">9</span>
            <span className="hand">/10</span>
            <PenCircle className="auth-aside-ring" delay={150} />
          </div>
          <ul className="auth-aside-list">
            <li>
              <PenTick className="auth-tick" delay={300} /> Marks against your own answer key
            </li>
            <li>
              <PenTick className="auth-tick" delay={420} /> Shows the key points behind every mark
            </li>
            <li>
              <PenTick className="auth-tick" delay={540} /> Lets you change any score
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
