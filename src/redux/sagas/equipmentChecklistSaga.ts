import { call, put, takeLatest } from "redux-saga/effects";
import * as types from "../types/equipmentChecklistTypes";
import * as actions from "../actions/equipmentChecklistActions";
import {
  fetchDefaultListApi,
  saveDefaultListApi,
  fetchChecklistApi,
  addChecklistItemApi,
  removeChecklistItemApi,
  toggleChecklistItemApi,
} from "../api/equipmentChecklistApi";

function* fetchDefaultListWorker(): any {
  try {
    const defaultList = yield call(fetchDefaultListApi);
    yield put(actions.fetchDefaultListSuccess(defaultList));
  } catch (err: any) {
    yield put(actions.fetchDefaultListFailure(err?.message || "Failed to load default list"));
  }
}

function* saveDefaultListWorker(action: any): any {
  try {
    const defaultList = yield call(saveDefaultListApi, action.payload);
    yield put(actions.saveDefaultListSuccess(defaultList));
  } catch (err: any) {
    yield put(actions.saveDefaultListFailure(err?.message || "Failed to save default list"));
  }
}

function* fetchChecklistWorker(action: any): any {
  try {
    const checklist = yield call(fetchChecklistApi, action.payload);
    yield put(actions.fetchChecklistSuccess(checklist));
  } catch (err: any) {
    yield put(actions.fetchChecklistFailure(err?.message || "Failed to load checklist"));
  }
}

function* addChecklistItemWorker(action: any): any {
  try {
    const { eventId, name, category } = action.payload;
    const checklist = yield call(addChecklistItemApi, eventId, name, category);
    yield put(actions.addChecklistItemSuccess(checklist));
  } catch (err: any) {
    yield put(actions.addChecklistItemFailure(err?.message || "Failed to add item"));
  }
}

function* removeChecklistItemWorker(action: any): any {
  try {
    const { eventId, itemId } = action.payload;
    const checklist = yield call(removeChecklistItemApi, eventId, itemId);
    yield put(actions.removeChecklistItemSuccess(checklist));
  } catch (err: any) {
    yield put(actions.removeChecklistItemFailure(err?.message || "Failed to remove item"));
  }
}

function* toggleChecklistItemWorker(action: any): any {
  try {
    const { eventId, itemId, checked } = action.payload;
    const checklist = yield call(toggleChecklistItemApi, eventId, itemId, checked);
    yield put(actions.toggleChecklistItemSuccess(checklist));
  } catch (err: any) {
    yield put(actions.toggleChecklistItemFailure(err?.message || "Failed to update item"));
  }
}

// Named export to match the rest of the codebase's sagas (deleteRequestSaga,
// registrationApprovalSaga, etc. are all named exports combined in rootSaga.ts).
export function* equipmentChecklistSaga() {
  yield takeLatest(types.FETCH_DEFAULT_LIST_REQUEST, fetchDefaultListWorker);
  yield takeLatest(types.SAVE_DEFAULT_LIST_REQUEST, saveDefaultListWorker);
  yield takeLatest(types.FETCH_CHECKLIST_REQUEST, fetchChecklistWorker);
  yield takeLatest(types.ADD_CHECKLIST_ITEM_REQUEST, addChecklistItemWorker);
  yield takeLatest(types.REMOVE_CHECKLIST_ITEM_REQUEST, removeChecklistItemWorker);
  yield takeLatest(types.TOGGLE_CHECKLIST_ITEM_REQUEST, toggleChecklistItemWorker);
}