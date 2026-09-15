export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";

export interface StoredInvoice {
  transactionId: string;
  invoiceNumber: string;
  dueDate: string;       // ISO date
  gstEnabled: boolean;
  gstRate: number;       // e.g. 18
  notes: string;
  status: InvoiceStatus;
  sentDate: string | null;
  createdAt: string;
}

const STORAGE_KEY = "axs_invoices";
const COUNTER_KEY = "axs_invoice_counter";
export const INVOICES_UPDATED_EVENT = "axs-invoices-updated";

function readRaw(): StoredInvoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("invoiceStore: failed to read localStorage", err);
    return [];
  }
}

function writeRaw(list: StoredInvoice[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(INVOICES_UPDATED_EVENT, { detail: list }));
  } catch (err) {
    console.error("invoiceStore: failed to write localStorage", err);
  }
}

function nextInvoiceNumber(): string {
  const year = new Date().getFullYear();
  let counter = 1;
  try {
    counter = parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10) + 1;
    localStorage.setItem(COUNTER_KEY, String(counter));
  } catch (err) {
    console.error("invoiceStore: counter failed", err);
  }
  return `INV-${year}-${String(counter).padStart(4, "0")}`;
}

export function getAllInvoices(): StoredInvoice[] {
  return readRaw();
}

export function getInvoiceForTransaction(transactionId: string): StoredInvoice | null {
  return readRaw().find((i) => i.transactionId === transactionId) || null;
}

export function generateInvoice(
  transactionId: string,
  opts?: Partial<Pick<StoredInvoice, "dueDate" | "gstEnabled" | "gstRate" | "notes">>
): StoredInvoice {
  const existing = getInvoiceForTransaction(transactionId);
  if (existing) return existing;

  const dueDate =
    opts?.dueDate ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const invoice: StoredInvoice = {
    transactionId,
    invoiceNumber: nextInvoiceNumber(),
    dueDate,
    gstEnabled: opts?.gstEnabled ?? false,
    gstRate: opts?.gstRate ?? 18,
    notes: opts?.notes ?? "",
    status: "Draft",
    sentDate: null,
    createdAt: new Date().toISOString(),
  };

  const next = [invoice, ...readRaw()];
  writeRaw(next);
  return invoice;
}

export function updateInvoice(transactionId: string, patch: Partial<StoredInvoice>) {
  const current = readRaw();
  const next = current.map((i) =>
    i.transactionId === transactionId ? { ...i, ...patch } : i
  );
  writeRaw(next);
}

export function markInvoiceSent(transactionId: string) {
  updateInvoice(transactionId, {
    status: "Sent",
    sentDate: new Date().toISOString().split("T")[0],
  });
}

// Called on mount to flip Sent → Overdue once due date has passed and it's unpaid
export function refreshOverdueStatuses(paidTransactionIds: Set<string>) {
  const current = readRaw();
  const today = new Date().toISOString().split("T")[0];
  let changed = false;

  const next = current.map((inv) => {
    if (paidTransactionIds.has(inv.transactionId) && inv.status !== "Paid") {
      changed = true;
      return { ...inv, status: "Paid" as InvoiceStatus };
    }
    if (
      inv.status === "Sent" &&
      inv.dueDate < today &&
      !paidTransactionIds.has(inv.transactionId)
    ) {
      changed = true;
      return { ...inv, status: "Overdue" as InvoiceStatus };
    }
    return inv;
  });

  if (changed) writeRaw(next);
}