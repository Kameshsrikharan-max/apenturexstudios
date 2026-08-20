import {FETCH_NOTIFICATION_PREFS_REQUEST,FETCH_NOTIFICATION_PREFS_SUCCESS,FETCH_NOTIFICATION_PREFS_FAILURE,TOGGLE_NOTIFICATION_CHANNEL,SAVE_NOTIFICATION_PREFS_REQUEST,SAVE_NOTIFICATION_PREFS_SUCCESS,SAVE_NOTIFICATION_PREFS_FAILURE,RESET_NOTIFICATION_SAVED_FLAG,Channel,NotificationPrefsMap,FetchNotificationPrefsRequestAction,FetchNotificationPrefsSuccessAction,FetchNotificationPrefsFailureAction,ToggleNotificationChannelAction,SaveNotificationPrefsRequestAction,SaveNotificationPrefsSuccessAction,SaveNotificationPrefsFailureAction,ResetNotificationSavedFlagAction,
} from "../types/notificationTypes";

export const fetchNotificationPrefsRequest = (): FetchNotificationPrefsRequestAction => ({
  type: FETCH_NOTIFICATION_PREFS_REQUEST,
});

export const fetchNotificationPrefsSuccess = (
  payload: NotificationPrefsMap
): FetchNotificationPrefsSuccessAction => ({
  type: FETCH_NOTIFICATION_PREFS_SUCCESS,
  payload,
});

export const fetchNotificationPrefsFailure = (
  payload: string
): FetchNotificationPrefsFailureAction => ({
  type: FETCH_NOTIFICATION_PREFS_FAILURE,
  payload,
});

export const toggleNotificationChannel = (
  categoryKey: string,
  channel: Channel
): ToggleNotificationChannelAction => ({
  type: TOGGLE_NOTIFICATION_CHANNEL,
  payload: { categoryKey, channel },
});

export const saveNotificationPrefsRequest = (): SaveNotificationPrefsRequestAction => ({
  type: SAVE_NOTIFICATION_PREFS_REQUEST,
});

export const saveNotificationPrefsSuccess = (
  payload: NotificationPrefsMap
): SaveNotificationPrefsSuccessAction => ({
  type: SAVE_NOTIFICATION_PREFS_SUCCESS,
  payload,
});

export const saveNotificationPrefsFailure = (
  payload: string
): SaveNotificationPrefsFailureAction => ({
  type: SAVE_NOTIFICATION_PREFS_FAILURE,
  payload,
});

export const resetNotificationSavedFlag = (): ResetNotificationSavedFlagAction => ({
  type: RESET_NOTIFICATION_SAVED_FLAG,
});