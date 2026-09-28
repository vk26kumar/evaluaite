import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuCheck,
  LuCircleAlert,
  LuCopy,
  LuDownload,
  LuInfo,
  LuPrinter,
  LuRefreshCw,
  LuSettings2,
  LuSquarePen,
  LuTrash2,
  LuTriangleAlert,
} from "react-icons/lu";
import { api, request } from "../../lib/api";
import { useToast } from "../../context/contexts";
import { formatDate, formatDateTime, formatDuration, formatMarks, formatPercent, pluralize, scoreBand } from "../../lib/format";
import { useDocumentTitle } from "../../lib/hooks";
import { usePolledResource } from "../../lib/usePolledResource";
import { typeLabel } from "../../lib/questionTypes";
import { ConfirmDialog, ErrorState } from "../../components/Feedback";
import { fromAssignment } from "../evaluate/answerKey";
import PaperView from "./PaperView";
import "../report/report.css";
import "./assignments.css";

const IN_PROGRESS = ["queued", "generating"];
const selectAssignment = (body) => body.assignment;
const isPending = (assignment) => IN_PROGRESS.includes(assignment.status);

function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, now - new Date(since).getTime());
}

const WRITING_TIPS = [
  "Balancing easy, moderate and challenging questions…",
  "Writing plausible options for the multiple choice questions…",
  "Checking every calculation in the answer key…",
  "Writing the answer key as a marking guide…",
];

function GenerationProgress({ assignment }) {
  const elapsed = useElapsed(assignment.updatedAt);
  const tip = WRITING_TIPS[Math.floor(elapsed / 6000) % WRITING_TIPS.length];
  const writing = assignment.status === "generating";
  const steps = [
    { label: "Request received", state: "done" },
    { label: assignment.reference ? "Reading your material and writing questions" : "Writing questions and the answer key", state: writing ? "active" : "todo" },
    { label: "Formatting the paper", state: "todo" },
  ];

  return (
    <div className="progress-wrap">
      <div className="progress-card paper ruled margin-rule" aria-live="polite">
        <div className="progress-head">
          <p className="eyebrow">{assignment.generationCount > 0 ? "Writing a new version" : "Writing your paper"}</p>
          <p className="progress-timer mono">{formatDuration(elapsed)}</p>
        </div>
        <h1 className="progress-title">{assignment.title}</h1>
        <p className="progress-meta">
          {assignment.subject} · {assignment.className} · {pluralize(assignment.totalQuestions, "question")} ·{" "}
          {formatMarks(assignment.totalMarks)} marks
        </p>
        <svg className="progress-pen" viewBox="0 0 400 40" fill="none" aria-hidden="true">
          <path
            d="M4 26 C 24 8, 36 34, 56 20 S 88 6, 104 22 S 138 34, 156 16 S 190 8, 206 24 S 240 34, 258 18 S 292 6, 310 22 S 346 32, 366 16 S 390 12, 396 20"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <ol className="progress-steps">
          {steps.map((step) => (
            <li key={step.label} data-state={step.state}>
              <span className="progress-dot" aria-hidden="true">
                {step.state === "done" ? <LuCheck /> : step.state === "active" ? <span className="spinner" /> : null}
              </span>
              <div>
                <p className="progress-label">{step.label}</p>
                {step.state === "active" && <p className="progress-detail">{tip}</p>}
              </div>
            </li>
          ))}
        </ol>
        {elapsed > 90_000 && (
          <p className="progress-slow">Long papers can take a couple of minutes. Hang tight.</p>
        )}
      </div>
      <p className="progress-leave">
        You can leave this page. The paper will be waiting in <Link to="/assignments">Assignments</Link>.
      </p>
    </div>
  );
}

