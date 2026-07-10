import { call, put, takeLatest } from "redux-saga/effects";
import axios from "axios";

import {
  GET_MEDIA,
  UPLOAD_MEDIA,
  DELETE_MEDIA,
} from "../types/mediaTypes";

import {
  getMediaSuccess,
  getMediaFailure,
  uploadMediaSuccess,
  uploadMediaFailure,
  deleteMediaSuccess,
  deleteMediaFailure,
} from "../actions/mediaActions";

// ... rest of file unchanged

const fetchMediaAPI = (eventId) => {
  return axios.get(
    `https://your-api.com/api/media/${eventId}`
  );
};

const uploadMediaAPI = (formData) => {
  return axios.post(
    "https://your-api.com/api/media/upload",
    formData
  );
};

const deleteMediaAPI = (mediaId) => {
  return axios.delete(
    `https://your-api.com/api/media/${mediaId}`
  );
};

function* fetchMedia(action) {

  try {

    const response = yield call(
      fetchMediaAPI,
      action.payload
    );

    yield put(
      getMediaSuccess(response.data)
    );

  } catch (error) {

    yield put(
      getMediaFailure(error.message)
    );

  }
}

function* uploadMediaWorker(action) {

  try {

    const response = yield call(
      uploadMediaAPI,
      action.payload
    );

    yield put(
      uploadMediaSuccess(response.data)
    );

  } catch (error) {

    yield put(
      uploadMediaFailure(error.message)
    );

  }
}

function* deleteMediaWorker(action) {

  try {

    yield call(
      deleteMediaAPI,
      action.payload
    );

    yield put(
      deleteMediaSuccess(action.payload)
    );

  } catch (error) {

    yield put(
      deleteMediaFailure(error.message)
    );

  }
}

export function* mediaSaga() {

  yield takeLatest(
    GET_MEDIA,
    fetchMedia
  );

  yield takeLatest(
    UPLOAD_MEDIA,
    uploadMediaWorker
  );

  yield takeLatest(
    DELETE_MEDIA,
    deleteMediaWorker
  );

}