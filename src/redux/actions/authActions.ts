import {
  LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE,
  SIGNUP_REQUEST, SIGNUP_SUCCESS, SIGNUP_FAILURE,
  SEND_OTP_REQUEST, SEND_OTP_SUCCESS, SEND_OTP_FAILURE,
  VERIFY_OTP_REQUEST, VERIFY_OTP_FAILURE, VERIFY_OTP_NEEDS_SIGNUP,
  RESET_OTP_STATE, LOGOUT,
} from "../types/authTypes";

export const loginRequest = (credentials: any) => ({ type: LOGIN_REQUEST, payload: credentials });
export const loginSuccess = (data: any) => ({ type: LOGIN_SUCCESS, payload: data });
export const loginFailure = (error: string) => ({ type: LOGIN_FAILURE, payload: error });

// signupRequest now drives "complete signup after onboarding":
// payload = { signupToken, name, phone }. The saga posts this to
// /complete-signup and, on success, dispatches signupSuccess with the
// same { user, token } shape as loginSuccess.
export const signupRequest = (payload: { signupToken: string; name?: string; phone?: string }) => ({
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

export const logout = () => ({ type: LOGOUT });