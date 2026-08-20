import {GET_MEDIA,GET_MEDIA_SUCCESS,GET_MEDIA_FAILURE,UPLOAD_MEDIA,UPLOAD_MEDIA_SUCCESS,UPLOAD_MEDIA_FAILURE,DELETE_MEDIA,
  DELETE_MEDIA_SUCCESS,DELETE_MEDIA_FAILURE,
} from "../types/mediaTypes";

export const getMedia = (eventId) => ({
  type: GET_MEDIA,
  payload: eventId,
});

export const getMediaSuccess = (data) => ({
  type: GET_MEDIA_SUCCESS,
  payload: data,
});

export const getMediaFailure = (error) => ({
  type: GET_MEDIA_FAILURE,
  payload: error,
});

export const uploadMedia = (formData) => ({
  type: UPLOAD_MEDIA,
  payload: formData,
});

export const uploadMediaSuccess = (data) => ({
  type: UPLOAD_MEDIA_SUCCESS,
  payload: data,
});

export const uploadMediaFailure = (error) => ({
  type: UPLOAD_MEDIA_FAILURE,
  payload: error,
});

export const deleteMedia = (mediaId) => ({
  type: DELETE_MEDIA,
  payload: mediaId,
});

export const deleteMediaSuccess = (mediaId) => ({
  type: DELETE_MEDIA_SUCCESS,
  payload: mediaId,
});

export const deleteMediaFailure = (error) => ({
  type: DELETE_MEDIA_FAILURE,
  payload: error,
});