import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LuCalendarClock,
  LuCircleAlert,
  LuCopy,
  LuEllipsis,
  LuFileText,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuUsers,
} from "react-icons/lu";
import { api } from "../../lib/api";
import { useToast } from "../../context/contexts";
import { formatDate, formatMarks, formatRelative, pluralize } from "../../lib/format";
import { useDocumentTitle } from "../../lib/hooks";
import { ConfirmDialog, ErrorState } from "../../components/Feedback";
import "./assignments.css";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "completed", label: "Ready" },
  { value: "generating", label: "Generating" },
  { value: "failed", label: "Failed" },
];

const IN_PROGRESS = ["queued", "generating"];

function dueState(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86_400_000);
  if (days < 0) return { tone: "muted", label: `Was due ${formatDate(dueDate)}` };
  if (days === 0) return { tone: "warn", label: "Due today" };
  if (days <= 3) return { tone: "warn", label: `Due in ${pluralize(days, "day")}` };
  return { tone: "muted", label: `Due ${formatDate(dueDate)}` };
}

function StatusBadge({ status }) {
  if (IN_PROGRESS.includes(status)) return <span className="badge badge-blue badge-dot badge-pulse">Generating</span>;
  if (status === "failed") {
    return (
      <span className="badge badge-bad">
        <LuCircleAlert aria-hidden="true" /> Failed
      </span>
    );
  }
  return <span className="badge badge-good badge-dot">Ready</span>;
}

function CardMenu({ item, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && ref.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="card-menu" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${item.title}`}
      >
        <LuEllipsis aria-hidden="true" />
      </button>
      {open && (
        <div className="menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            disabled={item.status !== "completed"}
            onClick={() => {
              setOpen(false);
              onDuplicate(item);
            }}
          >
            <LuCopy aria-hidden="true" /> Make a copy
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item menu-item-danger"
            onClick={() => {
              setOpen(false);
              onDelete(item);
            }}
          >
            <LuTrash2 aria-hidden="true" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function AssignmentsList() {
  useDocumentTitle("Assignments");
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Search on the server, 300 ms after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (nextPage, { signal, silent = false } = {}) => {
      if (!silent) setStatus(nextPage === 1 ? "loading" : "more");
      const params = new URLSearchParams({ page: String(nextPage), limit: "18" });
      if (query) params.set("search", query);
      if (filter) params.set("status", filter);
      try {
        const data = await api.get(`/api/assignments?${params}`, { signal });
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
    },
    [query, filter]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(1, { signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const generating = items.some((item) => IN_PROGRESS.includes(item.status));
  useEffect(() => {
    if (!generating) return undefined;
    const timer = setTimeout(() => load(1, { silent: true }), 4000);
    return () => clearTimeout(timer);
  }, [generating, items, load]);

  const duplicate = async (item) => {
    try {
      const { assignment } = await api.post(`/api/assignments/${item.id}/duplicate`);
      toast.success(`Copied as “${assignment.title}”.`);
      navigate(`/assignments/${assignment.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/assignments/${toDelete.id}`);
      setItems((current) => current.filter((item) => item.id !== toDelete.id));
      setTotal((value) => value - 1);
      toast.success("Question paper deleted.");
      setToDelete(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = query || filter;
  const empty = status === "ready" && items.length === 0;

  return (
    <div className="container page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Assignments</p>
          <h1>Question papers</h1>
          <p>
            Generate a paper with an answer key, print it for the class, then grade every sheet against the same key.
          </p>
        </div>
        <Link to="/assignments/new" className="btn btn-primary">
          <LuPlus aria-hidden="true" /> New paper
        </Link>
      </header>

      {(items.length > 0 || filtered) && (
        <div className="list-tools">
          <label className="search">
            <LuSearch aria-hidden="true" />
            <span className="sr-only">Search by title, subject or class</span>
            <input
              className="input"
              type="search"
              placeholder="Search title, subject or class"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="segmented" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {status === "ready" && <p className="list-count muted">{pluralize(total, "paper")}</p>}
        </div>
      )}

      {status === "loading" && (
        <div className="paper-grid" aria-busy="true" aria-label="Loading question papers">
          {[0, 1, 2].map((key) => (
            <div key={key} className="paper-card card">
              <div className="skeleton" style={{ height: 12, width: "40%" }} />
              <div className="skeleton" style={{ height: 20, width: "80%", marginTop: 12 }} />
              <div className="skeleton" style={{ height: 12, width: "60%", marginTop: 20 }} />
            </div>
          ))}
        </div>
      )}

      {status === "error" && <ErrorState message={error?.message} onRetry={() => load(1)} />}

      {empty && !filtered && (
        <div className="empty card">
          <LuFileText size={40} color="var(--accent)" aria-hidden="true" />
          <h2>No question papers yet</h2>
          <p>Pick the question types and marks, and AI writes the paper and its answer key in about a minute.</p>
          <Link to="/assignments/new" className="btn btn-primary">
            <LuPlus aria-hidden="true" /> Create your first paper
          </Link>
        </div>
      )}

      {empty && filtered && <p className="history-none">No papers match these filters.</p>}

      {items.length > 0 && status !== "loading" && (
        <ul className="paper-grid">
          {items.map((item) => {
            const due = dueState(item.dueDate);
            return (
              <li key={item.id} className="paper-card card">
                <div className="paper-card-top">
                  <p className="eyebrow">
                    {item.subject} · {item.className}
                  </p>
                  <CardMenu item={item} onDuplicate={duplicate} onDelete={setToDelete} />
                </div>
                <Link to={`/assignments/${item.id}`} className="paper-card-link">
                  <h2 className="paper-card-title">{item.title}</h2>
                </Link>
                <p className="paper-card-meta">
                  {pluralize(item.totalQuestions, "question")} · {formatMarks(item.totalMarks)} marks · {item.timeAllowed}
                </p>
                <div className="paper-card-foot">
                  <StatusBadge status={item.status} />
                  {due && (
                    <span className={`paper-due tone-${due.tone}`}>
                      <LuCalendarClock aria-hidden="true" /> {due.label}
                    </span>
                  )}
                  {item.sheetsGraded > 0 && (
                    <span className="paper-due">
                      <LuUsers aria-hidden="true" /> {pluralize(item.sheetsGraded, "sheet")} graded
                    </span>
                  )}
                  <span className="paper-card-time muted" title={new Date(item.createdAt).toLocaleString()}>
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {page < totalPages && status !== "loading" && (
        <div className="history-more">
          <button type="button" className="btn" onClick={() => load(page + 1)} data-loading={status === "more" || undefined}>
            Load more
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this question paper?"
        message={`“${toDelete?.title ?? ""}” and its answer key will be removed. Sheets you've already graded with it are kept.`}
        confirmLabel="Delete paper"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
