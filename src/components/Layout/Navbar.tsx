import { JSX, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {MenuOutlined,CalendarOutlined,BellOutlined,SunOutlined,MoonOutlined,LeftOutlined,RightOutlined,DownOutlined,LogoutOutlined,SettingOutlined,ProfileOutlined,CloseOutlined,CompassOutlined,SearchOutlined,DashboardOutlined,FileSearchOutlined,TeamOutlined,MailOutlined,ShopOutlined,PictureOutlined,EnterOutlined,WalletOutlined,ClockCircleOutlined,AudioOutlined,AudioMutedOutlined,ExclamationCircleOutlined,UserAddOutlined,FileImageOutlined,ScheduleOutlined,FileTextOutlined,BookOutlined,FullscreenOutlined,FullscreenExitOutlined,DisconnectOutlined,ReloadOutlined,ThunderboltOutlined,CheckOutlined,} from "@ant-design/icons";
import dayjs from "dayjs";
import { getStoredNotifications, NOTIFICATIONS_UPDATED_EVENT } from "../../utils/notificationStore";
import { fetchPendingDeleteRequestsApi } from "../../redux/api/deleteRequestApi";
import { fetchPendingRegistrationsApi } from "../../redux/api/registrationApprovalApi";
import { canAccessSection, SectionKey } from "../../config/rolePermissions";
import { useAssignmentNotifications } from "../UI/useAssignmentNotifications";
import LanguageSwitcher from "../UI/LanguageSwitcher";
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

type NotificationSource = "backend" | "generic" | "calendar";

type UpcomingItem = {
  id: string;
  date: string;
  title: string;
  time?: string;
  description?: string;
  _source: NotificationSource;
  _read?: boolean;
};

type PaletteItem = {
  id: string;
  label: string;
  group: string;
  icon: JSX.Element;
  hint?: string;
  keywords?: string;
  path?: string;
  run: () => void;
};

type ResultItem = PaletteItem & { indices?: number[] };

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
  { label: "Auto Invoice", path: "/invoices", icon: <FileTextOutlined />, group: "Workspace", section: "invoices" },
  { label: "Enquiry", path: "/enquiry", icon: <MailOutlined />, group: "Workspace", section: "enquiry" },
  { label: "Today's Agenda", path: "/agenda", icon: <ClockCircleOutlined />, group: "Workspace" },
  { label: "Availability", path: "/availability", icon: <ScheduleOutlined />, group: "Workspace", section: "availability" },
  { label: "Studio", path: "/studio/view", icon: <ShopOutlined />, group: "Studio", section: "studio" },
  { label: "Templates", path: "/templates", icon: <FileImageOutlined />, group: "Studio", section: "templates" },
  { label: "Media Library", path: "/media", icon: <PictureOutlined />, group: "Studio" },
  { label: "Training Hub", path: "/training", icon: <BookOutlined />, group: "Studio" },
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

/**
 * Fuzzy matcher: substring match scores highest, otherwise an ordered
 * subsequence match (only for queries of 2+ chars). Returns the matched
 * character indices so the UI can highlight them.
 */
const fuzzyMatch = (query: string, text: string): { score: number; indices: number[] } | null => {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return null;

  const at = t.indexOf(q);
  if (at !== -1) {
    const indices = Array.from({ length: q.length }, (_, i) => at + i);
    const score = 100 - at + (at === 0 ? 20 : 0) + (t.length === q.length ? 50 : 0);
    return { score, indices };
  }

  if (q.replace(/\s/g, "").length < 2) return null;

  const indices: number[] = [];
  let cursor = 0;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, cursor);
    if (found === -1) return null;
    indices.push(found);
    cursor = found + 1;
  }

  return { score: 40 - (indices[indices.length - 1] - indices[0]), indices };
};

const findBestMatch = (spoken: string, items: PaletteItem[]) => {
  const query = spoken.trim().toLowerCase();
  if (!query) return null;

  const exact = items.find((item) => item.label.toLowerCase() === query);
  if (exact) return exact;

  const contains = items.find(
    (item) =>
      query.includes(item.label.toLowerCase()) ||
      item.label.toLowerCase().includes(query) ||
      (item.keywords ? item.keywords.toLowerCase().split(/\s+/).some((word) => word.length > 3 && query.includes(word)) : false)
  );
  if (contains) return contains;

  return (
    items.find((item) =>
      item.label
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.length > 2 && query.includes(word))
    ) || null
  );
};

