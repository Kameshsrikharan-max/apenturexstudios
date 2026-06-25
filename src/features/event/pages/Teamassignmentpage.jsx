import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleOutlined, ClockCircleOutlined, DollarOutlined, DoubleLeftOutlined,
  CameraOutlined, PictureOutlined, PlusOutlined, TeamOutlined, ReloadOutlined,
  SearchOutlined, EnvironmentOutlined, UserOutlined, CloseOutlined, DownOutlined,
  ArrowRightOutlined, ArrowLeftOutlined,
} from "@ant-design/icons";
import "./TeamAssignmentPage.css";

const STEPS = [
  { label: "Event Details",   icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment",         icon: <DollarOutlined /> },
  { label: "Attendance",      icon: <ClockCircleOutlined /> },
  { label: "Media",           icon: <CameraOutlined /> },
  { label: "Album",           icon: <PictureOutlined /> },
  { label: "Closure",         icon: <CheckCircleOutlined /> },
];

const ROLES = ["Photographer", "Videographer", "Drone Operator", "Assistant"];

const INTERNAL_MEMBERS = [
  { id: 1, name: "Chan Admin",   email: "dojiji1640@availors.com", mobile: "8383838383", city: "Gowriwakkam, Sembakkam" },
  { id: 2, name: "Studio Admin", email: "nacene4338@availors.com", mobile: "8383838383", city: "Gowriwakkam, Sembakkam" },
  { id: 3, name: "Ravi Kumar",   email: "ravi.kumar@availors.com", mobile: "9900112233", city: "Chennai, Adyar" },
  { id: 4, name: "Priya Sharma", email: "priya.s@availors.com",    mobile: "9812345678", city: "Bangalore, Koramangala" },
];

const FREELANCE_MEMBERS = [
  { id: 10, name: "Photographer Chandran", email: "netimili94@bmoar.com", mobile: "3838383678", city: "Gowriwakkam, Sembakkam", services: ["Photoshoot", "+8 more"], specialization: "Portrait" },
  { id: 11, name: "Arjun Freelance",       email: "arjun.free@mail.com",  mobile: "9988776655", city: "Chennai, T.Nagar",        services: ["Drone", "Candid"],         specialization: "Wedding" },
  { id: 12, name: "Lakshmi Captures",      email: "lakshmi@capture.io",   mobile: "8877665544", city: "Coimbatore, RS Puram",    services: ["Traditional"],             specialization: "Events" },
];



function Avatar({ name, size = 36 }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join("");
  const PALETTES = [
    { bg: "#EEEDFE", color: "#534AB7" },
    { bg: "#E1F5EE", color: "#0F6E56" },
    { bg: "#E6F1FB", color: "#185FA5" },
    { bg: "#FAEEDA", color: "#854F0B" },
    { bg: "#FAECE7", color: "#993C1D" },
    { bg: "#FBEAF0", color: "#993556" },
  ];
  const p = PALETTES[name.charCodeAt(0) % PALETTES.length];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: "50%",
      background: p.bg, color: p.color,
      fontSize: size * 0.38, fontWeight: 500, flexShrink: 0,
      border: `1.5px solid ${p.color}33`, lineHeight: 1,
    }}>
      {initials}
    </span>
  );
}



