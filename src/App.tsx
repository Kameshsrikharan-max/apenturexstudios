import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";

import { logout } from "./redux/actions/authActions";

import AppRoutes from "./routes/AppRoutes";
import StudioTour from "./components/StudioTour/StudioTour.js";
import OnboardingGate from "./components/Onboarding/OnboardingGate";
import AuthFlow from "./features/auth/pages/AuthFlow";

interface RootState {
  auth: {
    user: any;
  };
}

function App() {
  const dispatch = useDispatch();

  const { user } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!user;

  // ✅ FIX: initialize from isAuthenticated instead of hardcoded false.
  // On refresh, Redux rehydrates `user` from localStorage (via authReducer's
  // initialState), so isAuthenticated is already true by the time this runs.
  // Without this, readyForApp always started false and forced the login
  // screen back up even though the user was still logged in.
  const [readyForApp, setReadyForApp] = useState<boolean>(isAuthenticated);

  const handleAuthComplete = (_data: any) => {
    setReadyForApp(true);
  };

  const handleSignUp = () => {
    // ⚠️ Wire to your real sign-up navigation
    console.log("Navigate to sign up");
  };

  const handleLogout = () => {
    dispatch(logout());
    setReadyForApp(false);
  };

  const showApp = isAuthenticated && readyForApp;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#020617",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* mode="wait" would fully finish fading auth OUT (revealing the
          container's #020617 background — i.e. a black-ish beat) before
          starting to fade Dashboard IN. Default (concurrent) mode overlaps
          the two, which is what makes this an actual crossfade. */}
      <AnimatePresence>
        {showApp ? (
          <motion.div
            key="app"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          >
            <OnboardingGate>
              <AppRoutes isAuthenticated={isAuthenticated} onLogout={handleLogout} user={user} />
            </OnboardingGate>
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          >
            <AuthFlow onSignUp={handleSignUp} onComplete={handleAuthComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      <StudioTour />
    </div>
  );
}

export default App;