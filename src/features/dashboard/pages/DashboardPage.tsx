import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Button, Card, Col, ConfigProvider, Drawer, Empty, Input,
  message, Modal, Progress, Row, Segmented, Space, Statistic, Table, Tag,
  Tooltip, Typography,
} from "antd";
import {
  ArrowRightOutlined, CalendarOutlined, CameraOutlined, CheckCircleOutlined,
  CloseOutlined, ClockCircleOutlined, CopyOutlined, DeleteOutlined,
  DollarOutlined, EnvironmentOutlined, EyeOutlined, FireOutlined,
  FlagOutlined, HistoryOutlined, HourglassOutlined, PhoneOutlined,
  PictureOutlined, PlusOutlined, QuestionCircleOutlined, RiseOutlined,
  RocketOutlined, SafetyCertificateOutlined, SearchOutlined, SunOutlined,
  TeamOutlined, ThunderboltFilled, UsergroupAddOutlined, UserOutlined,
  VideoCameraOutlined, BulbOutlined,
} from "@ant-design/icons";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "./DashboardPage.css";
// Adjust this path if DashboardPage sits at a different depth than EventPage
import { getEvents } from "../../../redux/actions/eventActions";
import PipelineEventPanel from "./PipelineEventPanel";

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { Search } = Input;

const THEME_COLOR = "#38BDF8";

const STUDIO_LAT = 13.0827;
const STUDIO_LON = 80.2707;
const STUDIO_LABEL = "Chennai";

const EVENTS_LIST_LIMIT = 5;

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

interface StudioEvent {
  id: string;
  name: string;
  type: string;
  date: string;
  time: string;
  address: string;
  city: string;
  customer: string;
  status: string;
  pipeline: string;
  members: number;
  budget: string;
  image?: string;
  location?: { lat: number; lng: number } | null;
}

interface ParsedStudioEvent extends StudioEvent {
  dateObj: dayjs.Dayjs;
}

/* ---------- Backend sync (same pattern as EventPage.tsx) ---------- */

async function patchEventOnServer(
  id: string,
  payload: Record<string, any>
): Promise<{ ok: boolean; message?: string }> {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/studio/events/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      return { ok: false, message: body?.message || "Server update failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error." };
  }
}

// NOTE: guessed endpoint — confirm this route exists on the backend.
async function deleteEventOnServer(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/studio/events/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || (body && body.success === false)) {
      return { ok: false, message: body?.message || "Server delete failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error." };
  }
}

const parseEventDateTime = (dateStr: string, timeStr?: string) => {
  if (timeStr) {
    const withTime = dayjs(`${dateStr} ${timeStr}`, "MMM D, YYYY hh:mm A", true);
    if (withTime.isValid()) return withTime;
  }

  const dateOnly = dayjs(dateStr, "MMM D, YYYY", true);
  if (dateOnly.isValid()) return dateOnly;

  return dayjs(dateStr);
};

// Converts free-form budget strings ("INR 1.8L", "INR 95K", "INR 18,000") to a plain number.
const parseBudgetToNumber = (budget?: string): number => {
  if (!budget) return 0;
  const cleaned = budget.replace(/INR/i, "").trim();
  const match = cleaned.match(/([\d,.]+)\s*([LlKk]?)/);
  if (!match) return 0;

  const numeric = parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(numeric)) return 0;

  const suffix = match[2].toUpperCase();
  if (suffix === "L") return numeric * 100000;
  if (suffix === "K") return numeric * 1000;
  return numeric;
};

const formatCompactINR = (value: number): string => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
};

const statusTagColor: Record<string, string> = {
  DRAFT: "default",
  PLANNED: "blue",
  LIVE: "green",
  DONE: "purple",
};

const getGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Burning the midnight oil";
};

// ---------------------------------------------------------------------------
// Shared weather hook — used by both the Golden Hour panel and the AI Briefing
// ---------------------------------------------------------------------------

interface WeatherState {
  temperature: number;
  windSpeed: number;
  sunset: string;
  goldenHourStart: string;
  loading: boolean;
  error: boolean;
}