const Highlight = ({ text, indices }: { text: string; indices?: number[] }) => {
  if (!indices || indices.length === 0) return <>{text}</>;
  const marked = new Set(indices);

  return (
    <>
      {text.split("").map((char, index) =>
        marked.has(index) ? (
          <mark key={index} className="command-mark">
            {char}
          </mark>
        ) : (
          <span key={index}>{char}</span>
        )
      )}
    </>
  );
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

  // Backend-driven assignment notifications (the ones TeamAssignmentPage
  // actually POSTs to /studio/notifications).
  const {
    notifications: backendNotifications,
    refresh: refreshBackendNotifications,
    markRead: markBackendNotificationRead,
  } = useAssignmentNotifications(true);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [upcomingEventsOpen, setUpcomingEventsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const pendingApprovalsRef = useRef<HTMLDivElement | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const recognitionRef = useRef<any>(null);
  const voiceItemsRef = useRef<PaletteItem[]>([]);

  const [pendingDeleteUsers, setPendingDeleteUsers] = useState<any[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [pendingApprovalsOpen, setPendingApprovalsOpen] = useState(false);

  const [now, setNow] = useState(dayjs());
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const upcomingEvents = useMemo<UpcomingItem[]>(() => {
    // Backend assignment notifications first — not date-filtered, since
    // filtering them like calendar entries made assignments silently vanish.
    const fromBackend: UpcomingItem[] = backendNotifications.map((n: any) => ({
      id: n.id,
      date: n.date,
      title: n.title,
      time: n.time || "",
      description: n.description,
      _source: "backend",
      _read: n.read,
    }));

    const fromCalendar: UpcomingItem[] = Object.entries(events)
      .filter(([date]) => {
        const eventDate = dayjs(date);
        return eventDate.isSame(dayjs(), "day") || eventDate.isAfter(dayjs(), "day");
      })
      .sort(([firstDate], [secondDate]) => dayjs(firstDate).valueOf() - dayjs(secondDate).valueOf())
      .flatMap(([date, dayEvents]) => {
        if (!Array.isArray(dayEvents)) return [];
        return dayEvents.map((event, index) => ({
          ...normalizeEvent(event, date, index),
          _source: "calendar" as const,
        }));
      });

    const fromGeneric: UpcomingItem[] = genericNotifications
      .filter((item: any) => {
        const itemDate = dayjs(item.date);
        return itemDate.isSame(dayjs(), "day") || itemDate.isAfter(dayjs(), "day");
      })
      .map((item: any) => ({
        id: item.id,
        date: item.date,
        title: item.title,
        time: item.time,
        description: item.description,
        _source: "generic" as const,
      }));

    return [...fromBackend, ...fromGeneric, ...fromCalendar];
  }, [events, genericNotifications, backendNotifications]);

  const unreadItems = useMemo(
    () => upcomingEvents.filter((item) => item._source === "backend" && item._read === false),
    [upcomingEvents]
  );
  const unreadCount = unreadItems.length;
  const visibleNotifications = notifFilter === "unread" ? unreadItems : upcomingEvents;

  const refreshEvents = () => {
    setEvents(getSavedEvents());
    setGenericNotifications(getStoredNotifications());
    refreshBackendNotifications();
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
    setNotifFilter("all");
    setUpcomingEventsOpen(true);
    setMiniCalendarOpen(false);
    setUserMenuOpen(false);
    setPendingApprovalsOpen(false);
  };

  const markAllNotificationsRead = () => {
    unreadItems.forEach((item) => markBackendNotificationRead(item.id));
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
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

  const openNotificationDetail = (eventId: string, source?: NotificationSource) => {
    setUpcomingEventsOpen(false);
    if (source === "backend") {
      markBackendNotificationRead(eventId);
    }
    navigate(`/notification/${eventId}`);
  };

  /* ---------------- Command palette data ---------------- */

  const pageItems: PaletteItem[] = PAGES.map((page) => ({
    id: `page:${page.path}`,
    label: page.label,
    group: page.group,
    icon: page.icon,
    path: page.path,
    run: () => navigate(page.path),
  }));

  const actionItems: PaletteItem[] = [
    {
      id: "action:theme",
      label: darkMode ? "Switch to light mode" : "Switch to dark mode",
      group: "Actions",
      icon: darkMode ? <SunOutlined /> : <MoonOutlined />,
      keywords: "theme dark light mode appearance toggle",
      run: onToggleTheme,
    },
    {
      id: "action:calendar",
      label: "Open full calendar",
      group: "Actions",
      icon: <CalendarOutlined />,
      keywords: "calendar schedule month",
      run: openFullCalendar,
    },
    {
      id: "action:notifications",
      label: "View notifications",
      group: "Actions",
      icon: <BellOutlined />,
      keywords: "alerts assignments inbox bell",
      run: openUpcomingEvents,
    },
    {
      id: "action:refresh",
      label: "Refresh notifications",
      group: "Actions",
      icon: <ReloadOutlined />,
      keywords: "reload sync update",
      run: refreshEvents,
    },
    {
      id: "action:tour",
      label: "Start studio tour",
      group: "Actions",
      icon: <CompassOutlined />,
      keywords: "guide help walkthrough onboarding",
      run: startTour,
    },
    {
      id: "action:fullscreen",
      label: isFullscreen ? "Exit fullscreen" : "Enter fullscreen",
      group: "Actions",
      icon: isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />,
      keywords: "full screen maximize",
      run: toggleFullscreen,
    },
    {
      id: "action:profile",
      label: "Open profile",
      group: "Account",
      icon: <ProfileOutlined />,
      keywords: "account me user",
      run: openProfileModal,
    },
    {
      id: "action:notification-settings",
      label: "Notification settings",
      group: "Account",
      icon: <SettingOutlined />,
      keywords: "preferences alerts",
      run: openNotificationSettings,
    },
    {
      id: "action:logout",
      label: "Log out",
      group: "Account",
      icon: <LogoutOutlined />,
      keywords: "sign out exit",
      run: handleLogout,
    },
  ];

  voiceItemsRef.current = [...pageItems, ...actionItems];

  const paletteQueryTrimmed = paletteQuery.trim();

  const results: ResultItem[] = (() => {
    if (!paletteQueryTrimmed) {
      return [...pageItems, ...actionItems];
    }

    const notificationItems: PaletteItem[] = upcomingEvents.slice(0, 25).map((event) => ({
      id: `notif:${event._source}:${event.id}`,
      label: event.title,
      group: "Notifications",
      icon: <BellOutlined />,
      hint: `${dayjs(event.date).format("DD MMM")}${event.time ? ` · ${event.time}` : ""}`,
      run: () => openNotificationDetail(event.id, event._source),
    }));

    const scored: Array<{ item: ResultItem; score: number; order: number }> = [];

    [...pageItems, ...actionItems, ...notificationItems].forEach((item, order) => {
      const match = fuzzyMatch(paletteQueryTrimmed, item.label);

      if (match) {
        scored.push({ item: { ...item, indices: match.indices }, score: match.score, order });
      } else if (item.keywords?.toLowerCase().includes(paletteQueryTrimmed.toLowerCase())) {
        scored.push({ item, score: 30, order });
      }
    });

    scored.sort((a, b) => b.score - a.score || a.order - b.order);
    return scored.map((entry) => entry.item);
  })();

  const runItem = (item: PaletteItem) => {
    closePalette();
    item.run();
  };

  /* ---------------- Voice search ---------------- */

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
        const match = findBestMatch(transcript, voiceItemsRef.current);

        if (match) {
          setVoiceStatus(`Heard "${transcript.trim()}" — ${match.label}…`);
          runItem(match);
        } else {
          setVoiceStatus(`Heard "${transcript.trim()}" — no matching page or action found.`);
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

  /* ---------------- Effects ---------------- */

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
        // ignore polling errors
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
        // ignore polling errors
      }
    };

    loadPendingRegistrations();
    const intervalId = window.setInterval(loadPendingRegistrations, PENDING_DELETE_POLL_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user?.role]);

  // Global shortcuts: Ctrl/Cmd + K toggles the palette, "/" opens it, Esc closes things.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !paletteOpen) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        const isTyping =
          tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;

        if (!isTyping) {
          event.preventDefault();
          openPalette();
        }
        return;
      }

      if (event.key === "Escape") {
        if (paletteOpen) {
          closePalette();
        } else if (upcomingEventsOpen) {
          setUpcomingEventsOpen(false);
        } else {
          setMiniCalendarOpen(false);
          setUserMenuOpen(false);
          setPendingApprovalsOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paletteOpen, upcomingEventsOpen]);

  // Focus the input on open, restore focus to whatever opened the palette on close.
  useEffect(() => {
    if (paletteOpen) {
      lastFocusRef.current = document.activeElement as HTMLElement | null;
      paletteInputRef.current?.focus();
    } else {
      lastFocusRef.current?.focus?.();
      lastFocusRef.current = null;
    }
  }, [paletteOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [paletteQuery]);

  // Keep the highlighted result visible while arrowing through the list.
  useEffect(() => {
    if (!paletteOpen) return;
    document.getElementById(`cmd-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, paletteOpen]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  // Live clock
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(dayjs()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Online / offline indicator
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      refreshBackendNotifications();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Fullscreen state
  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // Compact navbar once the page scrolls
  useEffect(() => {
    let ticking = false;

    const update = () => {
      const next = window.scrollY > 8;
      setScrolled((previous) => (previous === next ? previous : next));
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handlePaletteKeyDown = (event: ReactKeyboardEvent) => {
    const total = Math.max(results.length, 1);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % total);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + total) % total);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(total - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) runItem(selected);
    }
  };

  // Keep Tab focus inside the palette (input, mic, close).
  const handlePaletteTrap = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const focusable = event.currentTarget.querySelectorAll<HTMLElement>("[data-trap]");
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <header
        className={`top-navbar ${darkMode ? "navbar-dark" : "navbar-light"} ${
          scrolled ? "is-scrolled" : ""
        }`}
      >
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
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K"
          >
            <SearchOutlined className="command-trigger-icon" />
            <span className="command-trigger-text">Search or jump to…</span>
            <span className="command-trigger-kbd" aria-hidden="true">Ctrl K</span>
          </button>
        </div>

        <div className="navbar-actions">
          {!isOnline && (
            <span className="nav-offline" role="status">
              <DisconnectOutlined />
              <span className="nav-offline-text">Offline</span>
            </span>
          )}

          <time className="nav-clock" dateTime={now.toISOString()}>
            <strong>{now.format("hh:mm A")}</strong>
            <small>{now.format("ddd, DD MMM")}</small>
          </time>

          <LanguageSwitcher />

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
              aria-expanded={miniCalendarOpen}
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
                    aria-label="Previous month"
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
                    aria-label="Next month"
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
                aria-expanded={pendingApprovalsOpen}
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
            className={`nav-icon-button notification-button ${unreadCount > 0 ? "has-unread" : ""}`}
            onClick={openUpcomingEvents}
            aria-label={
              upcomingEvents.length > 0
                ? `Open notifications, ${upcomingEvents.length} total${
                    unreadCount > 0 ? `, ${unreadCount} unread` : ""
                  }`
                : "Open notifications"
            }
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
            className="nav-icon-button nav-fullscreen"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            <span className="nav-tooltip">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
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
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
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
              <div className="nav-user-dropdown" role="menu">
                <button type="button" role="menuitem" onClick={openProfileModal}>
                  <ProfileOutlined />
                  Profile
                </button>

                <button type="button" role="menuitem" onClick={openNotificationSettings}>
                  <SettingOutlined />
                  Notification Settings
                </button>

                <button type="button" role="menuitem" className="logout-option" onClick={handleLogout}>
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
          <div
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handlePaletteTrap}
          >
            <div className="command-input-row">
              <SearchOutlined className="command-input-icon" />
              <input
                ref={paletteInputRef}
                data-trap
                type="text"
                className="command-input"
                placeholder="Search pages, actions, notifications — or tap the mic…"
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                onKeyDown={handlePaletteKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-listbox"
                aria-autocomplete="list"
                aria-activedescendant={results[activeIndex] ? `cmd-opt-${activeIndex}` : undefined}
              />

              <button
                type="button"
                data-trap
                className={`command-mic-button ${isListening ? "listening" : ""}`}
                onClick={handleMicClick}
                aria-label={isListening ? "Stop voice search" : "Start voice search"}
              >
                {isListening ? <AudioMutedOutlined /> : <AudioOutlined />}
              </button>

              <button type="button" data-trap className="command-close" onClick={closePalette} aria-label="Close search">
                <CloseOutlined />
              </button>
            </div>

            <div className="command-voice-status" role="status" aria-live="polite" hidden={!voiceStatus}>
              {voiceStatus}
            </div>

            <div className="command-results" id="cmd-listbox" role="listbox" aria-label="Results">
              {results.length > 0 ? (
                results.map((item, index) => {
                  const isActive = Boolean(item.path) && location.pathname === item.path;
                  const isHighlighted = index === activeIndex;
                  const showGroup = !paletteQueryTrimmed && item.group !== results[index - 1]?.group;

                  return (
                    <div key={item.id} className="command-row">
                      {showGroup && (
                        <div className="command-group-label" role="presentation">
                          {item.group === "Actions" && <ThunderboltOutlined />}
                          {item.group}
                        </div>
                      )}

                      <button
                        type="button"
                        id={`cmd-opt-${index}`}
                        role="option"
                        aria-selected={isHighlighted}
                        tabIndex={-1}
                        className={`command-item ${isHighlighted ? "highlighted" : ""} ${
                          isActive ? "current" : ""
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => runItem(item)}
                      >
                        <span className="command-item-icon">{item.icon}</span>

                        <span className="command-item-text">
                          <strong>
                            <Highlight text={item.label} indices={item.indices} />
                          </strong>
                          <small>{paletteQueryTrimmed ? `${item.group}${item.hint ? ` · ${item.hint}` : ""}` : item.hint || item.group}</small>
                        </span>

                        {isActive && <span className="command-item-current">Current</span>}
                        {isHighlighted && !isActive && (
                          <EnterOutlined className="command-item-enter" />
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="command-empty">No results for "{paletteQuery}".</div>
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
              <span className="command-footer-end">
                <span className="command-key">Ctrl K</span> toggle
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

              <button type="button" onClick={() => setProfileModalOpen(false)} aria-label="Close profile">
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
          <div
            className="nav-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="nav-modal-head">
              <h3 id="notif-modal-title">Notifications</h3>

              <button type="button" onClick={() => setUpcomingEventsOpen(false)} aria-label="Close notifications">
                <CloseOutlined />
              </button>
            </div>

            {upcomingEvents.length > 0 && (
              <div className="notif-toolbar">
                <div className="notif-tabs" role="tablist" aria-label="Notification filter">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={notifFilter === "all"}
                    className={`notif-tab ${notifFilter === "all" ? "active" : ""}`}
                    onClick={() => setNotifFilter("all")}
                  >
                    All <span>{upcomingEvents.length}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={notifFilter === "unread"}
                    className={`notif-tab ${notifFilter === "unread" ? "active" : ""}`}
                    onClick={() => setNotifFilter("unread")}
                  >
                    Unread <span>{unreadCount}</span>
                  </button>
                </div>

                {unreadCount > 0 && (
                  <button type="button" className="notif-markall" onClick={markAllNotificationsRead}>
                    <CheckOutlined /> Mark all read
                  </button>
                )}
              </div>
            )}

            {visibleNotifications.length > 0 ? (
              <div className="upcoming-events-list">
                {visibleNotifications.map((event) => (
                  <div
                    className={`upcoming-event-card ${event._source === "backend" && event._read === false ? "is-unread" : ""}`}
                    key={`${event._source}-${event.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openNotificationDetail(event.id, event._source)}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                        keyEvent.preventDefault();
                        openNotificationDetail(event.id, event._source);
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
                {notifFilter === "unread" ? <CheckOutlined /> : <CalendarOutlined />}
                <h4>{notifFilter === "unread" ? "You're all caught up" : "No upcoming events"}</h4>
                <p>
                  {notifFilter === "unread"
                    ? "New assignments will show up here."
                    : "Your calendar events will appear here."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;