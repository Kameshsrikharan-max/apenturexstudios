import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";

import { logout } from "./redux/actions/authActions";

import AppRoutes from "./routes/AppRoutes";
import StudioTour from "./components/StudioTour/StudioTour.js";

interface RootState {
  auth: {
    user: any;
  };
}

function App() {
  const dispatch = useDispatch();

  const { user } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!user;

  // Redux flips `user` to a real object as soon as login/registration
  // succeeds — but AuthFlow's camera splash still needs to finish playing
  // before we actually swap into the dashboard. This flag is that gate.
  const [readyForApp, setReadyForApp] = useState<boolean>(isAuthenticated);

  const handleAuthComplete = (_data: any) => {
    setReadyForApp(true);
  };

  const handleLogout = () => {
    dispatch(logout());
    setReadyForApp(false);
  };

  // AppRoutes is now ALWAYS mounted — a single router handles both the
  // logged-out experience (AuthFlow at "/", plus public routes like
  // /invite/:token and /events/public) and the logged-in app. Gating on
  // `showReady` here (rather than raw isAuthenticated) is what preserves
  // the camera-splash timing: Redux may already be authenticated, but we
  // don't reveal the dashboard until AuthFlow's own splash finishes and
  // calls onComplete.
  const showReady = isAuthenticated && readyForApp;

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
      <AnimatePresence mode="wait">
        <motion.div
          key={showReady ? "app" : "auth"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        >
          <AppRoutes
            isAuthenticated={showReady}
            onLogin={handleAuthComplete}
            onLogout={handleLogout}
            user={user}
          />
        </motion.div>
      </AnimatePresence>

      <StudioTour />
    </div>
  );
}

export default App;