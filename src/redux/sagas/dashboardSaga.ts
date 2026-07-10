import { call, put, takeLatest } from "redux-saga/effects";
import axios from "axios";

import { GET_DASHBOARD_STATS } from "../types/dashboardTypes";

import {
  getDashboardStatsSuccess,
  getDashboardStatsFailure,
} from "../actions/dashboardActions";

const fetchDashboardStatsAPI = () => {
  return axios.get(
    "https://your-api.com/api/dashboard/stats"
  );
};

function* fetchDashboardStats() {

  try {

    const response = yield call(
      fetchDashboardStatsAPI
    );

    yield put(
      getDashboardStatsSuccess(response.data)
    );

  } catch (error) {

    yield put(
      getDashboardStatsFailure(error.message)
    );

  }
}

export function* dashboardSaga() {

  yield takeLatest(
    GET_DASHBOARD_STATS,
    fetchDashboardStats
  );

}