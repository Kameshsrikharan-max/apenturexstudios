import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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


function CustomSelect({ placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false);

  // Close when clicking outside
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest(".ec-select-wrap")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="ec-select-wrap">
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

      {open && (
        <div className="ec-dropdown">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`ec-dropdown-item ${value === opt ? "selected" : ""}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {value === opt && <CheckCircleOutlined className="ec-check-icon" />}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


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


export default function EventClosurePage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(6);

  const [paymentStatus,     setPaymentStatus]     = useState("");
  const [deliverableStatus, setDeliverableStatus] = useState("");
  const [rating,            setRating]            = useState(0);
  const [closureNotes,      setClosureNotes]       = useState("");

  const MAX_NOTES = 1000;

  const handleClose = () => {
    if (!paymentStatus || !deliverableStatus) return;
    // TODO: submit to API
    navigate("/events");
  };

  const canClose = paymentStatus && deliverableStatus;

  return (
    <main className="ec-page">
      <section className="ec-stage">

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

        <div className="ec-body">

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

                {/* Payment Status Card — overflow visible so dropdown shows */}
                <div className="ec-section-card ec-section-card--overflow">
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

                {/* Deliverable Status Card — overflow visible so dropdown shows */}
                <div className="ec-section-card ec-section-card--overflow">
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