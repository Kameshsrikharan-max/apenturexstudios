import {
  LOGIN_REQUEST, LOGIN_SUCCESS, LOGIN_FAILURE,
  SIGNUP_REQUEST, SIGNUP_SUCCESS, SIGNUP_FAILURE,
  SEND_OTP_REQUEST, SEND_OTP_SUCCESS, SEND_OTP_FAILURE,
  VERIFY_OTP_REQUEST, VERIFY_OTP_FAILURE, VERIFY_OTP_NEEDS_SIGNUP,
  RESET_OTP_STATE, LOGOUT,
} from "../types/authTypes";

const savedUser = localStorage.getItem("user");
const savedToken = localStorage.getItem("token");

const initialState = {
  loading: false,
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken || null,
  error: null as string | null,

  otpSent: false,
  otpLoading: false,
  otpError: null as string | null,
  verifyingOtp: false,

  needsSignup: false,
  signupEmail: null as string | null,
  signupToken: null as string | null,
};

const authReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case LOGIN_REQUEST:
    case SIGNUP_REQUEST:
      return { ...state, loading: true, error: null };

    case LOGIN_SUCCESS:
    case SIGNUP_SUCCESS:
      return {
        ...state,
        loading: false,
        verifyingOtp: false,
        user: action.payload.user,
        token: action.payload.token,
        needsSignup: false,
        signupEmail: null,
        signupToken: null,
      };

    case LOGIN_FAILURE:
    case SIGNUP_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case SEND_OTP_REQUEST:
      return { ...state, otpLoading: true, otpError: null, otpSent: false };

    case SEND_OTP_SUCCESS:
      return { ...state, otpLoading: false, otpSent: true };

    case SEND_OTP_FAILURE:
      return { ...state, otpLoading: false, otpError: action.payload, otpSent: false };

    case VERIFY_OTP_REQUEST:
      return { ...state, verifyingOtp: true, otpError: null };

    case VERIFY_OTP_FAILURE:
      return { ...state, verifyingOtp: false, otpError: action.payload };

    case VERIFY_OTP_NEEDS_SIGNUP:
      return {
        ...state,
        verifyingOtp: false,
        needsSignup: true,
        signupEmail: action.payload.email,
        signupToken: action.payload.signupToken,
      };

    case RESET_OTP_STATE:
      return {
        ...state,
        otpSent: false,
        otpError: null,
        otpLoading: false,
        verifyingOtp: false,
        needsSignup: false,
        signupEmail: null,
        signupToken: null,
      };

    case LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        error: null,
        otpSent: false,
        otpError: null,
        needsSignup: false,
        signupEmail: null,
        signupToken: null,
      };

    default:
      return state;
  }
};

export default authReducer;