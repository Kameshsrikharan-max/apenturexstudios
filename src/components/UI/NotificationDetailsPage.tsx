import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {ArrowLeftOutlined,CalendarOutlined,ClockCircleOutlined,FileTextOutlined,DeleteOutlined,
  ShareAltOutlined,CheckCircleOutlined,FireOutlined,HistoryOutlined,BellOutlined,
  StarOutlined,StarFilled,EyeOutlined,EyeInvisibleOutlined,UserOutlined,InfoCircleOutlined,
  DownOutlined,UpOutlined,CheckOutlined,CloseOutlined,ThunderboltOutlined,TagsOutlined,
  LoadingOutlined,} from "@ant-design/icons";
import dayjs from "dayjs";
import {NotificationDetailItem,NotificationMeta,NotificationEvent,NotificationMetaMap,} from "../../redux/types/notificationDetailTypes";
import { DEFAULT_META } from "../../redux/api/notificationDetailApi";
import {fetchNotificationDataRequest,updateNotificationMetaRequest,deleteNotificationRequest,} from "../../redux/actions/notificationDetailActions";
import "./NotificationDetailsPage.css";

interface RootState {
  notificationDetail: {
    events: NotificationEvent[];
    metaMap: NotificationMetaMap;
    loading: boolean;
    saving: boolean;
    deleting: boolean;
    error: string | null;
  };
}

const getStatus = (date: string) => {
  const target = dayjs(date);
  const today = dayjs();
  if (target.isSame(today, "day")) return "today";
  if (target.isBefore(today, "day")) return "past";
  return "upcoming";
};

function NotificationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { events: allEvents, metaMap, loading, error } = useSelector(
    (state: RootState) => state.notificationDetail
  );

  const [detailsOpen, setDetailsOpen] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    dispatch(fetchNotificationDataRequest() as any);
  }, [dispatch]);

  const event = useMemo(
    () => allEvents.find((item) => item.id === id) || null,
    [allEvents, id]
  );

  const meta: NotificationMeta = event ? metaMap[event.id] || DEFAULT_META : DEFAULT_META;

  
  useEffect(() => {
    if (!event) return;
    if (!meta.read) {
      dispatch(
        updateNotificationMetaRequest(event.id, {
          read: true,
          viewedAt: dayjs().format("DD MMM YYYY, hh:mm A"),
        }) as any
      );
    }
  
  }, [event?.id]);

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
    dispatch(
      updateNotificationMetaRequest(event.id, {
        read: !meta.read,
        viewedAt: !meta.read ? dayjs().format("DD MMM YYYY, hh:mm A") : meta.viewedAt,
      }) as any
    );
  };

  const togglePin = () => {
    if (!event) return;
    dispatch(updateNotificationMetaRequest(event.id, { pinned: !meta.pinned }) as any);
  };

  const handleDecision = (decision: "approved" | "declined" | null) => {
    if (!event) return;
    dispatch(updateNotificationMetaRequest(event.id, { decision }) as any);
  };

  const handleDelete = () => {
    if (!event) return;
    dispatch(deleteNotificationRequest(event.id, event.date) as any);
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
      
    }
  };

  if (loading) {
    return (
      <div className="notif-detail-page">
        <div className="notif-detail-empty">
          <LoadingOutlined spin />
          <h3>Loading notification…</h3>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="notif-detail-page">
        <div className="notif-detail-empty">
          <BellOutlined />
          <h3>Notification not found</h3>
          <p>
            {error || "This notification may have been removed or the link is invalid."}
          </p>
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
                  {status === "today" && (<><FireOutlined /> Today</>)}
                  {status === "upcoming" && (<><CheckCircleOutlined /> Upcoming</>)}
                  {status === "past" && (<><HistoryOutlined /> Past</>)}
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
              <span><CalendarOutlined /> {dayjs(event.date).format("dddd, DD MMMM YYYY")}</span>
              {event.time && (<span><ClockCircleOutlined /> {event.time}</span>)}
              <span><UserOutlined /> {event.triggeredBy}</span>
            </div>

            {displayTags.length > 0 && (
              <div className="notif-tags-row">
                <TagsOutlined className="notif-tags-icon" />
                {displayTags.map((tag) => (
                  <span key={tag} className="notif-tag-chip">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="notif-quickinfo-grid">
            <div className="notif-quickinfo-card">
              <span className="notif-quickinfo-label"><UserOutlined /> Triggered By</span>
              <strong className="notif-quickinfo-value">{event.triggeredBy}</strong>
            </div>
            <div className="notif-quickinfo-card">
              <span className="notif-quickinfo-label"><CalendarOutlined /> Scheduled On</span>
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
            <span className="notif-summary-icon"><InfoCircleOutlined /></span>
            <div>
              <h4>Notification Summary</h4>
              <p>{summaryText}</p>
            </div>
          </div>

          <div className="notif-detail-card">
            <h3><FileTextOutlined /> Description</h3>
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
                  <button type="button" className="notif-decision-undo" onClick={() => handleDecision(null)}>
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
                      {meta.decision ? `Marked as ${meta.decision}` : "Awaiting approval or decline"}
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
      </div>
    </div>
  );
}

export default NotificationDetailsPage;