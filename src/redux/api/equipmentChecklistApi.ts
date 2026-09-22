const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res: Response) {
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchDefaultListApi() {
  const res = await fetch(`${API_BASE}/studio/equipment/default-list`, {
    headers: authHeaders(),
  });
  const body = await handle(res);
  return body.defaultList;
}

export async function saveDefaultListApi(items: any[]) {
  const res = await fetch(`${API_BASE}/studio/equipment/default-list`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  });
  const body = await handle(res);
  return body.defaultList;
}

export async function fetchChecklistApi(eventId: string) {
  const res = await fetch(`${API_BASE}/studio/events/${eventId}/equipment-checklist`, {
    headers: authHeaders(),
  });
  const body = await handle(res);
  return body.checklist;
}

export async function addChecklistItemApi(eventId: string, name: string, category: string) {
  const res = await fetch(`${API_BASE}/studio/events/${eventId}/equipment-checklist/items`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, category }),
  });
  const body = await handle(res);
  return body.checklist;
}

export async function removeChecklistItemApi(eventId: string, itemId: string) {
  const res = await fetch(
    `${API_BASE}/studio/events/${eventId}/equipment-checklist/items/${itemId}`,
    { method: "DELETE", headers: authHeaders() }
  );
  const body = await handle(res);
  return body.checklist;
}

export async function toggleChecklistItemApi(eventId: string, itemId: string, checked: boolean) {
  const res = await fetch(
    `${API_BASE}/studio/events/${eventId}/equipment-checklist/items/${itemId}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ checked }),
    }
  );
  const body = await handle(res);
  return body.checklist;
}