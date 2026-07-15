import { delay, put, takeLatest } from "redux-saga/effects";
import {
  FETCH_PLANS_REQUEST,
  FETCH_CURRENT_SUBSCRIPTION_REQUEST,
  SUBSCRIBE_PLAN_REQUEST,
  CONTACT_SALES_REQUEST,
  SubscribePlanRequestAction,
  ContactSalesRequestAction,
  SubscriptionPlan,
  CurrentSubscription,
} from "../types/subscriptiontypes";
import {
  fetchPlansSuccess,
  fetchPlansFailure,
  fetchCurrentSubscriptionSuccess,
  fetchCurrentSubscriptionFailure,
  subscribePlanSuccess,
  subscribePlanFailure,
  contactSalesSuccess,
  contactSalesFailure,
} from "../actions/subscriptionactions";

// ---------- Temporary mock data ----------

const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: "standard-p4p",
    name: "Standard-p4p",
    description: "Professional photography delivery tools for your business.",
    price: 300,
    billingCycle: "monthly",
    features: [
      "Create Events from enquiries",
      "Manage Users in your studio",
      "Review new users",
      "View Dashboard analytics",
    ],
  },
  {
    id: "starter-p4p",
    name: "Starter-p4p",
    description: "Professional photography delivery tools for your business.",
    price: 499,
    billingCycle: "monthly",
    status: "current",
    features: [
      "Up to 2 team members",
      "10 GB storage",
      "5 active events",
      "Email support",
    ],
  },
  {
    id: "pro-p4p",
    name: "Pro-p4p",
    description: "Advanced tools for growing studios.",
    price: 999,
    billingCycle: "monthly",
    highlighted: true,
    status: "recommended",
    features: [
      "Up to 5 team members",
      "50 GB storage",
      "20 active events",
      "Priority support",
    ],
  },
];

const MOCK_CURRENT_SUBSCRIPTION: CurrentSubscription = {
  planId: "starter-p4p",
  startedAt: new Date().toISOString(),
};

// ---------- Workers ----------

function* fetchPlansSaga() {
  try {
    yield delay(300); 
    yield put(fetchPlansSuccess(MOCK_PLANS));
  } catch (error: any) {
    yield put(
      fetchPlansFailure(error?.message || "Failed to fetch subscription plans")
    );
  }
}

function* fetchCurrentSubscriptionSaga() {
  try {
    yield delay(300);
    yield put(fetchCurrentSubscriptionSuccess(MOCK_CURRENT_SUBSCRIPTION));
  } catch (error: any) {
    yield put(
      fetchCurrentSubscriptionFailure(
        error?.message || "Failed to fetch current subscription"
      )
    );
  }
}

function* subscribePlanSaga(action: SubscribePlanRequestAction) {
  try {
    yield delay(300);
    const updated: CurrentSubscription = {
      planId: action.payload.planId,
      startedAt: new Date().toISOString(),
    };
    yield put(subscribePlanSuccess(updated));
    // keep current subscription state in sync after a successful upgrade/downgrade
    yield put(fetchCurrentSubscriptionSuccess(updated));
  } catch (error: any) {
    yield put(
      subscribePlanFailure(error?.message || "Failed to subscribe to plan")
    );
  }
}

function* contactSalesSaga(action: ContactSalesRequestAction) {
  try {
    yield delay(300);
    yield put(contactSalesSuccess());
  } catch (error: any) {
    yield put(
      contactSalesFailure(error?.message || "Failed to send contact request")
    );
  }
}

// ---------- Watcher ----------

export function* subscriptionSaga() {
  yield takeLatest(FETCH_PLANS_REQUEST, fetchPlansSaga);
  yield takeLatest(
    FETCH_CURRENT_SUBSCRIPTION_REQUEST,
    fetchCurrentSubscriptionSaga
  );
  yield takeLatest(SUBSCRIBE_PLAN_REQUEST, subscribePlanSaga);
  yield takeLatest(CONTACT_SALES_REQUEST, contactSalesSaga);
}