import { all } from "redux-saga/effects";

import { enquirySaga } from "./enquiry/enquirySaga";
import { authSaga } from "./auth/authSaga";
import { eventSaga } from "./event/eventSaga";
import { dashboardSaga } from "./dashboard/dashboardSaga";
import { mediaSaga } from "./media/mediaSaga";
import { profileSaga } from "./profile/profileSaga";
import { reviewSaga } from "./review/reviewSaga";
import { calendarSaga } from "./calendar/calendarSaga";

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