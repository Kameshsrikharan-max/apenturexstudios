const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export interface CheckInStatusEntry {
  photographerEmail: string;
  photographerName?: string;
  submittedAt?: string;
  location?: { lat: number; lng: number };
  photo?: string | null;
}

export interface EventCheckInStatus {
  eventId: string;
  eventName?: string;
  totalPhotographers: number;
  checkedIn: CheckInStatusEntry[];
  pending: CheckInStatusEntry[];
  checkinStatus?: "not_sent" | "sent" | "expired";
  checkinEmailSentAt?: string | null;
  eventStartTs?: number | null;
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Lightweight, no photos — for badges on an event list/card grid. */
export async function fetchCheckInStatusForEvents(
  eventIds: string[]
): Promise<Record<string, EventCheckInStatus>> {
  if (!eventIds.length) return {};
  const res = await fetch(`${API_BASE}/checkins/status?eventIds=${eventIds.join(",")}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return {};
  const list: EventCheckInStatus[] = await res.json();
  const map: Record<string, EventCheckInStatus> = {};
  list.forEach((s) => {
    map[s.eventId] = s;
  });
  return map;
}

/** Full detail, photo included — for the check-in status modal. */
export async function fetchCheckInStatusForEvent(
  eventId: string
): Promise<EventCheckInStatus | null> {
  const res = await fetch(`${API_BASE}/checkins/status/${eventId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Admin manually re-sends the check-in email to one photographer. */
export async function resendCheckInEmail(
  eventId: string,
  photographerEmail: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/checkins/resend/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ photographerEmail }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, message: body?.message || "Resend failed." };
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error." };
  }
}