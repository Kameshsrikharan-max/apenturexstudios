import {
  FETCH_AUDIT_LOGS_REQUEST, FETCH_AUDIT_LOGS_SUCCESS, FETCH_AUDIT_LOGS_FAILURE,
  FETCH_AUDIT_STATS_REQUEST, FETCH_AUDIT_STATS_SUCCESS, FETCH_AUDIT_STATS_FAILURE,
  AuditLogFilters, AuditLogListResponse, AuditStats,
  FetchAuditLogsRequestAction, FetchAuditLogsSuccessAction, FetchAuditLogsFailureAction,
  FetchAuditStatsRequestAction, FetchAuditStatsSuccessAction, FetchAuditStatsFailureAction,
} from "../types/auditLogTypes";

export const fetchAuditLogsRequest = (payload: AuditLogFilters): FetchAuditLogsRequestAction => ({
  type: FETCH_AUDIT_LOGS_REQUEST,
  payload,
});

export const fetchAuditLogsSuccess = (payload: AuditLogListResponse): FetchAuditLogsSuccessAction => ({
  type: FETCH_AUDIT_LOGS_SUCCESS,
  payload,
});

export const fetchAuditLogsFailure = (payload: string): FetchAuditLogsFailureAction => ({
  type: FETCH_AUDIT_LOGS_FAILURE,
  payload,
});

export const fetchAuditStatsRequest = (): FetchAuditStatsRequestAction => ({
  type: FETCH_AUDIT_STATS_REQUEST,
});

export const fetchAuditStatsSuccess = (payload: AuditStats): FetchAuditStatsSuccessAction => ({
  type: FETCH_AUDIT_STATS_SUCCESS,
  payload,
});

export const fetchAuditStatsFailure = (payload: string): FetchAuditStatsFailureAction => ({
  type: FETCH_AUDIT_STATS_FAILURE,
  payload,
});