export const FETCH_DEFAULT_LIST_REQUEST = "FETCH_DEFAULT_LIST_REQUEST";
export const FETCH_DEFAULT_LIST_SUCCESS = "FETCH_DEFAULT_LIST_SUCCESS";
export const FETCH_DEFAULT_LIST_FAILURE = "FETCH_DEFAULT_LIST_FAILURE";

export const SAVE_DEFAULT_LIST_REQUEST = "SAVE_DEFAULT_LIST_REQUEST";
export const SAVE_DEFAULT_LIST_SUCCESS = "SAVE_DEFAULT_LIST_SUCCESS";
export const SAVE_DEFAULT_LIST_FAILURE = "SAVE_DEFAULT_LIST_FAILURE";

export const FETCH_CHECKLIST_REQUEST = "FETCH_CHECKLIST_REQUEST";
export const FETCH_CHECKLIST_SUCCESS = "FETCH_CHECKLIST_SUCCESS";
export const FETCH_CHECKLIST_FAILURE = "FETCH_CHECKLIST_FAILURE";

export const ADD_CHECKLIST_ITEM_REQUEST = "ADD_CHECKLIST_ITEM_REQUEST";
export const ADD_CHECKLIST_ITEM_SUCCESS = "ADD_CHECKLIST_ITEM_SUCCESS";
export const ADD_CHECKLIST_ITEM_FAILURE = "ADD_CHECKLIST_ITEM_FAILURE";

export const REMOVE_CHECKLIST_ITEM_REQUEST = "REMOVE_CHECKLIST_ITEM_REQUEST";
export const REMOVE_CHECKLIST_ITEM_SUCCESS = "REMOVE_CHECKLIST_ITEM_SUCCESS";
export const REMOVE_CHECKLIST_ITEM_FAILURE = "REMOVE_CHECKLIST_ITEM_FAILURE";

export const TOGGLE_CHECKLIST_ITEM_REQUEST = "TOGGLE_CHECKLIST_ITEM_REQUEST";
export const TOGGLE_CHECKLIST_ITEM_SUCCESS = "TOGGLE_CHECKLIST_ITEM_SUCCESS";
export const TOGGLE_CHECKLIST_ITEM_FAILURE = "TOGGLE_CHECKLIST_ITEM_FAILURE";

export interface ChecklistItem {
  _id: string;
  name: string;
  category: string;
  checked: boolean;
  checkedBy: string;
  checkedAt: string | null;
}

export interface EquipmentChecklist {
  _id: string;
  event: string;
  items: ChecklistItem[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DefaultListItem {
  _id?: string;
  name: string;
  category: string;
}

export interface EquipmentDefaultList {
  _id?: string;
  owner: string;
  items: DefaultListItem[];
  _isFallback?: boolean;
}