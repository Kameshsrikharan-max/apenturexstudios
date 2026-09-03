import {
  FETCH_PENDING_REGISTRATIONS_REQUEST, FETCH_PENDING_REGISTRATIONS_SUCCESS, FETCH_PENDING_REGISTRATIONS_FAILURE,
  APPROVE_REGISTRATION_REQUEST, APPROVE_REGISTRATION_SUCCESS, APPROVE_REGISTRATION_FAILURE,
  REJECT_REGISTRATION_REQUEST, REJECT_REGISTRATION_SUCCESS, REJECT_REGISTRATION_FAILURE,
  PendingRegistration,
  RegistrationType,
  FetchPendingRegistrationsRequestAction, FetchPendingRegistrationsSuccessAction, FetchPendingRegistrationsFailureAction,
  ApproveRegistrationRequestAction, ApproveRegistrationSuccessAction, ApproveRegistrationFailureAction,
  RejectRegistrationRequestAction, RejectRegistrationSuccessAction, RejectRegistrationFailureAction,
} from "../types/registrationApprovalTypes";

export const fetchPendingRegistrationsRequest = (): FetchPendingRegistrationsRequestAction => ({
  type: FETCH_PENDING_REGISTRATIONS_REQUEST,
});

export const fetchPendingRegistrationsSuccess = (
  payload: PendingRegistration[]
): FetchPendingRegistrationsSuccessAction => ({
  type: FETCH_PENDING_REGISTRATIONS_SUCCESS,
  payload,
});

export const fetchPendingRegistrationsFailure = (
  payload: string
): FetchPendingRegistrationsFailureAction => ({
  type: FETCH_PENDING_REGISTRATIONS_FAILURE,
  payload,
});

export const approveRegistrationRequest = (
  type: RegistrationType,
  profileId: string
): ApproveRegistrationRequestAction => ({
  type: APPROVE_REGISTRATION_REQUEST,
  payload: { type, profileId },
});

export const approveRegistrationSuccess = (
  profileId: string
): ApproveRegistrationSuccessAction => ({
  type: APPROVE_REGISTRATION_SUCCESS,
  payload: { profileId },
});

export const approveRegistrationFailure = (
  payload: string
): ApproveRegistrationFailureAction => ({
  type: APPROVE_REGISTRATION_FAILURE,
  payload,
});

export const rejectRegistrationRequest = (
  type: RegistrationType,
  profileId: string
): RejectRegistrationRequestAction => ({
  type: REJECT_REGISTRATION_REQUEST,
  payload: { type, profileId },
});

export const rejectRegistrationSuccess = (
  profileId: string
): RejectRegistrationSuccessAction => ({
  type: REJECT_REGISTRATION_SUCCESS,
  payload: { profileId },
});

export const rejectRegistrationFailure = (
  payload: string
): RejectRegistrationFailureAction => ({
  type: REJECT_REGISTRATION_FAILURE,
  payload,
});