function DifficultyBreakdown({ paper }) {
  const counts = { Easy: 0, Moderate: 0, Challenging: 0 };
  paper.sections.forEach((section) => section.questions.forEach((q) => (counts[q.difficulty] += 1)));
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0) || 1;
  return (
    <div className="side-block">
      <h3 className="side-title">Difficulty</h3>
      <div className="mix-bar mix-bar-lg" role="img" aria-label={Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}>
        {Object.entries(counts).map(([level, count]) =>
          count ? <span key={level} data-level={level} style={{ flexGrow: count }} title={`${level}: ${count}`} /> : null
        )}
      </div>
      <ul className="mix-legend mix-legend-list">
        {Object.entries(counts).map(([level, count]) => (
          <li key={level}>
            <i data-level={level} aria-hidden="true" /> {level}
            <span className="tabular">
              {count} <span className="muted">({formatPercent((count / total) * 100)})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Results({ assignment, onGrade }) {
  const [state, setState] = useState({ status: "loading", items: [] });

  useEffect(() => {
    const controller = new AbortController();
    api
      .get(`/api/assignments/${assignment.id}/evaluations`, { signal: controller.signal })
      .then((data) => setState({ status: "ready", items: data.items }))
      .catch((err) => !controller.signal.aborted && setState({ status: "error", items: [], error: err }));
    return () => controller.abort();
  }, [assignment.id]);

  const done = state.items.filter((item) => item.score);
  const average = done.length ? done.reduce((sum, item) => sum + item.score.percentage, 0) / done.length : null;

  return (
    <div className="side-block">
      <div className="side-title-row">
        <h3 className="side-title">Class results</h3>
        {average !== null && <span className="muted small">Average {formatPercent(average)}</span>}
      </div>
      {state.status === "loading" && <div className="skeleton" style={{ height: 40 }} />}
      {state.status === "error" && <p className="muted small">{state.error.message}</p>}
      {state.status === "ready" && state.items.length === 0 && (
        <p className="muted small">No sheets graded against this paper yet.</p>
      )}
      {state.items.length > 0 && (
        <ul className="result-list">
          {state.items.map((item) => (
            <li key={item.id}>
              <Link to={`/evaluations/${item.id}`}>
                <span className="result-name">{item.studentName || "Unnamed sheet"}</span>
                {item.score ? (
                  <span className={`tabular tone-${scoreBand(item.score.percentage).tone}`}>
                    {formatMarks(item.score.awarded)}/{formatMarks(item.score.max)}
                  </span>
                ) : (
                  <span className="muted small">{item.status === "failed" ? "Failed" : "Grading…"}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-primary btn-block" onClick={onGrade}>
        <LuSquarePen aria-hidden="true" /> Grade a student&apos;s sheet
      </button>
    </div>
  );
}

export default function AssignmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { phase, data: assignment, error, setData, reload } = usePolledResource(
    `/api/assignments/${id}`,
    selectAssignment,
    isPending
  );
  const [mode, setMode] = useState("student");
  const [downloading, setDownloading] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useDocumentTitle(assignment?.title || "Question paper");

  const settingsTemplate = useMemo(
    () =>
      assignment && {
        title: assignment.title,
        subject: assignment.subject,
        className: assignment.className,
        schoolName: assignment.schoolName,
        timeAllowed: assignment.timeAllowed,
        difficultyMix: assignment.difficultyMix,
        questionTypes: assignment.questionTypes,
        additionalInstructions: assignment.additionalInstructions,
      },
    [assignment]
  );

  if (phase === "loading") {
    return (
      <div className="container page" aria-busy="true">
        <div className="skeleton" style={{ width: 140, height: 14 }} />
        <div className="skeleton" style={{ width: "min(460px, 80%)", height: 36, marginTop: 16 }} />
        <div className="skeleton" style={{ height: 480, marginTop: 32, borderRadius: 16 }} />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="container container-narrow page">
        <ErrorState
          title={error.status === 404 ? "Question paper not found" : "Couldn't load this paper"}
          message={error.status === 404 ? "It may have been deleted." : error.message}
          onRetry={error.status === 404 ? undefined : reload}
        />
        <p style={{ textAlign: "center" }}>
          <Link to="/assignments" className="btn">
            Go to assignments
          </Link>
        </p>
      </div>
    );
  }

  if (IN_PROGRESS.includes(assignment.status)) {
    return (
      <div className="container container-narrow page">
        <GenerationProgress assignment={assignment} />
      </div>
    );
  }

  const download = async (variant) => {
    setDownloading(variant);
    try {
      const response = await request(`/api/assignments/${assignment.id}/pdf?variant=${variant}`, { raw: true, timeout: 60_000 });
      const blob = await response.blob();
      const header = response.headers.get("Content-Disposition") || "";
      const name = decodeURIComponent(header.match(/filename\*=UTF-8''([^;]+)/i)?.[1] || "question-paper.pdf");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const runConfirmed = async () => {
    setBusy(true);
    try {
      if (confirm === "regenerate") {
        await api.post(`/api/assignments/${assignment.id}/regenerate`);
        setConfirm(null);
        reload();
      } else if (confirm === "delete") {
        await api.delete(`/api/assignments/${assignment.id}`);
        toast.success("Question paper deleted.");
        navigate("/assignments", { replace: true });
      }
    } catch (err) {
      toast.error(err.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    try {
      const { assignment: copy } = await api.post(`/api/assignments/${assignment.id}/duplicate`);
      toast.success(`Copied as “${copy.title}”.`);
      navigate(`/assignments/${copy.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const gradeSheets = () => navigate("/evaluate", { state: { template: fromAssignment(assignment) } });
  const failed = assignment.status === "failed";

  return (
    <div className="container page assignment-page">
      <header className="report-header">
        <Link to="/assignments" className="back-link no-print">
          <LuArrowLeft aria-hidden="true" /> Assignments
        </Link>
        <div className="report-title-row">
          <div>
            <h1 className="report-title">{assignment.title}</h1>
            <p className="report-meta">
              <span>
                {assignment.subject} · {assignment.className}
              </span>
              <span>{pluralize(assignment.totalQuestions, "question")}</span>
              <span>{formatMarks(assignment.totalMarks)} marks</span>
              <span>{assignment.timeAllowed}</span>
              {assignment.dueDate && <span>Due {formatDate(assignment.dueDate)}</span>}
            </p>
          </div>
          {!failed && (
            <div className="report-actions no-print">
              <button type="button" className="btn btn-primary" onClick={gradeSheets}>
                <LuSquarePen aria-hidden="true" /> Grade sheets
              </button>
              <button type="button" className="btn" onClick={() => download("student")} data-loading={downloading === "student" || undefined}>
                <LuDownload aria-hidden="true" /> Student PDF
              </button>
              <button type="button" className="btn" onClick={() => download("teacher")} data-loading={downloading === "teacher" || undefined}>
                <LuDownload aria-hidden="true" /> With answers
              </button>
            </div>
          )}
        </div>
      </header>

      {failed ? (
        <div className="failed-card card card-pad">
          <LuCircleAlert className="failed-icon" aria-hidden="true" />
          <div>
            <h2>This paper couldn&apos;t be generated</h2>
            <p>{assignment.failureReason || "Something went wrong while writing the paper."}</p>
            <div className="row">
              <button type="button" className="btn btn-ink" onClick={() => setConfirm("regenerate")}>
                <LuRefreshCw aria-hidden="true" /> Try again
              </button>
              <button type="button" className="btn" onClick={() => navigate("/assignments/new", { state: { template: settingsTemplate } })}>
                <LuSettings2 aria-hidden="true" /> Change settings
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm("delete")}>
                <LuTrash2 aria-hidden="true" /> Delete
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {(assignment.failureReason || assignment.paper.notes) && (
            <div className="report-notices no-print" style={{ marginBottom: "var(--space-5)" }}>
              {assignment.failureReason && (
                <div className="callout callout-warn">
                  <LuTriangleAlert aria-hidden="true" />
                  <p>{assignment.failureReason}</p>
                </div>
              )}
              {assignment.paper.notes && (
                <div className="callout callout-info">
                  <LuInfo aria-hidden="true" />
                  <p>{assignment.paper.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="assignment-layout">
            <div className="assignment-main">
              <div className="paper-toolbar no-print">
                <div className="segmented" role="group" aria-label="View">
                  <button type="button" aria-pressed={mode === "student"} onClick={() => setMode("student")}>
                    Student view
                  </button>
                  <button type="button" aria-pressed={mode === "teacher"} onClick={() => setMode("teacher")}>
                    Teacher view · answers
                  </button>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>
                  <LuPrinter aria-hidden="true" /> Print
                </button>
              </div>
              <PaperView assignment={assignment} mode={mode} onUpdated={setData} />
            </div>

            <aside className="assignment-side no-print" aria-label="Paper details and results">
              <Results assignment={assignment} onGrade={gradeSheets} />
              <DifficultyBreakdown paper={assignment.paper} />
              <div className="side-block">
                <h3 className="side-title">Sections</h3>
                <ul className="section-summary">
                  {assignment.paper.sections.map((section) => (
                    <li key={section.label}>
                      <span>
                        {section.label}. {typeLabel(section.type)}
                      </span>
                      <span className="tabular muted">
                        {section.questions.length} × {formatMarks(section.questions[0]?.marks ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
                {assignment.reference && (
                  <p className="muted small reference-note">Based on “{assignment.reference.name}”.</p>
                )}
              </div>
              <div className="side-block side-actions">
                <button type="button" className="btn btn-block" onClick={() => setConfirm("regenerate")}>
                  <LuRefreshCw aria-hidden="true" /> Write a new version
                </button>
                <button type="button" className="btn btn-block" onClick={duplicate}>
                  <LuCopy aria-hidden="true" /> Make a copy
                </button>
                <button type="button" className="btn btn-block" onClick={() => navigate("/assignments/new", { state: { template: settingsTemplate } })}>
                  <LuSettings2 aria-hidden="true" /> New paper with these settings
                </button>
                <button type="button" className="btn btn-block btn-danger" onClick={() => setConfirm("delete")}>
                  <LuTrash2 aria-hidden="true" /> Delete paper
                </button>
                <p className="muted small">
                  Version {assignment.generationCount || 1}
                  {assignment.generatedAt && <> · generated {formatDateTime(assignment.generatedAt)}</>}
                </p>
              </div>
            </aside>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirm === "regenerate"}
        title={failed ? "Try generating again?" : "Write a new version?"}
        message={
          failed
            ? "The AI will try again with the same settings."
            : "The AI writes fresh questions with the same settings, avoiding the current ones. Any edits you made are replaced. Sheets already graded keep their marks."
        }
        confirmLabel={failed ? "Try again" : "Write new version"}
        tone="primary"
        busy={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete this question paper?"
        message="The paper and its answer key will be removed. Sheets you've already graded with it are kept."
        confirmLabel="Delete paper"
        busy={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
