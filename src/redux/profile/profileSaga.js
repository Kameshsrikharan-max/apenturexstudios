import { call, put, takeLatest } from "redux-saga/effects";
import axios from "axios";

import {
  GET_PROFILE,
  UPDATE_PROFILE,
} from "./profileTypes";

import {
  getProfileSuccess,
  getProfileFailure,
  updateProfileSuccess,
  updateProfileFailure,
} from "./profileActions";

const fetchProfileAPI = () => {
  return axios.get(
    "https://your-api.com/api/profile"
  );
};

const updateProfileAPI = (data) => {
  return axios.put(
    "https://your-api.com/api/profile",
    data
  );
};

function* fetchProfile() {

  try {

    const response = yield call(
      fetchProfileAPI
    );

    yield put(
      getProfileSuccess(response.data)
    );

  } catch (error) {

    yield put(
      getProfileFailure(error.message)
    );

  }
}

function* updateProfileWorker(action) {

  try {

    const response = yield call(
      updateProfileAPI,
      action.payload
    );

    yield put(
      updateProfileSuccess(response.data)
    );

  } catch (error) {

    yield put(
      updateProfileFailure(error.message)
    );

  }
}

export function* profileSaga() {

  yield takeLatest(
    GET_PROFILE,
    fetchProfile
  );

  yield takeLatest(
    UPDATE_PROFILE,
    updateProfileWorker
  );

}