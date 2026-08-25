import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {Avatar,Badge,Button,Card,Col,ConfigProvider,DatePicker,Drawer,Empty,Form,Input,InputNumber,message,Progress,Row,Segmented,Select,Space,Statistic,Table,Tag,Tooltip,Typography,} from "antd";
import {ArrowRightOutlined,CalendarOutlined,CameraOutlined,CheckCircleOutlined,ClockCircleOutlined,CloseOutlined,DollarOutlined,EnvironmentOutlined,EyeOutlined,FireOutlined,HistoryOutlined,HourglassOutlined,PictureOutlined,PlusOutlined,QuestionCircleOutlined,RiseOutlined,RocketOutlined,SafetyCertificateOutlined,SearchOutlined,SunOutlined,TeamOutlined,ThunderboltFilled,UsergroupAddOutlined,VideoCameraOutlined,} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import "./DashboardPage.css";

const { Title, Text } = Typography;
const { Search } = Input;

const THEME_COLOR = "#38BDF8";
const TODAY_ANCHOR = "2026-04-30";

// Studio location for the Golden Hour & Weather widget — replace with the
// studio's actual coordinates or wire up to a saved settings value later.
const STUDIO_LAT = 13.0827;
const STUDIO_LON = 80.2707;
const STUDIO_LABEL = "Chennai";

const featureCards = [
  { title: "Shoots", value: "18", icon: <CameraOutlined />, background: "linear-gradient(135deg, #38BDF8, #2563eb)" },
  { title: "Views", value: "12.8K", icon: <EyeOutlined />, background: "linear-gradient(135deg, #38BDF8, #06b6d4)" },
  { title: "Frames", value: "64", icon: <PictureOutlined />, background: "linear-gradient(135deg, #38BDF8, #22c55e)" },
  { title: "Bookings", value: "+27%", icon: <FireOutlined />, background: "linear-gradient(135deg, #38BDF8, #f59e0b)" },
];

const initialEventsData = [
  { key: "1", id: "EVT-001", name: "Portfolio Shoot", studio: "Main Studio", date: "2026-05-02", status: "Pending", priority: "High", client: "ApertureX Client", budget: "Rs. 18,000" },
  { key: "2", id: "EVT-002", name: "Product Campaign", studio: "Creative Bay", date: "2026-05-08", status: "Confirmed", priority: "Medium", client: "Brand Studio", budget: "Rs. 42,000" },
];

const metricCards = [
  { title: "Users", value: 1042, suffix: "", percent: 100, icon: <UsergroupAddOutlined />, color: "#38BDF8" },
  { title: "Events", value: 2, suffix: "", percent: 40, icon: <VideoCameraOutlined />, color: "#f59e0b" },
  { title: "Health", value: 98, suffix: "%", percent: 98, icon: <SafetyCertificateOutlined />, color: "#06b6d4" },
  { title: "Profile", value: 82, suffix: "%", percent: 82, icon: <CheckCircleOutlined />, color: "#22c55e" },
  { title: "Revenue", value: 180000, suffix: "Rs", percent: 76, icon: <DollarOutlined />, color: "#14b8a6" },
  { title: "Leads", value: 36, suffix: "", percent: 64, icon: <TeamOutlined />, color: "#38BDF8" },
];

const teamPulse = [
  { name: "You", status: "online" as const },
  { name: "Priya · Lead", status: "on-shoot" as const },
  { name: "Arjun · Editor", status: "online" as const },
  { name: "Meera · Assist", status: "offline" as const },
  { name: "Divya · Retouch", status: "online" as const },
];

const statusLabel: Record<string, string> = {
  online: "Online",
  "on-shoot": "On a shoot",
  offline: "Offline",
};

const getGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Burning the midnight oil";
};

/*  Confetti — lightweight canvas burst, no dependency  */

