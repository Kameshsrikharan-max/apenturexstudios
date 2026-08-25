import {NotificationEvent,NotificationCategoryKey,NotificationPayload,} from "../redux/types/notificationDetailTypes";

const NOTIFICATIONS_KEY = "axsNotifications";
export const NOTIFICATIONS_UPDATED_EVENT = "axsNotificationsUpdated";

export interface NewNotificationInput {
  title: string;
  notifCategory: NotificationCategoryKey;
  category?: string;
  date?: string;
  time?: string;
  description?: string;
  triggeredBy?: string;
  priority?: "high" | "medium" | "low";
  tags?: string[];
  isActionable?: boolean;
  payload?: NotificationPayload;
}

const getStoredRaw = (): NotificationEvent[] => {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const persistStored = (list: NotificationEvent[]) => {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
  } catch {
    
  }
};

const notifyUpdated = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
};


export const getStoredNotifications = (): NotificationEvent[] => getStoredRaw();

export const pushNotification = (input: NewNotificationInput): NotificationEvent => {
  const now = new Date();
  const id = `notif-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;

  const entry: NotificationEvent = {
    id,
    date: input.date || now.toISOString().slice(0, 10),
    title: input.title,
    time:
      input.time ||
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    description: input.description || "",
    category: input.category || "General",
    triggeredBy: input.triggeredBy || "AXS System",
    priority: input.priority || "medium",
    tags: input.tags || [],
    isActionable: input.isActionable ?? false,
    extraDetails: [],
    notifCategory: input.notifCategory,
    payload: input.payload,
  };

  const list = getStoredRaw();
  list.unshift(entry);
  persistStored(list);
  notifyUpdated();
  return entry;
};

export const deleteStoredNotification = (id: string): boolean => {
  const list = getStoredRaw();
  const filtered = list.filter((item) => item.id !== id);
  const changed = filtered.length !== list.length;
  if (changed) {
    persistStored(filtered);
    notifyUpdated();
  }
  return changed;
};

export const updateStoredNotification = (
  id: string,
  patch: Partial<NotificationEvent>
): NotificationEvent | null => {
  const list = getStoredRaw();
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  persistStored(list);
  notifyUpdated();
  return list[idx];
};