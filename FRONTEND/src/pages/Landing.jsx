import { Link } from "react-router-dom";
import {
  LuArrowRight,
  LuFileText,
  LuCamera,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuEyeOff,
  LuListChecks,
  LuLock,
  LuPenLine,
  LuScanLine,
  LuShieldCheck,
  LuSlidersHorizontal,
} from "react-icons/lu";
import { useAuth } from "../context/contexts";
import { FEATURES as TOOLS } from "../lib/features";
import { useDocumentTitle } from "../lib/hooks";
import { PenCircle, PenCross, PenTick, PenUnderline } from "../components/RedPen";
import "./landing.css";

const STEPS = [
  {
    icon: LuCamera,
    title: "Snap the answer sheet",
    body: "Take a photo or upload a scan. Up to six pages, in any order. Handwriting, tables and diagrams all count.",
  },
  {
    icon: LuListChecks,
    title: "Set your answer key",
    body: "Type each question, its marks and a model answer, or let AI draft the model answer for you to edit.",
  },
  {
    icon: LuPenLine,
    title: "Review and adjust",
    body: "Every mark comes with the key points it was based on. Change any score in one click before you share it.",
  },
];

const FEATURES = [
  {
    icon: LuScanLine,
    title: "Reads real handwriting",
    body: "Transcribes answers word for word, spelling mistakes included, and marks unreadable words as illegible instead of guessing.",
  },
  {
    icon: LuListChecks,
    title: "Marks point by point",
    body: "Your model answer is split into weighted key points, and the report shows which ones each student covered.",
  },
  {
    icon: LuSlidersHorizontal,
    title: "Strictness you choose",
    body: "Lenient for a quick quiz, strict for a final exam. Each level follows a written rubric, so marks stay consistent.",
  },
  {
    icon: LuShieldCheck,
    title: "You have the final say",
    body: "Override any mark and add a note. Changed scores are labelled, so you always know what was adjusted.",
  },
  {
    icon: LuEyeOff,
    title: "Can't be sweet-talked",
    body: "Notes like “please give me full marks” get flagged for you and ignored by the grader.",
  },
  {
    icon: LuLock,
    title: "Sheets aren't kept",
    body: "Uploaded pages are read in memory and discarded after grading. Only the transcription and marks are saved.",
  },
];

const FACTS = [
  { value: "2", label: "passes per sheet: read first, then mark" },
  { value: "½", label: "mark precision on every question" },
  { value: "6", label: "pages per answer sheet" },
  { value: "30", label: "questions per paper" },
];

function HeroSheet() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-sheet paper ruled margin-rule">
        <div className="hero-sheet-head">
          <span className="hero-sheet-q mono">Q3 · 10 marks</span>
          <p className="hero-sheet-prompt">Explain normalisation and its need.</p>
          <div className="hero-score">
            <span className="hand">8</span>
            <span className="hand hero-score-max">/10</span>
            <PenCircle className="hero-score-ring" delay={900} />
          </div>
        </div>

        <ol className="hero-lines">
          <li>
            <span className="ink">Normalisation is the process of organising the data in the database.</span>
            <PenTick className="hero-mark hero-mark-tick" delay={300} />
          </li>
          <li>
            <span className="ink">It minimises redundancy from a relation or set of relations.</span>
            <PenTick className="hero-mark hero-mark-tick" delay={450} />
          </li>
          <li>
            <span className="ink">It removes insertion, update and deletion anamolies.</span>
            <PenTick className="hero-mark hero-mark-tick" delay={600} />
          </li>
          <li>
            <span className="ink">It divides the larger table into smaller tables.</span>
            <PenCross className="hero-mark hero-mark-cross" delay={750} />
            <span className="hero-margin-note hand">how are they linked?</span>
          </li>
        </ol>
      </div>

      <div className="keypoints-card card">
        <p className="eyebrow">Key points</p>
        <ul>
          <li>
            <LuCircleCheck className="kp-full" /> Organises data to cut redundancy
          </li>
          <li>
            <LuCircleCheck className="kp-full" /> Removes the three anomalies
          </li>
          <li>
            <LuCircleDashed className="kp-partial" /> Splits tables linked by keys
          </li>
          <li>
            <LuCircleX className="kp-none" /> Gives a worked example
          </li>
        </ul>
      </div>

      <div className="confidence-chip">
        <span className="badge badge-good badge-dot">High confidence</span>
      </div>
    </div>
  );
}

