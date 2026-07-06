import {
  GET_DASHBOARD_STATS,
  GET_DASHBOARD_STATS_SUCCESS,
  GET_DASHBOARD_STATS_FAILURE,
} from "./dashboardTypes";

const initialState = {
  loading: false,
  stats: null,
  error: null,
};

const dashboardReducer = (
  state = initialState,
  action
) => {

  switch (action.type) {

    case GET_DASHBOARD_STATS:
      return {
        ...state,
        loading: true,
      };

    case GET_DASHBOARD_STATS_SUCCESS:
      return {
        ...state,
        loading: false,
        stats: action.payload,
      };

    case GET_DASHBOARD_STATS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default dashboardReducer;