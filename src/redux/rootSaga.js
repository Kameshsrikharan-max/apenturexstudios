import { all } from "redux-saga/effects";

import { enquirySaga } from "./sagas/enquirySaga";
import { authSaga } from "./sagas/authSaga";
import { eventSaga } from "./sagas/eventSaga";
import { dashboardSaga } from "./sagas/dashboardSaga";
import { mediaSaga } from "./sagas/mediaSaga";
import { profileSaga } from "./sagas/profileSaga";
import { reviewSaga } from "./sagas/reviewSaga";
import { calendarSaga } from "./sagas/calendarsaga";

export default function* rootSaga() {
  yield all([
    enquirySaga(),
    authSaga(),
    eventSaga(),
    dashboardSaga(),
    mediaSaga(),
    profileSaga(),
    reviewSaga(),
    calendarSaga(),
  ]);
}