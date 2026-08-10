// ---------- Domain model ----------

export type PaymentMethod = "UPI" | "Card" | "Net Banking" | "Cash" | "Bank Transfer";
export type TransactionStatus = "Paid" | "Partial" | "Pending" | "Refunded";

export interface StoredTransaction {
  id: string;
  eventName: string;
  clientName: string;
  date: string;
  method: PaymentMethod;
  status: TransactionStatus;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
}

// ---------- Action type constants ----------

export const FETCH_TRANSACTIONS_REQUEST = "transaction/FETCH_TRANSACTIONS_REQUEST";
export const FETCH_TRANSACTIONS_SUCCESS = "transaction/FETCH_TRANSACTIONS_SUCCESS";
export const FETCH_TRANSACTIONS_FAILURE = "transaction/FETCH_TRANSACTIONS_FAILURE";

export const REFUND_TRANSACTION_REQUEST = "transaction/REFUND_TRANSACTION_REQUEST";
export const REFUND_TRANSACTION_SUCCESS = "transaction/REFUND_TRANSACTION_SUCCESS";
export const REFUND_TRANSACTION_FAILURE = "transaction/REFUND_TRANSACTION_FAILURE";

export const EXPORT_TRANSACTIONS_REQUEST = "transaction/EXPORT_TRANSACTIONS_REQUEST";
export const EXPORT_TRANSACTIONS_SUCCESS = "transaction/EXPORT_TRANSACTIONS_SUCCESS";
export const EXPORT_TRANSACTIONS_FAILURE = "transaction/EXPORT_TRANSACTIONS_FAILURE";

export const RESET_TRANSACTION_ERROR = "transaction/RESET_TRANSACTION_ERROR";

// ---------- Action interfaces ----------

export interface FetchTransactionsRequestAction {
  type: typeof FETCH_TRANSACTIONS_REQUEST;
}
export interface FetchTransactionsSuccessAction {
  type: typeof FETCH_TRANSACTIONS_SUCCESS;
  payload: StoredTransaction[];
}
export interface FetchTransactionsFailureAction {
  type: typeof FETCH_TRANSACTIONS_FAILURE;
  payload: string;
}

export interface RefundTransactionRequestAction {
  type: typeof REFUND_TRANSACTION_REQUEST;
  payload: { id: string };
}
export interface RefundTransactionSuccessAction {
  type: typeof REFUND_TRANSACTION_SUCCESS;
  payload: StoredTransaction;
}
export interface RefundTransactionFailureAction {
  type: typeof REFUND_TRANSACTION_FAILURE;
  payload: string;
}

export interface ExportTransactionsRequestAction {
  type: typeof EXPORT_TRANSACTIONS_REQUEST;
}
export interface ExportTransactionsSuccessAction {
  type: typeof EXPORT_TRANSACTIONS_SUCCESS;
}
export interface ExportTransactionsFailureAction {
  type: typeof EXPORT_TRANSACTIONS_FAILURE;
  payload: string;
}

export interface ResetTransactionErrorAction {
  type: typeof RESET_TRANSACTION_ERROR;
}

export type TransactionActionTypes =
  | FetchTransactionsRequestAction
  | FetchTransactionsSuccessAction
  | FetchTransactionsFailureAction
  | RefundTransactionRequestAction
  | RefundTransactionSuccessAction
  | RefundTransactionFailureAction
  | ExportTransactionsRequestAction
  | ExportTransactionsSuccessAction
  | ExportTransactionsFailureAction
  | ResetTransactionErrorAction;

// ---------- State shape ----------

export interface TransactionState {
  list: StoredTransaction[];
  loading: boolean;
  error: string | null;

  refundLoadingId: string | null;
  refundError: string | null;

  exporting: boolean;
  exportError: string | null;
}