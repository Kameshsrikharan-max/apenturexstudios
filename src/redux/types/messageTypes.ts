export interface Message {
  _id: string;
  eventId: string;
  senderEmail: string;
  senderName: string;
  senderRole: string;
  text: string;
  attachments: string[];
  mentions: string[];
  edited: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageState {
  // thread messages, keyed by eventId
  messagesByEvent: Record<string, Message[]>;
  fetchLoading: boolean;
  fetchError: string | null;

  // sending a new message
  sending: boolean;
  sendError: string | null;

  // edit/delete in-flight tracking
  actionLoadingMessageId: string | null;
  actionError: string | null;
}

export const FETCH_EVENT_MESSAGES_REQUEST = "FETCH_EVENT_MESSAGES_REQUEST";
export const FETCH_EVENT_MESSAGES_SUCCESS = "FETCH_EVENT_MESSAGES_SUCCESS";
export const FETCH_EVENT_MESSAGES_FAILURE = "FETCH_EVENT_MESSAGES_FAILURE";

export const SEND_EVENT_MESSAGE_REQUEST = "SEND_EVENT_MESSAGE_REQUEST";
export const SEND_EVENT_MESSAGE_SUCCESS = "SEND_EVENT_MESSAGE_SUCCESS";
export const SEND_EVENT_MESSAGE_FAILURE = "SEND_EVENT_MESSAGE_FAILURE";

export const EDIT_EVENT_MESSAGE_REQUEST = "EDIT_EVENT_MESSAGE_REQUEST";
export const EDIT_EVENT_MESSAGE_SUCCESS = "EDIT_EVENT_MESSAGE_SUCCESS";
export const EDIT_EVENT_MESSAGE_FAILURE = "EDIT_EVENT_MESSAGE_FAILURE";

export const DELETE_EVENT_MESSAGE_REQUEST = "DELETE_EVENT_MESSAGE_REQUEST";
export const DELETE_EVENT_MESSAGE_SUCCESS = "DELETE_EVENT_MESSAGE_SUCCESS";
export const DELETE_EVENT_MESSAGE_FAILURE = "DELETE_EVENT_MESSAGE_FAILURE";

// NOTE: each action interface below carries `[key: string]: unknown;`.
// Without it, TypeScript won't treat these as assignable to Redux's
// `UnknownAction` type when passed to a typed `dispatch()` call — named
// interfaces (unlike inline object literals) don't get an implicit index
// signature, so `dispatch(someAction())` fails to type-check otherwise.
// This doesn't loosen anything at runtime; it only satisfies the type checker.

export interface FetchEventMessagesRequestAction {
  type: typeof FETCH_EVENT_MESSAGES_REQUEST;
  payload: { eventId: string };
  [key: string]: unknown;
}
export interface FetchEventMessagesSuccessAction {
  type: typeof FETCH_EVENT_MESSAGES_SUCCESS;
  payload: { eventId: string; messages: Message[] };
  [key: string]: unknown;
}
export interface FetchEventMessagesFailureAction {
  type: typeof FETCH_EVENT_MESSAGES_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export interface SendEventMessageRequestAction {
  type: typeof SEND_EVENT_MESSAGE_REQUEST;
  payload: { eventId: string; text: string; attachments?: string[]; mentions?: string[] };
  [key: string]: unknown;
}
export interface SendEventMessageSuccessAction {
  type: typeof SEND_EVENT_MESSAGE_SUCCESS;
  payload: { eventId: string; message: Message };
  [key: string]: unknown;
}
export interface SendEventMessageFailureAction {
  type: typeof SEND_EVENT_MESSAGE_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export interface EditEventMessageRequestAction {
  type: typeof EDIT_EVENT_MESSAGE_REQUEST;
  payload: { eventId: string; messageId: string; text: string };
  [key: string]: unknown;
}
export interface EditEventMessageSuccessAction {
  type: typeof EDIT_EVENT_MESSAGE_SUCCESS;
  payload: { eventId: string; message: Message };
  [key: string]: unknown;
}
export interface EditEventMessageFailureAction {
  type: typeof EDIT_EVENT_MESSAGE_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export interface DeleteEventMessageRequestAction {
  type: typeof DELETE_EVENT_MESSAGE_REQUEST;
  payload: { eventId: string; messageId: string };
  [key: string]: unknown;
}
export interface DeleteEventMessageSuccessAction {
  type: typeof DELETE_EVENT_MESSAGE_SUCCESS;
  payload: { eventId: string; messageId: string };
  [key: string]: unknown;
}
export interface DeleteEventMessageFailureAction {
  type: typeof DELETE_EVENT_MESSAGE_FAILURE;
  payload: string;
  [key: string]: unknown;
}

export type MessageActionTypes =
  | FetchEventMessagesRequestAction
  | FetchEventMessagesSuccessAction
  | FetchEventMessagesFailureAction
  | SendEventMessageRequestAction
  | SendEventMessageSuccessAction
  | SendEventMessageFailureAction
  | EditEventMessageRequestAction
  | EditEventMessageSuccessAction
  | EditEventMessageFailureAction
  | DeleteEventMessageRequestAction
  | DeleteEventMessageSuccessAction
  | DeleteEventMessageFailureAction;