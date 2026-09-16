import {
  FETCH_EVENT_MESSAGES_REQUEST, FETCH_EVENT_MESSAGES_SUCCESS, FETCH_EVENT_MESSAGES_FAILURE,
  SEND_EVENT_MESSAGE_REQUEST, SEND_EVENT_MESSAGE_SUCCESS, SEND_EVENT_MESSAGE_FAILURE,
  EDIT_EVENT_MESSAGE_REQUEST, EDIT_EVENT_MESSAGE_SUCCESS, EDIT_EVENT_MESSAGE_FAILURE,
  DELETE_EVENT_MESSAGE_REQUEST, DELETE_EVENT_MESSAGE_SUCCESS, DELETE_EVENT_MESSAGE_FAILURE,
  Message,
  FetchEventMessagesRequestAction, FetchEventMessagesSuccessAction, FetchEventMessagesFailureAction,
  SendEventMessageRequestAction, SendEventMessageSuccessAction, SendEventMessageFailureAction,
  EditEventMessageRequestAction, EditEventMessageSuccessAction, EditEventMessageFailureAction,
  DeleteEventMessageRequestAction, DeleteEventMessageSuccessAction, DeleteEventMessageFailureAction,
} from "../types/messageTypes";

export const fetchEventMessagesRequest = (
  eventId: string
): FetchEventMessagesRequestAction => ({
  type: FETCH_EVENT_MESSAGES_REQUEST,
  payload: { eventId },
});

export const fetchEventMessagesSuccess = (
  eventId: string,
  messages: Message[]
): FetchEventMessagesSuccessAction => ({
  type: FETCH_EVENT_MESSAGES_SUCCESS,
  payload: { eventId, messages },
});

export const fetchEventMessagesFailure = (
  payload: string
): FetchEventMessagesFailureAction => ({
  type: FETCH_EVENT_MESSAGES_FAILURE,
  payload,
});

export const sendEventMessageRequest = (
  eventId: string,
  text: string,
  attachments?: string[],
  mentions?: string[]
): SendEventMessageRequestAction => ({
  type: SEND_EVENT_MESSAGE_REQUEST,
  payload: { eventId, text, attachments, mentions },
});

export const sendEventMessageSuccess = (
  eventId: string,
  message: Message
): SendEventMessageSuccessAction => ({
  type: SEND_EVENT_MESSAGE_SUCCESS,
  payload: { eventId, message },
});

export const sendEventMessageFailure = (
  payload: string
): SendEventMessageFailureAction => ({
  type: SEND_EVENT_MESSAGE_FAILURE,
  payload,
});

export const editEventMessageRequest = (
  eventId: string,
  messageId: string,
  text: string
): EditEventMessageRequestAction => ({
  type: EDIT_EVENT_MESSAGE_REQUEST,
  payload: { eventId, messageId, text },
});

export const editEventMessageSuccess = (
  eventId: string,
  message: Message
): EditEventMessageSuccessAction => ({
  type: EDIT_EVENT_MESSAGE_SUCCESS,
  payload: { eventId, message },
});

export const editEventMessageFailure = (
  payload: string
): EditEventMessageFailureAction => ({
  type: EDIT_EVENT_MESSAGE_FAILURE,
  payload,
});

export const deleteEventMessageRequest = (
  eventId: string,
  messageId: string
): DeleteEventMessageRequestAction => ({
  type: DELETE_EVENT_MESSAGE_REQUEST,
  payload: { eventId, messageId },
});

export const deleteEventMessageSuccess = (
  eventId: string,
  messageId: string
): DeleteEventMessageSuccessAction => ({
  type: DELETE_EVENT_MESSAGE_SUCCESS,
  payload: { eventId, messageId },
});

export const deleteEventMessageFailure = (
  payload: string
): DeleteEventMessageFailureAction => ({
  type: DELETE_EVENT_MESSAGE_FAILURE,
  payload,
});