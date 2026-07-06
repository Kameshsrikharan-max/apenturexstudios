import {
  GET_PROFILE,
  GET_PROFILE_SUCCESS,
  GET_PROFILE_FAILURE,
  UPDATE_PROFILE,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_PROFILE_FAILURE,
} from "./profileTypes";

export const getProfile = () => ({
  type: GET_PROFILE,
});

export const getProfileSuccess = (data) => ({
  type: GET_PROFILE_SUCCESS,
  payload: data,
});

export const getProfileFailure = (error) => ({
  type: GET_PROFILE_FAILURE,
  payload: error,
});

export const updateProfile = (data) => ({
  type: UPDATE_PROFILE,
  payload: data,
});

export const updateProfileSuccess = (data) => ({
  type: UPDATE_PROFILE_SUCCESS,
  payload: data,
});

export const updateProfileFailure = (error) => ({
  type: UPDATE_PROFILE_FAILURE,
  payload: error,
});