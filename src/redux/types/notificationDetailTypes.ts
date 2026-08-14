export type NotificationDetailItem = { label: string; value: string };

export type NotificationEvent = {
  id: string;
  date: string;
  title: string;
  time: string;
  description: string;
  category: string;
  triggeredBy: string;
  priority: "high" | "medium" | "low";
  tags: string[];
  isActionable: boolean;
  extraDetails: NotificationDetailItem[];
};

export type NotificationMeta = {
  read: boolean;
  pinned: boolean;
  viewedAt: string | null;
  decision: "approved" | "declined" | null;
};

export type NotificationMetaMap = Record<string, NotificationMeta>;

export interface NotificationDetailState {
  events: NotificationEvent[];
  metaMap: NotificationMetaMap;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
}

// ===== Action Types =====
export const FETCH_NOTIFICATION_DATA_REQUEST = "FETCH_NOTIFICATION_DATA_REQUEST";
export const FETCH_NOTIFICATION_DATA_SUCCESS = "FETCH_NOTIFICATION_DATA_SUCCESS";
export const FETCH_NOTIFICATION_DATA_FAILURE = "FETCH_NOTIFICATION_DATA_FAILURE";

export const UPDATE_NOTIFICATION_META_REQUEST = "UPDATE_NOTIFICATION_META_REQUEST";
export const UPDATE_NOTIFICATION_META_SUCCESS = "UPDATE_NOTIFICATION_META_SUCCESS";
export const UPDATE_NOTIFICATION_META_FAILURE = "UPDATE_NOTIFICATION_META_FAILURE";

export const DELETE_NOTIFICATION_REQUEST = "DELETE_NOTIFICATION_REQUEST";
export const DELETE_NOTIFICATION_SUCCESS = "DELETE_NOTIFICATION_SUCCESS";
export const DELETE_NOTIFICATION_FAILURE = "DELETE_NOTIFICATION_FAILURE";

// ===== Action Interfaces =====
export interface FetchNotificationDataRequestAction {
  type: typeof FETCH_NOTIFICATION_DATA_REQUEST;
}
export interface FetchNotificationDataSuccessAction {
  type: typeof FETCH_NOTIFICATION_DATA_SUCCESS;
  payload: { events: NotificationEvent[]; metaMap: NotificationMetaMap };
}
export interface FetchNotificationDataFailureAction {
  type: typeof FETCH_NOTIFICATION_DATA_FAILURE;
  payload: string;
}

export interface UpdateNotificationMetaRequestAction {
  type: typeof UPDATE_NOTIFICATION_META_REQUEST;
  payload: { id: string; patch: Partial<NotificationMeta> };
}
export interface UpdateNotificationMetaSuccessAction {
  type: typeof UPDATE_NOTIFICATION_META_SUCCESS;
  payload: { id: string; meta: NotificationMeta };
}
export interface UpdateNotificationMetaFailureAction {
  type: typeof UPDATE_NOTIFICATION_META_FAILURE;
  payload: string;
}

export interface DeleteNotificationRequestAction {
  type: typeof DELETE_NOTIFICATION_REQUEST;
  payload: { id: string; date: string };
}
export interface DeleteNotificationSuccessAction {
  type: typeof DELETE_NOTIFICATION_SUCCESS;
  payload: { id: string };
}
export interface DeleteNotificationFailureAction {
  type: typeof DELETE_NOTIFICATION_FAILURE;
  payload: string;
}

export type NotificationDetailActionTypes =
  | FetchNotificationDataRequestAction
  | FetchNotificationDataSuccessAction
  | FetchNotificationDataFailureAction
  | UpdateNotificationMetaRequestAction
  | UpdateNotificationMetaSuccessAction
  | UpdateNotificationMetaFailureAction
  | DeleteNotificationRequestAction
  | DeleteNotificationSuccessAction
  | DeleteNotificationFailureAction;