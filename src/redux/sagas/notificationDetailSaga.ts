import { call, put, takeLatest } from "redux-saga/effects";
import {
  FETCH_NOTIFICATION_DATA_REQUEST,
  UPDATE_NOTIFICATION_META_REQUEST,
  DELETE_NOTIFICATION_REQUEST,
  UpdateNotificationMetaRequestAction,
  DeleteNotificationRequestAction,
  NotificationEvent,
  NotificationMeta,
  NotificationMetaMap,
} from "../types/notificationDetailTypes";
import {
  fetchNotificationDataSuccess,
  fetchNotificationDataFailure,
  updateNotificationMetaSuccess,
  updateNotificationMetaFailure,
  deleteNotificationSuccess,
  deleteNotificationFailure,
} from "../actions/notificationDetailActions";
import {
  fetchNotificationDataApi,
  updateNotificationMetaApi,
  deleteNotificationApi,
} from "../api/notificationDetailApi";

function* fetchNotificationDataWorker() {
  try {
    const result: { events: NotificationEvent[]; metaMap: NotificationMetaMap } = yield call(
      fetchNotificationDataApi
    );
    yield put(fetchNotificationDataSuccess(result.events, result.metaMap));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notifications.";
    yield put(fetchNotificationDataFailure(message));
  }
}

function* updateNotificationMetaWorker(action: UpdateNotificationMetaRequestAction) {
  try {
    const { id, patch } = action.payload;
    const meta: NotificationMeta = yield call(updateNotificationMetaApi, id, patch);
    yield put(updateNotificationMetaSuccess(id, meta));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update notification.";
    yield put(updateNotificationMetaFailure(message));
  }
}

function* deleteNotificationWorker(action: DeleteNotificationRequestAction) {
  try {
    const { id, date } = action.payload;
    yield call(deleteNotificationApi, id, date);
    yield put(deleteNotificationSuccess(id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete notification.";
    yield put(deleteNotificationFailure(message));
  }
}

export function* notificationDetailSaga() {
  yield takeLatest(FETCH_NOTIFICATION_DATA_REQUEST, fetchNotificationDataWorker);
  yield takeLatest(UPDATE_NOTIFICATION_META_REQUEST, updateNotificationMetaWorker);
  yield takeLatest(DELETE_NOTIFICATION_REQUEST, deleteNotificationWorker);
}