import { call, put, select, takeLatest } from "redux-saga/effects";
import {REQUEST_ACCOUNT_DELETE_REQUEST,FETCH_PENDING_DELETE_REQUESTS_REQUEST,APPROVE_DELETE_REQUEST_REQUEST,REJECT_DELETE_REQUEST_REQUEST,RequestAccountDeleteRequestAction,ApproveDeleteRequestRequestAction,RejectDeleteRequestRequestAction,PendingDeleteUser,} from "../types/deleteRequestTypes";
import {requestAccountDeleteSuccess,requestAccountDeleteFailure,fetchPendingDeleteRequestsSuccess,fetchPendingDeleteRequestsFailure,approveDeleteRequestSuccess,approveDeleteRequestFailure,rejectDeleteRequestSuccess,rejectDeleteRequestFailure,} from "../actions/deleteRequestActions";
import {requestAccountDeleteApi,fetchPendingDeleteRequestsApi,approveDeleteRequestApi,rejectDeleteRequestApi,} from "../api/deleteRequestApi";
import { pushNotification } from "../../utils/notificationStore";

const selectCurrentUser = (state: any): { email?: string; identifier?: string; name?: string } =>
  state?.auth?.user || {};

function getRequesterLabel(user: { email?: string; identifier?: string; name?: string }): string {
  if (user.name) return user.name;
  if (user.email) return user.email;
  if (user.identifier) return user.identifier;
  return "A user";
}

function* requestAccountDeleteWorker(action: RequestAccountDeleteRequestAction) {
  try {
    yield call(requestAccountDeleteApi, action.payload.reason);
    yield put(requestAccountDeleteSuccess());

    const currentUser: { email?: string; identifier?: string; name?: string } = yield select(
      selectCurrentUser
    );
    const requesterLabel = getRequesterLabel(currentUser);

    
    pushNotification({
      title: `${requesterLabel} requested account deletion`,
      notifCategory: "deleteRequest",
      category: "Account",
      priority: "high",
      triggeredBy: requesterLabel,
      description: action.payload.reason || "No reason was provided.",
      tags: ["account", "deletion"],
      isActionable: false,
      payload: {
        targetType: "User Account",
        targetName: requesterLabel,
        reason: action.payload.reason,
        requestedBy: requesterLabel,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit delete request.";
    yield put(requestAccountDeleteFailure(message));
  }
}

function* fetchPendingDeleteRequestsWorker() {
  try {
    const users: PendingDeleteUser[] = yield call(fetchPendingDeleteRequestsApi);
    yield put(fetchPendingDeleteRequestsSuccess(users));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch pending delete requests.";
    yield put(fetchPendingDeleteRequestsFailure(message));
  }
}

function* approveDeleteRequestWorker(action: ApproveDeleteRequestRequestAction) {
  try {
    yield call(approveDeleteRequestApi, action.payload.userId);
    yield put(approveDeleteRequestSuccess(action.payload.userId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve delete request.";
    yield put(approveDeleteRequestFailure(message));
  }
}

function* rejectDeleteRequestWorker(action: RejectDeleteRequestRequestAction) {
  try {
    yield call(rejectDeleteRequestApi, action.payload.userId);
    yield put(rejectDeleteRequestSuccess(action.payload.userId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reject delete request.";
    yield put(rejectDeleteRequestFailure(message));
  }
}

export function* deleteRequestSaga() {
  yield takeLatest(REQUEST_ACCOUNT_DELETE_REQUEST, requestAccountDeleteWorker);
  yield takeLatest(FETCH_PENDING_DELETE_REQUESTS_REQUEST, fetchPendingDeleteRequestsWorker);
  yield takeLatest(APPROVE_DELETE_REQUEST_REQUEST, approveDeleteRequestWorker);
  yield takeLatest(REJECT_DELETE_REQUEST_REQUEST, rejectDeleteRequestWorker);
}