import { combineReducers } from "redux";

import enquiryReducer from "./reducers/enquiryReducer";
import authReducer from "./reducers/authReducer";
import eventReducer from "./reducers/eventReducer";
import dashboardReducer from "./reducers/dashboardReducer";
import mediaReducer from "./reducers/mediaReducer";
import profileReducer from "./reducers/profileReducer";
import reviewReducer from "./reducers/reviewReducer";
import calendarReducer from "./reducers/calendarreducer";

const rootReducer = combineReducers({
  enquiry: enquiryReducer,
  auth: authReducer,
  event: eventReducer,
  dashboard: dashboardReducer,
  media: mediaReducer,
  profile: profileReducer,
  review: reviewReducer,
  calendar: calendarReducer,
});

export default rootReducer;