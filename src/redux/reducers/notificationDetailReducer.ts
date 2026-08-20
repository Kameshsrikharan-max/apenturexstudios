import {
  NotificationDetailState,
  NotificationDetailActionTypes,
  FETCH_NOTIFICATION_DATA_REQUEST,FETCH_NOTIFICATION_DATA_SUCCESS,FETCH_NOTIFICATION_DATA_FAILURE,
  UPDATE_NOTIFICATION_META_REQUEST,UPDATE_NOTIFICATION_META_SUCCESS,UPDATE_NOTIFICATION_META_FAILURE,
  DELETE_NOTIFICATION_REQUEST,DELETE_NOTIFICATION_SUCCESS,DELETE_NOTIFICATION_FAILURE,} from "../types/notificationDetailTypes";

const initialState: NotificationDetailState = {
  events: [],
  metaMap: {},
  loading: false,
  saving: false,
  deleting: false,
  error: null,
};

const notificationDetailReducer = (
  state = initialState,
  action: NotificationDetailActionTypes
): NotificationDetailState => {
  switch (action.type) {
    case FETCH_NOTIFICATION_DATA_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_NOTIFICATION_DATA_SUCCESS:
      return {
        ...state,
        loading: false,
        events: action.payload.events,
        metaMap: action.payload.metaMap,
      };

    case FETCH_NOTIFICATION_DATA_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case UPDATE_NOTIFICATION_META_REQUEST:
      return { ...state, saving: true, error: null };

    case UPDATE_NOTIFICATION_META_SUCCESS:
      return {
        ...state,
        saving: false,
        metaMap: {
          ...state.metaMap,
          [action.payload.id]: action.payload.meta,
        },
      };

    case UPDATE_NOTIFICATION_META_FAILURE:
      return { ...state, saving: false, error: action.payload };

    case DELETE_NOTIFICATION_REQUEST:
      return { ...state, deleting: true, error: null };

    case DELETE_NOTIFICATION_SUCCESS:
      return {
        ...state,
        deleting: false,
        events: state.events.filter((e) => e.id !== action.payload.id),
      };

    case DELETE_NOTIFICATION_FAILURE:
      return { ...state, deleting: false, error: action.payload };

    default:
      return state;
  }
};

export default notificationDetailReducer;