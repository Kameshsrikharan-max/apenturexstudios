
// ---------- Config ----------
const env = (import.meta as any).env || {};
const BASE: string = String(
  env.VITE_API_URL || env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");
const PREFIX = "/subscription"; 


const TOKEN_KEYS = ["token", "axs_token", "authToken", "accessToken"];

const getToken = (): string | null => {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (const key of TOKEN_KEYS) {
        const v = store.getItem(key);
        if (v) return v.replace(/^"|"$/g, "");
      }
      for (const key of ["user", "axsUser", "authUser"]) {
        const raw = store.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.token === "string") return parsed.token;
        } catch {
          
        }
      }
    }
  } catch {
    
  }
  return null;
};

// ---------- Types ----------
export interface ApiPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currencySymbol?: string;
  billingCycle: "monthly" | "yearly";
  features: string[];
  highlighted?: boolean;
  status?: "not-started" | "current" | "recommended";
}

export interface ApiReceipt {
  transactionId: string;
  invoiceNo?: string;
  plan: ApiPlan;
  amount: number;
  currencySymbol: string;
  paidAt: string;
  userName?: string;
  userEmail?: string;
}

export interface ServerSubscription {
  planId: string;
  status: "active" | "cancelled" | "expired";
  autoRenewal: boolean;
  cycleStart: string;
  cycleEnd: string;
  cancelledAt: string | null;
  lastTxnId: string | null;
}

export type ApiEmailStatus = "idle" | "sent" | "error" | "skipped";

export interface MeResponse {
  subscription: ServerSubscription | null;
  receipt: ApiReceipt | null;
  history: ApiReceipt[];
}

export interface CheckoutSession {
  txnId: string;
  amount: number;
  currencySymbol: string;
  upiString: string;
  expiresAt: string;
  merchant: { vpa: string; name: string };
  plan: ApiPlan;
}

export interface ConfirmResponse {
  receipt: ApiReceipt;
  subscription: ServerSubscription | null;
  emailStatus: ApiEmailStatus;
}

export interface ContactSalesInput {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

// ---------- Core request ----------
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${PREFIX}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check that the backend is running.", 0, "NETWORK");
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok || !json || json.success === false) {
    throw new ApiError((json && json.message) || `Request failed (${res.status})`, res.status, json && json.code);
  }
  return json.data as T;
}

// ---------- Endpoints ----------
export const subscriptionApi = {
  getPlans: () => request<ApiPlan[]>("GET", "/plans", undefined, false),
  getMe: () => request<MeResponse>("GET", "/me"),
  createCheckout: (planId: string) => request<CheckoutSession>("POST", "/checkout", { planId }),
  confirmPayment: (txnId: string, proof?: Record<string, unknown>) =>
    request<ConfirmResponse>("POST", `/checkout/${encodeURIComponent(txnId)}/confirm`, proof || {}),
  cancel: () => request<{ subscription: ServerSubscription }>("POST", "/cancel"),
  reactivate: () => request<{ subscription: ServerSubscription }>("POST", "/reactivate"),
  setAutoRenewal: (autoRenewal: boolean) =>
    request<{ subscription: ServerSubscription }>("PATCH", "/auto-renewal", { autoRenewal }),
  resendReceipt: (txnId: string) =>
    request<{ emailStatus: ApiEmailStatus }>("POST", `/receipts/${encodeURIComponent(txnId)}/email`),
  contactSales: (payload: ContactSalesInput) =>
    request<{ id: string }>("POST", "/contact-sales", payload, false),
};