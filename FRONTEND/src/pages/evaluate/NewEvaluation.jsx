import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuArrowRight, LuEraser, LuFileText, LuInfo, LuUnlink } from "react-icons/lu";
import { api } from "../../lib/api";
import { useToast } from "../../context/contexts";
import { formatMarks, pluralize } from "../../lib/format";
import { useBeforeUnload, useDocumentTitle } from "../../lib/hooks";
import Field from "../../components/Field";
import { ConfirmDialog } from "../../components/Feedback";
import SheetDropzone, { MAX_TOTAL_BYTES } from "./SheetDropzone";
import QuestionEditor from "./QuestionEditor";
import StrictnessPicker from "./StrictnessPicker";
import { clearDraft, loadDraft, newQuestion, saveDraft, validate } from "./answerKey";
import "./evaluate.css";

function initialState(template) {
  const source = template || loadDraft();
  return {
    title: source?.title || "",
    difficulty: source?.difficulty || "Medium",
    questions: source?.questions?.length ? source.questions : [newQuestion()],
    assignment: source?.assignment || null,
    fromTemplate: Boolean(template),
    restoredDraft: !template && Boolean(source),
  };
}

function scrollToFirstError() {
  requestAnimationFrame(() => {
    const target = document.querySelector('[aria-invalid="true"], .dropzone.has-error');
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target?.focus && target.tagName !== "DIV") target.focus({ preventScroll: true });
  });
}

