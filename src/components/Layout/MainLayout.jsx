import { useState } from "react";
import { ConfigProvider } from "antd";
import Navbar from "./Navbar";
import Sidebar from "../UI/Sidebar";
import CalendarModal from "../UI/CalendarModal";
import StudioTour from "../StudioTour/StudioTour";
import "./MainLayout.css";

const MainLayout = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#38bdf8",
          borderRadius: 16,
          colorBgContainer: darkMode ? "#0f172a" : "#ffffff",
          colorText: darkMode ? "#f8fafc" : "#082f49",
          colorTextSecondary: darkMode ? "#bfdbfe" : "#475569",
          fontFamily:
            "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        },
      }}
    >
      <div className={`site-layout ${darkMode ? "site-dark" : "site-light"}`}>
        <Navbar
          user={user}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode((value) => !value)}
          onSidebarOpen={() => setSidebarOpen(true)}
          onCalendarOpen={() => setCalendarOpen(true)}
        />

        <Sidebar
          dark={darkMode}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCalendarOpen={() => setCalendarOpen(true)}
        />

        <main className="site-content">{children}</main>

        <footer className="site-footer">
          <div>
            <h3>Apenture X Studios</h3>
            <p>Creative blue admin experience for dashboard, reviews, users, and enquiries.</p>
          </div>
        </footer>

        <CalendarModal
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
        />

        {/* <StudioTour /> */}
      </div>
    </ConfigProvider>
  );
};

export default MainLayout;