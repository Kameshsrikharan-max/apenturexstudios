import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircleFilled,
  CloseOutlined,
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import "./TermsAndConditionsModal.css";

type Section = {
  id: string;
  title: string;
  heading: string;
  summary: string; // plain text, used for search + reading-time estimate
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    heading: "Acceptance of Terms",
    summary:
      "By accessing or using PSP you agree to be bound by these terms. Continued use after changes means you accept the revised terms.",
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
    summary:
      "PSP is a marketplace connecting customers with studios and photographers, acting as an intermediary for bookings, hiring, payments, and reviews.",
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
    summary:
      "You must be 18+, provide accurate registration info, verify via Aadhaar-linked mobile OTP, and keep your credentials secure.",
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
    summary:
      "Studio Admins must complete KYC with a government ID, processed through our verification partner Truthscreen.",
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
    summary:
      "Cookies keep you signed in and remember preferences. You can control them in your browser, though some features may break.",
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
    summary:
      "Bookings are agreements between customer and studio/photographer; PSP facilitates but isn't a party to the service agreement.",
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
    summary:
      "Cancellation windows and refund eligibility are set per studio/photographer and shown at booking time; PSP processes refunds accordingly.",
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
    summary:
      "Studios may list multiple services and sub-service categories; Admins must keep them accurate and up to date.",
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
    summary:
      "Studios and photographers must deliver professionally, honor bookings, and keep availability, pricing, and portfolios accurate.",
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
    summary:
      "Customers must provide accurate details, arrive as scheduled, and communicate changes with reasonable notice.",
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
    summary:
      "Payments are processed securely through PSP's partners; checkout prices are final and include disclosed platform fees.",
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
    summary:
      "Reviews must reflect genuine experiences; fraudulent or abusive reviews may be removed and lead to suspension.",
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
    summary:
      "Photographers and studios retain ownership of captured images, subject to agreed usage rights. PSP claims no ownership.",
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
    summary:
      "Personal and KYC data is collected only for verification, booking, and safety purposes, and is never sold to third parties.",
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
    summary:
      "Users may not misrepresent identity, circumvent fees, post misleading listings, or harass other users.",
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
    summary:
      "PSP is not liable for indirect, incidental, or consequential damages from platform use or third-party services.",
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
    summary:
      "These terms are governed by Indian law; disputes go through good-faith negotiation first, then courts of competent jurisdiction.",
    body: (
      <p>
        These terms are governed by the laws of India. Disputes arising from use
        of the platform will first be addressed through good-faith negotiation,
        and if unresolved, through the courts of competent jurisdiction.
      </p>
    ),
  },
];

const TERMS_VERSION = "2.0.0";
const TERMS_EFFECTIVE_DATE = "2026-03-16";
const READ_THRESHOLD = 92; // % scrolled before a section counts as "read"
const WPM = 200;

