import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {MenuOutlined,CalendarOutlined,BellOutlined,SunOutlined,MoonOutlined,LeftOutlined,RightOutlined,DownOutlined,LogoutOutlined,SettingOutlined,ProfileOutlined,CloseOutlined,CompassOutlined,SearchOutlined,DashboardOutlined,FileSearchOutlined,TeamOutlined,MailOutlined,ShopOutlined,PictureOutlined,EnterOutlined,WalletOutlined,ClockCircleOutlined,AudioOutlined,AudioMutedOutlined,ExclamationCircleOutlined,UserAddOutlined,FileImageOutlined,ScheduleOutlined,} from "@ant-design/icons";
import dayjs from "dayjs";
import {getStoredNotifications,NOTIFICATIONS_UPDATED_EVENT,} from "../../utils/notificationStore";
import { fetchPendingDeleteRequestsApi } from "../../redux/api/deleteRequestApi";
import { fetchPendingRegistrationsApi } from "../../redux/api/registrationApprovalApi";
import { canAccessSection, SectionKey } from "../../config/rolePermissions"; // adjust path to match where you saved rolePermissions.ts
import "./Navbar.css";

type NavbarUser = {
  email?: string;
  identifier?: string;
  role?: string;
};

type NavbarProps = {
  user?: NavbarUser;
  darkMode: boolean;
  onToggleTheme: () => void;
  onSidebarOpen: () => void;
  onCalendarOpen?: () => void;
  onLogout?: () => void;
};

const DEFAULT_ROLE = "Studio Admin";
const DEFAULT_EMAIL = "admin@apenturexstudios.com";


const PENDING_DELETE_POLL_INTERVAL = 30000;

const BASE_PAGES: Array<{
  label: string;
  path: string;
  icon: JSX.Element;
  group: string;
  section?: SectionKey;
}> = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardOutlined />, group: "Workspace", section: "dashboard" },
  { label: "Review", path: "/review", icon: <FileSearchOutlined />, group: "Workspace", section: "review" },
  { label: "Users", path: "/users", icon: <TeamOutlined />, group: "Workspace", section: "users" },
  { label: "Events", path: "/events", icon: <CalendarOutlined />, group: "Workspace", section: "events" },
  { label: "Transactions", path: "/transactions", icon: <WalletOutlined />, group: "Workspace", section: "transactions" },
  { label: "Enquiry", path: "/enquiry", icon: <MailOutlined />, group: "Workspace", section: "enquiry" },
  { label: "Today's Agenda", path: "/agenda", icon: <ClockCircleOutlined />, group: "Workspace" },
  { label: "Availability", path: "/availability", icon: <ScheduleOutlined />, group: "Workspace", section: "availability" },
  { label: "Studio", path: "/studio/view", icon: <ShopOutlined />, group: "Studio", section: "studio" },
  { label: "Templates", path: "/templates", icon: <FileImageOutlined />, group: "Studio", section: "templates" },
  { label: "Media Library", path: "/media", icon: <PictureOutlined />, group: "Studio" },
];

