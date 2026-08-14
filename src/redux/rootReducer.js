import { combineReducers } from "redux";

import enquiryReducer from "./reducers/enquiryReducer";
import authReducer from "./reducers/authReducer";
import eventReducer from "./reducers/eventReducer";
import dashboardReducer from "./reducers/dashboardReducer";
import mediaReducer from "./reducers/mediaReducer";
import profileReducer from "./reducers/profileReducer";
import reviewReducer from "./reducers/reviewReducer";
import calendarReducer from "./reducers/calendarreducer";
import subscriptionReducer from "./reducers/subscriptionreducer";
import transactionReducer from "./reducers/transactionReducer";
import notificationReducer from "./reducers/notificationReducer";
import notificationDetailReducer from "./reducers/notificationDetailReducer";

const rootReducer = combineReducers({
  enquiry: enquiryReducer,
  auth: authReducer,
  event: eventReducer,
  dashboard: dashboardReducer,
  media: mediaReducer,
  profile: profileReducer,
  review: reviewReducer,
  calendar: calendarReducer,
  subscription: subscriptionReducer,
  transaction: transactionReducer,
  notification: notificationReducer,
  notificationDetail: notificationDetailReducer,
});

export default rootReducer;