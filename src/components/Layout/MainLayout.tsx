import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ConfigProvider } from "antd";
import { ArrowUpOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "../UI/Sidebar";
import "./MainLayout.css";

const SCROLL_SHOW_THRESHOLD = 320;
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface MainLayoutProps {
  children: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  onLogout?: () => void;
}

const MainLayout = ({ children, user, onLogout }: MainLayoutProps) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Refs let us update scroll visuals without re-rendering React on every frame
  const progressBarRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const apertureRef = useRef<SVGGElement>(null);

  // Sync theme to <html> so the page scrollbar and antd portals can be themed
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-axs-theme", darkMode ? "dark" : "light");
    return () => root.removeAttribute("data-axs-theme");
  }, [darkMode]);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      const progress =
        maxScroll > 0
          ? Math.min(1, Math.max(0, window.scrollY / maxScroll))
          : 0;

      progressBarRef.current?.style.setProperty("--progress", String(progress));

      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(
          RING_CIRCUMFERENCE * (1 - progress)
        );
      }

      if (percentRef.current) {
        percentRef.current.textContent = String(Math.round(progress * 100));
      }

      apertureRef.current?.style.setProperty(
        "--aperture-rotate",
        `${progress * 360}deg`
      );

      const shouldShow = window.scrollY > SCROLL_SHOW_THRESHOLD;
      setShowScrollTop((prev) => (prev === shouldShow ? prev : shouldShow));

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // Page height changes when content loads, so recalculate progress
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onScroll)
        : null;
    resizeObserver?.observe(document.body);

    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      resizeObserver?.disconnect();
    };
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
        {/* Top scroll progress line */}
        <div className="scroll-progress" aria-hidden="true">
          <div className="scroll-progress-fill" ref={progressBarRef} />
        </div>

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
          user={user}
        />

        <main className="site-content">{children}</main>

        <footer className="site-footer">
          <div className="site-footer-bar">
            <div className="site-footer-brand">
              <span className="site-footer-aperture" aria-hidden="true">
                <svg viewBox="0 0 32 32" width="16" height="16">
                  <circle className="aperture-ring" cx="16" cy="16" r="14" />
                  <g className="aperture-blades" ref={apertureRef}>
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

            <span className="site-footer-copy">
              © {new Date().getFullYear()} AXS
            </span>
          </div>
        </footer>

        {createPortal(
          <button
            type="button"
            className={`scroll-top-btn ${showScrollTop ? "is-visible" : ""}`}
            data-theme={darkMode ? "dark" : "light"}
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <svg className="scroll-top-ring" viewBox="0 0 46 46" aria-hidden="true">
              <circle className="ring-track" cx="23" cy="23" r={RING_RADIUS} />
              <circle
                ref={ringRef}
                className="ring-progress"
                cx="23"
                cy="23"
                r={RING_RADIUS}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE}
              />
            </svg>
            <span className="scroll-top-icon">
              <ArrowUpOutlined />
            </span>
            <span className="scroll-top-pct">
              <span ref={percentRef}>0</span>%
            </span>
          </button>,
          document.body
        )}

        {/* <StudioTour /> */}
      </div>
    </ConfigProvider>
  );
};

export default MainLayout;