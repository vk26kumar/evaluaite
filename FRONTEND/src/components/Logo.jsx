import { Link } from "react-router-dom";

export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" />
      <path d="M8 1.5v29" stroke="var(--accent)" strokeWidth="1.5" opacity="0.7" />
      <path
        d="M11.5 16.5c1.6 1.3 2.9 2.9 4 4.7 2.4-4.8 5.4-8.5 9-11.2"
        stroke="var(--accent)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ to = "/" }) {
  return (
    <Link to={to} className="logo" aria-label="AI-EvaluAIte home">
      <LogoMark />
      <span className="logo-word">
        Evalu<em>AI</em>te
      </span>
    </Link>
  );
}
