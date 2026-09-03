import {
  RegistrationApprovalState,RegistrationApprovalActionTypes,
  FETCH_PENDING_REGISTRATIONS_REQUEST,FETCH_PENDING_REGISTRATIONS_SUCCESS,FETCH_PENDING_REGISTRATIONS_FAILURE,
  APPROVE_REGISTRATION_REQUEST,APPROVE_REGISTRATION_SUCCESS,APPROVE_REGISTRATION_FAILURE,
  REJECT_REGISTRATION_REQUEST,REJECT_REGISTRATION_SUCCESS,REJECT_REGISTRATION_FAILURE,
} from "../types/registrationApprovalTypes";

const initialState: RegistrationApprovalState = {
  pendingList: [],
  pendingLoading: false,
  pendingError: null,

  actionLoadingProfileId: null,
  actionError: null,
};

const registrationApprovalReducer = (
  state = initialState,
  action: RegistrationApprovalActionTypes
): RegistrationApprovalState => {
  switch (action.type) {
    case FETCH_PENDING_REGISTRATIONS_REQUEST:
      return { ...state, pendingLoading: true, pendingError: null };

    case FETCH_PENDING_REGISTRATIONS_SUCCESS:
      return { ...state, pendingLoading: false, pendingList: action.payload };

    case FETCH_PENDING_REGISTRATIONS_FAILURE:
      return { ...state, pendingLoading: false, pendingError: action.payload };

    case APPROVE_REGISTRATION_REQUEST:
      return { ...state, actionLoadingProfileId: action.payload.profileId, actionError: null };

    case APPROVE_REGISTRATION_SUCCESS:
      return {
        ...state,
        actionLoadingProfileId: null,
        pendingList: state.pendingList.filter((r) => r.profileId !== action.payload.profileId),
      };

    case APPROVE_REGISTRATION_FAILURE:
      return { ...state, actionLoadingProfileId: null, actionError: action.payload };

    case REJECT_REGISTRATION_REQUEST:
      return { ...state, actionLoadingProfileId: action.payload.profileId, actionError: null };

    case REJECT_REGISTRATION_SUCCESS:
      return {
        ...state,
        actionLoadingProfileId: null,
        pendingList: state.pendingList.filter((r) => r.profileId !== action.payload.profileId),
      };

    case REJECT_REGISTRATION_FAILURE:
      return { ...state, actionLoadingProfileId: null, actionError: action.payload };

    default:
      return state;
  }
};

export default registrationApprovalReducer;