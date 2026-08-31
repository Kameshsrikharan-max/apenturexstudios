import { call, put, takeLatest } from "redux-saga/effects";
import {
  LOGIN_REQUEST, SIGNUP_REQUEST, LOGOUT,
  SEND_OTP_REQUEST, VERIFY_OTP_REQUEST,
} from "../types/authTypes";
import {
  loginSuccess, loginFailure,
  signupSuccess, signupFailure,
  sendOtpSuccess, sendOtpFailure,
  verifyOtpFailure, verifyOtpNeedsSignup,
} from "../actions/authActions";
import { sendOtpApi, verifyOtpApi, completeSignupApi } from "../api/authApi";

function* handleSendOtp(action: any): any {
  try {
    yield call(sendOtpApi, action.payload);
    yield put(sendOtpSuccess());
  } catch (error: any) {
    yield put(sendOtpFailure(error.message));
  }
}

function* handleVerifyOtp(action: any): any {
  try {
    const data = yield call(verifyOtpApi, action.payload);

    if (data.needsSignup) {
      // No account exists for this (verified) email — do NOT log in.
      // Hand off to the signup/onboarding flow instead.
      yield put(verifyOtpNeedsSignup(data.email, data.signupToken));
      return;
    }

    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    yield put(loginSuccess(data));
  } catch (error: any) {
    yield put(verifyOtpFailure(error.message));
  }
}

// Completes signup after onboarding: creates the real account using the
// signupToken issued by verify-otp, then logs the new user in.
function* handleSignup(action: any): any {
  try {
    const data = yield call(completeSignupApi, action.payload);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    yield put(signupSuccess(data));
  } catch (error: any) {
    yield put(signupFailure(error.message));
  }
}

function handleLogout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}

export function* authSaga() {
  yield takeLatest(SEND_OTP_REQUEST, handleSendOtp);
  yield takeLatest(VERIFY_OTP_REQUEST, handleVerifyOtp);
  yield takeLatest(SIGNUP_REQUEST, handleSignup);
  yield takeLatest(LOGOUT, handleLogout);
}