import {
  GET_EVENTS,
  GET_EVENTS_SUCCESS,
  GET_EVENTS_FAILURE,
  CREATE_EVENT,
  CREATE_EVENT_SUCCESS,
  CREATE_EVENT_FAILURE,
  UPDATE_ATTENDANCE,
  UPDATE_ATTENDANCE_SUCCESS,
  UPDATE_ATTENDANCE_FAILURE,
  UPDATE_PAYMENT,
  UPDATE_PAYMENT_SUCCESS,
  UPDATE_PAYMENT_FAILURE,
  ASSIGN_TEAM,
  ASSIGN_TEAM_SUCCESS,
  ASSIGN_TEAM_FAILURE,
  UPLOAD_EVENT_MEDIA,
  UPLOAD_EVENT_MEDIA_SUCCESS,
  UPLOAD_EVENT_MEDIA_FAILURE,
  CLOSE_EVENT,
  CLOSE_EVENT_SUCCESS,
  CLOSE_EVENT_FAILURE,
} from "../types/eventTypes";

// Get Events
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

// Create Event
export const createEvent = (eventData) => ({
  type: CREATE_EVENT,
  payload: eventData,
});

export const createEventSuccess = (data) => ({
  type: CREATE_EVENT_SUCCESS,
  payload: data,
});

export const createEventFailure = (error) => ({
  type: CREATE_EVENT_FAILURE,
  payload: error,
});

// Attendance
export const updateAttendance = (attendanceData) => ({
  type: UPDATE_ATTENDANCE,
  payload: attendanceData,
});

export const updateAttendanceSuccess = (data) => ({
  type: UPDATE_ATTENDANCE_SUCCESS,
  payload: data,
});

export const updateAttendanceFailure = (error) => ({
  type: UPDATE_ATTENDANCE_FAILURE,
  payload: error,
});

// Payment
export const updatePayment = (paymentData) => ({
  type: UPDATE_PAYMENT,
  payload: paymentData,
});

export const updatePaymentSuccess = (data) => ({
  type: UPDATE_PAYMENT_SUCCESS,
  payload: data,
});

export const updatePaymentFailure = (error) => ({
  type: UPDATE_PAYMENT_FAILURE,
  payload: error,
});

// Team Assignment
export const assignTeam = (teamData) => ({
  type: ASSIGN_TEAM,
  payload: teamData,
});

export const assignTeamSuccess = (data) => ({
  type: ASSIGN_TEAM_SUCCESS,
  payload: data,
});

export const assignTeamFailure = (error) => ({
  type: ASSIGN_TEAM_FAILURE,
  payload: error,
});

// Media Management
export const uploadEventMedia = (mediaData) => ({
  type: UPLOAD_EVENT_MEDIA,
  payload: mediaData,
});

export const uploadEventMediaSuccess = (data) => ({
  type: UPLOAD_EVENT_MEDIA_SUCCESS,
  payload: data,
});

export const uploadEventMediaFailure = (error) => ({
  type: UPLOAD_EVENT_MEDIA_FAILURE,
  payload: error,
});

// Event Closure
export const closeEvent = (closureData) => ({
  type: CLOSE_EVENT,
  payload: closureData,
});

export const closeEventSuccess = (data) => ({
  type: CLOSE_EVENT_SUCCESS,
  payload: data,
});

export const closeEventFailure = (error) => ({
  type: CLOSE_EVENT_FAILURE,
  payload: error,
});