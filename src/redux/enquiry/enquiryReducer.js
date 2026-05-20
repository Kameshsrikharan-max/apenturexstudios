import {
  GET_ENQUIRIES,
  GET_ENQUIRIES_SUCCESS,
  GET_ENQUIRIES_FAILURE,
} from "./enquiryTypes";

const initialState = {
  loading: false,
  enquiries: [],
  error: null,
};

const enquiryReducer = (
  state = initialState,
  action
) => {

  switch (action.type) {

    case GET_ENQUIRIES:
      return {
        ...state,
        loading: true,
      };

    case GET_ENQUIRIES_SUCCESS:
      return {
        ...state,
        loading: false,
        enquiries: action.payload,
      };

    case GET_ENQUIRIES_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default enquiryReducer;