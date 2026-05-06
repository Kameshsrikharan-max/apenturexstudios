
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";


import LoginPage from "../features/auth/pages/LoginPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import ReviewPage from "../features/review/pages/ReviewPage";
import UsersPage from "../features/users/pages/UsersPage";
import EnquiryPage from "../features/enquiry/pages/EnquiryPage";   // ← New Import

export default function AppRoutes({ isAuthenticated, onLogin, user }) {
  const navigate = useNavigate();
  const location = useLocation();

  
  useEffect(() => {
    if (isAuthenticated && location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return (
    <Routes>
      
      <Route 
        path="/" 
        element={
          !isAuthenticated ? 
            <LoginPage onLogin={onLogin} /> : 
            <Navigate to="/dashboard" replace />
        } 
      />

      
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

      <Route 
        path="/users" 
        element={
          isAuthenticated ? 
            <UsersPage user={user} /> : 
            <Navigate to="/" replace />
        } 
      />

    
      <Route 
        path="/enquiry" 
        element={
          isAuthenticated ? 
            <EnquiryPage user={user} /> : 
            <Navigate to="/" replace />
        } 
      />

    
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} 
      />
    </Routes>
  );
}