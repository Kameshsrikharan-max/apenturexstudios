import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Tooltip } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  StarOutlined,
  StarFilled,
  UserOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  MailOutlined,
  ShopOutlined,
  CameraOutlined,
  CreditCardOutlined,
  ExclamationCircleOutlined,
  FileImageOutlined,
  ClockCircleOutlined,
  BookOutlined,
  DownOutlined,
  BulbOutlined,
  LogoutOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { canAccessSection, type SectionKey } from "../../config/rolePermissions";

import "./Sidebar.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SidebarUser {
  role?: string;
  name?: string;
  email?: string;
}

interface SidebarProps {
  dark?: boolean;
  open?: boolean;
  onClose?: () => void;
  /** Kept for compatibility with the existing layout, not used by the sidebar itself */
  onCalendarOpen?: () => void;
  user?: SidebarUser;
  /** Extra live counters by item key, e.g. { enquiry: 3, review: 2 } */
  badges?: Record<string, number>;
  /** Shows a theme toggle in the footer when provided */
  onToggleTheme?: () => void;
  /** Shows a sign-out button in the footer when provided */
  onLogout?: () => void;
}

type GroupKey = "overview" | "operations" | "library" | "studio";

interface NavItem {
  key: string;
  icon: ReactNode;
  label: string;
  path: string;
  group: GroupKey;
  section?: SectionKey;
}

/* ------------------------------------------------------------------ */
/* Static config                                                       */
/* ------------------------------------------------------------------ */

const GROUPS: Array<{ key: GroupKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "operations", label: "Operations" },
  { key: "library", label: "Library" },
  { key: "studio", label: "Studio" },
];

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard", path: "/dashboard", section: "dashboard", group: "overview" },
  { key: "review", icon: <StarOutlined />, label: "Review", path: "/review", section: "review", group: "overview" },
  { key: "calendar", icon: <ScheduleOutlined />, label: "Calendar", path: "/calendar", group: "overview" },
  { key: "events", icon: <CalendarOutlined />, label: "Events", path: "/events", section: "events", group: "operations" },
  { key: "availability", icon: <ClockCircleOutlined />, label: "Availability", path: "/availability", section: "availability", group: "operations" },
  { key: "enquiry", icon: <MailOutlined />, label: "Enquiry", path: "/enquiry", section: "enquiry", group: "operations" },
  { key: "users", icon: <UserOutlined />, label: "Users", path: "/users", section: "users", group: "operations" },
  { key: "media", icon: <CameraOutlined />, label: "Media Library", path: "/media", group: "library" },
  { key: "album-library", icon: <BookOutlined />, label: "Album Library", path: "/albums/library", group: "library" },
  { key: "templates", icon: <FileImageOutlined />, label: "Templates", path: "/templates", section: "templates", group: "library" },
  { key: "studio", icon: <ShopOutlined />, label: "My Studio", path: "/studio/view", section: "studio", group: "studio" },
  { key: "subscription", icon: <CreditCardOutlined />, label: "Subscription", path: "/subscription", section: "subscription", group: "studio" },
];

const DELETE_REQUESTS_ITEM: NavItem = {
  key: "delete-requests",
  icon: <ExclamationCircleOutlined />,
  label: "Delete Requests",
  path: "/delete-requests",
  group: "studio",
};

const STATUSES = [
  { key: "available", label: "Available", color: "#4ade80" },
  { key: "shooting", label: "On shoot", color: "#fac775" },
  { key: "editing", label: "Editing", color: "#38d5ff" },
  { key: "away", label: "Away", color: "#7f95b3" },
] as const;

type StatusKey = (typeof STATUSES)[number]["key"];

const LS_EXPANDED = "axs_sidebar_expanded";
const LS_FAVS = "axs_sidebar_favourites";
const LS_STATUS = "axs_sidebar_status";
const EVENTS_KEY = "ax.events.v1";
// The navbar hamburger already controls the sidebar, so there is no extra
// expand button here. The sidebar listens for that hamburger instead.
const HAMBURGER_SELECTOR = '[data-tour-id="nav-sidebar"]';
/** Optional: window.dispatchEvent(new Event("axs:sidebar:toggle-expand")) toggles labels. */
const SIDEBAR_TOGGLE_EVENT = "axs:sidebar:toggle-expand";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable, ignore */
  }
}

function prettyRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/** Accepts ISO, timestamps and DD/MM/YYYY or DD-MM-YYYY strings. */
function parseLooseDate(value: unknown): Date | null {
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function collectEvents(node: unknown, out: Record<string, unknown>[], depth = 0) {
  if (depth > 3 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectEvents(n, out, depth + 1));
    return;
  }
  const rec = node as Record<string, unknown>;
  if ("date" in rec || "eventDate" in rec || "startDate" in rec) {
    out.push(rec);
    return;
  }
  Object.values(rec).forEach((n) => collectEvents(n, out, depth + 1));
}

function countTodayEvents(): number {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return 0;
    const found: Record<string, unknown>[] = [];
    collectEvents(JSON.parse(raw), found);
    const today = new Date().toDateString();
    return found.filter((ev) => {
      const d = parseLooseDate(ev.date ?? ev.eventDate ?? ev.startDate);
      return d ? d.toDateString() === today : false;
    }).length;
  } catch {
    return 0;
  }
}

function useTodayEventCount() {
  const [count, setCount] = useState(countTodayEvents);
  useEffect(() => {
    const refresh = () => setCount(countTodayEvents());
    const names = ["focus", "storage", "eventsBoardUpdated", "eventsListUpdated"];
    names.forEach((n) => window.addEventListener(n, refresh));
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => {
      names.forEach((n) => window.removeEventListener(n, refresh));
      window.clearInterval(timer);
    };
  }, []);
  return count;
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const LiveClock = memo(function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      <span>
        {now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
      </span>
    </>
  );
});

const ApertureMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <g
      className="sb-iris-blades"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path key={a} d="M12 2.5 L17.8 8.2 L12 12" transform={`rotate(${a} 12 12)`} />
      ))}
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const Sidebar = ({
  dark = false,
  open = false,
  onClose,
  user,
  badges,
  onToggleTheme,
  onLogout,
}: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.role === "super_admin";
  const isMobile = useMediaQuery("(max-width: 575px)");

  /* ---------- UI state ---------- */
  // Expanded only when the user clicks the expand icon. No hover expansion.
  const [expandedPref, setExpandedPref] = useState<boolean>(() => readJSON(LS_EXPANDED, false));
  const [favs, setFavs] = useState<string[]>(() => readJSON<string[]>(LS_FAVS, []));
  const [status, setStatus] = useState<StatusKey>(() => {
    const saved = readJSON<string>(LS_STATUS, "available");
    return STATUSES.some((s) => s.key === saved) ? (saved as StatusKey) : "available";
  });
  const [footerOpen, setFooterOpen] = useState(false);
  // Desktop close is handled here so the page layout is never touched.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => writeJSON(LS_EXPANDED, expandedPref), [expandedPref]);
  useEffect(() => writeJSON(LS_FAVS, favs), [favs]);
  useEffect(() => writeJSON(LS_STATUS, status), [status]);

  // When the parent opens the sidebar again (hamburger etc.), always show it.
  useEffect(() => {
    if (open) setDismissed(false);
  }, [open]);

  const expanded = isMobile ? true : expandedPref;
  const visible = open && (isMobile || !dismissed);

  /* ---------- navbar hamburger drives the sidebar ---------- */
  const asideRef = useRef<HTMLElement>(null);
  const stateRef = useRef({ open, dismissed, isMobile });
  stateRef.current = { open, dismissed, isMobile };

  useEffect(() => {
    const handleHamburger = () => {
      const s = stateRef.current;
      if (s.dismissed) {
        // closed with the X: the hamburger brings it back
        setDismissed(false);
      } else if (s.open && !s.isMobile) {
        // visible rail: the hamburger expands / collapses the labels
        setExpandedPref((v) => !v);
      }
      // if the parent has it closed, the parent's own handler opens it
    };

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(HAMBURGER_SELECTOR)) handleHamburger();
    };

    document.addEventListener("click", onDocClick);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleHamburger);
    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleHamburger);
    };
  }, []);

  /* ---------- click anywhere outside (or press Esc) to close ---------- */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;

    const close = () => {
      setDismissed(true);
      onCloseRef.current?.();
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (asideRef.current?.contains(target)) return;
      // the hamburger has its own behaviour (expand / reopen)
      if (target.closest(HAMBURGER_SELECTOR)) return;
      // tooltips render in a portal; ignore them
      if (target.closest(".ant-tooltip")) return;
      close();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [visible]);

  /* ---------- navigation model ---------- */
  const visibleItems = useMemo(() => {
    const base = NAV_ITEMS.filter(
      (item) => !item.section || canAccessSection(user?.role, item.section)
    );
    return isSuperAdmin ? [...base, DELETE_REQUESTS_ITEM] : base;
  }, [user?.role, isSuperAdmin]);

  const sections = useMemo(() => {
    const favItems = favs
      .map((k) => visibleItems.find((i) => i.key === k))
      .filter((i): i is NavItem => Boolean(i));
    const rest = visibleItems.filter((i) => !favs.includes(i.key));
    return [
      { key: "pinned", label: "Pinned", items: favItems },
      ...GROUPS.map((g) => ({
        key: g.key as string,
        label: g.label,
        items: rest.filter((i) => i.group === g.key),
      })),
    ].filter((g) => g.items.length > 0);
  }, [visibleItems, favs]);

  const activeKey = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    let best: NavItem | null = null;
    for (const item of visibleItems) {
      if (path === item.path || path.startsWith(item.path + "/")) {
        if (!best || item.path.length > best.path.length) best = item;
      }
    }
    return best?.key ?? null;
  }, [location.pathname, visibleItems]);

  /* ---------- live badges ---------- */
  const todayEvents = useTodayEventCount();
  const badgeFor = (key: string) =>
    (badges?.[key] ?? 0) + (key === "events" ? todayEvents : 0);

  /* ---------- user card ---------- */
  const profile = useMemo(() => {
    let stored: { name?: string; email?: string; role?: string } = {};
    try {
      stored = JSON.parse(localStorage.getItem("user") || "{}") ?? {};
    } catch {
      stored = {};
    }
    const name =
      user?.name ||
      stored.name ||
      (user?.email || stored.email || "").split("@")[0] ||
      "Guest";
    const role = user?.role || stored.role || "";
    const initials =
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "A";
    return { name, role: role ? prettyRole(role) : "Member", initials };
  }, [user]);

  const currentStatus = STATUSES.find((s) => s.key === status) ?? STATUSES[0];

  /* ---------- actions ---------- */
  const go = useCallback(
    (path: string) => {
      navigate(path);
      // On phones the drawer closes after choosing a page. On desktop it stays.
      if (isMobile) onClose?.();
    },
    [navigate, onClose, isMobile]
  );


  const toggleFav = (key: string) =>
    setFavs((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  /* ---------- viewfinder lens (sliding active indicator) ---------- */
  const navRef = useRef<HTMLElement>(null);
  const [lens, setLens] = useState<{ top: number; height: number } | null>(null);
  const [lensAnimated, setLensAnimated] = useState(false);

  const measure = useCallback(() => {
    const nav = navRef.current;
    if (!nav || !activeKey) {
      setLens(null);
      return;
    }
    const row = nav.querySelector<HTMLElement>(`[data-key="${activeKey}"]`);
    if (!row) {
      setLens(null);
      return;
    }
    setLens((prev) =>
      prev && prev.top === row.offsetTop && prev.height === row.offsetHeight
        ? prev
        : { top: row.offsetTop, height: row.offsetHeight }
    );
  }, [activeKey]);

  useLayoutEffect(() => {
    measure();
  }, [measure, sections, expanded]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(nav);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  useEffect(() => {
    if (lens && !lensAnimated) {
      const id = requestAnimationFrame(() => setLensAnimated(true));
      return () => cancelAnimationFrame(id);
    }
  }, [lens, lensAnimated]);

  /* ---------- nav helpers ---------- */
  const onNavKey = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>(".sb-item"));
    if (!buttons.length) return;
    const focused = (document.activeElement as HTMLElement | null)
      ?.closest(".sb-row")
      ?.querySelector<HTMLButtonElement>(".sb-item");
    const cur = focused ? buttons.indexOf(focused) : -1;
    let next = cur;
    if (e.key === "ArrowDown") next = cur < 0 ? 0 : (cur + 1) % buttons.length;
    if (e.key === "ArrowUp") next = cur < 0 ? buttons.length - 1 : (cur - 1 + buttons.length) % buttons.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = buttons.length - 1;
    e.preventDefault();
    buttons[next].focus();
  };

  const onNavPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  /* ---------- render ---------- */
  let rowIndex = 0;
  const themeClass = dark ? "studio-sidebar-dark" : "studio-sidebar-light";

  return (
    <>
      <div
        className={`sidebar-backdrop ${open && isMobile ? "sidebar-backdrop-open" : ""}`}
        onClick={onClose}
      />

      <aside
        ref={asideRef}
        aria-label="Main navigation"
        aria-hidden={!visible}
        className={[
          "studio-sidebar",
          themeClass,
          visible ? "studio-sidebar-open" : "",
          expanded ? "is-expanded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* ---------- brand ---------- */}
        <div className="sb-brand">
          <div className="sb-mark">
            <ApertureMark />
          </div>
          <div className="sb-brand-text">
            <strong>Aperture X Studios</strong>
            <span className="sb-clock">
              <LiveClock />
            </span>
          </div>
        </div>

        {/* ---------- navigation ---------- */}
        <div className="sb-nav-wrap" onPointerMove={onNavPointerMove}>
          <nav className="sb-nav" ref={navRef} aria-label="Primary" onKeyDown={onNavKey}>
            <span
              className={`sb-lens ${lens ? "is-visible" : ""} ${lensAnimated ? "is-animated" : ""}`}
              style={{
                transform: `translateY(${lens?.top ?? 0}px)`,
                height: lens?.height ?? 46,
              }}
              aria-hidden="true"
            >
              <span key={activeKey ?? "none"} className="sb-lens-brackets" />
            </span>

            {sections.map((group) => (
              <div className="sb-group" key={group.key}>
                <div className="sb-group-head" aria-hidden="true">
                  <span className="sb-group-label">{group.label}</span>
                  <span className="sb-group-line" />
                </div>

                {group.items.map((item) => {
                  const idx = rowIndex++;
                  const active = item.key === activeKey;
                  const count = badgeFor(item.key);
                  const isFav = favs.includes(item.key);
                  const countText = count > 9 ? "9+" : String(count);

                  return (
                    <div
                      className="sb-row"
                      key={item.key}
                      data-key={item.key}
                      style={{ "--i": idx } as CSSProperties}
                    >
                      <Tooltip
                        title={expanded ? undefined : item.label}
                        placement="right"
                        mouseEnterDelay={0.15}
                        zIndex={1200}
                      >
                        <button
                          type="button"
                          className={`sb-item ${active ? "is-active" : ""}`}
                          aria-current={active ? "page" : undefined}
                          aria-label={count > 0 ? `${item.label}, ${count}` : item.label}
                          onClick={() => go(item.path)}
                        >
                          <span className="sb-icon">
                            {item.icon}
                            {count > 0 && <span className="sb-badge-dot">{countText}</span>}
                          </span>
                          <span className="sb-label">{item.label}</span>
                          {count > 0 && <span className="sb-badge">{countText}</span>}
                        </button>
                      </Tooltip>

                      <button
                        type="button"
                        className={`sb-pin ${isFav ? "is-on" : ""}`}
                        aria-pressed={isFav}
                        aria-label={isFav ? `Unpin ${item.label}` : `Pin ${item.label} to top`}
                        onClick={() => toggleFav(item.key)}
                      >
                        {isFav ? <StarFilled /> : <StarOutlined />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* ---------- footer ---------- */}
        <div className={`sb-footer ${footerOpen ? "is-open" : ""}`}>
          <div className="sb-footer-panel">
            <div className="sb-footer-panel-inner">
              <div className="sb-status-list" role="radiogroup" aria-label="Your status">
                {STATUSES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={status === s.key}
                    className={`sb-status-opt ${status === s.key ? "is-on" : ""}`}
                    onClick={() => setStatus(s.key)}
                    title={s.label}
                  >
                    <span className="sb-dot" style={{ "--dot": s.color } as CSSProperties} />
                    <span className="sb-collapse-text">{s.label}</span>
                  </button>
                ))}
              </div>

              <div className="sb-tools">
                <Tooltip title="My profile" placement="top" zIndex={1200}>
                  <button
                    type="button"
                    className="sb-tool"
                    aria-label="My profile"
                    onClick={() => go("/profile")}
                  >
                    <IdcardOutlined />
                  </button>
                </Tooltip>
                {onToggleTheme && (
                  <Tooltip title="Switch theme" placement="top" zIndex={1200}>
                    <button
                      type="button"
                      className="sb-tool"
                      aria-label="Switch theme"
                      onClick={onToggleTheme}
                    >
                      <BulbOutlined />
                    </button>
                  </Tooltip>
                )}
                {onLogout && (
                  <Tooltip title="Sign out" placement="top" zIndex={1200}>
                    <button
                      type="button"
                      className="sb-tool sb-tool-danger"
                      aria-label="Sign out"
                      onClick={onLogout}
                    >
                      <LogoutOutlined />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="sb-user"
            aria-expanded={footerOpen}
            aria-label={`${profile.name}, ${currentStatus.label}. Open status and account options`}
            onClick={() => setFooterOpen((o) => !o)}
          >
            <span className="sb-avatar-col">
              <span className="sb-avatar">
                {profile.initials}
                <i
                  className="sb-presence"
                  style={{ "--dot": currentStatus.color } as CSSProperties}
                />
              </span>
            </span>
            <span className="sb-user-text">
              <strong>{profile.name}</strong>
              <small>{profile.role}</small>
            </span>
            <DownOutlined className="sb-chevron" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;