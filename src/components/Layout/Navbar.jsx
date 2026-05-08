import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  MenuOutlined,
  CalendarOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./Navbar.css";

const getSavedEvents = () => {
  try {
    const saved = localStorage.getItem("calendarEvents");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

function Navbar({
  user,
  darkMode,
  onToggleTheme,
  onSidebarOpen,
  onCalendarOpen,
}) {
  const [miniCalendarOpen, setMiniCalendarOpen] = useState(false);
  const [miniMonth, setMiniMonth] = useState(dayjs());
  const [events, setEvents] = useState(getSavedEvents);

  const today = dayjs().format("YYYY-MM-DD");
  const monthKey = miniMonth.format("YYYY-MM");

  const dates = useMemo(() => {
    const list = [];
    const startDay = miniMonth.startOf("month").day();
    const daysInMonth = miniMonth.daysInMonth();

    for (let i = 0; i < startDay; i++) {
      list.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      list.push(day);
    }

    return list;
  }, [miniMonth]);

  const refreshEvents = () => {
    setEvents(getSavedEvents());
  };

  const toggleMiniCalendar = () => {
    refreshEvents();
    setMiniCalendarOpen((current) => !current);
  };

  const openFullCalendar = () => {
    setMiniCalendarOpen(false);

    if (onCalendarOpen) {
      onCalendarOpen();
    }
  };

  const getFullDate = (date) => {
    return `${monthKey}-${String(date).padStart(2, "0")}`;
  };

  return (
    <header className={`top-navbar ${darkMode ? "navbar-dark" : "navbar-light"}`}>
      <div className="navbar-left">
        <button type="button" className="nav-icon-button" onClick={onSidebarOpen}>
          <MenuOutlined />
        </button>

        <NavLink to="/dashboard" className="nav-brand">
          <span className="brand-logo">A</span>

          <div>
            <h2>Apenture X Studios</h2>
            <p>Creative Studio Panel</p>
          </div>
        </NavLink>
      </div>

      <nav className="nav-menu">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/review">Review</NavLink>
        <NavLink to="/users">Users</NavLink>
        <NavLink to="/enquiry">Enquiry</NavLink>
      </nav>

      <div className="navbar-actions">
        <div className="mini-calendar-wrap">
          <button
            type="button"
            className={`nav-icon-button ${miniCalendarOpen ? "active" : ""}`}
            onClick={toggleMiniCalendar}
          >
            <CalendarOutlined />
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
                  const eventCount = dayEvents.length;

                  return (
                    <button
                      key={date ? fullDate : `empty-${index}`}
                      type="button"
                      className={`mini-calendar-date ${
                        !date ? "empty" : ""
                      } ${fullDate === today ? "today" : ""} ${
                        eventCount > 0 ? "has-events" : ""
                      }`}
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

              <button
                type="button"
                className="mini-calendar-full-button"
                onClick={openFullCalendar}
              >
                Open Full Calendar
              </button>
            </div>
          )}
        </div>

        <button type="button" className="nav-icon-button notification-button">
          <BellOutlined />
          <span className="notify-dot" />
        </button>

        <button type="button" className="nav-icon-button" onClick={onToggleTheme}>
          {darkMode ? <SunOutlined /> : <MoonOutlined />}
        </button>

        <div className="nav-user">
          <span className="nav-user-avatar">
            {user?.name?.charAt(0) || <UserOutlined />}
          </span>

          <div>
            <strong>{user?.name || "Kamesh Srikharan.T"}</strong>
            <small>{user?.role || "Studio Admin"}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