export default function NewEvaluation() {
  useDocumentTitle("New evaluation");
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [initial] = useState(() => initialState(location.state?.template));
  const [title, setTitle] = useState(initial.title);
  const [studentName, setStudentName] = useState("");
  const [difficulty, setDifficulty] = useState(initial.difficulty);
  const [questions, setQuestions] = useState(initial.questions);
  const [assignment, setAssignment] = useState(initial.assignment);
  const [pages, setPages] = useState([]);
  const [errors, setErrors] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => saveDraft({ title, difficulty, questions, assignment }), 400);
    return () => clearTimeout(timer);
  }, [title, difficulty, questions, assignment]);

  useBeforeUnload(pages.length > 0 && !submitting);

  const totalBytes = useMemo(() => pages.reduce((sum, page) => sum + page.file.size, 0), [pages]);
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.maxMarks) || 0), 0);

  useEffect(() => {
    if (errors) setErrors(validate({ title, questions, pages, totalBytes, maxTotalBytes: MAX_TOTAL_BYTES }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, questions, pages, totalBytes]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const found = validate({ title, questions, pages, totalBytes, maxTotalBytes: MAX_TOTAL_BYTES });
    setErrors(found);
    if (found) {
      toast.error("A few things need attention before grading.");
      scrollToFirstError();
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    pages.forEach((page) => form.append("files", page.file, page.file.name));
    form.append(
      "payload",
      JSON.stringify({
        title: title.trim(),
        studentName: studentName.trim(),
        difficulty,
        assignmentId: assignment?.id || null,
        questions: questions.map((q) => ({
          question: q.question.trim(),
          referenceAnswer: q.referenceAnswer.trim(),
          maxMarks: Number(q.maxMarks),
        })),
      })
    );

    try {
      const { evaluation } = await api.upload("/api/evaluations", form);
      toast.success("Sheet received. Grading has started.");
      navigate(`/evaluations/${evaluation.id}`);
    } catch (error) {
      setSubmitting(false);
      toast.error(error.details?.[0]?.message || error.message);
    }
  };

  const resetKey = () => {
    clearDraft();
    setTitle("");
    setDifficulty("Medium");
    setQuestions([newQuestion()]);
    setAssignment(null);
    setErrors(null);
    setConfirmClear(false);
    toast.info("Answer key cleared.");
  };

  return (
    <div className="page evaluate-page">
      <form className="container container-narrow" onSubmit={onSubmit} noValidate>
        <header className="page-header">
          <div>
            <p className="eyebrow">New evaluation</p>
            <h1>Grade an answer sheet</h1>
            <p>Upload one student&apos;s sheet and the answer key. The same key is kept for the next student.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(true)}>
            <LuEraser aria-hidden="true" /> Clear answer key
          </button>
        </header>

        {assignment && (
          <div className="callout callout-info evaluate-notice linked-paper">
            <LuFileText aria-hidden="true" />
            <p>
              <strong>Answer key from the question paper </strong>
              <Link to={`/assignments/${assignment.id}`}>{assignment.title}</Link>. Results will also show on that paper.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setAssignment(null)}
              title="Grade without linking to the paper"
            >
              <LuUnlink aria-hidden="true" /> Unlink
            </button>
          </div>
        )}

        {!assignment && (initial.fromTemplate || initial.restoredDraft) && (
          <div className="callout callout-info evaluate-notice">
            <LuInfo aria-hidden="true" />
            <p>
              {initial.fromTemplate ? (
                <>
                  <strong>Answer key loaded.</strong> Add the next student&apos;s sheet and you&apos;re ready to go.
                </>
              ) : (
                <>
                  <strong>Welcome back.</strong> Your answer key from last time has been restored.
                </>
              )}
            </p>
          </div>
        )}

        <section className="evaluate-section" aria-labelledby="section-details">
          <h2 className="section-title" id="section-details">
            <span className="step-number">1</span> About this sheet
          </h2>
          <div className="details-grid card card-pad">
            <Field label="Title" error={errors?.title} hint="Shown in your history and on the report.">
              {(props) => (
                <input
                  {...props}
                  className="input"
                  placeholder="e.g. DBMS unit test, Class 12B"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                />
              )}
            </Field>
            <Field label="Student" optional hint="Name or roll number.">
              {(props) => (
                <input
                  {...props}
                  className="input"
                  placeholder="e.g. Aman Verma"
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  maxLength={120}
                  autoComplete="off"
                />
              )}
            </Field>
          </div>
        </section>

        <section className="evaluate-section" aria-labelledby="section-sheet">
          <h2 className="section-title" id="section-sheet">
            <span className="step-number">2</span> Answer sheet
          </h2>
          <p className="section-lede">
            Photograph each page flat, in good light, with the whole page in frame. Pages can be in any order.
          </p>
          <SheetDropzone pages={pages} onChange={setPages} error={errors?.pages} />
          {errors?.pages && <p className="field-error section-error">{errors.pages}</p>}
        </section>

        <section className="evaluate-section" aria-labelledby="section-key">
          <h2 className="section-title" id="section-key">
            <span className="step-number">3</span> Answer key
          </h2>
          <p className="section-lede">
            One card per question. You don&apos;t need to match the sheet&apos;s numbering: answers are matched to
            questions by what they say.
          </p>
          <QuestionEditor questions={questions} onChange={setQuestions} errors={errors?.questions} subject={title} />
        </section>

        <section className="evaluate-section" aria-labelledby="section-strictness">
          <h2 className="section-title" id="section-strictness">
            <span className="step-number">4</span> Marking strictness
          </h2>
          <StrictnessPicker value={difficulty} onChange={setDifficulty} />
        </section>

        <div className="submit-bar">
          <div className="submit-bar-inner">
            <p className="submit-summary">
              <strong>{pluralize(questions.length, "question")}</strong>
              <span aria-hidden="true">·</span>
              <span>{formatMarks(totalMarks)} marks</span>
              <span aria-hidden="true">·</span>
              <span>{pages.length ? pluralize(pages.length, "page") : "no pages yet"}</span>
            </p>
            <button type="submit" className="btn btn-primary btn-lg" data-loading={submitting || undefined}>
              Start grading <LuArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmClear}
        title="Clear the answer key?"
        message="This removes the title, every question and every model answer. Uploaded pages stay."
        confirmLabel="Clear answer key"
        onConfirm={resetKey}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