const getSavedEvents = () => {
  try {
    const saved = localStorage.getItem("calendarEvents");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const normalizeEvent = (event: any, date: string, index: number) => {
  if (typeof event === "string") {
    return {
      id: `${date}-${index}`,
      date,
      title: event,
      time: "",
      description: "",
    };
  }

  return {
    id: event?.id || `${date}-${index}`,
    date,
    title: event?.title || event?.name || event?.event || "Untitled Event",
    time: event?.time || event?.startTime || "",
    description: event?.description || event?.note || "",
  };
};

const findBestPageMatch = (spoken: string, pages: typeof BASE_PAGES) => {
  const query = spoken.trim().toLowerCase();
  if (!query) return null;

  const exact = pages.find((page) => page.label.toLowerCase() === query);
  if (exact) return exact;

  const contains = pages.find(
    (page) =>
      query.includes(page.label.toLowerCase()) || page.label.toLowerCase().includes(query)
  );
  if (contains) return contains;

  const wordOverlap = pages.find((page) =>
    page.label
      .toLowerCase()
      .split(/\s+/)
      .some((word) => query.includes(word))
  );

  return wordOverlap || null;
};

function Navbar({
  user,
  darkMode,
  onToggleTheme,
  onSidebarOpen,
  onCalendarOpen,
  onLogout,
}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const displayEmail =
    user?.email || (user?.identifier?.includes("@") ? user.identifier : DEFAULT_EMAIL);
  const displayName = displayEmail.split("@")[0];
  const displayRole = user?.role || DEFAULT_ROLE;

  const PAGES = useMemo(() => {
    const visible = BASE_PAGES.filter(
      (page) => !page.section || canAccessSection(user?.role, page.section)
    );

    if (user?.role === "super_admin") {
      return [
        ...visible,
        {
          label: "Delete Requests",
          path: "/admin/delete-requests",
          icon: <ExclamationCircleOutlined />,
          group: "Workspace",
        },
        {
          label: "Registration Requests",
          path: "/admin/registrations",
          icon: <UserAddOutlined />,
          group: "Workspace",
        },
      ];
    }
    return visible;
  }, [user?.role]);

  const [miniCalendarOpen, setMiniCalendarOpen] = useState(false);
  const [miniMonth, setMiniMonth] = useState(dayjs());
  const [events, setEvents] = useState(getSavedEvents);
  const [genericNotifications, setGenericNotifications] = useState(getStoredNotifications);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [upcomingEventsOpen, setUpcomingEventsOpen] = useState(false);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const paletteInputRef = useRef(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const pendingApprovalsRef = useRef<HTMLDivElement | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const recognitionRef = useRef<any>(null);

  const [pendingDeleteUsers, setPendingDeleteUsers] = useState<any[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [pendingApprovalsOpen, setPendingApprovalsOpen] = useState(false);

  const pendingApprovalsTotal = pendingDeleteUsers.length + pendingRegistrations.length;

  const today = dayjs().format("YYYY-MM-DD");
  const monthKey = miniMonth.format("YYYY-MM");

  const dates = useMemo(() => {
    const list = [];
    const startDay = miniMonth.startOf("month").day();
    const daysInMonth = miniMonth.daysInMonth();

    for (let i = 0; i < startDay; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) list.push(day);

    return list;
  }, [miniMonth]);

  const upcomingEvents = useMemo(() => {
    const fromCalendar = Object.entries(events)
      .filter(([date]) => {
        const eventDate = dayjs(date);
        return eventDate.isSame(dayjs(), "day") || eventDate.isAfter(dayjs(), "day");
      })
      .sort(([firstDate], [secondDate]) => dayjs(firstDate).valueOf() - dayjs(secondDate).valueOf())
      .flatMap(([date, dayEvents]) => {
        if (!Array.isArray(dayEvents)) return [];
        return dayEvents.map((event, index) => normalizeEvent(event, date, index));
      });

    const fromGeneric = genericNotifications
      .filter((item) => {
        const itemDate = dayjs(item.date);
        return itemDate.isSame(dayjs(), "day") || itemDate.isAfter(dayjs(), "day");
      })
      .map((item) => ({
        id: item.id,
        date: item.date,
        title: item.title,
        time: item.time,
        description: item.description,
      }));

    return [...fromGeneric, ...fromCalendar];
  }, [events, genericNotifications]);

  const filteredPages = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return PAGES;
    return PAGES.filter((page) => page.label.toLowerCase().includes(query));
  }, [paletteQuery, PAGES]);

  const refreshEvents = () => {
    setEvents(getSavedEvents());
    setGenericNotifications(getStoredNotifications());
  };

  const startTour = () => {
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
    setProfileModalOpen(false);
    setUpcomingEventsOpen(false);
    setPendingApprovalsOpen(false);
    window.dispatchEvent(new Event("startStudioTour"));
  };

  const toggleMiniCalendar = () => {
    refreshEvents();
    setMiniCalendarOpen((current) => !current);
    setUserMenuOpen(false);
    setPendingApprovalsOpen(false);
  };

  const togglePendingApprovals = () => {
    setPendingApprovalsOpen((current) => !current);
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
  };

  const openUpcomingEvents = () => {
    refreshEvents();
    setUpcomingEventsOpen(true);
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
    setPendingApprovalsOpen(false);
  };

  const openFullCalendar = () => {
    setMiniCalendarOpen(false);
    navigate("/calendar");
  };

  const openAgenda = () => {
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
    setPendingApprovalsOpen(false);
    navigate("/agenda");
  };

  const getFullDate = (date) => {
    return `${monthKey}-${String(date).padStart(2, "0")}`;
  };

  const openProfileModal = () => {
    setUserMenuOpen(false);
    navigate("/profile");
  };

  const openNotificationSettings = () => {
    setUserMenuOpen(false);
    navigate("/notification-settings");
  };

  const openPendingDeleteRequests = () => {
    setUserMenuOpen(false);
    setMiniCalendarOpen(false);
    setPendingApprovalsOpen(false);
    navigate("/admin/delete-requests");
  };

  const openPendingRegistrations = () => {
    setUserMenuOpen(false);
    setMiniCalendarOpen(false);
    setPendingApprovalsOpen(false);
    navigate("/admin/registrations");
  };

  const handleLogout = () => {
    setUserMenuOpen(false);

    if (onLogout) {
      onLogout();
    }

    navigate("/", { replace: true });
  };

  const openPalette = () => {
    setPaletteQuery("");
    setActiveIndex(0);
    setVoiceStatus("");
    setPaletteOpen(true);
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
    setPendingApprovalsOpen(false);
  };

  const closePalette = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
    setPaletteOpen(false);
    setPaletteQuery("");
    setVoiceStatus("");
  };

  const goToPage = (path) => {
    closePalette();
    navigate(path);
  };

  const openNotificationDetail = (eventId: string) => {
    setUpcomingEventsOpen(false);
    navigate(`/notification/${eventId}`);
  };

  const startVoiceSearch = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceStatus("Voice search isn't supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      let transcript = "";
      let isFinal = false;

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) isFinal = true;
      }

      setPaletteQuery(transcript);

      if (isFinal) {
        const match = findBestPageMatch(transcript, PAGES);

        if (match) {
          setVoiceStatus(`Heard "${transcript.trim()}" — opening ${match.label}…`);
          goToPage(match.path);
        } else {
          setVoiceStatus(`Heard "${transcript.trim()}" — no matching page found.`);
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus("Didn't catch that — try again.");
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setVoiceStatus("Listening…");
    setIsListening(true);
    recognition.start();
  };

  const stopVoiceSearch = () => {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopVoiceSearch();
    } else {
      startVoiceSearch();
    }
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && !calendarRef.current?.contains(target)) {
        setMiniCalendarOpen(false);
      }

      if (target instanceof Node && !userMenuRef.current?.contains(target)) {
        setUserMenuOpen(false);
      }

      if (target instanceof Node && !pendingApprovalsRef.current?.contains(target)) {
        setPendingApprovalsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleExternalUpdate = () => refreshEvents();

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleExternalUpdate);
    window.addEventListener("storage", handleExternalUpdate);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleExternalUpdate);
      window.removeEventListener("storage", handleExternalUpdate);
    };
  }, []);

  useEffect(() => {
    if (user?.role !== "super_admin") {
      setPendingDeleteUsers([]);
      return;
    }

    let cancelled = false;

    const loadPendingDeleteUsers = async () => {
      try {
        const users = await fetchPendingDeleteRequestsApi();
        if (!cancelled) setPendingDeleteUsers(users || []);
      } catch {

      }
    };

    loadPendingDeleteUsers();
    const intervalId = window.setInterval(loadPendingDeleteUsers, PENDING_DELETE_POLL_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user?.role]);

  
  useEffect(() => {
    if (user?.role !== "super_admin") {
      setPendingRegistrations([]);
      return;
    }

    let cancelled = false;

    const loadPendingRegistrations = async () => {
      try {
        const registrations = await fetchPendingRegistrationsApi();
        if (!cancelled) setPendingRegistrations(registrations || []);
      } catch {
    
      }
    };

    loadPendingRegistrations();
    const intervalId = window.setInterval(loadPendingRegistrations, PENDING_DELETE_POLL_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user?.role]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isShortcut) {
        event.preventDefault();
        setPaletteOpen((current) => {
          if (!current) {
            setPaletteQuery("");
            setActiveIndex(0);
          }
          return !current;
        });
        return;
      }

      if (event.key === "Escape" && paletteOpen) {
        closePalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paletteOpen]);

  useEffect(() => {
    if (paletteOpen && paletteInputRef.current) {
      paletteInputRef.current.focus();
    }
  }, [paletteOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [paletteQuery]);

  
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const handlePaletteKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % Math.max(filteredPages.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        (current - 1 + filteredPages.length) % Math.max(filteredPages.length, 1)
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = filteredPages[activeIndex];
      if (selected) goToPage(selected.path);
    }
  };

  return (
    <>
      <header className={`top-navbar ${darkMode ? "navbar-dark" : "navbar-light"}`}>
        <div className="navbar-left">
          <button
            type="button"
            className="nav-icon-button"
            onClick={onSidebarOpen}
            aria-label="Open sidebar"
            data-tour-id="nav-sidebar"
          >
            <MenuOutlined />
            <span className="nav-tooltip">Sidebar</span>
          </button>

          <NavLink to="/dashboard" className="nav-brand" data-tour-id="nav-brand">
            <span className="brand-logo">A</span>

            <div className="nav-brand-text">
              <h2>Apenture X Studios</h2>
              <p>Creative Studio Panel</p>
            </div>
          </NavLink>
        </div>

        <div className="navbar-center">
          <button
            type="button"
            className="command-trigger"
            onClick={openPalette}
            data-tour-id="nav-menu"
            aria-label="Search or jump to a page"
          >
            <SearchOutlined className="command-trigger-icon" />
            <span className="command-trigger-text">Search or jump to…</span>
            <span className="command-trigger-kbd">⌘K</span>
          </button>
        </div>

        <div className="navbar-actions">
          <button
            type="button"
            className="nav-icon-button tour-button"
            onClick={startTour}
            aria-label="Start studio tour"
            data-tour-id="nav-tour"
          >
            <CompassOutlined />
            <span className="nav-tooltip">Studio Tour</span>
          </button>

          <button
            type="button"
            className="nav-icon-button"
            onClick={openAgenda}
            aria-label="Open today's agenda"
            data-tour-id="nav-agenda"
          >
            <ClockCircleOutlined />
            <span className="nav-tooltip">Today's Agenda</span>
          </button>

          <div className="mini-calendar-wrap" ref={calendarRef}>
            <button
              type="button"
              className={`nav-icon-button ${miniCalendarOpen ? "active" : ""}`}
              onClick={toggleMiniCalendar}
              aria-label="Open calendar"
              data-tour-id="nav-calendar"
            >
              <CalendarOutlined />
              <span className="nav-tooltip">Calendar</span>
            </button>

            {miniCalendarOpen && (
              <div className="mini-calendar-popover">
                <div className="mini-calendar-head">
                  <button
                    type="button"
                    className="mini-calendar-nav"
                    onClick={() => setMiniMonth((current) => current.subtract(1, "month"))}
                  >
                    <LeftOutlined />
                  </button>

                  <div>
                    <strong>{miniMonth.format("MMMM")}</strong>
                    <span>{miniMonth.format("YYYY")}</span>
                  </div>

                  <button
                    type="button"
                    className="mini-calendar-nav"
                    onClick={() => setMiniMonth((current) => current.add(1, "month"))}
                  >
                    <RightOutlined />
                  </button>
                </div>

                <div className="mini-calendar-days">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                  ))}
                </div>

                <div className="mini-calendar-grid">
                  {dates.map((date, index) => {
                    const fullDate = date ? getFullDate(date) : null;
                    const dayEvents = fullDate ? events[fullDate] || [] : [];
                    const eventCount = Array.isArray(dayEvents) ? dayEvents.length : 0;

                    return (
                      <button
                        key={date ? fullDate : `empty-${index}`}
                        type="button"
                        className={`mini-calendar-date ${!date ? "empty" : ""} ${
                          fullDate === today ? "today" : ""
                        } ${eventCount > 0 ? "has-events" : ""}`}
                        disabled={!date}
                      >
                        {date && (
                          <>
                            <span>{date}</span>

                            {eventCount > 0 && (
                              <>
                                <em>{eventCount}</em>

                                <strong className="mini-calendar-tooltip">
                                  {eventCount} event{eventCount === 1 ? "" : "s"}
                                </strong>
                              </>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button type="button" className="mini-calendar-full-button" onClick={openFullCalendar}>
                  Open Full Calendar
                </button>
              </div>
            )}
          </div>

          {user?.role === "super_admin" && (
            <div className="pending-approvals-wrap" ref={pendingApprovalsRef}>
              <button
                type="button"
                className={`nav-icon-button ${pendingApprovalsOpen ? "active" : ""}`}
                onClick={togglePendingApprovals}
                aria-label="Pending approvals"
                data-tour-id="nav-pending-approvals"
              >
                <ExclamationCircleOutlined />

                {pendingApprovalsTotal > 0 && (
                  <span className="notify-count">
                    {pendingApprovalsTotal > 99 ? "99+" : pendingApprovalsTotal}
                  </span>
                )}

                <span className="nav-tooltip">
                  {pendingApprovalsTotal > 0
                    ? `${pendingApprovalsTotal} Pending Approval${pendingApprovalsTotal === 1 ? "" : "s"}`
                    : "Pending Approvals"}
                </span>
              </button>

              {pendingApprovalsOpen && (
                <div className="pending-approvals-popover">
                  <div className="pending-approvals-section">
                    <div className="pending-approvals-section-head">
                      <span>Account Deletions</span>
                      <span className="pending-approvals-count">{pendingDeleteUsers.length}</span>
                    </div>

                    {pendingDeleteUsers.length > 0 ? (
                      <div className="pending-approvals-list">
                        {pendingDeleteUsers.slice(0, 5).map((item: any, index: number) => (
                          <button
                            type="button"
                            key={item?.userId || item?.id || index}
                            className="pending-approval-item"
                            onClick={openPendingDeleteRequests}
                          >
                            <span className="pending-approval-name">
                              {item?.name || item?.userName || item?.email || "Pending user"}
                            </span>
                            <span className="pending-approval-meta">
                              {item?.email || item?.role || ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="pending-approvals-empty">No pending deletion requests.</div>
                    )}

                    <button type="button" className="pending-approvals-viewall" onClick={openPendingDeleteRequests}>
                      View all
                    </button>
                  </div>

                  <div className="pending-approvals-divider" />

                  <div className="pending-approvals-section">
                    <div className="pending-approvals-section-head">
                      <span>Registrations</span>
                      <span className="pending-approvals-count">{pendingRegistrations.length}</span>
                    </div>

                    {pendingRegistrations.length > 0 ? (
                      <div className="pending-approvals-list">
                        {pendingRegistrations.slice(0, 5).map((item: any, index: number) => (
                          <button
                            type="button"
                            key={item?.profileId || item?.id || index}
                            className="pending-approval-item"
                            onClick={openPendingRegistrations}
                          >
                            <span className="pending-approval-name">
                              {item?.name || item?.applicantName || item?.email || "Pending applicant"}
                            </span>
                            <span className="pending-approval-meta">
                              {item?.email || item?.type || item?.registrationType || ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="pending-approvals-empty">No pending registrations.</div>
                    )}

                    <button type="button" className="pending-approvals-viewall" onClick={openPendingRegistrations}>
                      View all
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="nav-icon-button notification-button"
            onClick={openUpcomingEvents}
            aria-label="Open notifications"
            data-tour-id="nav-notifications"
          >
            <BellOutlined />

            {upcomingEvents.length > 0 && (
              <span className="notify-count">
                {upcomingEvents.length > 99 ? "99+" : upcomingEvents.length}
              </span>
            )}

            <span className="nav-tooltip">
              {upcomingEvents.length > 0
                ? `${upcomingEvents.length} Notification${upcomingEvents.length === 1 ? "" : "s"}`
                : "Notifications"}
            </span>
          </button>

          <button
            type="button"
            className="nav-icon-button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            data-tour-id="nav-theme"
          >
            {darkMode ? <SunOutlined /> : <MoonOutlined />}
            <span className="nav-tooltip">{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <div className="nav-user-wrap" ref={userMenuRef} data-tour-id="nav-profile">
            <button
              type="button"
              className="nav-user"
              onClick={() => {
                setUserMenuOpen((current) => !current);
                setMiniCalendarOpen(false);
                setPendingApprovalsOpen(false);
              }}
              aria-label="Open profile menu"
            >
              <span className="nav-user-avatar">{displayName.charAt(0)}</span>

              <div>
                <strong>{displayName}</strong>
                <small>{displayRole}</small>
              </div>

              <DownOutlined className={`nav-user-arrow ${userMenuOpen ? "open" : ""}`} />
              <span className="nav-tooltip profile-tooltip">Profile</span>
            </button>

            {userMenuOpen && (
              <div className="nav-user-dropdown">
                <button type="button" onClick={openProfileModal}>
                  <ProfileOutlined />
                  Profile
                </button>

                <button type="button" onClick={openNotificationSettings}>
                  <SettingOutlined />
                  Notification Settings
                </button>

                <button type="button" className="logout-option" onClick={handleLogout}>
                  <LogoutOutlined />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {paletteOpen && (
        <div className="command-overlay" onClick={closePalette}>
          <div className="command-palette" onClick={(event) => event.stopPropagation()}>
            <div className="command-input-row">
              <SearchOutlined className="command-input-icon" />
              <input
                ref={paletteInputRef}
                type="text"
                className="command-input"
                placeholder="Search pages, or tap the mic and say a page name…"
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                onKeyDown={handlePaletteKeyDown}
              />

              <button
                type="button"
                className={`command-mic-button ${isListening ? "listening" : ""}`}
                onClick={handleMicClick}
                aria-label={isListening ? "Stop voice search" : "Start voice search"}
              >
                {isListening ? <AudioMutedOutlined /> : <AudioOutlined />}
              </button>

              <button type="button" className="command-close" onClick={closePalette}>
                <CloseOutlined />
              </button>
            </div>

            {voiceStatus && <div className="command-voice-status">{voiceStatus}</div>}

            <div className="command-results">
              {filteredPages.length > 0 ? (
                filteredPages.map((page, index) => {
                  const isActive = location.pathname === page.path;
                  const isHighlighted = index === activeIndex;

                  return (
                    <button
                      type="button"
                      key={page.path}
                      className={`command-item ${isHighlighted ? "highlighted" : ""} ${
                        isActive ? "current" : ""
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goToPage(page.path)}
                    >
                      <span className="command-item-icon">{page.icon}</span>

                      <span className="command-item-text">
                        <strong>{page.label}</strong>
                        <small>{page.group}</small>
                      </span>

                      {isActive && <span className="command-item-current">Current</span>}
                      {isHighlighted && !isActive && (
                        <EnterOutlined className="command-item-enter" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="command-empty">No pages match "{paletteQuery}".</div>
              )}
            </div>

            <div className="command-footer">
              <span>
                <span className="command-key">↑↓</span> navigate
              </span>
              <span>
                <span className="command-key">↵</span> select
              </span>
              <span>
                <span className="command-key">esc</span> close
              </span>
            </div>
          </div>
        </div>
      )}

      {profileModalOpen && (
        <div
          className="nav-modal-overlay"
          onMouseDown={() => setProfileModalOpen(false)}
        >
          <div className="nav-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="nav-modal-head">
              <h3>Profile</h3>

              <button type="button" onClick={() => setProfileModalOpen(false)}>
                <CloseOutlined />
              </button>
            </div>

            <div className="profile-card">
              <span className="profile-avatar">{displayName.charAt(0)}</span>

              <div>
                <h4>{displayName}</h4>
                <p>{displayRole}</p>
                <small>{displayEmail}</small>
              </div>
            </div>

            <div className="profile-details">
              <p>
                <strong>Name</strong>
                <span>{displayName}</span>
              </p>

              <p>
                <strong>Role</strong>
                <span>{displayRole}</span>
              </p>

              <p>
                <strong>Email</strong>
                <span>{displayEmail}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {upcomingEventsOpen && (
        <div
          className="nav-modal-overlay"
          onMouseDown={() => setUpcomingEventsOpen(false)}
        >
          <div className="nav-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="nav-modal-head">
              <h3>Notification</h3>

              <button type="button" onClick={() => setUpcomingEventsOpen(false)}>
                <CloseOutlined />
              </button>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="upcoming-events-list">
                {upcomingEvents.map((event) => (
                  <div
                    className="upcoming-event-card"
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openNotificationDetail(event.id)}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                        keyEvent.preventDefault();
                        openNotificationDetail(event.id);
                      }
                    }}
                  >
                    <div className="upcoming-event-date">
                      <strong>{dayjs(event.date).format("DD")}</strong>
                      <span>{dayjs(event.date).format("MMM")}</span>
                    </div>

                    <div className="upcoming-event-content">
                      <h4>{event.title}</h4>
                      <p>
                        {dayjs(event.date).format("dddd, DD MMMM YYYY")}
                        {event.time ? ` at ${event.time}` : ""}
                      </p>

                      {event.description && <small>{event.description}</small>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-events">
                <CalendarOutlined />
                <h4>No upcoming events</h4>
                <p>Your calendar events will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;