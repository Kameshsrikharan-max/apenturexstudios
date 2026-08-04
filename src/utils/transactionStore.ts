// Adjust the path when importing from PaymentPage/TransactionPage to match your folder depth
export type TransactionStatus = "Paid" | "Partial" | "Pending" | "Refunded";
export type PaymentMethod = "UPI" | "Card" | "Net Banking" | "Cash" | "Bank Transfer";

export interface StoredTransaction {
  id: string; // stable per-event identifier
  eventName: string;
  clientName: string;
  date: string;
  totalAmount: number;
  amountPaid: number;
  balanceAmount: number;
  status: TransactionStatus;
  method: PaymentMethod;
}

const STORAGE_KEY = "axs_transactions";
export const TRANSACTIONS_UPDATED_EVENT = "axs-transactions-updated";

export function getAllTransactions(): StoredTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read transactions", error);
    return [];
  }
}

export function upsertTransaction(tx: StoredTransaction) {
  try {
    const all = getAllTransactions();
    const idx = all.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      all[idx] = tx;
    } else {
      all.push(tx);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(TRANSACTIONS_UPDATED_EVENT));
  } catch (error) {
    console.error("Failed to save transaction", error);
  }
}

export function removeTransaction(id: string) {
  try {
    const all = getAllTransactions().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(TRANSACTIONS_UPDATED_EVENT));
  } catch (error) {
    console.error("Failed to remove transaction", error);
  }
}