import {LOGIN_REQUEST,LOGIN_SUCCESS,LOGIN_FAILURE,SIGNUP_REQUEST,SIGNUP_SUCCESS,SIGNUP_FAILURE,LOGOUT,
} from "../types/authTypes";

export const loginRequest = (credentials) => ({
  type: LOGIN_REQUEST,
  payload: credentials,
});

export const loginSuccess = (data) => ({
  type: LOGIN_SUCCESS,
  payload: data,
});

export const loginFailure = (error) => ({
  type: LOGIN_FAILURE,
  payload: error,
});

export const signupRequest = (credentials) => ({
  type: SIGNUP_REQUEST,
  payload: credentials, 
});

export const signupSuccess = (data) => ({
  type: SIGNUP_SUCCESS,
  payload: data,
});

export const signupFailure = (error) => ({
  type: SIGNUP_FAILURE,
  payload: error,
});

export const logout = () => ({
  type: LOGOUT,
});