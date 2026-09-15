import { Routes, Route, useNavigate, Navigate, useLocation, Outlet } from "react-router-dom";
import { useEffect } from "react";

import AuthFlow             from "../features/auth/pages/AuthFlow";
import AcceptInvitePage     from "../features/auth/pages/AcceptInvitePage";
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
import EventPublicViewPage  from "../components/UI/EventPublicViewPage";
import DeleteRequestsPage   from "../features/deleteRequest/pages/DeleteRequestsPage";
import RegistrationRequestsPage from "../features/registrationApproval/pages/RegistrationRequestsPage";
import TemplatesPage        from "../features/templates/pages/TemplatesPage";
import AvailabilityPage     from "../features/availability/pages/AvailabilityPage";
import AutoInvoicePage      from "../features/invoice/pages/AutoInvoicePage";
import TrainingHubPage      from "../features/training/pages/TrainingHubPage";
import { hasRouteAccess } from "../config/rolePermissions"; // adjust path to match where you saved rolePermissions.ts
import type { PaidReceipt } from "../features/subscription/SubscriptionPage";

const AuthFlowAny: any = AuthFlow;
const AcceptInvitePageAny: any = AcceptInvitePage;
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
const TemplatesPageAny: any = TemplatesPage;
const AvailabilityPageAny: any = AvailabilityPage;
const AutoInvoicePageAny: any = AutoInvoicePage;
const TrainingHubPageAny: any = TrainingHubPage;

// axs-api-node backend endpoint that sends the receipt email via mailer.js.
// Adjust if that backend runs somewhere other than localhost:4000.
const RECEIPT_EMAIL_ENDPOINT = "http://localhost:4000/send-receipt-email";


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

