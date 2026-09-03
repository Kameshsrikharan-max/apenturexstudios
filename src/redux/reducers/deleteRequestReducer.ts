import {DeleteRequestState,DeleteRequestActionTypes,
  REQUEST_ACCOUNT_DELETE_REQUEST,REQUEST_ACCOUNT_DELETE_SUCCESS,REQUEST_ACCOUNT_DELETE_FAILURE,
  FETCH_PENDING_DELETE_REQUESTS_REQUEST,FETCH_PENDING_DELETE_REQUESTS_SUCCESS,FETCH_PENDING_DELETE_REQUESTS_FAILURE,
  APPROVE_DELETE_REQUEST_REQUEST,APPROVE_DELETE_REQUEST_SUCCESS,APPROVE_DELETE_REQUEST_FAILURE,
  REJECT_DELETE_REQUEST_REQUEST,REJECT_DELETE_REQUEST_SUCCESS,REJECT_DELETE_REQUEST_FAILURE,
} from "../types/deleteRequestTypes";

const initialState: DeleteRequestState = {
  ownStatus: "none",
  requesting: false,
  requestError: null,

  pendingList: [],
  pendingLoading: false,
  pendingError: null,

  actionLoadingUserId: null,
  actionError: null,
};

const deleteRequestReducer = (
  state = initialState,
  action: DeleteRequestActionTypes
): DeleteRequestState => {
  switch (action.type) {
    case REQUEST_ACCOUNT_DELETE_REQUEST:
      return { ...state, requesting: true, requestError: null };

    case REQUEST_ACCOUNT_DELETE_SUCCESS:
      return { ...state, requesting: false, ownStatus: "pending" };

    case REQUEST_ACCOUNT_DELETE_FAILURE:
      return { ...state, requesting: false, requestError: action.payload };

    case FETCH_PENDING_DELETE_REQUESTS_REQUEST:
      return { ...state, pendingLoading: true, pendingError: null };

    case FETCH_PENDING_DELETE_REQUESTS_SUCCESS:
      return { ...state, pendingLoading: false, pendingList: action.payload };

    case FETCH_PENDING_DELETE_REQUESTS_FAILURE:
      return { ...state, pendingLoading: false, pendingError: action.payload };

    case APPROVE_DELETE_REQUEST_REQUEST:
      return { ...state, actionLoadingUserId: action.payload.userId, actionError: null };

    case APPROVE_DELETE_REQUEST_SUCCESS:
      return {
        ...state,
        actionLoadingUserId: null,
        pendingList: state.pendingList.filter((u) => u._id !== action.payload.userId),
      };

    case APPROVE_DELETE_REQUEST_FAILURE:
      return { ...state, actionLoadingUserId: null, actionError: action.payload };

    case REJECT_DELETE_REQUEST_REQUEST:
      return { ...state, actionLoadingUserId: action.payload.userId, actionError: null };

    case REJECT_DELETE_REQUEST_SUCCESS:
      return {
        ...state,
        actionLoadingUserId: null,
        pendingList: state.pendingList.filter((u) => u._id !== action.payload.userId),
      };

    case REJECT_DELETE_REQUEST_FAILURE:
      return { ...state, actionLoadingUserId: null, actionError: action.payload };

    default:
      return state;
  }
};

export default deleteRequestReducer;