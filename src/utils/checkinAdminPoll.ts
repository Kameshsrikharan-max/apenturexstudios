import { pushNotification } from "./notificationStore";

const SEEN_KEY = "axsSeenCheckinIds";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface RawCheckIn {
  _id: string;
  photographerName?: string;
  photographerEmail: string;
  submittedAt: string;
  location?: { lat: number; lng: number };
  eventId?: { name?: string } | null;
}

const getSeenIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
};

const markSeen = (ids: string[]) => {
  const existing = getSeenIds();
  const merged = [...existing, ...ids];
  // keep only the most recent 500 so this never grows unbounded
  localStorage.setItem(SEEN_KEY, JSON.stringify(merged.slice(-500)));
};

/**
 * Call this on an interval (e.g. every 60s) from wherever studio_admin /
 * super_admin land after login — a Dashboard layout effect is the natural
 * spot. Safe to call repeatedly; already-seen check-ins are skipped.
 */
export async function pollCheckinNotifications(authToken: string) {
  try {
    const res = await fetch(`${API_BASE}/api/checkins/recent`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return;

    const checkins: RawCheckIn[] = await res.json();
    const seen = new Set(getSeenIds());
    const fresh = checkins.filter((c) => !seen.has(c._id));
    if (!fresh.length) return;

    fresh.forEach((c) => {
      pushNotification({
        title: `${c.photographerName || c.photographerEmail} checked in`,
        notifCategory: "photographerCheckIn",
        category: "Photographer Check-In",
        description: `Checked in for ${c.eventId?.name || "an event"}`,
        priority: "medium",
        isActionable: false,
        payload: {
          eventName: c.eventId?.name,
          photographerName: c.photographerName || c.photographerEmail,
          arrivedAt: new Date(c.submittedAt).toLocaleString(),
          location: c.location ? `${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}` : undefined,
        },
      });
    });

    markSeen(fresh.map((c) => c._id));
  } catch {
    // silent — next poll retries; this is a best-effort in-app supplement to the email alert
  }
}

/**
 * Wiring example (e.g. in your Dashboard layout, for studio_admin/super_admin only):
 *
 *   useEffect(() => {
 *     if (!["studio_admin", "super_admin"].includes(currentUser.role)) return;
 *     pollCheckinNotifications(authToken);
 *     const id = setInterval(() => pollCheckinNotifications(authToken), 60000);
 *     return () => clearInterval(id);
 *   }, [authToken, currentUser.role]);
 */