const triggerConfetti = () => {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  const colors = ["#38bdf8", "#22c55e", "#f59e0b", "#f472b6", "#a78bfa"];
  const particles = Array.from({ length: 120 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 120,
    y: canvas.height * 0.32,
    vx: (Math.random() - 0.5) * 9,
    vy: Math.random() * -9 - 3,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 14,
    gravity: 0.24 + Math.random() * 0.1,
  }));

  let frame = 0;
  const maxFrames = 110;

  const animate = () => {
    frame += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      particle.vy += particle.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.spin;

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.rotation * Math.PI) / 180);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
      ctx.restore();
    });

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(canvas);
    }
  };

  requestAnimationFrame(animate);
};

/*  GoldenHourWeather — live Open-Meteo fetch, no API key required  */

interface WeatherState {
  temperature: number;
  windSpeed: number;
  sunset: string;
  goldenHourStart: string;
  loading: boolean;
  error: boolean;
}

const GoldenHourWeather = () => {
  const [weather, setWeather] = useState<WeatherState>({
    temperature: 0,
    windSpeed: 0,
    sunset: "",
    goldenHourStart: "",
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${STUDIO_LAT}&longitude=${STUDIO_LON}&current_weather=true&daily=sunrise,sunset&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();

        if (cancelled) return;

        const sunsetISO: string = data?.daily?.sunset?.[0];
        const sunsetDate = sunsetISO ? new Date(sunsetISO) : null;
        const goldenHourDate = sunsetDate ? new Date(sunsetDate.getTime() - 60 * 60 * 1000) : null;

        setWeather({
          temperature: data?.current_weather?.temperature ?? 0,
          windSpeed: data?.current_weather?.windspeed ?? 0,
          sunset: sunsetDate ? sunsetDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—",
          goldenHourStart: goldenHourDate ? goldenHourDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—",
          loading: false,
          error: false,
        });
      } catch {
        if (!cancelled) {
          setWeather((current) => ({ ...current, loading: false, error: true }));
        }
      }
    };

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="weather-wrap">
      <div className="weather-location">
        <EnvironmentOutlined />
        <Text type="secondary" style={{ fontSize: 12 }}>{STUDIO_LABEL}</Text>
      </div>

      {weather.loading ? (
        <Text type="secondary" style={{ fontSize: 13 }}>Fetching conditions…</Text>
      ) : weather.error ? (
        <Text type="secondary" style={{ fontSize: 13 }}>Weather unavailable right now</Text>
      ) : (
        <div className="weather-body">
          <div className="weather-temp-row">
            <SunOutlined className="weather-sun-icon" />
            <Title level={2} className="weather-temp-value">{Math.round(weather.temperature)}°C</Title>
          </div>

          <Text type="secondary" style={{ fontSize: 12 }}>Wind {Math.round(weather.windSpeed)} km/h</Text>

          <div className="weather-golden-row">
            <div className="weather-golden-chip">
              <Text type="secondary" style={{ fontSize: 11 }}>Golden hour starts</Text>
              <strong>{weather.goldenHourStart}</strong>
            </div>
            <div className="weather-golden-chip">
              <Text type="secondary" style={{ fontSize: 11 }}>Sunset</Text>
              <strong>{weather.sunset}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/*  NextShootCountdown  */

interface CountdownEvent {
  name: string;
  date: string;
  studio: string;
}

interface NextShootCountdownProps {
  events: CountdownEvent[];
  now: Date;
}

const COUNTDOWN_WINDOW_DAYS = 14;

const NextShootCountdown = ({ events, now }: NextShootCountdownProps) => {
  const nextEvent = useMemo(() => {
    const upcoming = events
      .map((event) => ({ ...event, dateObj: dayjs(event.date) }))
      .filter((event) => event.dateObj.isAfter(dayjs(now)))
      .sort((a, b) => a.dateObj.valueOf() - b.dateObj.valueOf());

    return upcoming[0] || null;
  }, [events, now]);

  if (!nextEvent) {
    return (
      <div className="countdown-empty">
        <HourglassOutlined style={{ fontSize: 26, color: "#38bdf8" }} />
        <Text type="secondary" style={{ fontSize: 13 }}>No upcoming shoots scheduled</Text>
      </div>
    );
  }

  const diffMs = nextEvent.dateObj.valueOf() - now.valueOf();
  const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const windowMinutes = COUNTDOWN_WINDOW_DAYS * 24 * 60;
  const percentElapsed = Math.min(100, Math.round(((windowMinutes - totalMinutes) / windowMinutes) * 100));

  return (
    <div className="countdown-wrap">
      <Progress
        type="circle"
        percent={Math.max(0, percentElapsed)}
        size={116}
        strokeColor={{ "0%": "#38bdf8", "100%": "#22c55e" }}
        railColor="rgba(255,255,255,0.08)"
        format={() => (
          <div className="countdown-ring-label">
            <strong>{days}</strong>
            <span>days</span>
          </div>
        )}
      />

      <div className="countdown-details">
        <Text strong className="countdown-event-name">{nextEvent.name}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{nextEvent.studio}</Text>

        <Space size={6} className="countdown-time-chips">
          <Tag>{days}d</Tag>
          <Tag>{hours}h</Tag>
          <Tag>{minutes}m</Tag>
        </Space>
      </div>
    </div>
  );
};

/*  TeamPulse  */

interface TeamMember {
  name: string;
  status: "online" | "on-shoot" | "offline";
}

const TeamPulseGrid = ({ members }: { members: TeamMember[] }) => {
  return (
    <div className="team-pulse-grid">
      {members.map((member) => (
        <div key={member.name} className="team-pulse-item">
          <div className={`team-pulse-avatar-wrap team-pulse-${member.status}`}>
            <Avatar
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
              size={44}
            />
            <span className="team-pulse-dot" />
          </div>
          <Text style={{ fontSize: 11 }} type="secondary">{member.name}</Text>
          <Text style={{ fontSize: 10 }} className={`team-pulse-status-text team-pulse-text-${member.status}`}>
            {statusLabel[member.status]}
          </Text>
        </div>
      ))}
    </div>
  );
};

/*  SpeedDialFab — vertical, contained, no off-screen overflow  */

interface SpeedDialAction {
  key: string;
  label: string;
  icon: ReactNode;
  run: () => void;
}

interface SpeedDialFabProps {
  actions: SpeedDialAction[];
}

const SpeedDialFab = ({ actions }: SpeedDialFabProps) => {
  const [open, setOpen] = useState(false);

  const handleAction = (run: () => void) => {
    run();
    setOpen(false);
  };

  return (
    <div className="speed-dial-root">
      <AnimatePresence>
        {open ? (
          <motion.div
            className="speed-dial-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <div className="speed-dial-stack">
            {actions.map((action, index) => (
              <motion.button
                key={action.key}
                className="speed-dial-item"
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ delay: index * 0.045, type: "spring", stiffness: 320, damping: 24 }}
                onClick={() => handleAction(action.run)}
              >
                <span className="speed-dial-item-icon">{action.icon}</span>
                <span className="speed-dial-item-label">{action.label}</span>
              </motion.button>
            ))}
          </div>
        ) : null}
      </AnimatePresence>

      <motion.button
        className="speed-dial-main"
        onClick={() => setOpen((current) => !current)}
        animate={{ rotate: open ? 45 : 0 }}
        whileTap={{ scale: 0.92 }}
      >
        {open ? <CloseOutlined /> : <RocketOutlined />}
      </motion.button>
    </div>
  );
};

/*  CustomModal */

interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

const CustomModal = ({ open, onClose, width = 620, children }: CustomModalProps) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm-panel creative-modal" style={{ maxWidth: width }}>
        <button className="cm-close" onClick={onClose} aria-label="Close">
          <CloseOutlined />
        </button>
        {children}
      </div>
    </div>
  );
};

