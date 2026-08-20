import {FETCH_PLANS_REQUEST,FETCH_PLANS_SUCCESS,FETCH_PLANS_FAILURE,FETCH_CURRENT_SUBSCRIPTION_REQUEST,FETCH_CURRENT_SUBSCRIPTION_SUCCESS,FETCH_CURRENT_SUBSCRIPTION_FAILURE,SUBSCRIBE_PLAN_REQUEST,SUBSCRIBE_PLAN_SUCCESS,SUBSCRIBE_PLAN_FAILURE,CONTACT_SALES_REQUEST,CONTACT_SALES_SUCCESS,CONTACT_SALES_FAILURE,RESET_SUBSCRIBE_STATUS,SubscriptionPlan,CurrentSubscription,ContactSalesPayload,FetchPlansRequestAction,FetchPlansSuccessAction,FetchPlansFailureAction,FetchCurrentSubscriptionRequestAction,FetchCurrentSubscriptionSuccessAction,FetchCurrentSubscriptionFailureAction,SubscribePlanRequestAction,SubscribePlanSuccessAction,SubscribePlanFailureAction,ContactSalesRequestAction,ContactSalesSuccessAction,ContactSalesFailureAction,ResetSubscribeStatusAction,} from "../types/subscriptiontypes";

// ---------- Fetch plans ----------

export const fetchPlansRequest = (): FetchPlansRequestAction => ({
  type: FETCH_PLANS_REQUEST,
});

export const fetchPlansSuccess = (
  plans: SubscriptionPlan[]
): FetchPlansSuccessAction => ({
  type: FETCH_PLANS_SUCCESS,
  payload: plans,
});

export const fetchPlansFailure = (error: string): FetchPlansFailureAction => ({
  type: FETCH_PLANS_FAILURE,
  payload: error,
});

// ---------- Fetch current subscription ----------

export const fetchCurrentSubscriptionRequest =
  (): FetchCurrentSubscriptionRequestAction => ({
    type: FETCH_CURRENT_SUBSCRIPTION_REQUEST,
  });

export const fetchCurrentSubscriptionSuccess = (
  subscription: CurrentSubscription
): FetchCurrentSubscriptionSuccessAction => ({
  type: FETCH_CURRENT_SUBSCRIPTION_SUCCESS,
  payload: subscription,
});

export const fetchCurrentSubscriptionFailure = (
  error: string
): FetchCurrentSubscriptionFailureAction => ({
  type: FETCH_CURRENT_SUBSCRIPTION_FAILURE,
  payload: error,
});

// ---------- Subscribe to plan ----------

export const subscribePlanRequest = (
  planId: string
): SubscribePlanRequestAction => ({
  type: SUBSCRIBE_PLAN_REQUEST,
  payload: { planId },
});

export const subscribePlanSuccess = (
  subscription: CurrentSubscription
): SubscribePlanSuccessAction => ({
  type: SUBSCRIBE_PLAN_SUCCESS,
  payload: subscription,
});

export const subscribePlanFailure = (
  error: string
): SubscribePlanFailureAction => ({
  type: SUBSCRIBE_PLAN_FAILURE,
  payload: error,
});

// ---------- Contact sales ----------

export const contactSalesRequest = (
  payload: ContactSalesPayload
): ContactSalesRequestAction => ({
  type: CONTACT_SALES_REQUEST,
  payload,
});

export const contactSalesSuccess = (): ContactSalesSuccessAction => ({
  type: CONTACT_SALES_SUCCESS,
});

export const contactSalesFailure = (
  error: string
): ContactSalesFailureAction => ({
  type: CONTACT_SALES_FAILURE,
  payload: error,
});

// ---------- Reset ----------

export const resetSubscribeStatus = (): ResetSubscribeStatusAction => ({
  type: RESET_SUBSCRIBE_STATUS,
});