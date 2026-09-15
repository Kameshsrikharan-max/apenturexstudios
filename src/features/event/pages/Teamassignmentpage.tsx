import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  CheckCircleOutlined, ClockCircleOutlined, DollarOutlined, DoubleLeftOutlined,
  CameraOutlined, PictureOutlined, PlusOutlined, TeamOutlined, ReloadOutlined,
  SearchOutlined, EnvironmentOutlined, UserOutlined, CloseOutlined, DownOutlined,
  ArrowRightOutlined, ArrowLeftOutlined, LoadingOutlined, WarningOutlined,
} from "@ant-design/icons";
import "./TeamAssignmentPage.css";

/* Pushes an "Event Assignment" notification straight to the real backend
   (POST /studio/notifications) so it lands in the existing notificationStore
   / Navbar bell / NotificationDetailsPage system — not a separate one.
   notificationStore.ts explicitly expects assignment notifications to
   arrive this way rather than through its local-only pushNotification(). */
async function pushEventAssignmentNotification(payload: {
  recipientEmail: string;
  eventId?: string;
  eventName?: string;
  eventDateKey: string;
  eventTime?: string;
  assignRole: string;
  service?: string;
  venue?: string;
}): Promise<boolean> {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/studio/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        recipientEmail: payload.recipientEmail,
        notifCategory: "eventAssignment",
        category: "Event Assignment",
        title: payload.eventName
          ? `You've been assigned to "${payload.eventName}"`
          : "You've been assigned to a new event",
        date: payload.eventDateKey,
        time: payload.eventTime || "",
        priority: "high",
        description: `You've been assigned as ${payload.assignRole}${
          payload.service ? ` for ${payload.service}` : ""
        } on ${dayjs(payload.eventDateKey).format("DD MMM YYYY")}.`,
        tags: [payload.assignRole, payload.service].filter(Boolean),
        isActionable: false,
        eventId: payload.eventId,
        // Matches the payload shape NotificationDetailsPage/categoryConfig
        // already reads for other categories (see normalizeEvent in
        // notificationDetailApi.ts: eventName/role/venue/assignedBy).
        payload: {
          eventName: payload.eventName,
          role: payload.assignRole,
          venue: payload.venue,
          assignedBy: "Studio Admin",
        },
      }),
    });
    const body = await response.json().catch(() => null);
    return response.ok && !!body?.success;
  } catch {
    return false;
  }
}

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

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

/* ---- Only these two account roles count as "photographers" who can log in
   and be assigned. Studio Admin / Studio Manager never show up here. ---- */
const PHOTOGRAPHER_ROLES = ["Studio Photographer", "Freelance Photographer"] as const;

type ReasonCategory = "travel" | "personal" | "booked" | "rest" | "other";

/* Mirrors AvailabilityPage's AvailabilityEntry/AvailabilityMap shape and
   localStorage key convention (axs_availability_<email>) so we read exactly
   what each photographer set on their own Availability page. */
type AvailabilityEntry = {
  status: "available" | "unavailable";
  note: string;
  category?: ReasonCategory;
};
type AvailabilityMap = Record<string, AvailabilityEntry>;

const CATEGORY_LABELS: Record<ReasonCategory, string> = {
  travel: "Travel",
  personal: "Personal",
  booked: "Booked Elsewhere",
  rest: "Rest Day",
  other: "Other",
};

type Member = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  role: string; // account role: Studio Photographer / Freelance Photographer
  photoAccountStatus: string; // Active/Inactive/Pending from Users API
};

type AssignedMember = Member & {
  assignRole: string;
  service: string;
  status: string;
};

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
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

/* ---------- Availability helpers (read-only mirror of AvailabilityPage) ---------- */

const getAvailabilityKey = (email: string) => `axs_availability_${email}`;

