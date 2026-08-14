import { call, put, takeLatest, select } from "redux-saga/effects";
import {
  FETCH_NOTIFICATION_PREFS_REQUEST,
  SAVE_NOTIFICATION_PREFS_REQUEST,
  NotificationPrefsMap,
} from "../types/notificationTypes";
import {
  fetchNotificationPrefsSuccess,
  fetchNotificationPrefsFailure,
  saveNotificationPrefsSuccess,
  saveNotificationPrefsFailure,
} from "../actions/notificationActions";
import { fetchNotificationPrefsApi, saveNotificationPrefsApi } from "../api/notificationApi";

interface RootState {
  notification: { prefs: NotificationPrefsMap };
}

function* fetchNotificationPrefsWorker() {
  try {
    const prefs: NotificationPrefsMap = yield call(fetchNotificationPrefsApi);
    yield put(fetchNotificationPrefsSuccess(prefs));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch notification preferences.";
    yield put(fetchNotificationPrefsFailure(message));
  }
}

function* saveNotificationPrefsWorker() {
  try {
    const currentPrefs: NotificationPrefsMap = yield select(
      (state: RootState) => state.notification.prefs
    );
    const saved: NotificationPrefsMap = yield call(saveNotificationPrefsApi, currentPrefs);
    yield put(saveNotificationPrefsSuccess(saved));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save notification preferences.";
    yield put(saveNotificationPrefsFailure(message));
  }
}

export function* notificationSaga() {
  yield takeLatest(FETCH_NOTIFICATION_PREFS_REQUEST, fetchNotificationPrefsWorker);
  yield takeLatest(SAVE_NOTIFICATION_PREFS_REQUEST, saveNotificationPrefsWorker);
}