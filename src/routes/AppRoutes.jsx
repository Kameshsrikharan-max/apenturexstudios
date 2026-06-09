import { Routes, Route, useNavigate, Navigate, useLocation, Outlet } from "react-router-dom";
import { useEffect } from "react";

import LoginPage            from "../features/auth/pages/LoginPage";
import DashboardPage        from "../features/dashboard/pages/DashboardPage";
import ReviewPage           from "../features/review/pages/ReviewPage";
import UsersPage            from "../features/users/pages/UsersPage";
import EventPage            from "../features/event/pages/EventPage";
import CreateEventPage      from "../features/event/pages/CreateEventPage";
import TeamAssignmentPage   from "../features/event/pages/Teamassignmentpage";
import PaymentPage          from "../features/event/pages/PaymentPage";
import AttendancePage       from "../features/event/pages/Attendancepage";
import MediaManagementPage  from "../features/event/pages/Mediamanagement.jsx";
import AlbumSelectionPage   from "../features/event/pages/AlbumSelectionPage";
import EventClosurePage     from "../features/event/pages/Eventclosurepage";   // ← NEW
import EnquiryPage          from "../features/enquiry/pages/EnquiryPage";
import MediaLibraryPage     from "../features/media/pages/MediaLibraryPage.jsx";
import ProfilePage          from "../features/profile/pages/ProfilePage";
import ViewStudioPage       from "../features/studio/pages/ViewStudioPage";
import MainLayout           from "../components/Layout/MainLayout";


function ProtectedLayout({ isAuthenticated, user, onLogout }) {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout user={user} onLogout={onLogout}>
      <Outlet />
    </MainLayout>
  );
}


export default function AppRoutes({ isAuthenticated, onLogin, onLogout, user }) {
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
          !isAuthenticated ? (
            <LoginPage onLogin={onLogin} />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

    
      <Route
        element={
          <ProtectedLayout
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={onLogout}
          />
        }
      >
      
        <Route path="/dashboard" element={<DashboardPage user={user} />} />

      
        <Route path="/review" element={<ReviewPage user={user} />} />

        
        <Route path="/users" element={<UsersPage user={user} />} />

      
        <Route path="/events"        element={<EventPage user={user} />} />
        <Route path="/events/create" element={<CreateEventPage user={user} />} />

    
        <Route
          path="/events/create/team-assignment"
          element={<TeamAssignmentPage user={user} />}
        />
        <Route
          path="/events/create/payment"
          element={<PaymentPage user={user} />}
        />
        <Route
          path="/events/create/attendance"
          element={<AttendancePage user={user} />}
        />
        <Route
          path="/events/create/media"
          element={<MediaManagementPage user={user} />}
        />
        <Route
          path="/events/create/album"
          element={<AlbumSelectionPage user={user} />}
        />

      
        <Route
          path="/events/create/closure"
          element={<EventClosurePage user={user} />}
        />

      
        <Route path="/enquiry" element={<EnquiryPage user={user} />} />

      
        <Route path="/media" element={<MediaLibraryPage user={user} />} />

        
        <Route path="/profile"     element={<ProfilePage user={user} />} />
        <Route path="/studio/view" element={<ViewStudioPage user={user} />} />
      </Route>

    
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />}
      />

    </Routes>
  );
}