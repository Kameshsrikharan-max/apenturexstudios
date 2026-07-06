import { combineReducers } from "redux";

import enquiryReducer from "./enquiry/enquiryReducer";
import authReducer from "./auth/authReducer";
import eventReducer from "./event/eventReducer";
import dashboardReducer from "./dashboard/dashboardReducer";
import mediaReducer from "./media/mediaReducer";
import profileReducer from "./profile/profileReducer";
import reviewReducer from "./review/reviewReducer";

const rootReducer = combineReducers({
  enquiry: enquiryReducer,
  auth: authReducer,
  event: eventReducer,
  dashboard: dashboardReducer,
  media: mediaReducer,
  profile: profileReducer,
  review: reviewReducer,
});

export default rootReducer;