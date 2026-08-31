import {
  REQUEST_ACCOUNT_DELETE_REQUEST,REQUEST_ACCOUNT_DELETE_SUCCESS,REQUEST_ACCOUNT_DELETE_FAILURE,FETCH_PENDING_DELETE_REQUESTS_REQUEST,
  FETCH_PENDING_DELETE_REQUESTS_SUCCESS,FETCH_PENDING_DELETE_REQUESTS_FAILURE,
  APPROVE_DELETE_REQUEST_REQUEST,APPROVE_DELETE_REQUEST_SUCCESS,APPROVE_DELETE_REQUEST_FAILURE,
  REJECT_DELETE_REQUEST_REQUEST,REJECT_DELETE_REQUEST_SUCCESS,REJECT_DELETE_REQUEST_FAILURE,
  PendingDeleteUser,
  RequestAccountDeleteRequestAction,RequestAccountDeleteSuccessAction,RequestAccountDeleteFailureAction,
  FetchPendingDeleteRequestsRequestAction,FetchPendingDeleteRequestsSuccessAction,FetchPendingDeleteRequestsFailureAction,
  ApproveDeleteRequestRequestAction,ApproveDeleteRequestSuccessAction,ApproveDeleteRequestFailureAction,
  RejectDeleteRequestRequestAction,RejectDeleteRequestSuccessAction,RejectDeleteRequestFailureAction,
} from "../types/deleteRequestTypes";

export const requestAccountDeleteRequest = (
  reason: string
): RequestAccountDeleteRequestAction => ({
  type: REQUEST_ACCOUNT_DELETE_REQUEST,
  payload: { reason },
});

export const requestAccountDeleteSuccess = (): RequestAccountDeleteSuccessAction => ({
  type: REQUEST_ACCOUNT_DELETE_SUCCESS,
});

export const requestAccountDeleteFailure = (
  payload: string
): RequestAccountDeleteFailureAction => ({
  type: REQUEST_ACCOUNT_DELETE_FAILURE,
  payload,
});

export const fetchPendingDeleteRequestsRequest = (): FetchPendingDeleteRequestsRequestAction => ({
  type: FETCH_PENDING_DELETE_REQUESTS_REQUEST,
});

export const fetchPendingDeleteRequestsSuccess = (
  payload: PendingDeleteUser[]
): FetchPendingDeleteRequestsSuccessAction => ({
  type: FETCH_PENDING_DELETE_REQUESTS_SUCCESS,
  payload,
});

export const fetchPendingDeleteRequestsFailure = (
  payload: string
): FetchPendingDeleteRequestsFailureAction => ({
  type: FETCH_PENDING_DELETE_REQUESTS_FAILURE,
  payload,
});

export const approveDeleteRequestRequest = (
  userId: string
): ApproveDeleteRequestRequestAction => ({
  type: APPROVE_DELETE_REQUEST_REQUEST,
  payload: { userId },
});

export const approveDeleteRequestSuccess = (
  userId: string
): ApproveDeleteRequestSuccessAction => ({
  type: APPROVE_DELETE_REQUEST_SUCCESS,
  payload: { userId },
});

export const approveDeleteRequestFailure = (
  payload: string
): ApproveDeleteRequestFailureAction => ({
  type: APPROVE_DELETE_REQUEST_FAILURE,
  payload,
});

export const rejectDeleteRequestRequest = (
  userId: string
): RejectDeleteRequestRequestAction => ({
  type: REJECT_DELETE_REQUEST_REQUEST,
  payload: { userId },
});

export const rejectDeleteRequestSuccess = (
  userId: string
): RejectDeleteRequestSuccessAction => ({
  type: REJECT_DELETE_REQUEST_SUCCESS,
  payload: { userId },
});

export const rejectDeleteRequestFailure = (
  payload: string
): RejectDeleteRequestFailureAction => ({
  type: REJECT_DELETE_REQUEST_FAILURE,
  payload,
});