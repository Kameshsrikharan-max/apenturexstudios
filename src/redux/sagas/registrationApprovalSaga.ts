import { call, put, takeLatest } from "redux-saga/effects";
import {FETCH_PENDING_REGISTRATIONS_REQUEST,APPROVE_REGISTRATION_REQUEST,REJECT_REGISTRATION_REQUEST,ApproveRegistrationRequestAction,RejectRegistrationRequestAction,PendingRegistration,} from "../types/registrationApprovalTypes";
import {fetchPendingRegistrationsSuccess,fetchPendingRegistrationsFailure,approveRegistrationSuccess,approveRegistrationFailure,rejectRegistrationSuccess,rejectRegistrationFailure,} from "../actions/registrationApprovalActions";
import {fetchPendingRegistrationsApi,approveRegistrationApi,rejectRegistrationApi,} from "../api/registrationApprovalApi";

function* fetchPendingRegistrationsWorker() {
  try {
    const registrations: PendingRegistration[] = yield call(fetchPendingRegistrationsApi);
    yield put(fetchPendingRegistrationsSuccess(registrations));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch pending registrations.";
    yield put(fetchPendingRegistrationsFailure(message));
  }
}

function* approveRegistrationWorker(action: ApproveRegistrationRequestAction) {
  try {
    yield call(approveRegistrationApi, action.payload.type, action.payload.profileId);
    yield put(approveRegistrationSuccess(action.payload.profileId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve registration.";
    yield put(approveRegistrationFailure(message));
  }
}

function* rejectRegistrationWorker(action: RejectRegistrationRequestAction) {
  try {
    yield call(rejectRegistrationApi, action.payload.type, action.payload.profileId);
    yield put(rejectRegistrationSuccess(action.payload.profileId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reject registration.";
    yield put(rejectRegistrationFailure(message));
  }
}

export function* registrationApprovalSaga() {
  yield takeLatest(FETCH_PENDING_REGISTRATIONS_REQUEST, fetchPendingRegistrationsWorker);
  yield takeLatest(APPROVE_REGISTRATION_REQUEST, approveRegistrationWorker);
  yield takeLatest(REJECT_REGISTRATION_REQUEST, rejectRegistrationWorker);
}