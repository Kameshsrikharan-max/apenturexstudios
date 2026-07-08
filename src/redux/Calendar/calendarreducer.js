import * as types from "./calendarTypes";

const initialState = {
  events: {},
  eventsLoading: false,
  eventsError: null,

  holidays: {},
  holidaysLoading: false,
  holidaysError: null,

  panchang: null,
  panchangLoading: false,
  panchangError: null,
};

const calendarReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.GET_EVENTS:
      return { ...state, eventsLoading: true, eventsError: null };

    case types.GET_EVENTS_SUCCESS:
    case types.CREATE_EVENT_SUCCESS:
    case types.UPDATE_EVENT_SUCCESS:
    case types.DELETE_EVENT_SUCCESS:
      return { ...state, events: action.payload, eventsLoading: false };

    case types.GET_EVENTS_FAILURE:
    case types.CREATE_EVENT_FAILURE:
    case types.UPDATE_EVENT_FAILURE:
    case types.DELETE_EVENT_FAILURE:
      return { ...state, eventsLoading: false, eventsError: action.payload };

    case types.GET_HOLIDAYS:
      return { ...state, holidaysLoading: true, holidaysError: null };

    case types.GET_HOLIDAYS_SUCCESS:
      return { ...state, holidays: action.payload, holidaysLoading: false };

    case types.GET_HOLIDAYS_FAILURE:
      return { ...state, holidaysLoading: false, holidaysError: action.payload };

    case types.GET_PANCHANG:
      return { ...state, panchangLoading: true, panchangError: null };

    case types.GET_PANCHANG_SUCCESS:
      return { ...state, panchang: action.payload, panchangLoading: false };

    case types.GET_PANCHANG_FAILURE:
      return { ...state, panchangLoading: false, panchangError: action.payload };

    default:
      return state;
  }
};

export default calendarReducer;