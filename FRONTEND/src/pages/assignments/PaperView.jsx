import { useState } from "react";
import { LuCheck, LuPencil } from "react-icons/lu";
import { api } from "../../lib/api";
import { useToast } from "../../context/contexts";
import { formatDate, formatMarks, pluralize } from "../../lib/format";

const LETTERS = ["A", "B", "C", "D"];

function QuestionEditor({ assignmentId, question, isMcq, onSaved, onCancel }) {
  const toast = useToast();
  const [text, setText] = useState(question.text);
  const [options, setOptions] = useState(question.options);
  const [answer, setAnswer] = useState(question.answer || "");
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    if (text.trim().length < 3) {
      toast.error("The question needs some text.");
      return;
    }
    if (isMcq && options.some((option) => !option.trim())) {
      toast.error("Fill in all four options.");
      return;
    }
    setSaving(true);
    try {
      const { assignment } = await api.patch(`/api/assignments/${assignmentId}/questions/${question.id}`, {
        text: text.trim(),
        answer: answer.trim(),
        ...(isMcq ? { options: options.map((option) => option.trim()) } : {}),
      });
      toast.success(`Question ${question.number} updated.`);
      onSaved(assignment);
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  return (
    <form className="paper-edit" onSubmit={save}>
      <label className="field-label" htmlFor={`edit-${question.id}`}>
        Question {question.number}
      </label>
      <textarea id={`edit-${question.id}`} className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} autoFocus />
      {isMcq && (
        <div className="paper-edit-options">
          {options.map((option, index) => (
            <label key={index} className="paper-edit-option">
              <span>{LETTERS[index]})</span>
              <input
                className="input"
                value={option}
                onChange={(e) => setOptions((current) => current.map((value, i) => (i === index ? e.target.value : value)))}
                maxLength={300}
                aria-label={`Option ${LETTERS[index]}`}
              />
            </label>
          ))}
        </div>
      )}
      <label className="field-label" htmlFor={`answer-${question.id}`}>
        Answer and marking guide
      </label>
      <textarea id={`answer-${question.id}`} className="textarea" rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={4000} />
      <div className="override-actions">
        <div className="spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-ink btn-sm" data-loading={saving || undefined}>
          <LuCheck aria-hidden="true" /> Save question
        </button>
      </div>
    </form>
  );
}

export default function PaperView({ assignment, mode, onUpdated }) {
  const [editing, setEditing] = useState(null);
  const teacher = mode === "teacher";
  const { paper } = assignment;

  return (
    <article className="exam-paper" aria-label="Question paper">
      <header className="exam-head">
        {assignment.schoolName && <p className="exam-school">{assignment.schoolName}</p>}
        <h2 className="exam-title">{assignment.title}</h2>
        <p className="exam-sub">
          Subject: {assignment.subject} <span aria-hidden="true">·</span> Class: {assignment.className}
        </p>
        <div className="exam-meta">
          <span>Time allowed: {assignment.timeAllowed}</span>
          {assignment.dueDate && <span className="exam-due">Due: {formatDate(assignment.dueDate)}</span>}
          <span>Maximum marks: {formatMarks(assignment.totalMarks)}</span>
        </div>
        {teacher ? (
          <p className="exam-copy-label">Teacher&apos;s copy · answers shown in red</p>
        ) : (
          <div className="exam-fields" aria-hidden="true">
            <span>
              Name <i />
            </span>
            <span>
              Roll no. <i />
            </span>
            <span>
              Class &amp; section <i />
            </span>
            <span>
              Date <i />
            </span>
          </div>
        )}
      </header>

      {paper.generalInstructions.length > 0 && (
        <section className="exam-instructions">
          <h3>General instructions</h3>
          <ol>
            {paper.generalInstructions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>
      )}

      {paper.sections.map((section) => {
        const sectionMarks = section.questions.reduce((sum, q) => sum + q.marks, 0);
        return (
          <section key={section.label} className="exam-section" aria-label={`Section ${section.label}`}>
            <header className="exam-section-head">
              <h3>Section {section.label}</h3>
              <p className="exam-section-title">{section.title}</p>
              <p className="exam-section-rule">
                {section.instruction} ({section.questions.length} × {formatMarks(section.questions[0]?.marks ?? 0)} ={" "}
                {pluralize(sectionMarks, "mark")})
              </p>
            </header>
            <ol className="exam-questions">
              {section.questions.map((q) => (
                <li key={q.id} className="exam-question" id={`paper-q-${q.id}`}>
                  {editing === q.id ? (
                    <QuestionEditor
                      assignmentId={assignment.id}
                      question={q}
                      isMcq={section.type === "mcq"}
                      onCancel={() => setEditing(null)}
                      onSaved={(updated) => {
                        setEditing(null);
                        onUpdated(updated);
                      }}
                    />
                  ) : (
                    <>
                      <span className="exam-number">{q.number}.</span>
                      <div className="exam-body">
                        <p className="exam-text">{q.text}</p>
                        {q.options.length > 0 && (
                          <ol className={`exam-options${q.options.every((o) => o.length <= 42) ? " is-grid" : ""}`}>
                            {q.options.map((option, index) => (
                              <li key={index}>
                                <span>{LETTERS[index]})</span> {option}
                              </li>
                            ))}
                          </ol>
                        )}
                        {teacher && (
                          <div className="exam-answer">
                            <p className="exam-answer-label hand">
                              Answer <span className="exam-difficulty" data-level={q.difficulty}>{q.difficulty}</span>
                            </p>
                            <p className="exam-answer-text">{q.answer || "No answer was generated for this question."}</p>
                          </div>
                        )}
                      </div>
                      <span className="exam-marks">[{formatMarks(q.marks)}]</span>
                      {teacher && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon exam-edit no-print"
                          onClick={() => setEditing(q.id)}
                          aria-label={`Edit question ${q.number}`}
                          title="Edit question"
                        >
                          <LuPencil aria-hidden="true" />
                        </button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <p className="exam-end">— End of question paper —</p>
    </article>
  );
}