interface EventFormValues {
  name: string;
  studio: string;
  client: string;
  date: dayjs.Dayjs;
  priority: "High" | "Medium" | "Low";
  budget: number;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: any) => state.auth);
  const displayEmail = user?.email || "guest@apenturexstudios.com";
  const displayName = displayEmail.split("@")[0];

  const [featureIndex, setFeatureIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const [eventsData, setEventsData] = useState(initialEventsData);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm<EventFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const userData = useMemo(
    () => [
      {
        key: "1",
        name: displayName,
        email: displayEmail,
        phone: user?.phone || "N/A",
        createdAt: user?.createdAt || "2026-04-15",
        role: user?.role || "Studio Admin",
      },
    ],
    [displayName, displayEmail, user]
  );

  const pulseItems = useMemo(() => {
    return [
      ...eventsData.map(
        (event) => `${event.name} at ${event.studio} scheduled for ${dayjs(event.date).format("D MMM")} · ${event.priority} priority`
      ),
      `${userData.length} studio admin${userData.length === 1 ? "" : "s"} active right now`,
      "12.8K portfolio views this month · +27% bookings",
      "64 frames delivered across all active shoots",
    ];
  }, [eventsData, userData]);

  useEffect(() => {
    const featureTimer = setInterval(() => {
      setFeatureIndex((current) => (current + 1) % featureCards.length);
    }, 4200);

    return () => clearInterval(featureTimer);
  }, []);

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isTyping) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        createForm.resetFields();
        setCreateModalOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createForm]);

  const filteredUsers = useMemo(() => {
    const value = searchText.toLowerCase();

    return userData.filter((user) =>
      [user.name, user.email, user.phone, user.role].some((field) =>
        field.toLowerCase().includes(value)
      )
    );
  }, [searchText, userData]);

  const filteredEvents = useMemo(() => {
    const value = searchText.toLowerCase();

    return eventsData.filter((event) => {
      const matchesSearch = [
        event.id,
        event.name,
        event.studio,
        event.status,
        event.priority,
        event.client,
      ].some((field) => field.toLowerCase().includes(value));

      if (!matchesSearch) return false;
      if (dateFilter === "All") return true;

      const today = new Date(TODAY_ANCHOR);
      const eventDate = new Date(event.date);
      const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (dateFilter === "Today") return diffDays === 0;
      if (dateFilter === "Week") return diffDays >= 0 && diffDays <= 7;
      if (dateFilter === "Month") return diffDays >= 0 && diffDays <= 30;

      return true;
    });
  }, [searchText, dateFilter, eventsData]);

  // ---- Navigation handlers ----
  const goToUsersPage = () => navigate("/users");
  const goToEventPage = (eventId?: string) => {
    if (eventId) {
      navigate(`/events/${eventId}`);
    } else {
      navigate("/events");
    }
  };

  // ---- Create Event modal handlers ----
  const openCreateModal = () => {
    createForm.resetFields();
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setCreateModalOpen(false);
  };

  const handleCreateEvent = async (values: EventFormValues) => {
    setSubmitting(true);
    try {
      const newEvent = {
        key: String(eventsData.length + 1),
        id: `EVT-${String(eventsData.length + 1).padStart(3, "0")}`,
        name: values.name,
        studio: values.studio,
        date: values.date.format("YYYY-MM-DD"),
        status: "Pending",
        priority: values.priority,
        client: values.client,
        budget: `Rs. ${Number(values.budget).toLocaleString("en-IN")}`,
      };

      setEventsData((prev) => [newEvent, ...prev]);
      message.success("Event created successfully");
      triggerConfetti();
      setCreateModalOpen(false);
      createForm.resetFields();
    } finally {
      setSubmitting(false);
    }
  };

  const userColumns = [
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Space>
          <Avatar
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${text}`}
            style={{ background: THEME_COLOR }}
          />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Admin
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (value: string) => <Text type="secondary">{value}</Text>,
    },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => <Tag>{date}</Tag>,
    },
  ];

  const eventColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text code>{id}</Text>,
    },
    {
      title: "Shoot",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    { title: "Studio", dataIndex: "studio", key: "studio" },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => (
        <Space>
          <CalendarOutlined style={{ color: THEME_COLOR }} />
          <Text>{date}</Text>
        </Space>
      ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => (
        <Tag color={priority === "High" ? "red" : priority === "Medium" ? "gold" : "blue"}>
          {priority}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const confirmed = status === "Confirmed";

        return (
          <Badge
            status={confirmed ? "processing" : "warning"}
            text={
              <Text strong style={{ color: confirmed ? "#38BDF8" : "#f59e0b" }}>
                {status}
              </Text>
            }
          />
        );
      },
    },
  ];

  const speedDialActions: SpeedDialAction[] = [
    { key: "create", label: "New Event", icon: <PlusOutlined />, run: openCreateModal },
    { key: "users", label: "Users", icon: <UsergroupAddOutlined />, run: goToUsersPage },
    { key: "events", label: "Events", icon: <VideoCameraOutlined />, run: () => goToEventPage() },
    { key: "shortcuts", label: "Shortcuts", icon: <QuestionCircleOutlined />, run: () => setShortcutsOpen(true) },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: THEME_COLOR,
          borderRadius: 16,
          colorBgContainer: "#202024",
          colorText: "#f8f8f4",
          colorTextSecondary: "#a4a4aa",
          fontFamily:
            "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        },
        components: {
          Card: { borderRadiusLG: 16 },
          Table: {
            headerBg: "#242428",
            rowHoverBg: "rgba(56,189,248,0.08)",
          },
        },
      }}
    >
      <div className="dashboard-page-content">
        <div className="dashboard-page-top">
          <Title level={2}>Dashboard</Title>

          <Search
            placeholder="Search..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="dashboard-local-search"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="hero-card"
        >
          <div className="hero-overlay" />

          <div className="hero-content">
            <Space size={10} wrap>
              <Tag color="cyan">
                <ThunderboltFilled /> Live
              </Tag>

              <Tag className="live-clock-chip" icon={<ClockCircleOutlined />}>
                {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </Tag>
            </Space>

            <Title level={1}>
              {getGreeting(currentTime)}, {displayName}
            </Title>

            <div className="hero-mini-stats">
              <div>
                <CameraOutlined />
                <strong>18</strong>
                <span>Shoots</span>
              </div>

              <div>
                <EyeOutlined />
                <strong>12.8K</strong>
                <span>Views</span>
              </div>

              <div>
                <PictureOutlined />
                <strong>64</strong>
                <span>Frames</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="studio-pulse-bar">
          <Tag className="pulse-live-dot" color="processing">
            Pulse
          </Tag>

          <div className="pulse-track-mask">
            <div className="pulse-track">
              {[...pulseItems, ...pulseItems].map((item, index) => (
                <span key={`${item}-${index}`} className="pulse-item">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} xl={8}>
            <Card variant="borderless" className="feature-card" styles={{ body: { padding: 0 } }}>
              <div className="feature-stage">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={featureIndex}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.45 }}
                    className="feature-slide"
                    style={{ background: featureCards[featureIndex].background }}
                  >
                    <div className="feature-icon">{featureCards[featureIndex].icon}</div>

                    <Title level={1} className="feature-value">
                      {featureCards[featureIndex].value}
                    </Title>

                    <Text className="feature-label">
                      {featureCards[featureIndex].title}
                    </Text>
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={16}>
            <div className="horizontal-scroll-wrapper">
              <div className="horizontal-card-strip">
                {metricCards.map((item) => (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="horizontal-card-item"
                    onClick={() => {
                      if (item.title === "Users") goToUsersPage();
                      if (item.title === "Events") goToEventPage();
                    }}
                    style={{ cursor: item.title === "Users" || item.title === "Events" ? "pointer" : "default" }}
                  >
                    <Card variant="borderless" className="metric-card">
                      <div className="metric-top">
                        <div className="metric-icon" style={{ color: item.color }}>
                          {item.icon}
                        </div>

                        <Progress
                          type="circle"
                          percent={item.percent}
                          size={58}
                          strokeColor={item.color}
                          railColor="rgba(255,255,255,0.1)"
                          format={() => ""}
                        />
                      </div>

                      <Statistic
                        title={
                          <Text strong type="secondary">
                            {item.title}
                          </Text>
                        }
                        value={item.value}
                        suffix={item.suffix}
                        styles={{ content: { fontWeight: 800 } }}
                      />

                      <RiseOutlined style={{ color: item.color, fontSize: 20 }} />
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        <Row gutter={[24, 24]} className="insight-row">
          <Col xs={24} md={12} lg={8}>
            <Card
              title={
                <Space>
                  <SunOutlined className="inline-blue" />
                  Golden Hour & Weather
                </Space>
              }
              className="dashboard-panel"
            >
              <GoldenHourWeather />
            </Card>
          </Col>

          <Col xs={24} md={12} lg={8}>
            <Card
              title={
                <Space>
                  <HourglassOutlined className="inline-blue" />
                  Next Shoot
                </Space>
              }
              className="dashboard-panel"
            >
              <NextShootCountdown events={eventsData} now={currentTime} />
            </Card>
          </Col>

          <Col xs={24} md={24} lg={8}>
            <Card
              title={
                <Space>
                  <TeamOutlined className="inline-blue" />
                  Team Pulse
                </Space>
              }
              className="dashboard-panel"
            >
              <TeamPulseGrid members={teamPulse} />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <HistoryOutlined />
              Users
            </Space>
          }
          extra={
            <Button type="text" icon={<ArrowRightOutlined />} onClick={goToUsersPage} />
          }
          className="dashboard-panel"
        >
          <Table
            columns={userColumns}
            dataSource={filteredUsers}
            pagination={false}
            scroll={{ x: 760 }}
            onRow={() => ({
              onClick: goToUsersPage,
              style: { cursor: "pointer" },
            })}
          />
        </Card>

        <Card
          title={
            <Space>
              <VideoCameraOutlined className="inline-blue" />
              Events
            </Space>
          }
          extra={
            <Segmented
              value={dateFilter}
              onChange={setDateFilter}
              options={["Today", "Week", "Month", "All"]}
            />
          }
          className="dashboard-panel events-panel"
        >
          <Table
            columns={eventColumns}
            dataSource={filteredEvents}
            pagination={false}
            scroll={{ x: 900 }}
            onRow={(record) => ({
              onClick: () => setSelectedEvent(record),
              style: { cursor: "pointer" },
            })}
          />
        </Card>

        <Card
          title={
            <Space>
              <ThunderboltFilled className="inline-blue" />
              Schedule
            </Space>
          }
          extra={
            <Button
              type="primary"
              shape="circle"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            />
          }
          className="dashboard-panel schedule-panel"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            columns={eventColumns}
            dataSource={[]}
            pagination={false}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <div className="empty-schedule">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />

                  <Button
                    type="primary"
                    shape="circle"
                    icon={<PlusOutlined />}
                    onClick={openCreateModal}
                  />
                </div>
              ),
            }}
          />
        </Card>

        {/* Event details drawer */}
        <Drawer
          title="Event"
          open={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          size="default"
          extra={
            <Button
              type="primary"
              onClick={() => selectedEvent && goToEventPage(selectedEvent.id)}
            >
              View Full Details
            </Button>
          }
        >
          {selectedEvent ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Title level={4}>{selectedEvent.name}</Title>

              <Text>
                <strong>ID:</strong> {selectedEvent.id}
              </Text>

              <Text>
                <strong>Studio:</strong> {selectedEvent.studio}
              </Text>

              <Text>
                <strong>Date:</strong> {selectedEvent.date}
              </Text>

              <Text>
                <strong>Client:</strong> {selectedEvent.client}
              </Text>

              <Text>
                <strong>Budget:</strong> {selectedEvent.budget}
              </Text>

              <Tag color={selectedEvent.status === "Confirmed" ? "blue" : "gold"}>
                {selectedEvent.status}
              </Tag>
            </Space>
          ) : null}
        </Drawer>

        {/* Create Event modal — CustomModal, matches UsersPage edit modal styling */}
        <CustomModal open={createModalOpen} onClose={closeCreateModal} width={660}>
          <div className="modal-shell">
            <div className="modal-title-row">
              <Avatar className="modal-small-avatar">
                <CalendarOutlined />
              </Avatar>
              <Title level={3}>Create Event</Title>
            </div>

            <Form<EventFormValues>
              form={createForm}
              layout="vertical"
              requiredMark={false}
              onFinish={handleCreateEvent}
            >
              <div className="edit-form-grid">
                <Form.Item
                  name="name"
                  label="Shoot Name"
                  rules={[{ required: true, message: "Please enter a shoot name" }]}
                >
                  <Input placeholder="e.g. Portfolio Shoot" />
                </Form.Item>

                <Form.Item
                  name="studio"
                  label="Studio"
                  rules={[{ required: true, message: "Please enter a studio" }]}
                >
                  <Input placeholder="e.g. Main Studio" />
                </Form.Item>

                <Form.Item
                  name="client"
                  label="Client"
                  rules={[{ required: true, message: "Please enter a client name" }]}
                >
                  <Input placeholder="e.g. ApertureX Client" />
                </Form.Item>

                <Form.Item
                  name="date"
                  label="Date"
                  rules={[{ required: true, message: "Please select a date" }]}
                  initialValue={dayjs()}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item
                  name="priority"
                  label="Priority"
                  rules={[{ required: true, message: "Please select a priority" }]}
                  initialValue="Medium"
                >
                  <Select
                    classNames={{ popup: { root: "dark-select-dropdown" } }}
                    options={[
                      { value: "High", label: "High" },
                      { value: "Medium", label: "Medium" },
                      { value: "Low", label: "Low" },
                    ]}
                  />
                </Form.Item>

                <Form.Item
                  name="budget"
                  label="Budget (Rs.)"
                  rules={[
                    { required: true, message: "Please enter a budget" },
                    {
                      validator: (_, value) =>
                        value === undefined || value === null || value >= 0
                          ? Promise.resolve()
                          : Promise.reject(new Error("Budget cannot be negative")),
                    },
                  ]}
                >
                  <InputNumber style={{ width: "100%" }} min={0} placeholder="e.g. 18000" />
                </Form.Item>
              </div>

              <div className="modal-action-row">
                <Tooltip title="Discard event">
                  <Button className="modal-cancel-btn" onClick={closeCreateModal} disabled={submitting}>
                    Cancel
                  </Button>
                </Tooltip>
                <Tooltip title="Create event">
                  <Button
                    htmlType="submit"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    className="invite-btn-styled"
                    loading={submitting}
                  >
                    Create
                  </Button>
                </Tooltip>
              </div>
            </Form>
          </div>
        </CustomModal>

        {/* Keyboard shortcuts overlay */}
        <CustomModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} width={420}>
          <div className="modal-shell shortcuts-modal">
            <div className="modal-title-row">
              <Avatar className="modal-small-avatar">
                <QuestionCircleOutlined />
              </Avatar>
              <Title level={3}>Shortcuts</Title>
            </div>

            <div className="shortcut-row">
              <span>Command palette</span>
              <Tag>Ctrl / ⌘ + K</Tag>
            </div>
            <div className="shortcut-row">
              <span>New event</span>
              <Tag>N</Tag>
            </div>
            <div className="shortcut-row">
              <span>Show shortcuts</span>
              <Tag>?</Tag>
            </div>
            <div className="shortcut-row">
              <span>Close panel</span>
              <Tag>Esc</Tag>
            </div>
          </div>
        </CustomModal>

        <SpeedDialFab actions={speedDialActions} />
      </div>
    </ConfigProvider>
  );
};

export default DashboardPage;