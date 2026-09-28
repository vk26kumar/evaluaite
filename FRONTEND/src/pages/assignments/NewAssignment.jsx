import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { LuArrowRight, LuFileText, LuPlus, LuSparkles, LuTrash2, LuUpload, LuX } from "react-icons/lu";
import { api } from "../../lib/api";
import { useAuth, useToast } from "../../context/contexts";
import { formatBytes, formatMarks, pluralize } from "../../lib/format";
import { useDocumentTitle } from "../../lib/hooks";
import {
  DIFFICULTY_MIXES,
  MAX_PAPER_QUESTIONS,
  MAX_QUESTION_TYPES,
  PAPER_PRESETS,
  QUESTION_TYPES,
  TIME_PRESETS,
} from "../../lib/questionTypes";
import Field from "../../components/Field";
import Stepper from "../../components/Stepper";
import "../evaluate/evaluate.css";
import "./assignments.css";

const INSTRUCTION_IDEAS = [
  "Focus on the chapter I uploaded.",
  "Use real-life examples from India.",
  "Avoid questions that need a calculator.",
  "Include one question on each subtopic.",
];

let nextRowId = 0;
const newRow = (values = {}) => {
  nextRowId += 1;
  return { id: `row-${nextRowId}`, type: "mcq", count: 5, marks: 1, ...values };
};

function initialState(template, user) {
  return {
    title: template?.title ? `${template.title}` : "",
    subject: template?.subject || user?.subjects?.[0] || "",
    className: template?.className || "",
    schoolName: template?.schoolName ?? user?.institution ?? "",
    timeAllowed: template?.timeAllowed || "45 minutes",
    dueDate: "",
    difficultyMix: template?.difficultyMix || "balanced",
    rows: template?.questionTypes?.length ? template.questionTypes.map((row) => newRow(row)) : [newRow()],
    additionalInstructions: template?.additionalInstructions || "",
  };
}

function validate(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = "Give the paper a title.";
  if (!values.subject.trim()) errors.subject = "Enter the subject.";
  if (!values.className.trim()) errors.className = "Enter the class or level.";
  if (!values.timeAllowed.trim()) errors.timeAllowed = "Enter the time allowed.";
  const questions = values.rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  if (values.rows.some((row) => !(row.count >= 1) || !(row.marks >= 0.5))) {
    errors.rows = "Every row needs at least 1 question and 0.5 marks.";
  } else if (questions > MAX_PAPER_QUESTIONS) {
    errors.rows = `A paper can have at most ${MAX_PAPER_QUESTIONS} questions. You have ${questions}.`;
  }
  return Object.keys(errors).length ? errors : null;
}

function ReferenceUpload({ file, onChange }) {
  const [rejection, setRejection] = useState("");
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "text/plain": [".txt"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    noClick: true,
    onDrop: (accepted, rejected) => {
      setRejection(rejected.length ? "Use a PDF, JPG, PNG, WEBP or TXT file up to 10 MB." : "");
      if (accepted[0]) onChange(accepted[0]);
    },
  });

  if (file) {
    return (
      <div className="reference-file">
        <LuFileText aria-hidden="true" />
        <div>
          <p className="reference-name">{file.name}</p>
          <p className="muted">{formatBytes(file.size)} · questions will be based on this material</p>
        </div>
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => onChange(null)} aria-label="Remove file">
          <LuX aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div {...getRootProps({ className: `dropzone dropzone-compact${isDragActive ? " is-dragging" : ""}` })}>
        <input {...getInputProps()} aria-label="Upload reference material" />
        <LuUpload aria-hidden="true" className="dropzone-inline-icon" />
        <p>
          <strong>Drop a chapter, notes or a worksheet</strong>
          <span className="muted"> PDF, image or .txt, up to 10 MB</span>
        </p>
        <button type="button" className="btn btn-sm" onClick={open}>
          Choose file
        </button>
      </div>
      {rejection && <p className="field-error">{rejection}</p>}
    </>
  );
}

