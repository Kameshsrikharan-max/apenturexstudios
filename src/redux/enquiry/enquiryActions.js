import {
  GET_ENQUIRIES,
  GET_ENQUIRIES_SUCCESS,
  GET_ENQUIRIES_FAILURE,
} from "./enquiryTypes";

export const getEnquiries = () => ({
  type: GET_ENQUIRIES,
});

export const getEnquiriesSuccess = (data) => ({
  type: GET_ENQUIRIES_SUCCESS,
  payload: data,
});

export const getEnquiriesFailure = (error) => ({
  type: GET_ENQUIRIES_FAILURE,
  payload: error,
});