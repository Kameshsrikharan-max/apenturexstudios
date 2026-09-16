import { useCallback, useEffect, useRef, useState } from "react";

export type AssignmentNotificationPayload = {
  eventName?: string;
  role?: string;
  venue?: string;
  assignedBy?: string;
};

export type AssignmentNotification = {
  id: string;
  notifCategory: string;
  category: string;
  title: string;
  date: string;
  time?: string;
  priority: string;
  triggeredBy: string;
  description: string;
  tags: string[];
  isActionable: boolean;
  extraDetails: any[];
  eventId?: string;
  read: boolean;
  payload?: AssignmentNotificationPayload;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";
const POLL_INTERVAL_MS = 30000;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Maps a Mongo notification doc (_id, camelCase fields) onto the shape the
// UI already expects (id). Previously dropped `payload` entirely, which is
// why eventName/role/venue/assignedBy never showed up anywhere this hook's
// data was displayed.
const mapNotification = (raw: any): AssignmentNotification => ({
  id: raw._id || raw.id,
  notifCategory: raw.notifCategory,
  category: raw.category,
  title: raw.title,
  date: raw.date,
  time: raw.time,
  priority: raw.priority,
  triggeredBy: raw.triggeredBy,
  description: raw.description,
  tags: raw.tags || [],
  isActionable: Boolean(raw.isActionable),
  extraDetails: raw.extraDetails || [],
  eventId: raw.eventId || undefined,
  read: Boolean(raw.read),
  payload: raw.payload || undefined,
});

export function useAssignmentNotifications(enabled: boolean = true) {
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/studio/notifications`, {
        headers: authHeaders(),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) return;
      setNotifications((body.notifications || []).map(mapNotification));
    } catch {
      /* silent — bell just shows whatever it already had */
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled, refresh]);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`${API_BASE}/studio/notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeaders(),
      });
    } catch {
      /* optimistic update stands even if the sync call fails */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch(`${API_BASE}/studio/notifications/read-all`, {
        method: "PATCH",
        headers: authHeaders(),
      });
    } catch {
      /* optimistic update stands even if the sync call fails */
    }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    try {
      await fetch(`${API_BASE}/studio/notifications`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch {
      /* optimistic update stands even if the sync call fails */
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead, clearAll };
}

/* One-shot helper used by TeamAssignmentPage to push a new notification to a
   specific photographer at the moment they're assigned. */
export async function pushAssignmentNotification(payload: {
  recipientEmail: string;
  eventId?: string;
  eventName?: string;
  eventDateKey: string;
  eventTime?: string;
  assignRole: string;
  service?: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/studio/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        recipientEmail: payload.recipientEmail,
        notifCategory: "eventAssignment",
        category: "Event Assignment",
        title: payload.eventName
          ? `You've been assigned to "${payload.eventName}"`
          : "You've been assigned to a new event",
        date: payload.eventDateKey,
        time: payload.eventTime || "",
        priority: "high",
        description: `You've been assigned as ${payload.assignRole}${
          payload.service ? ` for ${payload.service}` : ""
        } on ${payload.eventDateKey}.`,
        tags: [payload.assignRole, payload.service].filter(Boolean),
        isActionable: false,
        extraDetails: [],
        eventId: payload.eventId,
      }),
    });
    const body = await response.json().catch(() => null);
    return response.ok && !!body?.success;
  } catch {
    return false;
  }
}