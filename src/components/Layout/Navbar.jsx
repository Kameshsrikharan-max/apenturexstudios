import React from "react";
import { NavLink } from "react-router-dom";
import {
  MenuOutlined,
  CalendarOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "./Navbar.css";

function Navbar({
  user,
  darkMode,
  onToggleTheme,
  onSidebarOpen,
  onCalendarOpen,
}) {
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
        <button type="button" className="nav-icon-button" onClick={onCalendarOpen}>
          <CalendarOutlined />
        </button>

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
