import { call, put, takeLatest } from "redux-saga/effects";
import {
  LOGIN_REQUEST, SIGNUP_REQUEST, LOGOUT,
  SEND_OTP_REQUEST, VERIFY_OTP_REQUEST,
} from "../types/authTypes";
import {
  loginSuccess, loginFailure,
  signupSuccess, signupFailure,
  sendOtpSuccess, sendOtpFailure,
  verifyOtpFailure,
} from "../actions/authActions";
import { sendOtpApi, verifyOtpApi } from "../api/authApi";

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
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    yield put(loginSuccess(data));
  } catch (error: any) {
    yield put(verifyOtpFailure(error.message));
  }
}

function handleLogout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}

export function* authSaga() {
  yield takeLatest(SEND_OTP_REQUEST, handleSendOtp);
  yield takeLatest(VERIFY_OTP_REQUEST, handleVerifyOtp);
  yield takeLatest(LOGOUT, handleLogout);
}