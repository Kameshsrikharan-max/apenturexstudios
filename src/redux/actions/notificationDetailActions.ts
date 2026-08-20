import {FETCH_NOTIFICATION_DATA_REQUEST,FETCH_NOTIFICATION_DATA_SUCCESS,FETCH_NOTIFICATION_DATA_FAILURE,UPDATE_NOTIFICATION_META_REQUEST,UPDATE_NOTIFICATION_META_SUCCESS,UPDATE_NOTIFICATION_META_FAILURE,DELETE_NOTIFICATION_REQUEST,DELETE_NOTIFICATION_SUCCESS,DELETE_NOTIFICATION_FAILURE,NotificationEvent,NotificationMeta,NotificationMetaMap,FetchNotificationDataRequestAction,FetchNotificationDataSuccessAction,FetchNotificationDataFailureAction,UpdateNotificationMetaRequestAction,UpdateNotificationMetaSuccessAction,UpdateNotificationMetaFailureAction,DeleteNotificationRequestAction,DeleteNotificationSuccessAction,DeleteNotificationFailureAction,} from "../types/notificationDetailTypes";

export const fetchNotificationDataRequest = (): FetchNotificationDataRequestAction => ({
  type: FETCH_NOTIFICATION_DATA_REQUEST,
});

export const fetchNotificationDataSuccess = (
  events: NotificationEvent[],
  metaMap: NotificationMetaMap
): FetchNotificationDataSuccessAction => ({
  type: FETCH_NOTIFICATION_DATA_SUCCESS,
  payload: { events, metaMap },
});

export const fetchNotificationDataFailure = (
  payload: string
): FetchNotificationDataFailureAction => ({
  type: FETCH_NOTIFICATION_DATA_FAILURE,
  payload,
});

export const updateNotificationMetaRequest = (
  id: string,
  patch: Partial<NotificationMeta>
): UpdateNotificationMetaRequestAction => ({
  type: UPDATE_NOTIFICATION_META_REQUEST,
  payload: { id, patch },
});

export const updateNotificationMetaSuccess = (
  id: string,
  meta: NotificationMeta
): UpdateNotificationMetaSuccessAction => ({
  type: UPDATE_NOTIFICATION_META_SUCCESS,
  payload: { id, meta },
});

export const updateNotificationMetaFailure = (
  payload: string
): UpdateNotificationMetaFailureAction => ({
  type: UPDATE_NOTIFICATION_META_FAILURE,
  payload,
});

export const deleteNotificationRequest = (
  id: string,
  date: string
): DeleteNotificationRequestAction => ({
  type: DELETE_NOTIFICATION_REQUEST,
  payload: { id, date },
});

export const deleteNotificationSuccess = (id: string): DeleteNotificationSuccessAction => ({
  type: DELETE_NOTIFICATION_SUCCESS,
  payload: { id },
});

export const deleteNotificationFailure = (
  payload: string
): DeleteNotificationFailureAction => ({
  type: DELETE_NOTIFICATION_FAILURE,
  payload,
});