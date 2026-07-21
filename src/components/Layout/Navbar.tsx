import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  MenuOutlined,
  CalendarOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  LeftOutlined,
  RightOutlined,
  DownOutlined,
  LogoutOutlined,
  SettingOutlined,
  ProfileOutlined,
  CloseOutlined,
  CompassOutlined,
  SearchOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  TeamOutlined,
  MailOutlined,
  ShopOutlined,
  PictureOutlined,
  EnterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./Navbar.css";

const DEFAULT_ROLE = "Studio Admin";
const DEFAULT_EMAIL = "admin@apenturexstudios.com";

const PAGES = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardOutlined />, group: "Workspace" },
  { label: "Review", path: "/review", icon: <FileSearchOutlined />, group: "Workspace" },
  { label: "Users", path: "/users", icon: <TeamOutlined />, group: "Workspace" },
  { label: "Events", path: "/events", icon: <CalendarOutlined />, group: "Workspace" },
  { label: "Enquiry", path: "/enquiry", icon: <MailOutlined />, group: "Workspace" },
  { label: "Studio", path: "/studio/view", icon: <ShopOutlined />, group: "Studio" },
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

const normalizeEvent = (event, date, index) => {
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

function Navbar({
  user,
  darkMode,
  onToggleTheme,
  onSidebarOpen,
  onCalendarOpen,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const displayEmail =
    user?.email || (user?.identifier?.includes("@") ? user.identifier : DEFAULT_EMAIL);
  const displayName = displayEmail.split("@")[0];
  const displayRole = user?.role || DEFAULT_ROLE;

  const [miniCalendarOpen, setMiniCalendarOpen] = useState(false);
  const [miniMonth, setMiniMonth] = useState(dayjs());
  const [events, setEvents] = useState(getSavedEvents);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [upcomingEventsOpen, setUpcomingEventsOpen] = useState(false);

  const [notificationType, setNotificationType] = useState(
    localStorage.getItem("notificationPreference") || ""
  );

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const paletteInputRef = useRef(null);

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
    return Object.entries(events)
      .filter(([date]) => {
        const eventDate = dayjs(date);
        return eventDate.isSame(dayjs(), "day") || eventDate.isAfter(dayjs(), "day");
      })
      .sort(([firstDate], [secondDate]) => dayjs(firstDate).valueOf() - dayjs(secondDate).valueOf())
      .flatMap(([date, dayEvents]) => {
        if (!Array.isArray(dayEvents)) return [];
        return dayEvents.map((event, index) => normalizeEvent(event, date, index));
      });
  }, [events]);

  const filteredPages = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    if (!query) return PAGES;
    return PAGES.filter((page) => page.label.toLowerCase().includes(query));
  }, [paletteQuery]);

  const refreshEvents = () => {
    setEvents(getSavedEvents());
  };

  const startTour = () => {
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
    setProfileModalOpen(false);
    setNotificationSettingsOpen(false);
    setUpcomingEventsOpen(false);
    window.dispatchEvent(new Event("startStudioTour"));
  };

  const toggleMiniCalendar = () => {
    refreshEvents();
    setMiniCalendarOpen((current) => !current);
    setUserMenuOpen(false);
  };

  const openUpcomingEvents = () => {
    refreshEvents();
    setUpcomingEventsOpen(true);
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
  };

  const openFullCalendar = () => {
    setMiniCalendarOpen(false);
    navigate("/calendar");
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
    setNotificationSettingsOpen(true);
  };

  const saveNotificationSettings = () => {
    localStorage.setItem("notificationPreference", notificationType);
    setNotificationSettingsOpen(false);
  };

  const cancelNotificationSettings = () => {
    setNotificationType(localStorage.getItem("notificationPreference") || "");
    setNotificationSettingsOpen(false);
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
    setPaletteOpen(true);
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
  };

  const closePalette = () => {
    setPaletteOpen(false);
    setPaletteQuery("");
  };

  const goToPage = (path) => {
    closePalette();
    navigate(path);
  };

  // Global ⌘K / Ctrl+K shortcut
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

          <div className="mini-calendar-wrap">
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

          <div className="nav-user-wrap" data-tour-id="nav-profile">
            <button
              type="button"
              className="nav-user"
              onClick={() => {
                setUserMenuOpen((current) => !current);
                setMiniCalendarOpen(false);
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
                placeholder="Search pages… Dashboard, Studio, Media Library"
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                onKeyDown={handlePaletteKeyDown}
              />
              <button type="button" className="command-close" onClick={closePalette}>
                <CloseOutlined />
              </button>
            </div>

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
                <div className="command-empty">No pages match “{paletteQuery}”.</div>
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
        <div className="nav-modal-overlay">
          <div className="nav-modal">
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
        <div className="nav-modal-overlay">
          <div className="nav-modal">
            <div className="nav-modal-head">
              <h3>Notification</h3>

              <button type="button" onClick={() => setUpcomingEventsOpen(false)}>
                <CloseOutlined />
              </button>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="upcoming-events-list">
                {upcomingEvents.map((event) => (
                  <div className="upcoming-event-card" key={event.id}>
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

      {notificationSettingsOpen && (
        <div className="nav-modal-overlay">
          <div className="nav-modal">
            <div className="nav-modal-head">
              <h3>Notification Settings</h3>

              <button type="button" onClick={cancelNotificationSettings}>
                <CloseOutlined />
              </button>
            </div>

            <p className="modal-description">
              Choose how you want to receive admin notifications. Leave all unchecked to disable
              them.
            </p>

            <div className="notification-options">
              <label>
                <input
                  type="radio"
                  name="notificationType"
                  value="in-app"
                  checked={notificationType === "in-app"}
                  onChange={(event) => setNotificationType(event.target.value)}
                />
                <span>In App</span>
              </label>

              <label>
                <input
                  type="radio"
                  name="notificationType"
                  value="email"
                  checked={notificationType === "email"}
                  onChange={(event) => setNotificationType(event.target.value)}
                />
                <span>Email</span>
              </label>
            </div>

            <div className="nav-modal-actions">
              <button type="button" className="modal-cancel-button" onClick={cancelNotificationSettings}>
                Cancel
              </button>

              <button type="button" className="modal-save-button" onClick={saveNotificationSettings}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;