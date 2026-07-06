import { call, put, takeLatest } from "redux-saga/effects";
import axios from "axios";

import {
  GET_REVIEWS,
  ADD_REVIEW,
  DELETE_REVIEW,
} from "./reviewTypes";

import {
  getReviewsSuccess,
  getReviewsFailure,
  addReviewSuccess,
  addReviewFailure,
  deleteReviewSuccess,
  deleteReviewFailure,
} from "./reviewActions";

const fetchReviewsAPI = (eventId) => {
  return axios.get(
    `https://your-api.com/api/reviews/${eventId}`
  );
};

const addReviewAPI = (data) => {
  return axios.post(
    "https://your-api.com/api/reviews",
    data
  );
};

const deleteReviewAPI = (reviewId) => {
  return axios.delete(
    `https://your-api.com/api/reviews/${reviewId}`
  );
};

function* fetchReviews(action) {

  try {

    const response = yield call(
      fetchReviewsAPI,
      action.payload
    );

    yield put(
      getReviewsSuccess(response.data)
    );

  } catch (error) {

    yield put(
      getReviewsFailure(error.message)
    );

  }
}

function* addReviewWorker(action) {

  try {

    const response = yield call(
      addReviewAPI,
      action.payload
    );

    yield put(
      addReviewSuccess(response.data)
    );

  } catch (error) {

    yield put(
      addReviewFailure(error.message)
    );

  }
}

function* deleteReviewWorker(action) {

  try {

    yield call(
      deleteReviewAPI,
      action.payload
    );

    yield put(
      deleteReviewSuccess(action.payload)
    );

  } catch (error) {

    yield put(
      deleteReviewFailure(error.message)
    );

  }
}

export function* reviewSaga() {

  yield takeLatest(
    GET_REVIEWS,
    fetchReviews
  );

  yield takeLatest(
    ADD_REVIEW,
    addReviewWorker
  );

  yield takeLatest(
    DELETE_REVIEW,
    deleteReviewWorker
  );

}