function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const seconds = Math.max(15, Math.round((words / WPM) * 60));
  if (seconds < 60) return `${Math.round(seconds / 5) * 5}s read`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min read`;
}

const CONFETTI_COLORS = ["#38d5ff", "#4ade80", "#fac775", "#818cf8", "#f472b6"];

type ConfettiParticle = {
  id: number;
  left: number;
  color: string;
  size: number;
  delay: number;
  rotate: number;
  drift: number;
};

function buildConfetti(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 0.25,
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 120,
  }));
}

type TermsAndConditionsModalProps = {
  onAccept: () => void;
  onClose?: () => void;
};

function TermsAndConditionsModal({ onAccept, onClose }: TermsAndConditionsModalProps) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [sectionProgress, setSectionProgress] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [shake, setShake] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const activeIndex = SECTIONS.findIndex((s) => s.id === activeId);
  const active = SECTIONS[activeIndex];
  const allRead = readIds.size >= SECTIONS.length;
  const percentComplete = Math.round((readIds.size / SECTIONS.length) * 100);

  const totalReadTime = useMemo(() => {
    const totalWords = SECTIONS.reduce(
      (sum, s) => sum + s.summary.trim().split(/\s+/).length,
      0
    );
    return Math.max(1, Math.round((totalWords / WPM) * 3)); // rough full-body multiplier
  }, []);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)
    );
  }, [query]);

  const confetti = useMemo(() => buildConfetti(60), []);

  const markActiveRead = (id: string, pct?: number) => {
    setSectionProgress((prev) => ({ ...prev, [id]: Math.max(prev[id] ?? 0, pct ?? 100) }));
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 4) markActiveRead(activeId, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    const pct = scrollable <= 0 ? 100 : Math.min(100, (el.scrollTop / scrollable) * 100);
    setSectionProgress((prev) => ({ ...prev, [activeId]: Math.max(prev[activeId] ?? 0, pct) }));
    if (pct >= READ_THRESHOLD) markActiveRead(activeId, 100);
  };

  const goToSection = (id: string, dir?: 1 | -1) => {
    if (id === activeId) return;
    const fromIdx = activeIndex;
    const toIdx = SECTIONS.findIndex((s) => s.id === id);
    setDirection(dir ?? (toIdx > fromIdx ? 1 : -1));
    setActiveId(id);
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 0 }));
  };

  const goRelative = (delta: 1 | -1) => {
    const nextIdx = activeIndex + delta;
    if (nextIdx < 0 || nextIdx >= SECTIONS.length) return;
    goToSection(SECTIONS[nextIdx].id, delta);
  };

  const jumpToFirstUnread = () => {
    const next = SECTIONS.find((s) => !readIds.has(s.id));
    if (next) goToSection(next.id, 1);
  };

  const handleAcceptClick = () => {
    if (!allRead) {
      setShake(true);
      jumpToFirstUnread();
      setTimeout(() => setShake(false), 500);
      return;
    }
    setAccepting(true);
    setShowConfetti(true);
    setTimeout(() => onAccept(), 750);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!cardRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
        // still allow global nav while modal is open
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goRelative(1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goRelative(-1);
      } else if (e.key === "Escape" && onClose) {
        onClose();
      } else if (e.key === "Enter" && allRead) {
        handleAcceptClick();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, allRead]);

  const ringCircumference = 2 * Math.PI * 18;
  const ringOffset = ringCircumference * (1 - percentComplete / 100);

  return (
    <div className="tc-overlay" role="dialog" aria-modal="true">
      <div className="tc-ambient tc-ambient--a" />
      <div className="tc-ambient tc-ambient--b" />

      <motion.div
        ref={cardRef}
        className={`tc-card${shake ? " tc-card--shake" : ""}`}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {onClose && (
          <button type="button" className="tc-close" onClick={onClose} aria-label="Close">
            <CloseOutlined />
          </button>
        )}

        <div className="tc-header">
          <div className="tc-header-text">
            <h1 className="tc-title">Terms And Conditions</h1>
            <p className="tc-subtitle">
              Scroll through every section to unlock acceptance — ~{totalReadTime} min total.
            </p>
          </div>

          <div className="tc-ring" aria-label={`${percentComplete}% read`}>
            <svg viewBox="0 0 44 44">
              <circle className="tc-ring-track" cx="22" cy="22" r="18" />
              <motion.circle
                className="tc-ring-fill"
                cx="22"
                cy="22"
                r="18"
                strokeDasharray={ringCircumference}
                initial={false}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
            <span className="tc-ring-label">{percentComplete}%</span>
          </div>
        </div>

        <div className="tc-body">
          <nav className="tc-sidebar">
            <div className="tc-search">
              <SearchOutlined className="tc-search-icon" />
              <input
                type="text"
                placeholder="Search sections…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="tc-sidebar-label">
              Sections <span>{readIds.size}/{SECTIONS.length}</span>
            </div>

            <div className="tc-sidebar-list">
              {filteredSections.map((s) => {
                const pct = Math.round(sectionProgress[s.id] ?? 0);
                const isRead = readIds.has(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    className={`tc-sidebar-item${s.id === activeId ? " tc-sidebar-item--active" : ""}${isRead ? " tc-sidebar-item--read" : ""}`}
                    onClick={() => goToSection(s.id)}
                  >
                    <span className="tc-sidebar-bar" />
                    <span className="tc-sidebar-main">
                      <span className="tc-sidebar-text">{s.title}</span>
                      <span className="tc-sidebar-progress">
                        <span className="tc-sidebar-progress-fill" style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                    <AnimatePresence>
                      {isRead && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        >
                          <CheckCircleFilled className="tc-sidebar-check" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
              {filteredSections.length === 0 && (
                <div className="tc-sidebar-empty">No sections match "{query}"</div>
              )}
            </div>
          </nav>

          <div className="tc-content-wrap">
            <div className="tc-content-scanline">
              <motion.div
                className="tc-content-scanline-fill"
                animate={{ width: `${sectionProgress[activeId] ?? 0}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>

            <div className="tc-content" ref={bodyRef} onScroll={handleScroll}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={active.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 24 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <div className="tc-content-meta">
                    <span className="tc-section-badge">
                      Section {activeIndex + 1} of {SECTIONS.length}
                    </span>
                    <span className="tc-time-chip">
                      <ThunderboltOutlined /> {estimateReadTime(active.summary)}
                    </span>
                  </div>
                  <h2 className="tc-content-heading">{active.heading}</h2>
                  <div className="tc-content-text">{active.body}</div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="tc-content-nav">
              <button
                type="button"
                className="tc-nav-btn"
                disabled={activeIndex === 0}
                onClick={() => goRelative(-1)}
              >
                <ArrowUpOutlined /> Previous
              </button>
              <button
                type="button"
                className="tc-nav-btn"
                disabled={activeIndex === SECTIONS.length - 1}
                onClick={() => goRelative(1)}
              >
                Next <ArrowDownOutlined />
              </button>
            </div>
          </div>
        </div>

        <div className="tc-footer">
          <div className="tc-footer-meta">
            <span>Version {TERMS_VERSION}</span>
            <span>Effective {TERMS_EFFECTIVE_DATE}</span>
            <div className="tc-dots">
              {SECTIONS.map((s) => (
                <span
                  key={s.id}
                  className={`tc-dot${readIds.has(s.id) ? " tc-dot--read" : ""}${s.id === activeId ? " tc-dot--active" : ""}`}
                  title={s.title}
                />
              ))}
            </div>
          </div>

          <div className="tc-footer-actions">
            {!allRead && (
              <button type="button" className="tc-btn-secondary" onClick={jumpToFirstUnread}>
                Jump to unread
              </button>
            )}
            {onClose && (
              <button type="button" className="tc-btn-secondary" onClick={onClose}>
                Close
              </button>
            )}
            <button
              type="button"
              className={`tc-btn-primary${allRead ? " tc-btn-primary--ready" : ""}`}
              onClick={handleAcceptClick}
              disabled={accepting}
            >
              {allRead ? <UnlockOutlined /> : <LockOutlined />}
              {accepting ? "Accepting…" : allRead ? "Accept" : `Read all to continue`}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showConfetti && (
          <div className="tc-confetti">
            {confetti.map((p) => (
              <motion.span
                key={p.id}
                className="tc-confetti-piece"
                style={{
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.size * 0.4,
                  background: p.color,
                }}
                initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
                animate={{ y: "110vh", x: p.drift, opacity: 0, rotate: p.rotate }}
                transition={{ duration: 1.4 + Math.random() * 0.6, delay: p.delay, ease: "easeIn" }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TermsAndConditionsModal;