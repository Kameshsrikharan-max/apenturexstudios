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
} from "./reviewTypes";

export const getReviews = (eventId) => ({
  type: GET_REVIEWS,
  payload: eventId,
});

export const getReviewsSuccess = (data) => ({
  type: GET_REVIEWS_SUCCESS,
  payload: data,
});

export const getReviewsFailure = (error) => ({
  type: GET_REVIEWS_FAILURE,
  payload: error,
});

export const addReview = (data) => ({
  type: ADD_REVIEW,
  payload: data,
});

export const addReviewSuccess = (data) => ({
  type: ADD_REVIEW_SUCCESS,
  payload: data,
});

export const addReviewFailure = (error) => ({
  type: ADD_REVIEW_FAILURE,
  payload: error,
});

export const deleteReview = (reviewId) => ({
  type: DELETE_REVIEW,
  payload: reviewId,
});

export const deleteReviewSuccess = (reviewId) => ({
  type: DELETE_REVIEW_SUCCESS,
  payload: reviewId,
});

export const deleteReviewFailure = (error) => ({
  type: DELETE_REVIEW_FAILURE,
  payload: error,
});