import {
  FETCH_TRANSACTIONS_REQUEST,
  FETCH_TRANSACTIONS_SUCCESS,
  FETCH_TRANSACTIONS_FAILURE,
  REFUND_TRANSACTION_REQUEST,
  REFUND_TRANSACTION_SUCCESS,
  REFUND_TRANSACTION_FAILURE,
  EXPORT_TRANSACTIONS_REQUEST,
  EXPORT_TRANSACTIONS_SUCCESS,
  EXPORT_TRANSACTIONS_FAILURE,
  RESET_TRANSACTION_ERROR,
  TransactionState,
  TransactionActionTypes,
} from "../types/transactiontypes";

const initialState: TransactionState = {
  list: [],
  loading: false,
  error: null,

  refundLoadingId: null,
  refundError: null,

  exporting: false,
  exportError: null,
};

const transactionReducer = (
  state: TransactionState = initialState,
  action: TransactionActionTypes
): TransactionState => {
  switch (action.type) {
    // ---- Fetch ----
    case FETCH_TRANSACTIONS_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_TRANSACTIONS_SUCCESS:
      return { ...state, loading: false, list: action.payload };
    case FETCH_TRANSACTIONS_FAILURE:
      return { ...state, loading: false, error: action.payload };

    // ---- Refund ----
    case REFUND_TRANSACTION_REQUEST:
      return { ...state, refundLoadingId: action.payload.id, refundError: null };
    case REFUND_TRANSACTION_SUCCESS:
      return {
        ...state,
        refundLoadingId: null,
        list: state.list.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case REFUND_TRANSACTION_FAILURE:
      return { ...state, refundLoadingId: null, refundError: action.payload };

    // ---- Export ----
    case EXPORT_TRANSACTIONS_REQUEST:
      return { ...state, exporting: true, exportError: null };
    case EXPORT_TRANSACTIONS_SUCCESS:
      return { ...state, exporting: false };
    case EXPORT_TRANSACTIONS_FAILURE:
      return { ...state, exporting: false, exportError: action.payload };

    // ---- Reset ----
    case RESET_TRANSACTION_ERROR:
      return { ...state, error: null, refundError: null, exportError: null };

    default:
      return state;
  }
};

export default transactionReducer;