import * as types from "../types/equipmentChecklistTypes";
import type { EquipmentChecklist, EquipmentDefaultList } from "../types/equipmentChecklistTypes";

interface EquipmentChecklistState {
  defaultList: EquipmentDefaultList | null;
  checklist: EquipmentChecklist | null;
  loading: boolean;
  savingDefaultList: boolean;
  error: string | null;
}

const initialState: EquipmentChecklistState = {
  defaultList: null,
  checklist: null,
  loading: false,
  savingDefaultList: false,
  error: null,
};

export default function equipmentChecklistReducer(
  state = initialState,
  action: any
): EquipmentChecklistState {
  switch (action.type) {
    case types.FETCH_DEFAULT_LIST_REQUEST:
    case types.FETCH_CHECKLIST_REQUEST:
      return { ...state, loading: true, error: null };

    case types.SAVE_DEFAULT_LIST_REQUEST:
      return { ...state, savingDefaultList: true, error: null };

    case types.FETCH_DEFAULT_LIST_SUCCESS:
      return { ...state, loading: false, defaultList: action.payload };

    case types.SAVE_DEFAULT_LIST_SUCCESS:
      return { ...state, savingDefaultList: false, defaultList: action.payload };

    case types.FETCH_CHECKLIST_SUCCESS:
    case types.ADD_CHECKLIST_ITEM_SUCCESS:
    case types.REMOVE_CHECKLIST_ITEM_SUCCESS:
    case types.TOGGLE_CHECKLIST_ITEM_SUCCESS:
      return { ...state, loading: false, checklist: action.payload };

    case types.FETCH_DEFAULT_LIST_FAILURE:
    case types.FETCH_CHECKLIST_FAILURE:
    case types.ADD_CHECKLIST_ITEM_FAILURE:
    case types.REMOVE_CHECKLIST_ITEM_FAILURE:
    case types.TOGGLE_CHECKLIST_ITEM_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case types.SAVE_DEFAULT_LIST_FAILURE:
      return { ...state, savingDefaultList: false, error: action.payload };

    default:
      return state;
  }
}