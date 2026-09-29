import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { LuArrowRight, LuBuilding2, LuCalendar, LuFileText, LuMail, LuPencil, LuSquarePen } from "react-icons/lu";
import { api } from "../../lib/api";
import { useAuth } from "../../context/contexts";
import { formatDate, formatMarks, formatPercent, formatRelative, initials, pluralize } from "../../lib/format";
import { useDocumentTitle } from "../../lib/hooks";
import { ErrorState } from "../../components/Feedback";
import ActivityTimeline from "./ActivityTimeline";
import StudentsTab from "./StudentsTab";
import AccountTab from "./AccountTab";
import "../assignments/assignments.css";
import "./profile.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "students", label: "Students & marks", short: "Students" },
  { id: "history", label: "History" },
  { id: "account", label: "Account" },
];

function StatTiles({ stats }) {
  const { evaluations, assignments } = stats;
  const tiles = [
    { label: "Sheets graded", value: evaluations.completed, note: evaluations.thisMonth ? `${evaluations.thisMonth} this month` : null },
    { label: "Students", value: evaluations.students },
    {
      label: "Average score",
      value: evaluations.averagePercentage === null ? "–" : formatPercent(evaluations.averagePercentage),
      note: evaluations.completed ? `across ${pluralize(evaluations.completed, "sheet")}` : null,
    },
    { label: "Question papers", value: assignments.total, note: assignments.questionsGenerated ? `${assignments.questionsGenerated} questions written` : null },
    { label: "Marks you adjusted", value: stats.marksAdjusted },
    { label: "Slide decks", value: stats.slidesGenerated },
  ];
  return (
    <dl className="stat-tiles">
      {tiles.map((tile) => (
        <div key={tile.label} className="stat-tile">
          <dt>{tile.label}</dt>
          <dd className="stat-tile-value">{tile.value}</dd>
          {tile.note && <dd className="stat-tile-note">{tile.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

function RecentList({ title, path, empty, render, to }) {
  const [state, setState] = useState({ status: "loading", items: [] });
  useEffect(() => {
    const controller = new AbortController();
    api
      .get(path, { signal: controller.signal })
      .then((data) => setState({ status: "ready", items: data.items }))
      .catch(() => !controller.signal.aborted && setState({ status: "error", items: [] }));
    return () => controller.abort();
  }, [path]);

  return (
    <section className="card card-pad recent-card">
      <div className="recent-head">
        <h3>{title}</h3>
        <Link to={to} className="link-arrow">
          See all <LuArrowRight aria-hidden="true" />
        </Link>
      </div>
      {state.status === "loading" && <div className="skeleton" style={{ height: 72 }} />}
      {state.status === "error" && <p className="muted small">Couldn&apos;t load this list.</p>}
      {state.status === "ready" && state.items.length === 0 && <p className="muted small">{empty}</p>}
      {state.items.length > 0 && <ul className="recent-list">{state.items.map(render)}</ul>}
    </section>
  );
}

function Overview() {
  return (
    <div className="overview-grid">
      <section className="card card-pad">
        <div className="recent-head">
          <h3>Recent activity</h3>
        </div>
        <ActivityTimeline compact limit={8} />
      </section>
      <div className="overview-side">
        <RecentList
          title="Latest question papers"
          path="/api/assignments?limit=4"
          to="/assignments"
          empty="No papers yet."
          render={(item) => (
            <li key={item.id}>
              <Link to={`/assignments/${item.id}`}>
                <LuFileText aria-hidden="true" />
                <span className="recent-title">{item.title}</span>
                <span className="muted small">{formatRelative(item.createdAt)}</span>
              </Link>
            </li>
          )}
        />
        <RecentList
          title="Latest graded sheets"
          path="/api/evaluations?limit=4"
          to="/evaluations"
          empty="No sheets graded yet."
          render={(item) => (
            <li key={item.id}>
              <Link to={`/evaluations/${item.id}`}>
                <LuSquarePen aria-hidden="true" />
                <span className="recent-title">
                  {item.studentName || item.title}
                  {item.studentName && <span className="muted"> · {item.title}</span>}
                </span>
                <span className="tabular small">
                  {item.score ? `${formatMarks(item.score.awarded)}/${formatMarks(item.score.max)}` : item.status === "failed" ? "Failed" : "…"}
                </span>
              </Link>
            </li>
          )}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  useDocumentTitle("Your profile");
  const { updateUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "overview";
  const [state, setState] = useState({ status: "loading", user: null, stats: null });
  const tabRefs = useRef({});

  const load = useCallback((signal) => {
    api
      .get("/api/profile", { signal })
      .then((data) => setState({ status: "ready", user: data.user, stats: data.stats }))
      .catch((error) => !signal?.aborted && setState({ status: "error", user: null, stats: null, error }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selectTab = (id) => setParams(id === "overview" ? {} : { tab: id }, { replace: true });

  useEffect(() => {
    const active = tabRefs.current[tab];
    const strip = active?.parentElement;
    if (strip && strip.scrollWidth > strip.clientWidth) {
      const offset = active.getBoundingClientRect().left - strip.getBoundingClientRect().left;
      strip.scrollLeft += offset - (strip.clientWidth - active.offsetWidth) / 2;
    }
  }, [tab]);

  const onTabKey = (event) => {
    const index = TABS.findIndex((t) => t.id === tab);
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length];
    selectTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  if (state.status === "loading") {
    return (
      <div className="container page" aria-busy="true">
        <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 90, marginTop: 20, borderRadius: 16 }} />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="container page">
        <ErrorState message={state.error.message} onRetry={() => load()} />
      </div>
    );
  }

  const { user, stats } = state;
  const onUserChange = (next) => {
    setState((current) => ({ ...current, user: next }));
    updateUser(next);
  };

  return (
    <div className="container page profile-page">
      <header className="profile-hero card">
        <div className="profile-avatar" aria-hidden="true">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials(user.name)}
        </div>
        <div className="profile-id">
          <p className="eyebrow">Your profile</p>
          <h1>{user.name}</h1>
          {(user.designation || user.institution) && (
            <p className="profile-role">
              {user.designation}
              {user.designation && user.institution && <span aria-hidden="true"> · </span>}
              {user.institution}
            </p>
          )}
          <ul className="profile-facts">
            <li>
              <LuMail aria-hidden="true" /> {user.email}
            </li>
            {user.institution && (
              <li>
                <LuBuilding2 aria-hidden="true" /> {user.institution}
              </li>
            )}
            <li>
              <LuCalendar aria-hidden="true" /> Member since {formatDate(user.createdAt)}
            </li>
            {user.signInMethods?.google && (
              <li>
                <FcGoogle aria-hidden="true" /> Google connected
              </li>
            )}
          </ul>
          {user.subjects?.length > 0 && (
            <ul className="profile-subjects" aria-label="Subjects">
              {user.subjects.map((subject) => (
                <li key={subject} className="chip">
                  {subject}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn profile-edit" onClick={() => selectTab("account")}>
          <LuPencil aria-hidden="true" /> Edit profile
        </button>
      </header>

      <StatTiles stats={stats} />

      <div className="tabs" role="tablist" aria-label="Profile sections" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => (tabRefs.current[t.id] = el)}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="tab"
            onClick={() => selectTab(t.id)}
          >
            {t.short ? (
              <>
                <span className="tab-label-long">{t.label}</span>
                <span className="tab-label-short">{t.short}</span>
              </>
            ) : (
              t.label
            )}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && <Overview />}
        {tab === "students" && <StudentsTab />}
        {tab === "history" && (
          <section className="card card-pad">
            <ActivityTimeline />
          </section>
        )}
        {tab === "account" && <AccountTab user={user} onUserChange={onUserChange} />}
      </div>
    </div>
  );
}
