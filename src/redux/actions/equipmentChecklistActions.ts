import * as types from "../types/equipmentChecklistTypes";
import type { DefaultListItem } from "../types/equipmentChecklistTypes";

export const fetchDefaultListRequest = () => ({
  type: types.FETCH_DEFAULT_LIST_REQUEST,
});
export const fetchDefaultListSuccess = (defaultList: any) => ({
  type: types.FETCH_DEFAULT_LIST_SUCCESS,
  payload: defaultList,
});
export const fetchDefaultListFailure = (error: string) => ({
  type: types.FETCH_DEFAULT_LIST_FAILURE,
  payload: error,
});

export const saveDefaultListRequest = (items: DefaultListItem[]) => ({
  type: types.SAVE_DEFAULT_LIST_REQUEST,
  payload: items,
});
export const saveDefaultListSuccess = (defaultList: any) => ({
  type: types.SAVE_DEFAULT_LIST_SUCCESS,
  payload: defaultList,
});
export const saveDefaultListFailure = (error: string) => ({
  type: types.SAVE_DEFAULT_LIST_FAILURE,
  payload: error,
});

export const fetchChecklistRequest = (eventId: string) => ({
  type: types.FETCH_CHECKLIST_REQUEST,
  payload: eventId,
});
export const fetchChecklistSuccess = (checklist: any) => ({
  type: types.FETCH_CHECKLIST_SUCCESS,
  payload: checklist,
});
export const fetchChecklistFailure = (error: string) => ({
  type: types.FETCH_CHECKLIST_FAILURE,
  payload: error,
});

export const addChecklistItemRequest = (eventId: string, name: string, category: string) => ({
  type: types.ADD_CHECKLIST_ITEM_REQUEST,
  payload: { eventId, name, category },
});
export const addChecklistItemSuccess = (checklist: any) => ({
  type: types.ADD_CHECKLIST_ITEM_SUCCESS,
  payload: checklist,
});
export const addChecklistItemFailure = (error: string) => ({
  type: types.ADD_CHECKLIST_ITEM_FAILURE,
  payload: error,
});

export const removeChecklistItemRequest = (eventId: string, itemId: string) => ({
  type: types.REMOVE_CHECKLIST_ITEM_REQUEST,
  payload: { eventId, itemId },
});
export const removeChecklistItemSuccess = (checklist: any) => ({
  type: types.REMOVE_CHECKLIST_ITEM_SUCCESS,
  payload: checklist,
});
export const removeChecklistItemFailure = (error: string) => ({
  type: types.REMOVE_CHECKLIST_ITEM_FAILURE,
  payload: error,
});

export const toggleChecklistItemRequest = (eventId: string, itemId: string, checked: boolean) => ({
  type: types.TOGGLE_CHECKLIST_ITEM_REQUEST,
  payload: { eventId, itemId, checked },
});
export const toggleChecklistItemSuccess = (checklist: any) => ({
  type: types.TOGGLE_CHECKLIST_ITEM_SUCCESS,
  payload: checklist,
});
export const toggleChecklistItemFailure = (error: string) => ({
  type: types.TOGGLE_CHECKLIST_ITEM_FAILURE,
  payload: error,
});