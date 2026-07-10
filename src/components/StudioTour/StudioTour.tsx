import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRightOutlined,CloseOutlined, LeftOutlined,} from "@ant-design/icons";
import "./StudioTour.css";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const StudioTour = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [spotlight, setSpotlight] = useState(null);

  const tourSteps = useMemo(
    () => [
      {
        route: "/dashboard",
        selector: '[data-tour-id="nav-brand"]',
        title: "Apenture X Studios",
        text: "This is your creative studio admin panel. The tour begins from the main navigation.",
      },
      {
        route: "/dashboard",
        selector: '[data-tour-id="nav-sidebar"]',
        title: "Sidebar Menu",
        text: "Use this menu button to open the sidebar navigation.",
      },
      {
        route: "/dashboard",
        selector: '[data-tour-id="nav-menu"]',
        title: "Main Navigation",
        text: "Use these links to move between Dashboard, Review, Users, and Enquiry pages.",
      },
      {
        route: "/dashboard",
        selector: '[data-tour-id="nav-tour"]',
        title: "Studio Tour",
        text: "Click this compass icon anytime to restart the full studio tour.",
      },
      {
        route: "/dashboard",
        selector: '[data-tour-id="nav-calendar"]',
        title: "Calendar",
        text: "Use the calendar icon to check studio dates, events, shoots, and meetings.",
      },
      {
        route: "/dashboard",
        selector: '[data-tour-id="nav-notifications"]',
        title: "Notifications",
        text: "The bell icon shows upcoming reminders and studio notifications.",
      },
      {
        route: "/dashboard",
        selector: '[data-tour-id="nav-theme"]',
        title: "Theme Mode",
        text: "Use this button to switch between dark mode and light mode.",
      },
      {
        route: "/dashboard",
        selector: '[data-tour-id="nav-profile"]',
        title: "Profile Menu",
        text: "Your profile menu contains account details, settings, and logout.",
      },
      {
        route: "/dashboard",
        selector: ".dashboard-page-top",
        title: "Dashboard Overview",
        text: "This is the main dashboard area where you see studio activity and key information.",
      },
      {
        route: "/dashboard",
        selector: ".dashboard-search-tour-target",
        title: "Dashboard Search",
        text: "Use this search bar to find users, events, studios, priorities, and statuses.",
      },
      {
        route: "/dashboard",
        selector: ".welcome-card",
        title: "Welcome Panel",
        text: "This panel welcomes the admin and shows creative photography quotes.",
      },
      {
        route: "/dashboard",
        selector: ".feature-card",
        title: "Creative Feature Card",
        text: "This animated card highlights studio activity like shoots, views, frames, and bookings.",
      },
      {
        route: "/dashboard",
        selector: ".horizontal-card-strip",
        title: "Studio Metrics",
        text: "These metric cards show users, events, revenue, studio health, and client leads.",
      },
      {
        route: "/dashboard",
        selector: ".dashboard-panel",
        title: "Dashboard Tables",
        text: "These panels show user records, events, and production schedule information.",
      },
      {
        route: "/review",
        selector: ".review-title",
        title: "Review Page",
        text: "This page helps you review referrals, inspect applicants, and approve or reject candidates.",
      },
      {
        route: "/review",
        selector: ".stats-row",
        title: "Referral Stats",
        text: "These cards summarize total referrals, weekly activity, and average score.",
      },
      {
        route: "/review",
        selector: ".section-heading",
        title: "My Referrals",
        text: "This section shows how many candidates are currently visible after search and filter changes.",
      },
      {
        route: "/review",
        selector: ".review-toolbar",
        title: "Review Controls",
        text: "Use these controls to search, filter, refresh, and switch between table and card views.",
      },
      {
        route: "/review",
        selector: ".table-wrapper, .card-grid, .empty-state",
        title: "Referral Records",
        text: "This area shows referral data in table view or card view.",
      },
      {
        route: "/users",
        selector: ".review-title",
        title: "Users Page",
        text: "This page helps you manage studio users, referrals, and photographers.",
      },
      {
        route: "/users",
        selector: ".user-tabs-glass",
        title: "User Tabs",
        text: "Use these tabs to switch between all users, referrals, and photographers.",
      },
      {
        route: "/users",
        selector: ".smart-filter-row",
        title: "Smart Filters",
        text: "These chips quickly filter users by status or signup type.",
      },
      {
        route: "/users",
        selector: ".user-toolbar-inline",
        title: "User Tools",
        text: "Use this toolbar to search, filter, refresh, invite users, and manage bulk actions.",
      },
      {
        route: "/users",
        selector: ".user-table-custom",
        title: "User Records",
        text: "This table lists users and photographers with view, edit, and delete actions.",
      },
      {
        route: "/enquiry",
        selector: ".enquiry-title",
        title: "Enquiry Page",
        text: "This page helps you manage client enquiries, booking requests, and follow-ups.",
      },
      {
        route: "/enquiry",
        selector: ".hero-section",
        title: "Event Enquiries",
        text: "This hero section introduces the enquiry workflow and has the New Enquiry button.",
      },
      {
        route: "/enquiry",
        selector: ".stats-row",
        title: "Enquiry Stats",
        text: "These cards show total enquiries, high priority leads, and follow-ups.",
      },
      {
        route: "/enquiry",
        selector: ".toolbar",
        title: "Enquiry Filters",
        text: "Use these controls to search, filter, refresh, clear filters, or delete selected enquiries.",
      },
      {
        route: "/enquiry",
        selector: ".enquiry-table",
        title: "Enquiry Records",
        text: "This table shows client enquiries, customer details, event date, status, city, and actions.",
      },
    ],
    []
  );

  const currentStep = tourSteps[tourStep];

  const closeTour = useCallback(() => {
    setTourOpen(false);
    setTourStep(0);
    setSpotlight(null);
  }, []);

  const calculateSpotlight = useCallback(async () => {
    if (!tourOpen || !currentStep) return;

    const targetElement = document.querySelector(currentStep.selector);

    if (!targetElement) {
      setSpotlight(null);
      return;
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    await wait(300);

    const rect = targetElement.getBoundingClientRect();
    const padding = 10;
    const cardWidth = Math.min(440, window.innerWidth - 32);

    let cardLeft = rect.left + rect.width / 2 - cardWidth / 2;
    cardLeft = Math.max(16, Math.min(cardLeft, window.innerWidth - cardWidth - 16));

    let cardTop = rect.bottom + 24;
    let arrowPosition = "top";

    if (cardTop + 285 > window.innerHeight) {
      cardTop = rect.top - 292;
      arrowPosition = "bottom";
    }

    if (cardTop < 16) {
      cardTop = 16;
      arrowPosition = "none";
    }

    setSpotlight({
      top: rect.top - padding,
      left: rect.left - padding,
      width: Math.min(rect.width + padding * 2, window.innerWidth - 24),
      height: rect.height + padding * 2,
      cardTop,
      cardLeft,
      cardWidth,
      arrowPosition,
    });
  }, [tourOpen, currentStep]);

  useEffect(() => {
    const startStudioTour = () => {
      setTourStep(0);
      setTourOpen(true);
      navigate("/dashboard");
    };

    window.addEventListener("startStudioTour", startStudioTour);

    return () => {
      window.removeEventListener("startStudioTour", startStudioTour);
    };
  }, [navigate]);

  useEffect(() => {
    if (!tourOpen || !currentStep) return;

    if (location.pathname !== currentStep.route) {
      navigate(currentStep.route);
      return;
    }


    window.addEventListener("resize", calculateSpotlight);
    window.addEventListener("scroll", calculateSpotlight, true);

    return () => {
      window.removeEventListener("resize", calculateSpotlight);
      window.removeEventListener("scroll", calculateSpotlight, true);
    };
  }, [tourOpen, currentStep, location.pathname, navigate, calculateSpotlight]);

  useEffect(() => {
    if (!tourOpen) return;

    const timer = window.setTimeout(() => {
      calculateSpotlight();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [location.pathname, tourStep, tourOpen, calculateSpotlight]);

  const nextStep = () => {
    if (tourStep === tourSteps.length - 1) {
      closeTour();
      return;
    }

    setTourStep((step) => step + 1);
  };

  const previousStep = () => {
    setTourStep((step) => Math.max(step - 1, 0));
  };

  if (!tourOpen || !currentStep) return null;

  return (
    <div className="studio-tour-layer">
      {spotlight && (
        <div
          className="studio-tour-spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      <div
        className={`studio-tour-card ${
          spotlight ? `arrow-${spotlight.arrowPosition}` : "studio-tour-missing"
        }`}
        style={
          spotlight
            ? {
                top: spotlight.cardTop,
                left: spotlight.cardLeft,
                width: spotlight.cardWidth,
              }
            : undefined
        }
      >
        <div className="studio-tour-head">
          <span>
            Step {tourStep + 1} of {tourSteps.length}
          </span>

          <button type="button" onClick={closeTour} aria-label="Close studio tour">
            <CloseOutlined />
          </button>
        </div>

        <h3>{currentStep.title}</h3>

        <p>
          {spotlight
            ? currentStep.text
            : `This tour target is not visible on this page yet: ${currentStep.selector}`}
        </p>

        <div className="studio-tour-progress">
          {tourSteps.map((step, index) => (
            <span
              key={`${step.route}-${step.selector}-${index}`}
              className={index === tourStep ? "active" : ""}
            />
          ))}
        </div>

        <div className="studio-tour-actions">
          <button type="button" onClick={previousStep} disabled={tourStep === 0}>
            <LeftOutlined />
            Previous
          </button>

          <button type="button" onClick={nextStep}>
            {tourStep === tourSteps.length - 1 ? "Finish" : "Next"}
            {tourStep !== tourSteps.length - 1 && <ArrowRightOutlined />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudioTour;