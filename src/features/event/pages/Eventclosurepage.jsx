import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  CameraOutlined,
  PictureOutlined,
  PlusOutlined,
  TeamOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  StarFilled,
  FileTextOutlined,
  DollarCircleOutlined,
  FileOutlined,
} from "@ant-design/icons";
import "./EventClosurePage.css";


const STEPS = [
  { label: "Event Details",   icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment",         icon: <DollarOutlined /> },
  { label: "Attendance",      icon: <ClockCircleOutlined /> },
  { label: "Media",           icon: <CameraOutlined /> },
  { label: "Album",           icon: <PictureOutlined /> },
  { label: "Closure",         icon: <CheckCircleOutlined /> },
];

const PAYMENT_OPTIONS = [
  "Fully Paid",
  "Partially Paid",
  "Pending",
  "Refunded",
  "Waived",
];

const DELIVERABLE_OPTIONS = [
  "Delivered",
  "Partially Delivered",
  "Pending Delivery",
  "Not Applicable",
];

const EVENTS_STORAGE_KEY = "ax.events.v1";
const LAST_CLOSED_EVENT_KEY = "ax.lastClosedEvent.v1";

const fallbackImage =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80";

const readStoredEvents = () => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveStoredEvents = (events) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const buildClosedEvent = ({
  event,
  eventId,
  paymentStatus,
  deliverableStatus,
  rating,
  closureNotes,
}) => {
  const now = new Date();
  const id =
    firstValue(event?.id, eventId, `ev-${now.getTime()}`) ||
    `ev-${now.getTime()}`;

  return {
    id,
    name: firstValue(event?.name, event?.eventName, "Closed Event"),
    type: firstValue(event?.type, event?.eventType, "Event"),
    date: firstValue(
      event?.date,
      event?.eventDate,
      now.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    ),
    time: firstValue(event?.time, event?.eventTime, ""),
    address: firstValue(event?.address, event?.venue, event?.location, ""),
    city: firstValue(event?.city, ""),
    customer: firstValue(event?.customer, event?.clientName, ""),
    status: "DONE",
    pipeline: "Delivered",
    members: Number(firstValue(event?.members, event?.assignedMembers, 0)),
    budget: firstValue(event?.budget, ""),
    image: firstValue(event?.image, event?.imageUrl, fallbackImage),
    paymentStatus,
    deliverableStatus,
    rating,
    closureNotes,
    closedAt: now.toISOString(),
  };
};

const upsertClosedEvent = (closedEvent) => {
  const events = readStoredEvents();
  const existingIndex = events.findIndex((event) => event.id === closedEvent.id);

  const nextEvents =
    existingIndex >= 0
      ? events.map((event, index) =>
          index === existingIndex ? { ...event, ...closedEvent } : event
        )
      : [closedEvent, ...events];

  saveStoredEvents(nextEvents);
  window.localStorage.setItem(LAST_CLOSED_EVENT_KEY, JSON.stringify(closedEvent));

  return nextEvents;
};


/* ── Portal Dropdown ──────────────────────────────────────────────────────── */
function PortalDropdown({ anchorRef, open, options, value, onChange, onClose }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top:   rect.bottom + window.scrollY + 6,
      left:  rect.left   + window.scrollX,
      width: rect.width,
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!anchorRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="ec-dropdown"
      style={{
        position: "absolute",
        top:   pos.top,
        left:  pos.left,
        width: pos.width,
        zIndex: 99999,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`ec-dropdown-item ${value === opt ? "selected" : ""}`}
          onClick={() => { onChange(opt); onClose(); }}
        >
          {value === opt && <CheckCircleOutlined className="ec-check-icon" />}
          {opt}
        </button>
      ))}
    </div>,
    document.body
  );
}


