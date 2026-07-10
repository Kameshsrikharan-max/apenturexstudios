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

const initialState = {
  loading: false,
  events: [],
  currentEvent: null,
  error: null,
};

const eventReducer = (
  state = initialState,
  action
) => {

  switch (action.type) {

    case GET_EVENTS:
    case CREATE_EVENT:
    case UPDATE_ATTENDANCE:
    case UPDATE_PAYMENT:
    case ASSIGN_TEAM:
    case UPLOAD_EVENT_MEDIA:
    case CLOSE_EVENT:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case GET_EVENTS_SUCCESS:
      return {
        ...state,
        loading: false,
        events: action.payload,
      };

    case CREATE_EVENT_SUCCESS:
      return {
        ...state,
        loading: false,
        events: [...state.events, action.payload],
        currentEvent: action.payload,
      };

    case UPDATE_ATTENDANCE_SUCCESS:
    case UPDATE_PAYMENT_SUCCESS:
    case ASSIGN_TEAM_SUCCESS:
    case UPLOAD_EVENT_MEDIA_SUCCESS:
    case CLOSE_EVENT_SUCCESS:
      return {
        ...state,
        loading: false,
        currentEvent: {
          ...state.currentEvent,
          ...action.payload,
        },
      };

    case GET_EVENTS_FAILURE:
    case CREATE_EVENT_FAILURE:
    case UPDATE_ATTENDANCE_FAILURE:
    case UPDATE_PAYMENT_FAILURE:
    case ASSIGN_TEAM_FAILURE:
    case UPLOAD_EVENT_MEDIA_FAILURE:
    case CLOSE_EVENT_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default eventReducer;