export default function TeamAssignmentPage({ user }) {
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("currentEvent");
      if (raw) setEvent(JSON.parse(raw));
    } catch {}
  }, []);

  const eventServices = event?.selectedServices || [];
  const serviceOptions = eventServices.length > 0
    ? eventServices
    : ["Traditional Photography","Candid Photography","Candid Videography","Drone"];

  const restoreTeam = () => {
    try {
      const raw = sessionStorage.getItem("currentEvent");
      if (!raw) return [];
      return JSON.parse(raw)._assignedTeam || [];
    } catch { return []; }
  };

  const [activeStep,    setActiveStep]    = useState(1);
  const [tab,           setTab]           = useState("internal");
  const [serviceFilter, setServiceFilter] = useState("");
  const [search,        setSearch]        = useState("");
  const [cityFilter,    setCityFilter]    = useState("");
  const [serviceTag,    setServiceTag]    = useState("");
  const [showAvailOnly, setShowAvailOnly] = useState(false);
  const [assignedTeam,  setAssignedTeam]  = useState(restoreTeam);
  const [serviceOpen,   setServiceOpen]   = useState(false);
  const [roleMap,       setRoleMap]       = useState({});

  const assignMember = (member) => {
    if (assignedTeam.find(m => m.id === member.id)) return;
    const role = roleMap[member.id] || "Photographer";
    setAssignedTeam(prev => [
      ...prev,
      { ...member, role, service: serviceFilter || "General", status: "Confirmed" },
    ]);
  };

  const removeMember  = (id) => setAssignedTeam(prev => prev.filter(m => m.id !== id));
  const updateRole    = (id, role)    => setAssignedTeam(prev => prev.map(m => m.id === id ? { ...m, role }    : m));
  const updateService = (id, service) => setAssignedTeam(prev => prev.map(m => m.id === id ? { ...m, service } : m));

  const handleSaveAndContinue = () => {
    try {
      const raw  = sessionStorage.getItem("currentEvent");
      const curr = raw ? JSON.parse(raw) : {};
      sessionStorage.setItem("currentEvent", JSON.stringify({
        ...curr, _assignedTeam: assignedTeam, _step: "team-assignment",
      }));
    } catch {}
    navigate("/events/create/payment");
  };

  const filteredInternal = INTERNAL_MEMBERS.filter(m => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.mobile.includes(q) || m.email.toLowerCase().includes(q);
  });

  const filteredFreelance = FREELANCE_MEMBERS.filter(m => {
    const q = search.toLowerCase();
    return (
      (m.name.toLowerCase().includes(q) || m.mobile.includes(q)) &&
      (cityFilter ? m.city.toLowerCase().includes(cityFilter.toLowerCase()) : true) &&
      (serviceTag ? m.services?.some(s => s.toLowerCase().includes(serviceTag.toLowerCase())) : true)
    );
  });

  const isAssigned = (id) => !!assignedTeam.find(a => a.id === id);
  const listData   = tab === "internal" ? filteredInternal : filteredFreelance;

  return (
    <main className="tap-page">
      <section className="tap-stage">

      
        <header className="tap-topbar">
          <button className="tap-back" type="button" onClick={() => navigate("/events/create")}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="tap-title-wrap">
            <span className="tap-title-icon"><TeamOutlined /></span>
            <div>
              <p className="tap-subtitle">Step 2 of 7 / Team Assignment</p>
              <div className="tap-heading-row">
                <h1 className="tap-heading">Assign Your Team</h1>
                {event && (
                  <>
                    <span className="tap-heading-sep">-</span>
                    <span className="tap-heading-event">{event.eventName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="tap-topbar-progress">
            {[1,2,3,4,5].map(s => (
              <span className={s <= 2 ? "done" : ""} key={s}>
                {s <= 2 ? <CheckCircleOutlined /> : s}
              </span>
            ))}
            <button type="button" aria-label="Refresh"><ReloadOutlined /></button>
          </div>
        </header>

        
        <div className="tap-body">
          <aside className="tap-rail">
            {STEPS.map((step, i) => (
              <div className="tap-step-wrap" key={step.label}>
                <button
                  className={`tap-step ${i === activeStep ? "active" : ""} ${i < activeStep ? "done" : ""}`}
                  type="button" onClick={() => setActiveStep(i)} aria-label={step.label}
                >
                  {i < activeStep ? <CheckCircleOutlined /> : step.icon}
                  {i === activeStep && <span className="tap-step-dot" />}
                </button>
                <span className="tap-tooltip">{step.label}</span>
              </div>
            ))}
          </aside>

          <div className="tap-content">
            <div className="tap-progress-bar">
              <div className="tap-progress-fill" style={{ width: "28%" }} />
              <span className="tap-progress-pct">28%</span>
            </div>

      
            <div className="tap-hero-card">
              <div className="tap-hero-left">
                <TeamOutlined className="tap-hero-icon" />
                <div>
                  <h2>Team Assignment</h2>
                  <p>Assign internal team members and freelance photographers to deliver this event.</p>
                </div>
              </div>
              <button className="tap-refresh-btn" type="button">
                <ReloadOutlined /> Refresh
              </button>
            </div>

          
            <section className="tap-panel">
              <div className="tap-panel-head">
                <h3>
                  <UserOutlined /> Assigned Team
                  <span className="tap-count-badge">{assignedTeam.length}</span>
                </h3>
              </div>
              <div className="tap-table-wrap">
                <table className="tap-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Service</th>
                      <th>Mobile</th>
                      <th>City</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTeam.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="tap-empty">
                          No team members assigned yet. Use the section below to build your team.
                        </td>
                      </tr>
                    ) : (
                      assignedTeam.map(m => (
                        <tr key={m.id}>
                          <td>
                            <div className="tap-member-cell">
                              <Avatar name={m.name} />
                              <div>
                                <div className="tap-member-name">{m.name}</div>
                                <div className="tap-member-email">{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <select className="tap-role-select" value={m.role}
                              onChange={e => updateRole(m.id, e.target.value)}>
                              {ROLES.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="tap-role-select" value={m.service}
                              onChange={e => updateService(m.id, e.target.value)}>
                              <option value="General">General</option>
                              {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td>{m.mobile}</td>
                          <td>{m.city}</td>
                          <td><span className="tap-badge tap-badge-confirmed">{m.status}</span></td>
                          <td>
                            <button className="tap-remove-btn" onClick={() => removeMember(m.id)} title="Remove">
                              <CloseOutlined />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          
            <section className="tap-panel">
              <div className="tap-panel-head">
                <h3><TeamOutlined /> Assign Team</h3>
              </div>

              <div className="tap-tabs">
                <button className={`tap-tab ${tab === "internal" ? "active" : ""}`}
                  onClick={() => { setTab("internal"); setSearch(""); }}>
                  Internal Team
                </button>
                <button className={`tap-tab ${tab === "freelance" ? "active" : ""}`}
                  onClick={() => { setTab("freelance"); setSearch(""); }}>
                  Freelance Photographers
                </button>
              </div>

              <div className="tap-tab-body">
                <div className="tap-filter-row">
                  <label className="tap-filter-label">Select Service</label>
                  <div className="tap-select-wrap" onClick={() => setServiceOpen(o => !o)}>
                    <span className={serviceFilter ? "tap-select-val" : "tap-select-placeholder"}>
                      {serviceFilter || "Choose a service to assign team members"}
                    </span>
                    <DownOutlined className={`tap-select-arrow ${serviceOpen ? "open" : ""}`} />
                    {serviceOpen && (
                      <ul className="tap-dropdown">
                        <li onClick={() => { setServiceFilter(""); setServiceOpen(false); }}>None</li>
                        {serviceOptions.map(s => (
                          <li key={s} className={serviceFilter === s ? "selected" : ""}
                            onClick={() => { setServiceFilter(s); setServiceOpen(false); }}>
                            {s} {serviceFilter === s && <CheckCircleOutlined />}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {serviceFilter && (
                    <span className="tap-filter-chip">
                      {serviceFilter}
                      <button onClick={() => setServiceFilter("")}><CloseOutlined /></button>
                    </span>
                  )}
                </div>

                {tab === "internal" ? (
                  <div className="tap-search-row">
                    <label className="tap-filter-label">Search</label>
                    <div className="tap-search-box">
                      <SearchOutlined />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by Name, Email, or Mobile Number" />
                      {search && <button className="tap-clear-search" onClick={() => setSearch("")}><CloseOutlined /></button>}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="tap-filters-grid">
                      <div>
                        <label className="tap-filter-label">Search</label>
                        <div className="tap-search-box">
                          <SearchOutlined />
                          <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by Name, Email, or Mobile..." />
                          {search && <button className="tap-clear-search" onClick={() => setSearch("")}><CloseOutlined /></button>}
                        </div>
                      </div>
                      <div>
                        <label className="tap-filter-label">Filter by City</label>
                        <div className="tap-search-box">
                          <EnvironmentOutlined />
                          <input value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                            placeholder="Enter city name" />
                          {cityFilter && <button className="tap-clear-search" onClick={() => setCityFilter("")}><CloseOutlined /></button>}
                        </div>
                      </div>
                      <div>
                        <label className="tap-filter-label">Filter by Service</label>
                        <div className="tap-tag-select">
                          {serviceTag
                            ? <span className="tap-tag">{serviceTag}<button onClick={() => setServiceTag("")}><CloseOutlined /></button></span>
                            : <span className="tap-select-placeholder" style={{ fontSize: 13, color: "#aaa" }}>All services</span>
                          }
                          <DownOutlined className="tap-select-arrow-inline" />
                        </div>
                      </div>
                    </div>
                    <div className="tap-avail-row">
                      <label className="tap-filter-label">Specialization</label>
                      <div className="tap-avail-wrap">
                        <div className="tap-select-wrap tap-spec-select">
                          <span className="tap-select-placeholder">Choose a specialization</span>
                          <DownOutlined className="tap-select-arrow" />
                        </div>
                        <label className="tap-checkbox-label">
                          <input type="checkbox" checked={showAvailOnly}
                            onChange={e => setShowAvailOnly(e.target.checked)} />
                          Show Available Photographers Only
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="tap-table-wrap tap-mt">
                  <table className="tap-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>City</th>
                        {tab === "freelance" && <><th>Services</th><th>Specialization</th></>}
                        {tab === "internal"  && <th>Availability</th>}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listData.length === 0 ? (
                        <tr>
                          <td colSpan={tab === "internal" ? 5 : 6} className="tap-empty">
                            No results found. Try adjusting your search or filters.
                          </td>
                        </tr>
                      ) : (
                        listData.map(m => (
                          <tr key={m.id} className={isAssigned(m.id) ? "tap-row-assigned" : ""}>
                            <td>
                              <div className="tap-member-cell">
                                <Avatar name={m.name} />
                                <div>
                                  <div className="tap-member-name">{m.name}</div>
                                  <div className="tap-member-email">{m.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>{m.mobile}</td>
                            <td>{m.city}</td>
                            {tab === "freelance" && (
                              <>
                                <td>
                                  <div className="tap-service-tags">
                                    {m.services?.map(s => <span key={s} className="tap-badge tap-badge-service">{s}</span>)}
                                  </div>
                                </td>
                                <td><span className="tap-spec-pill">{m.specialization}</span></td>
                              </>
                            )}
                            {tab === "internal" && (
                              <td><span className="tap-avail-dot avail" /> Available</td>
                            )}
                            <td>
                              <button
                                className={`tap-assign-btn ${isAssigned(m.id) ? "assigned" : ""}`}
                                onClick={() => assignMember(m)}
                                disabled={isAssigned(m.id)}
                              >
                                {isAssigned(m.id)
                                  ? <><CheckCircleOutlined /> Assigned</>
                                  : <><UserOutlined /> Assign</>
                                }
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="tap-result-meta">
                  Showing {listData.length} {tab === "internal" ? "internal member" : "freelancer"}{listData.length !== 1 ? "s" : ""}
                </div>
              </div>
            </section>

            <footer className="tap-actions">
              <button className="tap-secondary" type="button" onClick={() => navigate("/events/create")}>
                <ArrowLeftOutlined /> Previous
              </button>
              <button className="tap-primary" type="button" onClick={handleSaveAndContinue}>
                Save &amp; Continue <ArrowRightOutlined />
              </button>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}