export type Channel = "inApp" | "email";

export interface CategoryPref {
  inApp: boolean;
  email: boolean;
}

export type NotificationPrefsMap = Record<string, CategoryPref>;

export interface NotificationState {
  prefs: NotificationPrefsMap;
  savedPrefs: NotificationPrefsMap;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

export const FETCH_NOTIFICATION_PREFS_REQUEST = "FETCH_NOTIFICATION_PREFS_REQUEST";
export const FETCH_NOTIFICATION_PREFS_SUCCESS = "FETCH_NOTIFICATION_PREFS_SUCCESS";
export const FETCH_NOTIFICATION_PREFS_FAILURE = "FETCH_NOTIFICATION_PREFS_FAILURE";

export const TOGGLE_NOTIFICATION_CHANNEL = "TOGGLE_NOTIFICATION_CHANNEL";

export const SAVE_NOTIFICATION_PREFS_REQUEST = "SAVE_NOTIFICATION_PREFS_REQUEST";
export const SAVE_NOTIFICATION_PREFS_SUCCESS = "SAVE_NOTIFICATION_PREFS_SUCCESS";
export const SAVE_NOTIFICATION_PREFS_FAILURE = "SAVE_NOTIFICATION_PREFS_FAILURE";

export const RESET_NOTIFICATION_SAVED_FLAG = "RESET_NOTIFICATION_SAVED_FLAG";

export interface FetchNotificationPrefsRequestAction {
  type: typeof FETCH_NOTIFICATION_PREFS_REQUEST;
}
export interface FetchNotificationPrefsSuccessAction {
  type: typeof FETCH_NOTIFICATION_PREFS_SUCCESS;
  payload: NotificationPrefsMap;
}
export interface FetchNotificationPrefsFailureAction {
  type: typeof FETCH_NOTIFICATION_PREFS_FAILURE;
  payload: string;
}

export interface ToggleNotificationChannelAction {
  type: typeof TOGGLE_NOTIFICATION_CHANNEL;
  payload: { categoryKey: string; channel: Channel };
}

export interface SaveNotificationPrefsRequestAction {
  type: typeof SAVE_NOTIFICATION_PREFS_REQUEST;
}
export interface SaveNotificationPrefsSuccessAction {
  type: typeof SAVE_NOTIFICATION_PREFS_SUCCESS;
  payload: NotificationPrefsMap;
}
export interface SaveNotificationPrefsFailureAction {
  type: typeof SAVE_NOTIFICATION_PREFS_FAILURE;
  payload: string;
}

export interface ResetNotificationSavedFlagAction {
  type: typeof RESET_NOTIFICATION_SAVED_FLAG;
}

export type NotificationActionTypes =
  | FetchNotificationPrefsRequestAction
  | FetchNotificationPrefsSuccessAction
  | FetchNotificationPrefsFailureAction
  | ToggleNotificationChannelAction
  | SaveNotificationPrefsRequestAction
  | SaveNotificationPrefsSuccessAction
  | SaveNotificationPrefsFailureAction
  | ResetNotificationSavedFlagAction;