/* ── Custom Select ────────────────────────────────────────────────────────── */
function CustomSelect({ placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  return (
    <div className="ec-select-wrap" ref={btnRef}>
      <button
        className={`ec-select-btn ${open ? "open" : ""} ${value ? "has-value" : ""}`}
        type="button"
        onClick={() => setOpen((p) => !p)}
      >
        <span>{value || placeholder}</span>
        <svg
          className={`ec-select-arrow ${open ? "rotated" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M3 5l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <PortalDropdown
        anchorRef={btnRef}
        open={open}
        options={options}
        value={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}


/* ── Star Rating ──────────────────────────────────────────────────────────── */
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="ec-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="ec-star-btn"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          {star <= (hovered || value) ? (
            <StarFilled className="ec-star filled" />
          ) : (
            <StarOutlined className="ec-star empty" />
          )}
        </button>
      ))}
      {value > 0 && (
        <span className="ec-star-label">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}


/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function EventClosurePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [activeStep, setActiveStep] = useState(6);

  const [paymentStatus,     setPaymentStatus]     = useState("");
  const [deliverableStatus, setDeliverableStatus] = useState("");
  const [rating,            setRating]            = useState(0);
  const [closureNotes,      setClosureNotes]       = useState("");

  const MAX_NOTES = 1000;

  const handleClose = () => {
    if (!paymentStatus || !deliverableStatus) return;
    const searchParams = new URLSearchParams(location.search);
    const eventId = firstValue(
      params.eventId,
      params.id,
      searchParams.get("eventId"),
      searchParams.get("id"),
      location.state?.eventId,
      location.state?.event?.id
    );
    const closedEvent = buildClosedEvent({
      event: location.state?.event,
      eventId,
      paymentStatus,
      deliverableStatus,
      rating,
      closureNotes,
    });

    upsertClosedEvent(closedEvent);
    navigate("/events");
  };

  const canClose = paymentStatus && deliverableStatus;

  return (
    <main className="ec-page">
      <section className="ec-stage">

        {/* ── Top bar ── */}
        <header className="ec-topbar">
          <button className="ec-back" type="button" onClick={() => navigate(-1)}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="ec-title-wrap">
            <span className="ec-title-icon">
              <CheckCircleOutlined />
            </span>
            <div>
              <p className="ec-subtitle">Step 7 of 7 · Closure</p>
              <h1 className="ec-heading">Event Closure</h1>
            </div>
          </div>

          <div className="ec-progress" aria-label="Event progress">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <span className={s <= 7 ? "done" : ""} key={s}>
                {s <= 7 ? <CheckCircleOutlined /> : s}
              </span>
            ))}
            <button type="button" aria-label="Refresh" onClick={() => window.location.reload()}>
              <ReloadOutlined />
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="ec-body">

          {/* ── Side rail ── */}
          <aside className="ec-rail">
            {STEPS.map((step, i) => (
              <div className="ec-step-wrap" key={step.label}>
                <button
                  className={`ec-step ${i === activeStep ? "active" : ""} ${i < activeStep ? "done" : ""}`}
                  type="button"
                  onClick={() => setActiveStep(i)}
                  aria-label={step.label}
                >
                  {i < activeStep ? <CheckCircleOutlined /> : step.icon}
                  {i === activeStep && <span className="ec-step-dot" />}
                </button>
                <span className="ec-tooltip">{step.label}</span>
              </div>
            ))}
          </aside>

          {/* ── Main content ── */}
          <div className="ec-content">

            <div className="ec-progress-bar">
              <div className="ec-progress-fill" style={{ width: "86%" }} />
              <span className="ec-progress-pct">86%</span>
            </div>

            <div className="ec-page-header">
              <div className="ec-page-header-left">
                <CheckCircleOutlined className="ec-page-header-icon" />
                <div>
                  <h2>Event Closure</h2>
                  <p>Confirm the final payment and delivery status, then close the event.</p>
                </div>
              </div>
              <button className="ec-btn-outline" onClick={() => window.location.reload()}>
                <ReloadOutlined /> Refresh
              </button>
            </div>

            <div className="ec-form-grid">

              <div className="ec-form-col">

                {/* Payment Status Card */}
                <div className="ec-section-card">
                  <div className="ec-section-head">
                    <DollarCircleOutlined className="ec-section-icon" />
                    <span className="ec-section-title">Payment Status</span>
                  </div>
                  <div className="ec-section-body">
                    <CustomSelect
                      placeholder="Select payment status"
                      options={PAYMENT_OPTIONS}
                      value={paymentStatus}
                      onChange={setPaymentStatus}
                    />
                  </div>
                </div>

                {/* Deliverable Status Card */}
                <div className="ec-section-card">
                  <div className="ec-section-head">
                    <FileOutlined className="ec-section-icon" />
                    <span className="ec-section-title">Deliverable Status</span>
                  </div>
                  <div className="ec-section-body">
                    <CustomSelect
                      placeholder="Select deliverable status"
                      options={DELIVERABLE_OPTIONS}
                      value={deliverableStatus}
                      onChange={setDeliverableStatus}
                    />
                  </div>
                </div>

              </div>

              <div className="ec-form-col">
                <div className="ec-section-card ec-additional">
                  <div className="ec-section-head">
                    <span className="ec-section-title">Additional Information</span>
                  </div>

                  <div className="ec-section-body">
                    <div className="ec-field-head">
                      <StarFilled className="ec-star-icon-head" />
                      <span className="ec-field-title">Event Rating</span>
                      <span className="ec-optional">(optional)</span>
                    </div>
                    <div className="ec-rating-box">
                      <p className="ec-rating-prompt">Rate your overall experience with this event.</p>
                      <StarRating value={rating} onChange={setRating} />
                    </div>
                  </div>

                  <div className="ec-divider" />

                  <div className="ec-section-body">
                    <div className="ec-field-head">
                      <FileTextOutlined className="ec-notes-icon-head" />
                      <span className="ec-field-title">Closure Notes</span>
                      <span className="ec-optional">(optional)</span>
                    </div>
                    <textarea
                      className="ec-textarea"
                      placeholder="Add any final notes, observations, or comments about this event..."
                      value={closureNotes}
                      maxLength={MAX_NOTES}
                      onChange={(e) => setClosureNotes(e.target.value)}
                      rows={6}
                    />
                    <div className="ec-char-count">
                      {closureNotes.length} / {MAX_NOTES}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="ec-actions">
              <button
                className="ec-btn-secondary"
                type="button"
                onClick={() => navigate("/events/create/album")}
              >
                <ArrowLeftOutlined /> Previous Step
              </button>

              <button
                className={`ec-btn-close ${!canClose ? "disabled" : ""}`}
                type="button"
                disabled={!canClose}
                onClick={handleClose}
              >
                <CheckCircleOutlined /> Close Event
              </button>
            </footer>

          </div>
        </div>
      </section>
    </main>
  );
}