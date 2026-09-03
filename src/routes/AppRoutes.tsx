import { Routes, Route, useNavigate, Navigate, useLocation, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import LoginPage            from "../features/auth/pages/LoginPage";
import RegisterPage         from "../features/auth/pages/RegisterPage";
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
import DeleteRequestsPage   from "../features/deleteRequest/pages/DeleteRequestsPage";
import RegistrationRequestsPage from "../features/registrationApproval/pages/RegistrationRequestsPage";
import { signupRequest } from "../redux/actions/authActions";

const LoginPageAny: any = LoginPage;
const RegisterPageAny: any = RegisterPage;
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
const DeleteRequestsPageAny: any = DeleteRequestsPage;
const RegistrationRequestsPageAny: any = RegistrationRequestsPage;


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

// Gate a route to super_admin only. The backend already enforces this on
// every /admin/* endpoint (requireSuperAdmin middleware) — this is just the
// frontend UX so a non-admin who lands on the URL gets redirected instead
// of seeing an empty/erroring page.
function SuperAdminOnly({ user, children }: any) {
  if (user?.role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// New entry point for signup: role selection + email OTP verification.
// On success (needsSignup becomes true in RegisterPage), we hand off to
// the onboarding flow at /signup, carrying the chosen role along so it's
// available if the onboarding step ever needs it.
function RegisterEntryPage() {
  const navigate = useNavigate();

  const handleComplete = (role: string) => {
    try {
      localStorage.setItem("axsSelectedRole", role);
    } catch {
      // best-effort only
    }
    navigate("/signup", { state: { role } });
  };

  return (
    <RegisterPageAny
      onBack={() => navigate("/")}
      onComplete={handleComplete}
    />
  );
}


function SignUpPage({ onLogin }: any) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { signupEmail, signupToken, user, error, loading } = useSelector(
    (state: any) => state.auth
  );

  // signupToken comes from RegisterPage's (or LoginPage's) verify-otp call
  // (email confirmed, no account exists yet). Without it, this route was
  // reached directly rather than through the OTP flow, so send them back
  // to register first.
  useEffect(() => {
    if (!signupToken) {
      navigate("/register", { replace: true });
    }
  }, [signupToken, navigate]);

  // Once completeSignup succeeds, auth.user is populated the same way a
  // normal login does — finish the handoff into the app.
  useEffect(() => {
    if (user) {
      if (onLogin) {
        onLogin(user);
      }
      navigate("/dashboard", { replace: true });
    }
  }, [user]);

  const handleComplete = (formData: any) => {
    const { basic } = formData;

    try {
      const key = signupEmail || "guest@apenturexstudios.com";
      localStorage.setItem(`axsOnboardingComplete_${key}`, JSON.stringify(true));
      localStorage.setItem(`axsOnboardingData_${key}`, JSON.stringify(formData));
      localStorage.setItem("axsKycVerified", JSON.stringify(true));
      localStorage.setItem(
        "axsKycData",
        JSON.stringify({ docType: formData.kyc.docType, vals: formData.kyc.vals })
      );
    } catch {
      // localStorage writes are best-effort UI state; the real account
      // creation below is what actually matters.
    }

    // This is what actually creates the account — nothing was persisted to
    // the database before this point.
    dispatch(
      signupRequest({
        signupToken,
        name: basic.name || "",
        phone: basic.phone || "",
      })
    );
  };

  return <OnboardingModal onComplete={handleComplete} onBack={() => navigate("/register")} />;
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
              onSignUp={() => navigate("/register")}
            />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/register"
        element={
          !isAuthenticated ? (
            <RegisterEntryPage />
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
        <Route
          path="/admin/delete-requests"
          element={
            <SuperAdminOnly user={user}>
              <DeleteRequestsPageAny user={user} />
            </SuperAdminOnly>
          }
        />
        <Route
          path="/admin/registrations"
          element={
            <SuperAdminOnly user={user}>
              <RegistrationRequestsPageAny user={user} />
            </SuperAdminOnly>
          }
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />}
      />

    </Routes>
  );
}