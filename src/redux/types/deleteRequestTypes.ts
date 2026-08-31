export type DeleteStatus = "none" | "pending" | "rejected";

export interface PendingDeleteUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  deleteStatus: DeleteStatus;
  deleteRequestedAt: string | null;
  deleteReason: string;
}

export interface DeleteRequestState {
  // current user's own request state
  ownStatus: DeleteStatus;
  requesting: boolean;
  requestError: string | null;

  // super admin view
  pendingList: PendingDeleteUser[];
  pendingLoading: boolean;
  pendingError: string | null;

  // approve/reject in-flight tracking
  actionLoadingUserId: string | null;
  actionError: string | null;
}

export const REQUEST_ACCOUNT_DELETE_REQUEST = "REQUEST_ACCOUNT_DELETE_REQUEST";
export const REQUEST_ACCOUNT_DELETE_SUCCESS = "REQUEST_ACCOUNT_DELETE_SUCCESS";
export const REQUEST_ACCOUNT_DELETE_FAILURE = "REQUEST_ACCOUNT_DELETE_FAILURE";

export const FETCH_PENDING_DELETE_REQUESTS_REQUEST = "FETCH_PENDING_DELETE_REQUESTS_REQUEST";
export const FETCH_PENDING_DELETE_REQUESTS_SUCCESS = "FETCH_PENDING_DELETE_REQUESTS_SUCCESS";
export const FETCH_PENDING_DELETE_REQUESTS_FAILURE = "FETCH_PENDING_DELETE_REQUESTS_FAILURE";

export const APPROVE_DELETE_REQUEST_REQUEST = "APPROVE_DELETE_REQUEST_REQUEST";
export const APPROVE_DELETE_REQUEST_SUCCESS = "APPROVE_DELETE_REQUEST_SUCCESS";
export const APPROVE_DELETE_REQUEST_FAILURE = "APPROVE_DELETE_REQUEST_FAILURE";

export const REJECT_DELETE_REQUEST_REQUEST = "REJECT_DELETE_REQUEST_REQUEST";
export const REJECT_DELETE_REQUEST_SUCCESS = "REJECT_DELETE_REQUEST_SUCCESS";
export const REJECT_DELETE_REQUEST_FAILURE = "REJECT_DELETE_REQUEST_FAILURE";

// NOTE: each action interface below carries `[key: string]: unknown;`.
// Without it, TypeScript won't treat these as assignable to Redux's
// `UnknownAction` type when passed to a typed `dispatch()` call — named
// interfaces (unlike inline object literals) don't get an implicit index
// signature, so `dispatch(someAction())` fails to type-check otherwise.
// This doesn't loosen anything at runtime; it only satisfies the type checker.

export interface RequestAccountDeleteRequestAction {
  type: typeof REQUEST_ACCOUNT_DELETE_REQUEST;
  payload: { reason: string };
  [key: string]: unknown;
}
export interface RequestAccountDeleteSuccessAction {
  type: typeof REQUEST_ACCOUNT_DELETE_SUCCESS;
  [key: string]: unknown;
}
export interface RequestAccountDeleteFailureAction {
  type: typeof REQUEST_ACCOUNT_DELETE_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export interface FetchPendingDeleteRequestsRequestAction {
  type: typeof FETCH_PENDING_DELETE_REQUESTS_REQUEST;
  [key: string]: unknown;
}
export interface FetchPendingDeleteRequestsSuccessAction {
  type: typeof FETCH_PENDING_DELETE_REQUESTS_SUCCESS;
  payload: PendingDeleteUser[];
  [key: string]: unknown;
}
export interface FetchPendingDeleteRequestsFailureAction {
  type: typeof FETCH_PENDING_DELETE_REQUESTS_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export interface ApproveDeleteRequestRequestAction {
  type: typeof APPROVE_DELETE_REQUEST_REQUEST;
  payload: { userId: string };
  [key: string]: unknown;
}
export interface ApproveDeleteRequestSuccessAction {
  type: typeof APPROVE_DELETE_REQUEST_SUCCESS;
  payload: { userId: string };
  [key: string]: unknown;
}
export interface ApproveDeleteRequestFailureAction {
  type: typeof APPROVE_DELETE_REQUEST_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export interface RejectDeleteRequestRequestAction {
  type: typeof REJECT_DELETE_REQUEST_REQUEST;
  payload: { userId: string };
  [key: string]: unknown;
}
export interface RejectDeleteRequestSuccessAction {
  type: typeof REJECT_DELETE_REQUEST_SUCCESS;
  payload: { userId: string };
  [key: string]: unknown;
}
export interface RejectDeleteRequestFailureAction {
  type: typeof REJECT_DELETE_REQUEST_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export type DeleteRequestActionTypes =
  | RequestAccountDeleteRequestAction
  | RequestAccountDeleteSuccessAction
  | RequestAccountDeleteFailureAction
  | FetchPendingDeleteRequestsRequestAction
  | FetchPendingDeleteRequestsSuccessAction
  | FetchPendingDeleteRequestsFailureAction
  | ApproveDeleteRequestRequestAction
  | ApproveDeleteRequestSuccessAction
  | ApproveDeleteRequestFailureAction
  | RejectDeleteRequestRequestAction
  | RejectDeleteRequestSuccessAction
  | RejectDeleteRequestFailureAction;