const readAvailabilityFor = (email: string): AvailabilityMap => {
  try {
    const raw = localStorage.getItem(getAvailabilityKey(email));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const getEntryForDate = (email: string, dateKey: string): AvailabilityEntry | undefined => {
  const map = readAvailabilityFor(email);
  return map[dateKey];
};

const formatReason = (entry: AvailabilityEntry | undefined): string => {
  if (!entry) return "";
  const label = CATEGORY_LABELS[entry.category || "other"];
  return entry.note ? `${label} — ${entry.note}` : label;
};

/* Notification delivery to the assigned photographer now goes through the
   backend (POST /studio/notifications) via pushAssignmentNotification, so it
   reaches them on any device the next time NotificationBell polls/fetches —
   see components/UI/useAssignmentNotifications.ts. */

type TeamAssignmentPageProps = {
  user?: any;
  event?: any;
  onPrevious?: () => void;
  onNext?: (assignedList: AssignedMember[]) => void;
};

export default function TeamAssignmentPage({ user, event: eventProp, onPrevious, onNext }: TeamAssignmentPageProps) {
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(eventProp ?? null);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (eventProp) {
      setEvent(eventProp);
      return;
    }
    try {
      const raw = sessionStorage.getItem("currentEvent");
      if (raw) setEvent(JSON.parse(raw));
    } catch {}
  }, [eventProp]);

  const eventServices = event?.selectedServices || [];
  const serviceOptions = eventServices.length > 0
    ? eventServices
    : ["Traditional Photography","Candid Photography","Candid Videography","Drone"];

  // Resolve the event's shoot date so we know WHICH day to check availability
  // against. Falls back to today if the event object doesn't carry a date yet.
  const eventDateKey = useMemo(() => {
    const raw = event?.eventDate || event?.date || event?.selectedDate || event?.shootDate;
    const parsed = raw ? dayjs(raw) : dayjs();
    return (parsed.isValid() ? parsed : dayjs()).format("YYYY-MM-DD");
  }, [event]);

  const restoreTeam = (): AssignedMember[] => {
    try {
      const raw = sessionStorage.getItem("currentEvent");
      if (!raw) return [];
      return JSON.parse(raw)._assignedTeam || [];
    } catch { return []; }
  };

  const [activeStep,    setActiveStep]    = useState(1);
  const [tab,           setTab]           = useState<"internal" | "freelance">("internal");
  const [serviceFilter, setServiceFilter] = useState("");
  const [search,        setSearch]        = useState("");
  const [cityFilter,    setCityFilter]    = useState("");
  const [showAvailOnly, setShowAvailOnly] = useState(false);
  const [assignedTeam,  setAssignedTeam]  = useState<AssignedMember[]>(restoreTeam);
  const [serviceOpen,   setServiceOpen]   = useState(false);
  const [roleMap,       setRoleMap]       = useState<Record<string, string>>({});

  // --- Live photographers, sourced from the same endpoint UsersPage uses ---
  const [photographers, setPhotographers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  const fetchPhotographers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/studio/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.message || "Failed to load photographers.");
      }
      const users: any[] = body.users || [];
      const onlyPhotographers: Member[] = users
        .filter(u => PHOTOGRAPHER_ROLES.includes(u.role) && u.status === "Active")
        .map(u => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          mobile: u.phone,
          city: u.location || "—",
          role: u.role,
          photoAccountStatus: u.status,
        }));
      setPhotographers(onlyPhotographers);
    } catch (err: any) {
      setLoadError(err.message || "Failed to load photographers.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotographers();
  }, [fetchPhotographers]);

  const isAvailableOn = (email: string) => {
    const entry = getEntryForDate(email, eventDateKey);
    return !entry || entry.status !== "unavailable";
  };

  const assignMember = (member: Member) => {
    if (assignedTeam.find(m => m.id === member.id)) return;

    const entry = getEntryForDate(member.email, eventDateKey);
    if (entry && entry.status === "unavailable") {
      showToast(
        `${member.name} is unavailable on ${dayjs(eventDateKey).format("DD MMM YYYY")} — ${formatReason(entry)}`,
        "error"
      );
      return;
    }

    const assignRole = roleMap[member.id] || "Photographer";
    setAssignedTeam(prev => [
      ...prev,
      { ...member, assignRole, service: serviceFilter || "General", status: "Confirmed" },
    ]);

    pushEventAssignmentNotification({
      recipientEmail: member.email,
      eventId: event?.id,
      eventName: event?.eventName || event?.name,
      eventDateKey,
      eventTime: event?.eventTime || event?.time,
      assignRole,
      service: serviceFilter || undefined,
      venue: event?.address && event?.city
        ? `${event.address}, ${event.city}`
        : (event?.city || event?.address || undefined),
    }).then(delivered => {
      if (!delivered) {
        showToast(`${member.name} assigned, but the notification couldn't be delivered — check your connection.`, "error");
      }
    });

    showToast(`${member.name} assigned and notified.`, "success");
  };

  const removeMember  = (id: string) => setAssignedTeam(prev => prev.filter(m => m.id !== id));
  const updateRole    = (id: string, assignRole: string) => setAssignedTeam(prev => prev.map(m => m.id === id ? { ...m, assignRole } : m));
  const updateService = (id: string, service: string)    => setAssignedTeam(prev => prev.map(m => m.id === id ? { ...m, service }    : m));

  const handleSaveAndContinue = () => {
    try {
      const raw  = sessionStorage.getItem("currentEvent");
      const curr = raw ? JSON.parse(raw) : {};
      sessionStorage.setItem("currentEvent", JSON.stringify({
        ...curr, _assignedTeam: assignedTeam, _step: "team-assignment",
      }));
    } catch {}
    if (onNext) {
      onNext(assignedTeam);
      return;
    }
    navigate("/events/create/payment");
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
      return;
    }
    navigate("/events/create");
  };

  const roleFiltered = useMemo(
    () => photographers.filter(m => m.role === (tab === "internal" ? "Studio Photographer" : "Freelance Photographer")),
    [photographers, tab]
  );

  const filteredList: Member[] = useMemo(() => {
    const q = search.toLowerCase();
    return roleFiltered.filter(m => {
      const matchesSearch =
        !q || m.name.toLowerCase().includes(q) || m.mobile.includes(q) || m.email.toLowerCase().includes(q);
      const matchesCity = !cityFilter || m.city.toLowerCase().includes(cityFilter.toLowerCase());
      const matchesAvail = !showAvailOnly || isAvailableOn(m.email);
      return matchesSearch && matchesCity && matchesAvail;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFiltered, search, cityFilter, showAvailOnly, eventDateKey]);

  const isAssigned = (id: string) => !!assignedTeam.find(a => a.id === id);

  return (
    <main className="tap-page">
      <section className="tap-stage">

        <header className="tap-topbar">
          <button className="tap-back" type="button" onClick={handlePrevious}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="tap-title-wrap">
            <span className="tap-title-icon"><TeamOutlined /></span>
            <div>
              <p className="tap-subtitle">Step 2 of 7 / Team Assignment</p>
              <div className="tap-heading-row">
                <h1 className="tap-heading">Assign Your Team</h1>
                {event ? (
                  <>
                    <span className="tap-heading-sep">-</span>
                    <span className="tap-heading-event">{event.eventName || event.name}</span>
                  </>
                ) : null}
              </div>
            </div>
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
                  {i === activeStep ? <span className="tap-step-dot" /> : null}
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
                  <p>
                    Assign only active, logged-in photographers to this event.{" "}
                    Checking availability for <strong>{dayjs(eventDateKey).format("DD MMM YYYY")}</strong>.
                  </p>
                </div>
              </div>
              <button className="tap-refresh-btn" type="button" onClick={fetchPhotographers}>
                <ReloadOutlined spin={isLoading} /> Refresh
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
                            <select className="tap-role-select" value={m.assignRole}
                              onChange={e => updateRole(m.id, e.target.value)}>
                              {ROLES.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="tap-role-select" value={m.service}
                              onChange={e => updateService(m.id, e.target.value)}>
                              <option value="General">General</option>
                              {serviceOptions.map((s: string) => <option key={s} value={s}>{s}</option>)}
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
                  Studio Photographers
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
                    {serviceOpen ? (
                      <ul className="tap-dropdown">
                        <li onClick={() => { setServiceFilter(""); setServiceOpen(false); }}>None</li>
                        {serviceOptions.map((s: string) => (
                          <li key={s} className={serviceFilter === s ? "selected" : ""}
                            onClick={() => { setServiceFilter(s); setServiceOpen(false); }}>
                            {s} {serviceFilter === s ? <CheckCircleOutlined /> : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {serviceFilter ? (
                    <span className="tap-filter-chip">
                      {serviceFilter}
                      <button onClick={() => setServiceFilter("")}><CloseOutlined /></button>
                    </span>
                  ) : null}
                </div>

                <div className="tap-filters-grid">
                  <div>
                    <label className="tap-filter-label">Search</label>
                    <div className="tap-search-box">
                      <SearchOutlined />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by Name, Email, or Mobile" />
                      {search ? <button className="tap-clear-search" onClick={() => setSearch("")}><CloseOutlined /></button> : null}
                    </div>
                  </div>
                  <div>
                    <label className="tap-filter-label">Filter by City</label>
                    <div className="tap-search-box">
                      <EnvironmentOutlined />
                      <input value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                        placeholder="Enter city name" />
                      {cityFilter ? <button className="tap-clear-search" onClick={() => setCityFilter("")}><CloseOutlined /></button> : null}
                    </div>
                  </div>
                  <div>
                    <label className="tap-filter-label">Availability</label>
                    <label className="tap-checkbox-label" style={{ display: "flex", alignItems: "center", gap: 6, height: 38 }}>
                      <input type="checkbox" checked={showAvailOnly}
                        onChange={e => setShowAvailOnly(e.target.checked)} />
                      Show available on {dayjs(eventDateKey).format("DD MMM")} only
                    </label>
                  </div>
                </div>

                {loadError ? (
                  <div className="tap-empty" style={{ display: "flex", alignItems: "center", gap: 8, color: "#f87171" }}>
                    <WarningOutlined /> {loadError}
                    <button className="tap-refresh-btn" type="button" onClick={fetchPhotographers} style={{ marginLeft: 8 }}>
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="tap-table-wrap tap-mt">
                    <table className="tap-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Mobile</th>
                          <th>City</th>
                          <th>Availability ({dayjs(eventDateKey).format("DD MMM")})</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <tr>
                            <td colSpan={5} className="tap-empty">
                              <LoadingOutlined spin /> Loading photographers…
                            </td>
                          </tr>
                        ) : filteredList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="tap-empty">
                              No active {tab === "internal" ? "studio" : "freelance"} photographers found. Try adjusting your search or filters.
                            </td>
                          </tr>
                        ) : (
                          filteredList.map(m => {
                            const entry = getEntryForDate(m.email, eventDateKey);
                            const available = !entry || entry.status !== "unavailable";
                            const reasonText = !available ? formatReason(entry) : "";
                            const assigned = isAssigned(m.id);

                            return (
                              <tr key={m.id} className={assigned ? "tap-row-assigned" : ""}>
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
                                <td>
                                  {available ? (
                                    <span className="tap-badge tap-badge-confirmed">
                                      <CheckCircleOutlined /> Available
                                    </span>
                                  ) : (
                                    <div>
                                      <span
                                        className="tap-badge"
                                        style={{ background: "#3f1d1d", color: "#f87171", border: "1px solid #f8717133" }}
                                      >
                                        <CloseOutlined /> Unavailable
                                      </span>
                                      <div style={{ fontSize: 11, color: "#f87171", marginTop: 4, maxWidth: 200 }}>
                                        {reasonText}
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className={`tap-assign-btn ${assigned ? "assigned" : ""}`}
                                    onClick={() => assignMember(m)}
                                    disabled={assigned || !available}
                                    style={!available && !assigned ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                                    title={!available ? reasonText : undefined}
                                  >
                                    {assigned
                                      ? <><CheckCircleOutlined /> Assigned</>
                                      : !available
                                        ? <><CloseOutlined /> Unavailable</>
                                        : <><UserOutlined /> Assign</>
                                    }
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="tap-result-meta">
                  Showing {filteredList.length} {tab === "internal" ? "studio photographer" : "freelancer"}{filteredList.length !== 1 ? "s" : ""}
                </div>
              </div>
            </section>

            <footer className="tap-actions">
              <button className="tap-secondary" type="button" onClick={handlePrevious}>
                <ArrowLeftOutlined /> Previous
              </button>
              <button className="tap-primary" type="button" onClick={handleSaveAndContinue}>
                Save &amp; Continue <ArrowRightOutlined />
              </button>
            </footer>
          </div>
        </div>
      </section>

      {toast ? (
        <div
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: toast.type === "error" ? "#3f1d1d" : "#0f2e22",
            color: toast.type === "error" ? "#f87171" : "#4ade80",
            border: `1px solid ${toast.type === "error" ? "#f8717155" : "#4ade8055"}`,
            padding: "10px 18px", borderRadius: 10, fontSize: 13, zIndex: 5000,
            maxWidth: "min(520px, 90vw)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}