import dayjs from "dayjs";
import {
  NotificationEvent,
  NotificationDetailItem,
  NotificationMeta,
  NotificationMetaMap,
} from "../types/notificationDetailTypes";

const EVENTS_KEY = "calendarEvents";
const META_KEY = "axsNotificationMeta";
const SIMULATED_LATENCY_MS = 300;

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
    // ignore quota / serialization errors
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
  };
};

const flattenEvents = (events: Record<string, any>): NotificationEvent[] => {
  return Object.entries(events).flatMap(([date, dayEvents]) => {
    if (!Array.isArray(dayEvents)) return [];
    return dayEvents.map((event, index) => normalizeEvent(event, date, index));
  });
};

// ===== Public API =====

export const fetchNotificationDataApi = async (): Promise<{
  events: NotificationEvent[];
  metaMap: NotificationMetaMap;
}> => {
  await delay(SIMULATED_LATENCY_MS);
  try {
    const events = flattenEvents(getSavedEvents());
    const metaMap = getAllMeta();
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
    return next;
  } catch {
    throw new Error("Unable to update notification.");
  }
};

export const deleteNotificationApi = async (id: string, date: string): Promise<string> => {
  await delay(200);
  try {
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