import { call, put, takeLatest } from "redux-saga/effects";
import {FETCH_AUDIT_LOGS_REQUEST,FETCH_AUDIT_STATS_REQUEST,FetchAuditLogsRequestAction,AuditLogListResponse,AuditStats,} from "../types/auditLogTypes";
import {fetchAuditLogsSuccess,fetchAuditLogsFailure,fetchAuditStatsSuccess,fetchAuditStatsFailure,} from "../actions/auditLogActions";
import { fetchAuditLogsApi, fetchAuditStatsApi } from "../api/auditLogApi";

function* fetchAuditLogsWorker(action: FetchAuditLogsRequestAction) {
  try {
    const data: AuditLogListResponse = yield call(fetchAuditLogsApi, action.payload);
    yield put(fetchAuditLogsSuccess(data));
  } catch (err) {
    yield put(fetchAuditLogsFailure(err instanceof Error ? err.message : "Failed to load audit logs."));
  }
}

function* fetchAuditStatsWorker() {
  try {
    const data: AuditStats = yield call(fetchAuditStatsApi);
    yield put(fetchAuditStatsSuccess(data));
  } catch (err) {
    yield put(fetchAuditStatsFailure(err instanceof Error ? err.message : "Failed to load stats."));
  }
}

export function* auditLogSaga() {
  yield takeLatest(FETCH_AUDIT_LOGS_REQUEST, fetchAuditLogsWorker);
  yield takeLatest(FETCH_AUDIT_STATS_REQUEST, fetchAuditStatsWorker);
}