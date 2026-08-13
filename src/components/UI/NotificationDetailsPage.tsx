import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  CheckCircleOutlined,
  FireOutlined,
  HistoryOutlined,
  BellOutlined,
  RightOutlined,
  StarOutlined,
  StarFilled,
  EyeOutlined,
  EyeInvisibleOutlined,
  UserOutlined,
  InfoCircleOutlined,
  DownOutlined,
  UpOutlined,
  CheckOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./NotificationDetailsPage.css";

type NotificationDetailItem = { label: string; value: string };

type NotificationEvent = {
  id: string;
  date: string;
  title: string;
  time: string;
  description: string;
  category: string;
  triggeredBy: string;
  priority: "high" | "medium" | "low";
  tags: string[];
  isActionable: boolean;
  extraDetails: NotificationDetailItem[];
};

type NotificationMeta = {
  read: boolean;
  pinned: boolean;
  viewedAt: string | null;
  decision: "approved" | "declined" | null;
};

type SidebarFilter = "today" | "week" | "month";

const META_KEY = "axsNotificationMeta";

const DEFAULT_META: NotificationMeta = {
  read: false,
  pinned: false,
  viewedAt: null,
  decision: null,
};

const getSavedEvents = () => {
  try {
    const saved = localStorage.getItem("calendarEvents");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const getAllMeta = (): Record<string, NotificationMeta> => {
  try {
    const saved = localStorage.getItem(META_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveMeta = (id: string, partial: Partial<NotificationMeta>): NotificationMeta => {
  const all = getAllMeta();
  const current = all[id] || DEFAULT_META;
  const next = { ...current, ...partial };
  all[id] = next;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable, silently ignore
  }
  return next;
};

const KNOWN_KEYS = new Set([
  "id",
  "title",
  "name",
  "event",
  "time",
  "startTime",
  "description",
  "note",
  "category",
  "type",
  "eventType",
  "triggeredBy",
  "createdBy",
  "organizer",
  "owner",
  "priority",
  "tags",
  "requiresApproval",
]);

const humanizeKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(stringifyValue).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const derivePriority = (rawPriority: unknown, daysDiff: number): "high" | "medium" | "low" => {
  if (rawPriority === "high" || rawPriority === "medium" || rawPriority === "low") {
    return rawPriority;
  }
  const distance = Math.abs(daysDiff);
  if (distance <= 1) return "high";
  if (distance <= 4) return "medium";
  return "low";
};

const APPROVAL_HINTS = ["approval", "review", "registration", "request", "pending"];

const normalizeEvent = (raw: any, date: string, index: number): NotificationEvent => {
  const isObject = raw && typeof raw === "object";

  const title = isObject ? raw.title || raw.name || raw.event || "Untitled Event" : raw || "Untitled Event";
  const time = isObject ? raw.time || raw.startTime || "" : "";
  const description = isObject ? raw.description || raw.note || "" : "";
  const category = isObject ? raw.category || raw.type || raw.eventType || "General" : "General";
  const triggeredBy = isObject
    ? raw.triggeredBy || raw.createdBy || raw.organizer || raw.owner || "AXS System"
    : "AXS System";
  const tags: string[] =
    isObject && Array.isArray(raw.tags) ? raw.tags.filter((t: unknown) => typeof t === "string") : [];

  const daysDiff = dayjs(date).diff(dayjs(), "day");
  const priority = derivePriority(isObject ? raw.priority : undefined, daysDiff);

  const searchable = `${category} ${title}`.toLowerCase();
  const isActionable =
    isObject && (raw.requiresApproval === true || APPROVAL_HINTS.some((hint) => searchable.includes(hint)));

  const extraDetails: NotificationDetailItem[] = isObject
    ? Object.entries(raw)
        .filter(([key]) => !KNOWN_KEYS.has(key))
        .map(([key, value]) => ({ label: humanizeKey(key), value: stringifyValue(value) }))
    : [];

  return {
    id: (isObject && raw.id) || `${date}-${index}`,
    date,
    title,
    time,
    description,
    category,
    triggeredBy,
    priority,
    tags,
    isActionable,
    extraDetails,
  };
};

const flattenEvents = (events: Record<string, any>): NotificationEvent[] => {
  return Object.entries(events).flatMap(([date, dayEvents]) => {
    if (!Array.isArray(dayEvents)) return [];
    return dayEvents.map((event, index) => normalizeEvent(event, date, index));
  });
};

const getStatus = (date: string) => {
  const target = dayjs(date);
  const today = dayjs();
  if (target.isSame(today, "day")) return "today";
  if (target.isBefore(today, "day")) return "past";
  return "upcoming";
};

const SIDEBAR_FILTER_LABELS: Record<SidebarFilter, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

function NotificationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState<NotificationEvent[]>([]);
  const [meta, setMeta] = useState<NotificationMeta>(DEFAULT_META);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("month");

  useEffect(() => {
    setAllEvents(flattenEvents(getSavedEvents()));
  }, []);

  const event = useMemo(
    () => allEvents.find((item) => item.id === id) || null,
    [allEvents, id]
  );

  // Load meta for this notification, and auto mark-as-read on first view
  useEffect(() => {
    if (!event) return;
    const all = getAllMeta();
    const existing = all[event.id];
    if (existing?.read) {
      setMeta(existing);
    } else {
      const updated = saveMeta(event.id, {
        read: true,
        viewedAt: dayjs().format("DD MMM YYYY, hh:mm A"),
      });
      setMeta(updated);
    }
  }, [event?.id]);

  // Other notifications for the sidebar — filtered by Today / This Week / This Month,
  // includes both past and upcoming notifications within the selected range.
  const otherEvents = useMemo(() => {
    const today = dayjs();
    let rangeStart = today.startOf("month");
    let rangeEnd = today.endOf("month");

    if (sidebarFilter === "today") {
      rangeStart = today.startOf("day");
      rangeEnd = today.endOf("day");
    } else if (sidebarFilter === "week") {
      rangeStart = today.startOf("week");
      rangeEnd = today.endOf("week");
    } else {
      rangeStart = today.startOf("month");
      rangeEnd = today.endOf("month");
    }

    return allEvents
      .filter((item) => item.id !== id)
      .filter((item) => {
        const d = dayjs(item.date);
        return !d.isBefore(rangeStart, "day") && !d.isAfter(rangeEnd, "day");
      })
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [allEvents, id, sidebarFilter]);

  const status = event ? getStatus(event.date) : "upcoming";
  const daysDiff = event ? dayjs(event.date).diff(dayjs(), "day") : 0;
  const ringPercent = event ? Math.max(0, Math.min(1, 1 - Math.abs(daysDiff) / 14)) : 0;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - ringPercent);

  const summaryText = useMemo(() => {
    if (!event) return "";
    if (status === "today") {
      return `${event.title} is happening today${event.time ? ` at ${event.time}` : ""}. This one's live — worth a final check before it kicks off.`;
    }
    if (status === "upcoming") {
      const urgency =
        event.priority === "high"
          ? "It's marked high priority, so don't let this one slip."
          : "Nothing urgent yet, but it's on the radar.";
      return `${event.title} is scheduled for ${dayjs(event.date).format("DD MMM YYYY")}, ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? "" : "s"} from now. ${urgency}`;
    }
    return `${event.title} took place on ${dayjs(event.date).format("DD MMM YYYY")}, ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? "" : "s"} ago. This notification is now archived for reference.`;
  }, [event, status, daysDiff]);

  const displayTags = useMemo(() => {
    if (!event) return [];
    const derived = [event.category, `${event.priority} priority`];
    const combined = [...derived, ...event.tags];
    return Array.from(new Set(combined.map((t) => t.trim()).filter(Boolean)));
  }, [event]);

  const detailsList = useMemo<NotificationDetailItem[]>(() => {
    if (!event) return [];
    const base: NotificationDetailItem[] = [
      { label: "Event Title", value: event.title },
      { label: "Date", value: dayjs(event.date).format("DD MMMM YYYY") },
      { label: "Time", value: event.time || "Not specified" },
      { label: "Category", value: event.category },
      { label: "Priority", value: event.priority.charAt(0).toUpperCase() + event.priority.slice(1) },
      { label: "Triggered By", value: event.triggeredBy },
      {
        label: "Timing Status",
        value:
          status === "today"
            ? "Happening today"
            : status === "upcoming"
            ? `In ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? "" : "s"}`
            : `${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? "" : "s"} ago`,
      },
      { label: "Read Status", value: meta.read ? "Read" : "Unread" },
    ];
    return [...base, ...event.extraDetails];
  }, [event, status, daysDiff, meta.read]);

  const toggleRead = () => {
    if (!event) return;
    const updated = saveMeta(event.id, {
      read: !meta.read,
      viewedAt: !meta.read ? dayjs().format("DD MMM YYYY, hh:mm A") : meta.viewedAt,
    });
    setMeta(updated);
  };

  const togglePin = () => {
    if (!event) return;
    const updated = saveMeta(event.id, { pinned: !meta.pinned });
    setMeta(updated);
  };

  const handleDecision = (decision: "approved" | "declined") => {
    if (!event) return;
    const updated = saveMeta(event.id, { decision });
    setMeta(updated);
  };

  const handleDelete = () => {
    if (!event) return;
    const stored = getSavedEvents();
    const dayEvents = stored[event.date];
    if (Array.isArray(dayEvents)) {
      const filtered = dayEvents.filter((raw: any, index: number) => {
        const normalized = normalizeEvent(raw, event.date, index);
        return normalized.id !== event.id;
      });
      if (filtered.length > 0) {
        stored[event.date] = filtered;
      } else {
        delete stored[event.date];
      }
      localStorage.setItem("calendarEvents", JSON.stringify(stored));
    }
    navigate(-1);
  };

  const handleShare = async () => {
    if (!event) return;
    const text = `${event.title} — ${dayjs(event.date).format("dddd, DD MMMM YYYY")}${
      event.time ? ` at ${event.time}` : ""
    }${event.description ? `\n${event.description}` : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      // clipboard unavailable, silently ignore
    }
  };

  if (!event) {
    return (
      <div className="notif-detail-page">
        <div className="notif-detail-empty">
          <BellOutlined />
          <h3>Notification not found</h3>
          <p>This notification may have been removed or the link is invalid.</p>
          <button type="button" onClick={() => navigate(-1)} className="notif-detail-back-btn">
            <ArrowLeftOutlined /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notif-detail-page">
      <button type="button" className="notif-detail-back" onClick={() => navigate(-1)}>
        <ArrowLeftOutlined /> Back
      </button>

      <div className="notif-detail-layout">
        <div className="notif-detail-main">
          <div className={`notif-detail-hero notif-status-${status}`}>
            <div className="notif-hero-glow" />

            <div className="notif-hero-utility">
              <button
                type="button"
                className={`notif-util-btn ${meta.pinned ? "is-active" : ""}`}
                onClick={togglePin}
                title={meta.pinned ? "Unpin notification" : "Pin notification"}
              >
                {meta.pinned ? <StarFilled /> : <StarOutlined />}
              </button>
              <button
                type="button"
                className={`notif-util-btn ${meta.read ? "is-active" : ""}`}
                onClick={toggleRead}
                title={meta.read ? "Mark as unread" : "Mark as read"}
              >
                {meta.read ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              </button>
            </div>

            <div className="notif-hero-top">
              <div className="notif-badge-row">
                <span className={`notif-status-badge notif-status-${status}`}>
                  {status === "today" && (
                    <>
                      <FireOutlined /> Today
                    </>
                  )}
                  {status === "upcoming" && (
                    <>
                      <CheckCircleOutlined /> Upcoming
                    </>
                  )}
                  {status === "past" && (
                    <>
                      <HistoryOutlined /> Past
                    </>
                  )}
                </span>
                <span className="notif-category-badge">{event.category}</span>
                <span className={`notif-priority-badge notif-priority-${event.priority}`}>
                  <ThunderboltOutlined /> {event.priority}
                </span>
                <span className={`notif-read-badge ${meta.read ? "is-read" : "is-unread"}`}>
                  {meta.read ? "Read" : "Unread"}
                </span>
              </div>

              <div className="notif-ring-wrap">
                <svg viewBox="0 0 120 120" className="notif-ring">
                  <circle cx="60" cy="60" r="54" className="notif-ring-track" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    className="notif-ring-progress"
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: dashOffset,
                    }}
                  />
                </svg>
                <div className="notif-ring-label">
                  <strong>{Math.abs(daysDiff)}</strong>
                  <span>{daysDiff === 0 ? "today" : daysDiff > 0 ? "days left" : "days ago"}</span>
                </div>
              </div>
            </div>

            <h1 className="notif-hero-title">{event.title}</h1>

            <div className="notif-hero-meta">
              <span>
                <CalendarOutlined /> {dayjs(event.date).format("dddd, DD MMMM YYYY")}
              </span>
              {event.time && (
                <span>
                  <ClockCircleOutlined /> {event.time}
                </span>
              )}
              <span>
                <UserOutlined /> {event.triggeredBy}
              </span>
            </div>

            {displayTags.length > 0 && (
              <div className="notif-tags-row">
                <TagsOutlined className="notif-tags-icon" />
                {displayTags.map((tag) => (
                  <span key={tag} className="notif-tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="notif-quickinfo-grid">
            <div className="notif-quickinfo-card">
              <span className="notif-quickinfo-label">
                <UserOutlined /> Triggered By
              </span>
              <strong className="notif-quickinfo-value">{event.triggeredBy}</strong>
            </div>
            <div className="notif-quickinfo-card">
              <span className="notif-quickinfo-label">
                <CalendarOutlined /> Scheduled On
              </span>
              <strong className="notif-quickinfo-value">{dayjs(event.date).format("DD MMM YYYY")}</strong>
            </div>
            <div className="notif-quickinfo-card">
              <span className="notif-quickinfo-label">
                {meta.read ? <EyeOutlined /> : <EyeInvisibleOutlined />} Notification Status
              </span>
              <strong className="notif-quickinfo-value">
                <span className={`notif-quickinfo-dot ${meta.read ? "is-read" : "is-unread"}`} />
                {meta.read ? "Already Read" : "Unread"}
              </strong>
              {meta.viewedAt && <small className="notif-quickinfo-sub">Viewed {meta.viewedAt}</small>}
            </div>
          </div>

          <div className="notif-summary-panel">
            <span className="notif-summary-icon">
              <InfoCircleOutlined />
            </span>
            <div>
              <h4>Notification Summary</h4>
              <p>{summaryText}</p>
            </div>
          </div>

          <div className="notif-detail-card">
            <h3>
              <FileTextOutlined /> Description
            </h3>
            <p className="notif-detail-description">
              {event.description || "No additional description was provided for this notification."}
            </p>
          </div>

          {event.isActionable && (
            <div className={`notif-decision-card ${meta.decision ? `is-${meta.decision}` : ""}`}>
              {meta.decision ? (
                <div className="notif-decision-result">
                  {meta.decision === "approved" ? <CheckCircleOutlined /> : <CloseOutlined />}
                  <span>
                    This request was <strong>{meta.decision === "approved" ? "approved" : "declined"}</strong>.
                  </span>
                  <button type="button" className="notif-decision-undo" onClick={() => handleDecision(null as any)}>
                    Undo
                  </button>
                </div>
              ) : (
                <>
                  <div className="notif-decision-copy">
                    <strong>Action required</strong>
                    <span>This notification is awaiting your decision.</span>
                  </div>
                  <div className="notif-decision-actions">
                    <button
                      type="button"
                      className="notif-decision-btn notif-decision-approve"
                      onClick={() => handleDecision("approved")}
                    >
                      <CheckOutlined /> Approve
                    </button>
                    <button
                      type="button"
                      className="notif-decision-btn notif-decision-decline"
                      onClick={() => handleDecision("declined")}
                    >
                      <CloseOutlined /> Decline
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="notif-details-section">
            <button type="button" className="notif-details-header" onClick={() => setDetailsOpen((v) => !v)}>
              <div>
                <h3>Details</h3>
                <p>Additional information related to this notification.</p>
              </div>
              <div className="notif-details-header-right">
                <span className="notif-details-count">{detailsList.length} items</span>
                {detailsOpen ? <UpOutlined /> : <DownOutlined />}
              </div>
            </button>

            {detailsOpen && (
              <div className="notif-details-grid">
                {detailsList.map((item) => (
                  <div key={item.label} className="notif-details-field">
                    <span className="notif-details-field-label">{item.label}</span>
                    <span className="notif-details-field-value">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="notif-timeline-card">
            <h3>Activity Timeline</h3>
            <div className="notif-timeline">
              <div className="notif-timeline-step is-complete">
                <span className="notif-timeline-dot" />
                <div>
                  <strong>Event Scheduled</strong>
                  <span>
                    {dayjs(event.date).format("DD MMM YYYY")}
                    {event.time ? ` · ${event.time}` : ""}
                  </span>
                </div>
              </div>
              <div className={`notif-timeline-step ${meta.read ? "is-complete" : ""}`}>
                <span className="notif-timeline-dot" />
                <div>
                  <strong>Notification Viewed</strong>
                  <span>{meta.read ? meta.viewedAt : "Not yet viewed"}</span>
                </div>
              </div>
              {event.isActionable && (
                <div className={`notif-timeline-step ${meta.decision ? "is-complete" : ""}`}>
                  <span className="notif-timeline-dot" />
                  <div>
                    <strong>Decision Recorded</strong>
                    <span>
                      {meta.decision
                        ? `Marked as ${meta.decision}`
                        : "Awaiting approval or decline"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="notif-detail-actions">
            <button type="button" className="notif-action-btn notif-action-share" onClick={handleShare}>
              <ShareAltOutlined /> {copyState === "copied" ? "Copied!" : "Copy Details"}
            </button>
            <button type="button" className="notif-action-btn notif-action-toggle" onClick={toggleRead}>
              {meta.read ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              {meta.read ? "Mark as Unread" : "Mark as Read"}
            </button>
            <button type="button" className="notif-action-btn notif-action-pin" onClick={togglePin}>
              {meta.pinned ? <StarFilled /> : <StarOutlined />}
              {meta.pinned ? "Unpin" : "Pin Notification"}
            </button>
            <button type="button" className="notif-action-btn notif-action-delete" onClick={handleDelete}>
              <DeleteOutlined /> Delete Notification
            </button>
          </div>
        </div>

        <aside className="notif-detail-sidebar">
          <div className="notif-sidebar-header">
            <h4>Other Notifications</h4>
            <span className="notif-sidebar-count">{otherEvents.length}</span>
          </div>

          <div className="notif-sidebar-filters">
            {(Object.keys(SIDEBAR_FILTER_LABELS) as SidebarFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`notif-sidebar-filter-btn ${sidebarFilter === key ? "is-active" : ""}`}
                onClick={() => setSidebarFilter(key)}
              >
                {SIDEBAR_FILTER_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="notif-sidebar-list-wrap">
            {otherEvents.length > 0 ? (
              <div className="notif-sidebar-list">
                {otherEvents.map((item) => {
                  const itemStatus = getStatus(item.date);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className="notif-sidebar-item"
                      onClick={() => navigate(`/notification/${item.id}`)}
                    >
                      <div className={`notif-sidebar-date notif-sidebar-date-${itemStatus}`}>
                        <strong>{dayjs(item.date).format("DD")}</strong>
                        <span>{dayjs(item.date).format("MMM")}</span>
                      </div>

                      <div className="notif-sidebar-text">
                        <strong>{item.title}</strong>
                        <small>
                          {dayjs(item.date).format("ddd, DD MMM")}
                          {item.time ? ` · ${item.time}` : ""}
                        </small>
                      </div>

                      <RightOutlined className="notif-sidebar-arrow" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="notif-sidebar-empty">
                No notifications {sidebarFilter === "today" ? "today" : sidebarFilter === "week" ? "this week" : "this month"}.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default NotificationDetailsPage;