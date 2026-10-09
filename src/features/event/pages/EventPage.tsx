import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Avatar,
  Badge,
  Button,
  ConfigProvider,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  notification,
} from "antd";
import type { InputRef } from "antd";
import {
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  FilterOutlined,
  GlobalOutlined,
  MessageOutlined,
  PlusOutlined,
  QrcodeOutlined,
  RadarChartOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  TableOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import "./EventPage.css";
import TeamAssignmentPage from "./Teamassignmentpage";
import EventMapView from "./EventMapView";
import { getEvents } from "../../../redux/actions/eventActions";
import { fetchEventMessagesRequest } from "../../../redux/actions/messageActions";
import LocationPickerModal, { LocationData } from "./LocationPickerModal";
import EventQRModal from "../../../components/UI/EventQRModal";
import EventThreadPanel from "../../../components/UI/EventThreadPanel";
import EquipmentChecklistModal from "../../../components/UI/EquipmentChecklistModal";
import CheckInStatusBadge from "../../../components/UI/CheckInStatusBadge";
import CheckInStatusModal from "../../../components/UI/CheckInStatusModal";
import { fetchCheckInStatusForEvents, EventCheckInStatus } from "../../../utils/checkinStatusApi";

const { Title, Text } = Typography;

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

// Purely decorative sample photos for the hero banner art — unrelated to
// real event data, which now comes entirely from Redux/the backend.
const heroArtPhotos = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
];

const PAGE_SIZE = 10;

const ASSIGNED_ONLY_ROLES = ["studio_manager", "freelance_photographer", "studio_photographer"];

const statuses = ["DRAFT", "PLANNED", "LIVE", "DONE"];
const eventTypes = [
  "Wedding",
  "Reception",
  "Corporate",
  "Family",
  "Birthday",
  "Engagement",
];

type ViewMode = "table" | "cards" | "timeline" | "map";
type RangeFilter = "any" | "today" | "week" | "upcoming";
type SortMode = "default" | "soonest" | "latest" | "name";

const rangeOptions: { key: RangeFilter; label: string }[] = [
  { key: "any", label: "Any time" },
  { key: "today", label: "Today" },
  { key: "week", label: "Next 7 days" },
  { key: "upcoming", label: "Upcoming" },
];

const sortOptions: { value: SortMode; label: string }[] = [
  { value: "default", label: "Smart order" },
  { value: "soonest", label: "Soonest first" },
  { value: "latest", label: "Latest first" },
  { value: "name", label: "Name A-Z" },
];

const statusMeta: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  DRAFT: {
    icon: <EditOutlined />,
    color: "#cbd5e1",
    bg: "rgba(148,163,184,0.14)",
  },
  PLANNED: {
    icon: <ClockCircleOutlined />,
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.14)",
  },
  LIVE: {
    icon: <ThunderboltOutlined />,
    color: "#86efac",
    bg: "rgba(34,197,94,0.14)",
  },
  DONE: {
    icon: <CheckCircleOutlined />,
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.14)",
  },
};

const pipelineColor: Record<string, string> = {
  Converted: "#86efac",
  Booked: "#7dd3fc",
  Proposal: "#fbbf24",
  Delivered: "#c4b5fd",
};

const escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const staticMapThumb = (lat: number, lng: number, size = "600x180") =>
  `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=${size}&markers=${lat},${lng},red-pushpin`;

