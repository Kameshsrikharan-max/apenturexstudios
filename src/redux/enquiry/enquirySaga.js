import { call, put, takeLatest } from "redux-saga/effects";
import axios from "axios";

import { GET_ENQUIRIES } from "./enquiryTypes";

import {
  getEnquiriesSuccess,
  getEnquiriesFailure,
} from "./enquiryActions";

const fetchEnquiriesAPI = () => {
  return axios.get(
    "https://jsonplaceholder.typicode.com/users"
  );
};

function* fetchEnquiries() {

  try {

    const response = yield call(
      fetchEnquiriesAPI
    );

    yield put(
      getEnquiriesSuccess(response.data)
    );

  } catch (error) {

    yield put(
      getEnquiriesFailure(error.message)
    );

  }
}

export function* enquirySaga() {

  yield takeLatest(
    GET_ENQUIRIES,
    fetchEnquiries
  );

}