import {
  AuditLogState,
  AuditLogActionTypes,
  FETCH_AUDIT_LOGS_REQUEST, FETCH_AUDIT_LOGS_SUCCESS, FETCH_AUDIT_LOGS_FAILURE,
  FETCH_AUDIT_STATS_REQUEST, FETCH_AUDIT_STATS_SUCCESS, FETCH_AUDIT_STATS_FAILURE,
} from "../types/auditLogTypes";

const initialState: AuditLogState = {
  logs: [],
  total: 0,
  page: 1,
  pages: 1,
  loading: false,
  error: null,
  stats: null,
  statsLoading: false,
};

const auditLogReducer = (state = initialState, action: AuditLogActionTypes): AuditLogState => {
  switch (action.type) {
    case FETCH_AUDIT_LOGS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_AUDIT_LOGS_SUCCESS:
      return {
        ...state,
        loading: false,
        logs: action.payload.logs,
        total: action.payload.total,
        page: action.payload.page,
        pages: action.payload.pages,
      };

    case FETCH_AUDIT_LOGS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case FETCH_AUDIT_STATS_REQUEST:
      return { ...state, statsLoading: true };

    case FETCH_AUDIT_STATS_SUCCESS:
      return { ...state, statsLoading: false, stats: action.payload };

    case FETCH_AUDIT_STATS_FAILURE:
      return { ...state, statsLoading: false };

    default:
      return state;
  }
};

export default auditLogReducer;