export default function NewAssignment() {
  useDocumentTitle("New question paper");
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();

  const [values, setValues] = useState(() => initialState(location.state?.template, user));
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [customTime, setCustomTime] = useState(() => !TIME_PRESETS.includes(values.timeAllowed));

  const set = (field) => (value) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors) setErrors((current) => (current ? { ...current, [field]: undefined } : current));
  };

  const updateRow = (id, patch) =>
    setValues((current) => ({ ...current, rows: current.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)) }));

  const totals = useMemo(() => {
    let questions = 0;
    let marks = 0;
    for (const row of values.rows) {
      questions += Number(row.count) || 0;
      marks += (Number(row.count) || 0) * (Number(row.marks) || 0);
    }
    return { questions, marks };
  }, [values.rows]);

  const applyPreset = (preset) => {
    setValues((current) => ({
      ...current,
      timeAllowed: preset.timeAllowed,
      rows: preset.rows.map((row) => newRow(row)),
    }));
    setCustomTime(false);
  };

  const addIdea = (idea) =>
    set("additionalInstructions")(
      values.additionalInstructions.trim() ? `${values.additionalInstructions.trim()} ${idea}` : idea
    );

  const onSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (found) {
      toast.error("A few things need attention.");
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"], .type-rows-error')?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    if (file) form.append("file", file, file.name);
    form.append(
      "payload",
      JSON.stringify({
        title: values.title.trim(),
        subject: values.subject.trim(),
        className: values.className.trim(),
        schoolName: values.schoolName.trim(),
        timeAllowed: values.timeAllowed.trim(),
        dueDate: values.dueDate || null,
        difficultyMix: values.difficultyMix,
        questionTypes: values.rows.map(({ type, count, marks }) => ({ type, count: Number(count), marks: Number(marks) })),
        additionalInstructions: values.additionalInstructions.trim(),
      })
    );

    try {
      const { assignment } = await api.upload("/api/assignments", form);
      toast.success("Writing your question paper…");
      navigate(`/assignments/${assignment.id}`);
    } catch (err) {
      setSubmitting(false);
      toast.error(err.details?.[0]?.message || err.message);
    }
  };

  return (
    <div className="page evaluate-page">
      <form className="container container-narrow" onSubmit={onSubmit} noValidate>
        <header className="page-header">
          <div>
            <p className="eyebrow">New question paper</p>
            <h1>Create a question paper</h1>
            <p>Choose what goes on the paper. AI writes the questions and a full answer key you can grade with.</p>
          </div>
        </header>

        <section className="evaluate-section" aria-labelledby="paper-details">
          <h2 className="section-title" id="paper-details">
            <span className="step-number">1</span> Paper details
          </h2>
          <div className="card card-pad form-grid">
            <div className="span-2">
              <Field label="Title" error={errors?.title}>
                {(props) => (
                  <input
                    {...props}
                    className="input"
                    placeholder="e.g. Unit test: Electricity"
                    value={values.title}
                    onChange={(event) => set("title")(event.target.value)}
                    maxLength={120}
                  />
                )}
              </Field>
            </div>
            <Field label="Subject" error={errors?.subject}>
              {(props) => (
                <input
                  {...props}
                  className="input"
                  placeholder="e.g. Physics"
                  value={values.subject}
                  onChange={(event) => set("subject")(event.target.value)}
                  maxLength={80}
                  list="subject-suggestions"
                />
              )}
            </Field>
            <datalist id="subject-suggestions">
              {(user?.subjects || []).map((subject) => (
                <option key={subject} value={subject} />
              ))}
            </datalist>
            <Field label="Class or level" error={errors?.className}>
              {(props) => (
                <input
                  {...props}
                  className="input"
                  placeholder="e.g. Class 8, Year 10, B.Sc. 1st year"
                  value={values.className}
                  onChange={(event) => set("className")(event.target.value)}
                  maxLength={40}
                />
              )}
            </Field>
            <Field label="Time allowed" error={errors?.timeAllowed}>
              {(props) =>
                customTime ? (
                  <input
                    {...props}
                    className="input"
                    placeholder="e.g. 2 hours 30 minutes"
                    value={values.timeAllowed}
                    onChange={(event) => set("timeAllowed")(event.target.value)}
                    maxLength={40}
                  />
                ) : (
                  <select
                    {...props}
                    className="input select"
                    value={values.timeAllowed}
                    onChange={(event) => {
                      if (event.target.value === "__custom") {
                        setCustomTime(true);
                        set("timeAllowed")("");
                      } else set("timeAllowed")(event.target.value);
                    }}
                  >
                    {TIME_PRESETS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                    <option value="__custom">Other…</option>
                  </select>
                )
              }
            </Field>
            <Field label="Due date" optional>
              {(props) => (
                <input
                  {...props}
                  className="input"
                  type="date"
                  value={values.dueDate}
                  onChange={(event) => set("dueDate")(event.target.value)}
                />
              )}
            </Field>
            <div className="span-2">
              <Field
                label="School or institution"
                optional
                hint={user?.institution ? "From your profile. Printed at the top of the paper." : "Printed at the top of the paper. Save it in your profile to fill this in automatically."}
              >
                {(props) => (
                  <input
                    {...props}
                    className="input"
                    placeholder="e.g. Delhi Public School, Bokaro"
                    value={values.schoolName}
                    onChange={(event) => set("schoolName")(event.target.value)}
                    maxLength={120}
                  />
                )}
              </Field>
            </div>
          </div>
        </section>

        <section className="evaluate-section" aria-labelledby="paper-structure">
          <h2 className="section-title" id="paper-structure">
            <span className="step-number">2</span> Questions and marks
          </h2>
          <p className="section-lede">Each row becomes a section of the paper, in this order.</p>

          <div className="preset-row" role="group" aria-label="Start from a preset">
            {PAPER_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className="preset" onClick={() => applyPreset(preset)}>
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>

          <div className="card type-rows">
            <div className="type-row type-row-head" aria-hidden="true">
              <span>Question type</span>
              <span>Questions</span>
              <span>Marks each</span>
              <span className="type-row-total">Marks</span>
              <span />
            </div>
            {values.rows.map((row, index) => {
              const type = QUESTION_TYPES.find((option) => option.value === row.type);
              return (
                <div key={row.id} className="type-row">
                  <div className="type-select">
                    <span className="type-letter" aria-hidden="true">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <select
                      className="input select"
                      value={row.type}
                      onChange={(event) => {
                        const next = QUESTION_TYPES.find((option) => option.value === event.target.value);
                        updateRow(row.id, { type: next.value, marks: next.defaultMarks });
                      }}
                      aria-label={`Section ${String.fromCharCode(65 + index)} question type`}
                    >
                      {QUESTION_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="type-hint">{type?.hint}</span>
                  </div>
                  <Stepper
                    value={row.count}
                    min={1}
                    max={50}
                    onChange={(count) => updateRow(row.id, { count })}
                    label={`number of ${type?.label.toLowerCase()} questions`}
                  />
                  <Stepper
                    value={row.marks}
                    min={0.5}
                    max={25}
                    step={0.5}
                    onChange={(marks) => updateRow(row.id, { marks })}
                    label={`marks per ${type?.label.toLowerCase()} question`}
                  />
                  <span className="type-row-total tabular">{formatMarks((Number(row.count) || 0) * (Number(row.marks) || 0))}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon danger-hover"
                    onClick={() => setValues((current) => ({ ...current, rows: current.rows.filter((r) => r.id !== row.id) }))}
                    disabled={values.rows.length === 1}
                    aria-label={`Remove section ${String.fromCharCode(65 + index)}`}
                  >
                    <LuTrash2 aria-hidden="true" />
                  </button>
                </div>
              );
            })}
            <div className="type-rows-foot">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  const used = new Set(values.rows.map((row) => row.type));
                  const next = QUESTION_TYPES.find((option) => !used.has(option.value)) || QUESTION_TYPES[0];
                  setValues((current) => ({ ...current, rows: [...current.rows, newRow({ type: next.value, count: 3, marks: next.defaultMarks })] }));
                }}
                disabled={values.rows.length >= MAX_QUESTION_TYPES}
              >
                <LuPlus aria-hidden="true" /> Add question type
              </button>
              <p className="type-rows-summary">
                <strong>{pluralize(totals.questions, "question")}</strong> · <strong>{formatMarks(totals.marks)}</strong> marks
              </p>
            </div>
          </div>
          {errors?.rows && <p className="field-error type-rows-error">{errors.rows}</p>}
        </section>

        <section className="evaluate-section" aria-labelledby="paper-difficulty">
          <h2 className="section-title" id="paper-difficulty">
            <span className="step-number">3</span> Difficulty
          </h2>
          <div className="strictness" role="radiogroup" aria-label="Difficulty mix">
            {DIFFICULTY_MIXES.map((mix) => {
              const selected = values.difficultyMix === mix.value;
              return (
                <label key={mix.value} className="strictness-option" data-selected={selected || undefined}>
                  <input
                    type="radio"
                    name="difficultyMix"
                    value={mix.value}
                    checked={selected}
                    onChange={() => set("difficultyMix")(mix.value)}
                    className="sr-only"
                  />
                  <span className="strictness-label">{mix.label}</span>
                  <span className="strictness-tagline">{mix.hint}</span>
                  <span className="mix-bar" aria-hidden="true">
                    {Object.entries(mix.split).map(([level, percent]) => (
                      <span key={level} data-level={level} style={{ flexGrow: percent }} />
                    ))}
                  </span>
                  <span className="mix-legend">
                    {Object.entries(mix.split).map(([level, percent]) => (
                      <span key={level}>
                        <i data-level={level} aria-hidden="true" /> {level} {percent}%
                      </span>
                    ))}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="evaluate-section" aria-labelledby="paper-material">
          <h2 className="section-title" id="paper-material">
            <span className="step-number">4</span> Material and instructions <span className="optional-tag">optional</span>
          </h2>
          <p className="section-lede">Upload what you've taught, and the questions stay within it.</p>
          <div className="card card-pad material-card">
            <ReferenceUpload file={file} onChange={setFile} />
            <Field label="Instructions for the AI" optional hint="Anything about focus, style or level.">
              {(props) => (
                <textarea
                  {...props}
                  className="textarea"
                  rows={3}
                  placeholder="e.g. Focus on series and parallel circuits. Keep the language simple."
                  value={values.additionalInstructions}
                  onChange={(event) => set("additionalInstructions")(event.target.value)}
                  maxLength={1500}
                />
              )}
            </Field>
            <div className="suggestions" aria-label="Instruction ideas">
              {INSTRUCTION_IDEAS.map((idea) => (
                <button key={idea} type="button" className="suggestion" onClick={() => addIdea(idea)}>
                  + {idea}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="submit-bar">
          <div className="submit-bar-inner">
            <p className="submit-summary">
              <strong>{pluralize(totals.questions, "question")}</strong>
              <span aria-hidden="true">·</span>
              <span>{formatMarks(totals.marks)} marks</span>
              <span aria-hidden="true">·</span>
              <span>{pluralize(values.rows.length, "section")}</span>
            </p>
            <button type="submit" className="btn btn-primary btn-lg" data-loading={submitting || undefined}>
              <LuSparkles aria-hidden="true" /> Generate paper <LuArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
