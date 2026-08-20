import {FETCH_TRANSACTIONS_REQUEST,FETCH_TRANSACTIONS_SUCCESS,FETCH_TRANSACTIONS_FAILURE,
  REFUND_TRANSACTION_REQUEST,REFUND_TRANSACTION_SUCCESS,REFUND_TRANSACTION_FAILURE,
  EXPORT_TRANSACTIONS_REQUEST,EXPORT_TRANSACTIONS_SUCCESS,EXPORT_TRANSACTIONS_FAILURE,
  RESET_TRANSACTION_ERROR,
  StoredTransaction,
  FetchTransactionsRequestAction,FetchTransactionsSuccessAction,FetchTransactionsFailureAction,RefundTransactionRequestAction,RefundTransactionSuccessAction,RefundTransactionFailureAction,
  ExportTransactionsRequestAction,ExportTransactionsSuccessAction,ExportTransactionsFailureAction,ResetTransactionErrorAction,
} from "../types/transactiontypes";

// ---------- Fetch transactions ----------

export const fetchTransactionsRequest = (): FetchTransactionsRequestAction => ({
  type: FETCH_TRANSACTIONS_REQUEST,
});

export const fetchTransactionsSuccess = (
  transactions: StoredTransaction[]
): FetchTransactionsSuccessAction => ({
  type: FETCH_TRANSACTIONS_SUCCESS,
  payload: transactions,
});

export const fetchTransactionsFailure = (
  error: string
): FetchTransactionsFailureAction => ({
  type: FETCH_TRANSACTIONS_FAILURE,
  payload: error,
});

// ---------- Refund transaction ----------

export const refundTransactionRequest = (
  id: string
): RefundTransactionRequestAction => ({
  type: REFUND_TRANSACTION_REQUEST,
  payload: { id },
});

export const refundTransactionSuccess = (
  transaction: StoredTransaction
): RefundTransactionSuccessAction => ({
  type: REFUND_TRANSACTION_SUCCESS,
  payload: transaction,
});

export const refundTransactionFailure = (
  error: string
): RefundTransactionFailureAction => ({
  type: REFUND_TRANSACTION_FAILURE,
  payload: error,
});

// ---------- Export transactions ----------

export const exportTransactionsRequest = (): ExportTransactionsRequestAction => ({
  type: EXPORT_TRANSACTIONS_REQUEST,
});

export const exportTransactionsSuccess = (): ExportTransactionsSuccessAction => ({
  type: EXPORT_TRANSACTIONS_SUCCESS,
});

export const exportTransactionsFailure = (
  error: string
): ExportTransactionsFailureAction => ({
  type: EXPORT_TRANSACTIONS_FAILURE,
  payload: error,
});

// ---------- Reset ----------

export const resetTransactionError = (): ResetTransactionErrorAction => ({
  type: RESET_TRANSACTION_ERROR,
});