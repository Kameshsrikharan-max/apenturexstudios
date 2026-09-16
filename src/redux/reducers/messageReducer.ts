import {
  MessageState, MessageActionTypes,
  FETCH_EVENT_MESSAGES_REQUEST, FETCH_EVENT_MESSAGES_SUCCESS, FETCH_EVENT_MESSAGES_FAILURE,
  SEND_EVENT_MESSAGE_REQUEST, SEND_EVENT_MESSAGE_SUCCESS, SEND_EVENT_MESSAGE_FAILURE,
  EDIT_EVENT_MESSAGE_REQUEST, EDIT_EVENT_MESSAGE_SUCCESS, EDIT_EVENT_MESSAGE_FAILURE,
  DELETE_EVENT_MESSAGE_REQUEST, DELETE_EVENT_MESSAGE_SUCCESS, DELETE_EVENT_MESSAGE_FAILURE,
} from "../types/messageTypes";

const initialState: MessageState = {
  messagesByEvent: {},
  fetchLoading: false,
  fetchError: null,

  sending: false,
  sendError: null,

  actionLoadingMessageId: null,
  actionError: null,
};

const messageReducer = (
  state = initialState,
  action: MessageActionTypes
): MessageState => {
  switch (action.type) {
    case FETCH_EVENT_MESSAGES_REQUEST:
      return { ...state, fetchLoading: true, fetchError: null };

    case FETCH_EVENT_MESSAGES_SUCCESS:
      return {
        ...state,
        fetchLoading: false,
        messagesByEvent: {
          ...state.messagesByEvent,
          [action.payload.eventId]: action.payload.messages,
        },
      };

    case FETCH_EVENT_MESSAGES_FAILURE:
      return { ...state, fetchLoading: false, fetchError: action.payload };

    case SEND_EVENT_MESSAGE_REQUEST:
      return { ...state, sending: true, sendError: null };

    case SEND_EVENT_MESSAGE_SUCCESS:
      return {
        ...state,
        sending: false,
        messagesByEvent: {
          ...state.messagesByEvent,
          [action.payload.eventId]: [
            ...(state.messagesByEvent[action.payload.eventId] || []),
            action.payload.message,
          ],
        },
      };

    case SEND_EVENT_MESSAGE_FAILURE:
      return { ...state, sending: false, sendError: action.payload };

    case EDIT_EVENT_MESSAGE_REQUEST:
      return { ...state, actionLoadingMessageId: action.payload.messageId, actionError: null };

    case EDIT_EVENT_MESSAGE_SUCCESS:
      return {
        ...state,
        actionLoadingMessageId: null,
        messagesByEvent: {
          ...state.messagesByEvent,
          [action.payload.eventId]: (state.messagesByEvent[action.payload.eventId] || []).map((m) =>
            m._id === action.payload.message._id ? action.payload.message : m
          ),
        },
      };

    case EDIT_EVENT_MESSAGE_FAILURE:
      return { ...state, actionLoadingMessageId: null, actionError: action.payload };

    case DELETE_EVENT_MESSAGE_REQUEST:
      return { ...state, actionLoadingMessageId: action.payload.messageId, actionError: null };

    case DELETE_EVENT_MESSAGE_SUCCESS:
      return {
        ...state,
        actionLoadingMessageId: null,
        messagesByEvent: {
          ...state.messagesByEvent,
          [action.payload.eventId]: (state.messagesByEvent[action.payload.eventId] || []).filter(
            (m) => m._id !== action.payload.messageId
          ),
        },
      };

    case DELETE_EVENT_MESSAGE_FAILURE:
      return { ...state, actionLoadingMessageId: null, actionError: action.payload };

    default:
      return state;
  }
};

export default messageReducer;