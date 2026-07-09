import { call, put, takeLatest } from "redux-saga/effects";

import { LOGIN_REQUEST, SIGNUP_REQUEST, LOGOUT } from "../types/authTypes";

import {
  loginSuccess,
  loginFailure,
  signupSuccess,
  signupFailure,
} from "../actions/authActions";

import { loginApi, signupApi } from "../api/authApi";

function* handleLogin(action) {
  try {
    const data = yield call(loginApi, action.payload);

    // Save to localStorage so a refresh doesn't log the user out
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);

    yield put(loginSuccess(data));
  } catch (error) {
    yield put(loginFailure(error.message));
  }
}

function* handleSignup(action) {
  try {
    const data = yield call(signupApi, action.payload);

    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);

    yield put(signupSuccess(data));
  } catch (error) {
    yield put(signupFailure(error.message));
  }
}

function* handleLogout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}

export function* authSaga() {
  yield takeLatest(LOGIN_REQUEST, handleLogin);
  yield takeLatest(SIGNUP_REQUEST, handleSignup);
  yield takeLatest(LOGOUT, handleLogout);
}