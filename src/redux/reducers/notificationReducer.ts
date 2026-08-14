import {
  NotificationState,
  NotificationActionTypes,
  FETCH_NOTIFICATION_PREFS_REQUEST,
  FETCH_NOTIFICATION_PREFS_SUCCESS,
  FETCH_NOTIFICATION_PREFS_FAILURE,
  TOGGLE_NOTIFICATION_CHANNEL,
  SAVE_NOTIFICATION_PREFS_REQUEST,
  SAVE_NOTIFICATION_PREFS_SUCCESS,
  SAVE_NOTIFICATION_PREFS_FAILURE,
  RESET_NOTIFICATION_SAVED_FLAG,
} from "../types/notificationTypes";

const initialState: NotificationState = {
  prefs: {},
  savedPrefs: {},
  loading: false,
  saving: false,
  saved: false,
  error: null,
};

const notificationReducer = (
  state = initialState,
  action: NotificationActionTypes
): NotificationState => {
  switch (action.type) {
    case FETCH_NOTIFICATION_PREFS_REQUEST:
      return { ...state, loading: true, error: null };

    case FETCH_NOTIFICATION_PREFS_SUCCESS:
      return {
        ...state,
        loading: false,
        prefs: action.payload,
        savedPrefs: action.payload,
      };

    case FETCH_NOTIFICATION_PREFS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case TOGGLE_NOTIFICATION_CHANNEL: {
      const { categoryKey, channel } = action.payload;
      const current = state.prefs[categoryKey] ?? { inApp: false, email: false };

      return {
        ...state,
        saved: false,
        prefs: {
          ...state.prefs,
          [categoryKey]: {
            ...current,
            [channel]: !current[channel],
          },
        },
      };
    }

    case SAVE_NOTIFICATION_PREFS_REQUEST:
      return { ...state, saving: true, error: null };

    case SAVE_NOTIFICATION_PREFS_SUCCESS:
      return {
        ...state,
        saving: false,
        saved: true,
        savedPrefs: action.payload,
      };

    case SAVE_NOTIFICATION_PREFS_FAILURE:
      return { ...state, saving: false, error: action.payload };

    case RESET_NOTIFICATION_SAVED_FLAG:
      return { ...state, saved: false };

    default:
      return state;
  }
};

export default notificationReducer;