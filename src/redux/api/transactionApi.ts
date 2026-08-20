import type { StoredTransaction } from "../types/transactiontypes";

const STORAGE_KEY = "axs_transactions";
export const TRANSACTIONS_UPDATED_EVENT = "axs-transactions-updated";


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

function readRaw(): StoredTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TRANSACTIONS));
      return SEED_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_TRANSACTIONS;
  } catch (err) {
    console.error("transactionApi: failed to read localStorage", err);
    return SEED_TRANSACTIONS;
  }
}

function writeRaw(list: StoredTransaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(TRANSACTIONS_UPDATED_EVENT, { detail: list }));
  } catch (err) {
    console.error("transactionApi: failed to write localStorage", err);
  }
}


export function getTransactions(): StoredTransaction[] {
  return readRaw();
}

export function upsertTransaction(txn: StoredTransaction): StoredTransaction[] {
  const current = readRaw();
  const index = current.findIndex((t) => t.id === txn.id);
  let next: StoredTransaction[];
  if (index === -1) {
    next = [txn, ...current];
  } else {
    next = current.map((t, i) => (i === index ? { ...t, ...txn } : t));
  }
  writeRaw(next);
  return next;
}


export function refundTransactionInStore(id: string): StoredTransaction | null {
  const current = readRaw();
  const target = current.find((t) => t.id === id);
  if (!target) return null;

  const updated: StoredTransaction = {
    ...target,
    status: "Refunded",
    amountPaid: 0,
    balanceAmount: target.totalAmount,
  };

  const next = current.map((t) => (t.id === id ? updated : t));
  writeRaw(next);
  return updated;
}