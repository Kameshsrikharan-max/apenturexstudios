import dayjs from "dayjs";
import {NotificationEvent,NotificationDetailItem,NotificationMeta,NotificationMetaMap,} from "../types/notificationDetailTypes";
import { getStoredNotifications, deleteStoredNotification } from "../../utils/notificationStore";

const EVENTS_KEY = "calendarEvents";
const META_KEY = "axsNotificationMeta";
const SIMULATED_LATENCY_MS = 300;

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";
// Backend-sourced notification ids (from /studio/notifications) are prefixed
// with this so update/delete calls know to hit the real API instead of
// treating the id as a local calendar-event or axsNotifications entry.
const BACKEND_ID_PREFIX = "backend-";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const DEFAULT_META: NotificationMeta = {
  read: false,
  pinned: false,
  viewedAt: null,
  decision: null,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getSavedEvents = (): Record<string, any> => {
  try {
    const saved = localStorage.getItem(EVENTS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const getAllMeta = (): NotificationMetaMap => {
  try {
    const saved = localStorage.getItem(META_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const persistMeta = (all: NotificationMetaMap) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(all));
  } catch {
  }
};

const KNOWN_KEYS = new Set([
  "id","title","name","event","time","startTime","description","note",
  "category","type","eventType","triggeredBy","createdBy","organizer",
  "owner","priority","tags","requiresApproval",
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
    date, title, time, description, category, triggeredBy, priority, tags, isActionable, extraDetails,
    notifCategory: "eventAssignment",
    payload: {
      eventName: title,
      role: category,
      venue: isObject ? raw.venue || raw.location || undefined : undefined,
      assignedBy: triggeredBy,
    },
  };
};

const flattenEvents = (events: Record<string, any>): NotificationEvent[] => {
  return Object.entries(events).flatMap(([date, dayEvents]) => {
    if (!Array.isArray(dayEvents)) return [];
    return dayEvents.map((event, index) => normalizeEvent(event, date, index));
  });
};

// Maps a raw backend notification doc (from GET /studio/notifications) onto
// the NotificationEvent shape this page/its categoryConfig expects. Ids are
// prefixed so update/delete calls below can route them back to the backend
// instead of treating them as local calendar/axsNotifications entries.
const normalizeBackendNotification = (raw: any): NotificationEvent => {
  const rawId = raw._id || raw.id;
  return {
    id: `${BACKEND_ID_PREFIX}${rawId}`,
    date: raw.date,
    title: raw.title,
    time: raw.time || "",
    description: raw.description || "",
    category: raw.category || "General",
    triggeredBy: raw.triggeredBy || "AXS System",
    priority: raw.priority || "medium",
    tags: raw.tags || [],
    isActionable: Boolean(raw.isActionable),
    extraDetails: raw.extraDetails || [],
    notifCategory: raw.notifCategory,
    // Passed straight through — this is the eventName/role/venue/assignedBy
    // shape TeamAssignmentPage's pushEventAssignmentNotification sends, and
    // what notificationCategoryConfig's eventAssignment.getPayloadFields
    // expects to read.
    payload: raw.payload || undefined,
  } as NotificationEvent;
};

const fetchBackendNotifications = async (): Promise<{ events: NotificationEvent[]; readMap: Record<string, boolean> }> => {
  try {
    const response = await fetch(`${API_BASE}/studio/notifications`, {
      headers: authHeaders(),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) return { events: [], readMap: {} };

    const raw: any[] = body.notifications || [];
    const events = raw.map(normalizeBackendNotification);
    const readMap: Record<string, boolean> = {};
    raw.forEach((item) => {
      readMap[`${BACKEND_ID_PREFIX}${item._id || item.id}`] = Boolean(item.read);
    });
    return { events, readMap };
  } catch {
    // Bell/list just falls back to local-only sources if the backend call fails.
    return { events: [], readMap: {} };
  }
};

// ===== Public API =====

export const fetchNotificationDataApi = async (): Promise<{
  events: NotificationEvent[];
  metaMap: NotificationMetaMap;
}> => {
  await delay(SIMULATED_LATENCY_MS);
  try {
    const calendarEvents = flattenEvents(getSavedEvents());
    const genericNotifications = getStoredNotifications();
    const { events: backendEvents, readMap } = await fetchBackendNotifications();

    const events = [
      ...backendEvents,
      ...genericNotifications,
      ...calendarEvents.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()),
    ];

    const metaMap = getAllMeta();

    // Seed local meta for backend items the user hasn't opened via this page
    // yet, so "Read"/"Unread" reflects the backend's own read state on first
    // load instead of always defaulting to unread.
    let metaChanged = false;
    Object.entries(readMap).forEach(([id, read]) => {
      if (!metaMap[id]) {
        metaMap[id] = { ...DEFAULT_META, read };
        metaChanged = true;
      }
    });
    if (metaChanged) persistMeta(metaMap);

    return { events, metaMap };
  } catch {
    throw new Error("Unable to load notifications.");
  }
};

export const updateNotificationMetaApi = async (
  id: string,
  patch: Partial<NotificationMeta>
): Promise<NotificationMeta> => {
  await delay(150);
  try {
    const all = getAllMeta();
    const current = all[id] || DEFAULT_META;
    const next: NotificationMeta = { ...current, ...patch };
    all[id] = next;
    persistMeta(all);

    // Keep the backend's own read flag in sync too, so the Navbar bell
    // (which reads straight from the backend via useAssignmentNotifications)
    // agrees with what this page shows.
    if (id.startsWith(BACKEND_ID_PREFIX) && patch.read !== undefined) {
      const realId = id.slice(BACKEND_ID_PREFIX.length);
      try {
        await fetch(`${API_BASE}/studio/notifications/${realId}/read`, {
          method: "PATCH",
          headers: authHeaders(),
        });
      } catch {
        // Local meta update still stands even if the backend sync fails.
      }
    }

    return next;
  } catch {
    throw new Error("Unable to update notification.");
  }
};

export const deleteNotificationApi = async (id: string, date: string): Promise<string> => {
  await delay(200);
  try {
    if (id.startsWith(BACKEND_ID_PREFIX)) {
      const realId = id.slice(BACKEND_ID_PREFIX.length);
      try {
        await fetch(`${API_BASE}/studio/notifications/${realId}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
      } catch {
        // Fall through — local meta entry (if any) is still cleaned up below.
      }
      const all = getAllMeta();
      if (all[id]) {
        delete all[id];
        persistMeta(all);
      }
      return id;
    }

    if (id.startsWith("notif-")) {
      deleteStoredNotification(id);
      return id;
    }

    const stored = getSavedEvents();
    const dayEvents = stored[date];
    if (Array.isArray(dayEvents)) {
      const filtered = dayEvents.filter((raw: any, index: number) => {
        const normalized = normalizeEvent(raw, date, index);
        return normalized.id !== id;
      });
      if (filtered.length > 0) {
        stored[date] = filtered;
      } else {
        delete stored[date];
      }
      localStorage.setItem(EVENTS_KEY, JSON.stringify(stored));
    }
    return id;
  } catch {
    throw new Error("Unable to delete notification.");
  }
};