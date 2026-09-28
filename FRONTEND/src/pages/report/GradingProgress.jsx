import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuCheck } from "react-icons/lu";
import { formatDuration, pluralize } from "../../lib/format";

const STEPS = [
  { key: "queued", label: "Sheet received", detail: "Pages uploaded and queued for grading." },
  {
    key: "reading",
    label: "Reading the handwriting",
    detail: "Transcribing each answer word for word and matching it to your questions.",
  },
  {
    key: "grading",
    label: "Marking against your key",
    detail: "Checking every key point in your model answers and writing feedback.",
  },
  { key: "completed", label: "Report ready", detail: "" },
];

const ORDER = STEPS.map((step) => step.key);

function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, now - new Date(since).getTime());
}

export default function GradingProgress({ evaluation }) {
  const elapsed = useElapsed(evaluation.createdAt);
  const current = ORDER.indexOf(evaluation.status);
  const pages = evaluation.files?.length || 0;

  return (
    <div className="progress-wrap">
      <div className="progress-card paper ruled margin-rule" aria-live="polite">
        <div className="progress-head">
          <p className="eyebrow">Grading in progress</p>
          <p className="progress-timer mono" aria-label={`Elapsed ${formatDuration(elapsed)}`}>
            {formatDuration(elapsed)}
          </p>
        </div>
        <h1 className="progress-title">{evaluation.title}</h1>
        <p className="progress-meta">
          {evaluation.studentName && <>{evaluation.studentName} · </>}
          {pluralize(evaluation.questions.length, "question")} · {pluralize(pages, "page")}
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
          {STEPS.map((step, index) => {
            const state = index < current ? "done" : index === current ? "active" : "todo";
            return (
              <li key={step.key} data-state={state}>
                <span className="progress-dot" aria-hidden="true">
                  {state === "done" ? <LuCheck /> : state === "active" ? <span className="spinner" /> : null}
                </span>
                <div>
                  <p className="progress-label">
                    {step.label}
                    <span className="sr-only">
                      {state === "done" ? " (done)" : state === "active" ? " (in progress)" : ""}
                    </span>
                  </p>
                  {state === "active" && step.detail && <p className="progress-detail">{step.detail}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {elapsed > 90_000 && (
          <p className="progress-slow">
            Taking a little longer than usual. Long or multi-page sheets can take a few minutes.
          </p>
        )}
      </div>

      <p className="progress-leave">
        You can leave this page. Grading carries on, and the result will appear in{" "}
        <Link to="/evaluations">History</Link>.
      </p>
    </div>
  );
}
