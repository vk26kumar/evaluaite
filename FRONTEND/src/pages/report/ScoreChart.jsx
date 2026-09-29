import { useState } from "react";
import { LuChartBar, LuTable } from "react-icons/lu";
import { formatMarks, formatPercent } from "../../lib/format";

export default function ScoreChart({ questions, onSelect }) {
  const [view, setView] = useState("chart");
  const [tip, setTip] = useState(null);

  const rows = questions.map((q, index) => {
    const percent = q.maxMarks ? ((q.awardedMarks || 0) / q.maxMarks) * 100 : 0;
    return { id: q.id, label: `Q${index + 1}`, question: q.question, awarded: q.awardedMarks || 0, max: q.maxMarks, percent };
  });

  const showTip = (row, element) => {
    const rect = element.getBoundingClientRect();
    setTip({ row, x: rect.left + Math.min(rect.width / 2, 220), y: rect.top });
  };

  return (
    <figure className="score-chart card card-pad">
      <div className="chart-head">
        <figcaption>
          <h2 className="chart-title">Marks by question</h2>
          <p className="chart-subtitle">Share of each question&apos;s marks earned</p>
        </figcaption>
        <div className="segmented no-print" role="group" aria-label="Chart view">
          <button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")}>
            <LuChartBar aria-hidden="true" /> Chart
          </button>
          <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>
            <LuTable aria-hidden="true" /> Table
          </button>
        </div>
      </div>

      {view === "chart" ? (
        <>
          <div className="meter-axis" aria-hidden="true">
            <span />
            <span className="meter-axis-scale">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </span>
            <span />
          </div>
          <ul className="meters">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="meter-row"
                  onClick={() => onSelect(row.id)}
                  onPointerEnter={(event) => showTip(row, event.currentTarget)}
                  onPointerLeave={() => setTip(null)}
                  onFocus={(event) => showTip(row, event.currentTarget)}
                  onBlur={() => setTip(null)}
                  aria-label={`${row.label}: ${formatMarks(row.awarded)} of ${formatMarks(row.max)} marks, ${formatPercent(
                    row.percent
                  )}. Go to question.`}
                >
                  <span className="meter-label">{row.label}</span>
                  <span className="meter-track">
                    <span className="meter-fill" style={{ width: `${row.percent}%` }} />
                  </span>
                  <span className="meter-value tabular">
                    {formatMarks(row.awarded)}
                    <span className="muted">/{formatMarks(row.max)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Question</th>
                <th scope="col" className="num">
                  Marks
                </th>
                <th scope="col" className="num">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="mono">{row.label}</td>
                  <td>{row.question}</td>
                  <td className="num tabular">
                    {formatMarks(row.awarded)} / {formatMarks(row.max)}
                  </td>
                  <td className="num tabular">{formatPercent(row.percent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }} role="presentation">
          <strong className="tabular">
            {formatMarks(tip.row.awarded)} / {formatMarks(tip.row.max)} · {formatPercent(tip.row.percent)}
          </strong>
          <span>
            {tip.row.label}. {tip.row.question.length > 90 ? `${tip.row.question.slice(0, 90)}…` : tip.row.question}
          </span>
        </div>
      )}
    </figure>
  );
}
