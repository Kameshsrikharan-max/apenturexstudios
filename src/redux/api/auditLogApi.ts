import { AuditLogFilters, AuditLogListResponse, AuditStats } from "../types/auditLogTypes";

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

export const fetchAuditLogsApi = async (filters: AuditLogFilters): Promise<AuditLogListResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.outcome !== "all") params.set("outcome", filters.outcome);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.from) params.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) params.set("to", new Date(`${filters.to}T23:59:59.999`).toISOString());

  const res = await fetch(`${API_BASE_URL}/admin/audit-logs?${params.toString()}`, {
    method: "GET",
    headers: { ...getAuthHeaders() },
  });
  const data = await parseJsonOrThrow(res);
  return data as AuditLogListResponse;
};

export const fetchAuditStatsApi = async (): Promise<AuditStats> => {
  const res = await fetch(`${API_BASE_URL}/admin/audit-logs/stats`, {
    method: "GET",
    headers: { ...getAuthHeaders() },
  });
  const data = await parseJsonOrThrow(res);
  return data as AuditStats;
};