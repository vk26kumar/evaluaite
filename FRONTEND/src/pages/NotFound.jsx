import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/hooks";
import { PenCircle } from "../components/RedPen";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="container container-narrow page">
      <div className="empty">
        <div style={{ position: "relative", padding: "12px 28px", color: "var(--accent)" }}>
          <span className="hand" style={{ fontSize: "4.5rem" }}>
            404
          </span>
          <PenCircle className="not-found-ring" />
        </div>
        <h1 style={{ fontSize: "var(--text-2xl)" }}>This page isn&apos;t on the syllabus</h1>
        <p>The link may be old, or the page may have moved.</p>
        <Link to="/" className="btn btn-ink">
          Back to the start
        </Link>
      </div>
    </div>
  );
}
