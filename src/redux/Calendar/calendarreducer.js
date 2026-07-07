import {
  GET_EVENTS,
  GET_EVENTS_SUCCESS,
  GET_EVENTS_FAILURE,
  CREATE_EVENT_SUCCESS,
  CREATE_EVENT_FAILURE,
  UPDATE_EVENT_SUCCESS,
  UPDATE_EVENT_FAILURE,
  DELETE_EVENT_SUCCESS,
  DELETE_EVENT_FAILURE,
  GET_HOLIDAYS,
  GET_HOLIDAYS_SUCCESS,
  GET_HOLIDAYS_FAILURE,
} from "./calendarTypes";

const initialState = {
  events: {},
  eventsLoading: false,
  eventsError: null,

  holidays: {},
  holidaysLoading: false,
  holidaysError: null,
};

const calendarReducer = (
  state = initialState,
  action
) => {

  switch (action.type) {

    case GET_EVENTS:
      return {
        ...state,
        eventsLoading: true,
      };

    case GET_EVENTS_SUCCESS:
      return {
        ...state,
        eventsLoading: false,
        events: action.payload,
      };

    case GET_EVENTS_FAILURE:
      return {
        ...state,
        eventsLoading: false,
        eventsError: action.payload,
      };

    case CREATE_EVENT_SUCCESS:
    case UPDATE_EVENT_SUCCESS:
    case DELETE_EVENT_SUCCESS:
      return {
        ...state,
        events: action.payload,
      };

    case CREATE_EVENT_FAILURE:
    case UPDATE_EVENT_FAILURE:
    case DELETE_EVENT_FAILURE:
      return {
        ...state,
        eventsError: action.payload,
      };

    case GET_HOLIDAYS:
      return {
        ...state,
        holidaysLoading: true,
        holidaysError: null,
      };

    case GET_HOLIDAYS_SUCCESS:
      return {
        ...state,
        holidaysLoading: false,
        holidays: action.payload,
      };

    case GET_HOLIDAYS_FAILURE:
      return {
        ...state,
        holidaysLoading: false,
        holidaysError: action.payload,
      };

    default:
      return state;
  }
};

export default calendarReducer;