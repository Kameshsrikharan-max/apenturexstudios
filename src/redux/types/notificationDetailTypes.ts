export type NotificationDetailItem = { label: string; value: string };

// ===== Notification Category (per-type detail rendering) =====
export type NotificationCategoryKey =
  // existing
  | "reviewEndorsement"
  | "changeRequest"
  | "deleteRequest"
  | "eventAssignment"
  | "paymentExpenses"
  | "mediaNotifications"
  // gallery
  | "photoUploaded"
  | "photoLiked"
  // album
  | "albumCreated"
  // user / admin
  | "userRegistered"
  | "userLogin"
  | "passwordChanged"
  | "userDeactivated"
  | "userActivated"
  // payment / transaction
  | "paymentReceived"
  | "paymentPending"
  | "paymentFailed"
  | "paymentDue"
  | "paymentCompleted";

export interface ReviewEndorsementPayload {
  referralName?: string;
  referredTo?: string;
  decisionType?: string;
  remarks?: string;
}

export interface ChangeRequestPayload {
  requestedField?: string;
  oldValue?: string;
  newValue?: string;
  requestedBy?: string;
  studioName?: string;
}

export interface DeleteRequestPayload {
  targetType?: string;
  targetName?: string;
  reason?: string;
  requestedBy?: string;
}

export interface EventAssignmentPayload {
  eventName?: string;
  role?: string;
  venue?: string;
  assignedBy?: string;
}

export interface PaymentExpensesPayload {
  amount?: number;
  currency?: string;
  dueDate?: string;
  invoiceId?: string;
  expenseType?: string;
}

export interface MediaNotificationPayload {
  mediaCount?: number;
  albumName?: string;
  uploadedBy?: string;
  fileTypes?: string[];
}

/** Gallery like / new-album style payloads reuse MediaNotificationPayload
 *  where possible; this covers cases that need a "liked by" actor instead. */
export interface MediaEngagementPayload {
  photoTitle?: string;
  albumName?: string;
  likedBy?: string;
}

export interface UserAccountPayload {
  userName?: string;
  userEmail?: string;
  actionBy?: string;
  ipAddress?: string;
  device?: string;
}

export interface PaymentStatusPayload {
  amount?: number;          // amount of the specific payment/event that triggered this notification
  currency?: string;
  transactionId?: string;
  dueDate?: string;
  clientName?: string;
  reason?: string;          // used for paymentFailed
  totalAmount?: number;     // full event amount
  amountPaid?: number;      // total received so far (cumulative, may differ from `amount`)
  balanceAmount?: number;   // remaining balance
}

export type NotificationPayload =
  | ReviewEndorsementPayload
  | ChangeRequestPayload
  | DeleteRequestPayload
  | EventAssignmentPayload
  | PaymentExpensesPayload
  | MediaNotificationPayload
  | MediaEngagementPayload
  | UserAccountPayload
  | PaymentStatusPayload;

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
  notifCategory: NotificationCategoryKey;
  payload?: NotificationPayload;
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