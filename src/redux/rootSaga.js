import { all } from "redux-saga/effects";

import { enquirySaga } from "./sagas/enquirySaga";
import { authSaga } from "./sagas/authSaga";
import { eventSaga } from "./sagas/eventSaga";
import { dashboardSaga } from "./sagas/dashboardSaga";
import { mediaSaga } from "./sagas/mediaSaga";
import { profileSaga } from "./sagas/profileSaga";
import { reviewSaga } from "./sagas/reviewSaga";
import { calendarSaga } from "./sagas/calendarsaga";
import { subscriptionSaga } from "./sagas/subscriptionsaga";
import { transactionSaga } from "./sagas/transactionsaga";
import { notificationSaga } from "./sagas/notificationSaga";
import { notificationDetailSaga } from "./sagas/notificationDetailSaga";
import { deleteRequestSaga } from "./sagas/deleteRequestSaga";

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
    subscriptionSaga(),
    transactionSaga(),
    notificationSaga(),
    notificationDetailSaga(),
    deleteRequestSaga(),
  ]);
}