import {
  FETCH_PLANS_REQUEST,
  FETCH_PLANS_SUCCESS,
  FETCH_PLANS_FAILURE,
  FETCH_CURRENT_SUBSCRIPTION_REQUEST,
  FETCH_CURRENT_SUBSCRIPTION_SUCCESS,
  FETCH_CURRENT_SUBSCRIPTION_FAILURE,
  SUBSCRIBE_PLAN_REQUEST,
  SUBSCRIBE_PLAN_SUCCESS,
  SUBSCRIBE_PLAN_FAILURE,
  CONTACT_SALES_REQUEST,
  CONTACT_SALES_SUCCESS,
  CONTACT_SALES_FAILURE,
  RESET_SUBSCRIBE_STATUS,
  SubscriptionState,
  SubscriptionActionTypes,
} from "../types/subscriptiontypes";

const initialState: SubscriptionState = {
  plans: [],
  plansLoading: false,
  plansError: null,

  currentSubscription: null,
  currentSubscriptionLoading: false,
  currentSubscriptionError: null,

  subscribing: false,
  subscribeError: null,
  subscribeSuccess: false,

  contactSalesLoading: false,
  contactSalesError: null,
  contactSalesSuccess: false,
};

const subscriptionReducer = (
  state: SubscriptionState = initialState,
  action: SubscriptionActionTypes
): SubscriptionState => {
  switch (action.type) {
    // ---- Plans ----
    case FETCH_PLANS_REQUEST:
      return { ...state, plansLoading: true, plansError: null };
    case FETCH_PLANS_SUCCESS:
      return { ...state, plansLoading: false, plans: action.payload };
    case FETCH_PLANS_FAILURE:
      return { ...state, plansLoading: false, plansError: action.payload };

    // ---- Current subscription ----
    case FETCH_CURRENT_SUBSCRIPTION_REQUEST:
      return {
        ...state,
        currentSubscriptionLoading: true,
        currentSubscriptionError: null,
      };
    case FETCH_CURRENT_SUBSCRIPTION_SUCCESS:
      return {
        ...state,
        currentSubscriptionLoading: false,
        currentSubscription: action.payload,
      };
    case FETCH_CURRENT_SUBSCRIPTION_FAILURE:
      return {
        ...state,
        currentSubscriptionLoading: false,
        currentSubscriptionError: action.payload,
      };

    // ---- Subscribe ----
    case SUBSCRIBE_PLAN_REQUEST:
      return {
        ...state,
        subscribing: true,
        subscribeError: null,
        subscribeSuccess: false,
      };
    case SUBSCRIBE_PLAN_SUCCESS:
      return {
        ...state,
        subscribing: false,
        subscribeSuccess: true,
        currentSubscription: action.payload,
      };
    case SUBSCRIBE_PLAN_FAILURE:
      return {
        ...state,
        subscribing: false,
        subscribeError: action.payload,
        subscribeSuccess: false,
      };
    case RESET_SUBSCRIBE_STATUS:
      return {
        ...state,
        subscribeSuccess: false,
        subscribeError: null,
      };

    // ---- Contact sales ----
    case CONTACT_SALES_REQUEST:
      return {
        ...state,
        contactSalesLoading: true,
        contactSalesError: null,
        contactSalesSuccess: false,
      };
    case CONTACT_SALES_SUCCESS:
      return {
        ...state,
        contactSalesLoading: false,
        contactSalesSuccess: true,
      };
    case CONTACT_SALES_FAILURE:
      return {
        ...state,
        contactSalesLoading: false,
        contactSalesError: action.payload,
        contactSalesSuccess: false,
      };

    default:
      return state;
  }
};

export default subscriptionReducer;