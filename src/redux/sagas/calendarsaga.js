import { call, put, select, takeEvery, takeLatest } from "redux-saga/effects";
import axios from "axios";

import {GET_EVENTS,CREATE_EVENT,UPDATE_EVENT,DELETE_EVENT,SYNC_EVENTS,GET_HOLIDAYS,GET_PANCHANG,} from "../types/calendartypes";

import {getEventsSuccess,getEventsFailure,createEventSuccess,createEventFailure,updateEventSuccess,updateEventFailure,deleteEventSuccess,deleteEventFailure,getHolidaysSuccess,getHolidaysFailure,getPanchangSuccess,getPanchangFailure,} from "../actions/calendaractions";

const STORAGE_KEY = "calendarEvents";

const CALENDARIFIC_API_KEY = "WJTWQRzs553ZRynmQvY6P2WSSXCVDub5";

const ASTROLOGY_USER_ID = "655179";
const ASTROLOGY_API_KEY = "ak-defa59b3ea80bf9f7f2c168723b57ad0973631db";

const DEFAULT_LAT = 13.0827;
const DEFAULT_LON = 80.2707;
const DEFAULT_TZONE = 5.5;

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
  return axios.get("https://calendarific.com/api/v2/holidays", {
    params: {
      api_key: CALENDARIFIC_API_KEY,
      country: "IN",
      year,
    },
  });
};


const buildHolidayMap = (holidays) => {
  const holidayMap = {};

  holidays.forEach((holiday) => {
    const date = holiday.date?.iso;
    if (!date) return;

    if (!holidayMap[date]) holidayMap[date] = [];

    const name = holiday.name?.toLowerCase() || "";
    const description = holiday.description?.toLowerCase() || "";

    const types = (holiday.type || []).map((t) => t.toLowerCase());
    const isNational = types.some((t) => t.includes("national"));

    const isTamilHoliday = TAMIL_HOLIDAY_KEYWORDS.some(
      (keyword) => name.includes(keyword) || description.includes(keyword)
    );

    holidayMap[date].push({
      title: holiday.name,
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

    const holidays = response.data?.response?.holidays || [];
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


const fetchPanchangAPI = (date) => {
  const [year, month, day] = date.split("-").map(Number);

  const auth =
    "Basic " + btoa(`${ASTROLOGY_USER_ID}:${ASTROLOGY_API_KEY}`);

  return axios.post(
    "https://json.astrologyapi.com/v1/advanced_panchang",
    {
      day,
      month,
      year,
      hour: 6,
      min: 0,
      lat: DEFAULT_LAT,
      lon: DEFAULT_LON,
      tzone: DEFAULT_TZONE,
    },
    {
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "Accept-Language": "ta", 
      },
    }
  );
};

function* fetchPanchang(action) {

  try {

    const { date } = action.payload;

    const response = yield call(
      fetchPanchangAPI,
      date
    );

    yield put(
      getPanchangSuccess(response.data)
    );

  } catch (error) {

    yield put(
      getPanchangFailure(error.message)
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
  yield takeLatest(GET_PANCHANG, fetchPanchang);

}