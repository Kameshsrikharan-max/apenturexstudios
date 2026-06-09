import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseOutlined,
  DollarOutlined, DoubleLeftOutlined, EnvironmentOutlined, MailOutlined,
  PhoneOutlined, PlusOutlined, TeamOutlined, CameraOutlined, PictureOutlined,
  ThunderboltOutlined, UserOutlined, ReloadOutlined, LeftOutlined, RightOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import "./CreateEventPage.css";



const steps = [
  { label: "Event Details",   icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment",         icon: <DollarOutlined /> },
  { label: "Attendance",      icon: <ClockCircleOutlined /> },
  { label: "Media",           icon: <CameraOutlined /> },
  { label: "Album",           icon: <PictureOutlined /> },
  { label: "Closure",         icon: <CheckCircleOutlined /> },
];

const SERVICES = [
  "Traditional Photography",
  "Candid Photography",
  "Candid Videography",
  "Drone",
];

const ALBUM_TEMPLATES = [
  { name: "Premium Wedding",              sheets: 60, photos: 180, size: "12x36" },
  { name: "Classic Traditional",          sheets: 48, photos: 135, size: "12x36" },
  { name: "Cinematic Story",              sheets: 40, photos: 120, size: "10x30" },
  { name: "New template - 1",             sheets: 20, photos: 40,  size: "custom" },
  { name: "New template - 2",             sheets: 10, photos: 40,  size: "12x10" },
  { name: "New template - 3",             sheets: 5,  photos: 20,  size: "A4"    },
  { name: "Candid photography template",  sheets: 20, photos: 40,  size: "16x12" },
  { name: "Testing",                      sheets: 20, photos: 40,  size: "10x8"  },
  { name: "Album Template",               sheets: 5,  photos: 40,  size: "16x12" },
  { name: "Meetup Album",                 sheets: 10, photos: 20,  size: "A3"    },
  { name: "Sprint Review",                sheets: 10, photos: 20,  size: "10x8"  },
];

const INDIAN_STATES = [
  "Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam",
  "Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir",
  "Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry",
  "Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal",
];

const INDIAN_CITIES = [
  "Agra","Ahmedabad","Aizawl","Ajmer","Aligarh","Allahabad","Amravati",
  "Amritsar","Anantapur","Arrah","Asansol","Aurangabad","Bangalore","Bareilly",
  "Belgaum","Bhilai","Bhopal","Bhubaneswar","Bikaner","Chandigarh","Chennai",
  "Coimbatore","Cuttack","Dehradun","Delhi","Dhanbad","Durg","Faridabad",
  "Gandhinagar","Ghaziabad","Gorakhpur","Gulbarga","Gurgaon","Guwahati",
  "Gwalior","Hubballi","Hyderabad","Imphal","Indore","Itanagar","Jaipur",
  "Jalandhar","Jammu","Jamshedpur","Jodhpur","Kakinada","Kanpur","Kochi",
  "Kohima","Kolkata","Kollam","Kota","Kozhikode","Lucknow","Ludhiana","Madurai",
  "Mangaluru","Meerut","Mumbai","Mysore","Nagpur","Nashik","Navi Mumbai",
  "Nellore","Noida","Panaji","Patna","Pune","Raipur","Rajkot","Ranchi",
  "Salem","Shillong","Shimla","Siliguri","Srinagar","Surat","Thane",
  "Thiruvananthapuram","Tiruchirappalli","Tiruppur","Udaipur","Vadodara",
  "Varanasi","Vijayawada","Visakhapatnam","Warangal",
].sort();

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = ["00","05","10","15","20","25","30","35","40","45","50","55"];



function formatAmount(raw) {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return "₹" + parseInt(digits, 10).toLocaleString("en-IN");
}

function stripAmount(display) {
  return display.replace(/[^\d]/g, "");
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}


function clearAllEventPayments() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("eventPayments__")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
    // Also remove the old generic key in case it exists from a previous version
    sessionStorage.removeItem("eventPayments");
  } catch {}
}



function usePopupPos(anchorRef, popupHeight) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow >= popupHeight
      ? r.bottom + window.scrollY + 8
      : r.top + window.scrollY - popupHeight - 8;
    setPos({ top, left: r.left + window.scrollX, width: r.width });
  });
  return pos;
}

