import {
  GET_EVENTS,GET_EVENTS_SUCCESS,GET_EVENTS_FAILURE,
  CREATE_EVENT,CREATE_EVENT_SUCCESS,CREATE_EVENT_FAILURE,
  UPDATE_EVENT,UPDATE_EVENT_SUCCESS,UPDATE_EVENT_FAILURE,
  DELETE_EVENT,DELETE_EVENT_SUCCESS,DELETE_EVENT_FAILURE,
  SYNC_EVENTS,GET_HOLIDAYS,GET_HOLIDAYS_SUCCESS,GET_HOLIDAYS_FAILURE,} from "./calendarTypes";

//Events

export const getEvents = () => ({
  type: GET_EVENTS,
});

export const getEventsSuccess = (data) => ({
  type: GET_EVENTS_SUCCESS,
  payload: data,
});

export const getEventsFailure = (error) => ({
  type: GET_EVENTS_FAILURE,
  payload: error,
});

export const createEvent = (date, event) => ({
  type: CREATE_EVENT,
  payload: { date, event },
});

export const createEventSuccess = (data) => ({
  type: CREATE_EVENT_SUCCESS,
  payload: data,
});

export const createEventFailure = (error) => ({
  type: CREATE_EVENT_FAILURE,
  payload: error,
});

export const updateEvent = (date, index, changes) => ({
  type: UPDATE_EVENT,
  payload: { date, index, changes },
});

export const updateEventSuccess = (data) => ({
  type: UPDATE_EVENT_SUCCESS,
  payload: data,
});

export const updateEventFailure = (error) => ({
  type: UPDATE_EVENT_FAILURE,
  payload: error,
});

export const deleteEvent = (date, index) => ({
  type: DELETE_EVENT,
  payload: { date, index },
});

export const deleteEventSuccess = (data) => ({
  type: DELETE_EVENT_SUCCESS,
  payload: data,
});

export const deleteEventFailure = (error) => ({
  type: DELETE_EVENT_FAILURE,
  payload: error,
});

export const syncEvents = () => ({
  type: SYNC_EVENTS,
});

//Holidays

export const getHolidays = (year) => ({
  type: GET_HOLIDAYS,
  payload: { year },
});

export const getHolidaysSuccess = (data) => ({
  type: GET_HOLIDAYS_SUCCESS,
  payload: data,
});

export const getHolidaysFailure = (error) => ({
  type: GET_HOLIDAYS_FAILURE,
  payload: error,
});