import { call, put, takeLatest } from "redux-saga/effects";
import {
  FETCH_EVENT_MESSAGES_REQUEST,
  SEND_EVENT_MESSAGE_REQUEST,
  EDIT_EVENT_MESSAGE_REQUEST,
  DELETE_EVENT_MESSAGE_REQUEST,
  Message,
  FetchEventMessagesRequestAction,
  SendEventMessageRequestAction,
  EditEventMessageRequestAction,
  DeleteEventMessageRequestAction,
} from "../types/messageTypes";
import {
  fetchEventMessagesSuccess,
  fetchEventMessagesFailure,
  sendEventMessageSuccess,
  sendEventMessageFailure,
  editEventMessageSuccess,
  editEventMessageFailure,
  deleteEventMessageSuccess,
  deleteEventMessageFailure,
} from "../actions/messageActions";
import {
  fetchEventMessagesApi,
  sendEventMessageApi,
  editEventMessageApi,
  deleteEventMessageApi,
} from "../api/messageApi";

function* fetchEventMessagesWorker(action: FetchEventMessagesRequestAction) {
  try {
    const messages: Message[] = yield call(fetchEventMessagesApi, action.payload.eventId);
    yield put(fetchEventMessagesSuccess(action.payload.eventId, messages));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch messages.";
    yield put(fetchEventMessagesFailure(message));
  }
}

function* sendEventMessageWorker(action: SendEventMessageRequestAction) {
  try {
    const { eventId, text, attachments, mentions } = action.payload;
    const sent: Message = yield call(sendEventMessageApi, eventId, text, attachments, mentions);
    yield put(sendEventMessageSuccess(eventId, sent));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message.";
    yield put(sendEventMessageFailure(message));
  }
}

function* editEventMessageWorker(action: EditEventMessageRequestAction) {
  try {
    const { eventId, messageId, text } = action.payload;
    const updated: Message = yield call(editEventMessageApi, messageId, text);
    yield put(editEventMessageSuccess(eventId, updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to edit message.";
    yield put(editEventMessageFailure(message));
  }
}

function* deleteEventMessageWorker(action: DeleteEventMessageRequestAction) {
  try {
    const { eventId, messageId } = action.payload;
    yield call(deleteEventMessageApi, messageId);
    yield put(deleteEventMessageSuccess(eventId, messageId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete message.";
    yield put(deleteEventMessageFailure(message));
  }
}

export function* messageSaga() {
  yield takeLatest(FETCH_EVENT_MESSAGES_REQUEST, fetchEventMessagesWorker);
  yield takeLatest(SEND_EVENT_MESSAGE_REQUEST, sendEventMessageWorker);
  yield takeLatest(EDIT_EVENT_MESSAGE_REQUEST, editEventMessageWorker);
  yield takeLatest(DELETE_EVENT_MESSAGE_REQUEST, deleteEventMessageWorker);
}