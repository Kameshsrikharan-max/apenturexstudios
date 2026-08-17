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
import MediaManagementPage  from "../features/event/pages/Mediamanagement.js";
import AlbumSelectionPage   from "../features/event/pages/AlbumSelectionPage";
import TemplateEditorPage   from "../features/event/pages/TemplateEditorPage";
import EventClosurePage     from "../features/event/pages/Eventclosurepage";  
import EnquiryPage          from "../features/enquiry/pages/EnquiryPage";
import MediaLibraryPage     from "../features/media/pages/MediaLibraryPage.js";
import ProfilePage          from "../features/profile/pages/ProfilePage";
import ViewStudioPage       from "../features/studio/pages/ViewStudioPage";
import CalendarPage         from "../components/UI/CalendarPage";
import NotificationSettingsPage from "../components/UI/NotificationSettingsPage";
import NotificationDetailsPage  from "../components/UI/NotificationDetailsPage";
import SubscriptionPage     from "../features/subscription/SubscriptionPage";
import TransactionPage      from "../features/Transaction/pages/Transactionpage";
import TodaysAgendaWidget   from "../components/UI/TodaysAgendaWidget";
import MainLayout           from "../components/Layout/MainLayout";
import OnboardingModal      from "../components/Onboarding/OnboardingModal";
import EventPublicViewPage  from "../components/UI/EventPublicViewPage";

const LoginPageAny: any = LoginPage;
const DashboardPageAny: any = DashboardPage;
const ReviewPageAny: any = ReviewPage;
const UsersPageAny: any = UsersPage;
const EventPageAny: any = EventPage;
const CreateEventPageAny: any = CreateEventPage;
const TeamAssignmentPageAny: any = TeamAssignmentPage;
const PaymentPageAny: any = PaymentPage;
const AttendancePageAny: any = AttendancePage;
const MediaManagementPageAny: any = MediaManagementPage;
const AlbumSelectionPageAny: any = AlbumSelectionPage;
const TemplateEditorPageAny: any = TemplateEditorPage;
const EventClosurePageAny: any = EventClosurePage;
const EnquiryPageAny: any = EnquiryPage;
const MediaLibraryPageAny: any = MediaLibraryPage;
const ProfilePageAny: any = ProfilePage;
const ViewStudioPageAny: any = ViewStudioPage;
const CalendarPageAny: any = CalendarPage;
const NotificationSettingsPageAny: any = NotificationSettingsPage;
const NotificationDetailsPageAny: any = NotificationDetailsPage;
const SubscriptionPageAny: any = SubscriptionPage;
const TransactionPageAny: any = TransactionPage;
const TodaysAgendaWidgetAny: any = TodaysAgendaWidget;
const EventPublicViewPageAny: any = EventPublicViewPage;


function ProtectedLayout({ isAuthenticated, user, onLogout }: any) {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout user={user} onLogout={onLogout}>
      <Outlet />
    </MainLayout>
  );
}


function SignUpPage({ onLogin }: any) {
  const navigate = useNavigate();

  const handleComplete = (formData: any) => {
    const { basic } = formData;
    const nameParts = (basic.name || "").trim().split(/\s+/);

    const newUser = {
      email: basic.email || "",
      name: basic.name || "",
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      phone: basic.phone || "",
    };

    try {
      const key = (basic.email || "guest@apenturexstudios.com");
      localStorage.setItem(`axsOnboardingComplete_${key}`, JSON.stringify(true));
      localStorage.setItem(`axsOnboardingData_${key}`, JSON.stringify(formData));
      localStorage.setItem("axsKycVerified", JSON.stringify(true));
      localStorage.setItem(
        "axsKycData",
        JSON.stringify({ docType: formData.kyc.docType, vals: formData.kyc.vals })
      );
    } catch {
      // localStorage may be unavailable; safe to ignore
    }

    if (onLogin) {
      onLogin(newUser);
    }

    navigate("/dashboard", { replace: true });
  };

  return <OnboardingModal onComplete={handleComplete} />;
}


export default function AppRoutes({ isAuthenticated, onLogin, onLogout, user }: any) {
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
            <LoginPageAny
              onLogin={onLogin}
              onSignUp={() => navigate("/signup")}
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/signup"
        element={
          !isAuthenticated ? (
            <SignUpPage onLogin={onLogin} />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Public QR scan destination — intentionally OUTSIDE ProtectedLayout so it
          works without login when someone scans an event's QR code */}
      <Route path="/events/public" element={<EventPublicViewPageAny />} />

      <Route
        element={
          <ProtectedLayout
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={onLogout}
          />
        }
      >
        <Route path="/dashboard" element={<DashboardPageAny user={user} />} />
        <Route path="/review" element={<ReviewPageAny user={user} />} />
        <Route path="/users" element={<UsersPageAny user={user} />} />
        <Route path="/events"        element={<EventPageAny user={user} />} />
        <Route path="/events/create" element={<CreateEventPageAny user={user} />} />
        <Route
          path="/events/create/team-assignment"
          element={<TeamAssignmentPageAny user={user} />}
        />
        <Route
          path="/events/create/payment"
          element={<PaymentPageAny user={user} />}
        />
        <Route
          path="/events/create/attendance"
          element={<AttendancePageAny user={user} />}
        />
        <Route
          path="/events/create/media"
          element={<MediaManagementPageAny user={user} />}
        />
        <Route
          path="/events/create/album"
          element={<AlbumSelectionPageAny user={user} />}
        />
        <Route
          path="/events/create/album/template-editor"
          element={<TemplateEditorPageAny user={user} />}
        />
        <Route
          path="/events/create/closure"
          element={<EventClosurePageAny user={user} />}
        />
        <Route path="/enquiry" element={<EnquiryPageAny user={user} />} />
        <Route path="/transactions" element={<TransactionPageAny user={user} />} />
        <Route path="/media" element={<MediaLibraryPageAny user={user} />} />
        <Route path="/profile"     element={<ProfilePageAny user={user} />} />
        <Route path="/studio/view" element={<ViewStudioPageAny user={user} />} />
        <Route path="/calendar" element={<CalendarPageAny />} />
        <Route path="/notification-settings" element={<NotificationSettingsPageAny />} />
        <Route path="/notification/:id" element={<NotificationDetailsPageAny />} />
        <Route path="/subscription" element={<SubscriptionPageAny user={user} />} />
        <Route path="/agenda" element={<TodaysAgendaWidgetAny />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />}
      />

    </Routes>
  );
}