const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}`;

// Reads the same "Jun 16, 2026" / "12:00 AM" board strings CreateEventPage's
// formatBoardDate/formatBoardTime produce, so no schema change is needed to
// know how far out an event is.
const parseEventDateTime = (event: any): Date | null => {
  if (!event?.date) return null;
  const combined = `${event.date} ${event.time || ""}`.trim();
  const parsed = new Date(combined);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// True once an event is inside its 2-hour pre-event equipment prep window —
// drives the urgent styling on the checklist action icon.
const isWithinPrepWindow = (event: any): boolean => {
  const eventDate = parseEventDateTime(event);
  if (!eventDate) return false;
  const diffMs = eventDate.getTime() - Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return diffMs > 0 && diffMs <= twoHoursMs;
};

// True if an event's date falls on today's calendar day (local time) —
// drives whether the check-in badge's "awaiting" state animates.
const isEventToday = (event: any): boolean => {
  const eventDate = parseEventDateTime(event);
  if (!eventDate) return false;
  const now = new Date();
  return (
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getDate() === now.getDate()
  );
};

/* ---------- Calendar-day helpers (NEW) ---------- */
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// Whole calendar days between today and the event (0 = today, negative = past).
const dayDiff = (event: any): number | null => {
  const d = parseEventDateTime(event);
  if (!d) return null;
  return Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
};

const relativeLabel = (event: any): { text: string; tone: string } => {
  const days = dayDiff(event);
  if (days === null) return { text: "", tone: "none" };
  if (days === 0) return { text: "Today", tone: "today" };
  if (days === 1) return { text: "Tomorrow", tone: "soon" };
  if (days > 1 && days <= 7) return { text: `In ${days}d`, tone: "soon" };
  if (days > 7) return { text: `In ${days}d`, tone: "future" };
  if (days === -1) return { text: "Yesterday", tone: "past" };
  return { text: `${Math.abs(days)}d ago`, tone: "past" };
};

const matchesRange = (event: any, range: RangeFilter): boolean => {
  if (range === "any") return true;
  const days = dayDiff(event);
  if (days === null) return false;
  if (range === "today") return days === 0;
  if (range === "week") return days >= 0 && days <= 7;
  return days >= 0; // upcoming
};

/* ---------- Starred events (NEW, client-side) ---------- */
const STAR_KEY = "ax.events.starred.v1";

const loadStarred = (): string[] => {
  try {
    const raw = localStorage.getItem(STAR_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* ---------- Unread message tracking (client-side) ----------
   There's no read-receipt field from the backend yet, so "unread" is
   derived by diffing the polled message list against a per-event,
   per-user "last read" timestamp kept in localStorage. This is enough to
   drive badges + toasts without a schema change; if the backend later
   adds a real read-receipt/unread-count endpoint, swap this out for
   that. */
const LAST_READ_KEY_PREFIX = "ax.chat.lastRead.";

const lastReadKey = (eventId: string, user: any) =>
  `${LAST_READ_KEY_PREFIX}${eventId}.${user?.email || user?.id || "anon"}`;

const getLastReadTs = (eventId: string, user: any): number => {
  try {
    const raw = localStorage.getItem(lastReadKey(eventId, user));
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
};

const setLastReadTs = (eventId: string, user: any, ts: number) => {
  try {
    localStorage.setItem(lastReadKey(eventId, user), String(ts));
  } catch {
    // localStorage unavailable (private mode etc.) — badges just won't persist across reloads.
  }
};

const countUnread = (eventId: string, user: any, messagesByEvent: any): number => {
  const msgs: any[] = messagesByEvent?.[eventId] || [];
  if (!msgs.length) return 0;
  const lastReadTs = getLastReadTs(eventId, user);
  return msgs.filter((m) => {
    const isOwn = user?.email && m.senderEmail === user.email;
    if (isOwn) return false;
    return new Date(m.createdAt).getTime() > lastReadTs;
  }).length;
};

const MESSAGE_POLL_INTERVAL_MS = 20000;

/* ---------- Backend sync for edit / venue-pin ----------
   assignTeam already has its own redux action + saga (fired directly by
   TeamAssignmentPage via fetch, which also creates notifications). Editing
   an event's fields or pinning a venue has no redux action yet, so those
   go straight to the existing PATCH /studio/events/:id endpoint
   (event.controller.js's `update`), then we dispatch(getEvents()) to
   refresh Redux from the server — same pattern TeamAssignmentPage uses. */
async function patchEventOnServer(
  id: string,
  payload: Record<string, any>
): Promise<{ ok: boolean; message?: string }> {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/studio/events/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      return { ok: false, message: body?.message || "Server update failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error." };
  }
}

// Checks whether the logged-in user appears in an event's assigned team.
// The backend already filters photographer-role users' event lists
// server-side, so this is a client-side safety net (also covers
// studio_manager, which the backend doesn't restrict).
const isEventAssignedToUser = (event: any, user: any): boolean => {
  if (!user) return false;
  const list = event?.assignedMembersList;
  if (!Array.isArray(list) || list.length === 0) return false;

  return list.some((member: any) => {
    if (!member) return false;
    if (user.id && (member.id === user.id || member.userId === user.id)) return true;
    if (user.email && member.email && member.email === user.email) return true;
    return false;
  });
};

/* ============================================================
   NEW: small animated building blocks
   ============================================================ */

// Eases a number from its previous value to the new target.
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      fromRef.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

const AnimatedNumber = ({ value }: { value: number }) => <>{useCountUp(value)}</>;

const pad2 = (n: number) => String(n).padStart(2, "0");

// Live ticking countdown to the next upcoming event. Owns its own 1s timer
// so the rest of the page never re-renders every second.
const NextUpCard = ({ event, onOpen }: { event: any; onOpen: () => void }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = parseEventDateTime(event)?.getTime() ?? 0;
  const diff = Math.max(target - now, 0);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const WINDOW_MS = 7 * 86400000;
  const progress = 1 - Math.min(diff / WINDOW_MS, 1);
  const RADIUS = 31;
  const CIRC = 2 * Math.PI * RADIUS;
  const urgent = diff > 0 && diff <= 2 * 3600000;

  return (
    <button
      type="button"
      className={`event-nextup ${urgent ? "urgent" : ""}`}
      onClick={onOpen}
      title="Open next event"
    >
      <span className="event-nextup-ring">
        <svg viewBox="0 0 76 76" width="76" height="76" aria-hidden="true">
          <defs>
            <linearGradient id="nextupGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <circle cx="38" cy="38" r={RADIUS} className="event-nextup-track" />
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            className="event-nextup-progress"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
          />
        </svg>
        <span className="event-nextup-days">
          <b>{diff > 0 ? days : 0}</b>
          <small>days</small>
        </span>
      </span>
      <span className="event-nextup-copy">
        <small>
          <RocketIcon /> Next up
        </small>
        <strong>{event.name}</strong>
        <span className="event-nextup-clock">
          {diff > 0 ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}` : "Starting now"}
        </span>
      </span>
    </button>
  );
};

// Tiny inline icon so we don't depend on an icon that may not exist in older icon packs.
const RocketIcon = () => (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true">
    <path d="M8 0l2 5h5l-4 3.4L12.5 14 8 10.8 3.5 14 5 8.4 1 5h5z" />
  </svg>
);

// Card with a cursor-driven 3D tilt and a moving light sheen. Uses direct
// style mutation (no state) so mouse movement never triggers a re-render.
const TiltCard = ({
  index,
  onClick,
  children,
}: {
  index: number;
  onClick?: () => void;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
    el.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  };

  return (
    <article
      ref={ref}
      className="event-card"
      style={{ "--i": index } as React.CSSProperties}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
    >
      {children}
      <span className="event-card-shine" aria-hidden="true" />
    </article>
  );
};

const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className="event-skeleton-grid" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div className="event-skeleton-card" key={i} style={{ "--i": i } as React.CSSProperties} />
    ))}
  </div>
);

