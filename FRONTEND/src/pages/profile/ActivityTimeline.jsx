import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuChevronRight } from "react-icons/lu";
import { api } from "../../lib/api";
import { ACTIVITY_CATEGORIES, dayLabel, describeActivity } from "../../lib/activity";
import { ErrorState } from "../../components/Feedback";

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function ActivityItem({ item }) {
  const { icon: Icon, text, detail, tone, link } = describeActivity(item);
  const body = (
    <>
      <span className="activity-icon" data-tone={tone} aria-hidden="true">
        <Icon />
      </span>
      <span className="activity-text">
        <span>{text}</span>
        {detail && <span className="activity-detail">{detail}</span>}
      </span>
      <time className="activity-time" dateTime={item.createdAt}>
        {timeFormatter.format(new Date(item.createdAt))}
      </time>
      {link && <LuChevronRight className="activity-chevron" aria-hidden="true" />}
    </>
  );
  return (
    <li className="activity-item">
      {link ? (
        <Link to={link} className="activity-row">
          {body}
        </Link>
      ) : (
        <div className="activity-row">{body}</div>
      )}
    </li>
  );
}

export default function ActivityTimeline({ compact = false, limit = 20 }) {
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const load = useCallback(
    (nextPage, signal) =>
      api
        .get(`/api/profile/activity?page=${nextPage}&limit=${limit}&category=${category}`, { signal })
        .then((data) => {
          setItems((current) => (nextPage === 1 ? data.items : [...current, ...data.items]));
          setPage(data.page);
          setTotalPages(data.totalPages);
          setStatus("ready");
        })
        .catch((err) => {
          if (signal?.aborted) return;
          setError(err);
          setStatus("error");
        }),
    [category, limit]
  );

  const reload = (nextPage) => {
    setStatus(nextPage === 1 ? "loading" : "more");
    load(nextPage);
  };

  useEffect(() => {
    const controller = new AbortController();
    load(1, controller.signal);
    return () => controller.abort();
  }, [load]);

  const groups = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt);
    if (groups.length === 0 || groups[groups.length - 1].label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push(item);
  }

  return (
    <div className="activity">
      {!compact && (
        <div className="segmented activity-filters" role="group" aria-label="Filter history">
          {ACTIVITY_CATEGORIES.map((option) => (
            <button key={option.value} type="button" aria-pressed={category === option.value} onClick={() => {
                setCategory(option.value);
                setStatus("loading");
              }}>
              {option.label}
            </button>
          ))}
        </div>
      )}

      {status === "loading" && (
        <div aria-busy="true" aria-label="Loading history">
          {[0, 1, 2].map((key) => (
            <div key={key} className="skeleton" style={{ height: 44, marginBottom: 8 }} />
          ))}
        </div>
      )}

      {status === "error" && <ErrorState message={error?.message} onRetry={() => reload(1)} />}

      {status !== "loading" && status !== "error" && items.length === 0 && (
        <p className="history-none">
          {category === "all" ? "Nothing here yet. Your papers, graded sheets and changes will appear here." : "No activity of this kind yet."}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.label} className="activity-group" aria-label={group.label}>
          <h3 className="activity-day">{group.label}</h3>
          <ol className="activity-list">
            {group.items.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </ol>
        </section>
      ))}

      {!compact && page < totalPages && (
        <div className="history-more">
          <button type="button" className="btn" onClick={() => reload(page + 1)} data-loading={status === "more" || undefined}>
            Show older activity
          </button>
        </div>
      )}
    </div>
  );
}
