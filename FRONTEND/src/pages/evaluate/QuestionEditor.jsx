import { useState } from "react";
import { LuArrowDown, LuArrowUp, LuCopyPlus, LuPlus, LuRotateCcw, LuTrash2, LuWandSparkles } from "react-icons/lu";
import { api } from "../../lib/api";
import { useToast } from "../../context/contexts";
import { formatMarks } from "../../lib/format";
import { MAX_QUESTIONS, newQuestion } from "./answerKey";


function MarksInput({ value, onChange, invalid, id }) {
  const step = (delta) => {
    const next = Math.min(100, Math.max(0.5, (Number(value) || 0) + delta));
    onChange(Math.round(next * 2) / 2);
  };
  return (
    <div className="marks-input" data-invalid={invalid || undefined}>
      <button type="button" onClick={() => step(-0.5)} aria-label="Fewer marks" tabIndex={-1}>
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0.5"
        max="100"
        step="0.5"
        value={value}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        aria-invalid={invalid || undefined}
      />
      <button type="button" onClick={() => step(0.5)} aria-label="More marks" tabIndex={-1}>
        +
      </button>
    </div>
  );
}

function QuestionCard({ item, index, count, errors, subject, onUpdate, onMove, onRemove, onDuplicate }) {
  const toast = useToast();
  const [drafting, setDrafting] = useState(false);
  const [previousAnswer, setPreviousAnswer] = useState(null);
  const [keyPoints, setKeyPoints] = useState([]);
  const baseId = `question-${item.id}`;

  const draft = async () => {
    if (item.question.trim().length < 3) {
      toast.info("Type the question first, then draft a model answer.");
      return;
    }
    setDrafting(true);
    try {
      const result = await api.post(
        "/api/ai/reference-answer",
        { question: item.question.trim(), maxMarks: Number(item.maxMarks) || 5, subject: subject || undefined },
        { timeout: 90_000 }
      );
      setPreviousAnswer(item.referenceAnswer);
      setKeyPoints(result.keyPoints || []);
      onUpdate({ referenceAnswer: result.answer });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDrafting(false);
    }
  };

  const undoDraft = () => {
    onUpdate({ referenceAnswer: previousAnswer ?? "" });
    setPreviousAnswer(null);
    setKeyPoints([]);
  };

  return (
    <li className="question-card card" id={baseId}>
      <div className="question-card-head">
        <span className="step-number" aria-hidden="true">
          {index + 1}
        </span>
        <h3 className="sr-only">Question {index + 1}</h3>
        <label className="marks-label" htmlFor={`${baseId}-marks`}>
          Marks
        </label>
        <MarksInput
          id={`${baseId}-marks`}
          value={item.maxMarks}
          invalid={Boolean(errors?.maxMarks)}
          onChange={(maxMarks) => onUpdate({ maxMarks })}
        />
        <div className="spacer" />
        <div className="question-tools">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={`Move question ${index + 1} up`}
            title="Move up"
          >
            <LuArrowUp aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label={`Move question ${index + 1} down`}
            title="Move down"
          >
            <LuArrowDown aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onDuplicate}
            disabled={count >= MAX_QUESTIONS}
            aria-label={`Duplicate question ${index + 1}`}
            title="Duplicate"
          >
            <LuCopyPlus aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon danger-hover"
            onClick={onRemove}
            disabled={count === 1}
            aria-label={`Remove question ${index + 1}`}
            title="Remove"
          >
            <LuTrash2 aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`${baseId}-text`}>
          Question
        </label>
        <textarea
          id={`${baseId}-text`}
          className="textarea textarea-question"
          rows={2}
          placeholder="e.g. Explain normalisation and why it is needed."
          value={item.question}
          onChange={(event) => onUpdate({ question: event.target.value })}
          aria-invalid={errors?.question ? "true" : undefined}
          maxLength={2000}
        />
        {errors?.question && <p className="field-error">{errors.question}</p>}
      </div>

      <div className="field">
        <div className="field-label">
          <label htmlFor={`${baseId}-answer`}>Model answer</label>
          <span className="answer-actions">
            {previousAnswer !== null && !drafting && (
              <button type="button" className="link-button" onClick={undoDraft}>
                <LuRotateCcw aria-hidden="true" /> Undo
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm ai-button"
              onClick={draft}
              data-loading={drafting || undefined}
              aria-describedby={`${baseId}-answer-hint`}
            >
              <LuWandSparkles aria-hidden="true" />
              {item.referenceAnswer.trim() ? "Redraft with AI" : "Draft with AI"}
            </button>
          </span>
        </div>
        <textarea
          id={`${baseId}-answer`}
          className="textarea textarea-answer"
          rows={5}
          placeholder="What a full-marks answer contains. The grader compares each student's answer with this, point by point."
          value={item.referenceAnswer}
          onChange={(event) => onUpdate({ referenceAnswer: event.target.value })}
          aria-invalid={errors?.referenceAnswer ? "true" : undefined}
          aria-busy={drafting || undefined}
          maxLength={8000}
        />
        {errors?.referenceAnswer ? (
          <p className="field-error">{errors.referenceAnswer}</p>
        ) : (
          <p className="field-hint" id={`${baseId}-answer-hint`}>
            {keyPoints.length > 0
              ? "AI draft. Check it before grading: the grader treats it as the correct answer."
              : "Tip: list the points that earn marks. The grader weights them to add up to the question's marks."}
          </p>
        )}
        {keyPoints.length > 0 && (
          <ul className="keypoint-chips" aria-label="Key points in the draft">
            {keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export default function QuestionEditor({ questions, onChange, errors, subject }) {
  const update = (id, patch) => onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const move = (index, delta) => {
    const next = [...questions];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  const add = () => {
    onChange([...questions, newQuestion()]);
    requestAnimationFrame(() => {
      const cards = document.querySelectorAll(".question-card .textarea-question");
      cards[cards.length - 1]?.focus();
    });
  };

  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.maxMarks) || 0), 0);

  return (
    <div className="question-editor">
      <ol className="question-list">
        {questions.map((item, index) => (
          <QuestionCard
            key={item.id}
            item={item}
            index={index}
            count={questions.length}
            errors={errors?.[item.id]}
            subject={subject}
            onUpdate={(patch) => update(item.id, patch)}
            onMove={(delta) => move(index, delta)}
            onRemove={() => onChange(questions.filter((q) => q.id !== item.id))}
            onDuplicate={() => {
              const { question, referenceAnswer, maxMarks } = item;
              const next = [...questions];
              next.splice(index + 1, 0, newQuestion({ question, referenceAnswer, maxMarks }));
              onChange(next);
            }}
          />
        ))}
      </ol>
      <div className="question-editor-foot">
        <button type="button" className="btn" onClick={add} disabled={questions.length >= MAX_QUESTIONS}>
          <LuPlus aria-hidden="true" /> Add question
        </button>
        <p className="muted">
          {questions.length} of {MAX_QUESTIONS} questions · {formatMarks(totalMarks)} marks in total
        </p>
      </div>
    </div>
  );
}
