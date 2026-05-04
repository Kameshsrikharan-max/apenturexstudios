// src/routes/AppRoutes.jsx
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

// Page Imports
import LoginPage from "../features/auth/pages/LoginPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import ReviewPage from "../features/review/pages/ReviewPage";

export default function AppRoutes({ isAuthenticated, onLogin, user }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Only redirect to dashboard when user logs in (from login page)
  useEffect(() => {
    if (isAuthenticated && location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return (
    <Routes>
      {/* Public Route - Login */}
      <Route 
        path="/" 
        element={
          !isAuthenticated ? 
            <LoginPage onLogin={onLogin} /> : 
            <Navigate to="/dashboard" replace />
        } 
      />

      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          isAuthenticated ? 
            <DashboardPage user={user} /> : 
            <Navigate to="/" replace />
        } 
      />

      <Route 
        path="/review" 
        element={
          isAuthenticated ? 
            <ReviewPage user={user} /> : 
            <Navigate to="/" replace />
        } 
      />

      {/* Catch all unknown routes */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} 
      />
    </Routes>
  );
}