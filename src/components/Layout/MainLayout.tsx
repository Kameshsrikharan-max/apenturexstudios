import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ConfigProvider } from "antd";
import { ArrowUpOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "../UI/Sidebar";
import "./MainLayout.css";

const SCROLL_SHOW_THRESHOLD = 320;

const MainLayout = ({ children, user, onLogout }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > SCROLL_SHOW_THRESHOLD);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToCalendar = () => navigate("/calendar");

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          onLogout={onLogout}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode((value) => !value)}
          onSidebarOpen={() => setSidebarOpen(true)}
          onCalendarOpen={goToCalendar}
        />

        <Sidebar
          dark={darkMode}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCalendarOpen={goToCalendar}
        />

        <main className="site-content">{children}</main>

        <footer className="site-footer">
          <div className="site-footer-bar">
            <div className="site-footer-brand">
              <span className="site-footer-aperture" aria-hidden="true">
                <svg viewBox="0 0 32 32" width="16" height="16">
                  <circle className="aperture-ring" cx="16" cy="16" r="14" />
                  <g className="aperture-blades">
                    <polygon className="blade" points="16,16 16,3 24,7" />
                    <polygon className="blade" points="16,16 24,7 29,16" />
                    <polygon className="blade" points="16,16 29,16 24,25" />
                    <polygon className="blade" points="16,16 24,25 16,29" />
                    <polygon className="blade" points="16,16 16,29 8,25" />
                    <polygon className="blade" points="16,16 8,25 3,16" />
                  </g>
                </svg>
              </span>
              <span className="site-footer-name">Apenture X Studios</span>
            </div>

            <span className="site-footer-copy">© {new Date().getFullYear()} AXS</span>
          </div>
        </footer>

        {createPortal(
          <button
            type="button"
            className={`scroll-top-btn ${showScrollTop ? "is-visible" : ""}`}
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <ArrowUpOutlined />
          </button>,
          document.body
        )}

        {/* <StudioTour /> */}
      </div>
    </ConfigProvider>
  );
};

export default MainLayout;