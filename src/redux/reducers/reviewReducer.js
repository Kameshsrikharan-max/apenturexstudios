import {
  GET_REVIEWS,
  GET_REVIEWS_SUCCESS,
  GET_REVIEWS_FAILURE,
  ADD_REVIEW,
  ADD_REVIEW_SUCCESS,
  ADD_REVIEW_FAILURE,
  DELETE_REVIEW,
  DELETE_REVIEW_SUCCESS,
  DELETE_REVIEW_FAILURE,
} from "../types/reviewTypes";
const initialState = {
  loading: false,
  reviews: [],
  error: null,
};

const reviewReducer = (
  state = initialState,
  action
) => {

  switch (action.type) {

    case GET_REVIEWS:
    case ADD_REVIEW:
    case DELETE_REVIEW:
      return {
        ...state,
        loading: true,
      };

    case GET_REVIEWS_SUCCESS:
      return {
        ...state,
        loading: false,
        reviews: action.payload,
      };

    case ADD_REVIEW_SUCCESS:
      return {
        ...state,
        loading: false,
        reviews: [...state.reviews, action.payload],
      };

    case DELETE_REVIEW_SUCCESS:
      return {
        ...state,
        loading: false,
        reviews: state.reviews.filter(
          (item) => item.id !== action.payload
        ),
      };

    case GET_REVIEWS_FAILURE:
    case ADD_REVIEW_FAILURE:
    case DELETE_REVIEW_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default reviewReducer;