const INITIAL_WEATHER: WeatherState = {
  temperature: 0,
  windSpeed: 0,
  sunset: "",
  goldenHourStart: "",
  loading: true,
  error: false,
};

const useGoldenHourWeather = () => {
  const [weather, setWeather] = useState<WeatherState>(INITIAL_WEATHER);

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

  return weather;
};

const GoldenHourWeather = ({ weather }: { weather: WeatherState }) => {
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

// ---------------------------------------------------------------------------
// Next shoot countdown
// ---------------------------------------------------------------------------

interface CountdownEvent {
  name: string;
  city: string;
  dateObj: dayjs.Dayjs;
}

interface NextShootCountdownProps {
  events: CountdownEvent[];
  now: Date;
}

const COUNTDOWN_WINDOW_DAYS = 14;

const NextShootCountdown = ({ events, now }: NextShootCountdownProps) => {
  const nextEvent = useMemo(() => {
    const upcoming = events
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
        <Text type="secondary" style={{ fontSize: 12 }}>{nextEvent.city}</Text>

        <Space size={6} className="countdown-time-chips">
          <Tag>{days}d</Tag>
          <Tag>{hours}h</Tag>
          <Tag>{minutes}m</Tag>
        </Space>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AI Daily Briefing — rule-based synthesis of today's shoots + conditions
// ---------------------------------------------------------------------------

interface AiBriefingProps {
  todaysEvents: ParsedStudioEvent[];
  tomorrowsEvents: ParsedStudioEvent[];
  weather: WeatherState;
  busiestUpcoming: ParsedStudioEvent | null;
}

const AiBriefingPanel = ({ todaysEvents, tomorrowsEvents, weather, busiestUpcoming }: AiBriefingProps) => {
  const insights = useMemo(() => {
    const lines: string[] = [];

    if (todaysEvents.length > 0) {
      const first = [...todaysEvents].sort((a, b) => a.dateObj.valueOf() - b.dateObj.valueOf())[0];
      lines.push(`${todaysEvents.length} shoot${todaysEvents.length > 1 ? "s" : ""} on today — first is "${first.name}" at ${first.time}.`);
    } else {
      lines.push("No shoots scheduled today — a good window to clear the editing backlog.");
    }

    if (!weather.loading && !weather.error) {
      lines.push(`Golden hour begins around ${weather.goldenHourStart} — line up outdoor portraits before then.`);

      if (weather.windSpeed > 20) {
        lines.push(`Wind is running high at ${Math.round(weather.windSpeed)} km/h — secure reflectors and lightweight backdrops.`);
      }
    }

    if (tomorrowsEvents.length > 0) {
      lines.push(`${tomorrowsEvents.length} shoot${tomorrowsEvents.length > 1 ? "s" : ""} lined up tomorrow — worth confirming gear and team assignments tonight.`);
    }

    if (busiestUpcoming) {
      lines.push(`Highest-value shoot coming up is "${busiestUpcoming.name}" (${busiestUpcoming.budget}) on ${busiestUpcoming.date} — prioritize prep there.`);
    }

    return lines.slice(0, 4);
  }, [todaysEvents, tomorrowsEvents, weather, busiestUpcoming]);

  return (
    <Card
      title={
        <Space>
          <BulbOutlined className="inline-blue" />
          AI Daily Briefing
        </Space>
      }
      className="dashboard-panel ai-briefing-panel"
    >
      <div className="ai-briefing-list">
        {insights.map((line, index) => (
          <motion.div
            key={line}
            className="ai-briefing-row"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <span className="ai-briefing-dot" />
            <Text>{line}</Text>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Pipeline Kanban — drag events between stages, quick-add, delete
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = ["Proposal", "Booked", "Live", "Done"] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

const normalizeStage = (pipeline: string): PipelineStage => {
  if (pipeline === "Converted") return "Booked";
  return (PIPELINE_STAGES as readonly string[]).includes(pipeline) ? (pipeline as PipelineStage) : "Proposal";
};

interface PipelineBoardProps {
  events: ParsedStudioEvent[];
  onMove: (eventId: string, stage: PipelineStage) => void;
  onSelect: (event: ParsedStudioEvent) => void;
  onDelete: (eventId: string, eventName: string) => void;
  onAddNew: () => void;
}

const PipelineBoard = ({ events, onMove, onSelect, onDelete, onAddNew }: PipelineBoardProps) => {
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);

  const grouped = useMemo(() => {
    const map: Record<PipelineStage, ParsedStudioEvent[]> = { Proposal: [], Booked: [], Live: [], Done: [] };
    events.forEach((event) => {
      map[normalizeStage(event.pipeline)].push(event);
    });
    return map;
  }, [events]);

  const handleDrop = (stage: PipelineStage) => (e: React.DragEvent) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    setDragOverStage(null);
    if (eventId) onMove(eventId, stage);
  };

  return (
    <div className="kanban-board">
      {PIPELINE_STAGES.map((stage) => (
        <div
          key={stage}
          className={dragOverStage === stage ? "kanban-column kanban-column-over" : "kanban-column"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverStage(stage);
          }}
          onDragLeave={() => setDragOverStage((current) => (current === stage ? null : current))}
          onDrop={handleDrop(stage)}
        >
          <div className="kanban-column-head">
            <Text strong>{stage}</Text>
            <Space size={6}>
              <Tag>{grouped[stage].length}</Tag>
              <Tooltip title="Add new shoot">
                <button type="button" className="kanban-add-btn" onClick={onAddNew}>
                  <PlusOutlined />
                </button>
              </Tooltip>
            </Space>
          </div>

          <div className="kanban-column-body">
            {grouped[stage].length ? (
              grouped[stage].map((event) => (
                <div
                  key={event.id}
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", event.id)}
                  onClick={() => onSelect(event)}
                >
                  <Tooltip title="Delete shoot">
                    <button
                      type="button"
                      className="kanban-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(event.id, event.name);
                      }}
                      aria-label="Delete shoot"
                    >
                      <DeleteOutlined />
                    </button>
                  </Tooltip>

                  <Text strong className="kanban-card-title">{event.name}</Text>
                  <div className="kanban-card-meta">
                    <CalendarOutlined /> <span>{event.date}</span>
                  </div>
                  <div className="kanban-card-meta">
                    <EnvironmentOutlined /> <span>{event.city}</span>
                  </div>
                  <Tag className="kanban-card-budget">{event.budget}</Tag>
                </div>
              ))
            ) : (
              <div className="kanban-empty">Drop a shoot here</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Speed dial
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Custom modal (used for the shortcuts overlay)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Portal-based live search spotlight — escapes the panel backdrop-filter
// stacking context the same way dropdowns/modals do elsewhere in this app.
// ---------------------------------------------------------------------------

interface SearchHit {
  key: string;
  kind: "event" | "user";
  title: string;
  subtitle: string;
  icon: ReactNode;
  onSelect: () => void;
}

interface SearchSpotlightProps {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
  hits: SearchHit[];
}

const SearchSpotlight = ({ anchorRef, visible, hits }: SearchSpotlightProps) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!visible) return;

    const updateRect = () => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [visible, anchorRef]);

  if (!visible || !rect || !hits.length) return null;

  return createPortal(
    <div
      className="search-spotlight-portal"
      style={{ top: rect.bottom + 8, left: rect.left, width: rect.width }}
    >
      {hits.map((hit) => (
        <div key={hit.key} className="search-spotlight-row" onMouseDown={(e) => e.preventDefault()} onClick={hit.onSelect}>
          <span className="search-spotlight-icon">{hit.icon}</span>
          <div className="search-spotlight-text">
            <Text strong style={{ color: "#f8fafc" }}>{hit.title}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{hit.subtitle}</Text>
          </div>
          <Tag className="search-spotlight-kind">{hit.kind}</Tag>
        </div>
      ))}
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// Event sidebar — cover hero, live stage stepper, budget-share ring, and
// quick actions (view / copy / advance stage). Used by the Users/Events/
// Schedule tables — Pipeline Board cards open PipelineEventPanel instead.
// ---------------------------------------------------------------------------

interface EventSidebarProps {
  event: ParsedStudioEvent | null;
  totalBudget: number;
  onClose: () => void;
  onViewFull: (id: string) => void;
  onAdvanceStage: (eventId: string, stage: PipelineStage) => void;
}

const EventSidebar = ({ event, totalBudget, onClose, onViewFull, onAdvanceStage }: EventSidebarProps) => {
  const budgetValue = event ? parseBudgetToNumber(event.budget) : 0;
  const budgetShare = event && totalBudget > 0 ? Math.round((budgetValue / totalBudget) * 100) : 0;
  const currentStage = event ? normalizeStage(event.pipeline) : "Proposal";
  const currentStageIndex = PIPELINE_STAGES.indexOf(currentStage);

  const handleCopySummary = async () => {
    if (!event) return;
    const summary = `${event.name}\n${event.type} · ${event.date} at ${event.time}\n${event.city}\nCustomer: ${event.customer}\nBudget: ${event.budget}\nStage: ${currentStage}`;

    try {
      await navigator.clipboard.writeText(summary);
      message.success("Event summary copied to clipboard");
    } catch {
      message.error("Couldn't copy — clipboard access is blocked");
    }
  };

  return (
    <Drawer
      title={null}
      open={Boolean(event)}
      onClose={onClose}
      size="default"
      closable={false}
      className="event-sidebar-drawer"
      styles={{ body: { padding: 0 } }}
    >
      {event ? (
        <div className="sidebar-shell">
          <button className="sidebar-close" onClick={onClose} aria-label="Close">
            <CloseOutlined />
          </button>

          <div
            className="sidebar-cover"
            style={event.image ? { backgroundImage: `url(${event.image})` } : undefined}
          >
            <div className="sidebar-cover-overlay" />

            <div className="sidebar-cover-content">
              <Tag color={statusTagColor[event.status] || "default"} className="sidebar-status-tag">
                {event.status}
              </Tag>

              <Title level={3} className="sidebar-title">{event.name}</Title>
              <Text className="sidebar-subtitle">{event.type} · {event.customer}</Text>
            </div>
          </div>

          <div className="sidebar-body">
            <div className="sidebar-meta-grid">
              <div className="sidebar-meta-chip">
                <CalendarOutlined />
                <div>
                  <span>Date</span>
                  <strong>{event.date}</strong>
                </div>
              </div>
              <div className="sidebar-meta-chip">
                <ClockCircleOutlined />
                <div>
                  <span>Time</span>
                  <strong>{event.time}</strong>
                </div>
              </div>
              <div className="sidebar-meta-chip">
                <EnvironmentOutlined />
                <div>
                  <span>City</span>
                  <strong>{event.city}</strong>
                </div>
              </div>
              <div className="sidebar-meta-chip">
                <TeamOutlined />
                <div>
                  <span>Team</span>
                  <strong>{event.members}</strong>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <Text strong className="sidebar-section-title">Pipeline stage</Text>

              <div className="sidebar-stepper">
                {PIPELINE_STAGES.map((stage, index) => (
                  <button
                    key={stage}
                    className={
                      index === currentStageIndex
                        ? "sidebar-step sidebar-step-current"
                        : index < currentStageIndex
                        ? "sidebar-step sidebar-step-done"
                        : "sidebar-step"
                    }
                    onClick={() => onAdvanceStage(event.id, stage)}
                  >
                    <span className="sidebar-step-dot" />
                    <span className="sidebar-step-label">{stage}</span>
                  </button>
                ))}
                <div className="sidebar-stepper-track">
                  <div
                    className="sidebar-stepper-fill"
                    style={{ width: `${(currentStageIndex / (PIPELINE_STAGES.length - 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="sidebar-section sidebar-budget-row">
              <Progress
                type="circle"
                percent={budgetShare}
                size={92}
                strokeColor={{ "0%": "#38bdf8", "100%": "#a78bfa" }}
                railColor="rgba(255,255,255,0.08)"
                format={() => (
                  <div className="sidebar-budget-ring-label">
                    <strong>{budgetShare}%</strong>
                    <span>of pipeline</span>
                  </div>
                )}
              />

              <div className="sidebar-budget-details">
                <Text type="secondary" style={{ fontSize: 12 }}>Shoot budget</Text>
                <Title level={3} className="sidebar-budget-value">{formatCompactINR(budgetValue)}</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Share of total booked pipeline value across all shoots
                </Text>
              </div>
            </div>

            <div className="sidebar-actions">
              <Button type="primary" block icon={<ArrowRightOutlined />} onClick={() => onViewFull(event.id)}>
                View Full Details
              </Button>

              <Space.Compact block>
                <Tooltip title="Copy a text summary">
                  <Button icon={<CopyOutlined />} onClick={handleCopySummary} block>
                    Copy Summary
                  </Button>
                </Tooltip>
              </Space.Compact>

              <div className="sidebar-contact-row">
                <Avatar icon={<UserOutlined />} className="sidebar-contact-avatar" />
                <div>
                  <Text strong style={{ color: "#f8fafc" }}>{event.customer}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Client contact</Text>
                </div>
                <Tooltip title="No phone on file">
                  <Button shape="circle" icon={<PhoneOutlined />} disabled />
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const DashboardPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);
  const displayEmail = user?.email || "guest@apenturexstudios.com";
  const displayName = displayEmail.split("@")[0];

  // Single source of truth: Redux, populated from GET /studio/events —
  // same store EventPage.tsx uses. No more localStorage ("ax.events.v1"),
  // which is why events created on the Events page weren't showing up here.
  const { events: reduxEvents } = useSelector((state: any) => state.event);
  const events: StudioEvent[] = Array.isArray(reduxEvents) ? reduxEvents : [];

  const [featureIndex, setFeatureIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState<ParsedStudioEvent | null>(null);
  const [pipelineEvent, setPipelineEvent] = useState<ParsedStudioEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const searchAnchorRef = useRef<HTMLDivElement | null>(null);
  const weather = useGoldenHourWeather();

  // Cursor-reactive tilt for the hero card
  const heroMouseX = useMotionValue(0.5);
  const heroMouseY = useMotionValue(0.5);
  const heroRotateX = useSpring(useTransform(heroMouseY, [0, 1], [6, -6]), { stiffness: 150, damping: 18 });
  const heroRotateY = useSpring(useTransform(heroMouseX, [0, 1], [-6, 6]), { stiffness: 150, damping: 18 });
  const heroGlowX = useTransform(heroMouseX, (v) => `${v * 100}%`);
  const heroGlowY = useTransform(heroMouseY, (v) => `${v * 100}%`);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    heroMouseX.set((e.clientX - bounds.left) / bounds.width);
    heroMouseY.set((e.clientY - bounds.top) / bounds.height);
  };

  const resetHeroTilt = () => {
    heroMouseX.set(0.5);
    heroMouseY.set(0.5);
  };

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

  // Fetch from the backend on mount, and again whenever the tab regains
  // focus, so events created elsewhere (Events page, another tab) show up.
  useEffect(() => {
    dispatch(getEvents());
  }, [dispatch]);

  useEffect(() => {
    const syncEvents = () => dispatch(getEvents());
    window.addEventListener("focus", syncEvents);
    return () => window.removeEventListener("focus", syncEvents);
  }, [dispatch]);

  const eventsWithDate = useMemo<ParsedStudioEvent[]>(
    () => events.map((event) => ({ ...event, dateObj: parseEventDateTime(event.date, event.time) })),
    [events]
  );

  const todaysEvents = useMemo(
    () => eventsWithDate.filter((event) => event.dateObj.isSame(currentTime, "day")),
    [eventsWithDate, currentTime]
  );

  const tomorrowsEvents = useMemo(
    () => eventsWithDate.filter((event) => event.dateObj.isSame(dayjs(currentTime).add(1, "day"), "day")),
    [eventsWithDate, currentTime]
  );

  const busiestUpcoming = useMemo(() => {
    const upcoming = eventsWithDate.filter((event) => event.dateObj.isAfter(dayjs(currentTime)));
    if (!upcoming.length) return null;
    return [...upcoming].sort((a, b) => parseBudgetToNumber(b.budget) - parseBudgetToNumber(a.budget))[0];
  }, [eventsWithDate, currentTime]);

  const totalBudget = useMemo(
    () => events.reduce((sum, event) => sum + parseBudgetToNumber(event.budget), 0),
    [events]
  );

  // Keep the currently open sidebar event in sync when its pipeline stage changes
  useEffect(() => {
    if (!selectedEvent) return;
    const refreshed = eventsWithDate.find((event) => event.id === selectedEvent.id);
    if (refreshed && refreshed.pipeline !== selectedEvent.pipeline) {
      setSelectedEvent(refreshed);
    }
  }, [eventsWithDate, selectedEvent]);

  // Keep the Pipeline Board's own side panel in sync the same way
  useEffect(() => {
    if (!pipelineEvent) return;
    const refreshed = eventsWithDate.find((event) => event.id === pipelineEvent.id);
    if (refreshed && refreshed.pipeline !== pipelineEvent.pipeline) {
      setPipelineEvent(refreshed);
    }
  }, [eventsWithDate, pipelineEvent]);

  const pulseItems = useMemo(() => {
    const todayItems = todaysEvents.map(
      (event) => `Today · ${event.name} at ${event.time} · ${event.city}`
    );
    const tomorrowItems = tomorrowsEvents.map(
      (event) => `Tomorrow · ${event.name} at ${event.time} · ${event.city}`
    );
    const combined = [...todayItems, ...tomorrowItems];

    return combined.length
      ? combined
      : ["No shoots scheduled today or tomorrow — plan one from the Events board"];
  }, [todaysEvents, tomorrowsEvents]);

  const metricCards = useMemo(
    () => [
      { title: "Users", value: 1042, suffix: "", percent: 100, icon: <UsergroupAddOutlined />, color: "#38BDF8" },
      { title: "Events", value: events.length, suffix: "", percent: Math.min(100, events.length * 20), icon: <VideoCameraOutlined />, color: "#f59e0b" },
      { title: "Health", value: 98, suffix: "%", percent: 98, icon: <SafetyCertificateOutlined />, color: "#06b6d4" },
      { title: "Profile", value: 82, suffix: "%", percent: 82, icon: <CheckCircleOutlined />, color: "#22c55e" },
      { title: "Revenue", value: 180000, suffix: "Rs", percent: 76, icon: <DollarOutlined />, color: "#14b8a6" },
      { title: "Leads", value: 36, suffix: "", percent: 64, icon: <TeamOutlined />, color: "#38BDF8" },
    ],
    [events.length]
  );

  const featureCards = useMemo(
    () => [
      { title: "Shoots", value: String(events.length), icon: <CameraOutlined />, background: "linear-gradient(135deg, #38BDF8, #2563eb)" },
      { title: "Views", value: "12.8K", icon: <EyeOutlined />, background: "linear-gradient(135deg, #38BDF8, #06b6d4)" },
      { title: "Frames", value: "64", icon: <PictureOutlined />, background: "linear-gradient(135deg, #38BDF8, #22c55e)" },
      { title: "Bookings", value: "+27%", icon: <FireOutlined />, background: "linear-gradient(135deg, #38BDF8, #f59e0b)" },
    ],
    [events.length]
  );

  useEffect(() => {
    const featureTimer = setInterval(() => {
      setFeatureIndex((current) => (current + 1) % featureCards.length);
    }, 4200);

    return () => clearInterval(featureTimer);
  }, [featureCards.length]);

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const goToCreateEvent = () => navigate("/events/create");

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
        goToCreateEvent();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const value = searchText.toLowerCase();

    return userData.filter((user) =>
      [user.name, user.email, user.phone, user.role].some((field) =>
        field.toLowerCase().includes(value)
      )
    );
  }, [searchText, userData]);

  const filteredEvents = useMemo(() => {
    const value = searchText.trim().toLowerCase();

    return eventsWithDate.filter((event) => {
      const matchesSearch =
        !value ||
        [event.id, event.name, event.type, event.city, event.customer, event.status, event.pipeline].some(
          (field) => String(field).toLowerCase().includes(value)
        );

      if (!matchesSearch) return false;
      if (dateFilter === "All") return true;

      const diffDays = event.dateObj.startOf("day").diff(dayjs(currentTime).startOf("day"), "day");

      if (dateFilter === "Today") return diffDays === 0;
      if (dateFilter === "Week") return diffDays >= 0 && diffDays <= 7;
      if (dateFilter === "Month") return diffDays >= 0 && diffDays <= 30;

      return true;
    });
  }, [searchText, dateFilter, eventsWithDate, currentTime]);

  const displayedEvents = useMemo(
    () => filteredEvents.slice(0, EVENTS_LIST_LIMIT),
    [filteredEvents]
  );

  const upcomingSchedule = useMemo(() => {
    return eventsWithDate
      .filter((event) => event.dateObj.startOf("day").diff(dayjs(currentTime).startOf("day"), "day") >= 0)
      .sort((a, b) => a.dateObj.valueOf() - b.dateObj.valueOf())
      .slice(0, EVENTS_LIST_LIMIT);
  }, [eventsWithDate, currentTime]);

  // ---- Navigation handlers ----
  const goToUsersPage = () => navigate("/users");
  const goToEventPage = (eventId?: string) => {
    if (eventId) {
      navigate(`/events/${eventId}`);
    } else {
      navigate("/events");
    }
  };

  // ---- Search spotlight hits ----
  const searchHits: SearchHit[] = useMemo(() => {
    if (!searchText.trim()) return [];

    const eventHits: SearchHit[] = filteredEvents.slice(0, 4).map((event) => ({
      key: `event-${event.id}`,
      kind: "event",
      title: event.name,
      subtitle: `${event.date} · ${event.city}`,
      icon: <CameraOutlined />,
      onSelect: () => {
        setSelectedEvent(event);
        setSearchFocused(false);
      },
    }));

    const userHits: SearchHit[] = filteredUsers.slice(0, 2).map((u) => ({
      key: `user-${u.key}`,
      kind: "user",
      title: u.name,
      subtitle: u.email,
      icon: <UsergroupAddOutlined />,
      onSelect: () => {
        goToUsersPage();
        setSearchFocused(false);
      },
    }));

    return [...eventHits, ...userHits];
  }, [searchText, filteredEvents, filteredUsers]);

  // ---- Pipeline stage move (drag & drop / sidebar stepper / panel rail) ----
  const handleMovePipeline = async (eventId: string, stage: PipelineStage) => {
    const { ok, message: errMsg } = await patchEventOnServer(eventId, { pipeline: stage });
    if (!ok) {
      message.error(errMsg || "Failed to update stage.");
      return;
    }
    dispatch(getEvents());
    message.success(`Moved to ${stage}`);
  };

  // ---- Pipeline delete ----
  const handleDeleteEvent = (eventId: string, eventName: string) => {
    Modal.confirm({
      title: "Delete this shoot?",
      content: `"${eventName}" will be permanently removed.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        const { ok, message: errMsg } = await deleteEventOnServer(eventId);
        if (!ok) {
          message.error(errMsg || "Failed to delete event.");
          return;
        }
        if (selectedEvent?.id === eventId) setSelectedEvent(null);
        if (pipelineEvent?.id === eventId) setPipelineEvent(null);
        dispatch(getEvents());
        message.success("Event deleted");
      },
    });
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
      title: "Shoot",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: ParsedStudioEvent) => (
        <Space>
          <CameraOutlined style={{ color: THEME_COLOR }} />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.type}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string, record: ParsedStudioEvent) => (
        <Space>
          <CalendarOutlined style={{ color: THEME_COLOR }} />
          <div>
            <Text>{date}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.time}
            </Text>
          </div>
        </Space>
      ),
    },
    { title: "City", dataIndex: "city", key: "city" },
    {
      title: "Stage",
      dataIndex: "pipeline",
      key: "pipeline",
      render: (pipeline: string) => <Tag>{pipeline}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const isLive = status === "LIVE";

        return (
          <Badge
            status={isLive ? "processing" : status === "DONE" ? "success" : "warning"}
            text={
              <Tag color={statusTagColor[status] || "default"} style={{ margin: 0 }}>
                {status}
              </Tag>
            }
          />
        );
      },
    },
  ];

  const speedDialActions: SpeedDialAction[] = [
    { key: "create", label: "New Event", icon: <PlusOutlined />, run: goToCreateEvent },
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

          <div ref={searchAnchorRef} style={{ width: "min(420px, 100%)" }}>
            <Search
              placeholder="Search events, users…"
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="dashboard-local-search"
            />
          </div>

          <SearchSpotlight anchorRef={searchAnchorRef} visible={searchFocused && Boolean(searchText.trim())} hits={searchHits} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="hero-card"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={resetHeroTilt}
          style={{
            rotateX: heroRotateX,
            rotateY: heroRotateY,
            transformPerspective: 1000,
          }}
        >
          <motion.div
            className="hero-cursor-glow"
            style={{ left: heroGlowX, top: heroGlowY }}
          />
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
                <strong>{events.length}</strong>
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
          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <SunOutlined className="inline-blue" />
                  Golden Hour & Weather
                </Space>
              }
              className="dashboard-panel"
            >
              <GoldenHourWeather weather={weather} />
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              title={
                <Space>
                  <HourglassOutlined className="inline-blue" />
                  Next Shoot
                </Space>
              }
              className="dashboard-panel"
            >
              <NextShootCountdown
                events={eventsWithDate.map((event) => ({
                  name: event.name,
                  city: event.city,
                  dateObj: event.dateObj,
                }))}
                now={currentTime}
              />
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <AiBriefingPanel
              todaysEvents={todaysEvents}
              tomorrowsEvents={tomorrowsEvents}
              weather={weather}
              busiestUpcoming={busiestUpcoming}
            />
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <FlagOutlined className="inline-blue" />
              Pipeline Board
            </Space>
          }
          className="dashboard-panel"
        >
          <PipelineBoard
            events={eventsWithDate}
            onMove={handleMovePipeline}
            onSelect={setPipelineEvent}
            onDelete={handleDeleteEvent}
            onAddNew={goToCreateEvent}
          />
        </Card>

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
            dataSource={displayedEvents}
            rowKey="id"
            pagination={false}
            scroll={{ x: 900 }}
            onRow={(record) => ({
              onClick: () => setSelectedEvent(record),
              style: { cursor: "pointer" },
            })}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching events" />
              ),
            }}
          />

          {filteredEvents.length > EVENTS_LIST_LIMIT ? (
            <div className="events-view-more">
              <Button type="link" onClick={() => goToEventPage()}>
                View all {filteredEvents.length} events <ArrowRightOutlined />
              </Button>
            </div>
          ) : null}
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
              onClick={goToCreateEvent}
            />
          }
          className="dashboard-panel schedule-panel"
          styles={{ body: { padding: 0 } }}
        >
          <Table
            columns={eventColumns}
            dataSource={upcomingSchedule}
            rowKey="id"
            pagination={false}
            scroll={{ x: 900 }}
            onRow={(record) => ({
              onClick: () => setSelectedEvent(record),
              style: { cursor: "pointer" },
            })}
            locale={{
              emptyText: (
                <div className="empty-schedule">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing on the schedule yet" />

                  <Button
                    type="primary"
                    shape="circle"
                    icon={<PlusOutlined />}
                    onClick={goToCreateEvent}
                  />
                </div>
              ),
            }}
          />
        </Card>

        <EventSidebar
          event={selectedEvent}
          totalBudget={totalBudget}
          onClose={() => setSelectedEvent(null)}
          onViewFull={(id) => goToEventPage(id)}
          onAdvanceStage={handleMovePipeline}
        />

        <PipelineEventPanel
          event={pipelineEvent}
          totalBudget={totalBudget}
          onClose={() => setPipelineEvent(null)}
          onAdvanceStage={handleMovePipeline}
          onDelete={handleDeleteEvent}
          onViewFull={(id) => goToEventPage(id)}
        />

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