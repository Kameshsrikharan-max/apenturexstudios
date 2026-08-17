export interface QrEventPayload {
  id: string;
  name: string;
  type: string;
  date: string;
  time: string;
  address: string;
  city: string;
  customer: string;
  status: string;
  pipeline: string;
  members: number;
  budget: string;
  image?: string;
  location?: { lat: number; lng: number } | null;
}

export const encodeEventForQr = (event: any): string => {
  const payload: QrEventPayload = {
    id: event.id,
    name: event.name,
    type: event.type,
    date: event.date,
    time: event.time,
    address: event.address,
    city: event.city,
    customer: event.customer,
    status: event.status,
    pipeline: event.pipeline,
    members: event.members,
    budget: event.budget,
    image: event.image,
    location: event.location || null,
  };

  const json = JSON.stringify(payload);
  return window.btoa(unescape(encodeURIComponent(json)));
};

export const decodeEventFromQr = (encoded: string): QrEventPayload | null => {
  try {
    const json = decodeURIComponent(escape(window.atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const buildEventQrUrl = (event: any): string => {
  const encoded = encodeEventForQr(event);
  const origin = window.location.origin;
  return `${origin}/events/public?data=${encoded}`;
};