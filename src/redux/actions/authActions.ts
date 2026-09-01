import {
  LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE,
  SIGNUP_REQUEST, SIGNUP_SUCCESS, SIGNUP_FAILURE,
  SEND_OTP_REQUEST, SEND_OTP_SUCCESS, SEND_OTP_FAILURE,
  VERIFY_OTP_REQUEST, VERIFY_OTP_FAILURE, VERIFY_OTP_NEEDS_SIGNUP,
  RESET_OTP_STATE, SET_REGISTER_ROLE, LOGOUT,
} from "../types/authTypes";

export type RegisterRole = "studio_admin" | "freelance_photographer";

export const loginRequest = (credentials: any) => ({ type: LOGIN_REQUEST, payload: credentials });
export const loginSuccess = (data: any) => ({ type: LOGIN_SUCCESS, payload: data });
export const loginFailure = (error: string) => ({ type: LOGIN_FAILURE, payload: error });

// signupRequest drives "complete signup after onboarding":
// payload = { signupToken, name, phone, role? }. role is optional here —
// if omitted, the saga fills it in from state.auth.registerRole (set by
// setRegisterRole when the user picked a role on the Register page).
export const signupRequest = (payload: { signupToken: string; name?: string; phone?: string; role?: RegisterRole }) => ({
  type: SIGNUP_REQUEST,
  payload,
});
export const signupSuccess = (data: any) => ({ type: SIGNUP_SUCCESS, payload: data });
export const signupFailure = (error: string) => ({ type: SIGNUP_FAILURE, payload: error });

export const sendOtpRequest = (email: string) => ({ type: SEND_OTP_REQUEST, payload: { email } });
export const sendOtpSuccess = () => ({ type: SEND_OTP_SUCCESS });
export const sendOtpFailure = (error: string) => ({ type: SEND_OTP_FAILURE, payload: error });

export const verifyOtpRequest = (email: string, otp: string) => ({ type: VERIFY_OTP_REQUEST, payload: { email, otp } });
export const verifyOtpFailure = (error: string) => ({ type: VERIFY_OTP_FAILURE, payload: error });
export const verifyOtpNeedsSignup = (email: string, signupToken: string) => ({
  type: VERIFY_OTP_NEEDS_SIGNUP,
  payload: { email, signupToken },
});
export const resetOtpState = () => ({ type: RESET_OTP_STATE });

// Fired when the user picks a role on the Register page, before OTP is
// even sent. Persists in redux so it's still available once needsSignup
// fires and the onboarding step eventually calls signupRequest.
export const setRegisterRole = (role: RegisterRole) => ({ type: SET_REGISTER_ROLE, payload: role });

export const logout = () => ({ type: LOGOUT });