export default function Landing() {
  useDocumentTitle();
  const { isAuthenticated } = useAuth();
  const primaryTo = isAuthenticated ? "/evaluate" : "/signup";
  const scrollToSteps = () => document.getElementById("how")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="landing">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow enter">AI marking for handwritten answer sheets</p>
            <h1 className="hero-title enter" style={{ "--delay": "60ms" }}>
              Grade a stack of answer sheets in minutes,{" "}
              <span className="pen-underlined">
                not evenings.
                <PenUnderline className="pen-underline" delay={500} />
              </span>
            </h1>
            <p className="hero-lede enter" style={{ "--delay": "120ms" }}>
              Photograph a student&apos;s answer sheet, add your answer key, and get marks and feedback for every
              point. Check them, change any score, then share the report.
            </p>
            <div className="hero-actions enter" style={{ "--delay": "180ms" }}>
              <Link to={primaryTo} className="btn btn-primary btn-lg">
                {isAuthenticated ? "Grade a sheet" : "Start grading"} <LuArrowRight aria-hidden="true" />
              </Link>
              <button type="button" className="btn btn-ghost btn-lg" onClick={scrollToSteps}>
                See how it works
              </button>
            </div>
            <ul className="hero-proof enter" style={{ "--delay": "240ms" }}>
              <li>Reads real handwriting</li>
              <li>Marks against your key</li>
              <li>You approve every score</li>
            </ul>
          </div>
          <HeroSheet />
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <div className="section-intro">
            <p className="eyebrow">How it works</p>
            <h2>Three steps. The last one is yours.</h2>
          </div>
          <ol className="steps">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="step card card-pad">
                <div className="step-top">
                  <span className="step-number">{index + 1}</span>
                  <Icon className="step-icon" aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-intro">
            <p className="eyebrow">Built to be checked</p>
            <h2>A second marker that shows its working.</h2>
            <p>
              Useful AI marking isn&apos;t just a score. It&apos;s a score you can trust, question, and correct in
              seconds.
            </p>
          </div>
          <div className="features">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="feature">
                <Icon className="feature-icon" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>

          <dl className="facts">
            {FACTS.map(({ value, label }) => (
              <div key={label} className="fact">
                <dt className="hand">{value}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section">
        <div className="container paper-promo">
          <div className="paper-promo-copy">
            <p className="eyebrow">Question papers</p>
            <h2>Write the paper. Then grade it.</h2>
            <p>
              Choose the question types and marks, and AI writes a complete paper with an answer key: multiple choice,
              short and long answers, numericals and more. Upload a chapter to keep the questions on what you taught.
            </p>
            <ul className="paper-promo-points">
              <li>Download a student copy and a teacher copy with answers as PDF</li>
              <li>Edit any question, or write a fresh version in one click</li>
              <li>Grade every student&apos;s sheet against the paper&apos;s own answer key</li>
            </ul>
            <Link to="/assignments/new" className="btn btn-ink btn-lg">
              <LuFileText aria-hidden="true" /> Create a question paper
            </Link>
          </div>
          <div className="paper-promo-visual paper ruled margin-rule" aria-hidden="true">
            <p className="paper-promo-school">Section B · Short Answer Questions</p>
            <p className="paper-promo-rule">Answer each question in 2 to 4 sentences. (5 × 2 = 10 marks)</p>
            <ol start="11">
              <li>
                <span>Why do we see lightning before we hear thunder?</span>
                <b>[2]</b>
              </li>
              <li>
                <span>State two differences between series and parallel circuits.</span>
                <b>[2]</b>
              </li>
            </ol>
            <div className="paper-promo-answer">
              <span className="hand">Answer</span>- Light travels much faster than sound (about 3 × 10⁸ m/s vs 343 m/s)
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-intro">
            <p className="eyebrow">Everything in one place</p>
            <h2>Tools for the whole teaching week.</h2>
            <p>Look around freely. You&apos;ll be asked to sign in when you start using a tool.</p>
          </div>
          <div className="tools-grid">
            {TOOLS.map(({ to, icon: Icon, title, blurb }) => (
              <Link key={to} to={to} className="tool-card card">
                <Icon className="feature-icon" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{blurb}</p>
                <span className="tool-go">
                  {isAuthenticated ? "Open" : "Try it"} <LuArrowRight aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta paper ruled margin-rule">
            <div>
              <h2>Your next stack of papers is waiting.</h2>
              <p>Set up your first answer key in about two minutes, then reuse it for the whole class.</p>
            </div>
            <Link to={primaryTo} className="btn btn-primary btn-lg">
              {isAuthenticated ? "Grade a sheet" : "Create your account"} <LuArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
