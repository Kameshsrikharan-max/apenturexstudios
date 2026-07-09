import {
  GET_DASHBOARD_STATS,
  GET_DASHBOARD_STATS_SUCCESS,
  GET_DASHBOARD_STATS_FAILURE,
} from "../types/dashboardTypes";

export const getDashboardStats = () => ({
  type: GET_DASHBOARD_STATS,
});

export const getDashboardStatsSuccess = (data) => ({
  type: GET_DASHBOARD_STATS_SUCCESS,
  payload: data,
});

export const getDashboardStatsFailure = (error) => ({
  type: GET_DASHBOARD_STATS_FAILURE,
  payload: error,
});