import { combineReducers } from "redux";

import enquiryReducer from "./enquiry/enquiryReducer";

const rootReducer = combineReducers({
  enquiry: enquiryReducer,
});

export default rootReducer;