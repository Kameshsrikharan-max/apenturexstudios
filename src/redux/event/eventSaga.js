import { call, put, takeLatest } from "redux-saga/effects";

import {
  GET_EVENTS,
  CREATE_EVENT,
  UPDATE_ATTENDANCE,
  UPDATE_PAYMENT,
  ASSIGN_TEAM,
  UPLOAD_EVENT_MEDIA,
  CLOSE_EVENT,
} from "./eventTypes";

import {
  getEventsSuccess,
  getEventsFailure,
  createEventSuccess,
  createEventFailure,
  updateAttendanceSuccess,
  updateAttendanceFailure,
  updatePaymentSuccess,
  updatePaymentFailure,
  assignTeamSuccess,
  assignTeamFailure,
  uploadEventMediaSuccess,
  uploadEventMediaFailure,
  closeEventSuccess,
  closeEventFailure,
} from "./eventActions";

// ---- MOCK APIs (no backend yet — replace with axios calls later) ----

const fakeGetEventsAPI = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: [
          { id: 1, name: "Sharma Wedding", date: "2026-08-12", status: "upcoming" },
          { id: 2, name: "Corporate Meet", date: "2026-08-20", status: "upcoming" },
        ],
      });
    }, 1000);
  });
};

const fakeCreateEventAPI = (eventData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          id: Date.now(),
          ...eventData,
          status: "upcoming",
        },
      });
    }, 1000);
  });
};

const fakeUpdateAttendanceAPI = (attendanceData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { attendance: attendanceData } });
    }, 800);
  });
};

const fakeUpdatePaymentAPI = (paymentData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { payment: paymentData } });
    }, 800);
  });
};

const fakeAssignTeamAPI = (teamData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { team: teamData } });
    }, 800);
  });
};

const fakeUploadEventMediaAPI = (mediaData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { media: mediaData } });
    }, 800);
  });
};

const fakeCloseEventAPI = (closureData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: { ...closureData, status: "closed" } });
    }, 800);
  });
};

// ---- WORKER SAGAS ----

function* handleGetEvents() {

  try {

    const response = yield call(
      fakeGetEventsAPI
    );

    yield put(
      getEventsSuccess(response.data)
    );

  } catch (error) {

    yield put(
      getEventsFailure(error.message)
    );

  }
}

function* handleCreateEvent(action) {

  try {

    const response = yield call(
      fakeCreateEventAPI,
      action.payload
    );

    yield put(
      createEventSuccess(response.data)
    );

  } catch (error) {

    yield put(
      createEventFailure(error.message)
    );

  }
}

function* handleUpdateAttendance(action) {

  try {

    const response = yield call(
      fakeUpdateAttendanceAPI,
      action.payload
    );

    yield put(
      updateAttendanceSuccess(response.data)
    );

  } catch (error) {

    yield put(
      updateAttendanceFailure(error.message)
    );

  }
}

function* handleUpdatePayment(action) {

  try {

    const response = yield call(
      fakeUpdatePaymentAPI,
      action.payload
    );

    yield put(
      updatePaymentSuccess(response.data)
    );

  } catch (error) {

    yield put(
      updatePaymentFailure(error.message)
    );

  }
}

function* handleAssignTeam(action) {

  try {

    const response = yield call(
      fakeAssignTeamAPI,
      action.payload
    );

    yield put(
      assignTeamSuccess(response.data)
    );

  } catch (error) {

    yield put(
      assignTeamFailure(error.message)
    );

  }
}

function* handleUploadEventMedia(action) {

  try {

    const response = yield call(
      fakeUploadEventMediaAPI,
      action.payload
    );

    yield put(
      uploadEventMediaSuccess(response.data)
    );

  } catch (error) {

    yield put(
      uploadEventMediaFailure(error.message)
    );

  }
}

function* handleCloseEvent(action) {

  try {

    const response = yield call(
      fakeCloseEventAPI,
      action.payload
    );

    yield put(
      closeEventSuccess(response.data)
    );

  } catch (error) {

    yield put(
      closeEventFailure(error.message)
    );

  }
}

// ---- WATCHER SAGA ----

export function* eventSaga() {

  yield takeLatest(
    GET_EVENTS,
    handleGetEvents
  );

  yield takeLatest(
    CREATE_EVENT,
    handleCreateEvent
  );

  yield takeLatest(
    UPDATE_ATTENDANCE,
    handleUpdateAttendance
  );

  yield takeLatest(
    UPDATE_PAYMENT,
    handleUpdatePayment
  );

  yield takeLatest(
    ASSIGN_TEAM,
    handleAssignTeam
  );

  yield takeLatest(
    UPLOAD_EVENT_MEDIA,
    handleUploadEventMedia
  );

  yield takeLatest(
    CLOSE_EVENT,
    handleCloseEvent
  );

}