function CalendarPicker({ anchorRef, value, onChange, onClose }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(value ? value.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? value.getMonth()    : today.getMonth());
  const pos = usePopupPos(anchorRef, 320);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const days     = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells    = Array(firstDay).fill(null).concat(
    Array.from({ length: days }, (_, i) => i + 1)
  );

  const isSelected = (d) =>
    value && value.getDate() === d &&
    value.getMonth() === viewMonth && value.getFullYear() === viewYear;

  const isToday = (d) =>
    today.getDate() === d &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  if (!pos) return null;
  return ReactDOM.createPortal(
    <div
      className="cal-popup"
      style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="cal-nav">
        <button type="button" onClick={prevMonth}><LeftOutlined /></button>
        <span>{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth}><RightOutlined /></button>
      </div>
      <div className="cal-grid-head">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) =>
          d === null
            ? <span key={"e"+i} />
            : <button
                key={d}
                type="button"
                className={`cal-day${isSelected(d) ? " selected" : ""}${isToday(d) ? " today" : ""}`}
                onClick={() => { onChange(new Date(viewYear, viewMonth, d)); onClose(); }}
              >{d}</button>
        )}
      </div>
    </div>,
    document.body
  );
}

function TimePicker({ anchorRef, value, onChange, onClose }) {
  const [h,  setH]  = useState(value?.h  || "09");
  const [m,  setM]  = useState(value?.m  || "00");
  const [ap, setAp] = useState(value?.ap || "AM");
  const pos = usePopupPos(anchorRef, 260);

  const apply = () => { onChange({ h, m, ap }); onClose(); };

  if (!pos) return null;
  return ReactDOM.createPortal(
    <div
      className="time-popup"
      style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="time-cols">
        <div className="time-col">
          <span className="time-col-label">Hour</span>
          {HOURS.map(hh => (
            <button key={hh} type="button"
              className={`time-opt${h === hh ? " sel" : ""}`}
              onClick={() => setH(hh)}>{hh}</button>
          ))}
        </div>
        <div className="time-sep">:</div>
        <div className="time-col">
          <span className="time-col-label">Min</span>
          {MINUTES.map(mm => (
            <button key={mm} type="button"
              className={`time-opt${m === mm ? " sel" : ""}`}
              onClick={() => setM(mm)}>{mm}</button>
          ))}
        </div>
        <div className="time-col ampm">
          <span className="time-col-label">AM/PM</span>
          {["AM","PM"].map(x => (
            <button key={x} type="button"
              className={`time-opt${ap === x ? " sel" : ""}`}
              onClick={() => setAp(x)}>{x}</button>
          ))}
        </div>
      </div>
      <button type="button" className="time-apply" onClick={apply}>Set Time</button>
    </div>,
    document.body
  );
}

