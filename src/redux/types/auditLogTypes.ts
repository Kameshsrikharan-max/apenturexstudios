export type AuditCategory = "auth" | "registration" | "delete_request" | "checkin" | "admin" | "system";
export type AuditOutcome = "success" | "failure";

export interface AuditLogEntry {
  _id: string;
  actorId: string | null;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: AuditCategory;
  summary: string;
  method: string;
  path: string;
  statusCode: number;
  outcome: AuditOutcome;
  targetType: string;
  targetId: string;
  meta: Record<string, unknown>;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLogFilters {
  category: "all" | AuditCategory;
  outcome: "all" | AuditOutcome;
  search: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  page: number;
  limit: number;
}

export interface AuditLogListResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pages: number;
}

export interface AuditStats {
  total: number;
  last24h: number;
  failures24h: number;
  byCategory: { category: string; count: number }[];
  topActors: { email: string; name: string; count: number }[];
  perDay: { date: string; count: number }[];
}

export interface AuditLogState {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
  stats: AuditStats | null;
  statsLoading: boolean;
}

export const FETCH_AUDIT_LOGS_REQUEST = "FETCH_AUDIT_LOGS_REQUEST";
export const FETCH_AUDIT_LOGS_SUCCESS = "FETCH_AUDIT_LOGS_SUCCESS";
export const FETCH_AUDIT_LOGS_FAILURE = "FETCH_AUDIT_LOGS_FAILURE";

export const FETCH_AUDIT_STATS_REQUEST = "FETCH_AUDIT_STATS_REQUEST";
export const FETCH_AUDIT_STATS_SUCCESS = "FETCH_AUDIT_STATS_SUCCESS";
export const FETCH_AUDIT_STATS_FAILURE = "FETCH_AUDIT_STATS_FAILURE";

// `[key: string]: unknown` keeps these assignable to Redux's UnknownAction.
export interface FetchAuditLogsRequestAction {
  type: typeof FETCH_AUDIT_LOGS_REQUEST;
  payload: AuditLogFilters;
  [key: string]: unknown;
}
export interface FetchAuditLogsSuccessAction {
  type: typeof FETCH_AUDIT_LOGS_SUCCESS;
  payload: AuditLogListResponse;
  [key: string]: unknown;
}
export interface FetchAuditLogsFailureAction {
  type: typeof FETCH_AUDIT_LOGS_FAILURE;
  payload: string;
  [key: string]: unknown;
}
export interface FetchAuditStatsRequestAction {
  type: typeof FETCH_AUDIT_STATS_REQUEST;
  [key: string]: unknown;
}
export interface FetchAuditStatsSuccessAction {
  type: typeof FETCH_AUDIT_STATS_SUCCESS;
  payload: AuditStats;
  [key: string]: unknown;
}
export interface FetchAuditStatsFailureAction {
  type: typeof FETCH_AUDIT_STATS_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export type AuditLogActionTypes =
  | FetchAuditLogsRequestAction
  | FetchAuditLogsSuccessAction
  | FetchAuditLogsFailureAction
  | FetchAuditStatsRequestAction
  | FetchAuditStatsSuccessAction
  | FetchAuditStatsFailureAction;