import {
  GET_MEDIA,
  GET_MEDIA_SUCCESS,
  GET_MEDIA_FAILURE,
  UPLOAD_MEDIA,
  UPLOAD_MEDIA_SUCCESS,
  UPLOAD_MEDIA_FAILURE,
  DELETE_MEDIA,
  DELETE_MEDIA_SUCCESS,
  DELETE_MEDIA_FAILURE,
} from "./mediaTypes";

const initialState = {
  loading: false,
  mediaList: [],
  error: null,
};

const mediaReducer = (
  state = initialState,
  action
) => {

  switch (action.type) {

    case GET_MEDIA:
    case UPLOAD_MEDIA:
    case DELETE_MEDIA:
      return {
        ...state,
        loading: true,
      };

    case GET_MEDIA_SUCCESS:
      return {
        ...state,
        loading: false,
        mediaList: action.payload,
      };

    case UPLOAD_MEDIA_SUCCESS:
      return {
        ...state,
        loading: false,
        mediaList: [...state.mediaList, action.payload],
      };

    case DELETE_MEDIA_SUCCESS:
      return {
        ...state,
        loading: false,
        mediaList: state.mediaList.filter(
          (item) => item.id !== action.payload
        ),
      };

    case GET_MEDIA_FAILURE:
    case UPLOAD_MEDIA_FAILURE:
    case DELETE_MEDIA_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default mediaReducer;