import React, { useState, useRef } from "react";
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
  ArrowRightOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import "./AttendancePage.css";

/* ─── Wizard steps ─── */
const STEPS = [
  { label: "Event Details",   icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment",         icon: <DollarOutlined /> },
  { label: "Attendance",      icon: <ClockCircleOutlined /> },
  { label: "Media",           icon: <CameraOutlined /> },
  { label: "Album",           icon: <PictureOutlined /> },
  { label: "Closure",         icon: <CheckCircleOutlined /> },
];

const INITIAL_MEMBERS = [
  {
    id: "STM-001",
    name: "Kamesh Srikharan.T",
    role: "studioadmin",
    services: ["Candid Photography"],
    mobile: null,
    status: "Pending",
    checkInTime: null,
    photo: null,
    location: null,
  },
];

/* ══════════════════════════════════════════
   SUB-VIEW A – Team Attendance list
══════════════════════════════════════════ */
function TeamAttendanceView({ members, onRecord, onView }) {
  return (
    <div className="ap-view">
      <div className="ap-hero-card">
        <div className="ap-hero-left">
          <ClockCircleOutlined className="ap-hero-icon" />
          <div>
            <h2>Team Attendance</h2>
            <p>Track who has checked in for this event and complete your own check-in.</p>
          </div>
        </div>
        <button className="ap-refresh-btn" type="button">
          <ReloadOutlined /> Refresh
        </button>
      </div>

      <div className="ap-panel">
        <div className="ap-section-head">
          <UserOutlined className="ap-section-icon" />
          <span className="ap-section-title">Studio Members</span>
          <span className="ap-section-count">{members.length}</span>
        </div>

        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Role</th>
                <th>Services</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Check-In Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.role}</td>
                  <td>
                    {m.services.map((s) => (
                      <span key={s} className="ap-service-tag">{s}</span>
                    ))}
                  </td>
                  <td>{m.mobile || "–"}</td>
                  <td>
                    {m.status === "Checked In" ? (
                      <span className="ap-badge ap-confirmed">
                        <CheckCircleOutlined /> Checked In
                      </span>
                    ) : (
                      <span className="ap-badge ap-pending">
                        <ClockCircleOutlined /> Pending
                      </span>
                    )}
                  </td>
                  <td>{m.checkInTime || "–"}</td>
                  <td>
                    {m.status === "Checked In" ? (
                      <button className="ap-outline-btn" onClick={() => onView(m)}>
                        <EyeOutlined /> View
                      </button>
                    ) : (
                      <button className="ap-primary-btn" onClick={() => onRecord(m)}>
                        Record Attendance
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SUB-VIEW B – Attendance Check-In form
══════════════════════════════════════════ */
function CheckInView({ member, onBack, onComplete }) {
  const [photo, setPhoto]           = useState(member.photo || null);
  const [location, setLocation]     = useState(member.location || null);
  const [locLoading, setLocLoading] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(!!member.photo);
  const fileRef = useRef(null);

  const canComplete = photoSaved && location;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    setPhotoSaved(false);
  };

  const handleSavePhoto  = () => setPhotoSaved(true);
  const handleClearPhoto = () => { setPhoto(null); setPhotoSaved(false); };

  const handleShareLocation = () => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        setLocLoading(false);
      },
      () => {
        setLocation({ lat: "12.920198", lng: "80.167737" });
        setLocLoading(false);
      }
    );
  };

  const handleComplete = () => {
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    onComplete({ ...member, photo, location, status: "Checked In", checkInTime: time });
  };

  return (
    <div className="ap-view">
      <div className="ap-checkin-topbar">
        <div>
          <h2>Attendance Check-In</h2>
          <p>Review team member details and complete the check-in steps below.</p>
        </div>
        <button className="ap-outline-btn ap-back-inline" onClick={onBack}>
          <ArrowLeftOutlined /> Return to Team Attendance
        </button>
      </div>

      <div className="ap-checkin-body">
        {/* LEFT – member info */}
        <div className="ap-member-card">
          <h3 className="ap-card-title">Team Member Information</h3>

          <div className="ap-member-field">
            <span className="ap-field-label">Name</span>
            <span className="ap-field-value">{member.name}</span>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Role</span>
            <span className="ap-field-value">{member.role}</span>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Service</span>
            <div className="ap-services-row">
              {member.services.map((s) => (
                <span key={s} className="ap-service-tag">{s}</span>
              ))}
            </div>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Assignment Status</span>
            <span className="ap-badge ap-confirmed-green">ACCEPTED</span>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Check-In Status</span>
            {member.status === "Checked In" ? (
              <span className="ap-badge ap-confirmed"><CheckCircleOutlined /> Checked In</span>
            ) : (
              <span className="ap-badge ap-pending"><ClockCircleOutlined /> Pending</span>
            )}
          </div>
        </div>

        {/* RIGHT – steps */}
        <div className="ap-steps-card">
          <h3 className="ap-card-title">Complete Check-In</h3>

          {/* Step 1 */}
          <div className="ap-step-block">
            <div className="ap-step-num">1</div>
            <div className="ap-step-content">
              <h4>Capture or Upload Photo</h4>
              {photo ? (
                <>
                  <img src={photo} alt="check-in" className="ap-photo-preview" />
                  {!photoSaved ? (
                    <div className="ap-photo-actions">
                      <button className="ap-primary-btn" onClick={handleSavePhoto}>Save Photo</button>
                      <button className="ap-outline-btn" onClick={handleClearPhoto}>Clear</button>
                    </div>
                  ) : (
                    <>
                      <div className="ap-success-box">
                        <CheckCircleOutlined /> Photo uploaded successfully
                      </div>
                      <button className="ap-outline-btn" onClick={handleClearPhoto}>Retake Photo</button>
                    </>
                  )}
                </>
              ) : (
                <div className="ap-photo-options">
                  <button className="ap-photo-btn" onClick={() => fileRef.current?.click()}>
                    <CameraOutlined /> Take Photo with Camera
                  </button>
                  <button className="ap-upload-small-btn" onClick={() => fileRef.current?.click()}>
                    <UploadOutlined /> Upload from Device
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div className="ap-step-block">
            <div className="ap-step-num">2</div>
            <div className="ap-step-content">
              <h4>Verify Your Location</h4>
              {location ? (
                <div className="ap-success-box ap-location-box">
                  <CheckCircleOutlined className="ap-loc-check" />
                  <div>
                    <strong>Location Confirmed</strong>
                    <p>Lat: {location.lat}, Lng: {location.lng}</p>
                  </div>
                </div>
              ) : (
                <button className="ap-photo-btn" onClick={handleShareLocation} disabled={locLoading}>
                  <EnvironmentOutlined /> {locLoading ? "Getting location…" : "Share Current Location"}
                </button>
              )}
            </div>
          </div>

          {/* Step 3 */}
          <div className="ap-step-block">
            <div className="ap-step-num">3</div>
            <div className="ap-step-content">
              <h4>Complete Check-In</h4>
              {!canComplete && (
                <div className="ap-warn-box">
                  ⓘ Please complete steps 1 and 2 to enable check-in.
                </div>
              )}
              <button
                className={`ap-complete-btn ${canComplete ? "ap-complete-active" : ""}`}
                disabled={!canComplete}
                onClick={handleComplete}
              >
                Complete Check-In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SUB-VIEW C – View existing check-in
══════════════════════════════════════════ */
function ViewCheckInView({ member, onBack }) {
  return (
    <div className="ap-view">
      <div className="ap-checkin-topbar">
        <div>
          <h2>Attendance Details</h2>
          <p>Check-in details for this team member.</p>
        </div>
        <button className="ap-outline-btn ap-back-inline" onClick={onBack}>
          <ArrowLeftOutlined /> Return to Team Attendance
        </button>
      </div>

      <div className="ap-checkin-body">
        <div className="ap-member-card">
          <h3 className="ap-card-title">Team Member Information</h3>
          <div className="ap-member-field">
            <span className="ap-field-label">Name</span>
            <span className="ap-field-value">{member.name}</span>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Role</span>
            <span className="ap-field-value">{member.role}</span>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Service</span>
            <div className="ap-services-row">
              {member.services.map((s) => <span key={s} className="ap-service-tag">{s}</span>)}
            </div>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Assignment Status</span>
            <span className="ap-badge ap-confirmed-green">ACCEPTED</span>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Check-In Status</span>
            <span className="ap-badge ap-confirmed"><CheckCircleOutlined /> Checked In</span>
          </div>
          <div className="ap-member-field">
            <span className="ap-field-label">Check-In Time</span>
            <span className="ap-field-value">{member.checkInTime}</span>
          </div>
        </div>

        <div className="ap-steps-card">
          <h3 className="ap-card-title">Check-In Proof</h3>
          {member.photo && (
            <div className="ap-proof-block">
              <h4>Photo</h4>
              <img src={member.photo} alt="check-in proof" className="ap-photo-preview" />
            </div>
          )}
          {member.location && (
            <div className="ap-proof-block">
              <h4>Location</h4>
              <div className="ap-success-box ap-location-box">
                <CheckCircleOutlined className="ap-loc-check" />
                <div>
                  <strong>Location Confirmed</strong>
                  <p>Lat: {member.location.lat}, Lng: {member.location.lng}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function AttendancePage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep]       = useState(3);
  const [members, setMembers]             = useState(INITIAL_MEMBERS);
  const [subView, setSubView]             = useState("list");
  const [selectedMember, setSelectedMember] = useState(null);

  const handleRecord   = (m) => { setSelectedMember(m); setSubView("checkin"); };
  const handleView     = (m) => { setSelectedMember(m); setSubView("view"); };
  const handleBack     = ()  => { setSelectedMember(null); setSubView("list"); };
  const handleComplete = (updated) => {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setSubView("list");
    setSelectedMember(null);
  };

  return (
    <main className="ap-page">
      <section className="ap-stage">

        {/* ── Top bar ── */}
        <header className="ap-topbar">
          <button className="ap-back" type="button" onClick={() => navigate(-1)}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="ap-title-wrap">
            <span className="ap-title-icon"><ClockCircleOutlined /></span>
            <div>
              <p className="ap-subtitle">Step 4 of 7 · Attendance</p>
              <h1 className="ap-heading">Team Attendance</h1>
            </div>
          </div>

          <div className="ap-progress" aria-label="Event progress">
            {[1, 2, 3, 4, 5].map((s) => (
              <span className={s <= 4 ? "done" : ""} key={s}>
                {s <= 4 ? <CheckCircleOutlined /> : s}
              </span>
            ))}
            <button type="button" aria-label="Refresh"><ReloadOutlined /></button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="ap-body">

          {/* Side rail */}
          <aside className="ap-rail">
            {STEPS.map((step, i) => (
              <div className="ap-step-wrap" key={step.label}>
                <button
                  className={`ap-step ${i === activeStep ? "active" : ""} ${i < activeStep ? "done" : ""}`}
                  type="button"
                  onClick={() => setActiveStep(i)}
                  aria-label={step.label}
                >
                  {i < activeStep ? <CheckCircleOutlined /> : step.icon}
                  {i === activeStep && <span className="ap-step-dot" />}
                </button>
                <span className="ap-tooltip">{step.label}</span>
              </div>
            ))}
          </aside>

          {/* Content */}
          <div className="ap-content">

            <div className="ap-progress-bar">
              <div className="ap-progress-fill" style={{ width: "43%" }} />
              <span className="ap-progress-pct">43%</span>
            </div>

            {subView === "list" && (
              <TeamAttendanceView members={members} onRecord={handleRecord} onView={handleView} />
            )}
            {subView === "checkin" && selectedMember && (
              <CheckInView member={selectedMember} onBack={handleBack} onComplete={handleComplete} />
            )}
            {subView === "view" && selectedMember && (
              <ViewCheckInView member={selectedMember} onBack={handleBack} />
            )}

            <footer className="ap-actions">
              <button
                className="ap-secondary-btn"
                type="button"
                onClick={() => navigate("/events/create/payment")}
              >
                <ArrowLeftOutlined /> Previous Step
              </button>
              <button
                className="ap-primary-btn"
                type="button"
                onClick={() => navigate("/events/create/media")}
              >
                Next Step <ArrowRightOutlined />
              </button>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}