// Gate a route by the shared role-permission matrix (rolePermissions.ts).
// Redirects to /dashboard if the logged-in user's role isn't allowed to
// reach this path. Sits alongside SuperAdminOnly (which stays separate —
// /admin/* routes aren't part of the studio-role matrix).
function SectionGuard({ user, path, children }: any) {
  if (!hasRouteAccess(user?.role, path)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function AppRoutes({ isAuthenticated, onLogin, onLogout, user }: any) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && location.pathname === "/") {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  const handleSubscriptionPaymentSuccess = (receipt: PaidReceipt) => {
    // Wire this into utils/transactionStore.ts if you want paid
    // subscriptions to show up alongside axs_transactions entries.
    console.log("Subscription payment completed:", receipt);
  };

  const handleSendReceiptEmail = async (receipt: PaidReceipt) => {
    if (!receipt.userEmail) {
      throw new Error("No email on file for this user");
    }
    const res = await fetch(RECEIPT_EMAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: receipt.userEmail, receipt }),
    });
    if (!res.ok) {
      throw new Error("Receipt email request failed");
    }
  };

  return (
    <Routes>

      {/* AuthFlow owns the entire unauthenticated experience internally —
          login, role selection, both registration wizards, and the
          pending-approval screen — all via its own step state, not
          separate URLs. This replaces the old "/register" -> "/signup" ->
          OnboardingModal flow entirely. */}
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <AuthFlowAny onComplete={onLogin} />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Invited Studio Manager / Studio Photographer land here from their
          email link. Public — they haven't logged in yet. Validates the
          token and shows the matching wizard, or an invalid/expired state. */}
      <Route path="/invite/:token" element={<AcceptInvitePageAny />} />

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
        {/* Dashboard: everyone with a role in the matrix (all four studio roles) */}
        <Route path="/dashboard" element={<DashboardPageAny user={user} />} />

        {/* Review: all four studio roles */}
        <Route
          path="/review"
          element={
            <SectionGuard user={user} path="/review">
              <ReviewPageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Users: all four studio roles (Freelance/Studio Photographer should see
            only their own row — that's a data filter inside UsersPage itself,
            not a route concern; not implemented yet, see rolePermissions.ts notes) */}
        <Route
          path="/users"
          element={
            <SectionGuard user={user} path="/users">
              <UsersPageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Events + full creation wizard: all four studio roles */}
        <Route
          path="/events"
          element={
            <SectionGuard user={user} path="/events">
              <EventPageAny user={user} />
            </SectionGuard>
          }
        />
        <Route
          path="/events/create"
          element={
            <SectionGuard user={user} path="/events/create">
              <CreateEventPageAny user={user} />
            </SectionGuard>
          }
        />
        <Route
          path="/events/create/team-assignment"
          element={
            <SectionGuard user={user} path="/events/create/team-assignment">
              <TeamAssignmentPageAny user={user} />
            </SectionGuard>
          }
        />
        <Route
          path="/events/create/payment"
          element={
            <SectionGuard user={user} path="/events/create/payment">
              <PaymentPageAny user={user} />
            </SectionGuard>
          }
        />
        <Route
          path="/events/create/attendance"
          element={
            <SectionGuard user={user} path="/events/create/attendance">
              <AttendancePageAny user={user} />
            </SectionGuard>
          }
        />
        <Route
          path="/events/create/media"
          element={
            <SectionGuard user={user} path="/events/create/media">
              <MediaManagementPageAny user={user} />
            </SectionGuard>
          }
        />
        <Route
          path="/events/create/album"
          element={
            <SectionGuard user={user} path="/events/create/album">
              <AlbumSelectionPageAny user={user} />
            </SectionGuard>
          }
        />
        <Route
          path="/events/create/album/template-editor"
          element={
            <SectionGuard user={user} path="/events/create/album/template-editor">
              <TemplateEditorPageAny user={user} />
            </SectionGuard>
          }
        />
        <Route
          path="/events/create/closure"
          element={
            <SectionGuard user={user} path="/events/create/closure">
              <EventClosurePageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Enquiry: Studio Admin + Studio Manager only */}
        <Route
          path="/enquiry"
          element={
            <SectionGuard user={user} path="/enquiry">
              <EnquiryPageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Studio (My Studio): Studio Admin + Studio Manager only */}
        <Route
          path="/studio/view"
          element={
            <SectionGuard user={user} path="/studio/view">
              <ViewStudioPageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Subscription Centre: Studio Admin + both Photographer roles (NOT Studio Manager) */}
        <Route
          path="/subscription"
          element={
            <SectionGuard user={user} path="/subscription">
              <SubscriptionPageAny
                user={user}
                merchantVpa="axsstudio@okhdfcbank"
                merchantName="AXS Studio"
                onBack={() => navigate(-1)}
                onPaymentSuccess={handleSubscriptionPaymentSuccess}
                onSendReceiptEmail={handleSendReceiptEmail}
              />
            </SectionGuard>
          }
        />

        {/* Template Library: Studio Admin + Studio Manager only. Standalone
            page for managing reusable album templates — separate from
            TemplateEditorPage, which stays wizard-only. */}
        <Route
          path="/templates"
          element={
            <SectionGuard user={user} path="/templates">
              <TemplatesPageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Availability: Freelance Photographer + Studio Photographer only.
            Lets a photographer manage which dates they're available for. */}
        <Route
          path="/availability"
          element={
            <SectionGuard user={user} path="/availability">
              <AvailabilityPageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Transactions: Studio Admin only now (Studio Manager, Freelance
            Photographer, and Studio Photographer no longer see this). */}
        <Route
          path="/transactions"
          element={
            <SectionGuard user={user} path="/transactions">
              <TransactionPageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Auto Invoice: mirrors /transactions gating (Studio Admin only) since
            it's billing data derived from the same transaction store. */}
        <Route
          path="/invoices"
          element={
            <SectionGuard user={user} path="/invoices">
              <AutoInvoicePageAny user={user} />
            </SectionGuard>
          }
        />

        {/* Shared utility routes — not part of the role matrix, open to any authenticated user */}
        <Route path="/media" element={<MediaLibraryPageAny user={user} />} />
        <Route path="/profile"     element={<ProfilePageAny user={user} />} />
        <Route path="/calendar" element={<CalendarPageAny />} />
        <Route path="/notification-settings" element={<NotificationSettingsPageAny />} />
        <Route path="/notification/:id" element={<NotificationDetailsPageAny />} />
        <Route path="/agenda" element={<TodaysAgendaWidgetAny />} />
        <Route path="/training" element={<TrainingHubPageAny user={user} />} />

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