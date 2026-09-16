import { call, put, takeLatest } from "redux-saga/effects";
import axios from "axios";
import {
  GET_EVENTS, CREATE_EVENT, ASSIGN_TEAM,
} from "../types/eventTypes";
import {
  getEventsSuccess, getEventsFailure,
  createEventSuccess, createEventFailure,
  assignTeamSuccess, assignTeamFailure,
} from "../actions/eventActions";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "/api";
const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function* handleGetEvents() {
  try {
    const res = yield call(axios.get, `${API_BASE}/studio/events`, { headers: authHeader() });
    yield put(getEventsSuccess(res.data.events));
  } catch (error) {
    yield put(getEventsFailure(error.message));
  }
}

function* handleCreateEvent(action) {
  try {
    const res = yield call(axios.post, `${API_BASE}/studio/events`, action.payload, { headers: authHeader() });
    yield put(createEventSuccess(res.data.event));
  } catch (error) {
    yield put(createEventFailure(error.message));
  }
}

// action.payload: { eventId, assignedMembersList }
function* handleAssignTeam(action) {
  try {
    const { eventId, assignedMembersList } = action.payload;
    const res = yield call(
      axios.patch,
      `${API_BASE}/studio/events/${eventId}/assign-team`,
      { assignedMembersList },
      { headers: authHeader() }
    );
    yield put(assignTeamSuccess(res.data.event));
  } catch (error) {
    yield put(assignTeamFailure(error.message));
  }
}

export function* eventSaga() {
  yield takeLatest(GET_EVENTS, handleGetEvents);
  yield takeLatest(CREATE_EVENT, handleCreateEvent);
  yield takeLatest(ASSIGN_TEAM, handleAssignTeam);
}