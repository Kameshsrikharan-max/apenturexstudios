import { useEffect, useRef, useState } from "react";
import { CheckCircleFilled, CloseOutlined } from "@ant-design/icons";
import "./TermsAndConditionsModal.css";

type Section = {
  id: string;
  title: string;
  heading: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    heading: "Acceptance of Terms",
    body: (
      <>
        <p>
          By accessing or using <b>PSP</b>, you agree to be bound by these Terms and
          Conditions. If you do not agree to these terms, please do not use our
          platform. These terms apply to all users of the platform, including
          studios, photographers, and customers.
        </p>
        <p>
          PSP reserves the right to update these terms at any time. Continued use
          of the platform after changes constitutes acceptance of the revised
          terms. The latest version is always available at <b>PSP.com/terms</b>.
        </p>
      </>
    ),
  },
  {
    id: "overview",
    title: "Platform Overview",
    heading: "Platform Overview",
    body: (
      <>
        <p>
          <b>PSP</b> is an online marketplace that connects customers with
          professional photography studios and freelance photographers. PSP acts
          as an <b>intermediary platform</b> and is not directly responsible for
          the quality, safety, or legality of services provided by studios or
          photographers.
        </p>
        <p>The platform allows users to:</p>
        <ul>
          <li><b>Book photography sessions</b> for events, portraits, products, and more</li>
          <li><b>Create and manage studios</b> with multiple services and sub-service categories</li>
          <li><b>Hire freelance photographers</b> for flexible, on-demand shoots</li>
          <li><b>Manage bookings, payments, and reviews</b> in one place</li>
        </ul>
      </>
    ),
  },
  {
    id: "registration",
    title: "Account Registration & Eligibility",
    heading: "Account Registration & Eligibility",
    body: (
      <>
        <p>To use PSP, you must:</p>
        <ul>
          <li>Be at least <b>18 years of age</b></li>
          <li>Provide <b>accurate and complete</b> registration information</li>
          <li>Verify your identity via an <b>Aadhaar-linked mobile number</b> (OTP-based verification)</li>
          <li>Maintain the <b>security of your account credentials</b></li>
        </ul>
      </>
    ),
  },
  {
    id: "identity",
    title: "Identity Verification",
    heading: "Identity Verification",
    body: (
      <p>
        Studio Admins are required to complete KYC verification using a
        government-issued document (Aadhaar, PAN, Driving License, or Passport).
        This is used solely to verify your identity and studio legitimacy, and is
        processed through our verification partner, Truthscreen.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookie Policy",
    heading: "Cookie Policy",
    body: (
      <p>
        We use cookies and similar technologies to keep you signed in, remember
        your preferences, and understand how the platform is used. You can
        control cookies through your browser settings, though some features may
        not work correctly if cookies are disabled.
      </p>
    ),
  },
  {
    id: "booking",
    title: "Booking Policy",
    heading: "Booking Policy",
    body: (
      <p>
        Bookings made through PSP are agreements between the customer and the
        studio or photographer. PSP facilitates the booking and payment process
        but is not a party to the underlying service agreement.
      </p>
    ),
  },
  {
    id: "cancellation",
    title: "Cancellation & Refund",
    heading: "Cancellation & Refund Policy",
    body: (
      <p>
        Cancellation windows, fees, and refund eligibility are set by the
        individual studio or photographer for each service, and are shown at the
        time of booking. PSP processes refunds according to the policy the
        service provider has configured.
      </p>
    ),
  },
  {
    id: "services",
    title: "Services & Sub-Services",
    heading: "Services & Sub-Services",
    body: (
      <p>
        Studios may list multiple services (e.g. Weddings, Portraits,
        Events) and sub-service categories under each. Studio Admins are
        responsible for keeping listed services accurate and up to date.
      </p>
    ),
  },
  {
    id: "studio-responsibilities",
    title: "Studio & Photographer Duties",
    heading: "Studio & Photographer Responsibilities",
    body: (
      <p>
        Studios and photographers agree to deliver services professionally, honor
        confirmed bookings, and maintain accurate availability, pricing, and
        portfolio information at all times.
      </p>
    ),
  },
  {
    id: "customer-responsibilities",
    title: "Customer Responsibilities",
    heading: "Customer Responsibilities",
    body: (
      <p>
        Customers agree to provide accurate booking details, arrive as scheduled,
        and communicate any changes with reasonable notice through the platform.
      </p>
    ),
  },
  {
    id: "payments",
    title: "Payments & Pricing",
    heading: "Payments & Pricing",
    body: (
      <p>
        All payments are processed securely through PSP's payment partners.
        Prices shown at checkout are final and include any applicable platform
        fees, which are disclosed before payment.
      </p>
    ),
  },
  {
    id: "reviews",
    title: "Reviews & Ratings",
    heading: "Reviews & Ratings",
    body: (
      <p>
        Reviews must reflect a genuine experience with a booked service.
        Fraudulent, abusive, or incentivized reviews may be removed, and repeat
        violations may result in account suspension.
      </p>
    ),
  },
  {
    id: "ip",
    title: "Intellectual Property",
    heading: "Intellectual Property",
    body: (
      <p>
        Photographers and studios retain ownership of the images they capture,
        subject to any usage rights agreed with the customer at time of booking.
        PSP claims no ownership over content uploaded to the platform.
      </p>
    ),
  },
  {
    id: "privacy",
    title: "Privacy & Data Protection",
    heading: "Privacy & Data Protection",
    body: (
      <p>
        Personal and KYC data is collected only for verification, booking, and
        platform-safety purposes, and is handled in line with our Privacy
        Policy. We do not sell personal data to third parties.
      </p>
    ),
  },
  {
    id: "prohibited",
    title: "Prohibited Conduct",
    heading: "Prohibited Conduct",
    body: (
      <p>
        Users may not misrepresent their identity, circumvent the platform to
        avoid fees, post misleading listings, or engage in harassment or
        discriminatory behavior toward other users.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    heading: "Limitation of Liability",
    body: (
      <p>
        PSP is not liable for indirect, incidental, or consequential damages
        arising from the use of the platform, or from services rendered by
        independent studios and photographers.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law & Disputes",
    heading: "Governing Law & Dispute Resolution",
    body: (
      <p>
        These terms are governed by the laws of India. Disputes arising from use
        of the platform will first be addressed through good-faith negotiation,
        and if unresolved, through the courts of competent jurisdiction.
      </p>
    ),
  },
];

const TERMS_VERSION = "1.0.0";
const TERMS_EFFECTIVE_DATE = "2026-03-16";

type TermsAndConditionsModalProps = {
  onAccept: () => void;
  onClose?: () => void;
};

function TermsAndConditionsModal({ onAccept, onClose }: TermsAndConditionsModalProps) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [readIds, setReadIds] = useState<Set<string>>(new Set([SECTIONS[0].id]));
  const bodyRef = useRef<HTMLDivElement>(null);

  const activeIndex = SECTIONS.findIndex((s) => s.id === activeId);
  const allRead = readIds.size >= SECTIONS.length;

  // Mark the active section read once the user scrolls it (or it's short
  // enough that there's nothing to scroll).
  const markActiveRead = () => {
    setReadIds((prev) => {
      if (prev.has(activeId)) return prev;
      const next = new Set(prev);
      next.add(activeId);
      return next;
    });
  };

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    // If content doesn't overflow, mark it read immediately.
    if (el.scrollHeight <= el.clientHeight + 4) markActiveRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (nearBottom) markActiveRead();
  };

  const goToSection = (id: string) => {
    setActiveId(id);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const active = SECTIONS[activeIndex];

  return (
    <div className="tc-overlay" role="dialog" aria-modal="true">
      <div className="tc-card">
        {onClose && (
          <button type="button" className="tc-close" onClick={onClose} aria-label="Close">
            <CloseOutlined />
          </button>
        )}

        <h1 className="tc-title">Terms And Conditions</h1>
        <p className="tc-subtitle">
          Please read these terms carefully. Select your role to view relevant sections.
        </p>

        <div className="tc-body">
          <nav className="tc-sidebar">
            <div className="tc-sidebar-label">Sections</div>
            <div className="tc-sidebar-list">
              {SECTIONS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={`tc-sidebar-item${s.id === activeId ? " tc-sidebar-item--active" : ""}`}
                  onClick={() => goToSection(s.id)}
                >
                  <span className="tc-sidebar-bar" />
                  <span className="tc-sidebar-text">{s.title}</span>
                  {readIds.has(s.id) && (
                    <CheckCircleFilled className="tc-sidebar-check" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          <div className="tc-content" ref={bodyRef} onScroll={handleScroll}>
            <span className="tc-section-badge">Section {activeIndex + 1}</span>
            <h2 className="tc-content-heading">{active.heading}</h2>
            <div className="tc-content-text">{active.body}</div>
          </div>
        </div>

        <div className="tc-footer">
          <div className="tc-footer-meta">
            <span>Version: {TERMS_VERSION}</span>
            <span>Effective Date: {TERMS_EFFECTIVE_DATE}</span>
            <span>
              Read progress: {readIds.size}/{SECTIONS.length}
            </span>
          </div>
          <div className="tc-footer-actions">
            {onClose && (
              <button type="button" className="tc-btn-secondary" onClick={onClose}>
                Close
              </button>
            )}
            <button
              type="button"
              className="tc-btn-primary"
              disabled={!allRead}
              onClick={onAccept}
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsAndConditionsModal;