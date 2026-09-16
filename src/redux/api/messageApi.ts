import { Message } from "../types/messageTypes";

const API_BASE_URL = "http://localhost:4000";

const TOKEN_STORAGE_KEY = "token";

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseJsonOrThrow = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Request failed.");
  }
  return data;
};

export const fetchEventMessagesApi = async (eventId: string): Promise<Message[]> => {
  const res = await fetch(`${API_BASE_URL}/studio/messages/${eventId}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await parseJsonOrThrow(res);
  return data.messages as Message[];
};

export const sendEventMessageApi = async (
  eventId: string,
  text: string,
  attachments?: string[],
  mentions?: string[]
): Promise<Message> => {
  const res = await fetch(`${API_BASE_URL}/studio/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ eventId, text, attachments, mentions }),
  });
  const data = await parseJsonOrThrow(res);
  return data.message as Message;
};

export const editEventMessageApi = async (
  messageId: string,
  text: string
): Promise<Message> => {
  const res = await fetch(`${API_BASE_URL}/studio/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ text }),
  });
  const data = await parseJsonOrThrow(res);
  return data.message as Message;
};

export const deleteEventMessageApi = async (messageId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/studio/messages/${messageId}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });
  await parseJsonOrThrow(res);
};