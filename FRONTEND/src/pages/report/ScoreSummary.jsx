import { LuCircleAlert, LuCircleCheck, LuTriangleAlert } from "react-icons/lu";
import { PenCircle } from "../../components/RedPen";
import { formatMarks, formatPercent, scoreBand } from "../../lib/format";
import { strictnessLabel } from "../../lib/strictness";
import { needsReview } from "./reportUtils";

const BAND_ICONS = { good: LuCircleCheck, warn: LuTriangleAlert, bad: LuCircleAlert };

export default function ScoreSummary({ evaluation }) {
  const { score, questions, overall } = evaluation;
  const band = scoreBand(score.percentage);
  const BandIcon = BAND_ICONS[band.tone];

  const answered = questions.filter((q) => q.answerFound).length;
  const review = questions.filter(needsReview).length;
  const adjusted = questions.filter((q) => q.overridden).length;

  const stats = [
    { label: "Questions answered", value: `${answered} of ${questions.length}` },
    { label: "Worth a second look", value: review, hint: review ? "Low confidence or hard to read" : "None flagged" },
    { label: "Adjusted by you", value: adjusted },
    { label: "Strictness", value: strictnessLabel(evaluation.difficulty) },
  ];

  return (
    <section className="summary card" aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="sr-only">
        Score summary
      </h2>
      <div className="summary-score">
        <div className="hero-figure" aria-label={`${formatMarks(score.awarded)} out of ${formatMarks(score.max)} marks`}>
          <span className="hero-figure-value">{formatMarks(score.awarded)}</span>
          <span className="hero-figure-max">/ {formatMarks(score.max)}</span>
          <PenCircle className="hero-figure-ring" strokeWidth={2.5} />
        </div>
        <div className="summary-band">
          <span className="summary-percent">{formatPercent(score.percentage)}</span>
          <span className={`badge badge-${band.tone}`}>
            <BandIcon aria-hidden="true" /> {band.label}
          </span>
        </div>
      </div>

      <div className="summary-body">
        {overall.summary ? (
          <p className="summary-text">{overall.summary}</p>
        ) : (
          <p className="summary-text muted">No overall summary was produced for this sheet.</p>
        )}
        <dl className="stat-row">
          {stats.map((stat) => (
            <div key={stat.label} className="stat">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
              {stat.hint && <dd className="stat-hint">{stat.hint}</dd>}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
