import { PendingRegistration, RegistrationType } from "../types/registrationApprovalTypes";

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

export const fetchPendingRegistrationsApi = async (): Promise<PendingRegistration[]> => {
  const res = await fetch(`${API_BASE_URL}/admin/registrations`, {
    method: "GET",
    headers: { ...getAuthHeaders() },
  });
  const data = await parseJsonOrThrow(res);
  return data.registrations as PendingRegistration[];
};

export const approveRegistrationApi = async (
  type: RegistrationType,
  profileId: string
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/registrations/${type}/${profileId}/approve`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  });
  await parseJsonOrThrow(res);
};

export const rejectRegistrationApi = async (
  type: RegistrationType,
  profileId: string
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/admin/registrations/${type}/${profileId}/reject`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  });
  await parseJsonOrThrow(res);
};