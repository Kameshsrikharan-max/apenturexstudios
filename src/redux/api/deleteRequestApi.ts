import { PendingDeleteUser } from "../types/deleteRequestTypes";

// TODO: move to an env var (e.g. import.meta.env.VITE_API_BASE_URL) once one exists.
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

export const requestAccountDeleteApi = async (reason: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/account/delete-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ reason }),
  });
  await parseJsonOrThrow(res);
};

export const fetchPendingDeleteRequestsApi = async (): Promise<PendingDeleteUser[]> => {
  const res = await fetch(`${API_BASE_URL}/admin/delete-requests`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await parseJsonOrThrow(res);
  return data.users as PendingDeleteUser[];
};

export const approveDeleteRequestApi = async (userId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/delete-requests/${userId}/approve`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
  });
  await parseJsonOrThrow(res);
};

export const rejectDeleteRequestApi = async (userId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/delete-requests/${userId}/reject`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
  });
  await parseJsonOrThrow(res);
};