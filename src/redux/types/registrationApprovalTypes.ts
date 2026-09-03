export type RegistrationType = "studio-admin" | "freelance-photographer";
export type RegistrationStatus = "pending_review" | "active" | "rejected";

export interface PendingRegistration {
  profileId: string;
  type: RegistrationType;
  user: { _id: string; name: string; email: string; role: string } | null;
  basicInfo: Record<string, unknown>;
  kyc: Record<string, unknown>;
  details: Record<string, unknown>;
  workOrDocuments: Record<string, unknown>;
  status: RegistrationStatus;
  createdAt: string;
}

export interface RegistrationApprovalState {
  pendingList: PendingRegistration[];
  pendingLoading: boolean;
  pendingError: string | null;

  actionLoadingProfileId: string | null;
  actionError: string | null;
}

export const FETCH_PENDING_REGISTRATIONS_REQUEST = "FETCH_PENDING_REGISTRATIONS_REQUEST";
export const FETCH_PENDING_REGISTRATIONS_SUCCESS = "FETCH_PENDING_REGISTRATIONS_SUCCESS";
export const FETCH_PENDING_REGISTRATIONS_FAILURE = "FETCH_PENDING_REGISTRATIONS_FAILURE";

export const APPROVE_REGISTRATION_REQUEST = "APPROVE_REGISTRATION_REQUEST";
export const APPROVE_REGISTRATION_SUCCESS = "APPROVE_REGISTRATION_SUCCESS";
export const APPROVE_REGISTRATION_FAILURE = "APPROVE_REGISTRATION_FAILURE";

export const REJECT_REGISTRATION_REQUEST = "REJECT_REGISTRATION_REQUEST";
export const REJECT_REGISTRATION_SUCCESS = "REJECT_REGISTRATION_SUCCESS";
export const REJECT_REGISTRATION_FAILURE = "REJECT_REGISTRATION_FAILURE";

// NOTE: `[key: string]: unknown;` on each interface below is required so
// these are assignable to Redux's `UnknownAction` type when passed to a
// typed `dispatch()` — mirrors the same pattern in deleteRequestTypes.ts.

export interface FetchPendingRegistrationsRequestAction {
  type: typeof FETCH_PENDING_REGISTRATIONS_REQUEST;
  [key: string]: unknown;
}
export interface FetchPendingRegistrationsSuccessAction {
  type: typeof FETCH_PENDING_REGISTRATIONS_SUCCESS;
  payload: PendingRegistration[];
  [key: string]: unknown;
}
export interface FetchPendingRegistrationsFailureAction {
  type: typeof FETCH_PENDING_REGISTRATIONS_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export interface ApproveRegistrationRequestAction {
  type: typeof APPROVE_REGISTRATION_REQUEST;
  payload: { type: RegistrationType; profileId: string };
  [key: string]: unknown;
}
export interface ApproveRegistrationSuccessAction {
  type: typeof APPROVE_REGISTRATION_SUCCESS;
  payload: { profileId: string };
  [key: string]: unknown;
}
export interface ApproveRegistrationFailureAction {
  type: typeof APPROVE_REGISTRATION_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export interface RejectRegistrationRequestAction {
  type: typeof REJECT_REGISTRATION_REQUEST;
  payload: { type: RegistrationType; profileId: string };
  [key: string]: unknown;
}
export interface RejectRegistrationSuccessAction {
  type: typeof REJECT_REGISTRATION_SUCCESS;
  payload: { profileId: string };
  [key: string]: unknown;
}
export interface RejectRegistrationFailureAction {
  type: typeof REJECT_REGISTRATION_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export type RegistrationApprovalActionTypes =
  | FetchPendingRegistrationsRequestAction
  | FetchPendingRegistrationsSuccessAction
  | FetchPendingRegistrationsFailureAction
  | ApproveRegistrationRequestAction
  | ApproveRegistrationSuccessAction
  | ApproveRegistrationFailureAction
  | RejectRegistrationRequestAction
  | RejectRegistrationSuccessAction
  | RejectRegistrationFailureAction;