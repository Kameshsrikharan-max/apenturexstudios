import { all } from "redux-saga/effects";

import { enquirySaga } from "./enquiry/enquirySaga";

export default function* rootSaga() {
  yield all([
    enquirySaga(),
  ]);
}