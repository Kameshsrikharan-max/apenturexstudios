import React, { useEffect, useRef, useState, RefObject } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {CheckCircleOutlined,ClockCircleOutlined,DollarOutlined,DoubleLeftOutlined,CameraOutlined,PictureOutlined,PlusOutlined,TeamOutlined,ReloadOutlined,ArrowLeftOutlined,StarOutlined,StarFilled,FileTextOutlined,DollarCircleOutlined,FileOutlined,
} from "@ant-design/icons";
import "./EventClosurePage.css";

/* ── Types ── */
interface Step {
  label: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  { label: "Event Details", icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment", icon: <DollarOutlined /> },
  { label: "Attendance", icon: <ClockCircleOutlined /> },
  { label: "Media", icon: <CameraOutlined /> },
  { label: "Album", icon: <PictureOutlined /> },
  { label: "Closure", icon: <CheckCircleOutlined /> },
];

const PAYMENT_OPTIONS: string[] = [
  "Fully Paid",
  "Partially Paid",
  "Pending",
  "Refunded",
  "Waived",
];

const DELIVERABLE_OPTIONS: string[] = [
  "Delivered",
  "Partially Delivered",
  "Pending Delivery",
  "Not Applicable",
];

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

// Same source every other step in the wizard reads (CreateEventPage writes
// it, TeamAssignmentPage/PaymentPage/AttendancePage/MediaManagement/
// AlbumSelectionPage all read it). Closure was the one page not wired to
// this — it was reading React Router navigation state that nothing ever
// passed, so it always saw a blank event.
function loadEvent(): any {
  try {
    const raw = sessionStorage.getItem("currentEvent");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Same pattern as EventPage.tsx's patchEventOnServer — PATCH the real
// backend event record instead of writing to the old, no-longer-read
// "ax.events.v1" localStorage key.
async function patchEventOnServer(
  id: string,
  payload: Record<string, any>
): Promise<{ ok: boolean; message?: string }> {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/studio/events/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      return { ok: false, message: body?.message || "Server update failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error." };
  }
}

/* ── Portal Dropdown ── */
interface PortalDropdownProps {
  anchorRef: RefObject<HTMLElement>;
  open: boolean;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

function PortalDropdown({
  anchorRef,
  open,
  options,
  value,
  onChange,
  onClose,
}: PortalDropdownProps) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) onClose();
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
        top: pos.top,
        left: pos.left,
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
          onClick={() => {
            onChange(opt);
            onClose();
          }}
        >
          {value === opt && <CheckCircleOutlined className="ec-check-icon" />}
          {opt}
        </button>
      ))}
    </div>,
    document.body
  );
}

/* ── Custom Select ── */
interface CustomSelectProps {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

function CustomSelect({ placeholder, options, value, onChange }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

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

/* ── Star Rating ── */
interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

function StarRating({ value, onChange }: StarRatingProps) {
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

/* ── Page ── */
export default function EventClosurePage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<number>(1);

  const [event] = useState(() => loadEvent());
  const eventId: string | undefined = event?.id || event?._id;
  const eventName: string = event?.eventName || event?.name || "";

  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [deliverableStatus, setDeliverableStatus] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [closureNotes, setClosureNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const MAX_NOTES = 1000;

  const handleClose = async () => {
    if (!paymentStatus || !deliverableStatus) return;
    setSubmitError(null);

    if (!eventId) {
      setSubmitError("No event found to close — go back to Event Details and start again.");
      return;
    }

    setIsSubmitting(true);
    const { ok, message } = await patchEventOnServer(eventId, {
      status: "DONE",
      pipeline: "Delivered",
      // The backend's event fields don't currently include these closure
      // details (paymentStatus/deliverableStatus/rating/closureNotes) —
      // they're sent here so the backend can pick them up once it has a
      // place to store them, but today only status/pipeline will persist.
      paymentStatus,
      deliverableStatus,
      rating,
      closureNotes,
    });
    setIsSubmitting(false);

    if (!ok) {
      setSubmitError(message || "Failed to close the event. Please try again.");
      return;
    }

    // Clear this event's wizard-scoped sessionStorage now that it's closed.
    try {
      sessionStorage.removeItem("currentEvent");
      sessionStorage.removeItem("mediaManagement__state");
    } catch {}

    navigate("/events");
  };

  const canClose = Boolean(paymentStatus && deliverableStatus) && !isSubmitting;

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
              <h1 className="ec-heading">
                Event Closure
                {eventName && <span className="ec-heading-sub"> — {eventName}</span>}
              </h1>
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="ec-body">
          {/* ── Side rail ── */}
          <aside className="ec-rail">
            {STEPS.map((step, i) => (
              <div className="ec-step-wrap" key={step.label}>
                <button
                  className={`ec-step ${i === activeStep ? "active" : ""} ${
                    i < activeStep ? "done" : ""
                  }`}
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

            {!eventId && (
              <div className="ec-error-banner" role="alert">
                No event is currently loaded. Go back to Event Details and create or reopen an
                event before closing it.
              </div>
            )}

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
                      <p className="ec-rating-prompt">
                        Rate your overall experience with this event.
                      </p>
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

            {submitError && (
              <div className="ec-error-banner" role="alert">
                {submitError}
              </div>
            )}

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
                <CheckCircleOutlined /> {isSubmitting ? "Closing…" : "Close Event"}
              </button>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}