function SearchableDropdown({ options, value, onChange, placeholder }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef();
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const DROPDOWN_H = 280;

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const top = spaceBelow >= DROPDOWN_H
        ? r.bottom + window.scrollY + 4
        : r.top + window.scrollY - DROPDOWN_H - 4;
      setPos({ top, left: r.left + window.scrollX, width: r.width });
    }
    setOpen(o => !o);
  };

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sdd-wrap" ref={triggerRef}>
      <div className={`sdd-trigger${open ? " open" : ""}`} onClick={handleOpen}>
        <span className={value ? "sdd-val" : "sdd-placeholder"}>{value || placeholder}</span>
        <span className="sdd-arrow">▾</span>
      </div>
      {open && pos && ReactDOM.createPortal(
        <div
          className="sdd-dropdown"
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <input
            className="sdd-search"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="sdd-list">
            {filtered.length
              ? filtered.map(o => (
                  <div key={o}
                    className={`sdd-option${value === o ? " selected" : ""}`}
                    onMouseDown={() => { onChange(o); setOpen(false); setSearch(""); }}>
                    {o}
                  </div>
                ))
              : <div className="sdd-empty">No results</div>
            }
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}



function AlbumServiceCard({ service, albumData, onUpdate }) {
  const isPhotography = service === "Traditional Photography" || service === "Candid Photography";
  const isDrone       = service === "Drone";
  const isVideo       = service === "Candid Videography";

  const serviceLabel =
    service === "Traditional Photography" ? "Traditional Album" :
    service === "Candid Photography"      ? "Candid Album" :
    service === "Candid Videography"      ? "Candid Video" : "Drone";

  const icon =
    isDrone ? "🛸" :
    isVideo ? "🎬" : "📁";

  const numAlbums = albumData.numAlbums || 1;
  const albums    = albumData.albums    || [{}];
  const droneCnt  = albumData.droneCount || 1;

  const readyCount = isPhotography ? albums.filter(a => a.template).length : null;
  const totalCount = isPhotography ? numAlbums : null;
  const allReady   = isPhotography && readyCount === totalCount && totalCount > 0;

  const statusLabel = isPhotography
    ? allReady ? `${readyCount} ready` : `${readyCount}/${totalCount}`
    : isVideo  ? "Setup Required"
    : null;

  const [open,   setOpen]   = useState(true);
  const [tplOpen, setTplOpen] = useState({});
  const [tplPos,  setTplPos]  = useState({});
  const tplRefs = useRef({});

  useEffect(() => {
    const handler = (e) => {
      const clickedInsideTpl = Object.values(tplRefs.current).some(
        el => el && el.contains(e.target)
      );
      if (!clickedInsideTpl) setTplOpen({});
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openTpl = (idx) => {
    const el = tplRefs.current[idx];
    if (el) {
      const r = el.getBoundingClientRect();
      const DROPDOWN_H = 280;
      const spaceBelow = window.innerHeight - r.bottom;
      const top = spaceBelow >= DROPDOWN_H
        ? r.bottom + window.scrollY + 4
        : r.top + window.scrollY - DROPDOWN_H - 4;
      setTplPos(prev => ({ ...prev, [idx]: { top, left: r.left + window.scrollX, width: r.width } }));
    }
    setTplOpen(p => ({ ...p, [idx]: !p[idx] }));
  };

  const setNumAlbums = (n) => {
    const num  = Math.max(1, parseInt(n) || 1);
    const newA = Array.from({ length: num }, (_, i) => albums[i] || {});
    onUpdate({ ...albumData, numAlbums: num, albums: newA });
  };

  const setTemplate = (idx, tpl) => {
    const newA = albums.map((a, i) => i === idx ? { ...a, template: tpl } : a);
    onUpdate({ ...albumData, albums: newA });
    setTplOpen(prev => ({ ...prev, [idx]: false }));
  };

  return (
    <div className="alb-card">
      <div className="alb-card-head" onClick={() => setOpen(o => !o)}>
        <div className="alb-card-left">
          <span className="alb-icon">{icon}</span>
          <div>
            <div className="alb-title">{serviceLabel}</div>
            <div className="alb-sub">
              {service}
              {isPhotography ? ` · ${numAlbums} album${numAlbums > 1 ? "s" : ""}` : ""}
            </div>
          </div>
        </div>
        <div className="alb-card-right">
          {statusLabel && (
            <span className={`alb-badge${allReady ? " ready" : ""}`}>{statusLabel}</span>
          )}
          <span className={`alb-chevron${open ? " up" : ""}`}>›</span>
        </div>
      </div>

      {open && (
        <div className="alb-body">
          {isPhotography && (
            <>
              <div className="alb-row">
                <span className="alb-row-label">Number of Albums <b>*</b></span>
                <input
                  className="alb-num-input"
                  type="number" min="1" max="10"
                  value={numAlbums}
                  onChange={e => setNumAlbums(e.target.value)}
                />
                <span className={`alb-badge${allReady ? " ready" : ""}`}>
                  {readyCount}/{totalCount}
                </span>
              </div>

              {albums.map((alb, idx) => (
                <div key={idx} className="alb-album-row">
                  <div className="alb-album-head">
                    <span className="alb-album-num">{idx + 1}</span>
                    <span className="alb-album-label">Album {idx + 1} <b>*</b></span>
                    {alb.template && <span className="alb-badge ready">Ready</span>}
                  </div>
                  <div className="alb-tpl-wrap" ref={el => tplRefs.current[idx] = el}>
                    <div className="alb-tpl-trigger" onClick={() => openTpl(idx)}>
                      {alb.template
                        ? <span>
                            {alb.template.name}{" "}
                            <em>– {alb.template.sheets}sh · {alb.template.photos}ph · {alb.template.size}</em>
                          </span>
                        : <span className="alb-tpl-ph">Select Album Template</span>
                      }
                      <span>▾</span>
                    </div>
                    {tplOpen[idx] && tplPos[idx] && ReactDOM.createPortal(
                      <div
                        className="alb-tpl-dropdown"
                        style={{
                          position: "absolute",
                          top: tplPos[idx].top,
                          left: tplPos[idx].left,
                          width: tplPos[idx].width,
                          zIndex: 9999,
                        }}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        {ALBUM_TEMPLATES.map(tpl => (
                          <div key={tpl.name} className="alb-tpl-option"
                            onMouseDown={() => setTemplate(idx, tpl)}>
                            <span className="alb-tpl-name">{tpl.name}</span>
                            <span className="alb-tpl-meta">
                              – {tpl.sheets}sh · {tpl.photos}ph · {tpl.size}
                            </span>
                          </div>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                  {alb.template && (
                    <div className="alb-chips">
                      <span className="alb-chip">{alb.template.sheets} Sheets</span>
                      <span className="alb-chip">{alb.template.photos} Photos</span>
                      <span className="alb-chip">{alb.template.size}</span>
                      <span className="alb-chip-link">✏ View Template</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {isDrone && (
            <div className="alb-row">
              <span className="alb-row-label">Number of Drone Deliverables</span>
              <input
                className="alb-num-input"
                type="number" min="1"
                value={droneCnt}
                onChange={e => onUpdate({
                  ...albumData,
                  droneCount: Math.max(1, parseInt(e.target.value) || 1),
                })}
              />
            </div>
          )}

          {isVideo && (
            <div className="alb-info-box">
              <InfoCircleOutlined />
              No additional configuration required for video deliverables.
            </div>
          )}
        </div>
      )}
    </div>
  );
}



export default function CreateEventPage({ user }) {
  const navigate = useNavigate();

  const restoreDraft = () => {
    try {
      const raw = sessionStorage.getItem("eventDraft");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.eventDate) parsed.eventDate = new Date(parsed.eventDate);
      return parsed;
    } catch {
      return null;
    }
  };

  const defaultForm = {
    eventName: "", eventDate: null, startTime: null,
    customerName: "", phone: "", email: "",
    eventAmount: "",
    address: "", city: "", state: "",
    selectedServices: [],
    albumData: {},
  };

  const [form, setForm]             = useState(() => restoreDraft() || defaultForm);
  const [errors, setErrors]         = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [showCal,  setShowCal]      = useState(false);
  const [showTime, setShowTime]     = useState(false);
  const calRef  = useRef();
  const timeRef = useRef();


  useEffect(() => {
    try {
      sessionStorage.setItem("eventDraft", JSON.stringify(form));
    } catch {}
  }, [form]);


  useEffect(() => {
    const h = (e) => {
      if (calRef.current  && !calRef.current.contains(e.target))  setShowCal(false);
      if (timeRef.current && !timeRef.current.contains(e.target)) setShowTime(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleService = (service) => {
    setForm(f => ({
      ...f,
      selectedServices: f.selectedServices.includes(service)
        ? f.selectedServices.filter(s => s !== service)
        : [...f.selectedServices, service],
    }));
  };

  const handleAmountChange = (raw) => {
    set("eventAmount", formatAmount(raw));
  };

  const handlePhoneChange = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    set("phone", digits);
  };

  const formatDateDisplay = (d) =>
    d
      ? `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
      : "";

  const formatTimeDisplay = (t) =>
    t ? `${t.h}:${t.m} ${t.ap}` : "";

  
  const validate = () => {
    const e = {};
    if (!form.eventName.trim())                e.eventName    = "Event name is required";
    if (!form.eventDate)                       e.eventDate    = "Event date is required";
    if (!form.customerName.trim())             e.customerName = "Customer name is required";
    if (!form.phone || form.phone.length < 10) e.phone        = "Enter a valid 10-digit phone number";
    if (
      !form.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    )                                          e.email        = "Enter a valid email address";
    if (!form.address.trim())                  e.address      = "Address is required";
    if (!form.city)                            e.city         = "City is required";
    if (form.selectedServices.length === 0)    e.services     = "Select at least one service";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const numericAmount = parseInt(stripAmount(form.eventAmount), 10) || 0;
    const createdAt     = new Date().toISOString();

    const eventPayload = {
      ...form,
      eventDate:          form.eventDate ? form.eventDate.toISOString() : null,
      eventAmountDisplay: form.eventAmount,
      eventAmountNumeric: numericAmount,
      _createdAt:         createdAt,
      _step:              "event-details",
    };

    // ── Persist event ────────────────────────────────────────────────────────
    sessionStorage.setItem("currentEvent", JSON.stringify(eventPayload));

    // ── Clear ALL stale payment data from any previous event ─────────────────
    // This guarantees PaymentPage always loads with 0 payments for a new event.
    clearAllEventPayments();

    // ── Clean up draft ───────────────────────────────────────────────────────
    sessionStorage.removeItem("eventDraft");

    navigate("/events/create/team-assignment");
  };

  const goBack = () => navigate("/events");

  const updateAlbumData = (service, data) => {
    setForm(f => ({ ...f, albumData: { ...f.albumData, [service]: data } }));
  };

  const renderError = (key) =>
    errors[key] ? <span className="cep-error">{errors[key]}</span> : null;

  return (
    <main className="cep-page" onClick={() => { setShowCal(false); setShowTime(false); }}>
      <section className="cep-stage">

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <header className="cep-topbar">
          <button className="cep-back" type="button" onClick={goBack}>
            <DoubleLeftOutlined /> Back
          </button>
          <div className="cep-title-wrap">
            <span className="cep-title-icon"><CalendarOutlined /></span>
            <div>
              <p className="cep-subtitle">Step 1 of 7 · Event Details</p>
              <h1 className="cep-heading">Create New Event</h1>
            </div>
          </div>
          <div className="cep-progress" aria-label="Event progress">
            {[1,2,3,4,5].map(step => (
              <span className={step === 1 ? "active" : ""} key={step}>
                {step === 1 ? <CheckCircleOutlined /> : step}
              </span>
            ))}
            <button type="button" aria-label="Refresh page" onClick={() => window.location.reload()}>
              <ReloadOutlined />
            </button>
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="cep-body">

          {/* Side rail */}
          <aside className="cep-rail" aria-label="Create event steps">
            {steps.map((step, index) => (
              <div className="cep-step-wrap" key={step.label}>
                <button
                  className={`cep-step ${index === activeStep ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  aria-label={step.label}
                >
                  {step.icon}
                  {index === activeStep && <span className="cep-step-indicator" />}
                </button>
                <span className="cep-tooltip">{step.label}</span>
              </div>
            ))}
          </aside>

          {/* Form */}
          <form className="cep-form" onSubmit={e => e.preventDefault()}>
            <div className="cep-grid">

              {/* ── Event Information ──────────────────────────────────── */}
              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2><ThunderboltOutlined /> Event Information</h2>
                  <small>Primary booking details</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Event Name <b>*</b></span>
                    <input
                      placeholder="e.g., Ram's Birthday"
                      value={form.eventName}
                      onChange={e => set("eventName", e.target.value)}
                      className={errors.eventName ? "inp-error" : ""}
                    />
                    {renderError("eventName")}
                  </label>

                  {/* Event Date */}
                  <label className="cep-field">
                    <span>Event Date <b>*</b></span>
                    <div
                      className="cep-input-icon"
                      ref={calRef}
                      style={{ position: "relative" }}
                      onClick={e => {
                        e.stopPropagation();
                        setShowCal(o => !o);
                        setShowTime(false);
                      }}
                    >
                      <input
                        placeholder="DD/MM/YYYY"
                        readOnly
                        value={formatDateDisplay(form.eventDate)}
                        className={errors.eventDate ? "inp-error" : ""}
                      />
                      <CalendarOutlined />
                      {showCal && (
                        <CalendarPicker
                          anchorRef={calRef}
                          value={form.eventDate}
                          onChange={d => set("eventDate", d)}
                          onClose={() => setShowCal(false)}
                        />
                      )}
                    </div>
                    {renderError("eventDate")}
                  </label>

                  {/* Start Time */}
                  <label className="cep-field">
                    <span>Start Time</span>
                    <div
                      className="cep-input-icon"
                      ref={timeRef}
                      style={{ position: "relative" }}
                      onClick={e => {
                        e.stopPropagation();
                        setShowTime(o => !o);
                        setShowCal(false);
                      }}
                    >
                      <input
                        placeholder="HH:MM AM/PM"
                        readOnly
                        value={formatTimeDisplay(form.startTime)}
                      />
                      <ClockCircleOutlined />
                      {showTime && (
                        <TimePicker
                          anchorRef={timeRef}
                          value={form.startTime}
                          onChange={t => set("startTime", t)}
                          onClose={() => setShowTime(false)}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </section>

              {/* ── Customer Information ───────────────────────────────── */}
              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2><UserOutlined /> Customer Information</h2>
                  <small>Client and payment snapshot</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Customer Name <b>*</b></span>
                    <input
                      placeholder="Enter customer name"
                      value={form.customerName}
                      onChange={e => set("customerName", e.target.value)}
                      className={errors.customerName ? "inp-error" : ""}
                    />
                    {renderError("customerName")}
                  </label>
                  <label className="cep-field">
                    <span>Phone <b>*</b></span>
                    <div className="cep-input-icon">
                      <input
                        placeholder="0000000000"
                        value={form.phone}
                        maxLength={10}
                        inputMode="numeric"
                        onChange={e => handlePhoneChange(e.target.value)}
                        className={errors.phone ? "inp-error" : ""}
                      />
                      <PhoneOutlined />
                    </div>
                    {renderError("phone")}
                    {form.phone.length > 0 && form.phone.length < 10 && (
                      <span className="cep-hint">{form.phone.length}/10 digits</span>
                    )}
                  </label>
                  <label className="cep-field">
                    <span>Email <b>*</b></span>
                    <div className="cep-input-icon">
                      <input
                        placeholder="customer@example.com"
                        value={form.email}
                        onChange={e => set("email", e.target.value)}
                        className={errors.email ? "inp-error" : ""}
                      />
                      <MailOutlined />
                    </div>
                    {renderError("email")}
                  </label>
                  <label className="cep-field wide">
                    <span>Event Amount</span>
                    <div className="cep-input-icon">
                      <input
                        placeholder="₹ 0"
                        value={form.eventAmount}
                        onChange={e => handleAmountChange(e.target.value)}
                      />
                      <DollarOutlined />
                    </div>
                    {form.eventAmount && (
                      <span className="cep-hint">
                        Numeric value: ₹{parseInt(stripAmount(form.eventAmount), 10).toLocaleString("en-IN")} — this will be the event total in the Payment step.
                      </span>
                    )}
                  </label>
                </div>
              </section>

              {/* ── Venue Details ──────────────────────────────────────── */}
              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2><EnvironmentOutlined /> Venue Details</h2>
                  <small>Where the event happens</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Address <b>*</b></span>
                    <textarea
                      placeholder="Enter complete venue address"
                      value={form.address}
                      onChange={e => set("address", e.target.value)}
                      className={errors.address ? "inp-error" : ""}
                    />
                    {renderError("address")}
                  </label>
                  <label className="cep-field">
                    <span>City <b>*</b></span>
                    <SearchableDropdown
                      options={INDIAN_CITIES}
                      value={form.city}
                      onChange={v => set("city", v)}
                      placeholder="Select city"
                    />
                    {renderError("city")}
                  </label>
                  <label className="cep-field">
                    <span>State</span>
                    <SearchableDropdown
                      options={INDIAN_STATES}
                      value={form.state}
                      onChange={v => set("state", v)}
                      placeholder="Select state"
                    />
                  </label>
                </div>
              </section>

              {/* ── Services ───────────────────────────────────────────── */}
              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2><CameraOutlined /> Select Services</h2>
                  <span className="cep-count">{form.selectedServices.length} selected</span>
                </div>
                <p className="cep-help">
                  Choose the production services required for this event.
                </p>
                {errors.services && (
                  <span className="cep-error" style={{ padding: "0 28px 8px", display: "block" }}>
                    {errors.services}
                  </span>
                )}
                <div className="cep-services">
                  {SERVICES.map(service => (
                    <label className="cep-service" key={service}>
                      <input
                        type="checkbox"
                        checked={form.selectedServices.includes(service)}
                        onChange={() => toggleService(service)}
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* ── Album & Deliverable Configuration ─────────────────── */}
              {form.selectedServices.length > 0 && (
                <section className="cep-panel" style={{ gridColumn: "1 / -1" }}>
                  <div className="cep-panel-head">
                    <h2><PictureOutlined /> Album & Deliverable Configuration</h2>
                    <small>Configure deliverables per service</small>
                  </div>
                  <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {form.selectedServices.map(service => (
                      <AlbumServiceCard
                        key={service}
                        service={service}
                        albumData={form.albumData[service] || {}}
                        onUpdate={data => updateAlbumData(service, data)}
                      />
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <footer className="cep-actions">
              <button className="cep-secondary" type="button" onClick={goBack}>
                <CloseOutlined /> Cancel
              </button>
              <button className="cep-primary" type="button" onClick={handleSubmit}>
                <PlusOutlined /> Create New Event
              </button>
            </footer>
          </form>
        </div>
      </section>
    </main>
  );
}