export default function EventPage({ user }: { user?: any } = {}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { events: reduxEvents, loading: reduxLoading } = useSelector(
    (state: any) => state.event
  );
  const { messagesByEvent } = useSelector((state: any) => state.message);

  // Single source of truth now: Redux, populated from GET /studio/events.
  // No more localStorage ("ax.events.v1") — that copy never updated on a
  // photographer's own browser when an admin assigned them elsewhere.
  const events: any[] = Array.isArray(reduxEvents) ? reduxEvents : [];

  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewEvent, setViewEvent] = useState<any>(null);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignEvent, setAssignEvent] = useState<any>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [cardPage, setCardPage] = useState(1);

  // --- NEW: smart filters / sorting / stars ---
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("any");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [starredOnly, setStarredOnly] = useState(false);
  const [starred, setStarred] = useState<string[]>(loadStarred);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchRef = useRef<InputRef>(null);
  const panelRef = useRef<HTMLElement>(null);

  // --- Venue location pin state ---
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationEventId, setLocationEventId] = useState<string | null>(null);

  // --- QR code state ---
  const [qrEvent, setQrEvent] = useState<any>(null);

  // --- Event thread (team chat) state ---
  const [chatEvent, setChatEvent] = useState<any>(null);
  // Bumped whenever a thread is marked read, to force unreadCounts to
  // recompute (the underlying "last read" value lives in localStorage,
  // outside Redux, so it needs an explicit nudge).
  const [readVersion, setReadVersion] = useState(0);

  // --- Equipment checklist state ---
  const [checklistEvent, setChecklistEvent] = useState<any>(null);

  // --- Check-in status modal state ---
  const [checkinModalEvent, setCheckinModalEvent] = useState<any>(null);

  // --- Photographer check-in status (badges + view-modal panel) ---
  const [checkinStatusMap, setCheckinStatusMap] = useState<Record<string, EventCheckInStatus>>({});

  const [form] = Form.useForm();

  const canCreateEvents = user?.role === "studio_admin" || user?.role === "super_admin";

  const isAssignedOnlyRole = Boolean(user?.role) && ASSIGNED_ONLY_ROLES.includes(user.role);

  const starredSet = useMemo(() => new Set(starred), [starred]);

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(STAR_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable — stars just won't persist across reloads.
      }
      return next;
    });
  };

  useEffect(() => {
    dispatch(getEvents());
  }, [dispatch]);

  useEffect(() => {
    setTablePage(1);
    setCardPage(1);
  }, [activeStatus, searchTerm, events.length, rangeFilter, sortMode, starredOnly]);

  useEffect(() => {
    if (!events.length) return;
    fetchCheckInStatusForEvents(events.map((e) => e.id)).then(setCheckinStatusMap);
  }, [events]);

  const scopedEvents = useMemo(() => {
    if (!isAssignedOnlyRole) return events;
    return events.filter((e) => isEventAssignedToUser(e, user));
  }, [events, isAssignedOnlyRole, user]);

  // Keep every visible event's message list warm so unread badges and
  // toasts stay accurate even while the thread panel is closed. This
  // mirrors EventThreadPanel's own polling pattern, just fanned out
  // across every event this user can see.
  useEffect(() => {
    if (!scopedEvents.length) return;

    const pollMessages = () => {
      scopedEvents.forEach((e) => dispatch(fetchEventMessagesRequest(e.id)));
    };

    pollMessages();
    const interval = setInterval(pollMessages, MESSAGE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [scopedEvents, dispatch]);

  const markEventRead = (eventId: string) => {
    const msgs: any[] = messagesByEvent?.[eventId] || [];
    const latestTs = msgs.length
      ? new Date(msgs[msgs.length - 1].createdAt).getTime()
      : Date.now();
    setLastReadTs(eventId, user, latestTs);
    setReadVersion((v) => v + 1);
  };

  const unreadCounts = useMemo(() => {
    const map: Record<string, number> = {};
    scopedEvents.forEach((e) => {
      map[e.id] = countUnread(e.id, user, messagesByEvent);
    });
    return map;
    // readVersion is a deliberate extra dependency: it has no value of its
    // own, it just forces a recompute after markEventRead touches localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedEvents, messagesByEvent, user, readVersion]);

  // Fire a toast the moment any event's message count goes up, as long as
  // that event's thread isn't the one currently open (someone looking at
  // a thread doesn't need a toast about the message they can already see).
  const prevMessageCountsRef = useRef<Record<string, number>>({});
  const messagesInitializedRef = useRef(false);

  useEffect(() => {
    const prevCounts = prevMessageCountsRef.current;
    const nextCounts: Record<string, number> = {};

    Object.keys(messagesByEvent || {}).forEach((eventId) => {
      nextCounts[eventId] = (messagesByEvent[eventId] || []).length;
    });

    if (messagesInitializedRef.current) {
      Object.keys(nextCounts).forEach((eventId) => {
        const prevCount = prevCounts[eventId] || 0;
        const nextCount = nextCounts[eventId];
        if (nextCount <= prevCount) return;

        const msgs: any[] = messagesByEvent[eventId] || [];
        const latest = msgs[msgs.length - 1];
        const isOwnLatest = Boolean(user?.email && latest?.senderEmail === user.email);
        if (isOwnLatest) return;

        const isPanelOpen = chatEvent?.id === eventId;
        if (isPanelOpen) return;

        const addedCount = nextCount - prevCount;
        const ev = events.find((e) => e.id === eventId);
        const evLabel = ev?.name || ev?.eventName || "Event";
        const titleLabel =
          addedCount > 1 ? `${addedCount} new messages` : "New message";

        notification.open({
          key: `event-msg-${eventId}`,
          message: `${titleLabel} - ${evLabel}`,
          description: latest?.text
            ? `${latest.senderName || "Someone"}: ${latest.text}`
            : undefined,
          icon: <MessageOutlined style={{ color: "#fac775" }} />,
          placement: "topRight",
          duration: 5,
          onClick: () => {
            if (ev) setChatEvent(ev);
          },
        });
      });
    }

    prevMessageCountsRef.current = nextCounts;
    messagesInitializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesByEvent, chatEvent, events, user]);

  const counts = useMemo(
    () =>
      scopedEvents.reduce(
        (acc, e) => {
          acc.All += 1;
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        },
        { All: 0, DRAFT: 0, PLANNED: 0, LIVE: 0, DONE: 0 } as Record<string, number>
      ),
    [scopedEvents]
  );

  // Hero stat strip numbers.
  const todayCount = useMemo(
    () => scopedEvents.filter((e) => isEventToday(e)).length,
    [scopedEvents]
  );
  const totalUnread = useMemo(
    () => Object.values(unreadCounts).reduce((sum, n) => sum + n, 0),
    [unreadCounts]
  );

  // The soonest not-yet-finished event in the future — feeds the countdown card.
  const nextEvent = useMemo(() => {
    const nowTs = Date.now();
    let best: any = null;
    let bestTs = Infinity;
    scopedEvents.forEach((e) => {
      if (e.status === "DONE") return;
      const ts = parseEventDateTime(e)?.getTime();
      if (ts === undefined || ts <= nowTs) return;
      if (ts < bestTs) {
        best = e;
        bestTs = ts;
      }
    });
    return best;
  }, [scopedEvents]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const list = scopedEvents.filter((e) => {
      const matchStatus = activeStatus === "All" || e.status === activeStatus;
      const matchSearch =
        !term ||
        Object.values(e).some((v) => String(v).toLowerCase().includes(term));
      const matchRange = matchesRange(e, rangeFilter);
      const matchStar = !starredOnly || starredSet.has(e.id);

      return matchStatus && matchSearch && matchRange && matchStar;
    });

    const ts = (e: any) => parseEventDateTime(e)?.getTime() ?? 0;
    if (sortMode === "soonest") list.sort((a, b) => ts(a) - ts(b));
    else if (sortMode === "latest") list.sort((a, b) => ts(b) - ts(a));
    else if (sortMode === "name")
      list.sort((a, b) => String(a.name).localeCompare(String(b.name)));

    // Starred events always float to the top (stable partition).
    return [
      ...list.filter((e) => starredSet.has(e.id)),
      ...list.filter((e) => !starredSet.has(e.id)),
    ];
  }, [activeStatus, scopedEvents, searchTerm, rangeFilter, starredOnly, starredSet, sortMode]);

  const pagedCardEvents = useMemo(
    () => filteredEvents.slice((cardPage - 1) * PAGE_SIZE, cardPage * PAGE_SIZE),
    [filteredEvents, cardPage]
  );

  // Timeline view: group events by calendar date, oldest -> newest.
  const timelineGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredEvents.forEach((e) => {
      const key = e.date || "Unscheduled";
      map.set(key, [...(map.get(key) || []), e]);
    });
    return Array.from(map.entries())
      .map(([date, items]) => ({
        date,
        items,
        ts: parseEventDateTime(items[0])?.getTime() ?? Infinity,
      }))
      .sort((a, b) => a.ts - b.ts);
  }, [filteredEvents]);

  const hasActiveFilters =
    activeStatus !== "All" ||
    rangeFilter !== "any" ||
    starredOnly ||
    sortMode !== "default" ||
    searchTerm.trim() !== "";

  const resetFilters = () => {
    setActiveStatus("All");
    setRangeFilter("any");
    setStarredOnly(false);
    setSortMode("default");
    setSearchTerm("");
  };

  const highlightText = (value: any) => {
    if (!searchTerm.trim()) return value;

    const regex = new RegExp(`(${escapeRegExp(searchTerm.trim())})`, "gi");

    return String(value)
      .split(regex)
      .map((part, i) =>
        part.toLowerCase() === searchTerm.trim().toLowerCase() ? (
          <mark className="event-search-highlight" key={`${part}-${i}`}>
            {part}
          </mark>
        ) : (
          part
        )
      );
  };

  const openCreate = () => {
    if (!canCreateEvents) return;
    navigate("/events/create");
  };

  const openEdit = (event: any) => {
    setEditEvent(event);
    form.setFieldsValue(event);
    setCreateOpen(true);
  };

  const handleSave = async (values: any) => {
    if (!editEvent) return;
    const clean = { ...values, members: Number(values.members || 0) };

    const { ok, message: errMsg } = await patchEventOnServer(editEvent.id, clean);
    if (!ok) {
      message.error(errMsg || "Failed to update event.");
      return;
    }

    message.success("Event updated");
    dispatch(getEvents());
    setCreateOpen(false);
    setEditEvent(null);
    form.resetFields();
  };

  const handleRefresh = () => {
    setIsLoading(true);
    dispatch(getEvents());
    setTimeout(() => {
      setIsLoading(false);
      message.success("Events refreshed");
    }, 650);
  };

  // NEW: keyboard shortcuts — Ctrl/Cmd+K or "/" focus search, 1/2/3/4 switch
  // view, R refresh. Ignored while typing or while any modal/panel is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        viewEvent ||
        createOpen ||
        qrEvent ||
        chatEvent ||
        checklistEvent ||
        checkinModalEvent ||
        showLocationPicker ||
        assignEvent
      )
        return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case "1":
          setViewMode("table");
          break;
        case "2":
          setViewMode("cards");
          break;
        case "3":
          setViewMode("timeline");
          break;
        case "4":
          setViewMode("map");
          break;
        case "r":
        case "R":
          handleRefresh();
          break;
        default:
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewEvent,
    createOpen,
    qrEvent,
    chatEvent,
    checklistEvent,
    checkinModalEvent,
    showLocationPicker,
    assignEvent,
  ]);

  // NEW: cursor spotlight on the main panel (direct style mutation, no re-render).
  const handlePanelMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--px", `${e.clientX - rect.left}px`);
    el.style.setProperty("--py", `${e.clientY - rect.top}px`);
  };

  const copyEventToClipboard = async (event: any) => {
    const text = [
      `Event: ${event.name}`,
      `Date: ${event.date}`,
      `Time: ${event.time}`,
      `Address: ${event.address}, ${event.city}`,
      `Customer: ${event.customer}`,
      `Status: ${event.status}`,
      `Stage: ${event.pipeline}`,
      `Assigned Members: ${event.members}`,
      ...(event.location
        ? [`Map: ${googleMapsUrl(event.location.lat, event.location.lng)}`]
        : []),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      message.success("Event copied to clipboard");
      setCopiedId(event.id);
      setTimeout(() => setCopiedId((cur) => (cur === event.id ? null : cur)), 1400);
    } catch {
      message.error("Clipboard permission is not available");
    }
  };

  // TeamAssignmentPage already PATCHed /assign-team itself (via its own
  // fetch call) and that endpoint already created the notification — this
  // just refreshes this admin's Redux state from the server so the list
  // reflects the new assignment immediately.
  const handleAssignSave = (_assignedList: any[]) => {
    dispatch(getEvents());
    setAssignEvent(null);
  };

  const openLocationPicker = (eventId: string) => {
    setLocationEventId(eventId);
    setShowLocationPicker(true);
  };

  const handleLocationSave = async (location: LocationData) => {
    if (!locationEventId) return;

    const { ok, message: errMsg } = await patchEventOnServer(locationEventId, { location });
    if (!ok) {
      message.error(errMsg || "Failed to save venue location.");
      return;
    }

    dispatch(getEvents());
    setViewEvent((current: any) =>
      current && current.id === locationEventId ? { ...current, location } : current
    );
    setEditEvent((current: any) =>
      current && current.id === locationEventId ? { ...current, location } : current
    );
    setShowLocationPicker(false);
    setLocationEventId(null);
    message.success("Venue location pinned");
  };

  const removeLocation = async (eventId: string) => {
    const { ok, message: errMsg } = await patchEventOnServer(eventId, { location: null });
    if (!ok) {
      message.error(errMsg || "Failed to remove location.");
      return;
    }

    dispatch(getEvents());
    setViewEvent((current: any) =>
      current && current.id === eventId ? { ...current, location: null } : current
    );
    setEditEvent((current: any) =>
      current && current.id === eventId ? { ...current, location: null } : current
    );
  };

  const handleLocationAction = (record: any) => {
    if (record.location) {
      window.open(
        googleMapsUrl(record.location.lat, record.location.lng),
        "_blank",
        "noreferrer"
      );
    } else {
      openLocationPicker(record.id);
    }
  };

  const locationPickerInitial: LocationData | null =
    (locationEventId && events.find((e) => e.id === locationEventId)?.location) || null;

  const renderStatus = (status: string) => {
    const meta = statusMeta[status] || statusMeta.DRAFT;

    return (
      <Tag
        className={`event-status-tag ${status === "LIVE" ? "is-live" : ""}`}
        style={{ "--tag-color": meta.color, "--tag-bg": meta.bg } as React.CSSProperties}
      >
        {status === "LIVE" ? <span className="event-live-dot" /> : meta.icon}
        {status}
      </Tag>
    );
  };

  const renderRelChip = (event: any) => {
    const rel = relativeLabel(event);
    if (!rel.text) return null;
    return <em className={`event-rel ${rel.tone}`}>{rel.text}</em>;
  };

  const renderStar = (event: any) => {
    const on = starredSet.has(event.id);
    return (
      <Tooltip title={on ? "Remove star" : "Star this event"}>
        <button
          type="button"
          aria-label={on ? "Remove star" : "Star this event"}
          className={`event-star ${on ? "on" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(event.id);
          }}
        >
          {on ? <StarFilled /> : <StarOutlined />}
        </button>
      </Tooltip>
    );
  };

  const filterMenu = (
    <div className="event-filter-popover">
      {["All", ...statuses].map((status) => (
        <button
          type="button"
          key={status}
          className={activeStatus === status ? "active" : ""}
          onClick={() => {
            setActiveStatus(status);
            setFilterOpen(false);
          }}
        >
          {status === "All" ? <AppstoreOutlined /> : statusMeta[status].icon}
          <span>{counts[status] || 0}</span>
        </button>
      ))}
    </div>
  );

  const renderRowActionsOverlay = (record: any) => (
    <div className="event-row-actions-overlay">
      <Tooltip title={record.location ? "View pinned venue" : "Pin venue location"}>
        <Button
          type="text"
          icon={<EnvironmentOutlined />}
          className={`event-action-btn location ${record.location ? "is-pinned" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            handleLocationAction(record);
          }}
        />
      </Tooltip>
      <Tooltip title="Assign members">
        <Button
          type="text"
          icon={<TeamOutlined />}
          className="event-action-btn assign"
          onClick={(e) => {
            e.stopPropagation();
            setAssignEvent(record);
          }}
        />
      </Tooltip>
      <Tooltip title={isWithinPrepWindow(record) ? "Equipment check due — under 2 hrs to go" : "Equipment checklist"}>
        <Button
          type="text"
          icon={<ToolOutlined />}
          className={`event-action-btn checklist ${isWithinPrepWindow(record) ? "urgent" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setChecklistEvent(record);
          }}
        />
      </Tooltip>
      <Tooltip title="Team chat">
        <Badge
          size="small"
          count={unreadCounts[record.id] || 0}
          overflowCount={99}
          offset={[-2, 2]}
          className="event-chat-badge"
        >
          <Button
            type="text"
            icon={<MessageOutlined />}
            className="event-action-btn chat"
            onClick={(e) => {
              e.stopPropagation();
              setChatEvent(record);
            }}
          />
        </Badge>
      </Tooltip>
      <Tooltip title="Photographer check-in status">
        <Button
          type="text"
          icon={<RadarChartOutlined />}
          className="event-action-btn checkin"
          onClick={(e) => {
            e.stopPropagation();
            setCheckinModalEvent(record);
          }}
        />
      </Tooltip>
      <Tooltip title="Show QR code">
        <Button
          type="text"
          icon={<QrcodeOutlined />}
          className="event-action-btn qr"
          onClick={(e) => {
            e.stopPropagation();
            setQrEvent(record);
          }}
        />
      </Tooltip>
      <Tooltip title="Copy to clipboard">
        <Button
          type="text"
          icon={copiedId === record.id ? <CheckCircleOutlined /> : <CopyOutlined />}
          className={`event-action-btn copy ${copiedId === record.id ? "copied" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            copyEventToClipboard(record);
          }}
        />
      </Tooltip>
    </div>
  );

  const columns = [
    {
      title: "",
      key: "star",
      width: 48,
      render: (_: any, record: any) => renderStar(record),
    },
    {
      title: "Event Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      width: 100,
      render: (text: string, record: any) => (
        <button
          type="button"
          className="event-name-cell"
          onClick={() => setViewEvent(record)}
        >
          <Avatar src={record.image} className="event-name-avatar">
            {record.name.charAt(0)}
          </Avatar>
          <span>
            <strong>{highlightText(text)}</strong>
            <small>{record.type}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      sorter: (a: any, b: any) => a.date.localeCompare(b.date),
      width: 100,
      render: (t: any, record: any) => (
        <span className="event-soft-cell event-date-cell">
          {highlightText(t)}
          {renderRelChip(record)}
        </span>
      ),
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      width: 100,
      render: (t: any) => <span className="event-soft-cell">{highlightText(t)}</span>,
    },
    {
      title: "Address",
      dataIndex: "address",
      key: "address",
      width: 100,
      render: (t: any) => (
        <span className="event-soft-cell event-address-cell">{highlightText(t)}</span>
      ),
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      width: 100,
      render: (t: any) => <span className="event-soft-cell">{highlightText(t)}</span>,
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      width: 100,
      render: (t: any) => <span className="event-soft-cell">{highlightText(t)}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: renderStatus,
    },
    {
      title: "Check-In",
      key: "checkin",
      width: 130,
      render: (_: any, record: any) => (
        <CheckInStatusBadge status={checkinStatusMap[record.id]} isToday={isEventToday(record)} />
      ),
    },
    {
      title: "Stage",
      dataIndex: "pipeline",
      key: "pipeline",
      fixed: "right" as const,
      width: 100,
      onCell: () => ({ className: "event-actions-anchor-cell" }),
      render: (pipeline: string, record: any) => (
        <>
          <Tag
            className="event-pipeline-tag"
            style={{ "--pipeline-color": pipelineColor[pipeline] || "#93c5fd" } as React.CSSProperties}
          >
            {pipeline}
          </Tag>
          {renderRowActionsOverlay(record)}
        </>
      ),
    },
  ];

  if (assignEvent) {
    return (
      <ConfigProvider
        theme={{ token: { colorPrimary: "#3b82f6", borderRadius: 8 } }}
      >
        <TeamAssignmentPage
          user={user}
          event={assignEvent}
          onPrevious={() => setAssignEvent(null)}
          onNext={handleAssignSave}
        />
      </ConfigProvider>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = String(user?.name || user?.fullName || user?.firstName || "")
    .trim()
    .split(" ")[0];

  const showSkeleton = reduxLoading && events.length === 0;

  return (
    <ConfigProvider
      theme={{ token: { colorPrimary: "#3b82f6", borderRadius: 8 } }}
    >
      <main className="event-page">
        <section className="event-hero">
          {/* NEW: aperture ring + drifting bokeh lights */}
          <span className="event-hero-aperture" aria-hidden="true" />
          <span className="event-bokeh b1" aria-hidden="true" />
          <span className="event-bokeh b2" aria-hidden="true" />
          <span className="event-bokeh b3" aria-hidden="true" />
          <span className="event-bokeh b4" aria-hidden="true" />
          <span className="event-bokeh b5" aria-hidden="true" />

          <div className="event-hero-copy">
            <span className="event-hero-pill">
              <CalendarOutlined />
              Event board
            </span>
            <Title level={2}>Events</Title>
            <Text>
              Plan bookings, customers, city, stage and assigned members in one
              transparent workspace.
            </Text>
            <span className="event-hero-greeting">
              {greeting}
              {firstName ? `, ${firstName}` : ""} - you have{" "}
              <b>{todayCount}</b> shoot{todayCount === 1 ? "" : "s"} today.
            </span>
            {canCreateEvents && (
              <div className="event-hero-actions">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className="event-hero-create"
                  onClick={openCreate}
                >
                  Create Event
                </Button>
              </div>
            )}

            {/* NEW: animated stat strip — tiles double as quick filters */}
            <div className="event-stats">
              <button type="button" className="event-stat" onClick={resetFilters}>
                <AppstoreOutlined />
                <b>
                  <AnimatedNumber value={counts.All} />
                </b>
                <span>Total</span>
              </button>
              <button
                type="button"
                className="event-stat live"
                onClick={() => setActiveStatus("LIVE")}
              >
                <ThunderboltOutlined />
                <b>
                  <AnimatedNumber value={counts.LIVE || 0} />
                </b>
                <span>Live now</span>
              </button>
              <button
                type="button"
                className="event-stat today"
                onClick={() => setRangeFilter("today")}
              >
                <CalendarOutlined />
                <b>
                  <AnimatedNumber value={todayCount} />
                </b>
                <span>Today</span>
              </button>
              <div className={`event-stat unread ${totalUnread ? "has-unread" : ""}`}>
                <BellOutlined />
                <b>
                  <AnimatedNumber value={totalUnread} />
                </b>
                <span>Unread</span>
              </div>
            </div>
          </div>

          <div className="event-hero-art" aria-hidden={nextEvent ? undefined : "true"}>
            {heroArtPhotos.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className={`event-hero-photo photo-${i + 1}`}
              />
            ))}
            <span className="event-hero-orbit orbit-one" />
            <span className="event-hero-orbit orbit-two" />
            {nextEvent ? (
              <NextUpCard event={nextEvent} onOpen={() => setViewEvent(nextEvent)} />
            ) : null}
          </div>
        </section>

        <section className="event-panel" ref={panelRef} onMouseMove={handlePanelMove}>
          <div className="event-toolbar">
            <Space size={10} wrap>
              <Input
                ref={searchRef}
                allowClear
                className="event-search"
                placeholder="Search events..."
                prefix={<SearchOutlined />}
                suffix={searchTerm ? null : <kbd className="event-kbd">/</kbd>}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <Popover
                open={filterOpen}
                onOpenChange={setFilterOpen}
                content={filterMenu}
                trigger="click"
                placement="bottomLeft"
              >
                <Tooltip title="Filter">
                  <Button
                    type="text"
                    icon={<FilterOutlined />}
                    className="event-tool-btn"
                  />
                </Tooltip>
              </Popover>

              <Tooltip title="Refresh (R)">
                <Button
                  type="text"
                  icon={<ReloadOutlined spin={isLoading || reduxLoading} />}
                  className="event-tool-btn"
                  onClick={handleRefresh}
                />
              </Tooltip>

              <div className="event-view-toggle" data-mode={viewMode}>
                <span className="event-view-thumb" aria-hidden="true" />
                <Tooltip title="Table view (1)">
                  <button
                    type="button"
                    className={viewMode === "table" ? "active" : ""}
                    onClick={() => setViewMode("table")}
                  >
                    <TableOutlined />
                  </button>
                </Tooltip>
                <Tooltip title="Card view (2)">
                  <button
                    type="button"
                    className={viewMode === "cards" ? "active" : ""}
                    onClick={() => setViewMode("cards")}
                  >
                    <UnorderedListOutlined />
                  </button>
                </Tooltip>
                <Tooltip title="Timeline view (3)">
                  <button
                    type="button"
                    className={viewMode === "timeline" ? "active" : ""}
                    onClick={() => setViewMode("timeline")}
                  >
                    <FieldTimeOutlined />
                  </button>
                </Tooltip>
                <Tooltip title="Map view (4)">
                  <button
                    type="button"
                    className={viewMode === "map" ? "active" : ""}
                    onClick={() => setViewMode("map")}
                  >
                    <GlobalOutlined />
                  </button>
                </Tooltip>
              </div>
            </Space>

            {canCreateEvents && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="event-create-btn"
                onClick={openCreate}
              >
                Create Event
              </Button>
            )}
          </div>

          <div className="event-chip-row">
            {["All", ...statuses].map((status) => (
              <Tooltip title={status} key={status}>
                <button
                  type="button"
                  className={`event-status-chip ${
                    activeStatus === status ? "active" : ""
                  }`}
                  onClick={() => setActiveStatus(status)}
                >
                  {status === "All" ? (
                    <AppstoreOutlined />
                  ) : (
                    statusMeta[status].icon
                  )}
                  <b>{counts[status] || 0}</b>
                </button>
              </Tooltip>
            ))}

            <span className="event-chip-divider" aria-hidden="true" />

            {rangeOptions.map((opt) => (
              <button
                type="button"
                key={opt.key}
                className={`event-range-chip ${rangeFilter === opt.key ? "active" : ""}`}
                onClick={() => setRangeFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}

            <button
              type="button"
              className={`event-range-chip star ${starredOnly ? "active" : ""}`}
              onClick={() => setStarredOnly((v) => !v)}
            >
              {starredOnly ? <StarFilled /> : <StarOutlined />}
              Starred
              {starred.length ? <b>{starred.length}</b> : null}
            </button>

            {hasActiveFilters ? (
              <button type="button" className="event-reset-chip" onClick={resetFilters}>
                Reset
              </button>
            ) : null}

            <Select
              size="small"
              value={sortMode}
              onChange={(v) => setSortMode(v)}
              options={sortOptions}
              className="event-sort-select"
              suffixIcon={<SearchOutlined style={{ display: "none" }} />}
              popupMatchSelectWidth={false}
            />
          </div>

          {viewMode === "table" ? (
            <Table
              columns={columns}
              dataSource={filteredEvents}
              rowKey="id"
              className="event-table"
              loading={showSkeleton}
              scroll={{ x: 1260 }}
              rowClassName={(record) =>
                `${activeRowId === record.id ? "event-row-active" : ""} ${
                  starredSet.has(record.id) ? "event-row-starred" : ""
                }`
              }
              onRow={(record) => ({
                onMouseEnter: () => setActiveRowId(record.id),
                onMouseLeave: () =>
                  setActiveRowId((current) => (current === record.id ? null : current)),
                onTouchStart: () =>
                  setActiveRowId((current) => (current === record.id ? null : record.id)),
              })}
              pagination={{
                current: tablePage,
                pageSize: PAGE_SIZE,
                total: filteredEvents.length,
                showSizeChanger: false,
                showTotal: (total) => `${total} event${total === 1 ? "" : "s"}`,
                onChange: (page) => setTablePage(page),
              }}
              locale={{
                emptyText: (
                  <Empty
                    description="No matching events"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          ) : viewMode === "cards" ? (
            <>
              {showSkeleton ? <SkeletonGrid /> : null}
              <div className="event-card-grid">
                {pagedCardEvents.map((event, index) => (
                  <TiltCard key={event.id} index={index} onClick={() => setViewEvent(event)}>
                    <img src={event.image} alt={event.name} />
                    <div className="event-card-body">
                      <div className="event-card-top">
                        <span className="event-card-type">{event.type}</span>
                        <div className="event-card-top-right">
                          {renderRelChip(event)}
                          {renderStar(event)}
                        </div>
                      </div>
                      <h3>{event.name}</h3>
                      <p>
                        <CalendarOutlined /> {event.date} at {event.time}
                      </p>
                      <p>
                        <EnvironmentOutlined /> {event.city}
                      </p>
                      <div className="event-card-footer" onClick={(e) => e.stopPropagation()}>
                        <CheckInStatusBadge status={checkinStatusMap[event.id]} isToday={isEventToday(event)} />
                        {renderStatus(event.status)}
                        <Space size={4}>
                          <Tooltip title={event.location ? "View pinned venue" : "Pin venue location"}>
                            <Button
                              type="text"
                              icon={<EnvironmentOutlined />}
                              className={event.location ? "is-pinned" : ""}
                              onClick={() => handleLocationAction(event)}
                            />
                          </Tooltip>
                          <Tooltip title="Assign members">
                            <Button
                              type="text"
                              icon={<TeamOutlined />}
                              onClick={() => setAssignEvent(event)}
                            />
                          </Tooltip>
                          <Tooltip title={isWithinPrepWindow(event) ? "Equipment check due — under 2 hrs to go" : "Equipment checklist"}>
                            <Button
                              type="text"
                              icon={<ToolOutlined />}
                              className={isWithinPrepWindow(event) ? "urgent" : ""}
                              onClick={() => setChecklistEvent(event)}
                            />
                          </Tooltip>
                          <Tooltip title="Team chat">
                            <Badge
                              size="small"
                              count={unreadCounts[event.id] || 0}
                              overflowCount={99}
                              offset={[-2, 2]}
                              className="event-chat-badge"
                            >
                              <Button
                                type="text"
                                icon={<MessageOutlined />}
                                onClick={() => setChatEvent(event)}
                              />
                            </Badge>
                          </Tooltip>
                          <Tooltip title="Photographer check-in status">
                            <Button
                              type="text"
                              icon={<RadarChartOutlined />}
                              onClick={() => setCheckinModalEvent(event)}
                            />
                          </Tooltip>
                          <Tooltip title="Show QR code">
                            <Button
                              type="text"
                              icon={<QrcodeOutlined />}
                              onClick={() => setQrEvent(event)}
                            />
                          </Tooltip>
                          <Tooltip title="Copy to clipboard">
                            <Button
                              type="text"
                              icon={copiedId === event.id ? <CheckCircleOutlined /> : <CopyOutlined />}
                              className={copiedId === event.id ? "copied" : ""}
                              onClick={() => copyEventToClipboard(event)}
                            />
                          </Tooltip>
                        </Space>
                      </div>
                    </div>
                  </TiltCard>
                ))}
                {filteredEvents.length === 0 && !showSkeleton ? (
                  <Empty
                    description="No matching events"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : null}
              </div>
              {filteredEvents.length > PAGE_SIZE ? (
                <div className="event-card-pagination">
                  <Pagination
                    current={cardPage}
                    pageSize={PAGE_SIZE}
                    total={filteredEvents.length}
                    showSizeChanger={false}
                    onChange={(page) => setCardPage(page)}
                  />
                </div>
              ) : null}
            </>
          ) : viewMode === "timeline" ? (
            <>
              {showSkeleton ? <SkeletonGrid count={4} /> : null}
              {filteredEvents.length === 0 && !showSkeleton ? (
                <div className="event-timeline-empty">
                  <Empty
                    description="No matching events"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ) : (
                <div className="event-timeline">
                  {timelineGroups.map((group, gi) => {
                    const first = group.items[0];
                    const today = isEventToday(first);
                    return (
                      <section
                        className="event-tl-group"
                        key={group.date}
                        style={{ "--i": gi } as React.CSSProperties}
                      >
                        <span className={`event-tl-node ${today ? "today" : ""}`} />
                        <header className="event-tl-date">
                          <strong>{group.date}</strong>
                          {renderRelChip(first)}
                          <small>
                            {group.items.length} event{group.items.length === 1 ? "" : "s"}
                          </small>
                        </header>
                        <div className="event-tl-items">
                          {group.items.map((e) => (
                            <button
                              type="button"
                              className="event-tl-item"
                              key={e.id}
                              onClick={() => setViewEvent(e)}
                            >
                              <span className="event-tl-time">{e.time || "--"}</span>
                              <span className="event-tl-main">
                                <strong>
                                  {starredSet.has(e.id) ? (
                                    <StarFilled className="event-tl-star" />
                                  ) : null}
                                  {highlightText(e.name)}
                                </strong>
                                <small>
                                  {e.type} - {e.city}
                                </small>
                              </span>
                              {renderStatus(e.status)}
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <EventMapView
              events={filteredEvents}
              starredIds={starredSet}
              onOpenEvent={setViewEvent}
              onPinVenue={openLocationPicker}
            />
          )}
        </section>

        <Modal
          open={!!viewEvent}
          onCancel={() => setViewEvent(null)}
          footer={null}
          width={680}
          title={null}
          centered
          className="event-modal event-view-modal"
        >
          {viewEvent ? (
            <div className="event-view-shell">
              <div className="event-view-cover">
                <img src={viewEvent.image} alt={viewEvent.name} />
                <div>
                  {renderStatus(viewEvent.status)}
                  <h2>{viewEvent.name}</h2>
                  <p>{viewEvent.type}</p>
                </div>
              </div>

              <div className="event-view-grid">
                <InfoTile
                  icon={<CalendarOutlined />}
                  label="Date"
                  value={viewEvent.date}
                />
                <InfoTile
                  icon={<ClockCircleOutlined />}
                  label="Time"
                  value={viewEvent.time}
                />
                <InfoTile
                  icon={<EnvironmentOutlined />}
                  label="City"
                  value={viewEvent.city}
                />
                <InfoTile
                  icon={<TeamOutlined />}
                  label="Members"
                  value={viewEvent.members}
                />
              </div>

              <div className="event-view-location">
                <small>Address</small>
                <strong>{viewEvent.address}</strong>
                <span>
                  {viewEvent.customer} - {viewEvent.budget}
                </span>
              </div>

              <div className="event-view-map">
                <small>Venue Pin</small>
                {viewEvent.location ? (
                  <>
                    <a
                      className="event-map-thumb"
                      href={googleMapsUrl(viewEvent.location.lat, viewEvent.location.lng)}
                      target="_blank"
                      rel="noreferrer"
                      title="Tap to open the exact pinned location"
                    >
                      <img
                        src={staticMapThumb(viewEvent.location.lat, viewEvent.location.lng)}
                        alt="Venue location"
                        loading="lazy"
                      />
                      <span className="event-map-overlay">
                        <EnvironmentOutlined /> Tap to view exact location
                      </span>
                    </a>
                    <div className="event-map-meta">
                      <span className="event-map-coords">
                        {viewEvent.location.lat.toFixed(6)}, {viewEvent.location.lng.toFixed(6)}
                      </span>
                      <div className="event-map-actions">
                        <button
                          type="button"
                          className="event-map-edit"
                          onClick={() => openLocationPicker(viewEvent.id)}
                        >
                          Change Pin
                        </button>
                        <button
                          type="button"
                          className="event-map-remove"
                          onClick={() => removeLocation(viewEvent.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="event-map-add"
                    onClick={() => openLocationPicker(viewEvent.id)}
                  >
                    <EnvironmentOutlined /> Pin Venue on Map
                  </button>
                )}
              </div>

              <div className="event-modal-actions">
                <Button onClick={() => setViewEvent(null)}>Close</Button>
                <Button icon={<RadarChartOutlined />} onClick={() => setCheckinModalEvent(viewEvent)}>
                  Check-In Status
                </Button>
                <Button icon={<MessageOutlined />} onClick={() => setChatEvent(viewEvent)}>
                  {unreadCounts[viewEvent.id]
                    ? `Team Chat (${unreadCounts[viewEvent.id]})`
                    : "Team Chat"}
                </Button>
                <Button
                  icon={<ToolOutlined />}
                  onClick={() => setChecklistEvent(viewEvent)}
                  className={isWithinPrepWindow(viewEvent) ? "event-checklist-cta-urgent" : ""}
                >
                  Equipment Checklist
                </Button>
                <Button icon={<QrcodeOutlined />} onClick={() => setQrEvent(viewEvent)}>
                  Show QR
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => {
                    const selectedEvent = viewEvent;
                    setViewEvent(null);
                    openEdit(selectedEvent);
                  }}
                >
                  Edit Event
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>

        <Modal
          open={createOpen}
          onCancel={() => {
            setCreateOpen(false);
            setEditEvent(null);
          }}
          footer={null}
          width={700}
          title={null}
          centered
          className="event-modal"
        >
          <div className="event-modal-shell">
            <div className="event-modal-heading">
              <Avatar className="event-modal-avatar">
                <EditOutlined />
              </Avatar>
              <div>
                <Title level={3}>Edit Event</Title>
                <Text>Update the event details.</Text>
              </div>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSave}>
              <div className="event-form-grid">
                <Form.Item
                  name="name"
                  label="Event Name"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="John - Wedding" />
                </Form.Item>

                <Form.Item
                  name="customer"
                  label="Customer"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Apsi" />
                </Form.Item>

                <Form.Item
                  name="date"
                  label="Date"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Jun 16, 2026" />
                </Form.Item>

                <Form.Item
                  name="time"
                  label="Time"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="12:00 AM" />
                </Form.Item>

                <Form.Item name="type" label="Event Type">
                  <Select
                    options={eventTypes.map((t) => ({ value: t, label: t }))}
                  />
                </Form.Item>

                <Form.Item name="status" label="Status">
                  <Select
                    options={statuses.map((s) => ({ value: s, label: s }))}
                  />
                </Form.Item>

                <Form.Item name="pipeline" label="Stage">
                  <Select
                    options={["Converted", "Booked", "Proposal", "Delivered"].map(
                      (s) => ({ value: s, label: s })
                    )}
                  />
                </Form.Item>

                <Form.Item name="members" label="Assigned Members">
                  <Input type="number" min={0} />
                </Form.Item>

                <Form.Item name="budget" label="Budget">
                  <Input placeholder="INR 1.8L" />
                </Form.Item>

                <Form.Item
                  name="city"
                  label="City"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="coimbatore" />
                </Form.Item>

                <Form.Item
                  name="address"
                  label="Address"
                  rules={[{ required: true }]}
                  className="event-form-wide"
                >
                  <Input placeholder="mettupalayam" />
                </Form.Item>

                <Form.Item
                  name="image"
                  label="Image URL"
                  className="event-form-wide"
                >
                  <Input placeholder="https://..." />
                </Form.Item>
              </div>

              <div className="event-form-map-block">
                <span className="event-form-map-label">Venue Location on Map</span>
                {editEvent?.location ? (
                  <div className="event-form-map-set">
                    <a
                      className="event-map-thumb"
                      href={googleMapsUrl(editEvent.location.lat, editEvent.location.lng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={staticMapThumb(editEvent.location.lat, editEvent.location.lng, "500x150")}
                        alt="Venue location"
                        loading="lazy"
                      />
                      <span className="event-map-overlay">
                        <EnvironmentOutlined /> Tap to view exact location
                      </span>
                    </a>
                    <div className="event-map-meta">
                      <span className="event-map-coords">
                        {editEvent.location.lat.toFixed(6)}, {editEvent.location.lng.toFixed(6)}
                      </span>
                      <div className="event-map-actions">
                        <button
                          type="button"
                          className="event-map-edit"
                          onClick={() => openLocationPicker(editEvent.id)}
                        >
                          Change Pin
                        </button>
                        <button
                          type="button"
                          className="event-map-remove"
                          onClick={() => removeLocation(editEvent.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="event-map-add"
                    onClick={() => editEvent && openLocationPicker(editEvent.id)}
                  >
                    <EnvironmentOutlined /> Pin Venue on Map
                  </button>
                )}
              </div>

              <div className="event-modal-actions">
                <Button
                  onClick={() => {
                    setCreateOpen(false);
                    setEditEvent(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" icon={<EditOutlined />}>
                  Save Event
                </Button>
              </div>
            </Form>
          </div>
        </Modal>

        {showLocationPicker ? (
          <LocationPickerModal
            initialLocation={locationPickerInitial}
            onClose={() => {
              setShowLocationPicker(false);
              setLocationEventId(null);
            }}
            onSave={handleLocationSave}
          />
        ) : null}

        <EventQRModal event={qrEvent} onClose={() => setQrEvent(null)} />

        <CheckInStatusModal
          open={!!checkinModalEvent}
          eventId={checkinModalEvent?.id || null}
          eventName={checkinModalEvent?.name}
          venueLocation={checkinModalEvent?.location || null}
          onClose={() => setCheckinModalEvent(null)}
        />

        <EventThreadPanel
          event={chatEvent}
          onClose={() => setChatEvent(null)}
          user={user}
          onMessagesSeen={markEventRead}
          unreadAtOpen={chatEvent ? unreadCounts[chatEvent.id] || 0 : 0}
        />

        <EquipmentChecklistModal
          event={checklistEvent}
          onClose={() => setChecklistEvent(null)}
        />
      </main>
    </ConfigProvider>
  );
}

const InfoTile = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) => (
  <div className="event-info-tile">
    <span>{icon}</span>
    <small>{label}</small>
    <strong>{value}</strong>
  </div>
);