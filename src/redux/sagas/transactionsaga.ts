import { delay, put, takeLatest } from "redux-saga/effects";
import {
  FETCH_TRANSACTIONS_REQUEST,
  REFUND_TRANSACTION_REQUEST,
  EXPORT_TRANSACTIONS_REQUEST,
  RefundTransactionRequestAction,
  StoredTransaction,
} from "../types/transactiontypes";
import {
  fetchTransactionsSuccess,
  fetchTransactionsFailure,
  refundTransactionSuccess,
  refundTransactionFailure,
  exportTransactionsSuccess,
  exportTransactionsFailure,
} from "../actions/transactionActions";
// Adjust this relative path if your folder depth differs (redux/sagas -> utils)
import { getAllTransactions, upsertTransaction } from "../../utils/transactionStore";

// ---------- Seed data ----------
// Used only the very first time the app runs, when localStorage is empty.

const SEED_TRANSACTIONS: StoredTransaction[] = [
  {
    id: "txn-1001",
    eventName: "Aarav & Meera Wedding",
    clientName: "Aarav Kumar",
    date: "12/06/2026",
    method: "UPI",
    status: "Paid",
    totalAmount: 85000,
    amountPaid: 85000,
    balanceAmount: 0,
  },
  {
    id: "txn-1002",
    eventName: "Sharma Corporate Meet",
    clientName: "Rohit Sharma",
    date: "18/06/2026",
    method: "Bank Transfer",
    status: "Partial",
    totalAmount: 60000,
    amountPaid: 30000,
    balanceAmount: 30000,
  },
  {
    id: "txn-1003",
    eventName: "Priya Birthday Shoot",
    clientName: "Priya Raman",
    date: "22/06/2026",
    method: "Card",
    status: "Pending",
    totalAmount: 15000,
    amountPaid: 0,
    balanceAmount: 15000,
  },
  {
    id: "txn-1004",
    eventName: "Kavin Product Launch",
    clientName: "Kavin Studios Pvt Ltd",
    date: "02/07/2026",
    method: "Net Banking",
    status: "Refunded",
    totalAmount: 42000,
    amountPaid: 0,
    balanceAmount: 42000,
  },
  {
    id: "txn-1005",
    eventName: "Deepa Engagement",
    clientName: "Deepa Iyer",
    date: "09/07/2026",
    method: "Cash",
    status: "Paid",
    totalAmount: 28000,
    amountPaid: 28000,
    balanceAmount: 0,
  },
];

// ---------- Workers ----------

function* fetchTransactionsSaga() {
  try {
    yield delay(200);

    let list: StoredTransaction[] = getAllTransactions();

    // First-ever run: seed localStorage so the table isn't empty, and
    // future reads (from either PaymentPage or TransactionPage) stay
    // consistent with each other.
    if (list.length === 0) {
      SEED_TRANSACTIONS.forEach((t) => upsertTransaction(t));
      list = getAllTransactions();
    }

    yield put(fetchTransactionsSuccess(list));
  } catch (error: any) {
    yield put(
      fetchTransactionsFailure(error?.message || "Failed to fetch transactions")
    );
  }
}

function* refundTransactionSaga(action: RefundTransactionRequestAction) {
  try {
    yield delay(300);
    const { id } = action.payload;

    const current: StoredTransaction[] = getAllTransactions();
    const target = current.find((t) => t.id === id);

    if (!target) {
      throw new Error("Transaction not found");
    }

    const updated: StoredTransaction = {
      ...target,
      status: "Refunded",
      amountPaid: 0,
      balanceAmount: target.totalAmount,
    };

    // Persist the refund back to localStorage so it survives a refresh
    // and stays in sync with PaymentPage.
    upsertTransaction(updated);

    yield put(refundTransactionSuccess(updated));
  } catch (error: any) {
    yield put(
      refundTransactionFailure(error?.message || "Failed to refund transaction")
    );
  }
}

function* exportTransactionsSaga() {
  try {
    yield delay(300);

    const current: StoredTransaction[] = getAllTransactions();

    const header = "Event,Client,Date,Method,Status,Total,Paid,Balance\n";
    const rows = current
      .map(
        (t) =>
          `${t.eventName},${t.clientName},${t.date},${t.method},${t.status},${t.totalAmount},${t.amountPaid},${t.balanceAmount}`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `transactions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    yield put(exportTransactionsSuccess());
  } catch (error: any) {
    yield put(
      exportTransactionsFailure(error?.message || "Failed to export transactions")
    );
  }
}

// ---------- Watcher ----------

export function* transactionSaga() {
  yield takeLatest(FETCH_TRANSACTIONS_REQUEST, fetchTransactionsSaga);
  yield takeLatest(REFUND_TRANSACTION_REQUEST, refundTransactionSaga);
  yield takeLatest(EXPORT_TRANSACTIONS_REQUEST, exportTransactionsSaga);
}