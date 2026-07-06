import { call, put, takeLatest } from "redux-saga/effects";

import { LOGIN_REQUEST, LOGOUT } from "./authTypes";

import {
  loginSuccess,
  loginFailure,
} from "./authActions";

// Fake API call — simulates a server response
const fakeLoginAPI = (credentials) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (credentials.identifier) {
        resolve({
          data: {
            user: {
              id: 1,
              name: "Test User",
              identifier: credentials.identifier,
            },
            token: "fake-jwt-token-12345",
          },
        });
      } else {
        reject(new Error("Invalid credentials"));
      }
    }, 1500);
  });
};

function* handleLogin(action) {

  try {

    const response = yield call(
      fakeLoginAPI,
      action.payload
    );

    // Save to localStorage so a refresh doesn't log the user out
    localStorage.setItem(
      "user",
      JSON.stringify(response.data.user)
    );

    localStorage.setItem(
      "token",
      response.data.token
    );

    yield put(
      loginSuccess(response.data)
    );

  } catch (error) {

    yield put(
      loginFailure(error.message)
    );

  }
}

function* handleLogout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}

export function* authSaga() {

  yield takeLatest(
    LOGIN_REQUEST,
    handleLogin
  );

  yield takeLatest(
    LOGOUT,
    handleLogout
  );

}