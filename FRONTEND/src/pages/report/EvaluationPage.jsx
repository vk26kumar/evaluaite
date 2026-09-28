import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuCircleAlert,
  LuFlag,
  LuInfo,
  LuPrinter,
  LuRefreshCw,
  LuTrash2,
  LuUserRoundPlus,
} from "react-icons/lu";
import { api } from "../../lib/api";
import { useToast } from "../../context/contexts";
import { formatDateTime } from "../../lib/format";
import { strictnessLabel } from "../../lib/strictness";
import { useDocumentTitle } from "../../lib/hooks";
import { ConfirmDialog, ErrorState } from "../../components/Feedback";
import { fromEvaluation } from "../evaluate/answerKey";
import { IN_PROGRESS, useEvaluation } from "./useEvaluation";
import { lostMarks, needsReview } from "./reportUtils";
import GradingProgress from "./GradingProgress";
import ScoreSummary from "./ScoreSummary";
import ScoreChart from "./ScoreChart";
import QuestionReview from "./QuestionReview";
import "./report.css";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "review", label: "Worth a second look", test: needsReview },
  { key: "lost", label: "Lost marks", test: lostMarks },
];

function ReportSkeleton() {
  return (
    <div className="container page" aria-busy="true" aria-label="Loading evaluation">
      <div className="skeleton" style={{ width: 120, height: 14 }} />
      <div className="skeleton" style={{ width: "min(420px, 80%)", height: 36, marginTop: 16 }} />
      <div className="skeleton" style={{ height: 180, marginTop: 32, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 260, marginTop: 20, borderRadius: 16 }} />
    </div>
  );
}

function Report({ evaluation, onUpdated }) {
  const [filter, setFilter] = useState("all");
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, evaluation.questions.filter(f.test).length])),
    [evaluation.questions]
  );
  const active = FILTERS.find((f) => f.key === filter);
  const visible = evaluation.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => active.test(question));

  const scrollToQuestion = (questionId) => {
    setFilter("all");
    requestAnimationFrame(() => {
      const element = document.getElementById(`q-${questionId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
      element?.classList.add("is-highlighted");
      setTimeout(() => element?.classList.remove("is-highlighted"), 1600);
    });
  };

  const { overall } = evaluation;

  return (
    <>
      <ScoreSummary evaluation={evaluation} />

      {(overall.integrityFlags.length > 0 || overall.sheetNotes) && (
        <div className="report-notices">
          {overall.integrityFlags.length > 0 && (
            <div className="callout callout-bad">
              <LuFlag aria-hidden="true" />
              <div>
                <strong>Flagged for your attention.</strong> The sheet contains text aimed at the grader. It was
                ignored when marking.
                <ul className="plain-list">
                  {overall.integrityFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {overall.sheetNotes && (
            <div className="callout callout-info">
              <LuInfo aria-hidden="true" />
              <p>
                <strong>About the sheet:</strong> {overall.sheetNotes}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="report-columns">
        <ScoreChart questions={evaluation.questions} onSelect={scrollToQuestion} />
        {(overall.strengths.length > 0 || overall.improvements.length > 0) && (
          <section className="insights card card-pad" aria-label="Strengths and next steps">
            <div>
              <h2 className="insight-title">
                <span className="insight-mark insight-mark-good" aria-hidden="true">
                  ✓
                </span>
                What went well
              </h2>
              <ul className="insight-list">
                {overall.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="insight-title">
                <span className="insight-mark" aria-hidden="true">
                  →
                </span>
                Next steps
              </h2>
              <ul className="insight-list">
                {overall.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      <section className="questions-section" aria-labelledby="questions-heading">
        <div className="questions-toolbar">
          <h2 id="questions-heading" className="section-title">
            Question by question
          </h2>
          <div className="segmented no-print" role="group" aria-label="Filter questions">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label} <span className="count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="questions-empty">No questions match this filter.</p>
        ) : (
          <div className="review-list">
            {visible.map(({ question, index }) => (
              <QuestionReview
                key={question.id}
                evaluationId={evaluation.id}
                question={question}
                index={index}
                onUpdated={onUpdated}
              />
            ))}
          </div>
        )}
      </section>

      <p className="report-footnote">
        Marks were suggested by AI and should be reviewed by a teacher. Graded {formatDateTime(evaluation.completedAt)}.
      </p>
    </>
  );
}

export default function EvaluationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { phase, evaluation, error, setEvaluation, reload } = useEvaluation(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useDocumentTitle(evaluation?.title || "Evaluation");

  if (phase === "loading") return <ReportSkeleton />;

  if (phase === "error") {
    return (
      <div className="container container-narrow page">
        <ErrorState
          title={error.status === 404 ? "Evaluation not found" : "Couldn't load this evaluation"}
          message={error.status === 404 ? "It may have been deleted, or it belongs to another account." : error.message}
          onRetry={error.status === 404 ? undefined : reload}
        />
        <p style={{ textAlign: "center" }}>
          <Link to="/evaluations" className="btn">
            Go to history
          </Link>
        </p>
      </div>
    );
  }

  if (IN_PROGRESS.includes(evaluation.status)) {
    return (
      <div className="container container-narrow page">
        <GradingProgress evaluation={evaluation} />
      </div>
    );
  }

  const reuseKey = () => navigate("/evaluate", { state: { template: fromEvaluation(evaluation) } });

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/evaluations/${evaluation.id}`);
      toast.success("Evaluation deleted.");
      navigate("/evaluations", { replace: true });
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const failed = evaluation.status === "failed";

  return (
    <div className="container page report-page">
      <header className="report-header">
        <Link to="/evaluations" className="back-link no-print">
          <LuArrowLeft aria-hidden="true" /> History
        </Link>
        <div className="report-title-row">
          <div>
            <h1 className="report-title">{evaluation.title}</h1>
            <p className="report-meta">
              {evaluation.assignmentId && (
                <span>
                  <Link to={`/assignments/${evaluation.assignmentId}`} className="meta-link">
                    From question paper
                  </Link>
                </span>
              )}
              {evaluation.studentName && <span>{evaluation.studentName}</span>}
              <span>{formatDateTime(evaluation.createdAt)}</span>
              <span>{strictnessLabel(evaluation.difficulty)} marking</span>
            </p>
          </div>
          <div className="report-actions no-print">
            {!failed && (
              <>
                <button type="button" className="btn btn-primary" onClick={reuseKey}>
                  <LuUserRoundPlus aria-hidden="true" /> Grade next student
                </button>
                <button type="button" className="btn" onClick={() => window.print()}>
                  <LuPrinter aria-hidden="true" /> Print
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete evaluation"
              title="Delete"
            >
              <LuTrash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {failed ? (
        <div className="failed-card card card-pad">
          <LuCircleAlert className="failed-icon" aria-hidden="true" />
          <div>
            <h2>This sheet couldn&apos;t be graded</h2>
            <p>{evaluation.failureReason || "Something went wrong while grading."}</p>
            <div className="row">
              <button type="button" className="btn btn-ink" onClick={reuseKey}>
                <LuRefreshCw aria-hidden="true" /> Try again with the same key
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Report evaluation={evaluation} onUpdated={setEvaluation} />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this evaluation?"
        message="The marks, feedback and transcription will be removed permanently."
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
