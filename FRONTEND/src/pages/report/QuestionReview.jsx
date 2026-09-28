import { useId, useState } from "react";
import {
  LuChevronDown,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuEyeOff,
  LuPencil,
  LuRotateCcw,
  LuTriangleAlert,
} from "react-icons/lu";
import { api } from "../../lib/api";
import { useToast } from "../../context/contexts";
import { formatMarks } from "../../lib/format";

const COVERAGE = {
  full: { icon: LuCircleCheck, label: "Covered" },
  partial: { icon: LuCircleDashed, label: "Partly covered" },
  none: { icon: LuCircleX, label: "Missing" },
};

function StatusBadges({ question }) {
  const badges = [];
  if (question.legibility === "missing") {
    badges.push(
      <span key="missing" className="badge">
        Not answered
      </span>
    );
  } else if (question.legibility === "illegible") {
    badges.push(
      <span key="illegible" className="badge badge-bad">
        <LuEyeOff aria-hidden="true" /> Illegible
      </span>
    );
  } else if (question.legibility === "partial") {
    badges.push(
      <span key="partial" className="badge badge-warn">
        <LuEyeOff aria-hidden="true" /> Partly legible
      </span>
    );
  }
  if (question.confidence === "low" && question.legibility !== "missing") {
    badges.push(
      <span key="confidence" className="badge badge-warn">
        <LuTriangleAlert aria-hidden="true" /> Check this mark
      </span>
    );
  }
  if (question.overridden) {
    badges.push(
      <span key="override" className="badge badge-accent" title={`AI suggested ${formatMarks(question.aiMarks)}`}>
        <LuPencil aria-hidden="true" /> Adjusted · AI gave {formatMarks(question.aiMarks)}
      </span>
    );
  }
  return badges.length ? <div className="question-badges">{badges}</div> : null;
}

function OverrideForm({ evaluationId, question, onSaved, onCancel }) {
  const toast = useToast();
  const id = useId();
  const [marks, setMarks] = useState(String(question.awardedMarks ?? 0));
  const [note, setNote] = useState(question.teacherNote || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (value = Number(marks), teacherNote = note) => {
    if (!Number.isFinite(value) || value < 0 || value > question.maxMarks || !Number.isInteger(value * 2)) {
      setError(`Enter a mark from 0 to ${formatMarks(question.maxMarks)}, in steps of 0.5.`);
      return;
    }
    setSaving(true);
    try {
      const { evaluation } = await api.patch(`/api/evaluations/${evaluationId}/questions/${question.id}`, {
        awardedMarks: value,
        teacherNote: teacherNote.trim(),
      });
      toast.success("Mark updated.");
      onSaved(evaluation);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form
      className="override-form"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="override-row">
        <label htmlFor={`${id}-marks`}>New mark</label>
        <input
          id={`${id}-marks`}
          className="input override-input"
          type="number"
          inputMode="decimal"
          min="0"
          max={question.maxMarks}
          step="0.5"
          value={marks}
          onChange={(event) => {
            setMarks(event.target.value);
            setError("");
          }}
          aria-invalid={error ? "true" : undefined}
          autoFocus
        />
        <span className="muted">/ {formatMarks(question.maxMarks)}</span>
      </div>
      <label className="sr-only" htmlFor={`${id}-note`}>
        Note (optional)
      </label>
      <textarea
        id={`${id}-note`}
        className="textarea"
        rows={2}
        placeholder="Why you changed it (optional, shown on the report)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1000}
      />
      {error && <p className="field-error">{error}</p>}
      <div className="override-actions">
        {question.overridden && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => save(question.aiMarks ?? 0, "")}
            disabled={saving}
          >
            <LuRotateCcw aria-hidden="true" /> Restore AI mark
          </button>
        )}
        <div className="spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-ink btn-sm" data-loading={saving || undefined}>
          Save mark
        </button>
      </div>
    </form>
  );
}

export default function QuestionReview({ evaluationId, question, index, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const modelId = useId();
  const full = question.awardedMarks >= question.maxMarks;

  return (
    <article className="review-card card" id={`q-${question.id}`} aria-labelledby={`q-${question.id}-title`}>
      <header className="review-head">
        <span className="step-number" aria-hidden="true">
          {index + 1}
        </span>
        <div className="review-title-wrap">
          <p className="eyebrow">
            Question {index + 1} · {formatMarks(question.maxMarks)} marks
          </p>
          <h3 id={`q-${question.id}-title`} className="review-title">
            {question.question}
          </h3>
          <StatusBadges question={question} />
        </div>
        <div className="review-score" data-full={full || undefined}>
          <span className="review-score-figure hand">
            <span className="review-score-value">{formatMarks(question.awardedMarks)}</span>
            <span className="review-score-max">/{formatMarks(question.maxMarks)}</span>
          </span>
          {!editing && (
            <button type="button" className="btn btn-sm btn-ghost review-adjust no-print" onClick={() => setEditing(true)}>
              <LuPencil aria-hidden="true" /> Adjust
            </button>
          )}
        </div>
      </header>

      {editing && (
        <OverrideForm
          evaluationId={evaluationId}
          question={question}
          onCancel={() => setEditing(false)}
          onSaved={(evaluation) => {
            setEditing(false);
            onUpdated(evaluation);
          }}
        />
      )}

      {question.feedback && (
        <div className="examiner-note">
          <p className="examiner-label hand">Examiner&apos;s note</p>
          <p>{question.feedback}</p>
        </div>
      )}

      {question.teacherNote && (
        <div className="teacher-note">
          <p className="eyebrow">Your note</p>
          <p>{question.teacherNote}</p>
        </div>
      )}

      <div className="review-grid">
        <section className="student-answer" aria-label="Student's answer">
          <p className="panel-label">Student&apos;s answer, transcribed</p>
          {question.studentAnswer ? (
            <div className="student-answer-text ruled">{question.studentAnswer}</div>
          ) : (
            <p className="student-answer-empty">No answer to this question was found on the sheet.</p>
          )}
        </section>

        <section className="keypoints" aria-label="Key points">
          <p className="panel-label">Key points</p>
          {question.keyPoints.length > 0 ? (
            <ul className="keypoint-list">
              {question.keyPoints.map((point, pointIndex) => {
                const { icon: Icon, label } = COVERAGE[point.coverage] || COVERAGE.none;
                return (
                  <li key={pointIndex} data-coverage={point.coverage}>
                    <Icon aria-hidden="true" />
                    <span>
                      {point.point}
                      <span className="sr-only"> ({label})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted small">No key-point breakdown for this question.</p>
          )}

          {question.missingPoints.length > 0 && (
            <>
              <p className="panel-label panel-label-gap">To earn more marks</p>
              <ul className="plain-list">
                {question.missingPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="model-answer">
        <button
          type="button"
          className="model-toggle no-print"
          onClick={() => setShowModel((value) => !value)}
          aria-expanded={showModel}
          aria-controls={modelId}
        >
          <LuChevronDown aria-hidden="true" /> {showModel ? "Hide" : "Show"} model answer
        </button>
        <div id={modelId} className="model-answer-text" hidden={!showModel}>
          {question.referenceAnswer}
        </div>
      </div>
    </article>
  );
}
