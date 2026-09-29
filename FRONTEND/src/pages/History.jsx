import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LuChevronRight, LuCircleAlert, LuPlus, LuSearch } from "react-icons/lu";
import { api } from "../lib/api";
import { formatMarks, formatPercent, formatRelative, pluralize, scoreBand } from "../lib/format";
import { strictnessLabel } from "../lib/strictness";
import { useDocumentTitle } from "../lib/hooks";
import { ErrorState } from "../components/Feedback";
import "./history.css";

const IN_PROGRESS = ["queued", "reading", "grading"];
const PAGE_SIZE = 20;

function StatusCell({ item }) {
  if (IN_PROGRESS.includes(item.status)) {
    return <span className="badge badge-blue badge-dot badge-pulse">Grading</span>;
  }
  if (item.status === "failed") {
    return (
      <span className="badge badge-bad" title={item.failureReason || undefined}>
        <LuCircleAlert aria-hidden="true" /> Failed
      </span>
    );
  }
  const band = scoreBand(item.score.percentage);
  return (
    <span className="history-score">
      <span className="history-score-value">
        {formatMarks(item.score.awarded)}
        <span className="muted">/{formatMarks(item.score.max)}</span>
      </span>
      <span className={`history-percent tone-${band.tone}`}>{formatPercent(item.score.percentage)}</span>
    </span>
  );
}

function EmptyHistory() {
  return (
    <div className="empty card">
      <span className="empty-mark hand" aria-hidden="true">
        ✓
      </span>
      <h2>No sheets graded yet</h2>
      <p>Upload a student&apos;s answer sheet with your answer key. The marked report will show up here.</p>
      <Link to="/evaluate" className="btn btn-primary">
        <LuPlus aria-hidden="true" /> Grade your first sheet
      </Link>
    </div>
  );
}

export default function History() {
  useDocumentTitle("History");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async (nextPage, { signal, silent = false } = {}) => {
    if (!silent) setStatus(nextPage === 1 ? "loading" : "more");
    try {
      const data = await api.get(`/api/evaluations?page=${nextPage}&limit=${PAGE_SIZE}`, { signal });
      setItems((current) => (nextPage === 1 ? data.items : [...current, ...data.items]));
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setStatus("ready");
    } catch (err) {
      if (signal?.aborted) return;
      setError(err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(1, { signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const grading = items.some((item) => IN_PROGRESS.includes(item.status));
  useEffect(() => {
    if (!grading) return undefined;
    const timer = setTimeout(() => load(1, { silent: true }), 5000);
    return () => clearTimeout(timer);
  }, [grading, items, load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.title} ${item.studentName}`.toLowerCase().includes(needle));
  }, [items, query]);

  return (
    <div className="container page">
      <header className="page-header">
        <div>
          <p className="eyebrow">History</p>
          <h1>Graded sheets</h1>
          {status === "ready" && total > 0 && <p>{pluralize(total, "evaluation")} so far.</p>}
        </div>
        <Link to="/evaluate" className="btn btn-primary">
          <LuPlus aria-hidden="true" /> New evaluation
        </Link>
      </header>

      {status === "loading" && (
        <div className="history-list card" aria-busy="true" aria-label="Loading history">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="history-row history-row-skeleton">
              <div className="skeleton" style={{ height: 16, width: "40%" }} />
              <div className="skeleton" style={{ height: 12, width: "25%", marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {status === "error" && <ErrorState message={error?.message} onRetry={() => load(1)} />}

      {(status === "ready" || status === "more") && items.length === 0 && <EmptyHistory />}

      {(status === "ready" || status === "more") && items.length > 0 && (
        <>
          <div className="history-tools">
            <label className="search">
              <LuSearch aria-hidden="true" />
              <span className="sr-only">Search by title or student</span>
              <input
                className="input"
                type="search"
                placeholder="Search by title or student"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <p className="history-none">No evaluations match “{query}”.</p>
          ) : (
            <ul className="history-list card">
              {filtered.map((item) => (
                <li key={item.id}>
                  <Link to={`/evaluations/${item.id}`} className="history-row">
                    <div className="history-main">
                      <p className="history-title">{item.title}</p>
                      <p className="history-meta">
                        {item.studentName && <span>{item.studentName}</span>}
                        <span>{pluralize(item.questionCount, "question")}</span>
                        <span>{strictnessLabel(item.difficulty)}</span>
                        <span title={new Date(item.createdAt).toLocaleString()}>{formatRelative(item.createdAt)}</span>
                      </p>
                    </div>
                    <StatusCell item={item} />
                    <LuChevronRight className="history-chevron" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {page < totalPages && !query && (
            <div className="history-more">
              <button type="button" className="btn" onClick={() => load(page + 1)} data-loading={status === "more" || undefined}>
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
