// ---------- Domain model ----------

export interface SubscriptionPlan {
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

export interface CurrentSubscription {
  planId: string;
  startedAt: string;
  renewsAt?: string;
  cancelledAt?: string | null;
}

export interface ContactSalesPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

// ---------- Action type constants ----------

export const FETCH_PLANS_REQUEST = "subscription/FETCH_PLANS_REQUEST";
export const FETCH_PLANS_SUCCESS = "subscription/FETCH_PLANS_SUCCESS";
export const FETCH_PLANS_FAILURE = "subscription/FETCH_PLANS_FAILURE";

export const FETCH_CURRENT_SUBSCRIPTION_REQUEST =
  "subscription/FETCH_CURRENT_SUBSCRIPTION_REQUEST";
export const FETCH_CURRENT_SUBSCRIPTION_SUCCESS =
  "subscription/FETCH_CURRENT_SUBSCRIPTION_SUCCESS";
export const FETCH_CURRENT_SUBSCRIPTION_FAILURE =
  "subscription/FETCH_CURRENT_SUBSCRIPTION_FAILURE";

export const SUBSCRIBE_PLAN_REQUEST = "subscription/SUBSCRIBE_PLAN_REQUEST";
export const SUBSCRIBE_PLAN_SUCCESS = "subscription/SUBSCRIBE_PLAN_SUCCESS";
export const SUBSCRIBE_PLAN_FAILURE = "subscription/SUBSCRIBE_PLAN_FAILURE";

export const CONTACT_SALES_REQUEST = "subscription/CONTACT_SALES_REQUEST";
export const CONTACT_SALES_SUCCESS = "subscription/CONTACT_SALES_SUCCESS";
export const CONTACT_SALES_FAILURE = "subscription/CONTACT_SALES_FAILURE";

export const RESET_SUBSCRIBE_STATUS = "subscription/RESET_SUBSCRIBE_STATUS";

// ---------- Action interfaces ----------

export interface FetchPlansRequestAction {
  type: typeof FETCH_PLANS_REQUEST;
}
export interface FetchPlansSuccessAction {
  type: typeof FETCH_PLANS_SUCCESS;
  payload: SubscriptionPlan[];
}
export interface FetchPlansFailureAction {
  type: typeof FETCH_PLANS_FAILURE;
  payload: string;
}

export interface FetchCurrentSubscriptionRequestAction {
  type: typeof FETCH_CURRENT_SUBSCRIPTION_REQUEST;
}
export interface FetchCurrentSubscriptionSuccessAction {
  type: typeof FETCH_CURRENT_SUBSCRIPTION_SUCCESS;
  payload: CurrentSubscription;
}
export interface FetchCurrentSubscriptionFailureAction {
  type: typeof FETCH_CURRENT_SUBSCRIPTION_FAILURE;
  payload: string;
}

export interface SubscribePlanRequestAction {
  type: typeof SUBSCRIBE_PLAN_REQUEST;
  payload: { planId: string };
}
export interface SubscribePlanSuccessAction {
  type: typeof SUBSCRIBE_PLAN_SUCCESS;
  payload: CurrentSubscription;
}
export interface SubscribePlanFailureAction {
  type: typeof SUBSCRIBE_PLAN_FAILURE;
  payload: string;
}

export interface ContactSalesRequestAction {
  type: typeof CONTACT_SALES_REQUEST;
  payload: ContactSalesPayload;
}
export interface ContactSalesSuccessAction {
  type: typeof CONTACT_SALES_SUCCESS;
}
export interface ContactSalesFailureAction {
  type: typeof CONTACT_SALES_FAILURE;
  payload: string;
}

export interface ResetSubscribeStatusAction {
  type: typeof RESET_SUBSCRIBE_STATUS;
}

export type SubscriptionActionTypes =
  | FetchPlansRequestAction
  | FetchPlansSuccessAction
  | FetchPlansFailureAction
  | FetchCurrentSubscriptionRequestAction
  | FetchCurrentSubscriptionSuccessAction
  | FetchCurrentSubscriptionFailureAction
  | SubscribePlanRequestAction
  | SubscribePlanSuccessAction
  | SubscribePlanFailureAction
  | ContactSalesRequestAction
  | ContactSalesSuccessAction
  | ContactSalesFailureAction
  | ResetSubscribeStatusAction;

// ---------- State shape ----------

export interface SubscriptionState {
  plans: SubscriptionPlan[];
  plansLoading: boolean;
  plansError: string | null;

  currentSubscription: CurrentSubscription | null;
  currentSubscriptionLoading: boolean;
  currentSubscriptionError: string | null;

  subscribing: boolean;
  subscribeError: string | null;
  subscribeSuccess: boolean;

  contactSalesLoading: boolean;
  contactSalesError: string | null;
  contactSalesSuccess: boolean;
}