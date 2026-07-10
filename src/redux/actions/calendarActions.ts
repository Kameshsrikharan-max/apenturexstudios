import * as types from "../types/calendartypes";

// --- Events ---

export const getEvents = () => ({
  type: types.GET_EVENTS,
});

export const getEventsSuccess = (events) => ({
  type: types.GET_EVENTS_SUCCESS,
  payload: events,
});

export const getEventsFailure = (error) => ({
  type: types.GET_EVENTS_FAILURE,
  payload: error,
});

export const syncEvents = () => ({
  type: types.SYNC_EVENTS,
});

export const createEvent = (date, eventData) => ({
  type: types.CREATE_EVENT,
  payload: { date, eventData },
});

export const createEventSuccess = (events) => ({
  type: types.CREATE_EVENT_SUCCESS,
  payload: events,
});

export const createEventFailure = (error) => ({
  type: types.CREATE_EVENT_FAILURE,
  payload: error,
});

export const updateEvent = (date, index, updates) => ({
  type: types.UPDATE_EVENT,
  payload: { date, index, updates },
});

export const updateEventSuccess = (events) => ({
  type: types.UPDATE_EVENT_SUCCESS,
  payload: events,
});

export const updateEventFailure = (error) => ({
  type: types.UPDATE_EVENT_FAILURE,
  payload: error,
});

export const deleteEvent = (date, index) => ({
  type: types.DELETE_EVENT,
  payload: { date, index },
});

export const deleteEventSuccess = (events) => ({
  type: types.DELETE_EVENT_SUCCESS,
  payload: events,
});

export const deleteEventFailure = (error) => ({
  type: types.DELETE_EVENT_FAILURE,
  payload: error,
});

// --- Holidays ---

export const getHolidays = (year) => ({
  type: types.GET_HOLIDAYS,
  payload: { year },
});

export const getHolidaysSuccess = (holidays) => ({
  type: types.GET_HOLIDAYS_SUCCESS,
  payload: holidays,
});

export const getHolidaysFailure = (error) => ({
  type: types.GET_HOLIDAYS_FAILURE,
  payload: error,
});

// --- Panchang ---

export const getPanchang = (date) => ({
  type: types.GET_PANCHANG,
  payload: { date },
});

export const getPanchangSuccess = (panchang) => ({
  type: types.GET_PANCHANG_SUCCESS,
  payload: panchang,
});

export const getPanchangFailure = (error) => ({
  type: types.GET_PANCHANG_FAILURE,
  payload: error,
});