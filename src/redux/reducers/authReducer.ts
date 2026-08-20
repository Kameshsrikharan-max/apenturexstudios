import {
  LOGIN_REQUEST,LOGIN_SUCCESS,LOGIN_FAILURE,SIGNUP_REQUEST,SIGNUP_SUCCESS,SIGNUP_FAILURE,LOGOUT,} from "../types/authTypes";


const savedUser = localStorage.getItem("user");
const savedToken = localStorage.getItem("token");

const initialState = {
  loading: false,
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken || null,
  error: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_REQUEST:
    case SIGNUP_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case LOGIN_SUCCESS:
    case SIGNUP_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
      };

    case LOGIN_FAILURE:
    case SIGNUP_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
      };

    default:
      return state;
  }
};

export default authReducer;