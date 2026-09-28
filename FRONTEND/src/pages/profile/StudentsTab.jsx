import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LuChevronDown, LuDownload, LuFileText, LuSearch, LuUsers } from "react-icons/lu";
import { api } from "../../lib/api";
import { formatDate, formatMarks, formatPercent, pluralize, scoreBand } from "../../lib/format";
import { ErrorState } from "../../components/Feedback";

const SORTS = [
  { value: "name", label: "Name" },
  { value: "average", label: "Highest average" },
  { value: "lowest", label: "Lowest average" },
  { value: "sheets", label: "Most sheets" },
  { value: "recent", label: "Most recent" },
];

const sorters = {
  name: (a, b) => a.name.localeCompare(b.name),
  average: (a, b) => b.averagePercentage - a.averagePercentage,
  lowest: (a, b) => a.averagePercentage - b.averagePercentage,
  sheets: (a, b) => b.sheets - a.sheets,
  recent: (a, b) => new Date(b.latestAt) - new Date(a.latestAt),
};

/** Score trend, oldest to newest, on a fixed 0–100% scale. The latest sheet is the filled dot. */
function Sparkline({ values }) {
  if (values.length < 2) return <span className="muted small">—</span>;
  const width = 76;
  const height = 22;
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * (width - 6) + 3,
    height - 3 - (Math.min(100, Math.max(0, value)) / 100) * (height - 6),
  ]);
  const last = points[points.length - 1];
  const trend = values[values.length - 1] - values[0];
  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Trend over ${values.length} sheets: ${trend >= 0 ? "up" : "down"} ${Math.abs(Math.round(trend))} points`}
    >
      <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--chart-fill)" stroke="var(--surface)" strokeWidth="1.5" />
    </svg>
  );
}

function toCsv(students) {
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = [["Student", "Sheet", "Date", "Marks", "Out of", "Percentage"]];
  for (const student of students) {
    for (const sheet of student.evaluations) {
      rows.push([student.name, sheet.title, new Date(sheet.date).toISOString().slice(0, 10), sheet.awarded, sheet.max, sheet.percentage]);
    }
  }
  // The BOM makes Excel open UTF-8 names (e.g. accented or Hindi) correctly.
  return "﻿" + rows.map((row) => row.map(escape).join(",")).join("\r\n");
}

export default function StudentsTab() {
  const [state, setState] = useState({ status: "loading", students: [], unnamedSheets: 0 });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [open, setOpen] = useState(() => new Set());

  const load = useCallback((signal) => {
    setState((current) => ({ ...current, status: "loading" }));
    api
      .get("/api/profile/students", { signal })
      .then((data) => setState({ status: "ready", students: data.students, unnamedSheets: data.unnamedSheets }))
      .catch((error) => !signal?.aborted && setState({ status: "error", students: [], unnamedSheets: 0, error }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return state.students.filter((student) => !needle || student.name.toLowerCase().includes(needle)).sort(sorters[sort]);
  }, [state.students, search, sort]);

  const toggle = (key) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const exportCsv = () => {
    const blob = new Blob([toCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student-marks-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading students">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="skeleton" style={{ height: 48, marginBottom: 8 }} />
        ))}
      </div>
    );
  }
  if (state.status === "error") return <ErrorState message={state.error.message} onRetry={() => load()} />;

  if (state.students.length === 0) {
    return (
      <div className="empty card">
        <LuUsers size={36} color="var(--accent)" aria-hidden="true" />
        <h2>No students yet</h2>
        <p>
          Add the student&apos;s name when you grade a sheet, and their marks will collect here, sheet by sheet.
          {state.unnamedSheets > 0 && ` ${pluralize(state.unnamedSheets, "graded sheet")} had no name.`}
        </p>
        <Link to="/evaluate" className="btn btn-primary">
          Grade a sheet
        </Link>
      </div>
    );
  }

  return (
    <div className="students">
      <div className="list-tools">
        <label className="search">
          <LuSearch aria-hidden="true" />
          <span className="sr-only">Search students</span>
          <input className="input" type="search" placeholder="Search students" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="sort-select">
          <span className="muted small">Sort</span>
          <select className="input select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-sm" onClick={exportCsv} disabled={visible.length === 0}>
          <LuDownload aria-hidden="true" /> Export CSV
        </button>
      </div>

      <div className="table-wrap card">
        <table className="students-table">
          <thead>
            <tr>
              <th scope="col">Student</th>
              <th scope="col" className="num">
                Sheets
              </th>
              <th scope="col" className="num">
                Average
              </th>
              <th scope="col" className="num hide-sm">
                Best
              </th>
              <th scope="col" className="num hide-sm">
                Latest
              </th>
              <th scope="col" className="hide-sm">
                Trend
              </th>
              <th scope="col">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((student) => {
              const expanded = open.has(student.key);
              const band = scoreBand(student.averagePercentage);
              return (
                <Fragment key={student.key}>
                  <tr className={expanded ? "is-open" : undefined}>
                    <th scope="row">
                      <button type="button" className="student-name" onClick={() => toggle(student.key)} aria-expanded={expanded}>
                        {student.name}
                      </button>
                      <span className="student-sub muted">Last graded {formatDate(student.latestAt)}</span>
                    </th>
                    <td className="num tabular">{student.sheets}</td>
                    <td className="num tabular">
                      <span className={`tone-${band.tone}`}>{formatPercent(student.averagePercentage)}</span>
                    </td>
                    <td className="num tabular hide-sm">{formatPercent(student.bestPercentage)}</td>
                    <td className="num tabular hide-sm">{formatPercent(student.latestPercentage)}</td>
                    <td className="hide-sm">
                      <Sparkline values={[...student.evaluations].reverse().slice(-12).map((sheet) => sheet.percentage)} />
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon expand-toggle"
                        onClick={() => toggle(student.key)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Hide" : "Show"} ${student.name}'s sheets`}
                      >
                        <LuChevronDown aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="student-sheets">
                      <td colSpan={7}>
                        <ul>
                          {student.evaluations.map((sheet) => (
                            <li key={sheet.id}>
                              <Link to={`/evaluations/${sheet.id}`} className="sheet-link">
                                {sheet.title}
                              </Link>
                              <span className="muted">{formatDate(sheet.date)}</span>
                              {sheet.assignmentId && (
                                <Link to={`/assignments/${sheet.assignmentId}`} className="sheet-paper">
                                  <LuFileText aria-hidden="true" /> Paper
                                </Link>
                              )}
                              <span className="tabular student-sheet-score">
                                {formatMarks(sheet.awarded)} / {formatMarks(sheet.max)}
                                <span className={`tone-${scoreBand(sheet.percentage).tone}`}> {formatPercent(sheet.percentage)}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="history-none">No students match “{search}”.</p>}
      </div>
      {state.unnamedSheets > 0 && (
        <p className="muted small students-note">
          {pluralize(state.unnamedSheets, "graded sheet")} had no student name, so {state.unnamedSheets === 1 ? "it isn't" : "they aren't"} listed here.
        </p>
      )}
    </div>
  );
}
