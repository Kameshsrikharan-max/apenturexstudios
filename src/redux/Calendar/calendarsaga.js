import { call, put, select, takeEvery, takeLatest } from "redux-saga/effects";
import axios from "axios";

import {GET_EVENTS,CREATE_EVENT,UPDATE_EVENT,DELETE_EVENT,SYNC_EVENTS,GET_HOLIDAYS,} from "./calendarTypes";

import {getEventsSuccess,getEventsFailure,createEventSuccess,createEventFailure,updateEventSuccess,updateEventFailure,deleteEventSuccess,deleteEventFailure,getHolidaysSuccess,getHolidaysFailure,} from "./calendarActions";

const STORAGE_KEY = "calendarEvents";

const TAMIL_HOLIDAY_KEYWORDS = [
  "pongal",
  "thai pongal",
  "mattu pongal",
  "kanum pongal",
  "tamil new year",
  "puthandu",
  "thiruvalluvar",
  "thaipusam",
  "deepavali",
  "diwali",
  "ayudha pooja",
  "vijaya dashami",
  "maha shivaratri",
  "vinayaka chaturthi",
];

const selectEvents = (state) => state.calendar.events;


const readEventsFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const persistEvents = (events) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new Event("calendarEventsUpdated"));
  return events;
};



function* fetchEvents() {

  try {

    const events = yield call(readEventsFromStorage);

    yield put(
      getEventsSuccess(events)
    );

  } catch (error) {

    yield put(
      getEventsFailure(error.message)
    );

  }
}

function* syncEvents() {

  const events = yield call(readEventsFromStorage);

  yield put(
    getEventsSuccess(events)
  );
}

function* addEvent(action) {

  try {

    const { date, event } = action.payload;
    const current = yield select(selectEvents);

    const updated = {
      ...current,
      [date]: [...(current[date] || []), event],
    };

    yield call(persistEvents, updated);

    yield put(
      createEventSuccess(updated)
    );

  } catch (error) {

    yield put(
      createEventFailure(error.message)
    );

  }
}

function* editEvent(action) {

  try {

    const { date, index, changes } = action.payload;
    const current = yield select(selectEvents);
    const dayEvents = [...(current[date] || [])];

    if (index < 0 || index >= dayEvents.length) {
      throw new Error("Event not found");
    }

    dayEvents[index] = { ...dayEvents[index], ...changes };
    const updated = { ...current, [date]: dayEvents };

    yield call(persistEvents, updated);

    yield put(
      updateEventSuccess(updated)
    );

  } catch (error) {

    yield put(
      updateEventFailure(error.message)
    );

  }
}

function* removeEvent(action) {

  try {

    const { date, index } = action.payload;
    const current = yield select(selectEvents);
    const dayEvents = [...(current[date] || [])];

    if (index < 0 || index >= dayEvents.length) {
      throw new Error("Event not found");
    }

    dayEvents.splice(index, 1);

    const updated = { ...current };
    if (dayEvents.length === 0) {
      delete updated[date];
    } else {
      updated[date] = dayEvents;
    }

    yield call(persistEvents, updated);

    yield put(
      deleteEventSuccess(updated)
    );

  } catch (error) {

    yield put(
      deleteEventFailure(error.message)
    );

  }
}


const fetchHolidaysAPI = (year) => {
  return axios.get(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/IN`
  );
};


const buildHolidayMap = (holidays) => {
  const holidayMap = {};

  holidays.forEach((holiday) => {
    const date = holiday.date;
    if (!holidayMap[date]) holidayMap[date] = [];

    const name = holiday.name?.toLowerCase() || "";
    const localName = holiday.localName?.toLowerCase() || "";

  
    const isNational = holiday.global === true;

    const isTamilHoliday = TAMIL_HOLIDAY_KEYWORDS.some(
      (keyword) => name.includes(keyword) || localName.includes(keyword)
    );

    holidayMap[date].push({
      title: holiday.localName || holiday.name,
      color: isTamilHoliday ? "violet" : isNational ? "gold" : "blue",
      isHoliday: true,
      isTamilHoliday,
      category: isTamilHoliday
        ? "Tamil Holiday"
        : isNational
          ? "National Holiday"
          : "Festival / Religious",
    });
  });

  return holidayMap;
};



function* fetchHolidays(action) {

  try {

    const { year } = action.payload;

    const response = yield call(
      fetchHolidaysAPI,
      year
    );

    const holidays = response.data || [];
    const holidayMap = yield call(buildHolidayMap, holidays);

    yield put(
      getHolidaysSuccess(holidayMap)
    );

  } catch (error) {

    yield put(
      getHolidaysFailure(error.message)
    );

  }
}

export function* calendarSaga() {

  yield takeLatest(GET_EVENTS, fetchEvents);
  yield takeEvery(SYNC_EVENTS, syncEvents);
  yield takeEvery(CREATE_EVENT, addEvent);
  yield takeEvery(UPDATE_EVENT, editEvent);
  yield takeEvery(DELETE_EVENT, removeEvent);
  yield takeLatest(GET_HOLIDAYS, fetchHolidays);

}