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
  DollarOutlined, EnvironmentOutlined, EyeOutlined,
  FireOutlined, FlagOutlined, HourglassOutlined,
  PhoneOutlined, PictureOutlined, PlusOutlined, QuestionCircleOutlined,
  ReloadOutlined, RiseOutlined, RocketOutlined,
  SafetyCertificateOutlined, SearchOutlined, SunOutlined, TeamOutlined,
  ThunderboltFilled, UsergroupAddOutlined, UserOutlined, VideoCameraOutlined,
  BulbOutlined, CompassOutlined, WarningOutlined,
} from "@ant-design/icons";
import {
  AnimatePresence, motion, useMotionValue, useSpring, useTransform,
} from "framer-motion";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "./DashboardPage.css";
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
  return `₹${Math.round(value)}`;
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
// Sky maths — sun position, golden / blue hour windows, moon phase.
// All computed locally from the studio's latitude / longitude, so the only
// network data needed is the weather forecast itself.
// ---------------------------------------------------------------------------

const HOUR_MS = 3600000;
const DAY_MS = 86400000;
const RAD = Math.PI / 180;
const norm360 = (v: number) => ((v % 360) + 360) % 360;

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compassDir = (az: number) => COMPASS[Math.round(norm360(az) / 22.5) % 16];

interface SunPos {
  azimuth: number; // degrees clockwise from north
  elevation: number; // degrees above the horizon (negative = below)
}

const sunPosition = (ms: number): SunPos => {
  const d = ms / DAY_MS + 2440587.5 - 2451545.0; // days since J2000
  const L = norm360(280.46 + 0.9856474 * d);
  const g = norm360(357.528 + 0.9856003 * d) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * d) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = norm360(280.46061837 + 360.98564736629 * d);
  const ha = norm360(gmst + STUDIO_LON) * RAD - ra;
  const lat = STUDIO_LAT * RAD;

  const elevation = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
  const azimuth = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));

  return { azimuth: norm360(azimuth / RAD + 180), elevation: elevation / RAD };
};

interface Span {
  start: number;
  end: number;
}

interface LightWindows {
  morningBlue: Span; // sun -8° → -4°
  morningGold: Span; // sun -4° → +6°
  eveningGold: Span; // sun +6° → -4°
  eveningBlue: Span; // sun -4° → -8°
  noon: number;
  domainStart: number;
  domainEnd: number;
}

const findCrossing = (from: number, to: number, target: number, rising: boolean): number | null => {
  let prev = sunPosition(from).elevation;
  for (let t = from + 60000; t <= to; t += 60000) {
    const cur = sunPosition(t).elevation;
    if (rising ? prev < target && cur >= target : prev >= target && cur < target) return t;
    prev = cur;
  }
  return null;
};

const computeLightWindows = (sunrise: number, sunset: number): LightWindows => {
  const noon = (sunrise + sunset) / 2;
  const from = sunrise - 3 * HOUR_MS;
  const to = sunset + 3 * HOUR_MS;

  const mb0 = findCrossing(from, noon, -8, true) ?? sunrise - 0.7 * HOUR_MS;
  const mb1 = findCrossing(from, noon, -4, true) ?? sunrise - 0.35 * HOUR_MS;
  const mg1 = findCrossing(from, noon, 6, true) ?? sunrise + HOUR_MS;
  const eg0 = findCrossing(noon, to, 6, false) ?? sunset - HOUR_MS;
  const eg1 = findCrossing(noon, to, -4, false) ?? sunset + 0.35 * HOUR_MS;
  const eb1 = findCrossing(noon, to, -8, false) ?? sunset + 0.7 * HOUR_MS;

  return {
    morningBlue: { start: mb0, end: mb1 },
    morningGold: { start: mb1, end: mg1 },
    eveningGold: { start: eg0, end: eg1 },
    eveningBlue: { start: eg1, end: eb1 },
    noon,
    domainStart: mb0,
    domainEnd: eb1,
  };
};

const lightQuality = (ms: number, w: LightWindows) => {
  if (ms < w.morningBlue.start || ms > w.eveningBlue.end) return { label: "Night", color: "#64748b" };
  if ((ms >= w.morningBlue.start && ms < w.morningBlue.end) || (ms > w.eveningBlue.start && ms <= w.eveningBlue.end)) {
    return { label: "Blue hour", color: "#60a5fa" };
  }
  if ((ms >= w.morningGold.start && ms <= w.morningGold.end) || (ms >= w.eveningGold.start && ms <= w.eveningGold.end)) {
    return { label: "Golden hour", color: "#fbbf24" };
  }
  if (sunPosition(ms).elevation >= 50) return { label: "Harsh midday", color: "#f87171" };
  return { label: "Soft light", color: "#34d399" };
};

const SYNODIC = 29.530588853;

const getMoon = (ms: number) => {
  const jd = ms / DAY_MS + 2440587.5;
  const age = (((jd - 2451550.1) % SYNODIC) + SYNODIC) % SYNODIC;
  const frac = age / SYNODIC;
  const illum = (1 - Math.cos(2 * Math.PI * frac)) / 2;

  let name = "Waning Crescent";
  if (frac < 0.03 || frac >= 0.97) name = "New Moon";
  else if (frac < 0.22) name = "Waxing Crescent";
  else if (frac < 0.28) name = "First Quarter";
  else if (frac < 0.47) name = "Waxing Gibbous";
  else if (frac < 0.53) name = "Full Moon";
  else if (frac < 0.72) name = "Waning Gibbous";
  else if (frac < 0.78) name = "Last Quarter";

  const daysToFull = (SYNODIC / 2 - age + SYNODIC) % SYNODIC;
  const daysToNew = (SYNODIC - age) % SYNODIC;

  let tip = "Soft moonlight — good for night portraits mixed with practical lights.";
  if (illum >= 0.85) tip = "Bright moonlight washes out the stars — shoot moonlit landscapes, not the Milky Way.";
  else if (illum <= 0.15) tip = "Dark skies — ideal for stars, astro and long-exposure night work.";

  return { age, frac, illum, name, daysToFull, daysToNew, tip };
};

const COLOR_BLUE = "#60a5fa";
const COLOR_GOLD = "#fbbf24";

const fmtClock = (ms: number, tz?: string) =>
  new Date(ms).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: tz });

const fmtHourLabel = (ms: number, tz?: string) =>
  new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true, timeZone: tz });

const fmtDuration = (ms: number) => {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  return h ? `${h}h ${totalMin % 60}m` : `${totalMin}m`;
};

// ---------------------------------------------------------------------------
// Weather — forecast + risk rules
// ---------------------------------------------------------------------------

interface HourPoint {
  ms: number;
  temp: number;
  rain: number;
  cloud: number;
  wind: number;
  code: number;
}

const describeWeather = (code: number): { label: string; icon: string } => {
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if (code === 1 || code === 2) return { label: "Partly cloudy", icon: "🌤️" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", icon: "🌦️" };
  if (code === 85 || code === 86) return { label: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Mixed", icon: "⛅" };
};

type RiskLevel = "ok" | "warn" | "danger";

interface RiskIssue {
  level: "warn" | "danger";
  title: string;
  detail: string;
}

interface WeatherAlert extends RiskIssue {
  key: string;
  scope: string;
}

const assessConditions = (p: { rain: number; wind: number; temp: number; cloud: number; code: number }): RiskIssue[] => {
  const issues: RiskIssue[] = [];

  if (p.code >= 95) {
    issues.push({ level: "danger", title: "Thunderstorm risk", detail: "Lightning in the forecast — keep crew and gear indoors." });
  }

  if (p.rain >= 60) {
    issues.push({ level: "danger", title: `Rain likely (${Math.round(p.rain)}%)`, detail: "Cover bodies and lenses, and line up an indoor backup." });
  } else if (p.rain >= 30) {
    issues.push({ level: "warn", title: `Chance of showers (${Math.round(p.rain)}%)`, detail: "Pack rain covers and keep a sheltered fallback nearby." });
  }

  if (p.wind >= 35) {
    issues.push({ level: "danger", title: `Strong wind (${Math.round(p.wind)} km/h)`, detail: "Ground drones; secure light stands, reflectors and backdrops." });
  } else if (p.wind >= 22) {
    issues.push({ level: "warn", title: `Breezy (${Math.round(p.wind)} km/h)`, detail: "Weigh down stands and lightweight backdrops." });
  }

  if (p.temp >= 38) {
    issues.push({ level: "danger", title: `Extreme heat (${Math.round(p.temp)}°C)`, detail: "Limit time outdoors, hydrate the crew, keep batteries and gear shaded." });
  } else if (p.temp >= 34) {
    issues.push({ level: "warn", title: `Hot (${Math.round(p.temp)}°C)`, detail: "Plan shade breaks and keep batteries cool." });
  } else if (p.temp <= 5) {
    issues.push({ level: "warn", title: `Cold (${Math.round(p.temp)}°C)`, detail: "Batteries drain faster — carry spares in a warm pocket." });
  }

  if (p.code === 45 || p.code === 48) {
    issues.push({ level: "warn", title: "Fog", detail: "Moody look, but low contrast makes autofocus harder." });
  }

  if (p.cloud >= 85 && p.rain < 30 && p.code < 95) {
    issues.push({ level: "warn", title: `Heavy cloud (${Math.round(p.cloud)}%)`, detail: "Flat light — golden-hour colour is unlikely." });
  }

  return issues;
};

const worstLevel = (issues: RiskIssue[]): RiskLevel =>
  issues.some((i) => i.level === "danger") ? "danger" : issues.length ? "warn" : "ok";

const nearestHour = (hourly: HourPoint[], ms: number): HourPoint | null => {
  let best: HourPoint | null = null;
  let bestDiff = Infinity;
  for (const point of hourly) {
    const diff = Math.abs(point.ms - ms);
    if (diff < bestDiff) {
      best = point;
      bestDiff = diff;
    }
  }
  return best && bestDiff <= 2 * HOUR_MS ? best : null;
};

// ---------------------------------------------------------------------------
// Shared weather hook — used by the Golden Hour panel, the AI Briefing
// and the Light Timeline
// ---------------------------------------------------------------------------

interface WeatherState {
  temperature: number;
  windSpeed: number;
  rainNow: number;
  cloudNow: number;
  weatherCode: number;
  sunset: string;
  goldenHourStart: string;
  sunriseMs: number;
  sunsetMs: number;
  tz: string;
  hourly: HourPoint[];
  windows: LightWindows | null;
  loading: boolean;
  error: boolean;
}

const INITIAL_WEATHER: WeatherState = {
  temperature: 0,
  windSpeed: 0,
  rainNow: 0,
  cloudNow: 0,
  weatherCode: 0,
  sunset: "",
  goldenHourStart: "",
  sunriseMs: 0,
  sunsetMs: 0,
  tz: "",
  hourly: [],
  windows: null,
  loading: true,
  error: false,
};

const useGoldenHourWeather = () => {
  const [weather, setWeather] = useState<WeatherState>(INITIAL_WEATHER);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${STUDIO_LAT}&longitude=${STUDIO_LON}` +
          `&current_weather=true` +
          `&hourly=temperature_2m,precipitation_probability,cloud_cover,wind_speed_10m,weather_code` +
          `&daily=sunrise,sunset&forecast_days=3&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();

        if (cancelled) return;

        // Open-Meteo returns local wall-clock strings; convert them to real epoch ms
        // using the offset it reports, so the page is right even if the browser is elsewhere.
        const offset: number = data?.utc_offset_seconds ?? 0;
        const tz: string = data?.timezone || "";
        const toMs = (iso: string) => Date.parse(iso + (iso.length === 16 ? ":00Z" : "Z")) - offset * 1000;

        const sunriseISO: string | undefined = data?.daily?.sunrise?.[0];
        const sunsetISO: string | undefined = data?.daily?.sunset?.[0];
        const sunriseMs = sunriseISO ? toMs(sunriseISO) : 0;
        const sunsetMs = sunsetISO ? toMs(sunsetISO) : 0;
        const windows = sunriseMs && sunsetMs > sunriseMs ? computeLightWindows(sunriseMs, sunsetMs) : null;

        const times: string[] = data?.hourly?.time ?? [];
        const hourly: HourPoint[] = times.map((t, i) => ({
          ms: toMs(t),
          temp: data.hourly.temperature_2m?.[i] ?? 0,
          rain: data.hourly.precipitation_probability?.[i] ?? 0,
          cloud: data.hourly.cloud_cover?.[i] ?? 0,
          wind: data.hourly.wind_speed_10m?.[i] ?? 0,
          code: data.hourly.weather_code?.[i] ?? 0,
        }));

        const nowPoint = nearestHour(hourly, Date.now());

        setWeather({
          temperature: data?.current_weather?.temperature ?? nowPoint?.temp ?? 0,
          windSpeed: data?.current_weather?.windspeed ?? nowPoint?.wind ?? 0,
          rainNow: nowPoint?.rain ?? 0,
          cloudNow: nowPoint?.cloud ?? 0,
          weatherCode: data?.current_weather?.weathercode ?? nowPoint?.code ?? 0,
          sunset: sunsetMs ? fmtClock(sunsetMs, tz || undefined) : "—",
          goldenHourStart: windows ? fmtClock(windows.eveningGold.start, tz || undefined) : "—",
          sunriseMs,
          sunsetMs,
          tz,
          hourly,
          windows,
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
    const refresh = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
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

          <Text type="secondary" style={{ fontSize: 12 }}>
            Wind {Math.round(weather.windSpeed)} km/h · Rain {Math.round(weather.rainNow)}% · Cloud {Math.round(weather.cloudNow)}%
          </Text>

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

      if (weather.rainNow >= 50) {
        lines.push(`Rain chance is ${Math.round(weather.rainNow)}% right now — keep rain covers and an indoor fallback ready.`);
      }

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

    return lines.slice(0, 5);
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
                <button type="button" className="kanban-add-btn" onClick={onAddNew} aria-label={`Add shoot to ${stage}`}>
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
                  className="pb-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", event.id)}
                  onClick={() => onSelect(event)}
                >
                  <Tooltip title="Delete shoot">
                    <button
                      type="button"
                      className="pb-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(event.id, event.name);
                      }}
                      aria-label="Delete shoot"
                    >
                      <DeleteOutlined />
                    </button>
                  </Tooltip>

                  <div className="pb-card-title" title={event.name}>{event.name}</div>

                  <div className="pb-card-meta-row">
                    <span className="pb-card-meta">
                      <CalendarOutlined />
                      <span>{event.date}</span>
                    </span>
                    <span className="pb-card-meta">
                      <EnvironmentOutlined />
                      <span>{event.city}</span>
                    </span>
                  </div>

                  <div className="pb-card-footer">
                    <span className="pb-card-meta">
                      <ClockCircleOutlined />
                      <span>{event.time}</span>
                    </span>
                    <Tag className="pb-card-budget">{event.budget}</Tag>
                  </div>
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
// Moon disc — drawn from the phase fraction (0 = new, 0.5 = full)
// ---------------------------------------------------------------------------

const MoonDisc = ({ frac }: { frac: number }) => {
  const r = 30;
  const c = 36;
  const waning = frac > 0.5;
  const p = waning ? 1 - frac : frac;
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.max(0.01, Math.abs(k) * r);
  const sweep = k < 0 ? 1 : 0;
  const d = `M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} A${rx} ${r} 0 0 ${sweep} ${c} ${c - r} Z`;

  return (
    <svg viewBox="0 0 72 72" className="moon-svg" role="img" aria-label="Current moon phase">
      <defs>
        <radialGradient id="moon-lit" cx="40%" cy="38%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={r} fill="#1e293b" stroke="rgba(148,163,184,0.35)" />
      <g transform={waning ? `translate(${2 * c} 0) scale(-1 1)` : undefined}>
        <path d={d} fill="url(#moon-lit)" />
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Light Timeline — sun elevation curve across the whole day with golden & blue
// hour bands, a scrubber for sun position, live weather, moon phase and
// automatic weather alerts for today's and tomorrow's shoots.
// ---------------------------------------------------------------------------

const LT = { w: 640, h: 262, x0: 34, x1: 606, base: 172, peak: 118, below: 3.6 };

interface LightTimelineProps {
  weather: WeatherState;
  todaysEvents: ParsedStudioEvent[];
  tomorrowsEvents: ParsedStudioEvent[];
  now: Date;
  onSelect: (event: ParsedStudioEvent) => void;
}

const LightTimeline = ({ weather, todaysEvents, tomorrowsEvents, now, onSelect }: LightTimelineProps) => {
  const [scrubMs, setScrubMs] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const w = weather.windows;
  const tz = weather.tz || undefined;
  const ready = !weather.loading && !weather.error && w !== null;
  const nowMs = now.valueOf();
  const minuteKey = Math.floor(nowMs / 60000);
  const hourKey = Math.floor(nowMs / HOUR_MS);

  const moon = useMemo(() => getMoon(hourKey * HOUR_MS), [hourKey]);

  const upcomingHours = useMemo(
    () => weather.hourly.filter((h) => h.ms >= hourKey * HOUR_MS).slice(0, 8),
    [weather.hourly, hourKey]
  );

  // Weather alerts — rule-based check of the forecast at each shoot's hour,
  // plus a check on the golden-hour windows that are still ahead.
  const { alerts, eventRisk } = useMemo(() => {
    const list: WeatherAlert[] = [];
    const risk: Record<string, RiskLevel> = {};
    const current = minuteKey * 60000;

    if (!weather.hourly.length || !w) return { alerts: list, eventRisk: risk };

    [...todaysEvents, ...tomorrowsEvents].forEach((event) => {
      if (!event.dateObj.isValid()) return;
      const ms = event.dateObj.valueOf();
      if (ms < current - 2 * HOUR_MS) return;

      const point = nearestHour(weather.hourly, ms);
      if (!point) return;

      const issues = assessConditions(point);
      risk[event.id] = worstLevel(issues);

      const dayLabel = event.dateObj.isSame(dayjs(current), "day") ? "Today" : "Tomorrow";
      issues.forEach((issue) => {
        list.push({ ...issue, key: `${event.id}-${issue.title}`, scope: `${dayLabel} · ${event.name} at ${event.time}` });
      });
    });

    (
      [
        { label: "Morning golden hour", span: w.morningGold },
        { label: "Evening golden hour", span: w.eveningGold },
      ] as const
    ).forEach(({ label, span }) => {
      if (span.end < current) return;
      const point = nearestHour(weather.hourly, (span.start + span.end) / 2);
      if (point && (point.cloud >= 85 || point.rain >= 60 || point.code >= 95)) {
        list.push({
          key: `gold-${label}`,
          level: "warn",
          title: "Golden hour at risk",
          detail: `${Math.round(point.rain)}% rain chance and ${Math.round(point.cloud)}% cloud cover — expect muted colour.`,
          scope: label,
        });
      }
    });

    list.sort((a, b) => (a.level === b.level ? 0 : a.level === "danger" ? -1 : 1));
    return { alerts: list.slice(0, 4), eventRisk: risk };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather.hourly, w, todaysEvents, tomorrowsEvents, minuteKey]);

  const cardTitle = (
    <Space>
      <CompassOutlined className="inline-blue" />
      Light Timeline
    </Space>
  );

  if (!ready || !w) {
    return (
      <Card title={cardTitle} extra={<Tag>Today</Tag>} className="dashboard-panel">
        <div className="light-empty">
          <Text type="secondary">{weather.loading ? "Calculating today's light…" : "Sun and weather data unavailable right now"}</Text>
        </div>
      </Card>
    );
  }

  const dStart = w.domainStart;
  const dEnd = w.domainEnd;
  const dSpan = dEnd - dStart;
  const maxElev = Math.max(30, sunPosition(w.noon).elevation);

  const xOf = (ms: number) => LT.x0 + ((ms - dStart) / dSpan) * (LT.x1 - LT.x0);
  const yOfElev = (e: number) => (e >= 0 ? LT.base - (e / maxElev) * LT.peak : LT.base - e * LT.below);

  const pointAt = (ms: number) => {
    const s = sunPosition(ms);
    return { x: xOf(ms), y: yOfElev(s.elevation), az: s.azimuth, elev: s.elevation };
  };

  const curvePath = (a: number, b: number) => {
    const steps = Math.max(2, Math.round((b - a) / (6 * 60000)));
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const p = pointAt(a + ((b - a) * i) / steps);
      d += `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    }
    return d;
  };

  const handleScrub = (clientX: number) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * LT.w;
    const t = Math.max(0, Math.min(1, (vx - LT.x0) / (LT.x1 - LT.x0)));
    setScrubMs(dStart + t * dSpan);
  };

  const focusMs = scrubMs ?? Math.min(dEnd, Math.max(dStart, nowMs));
  const focus = pointAt(focusMs);
  const focusQuality = lightQuality(focusMs, w);
  const liveSun = nowMs >= dStart && nowMs <= dEnd ? pointAt(nowMs) : null;

  let status: string;
  if (nowMs < w.morningBlue.start) status = `Morning blue hour in ${fmtDuration(w.morningBlue.start - nowMs)}`;
  else if (nowMs < w.morningBlue.end) status = "Morning blue hour — cool, cinematic light now";
  else if (nowMs < w.morningGold.end) status = "Morning golden hour — shoot now";
  else if (nowMs < w.eveningGold.start) status = `Evening golden hour in ${fmtDuration(w.eveningGold.start - nowMs)}`;
  else if (nowMs < w.eveningGold.end) status = "Evening golden hour — shoot now";
  else if (nowMs < w.eveningBlue.end) status = "Evening blue hour — cinematic dusk light now";
  else status = "Night — a good time for long exposures and moon work";

  const markers = todaysEvents
    .filter((event) => event.dateObj.isValid())
    .map((event) => {
      const ms = event.dateObj.valueOf();
      return { event, ms, quality: lightQuality(ms, w), risk: eventRisk[event.id] ?? "ok" };
    });

  const keyMoments = [
    { key: "sunrise", label: "Sunrise", ms: weather.sunriseMs },
    { key: "gold-am", label: "Gold ends", ms: w.morningGold.end },
    { key: "noon", label: "Solar noon", ms: w.noon },
    { key: "gold-pm", label: "Gold begins", ms: w.eveningGold.start },
    { key: "sunset", label: "Sunset", ms: weather.sunsetMs },
  ].map((m) => ({ ...m, pos: sunPosition(m.ms) }));

  const windowCards = [
    { key: "mb", title: "Morning blue hour", span: w.morningBlue, color: COLOR_BLUE, tip: "Cool teal skies — moody, cinematic portraits" },
    { key: "mg", title: "Morning golden hour", span: w.morningGold, color: COLOR_GOLD, tip: "Warm, soft, low-angle light — flattering skin tones" },
    { key: "eg", title: "Evening golden hour", span: w.eveningGold, color: COLOR_GOLD, tip: "Long shadows and glow — couples, flares, rim light" },
    { key: "eb", title: "Evening blue hour", span: w.eveningBlue, color: COLOR_BLUE, tip: "Deep blue sky with warm lights — cinematic dusk" },
  ].map((c) => ({
    ...c,
    state: nowMs >= c.span.start && nowMs <= c.span.end ? "now" : nowMs > c.span.end ? "past" : "next",
  }));

  const weatherNow = describeWeather(weather.weatherCode);
  const tiles = [
    { label: "Temperature", value: `${Math.round(weather.temperature)}°C`, pct: Math.min(100, Math.max(0, (weather.temperature / 45) * 100)), color: "#f59e0b" },
    { label: "Rain chance", value: `${Math.round(weather.rainNow)}%`, pct: weather.rainNow, color: "#60a5fa" },
    { label: "Cloud cover", value: `${Math.round(weather.cloudNow)}%`, pct: weather.cloudNow, color: "#94a3b8" },
    { label: "Wind", value: `${Math.round(weather.windSpeed)} km/h`, pct: Math.min(100, (weather.windSpeed / 50) * 100), color: "#34d399" },
  ];

  const riskColor: Record<RiskLevel, string> = { ok: "#34d399", warn: "#fbbf24", danger: "#f87171" };

  return (
    <Card title={cardTitle} extra={<Tag>Today</Tag>} className="dashboard-panel lt-panel">
      <div className="light-status">
        <ThunderboltFilled />
        <span>{status}</span>
      </div>

      <div className="lt-alerts">
        {alerts.length ? (
          alerts.map((alert) => (
            <div key={alert.key} className={`lt-alert lt-alert-${alert.level}`} role="alert">
              <WarningOutlined />
              <div>
                <strong>{alert.title}</strong>
                <em>{alert.scope}</em>
                <span>{alert.detail}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="lt-alert lt-alert-ok">
            <CheckCircleOutlined />
            <div>
              <strong>Conditions look good</strong>
              <span>No risky weather flagged for today's or tomorrow's shoots.</span>
            </div>
          </div>
        )}
      </div>

      <div className="lt-grid">
        <div className="lt-main">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${LT.w} ${LT.h}`}
            className="light-svg lt-svg"
            role="img"
            aria-label={`Sun elevation across the day. Sunrise ${fmtClock(weather.sunriseMs, tz)}, sunset ${fmtClock(weather.sunsetMs, tz)}. ${status}.`}
            onMouseMove={(e) => handleScrub(e.clientX)}
            onMouseLeave={() => setScrubMs(null)}
            onTouchMove={(e) => handleScrub(e.touches[0].clientX)}
            onTouchEnd={() => setScrubMs(null)}
          >
            <defs>
              <radialGradient id="lt-sun">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="lt-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lt-night" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.04" />
              </linearGradient>
              <filter id="lt-blur" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>

            {/* below-horizon band: where the blue hour lives */}
            <rect x={LT.x0 - 24} y={LT.base} width={LT.x1 - LT.x0 + 48} height={8 * LT.below + 2} fill="url(#lt-night)" />

            {/* daylight fill */}
            <path
              d={`${curvePath(weather.sunriseMs, weather.sunsetMs)} L${xOf(weather.sunsetMs).toFixed(1)} ${LT.base} L${xOf(weather.sunriseMs).toFixed(1)} ${LT.base} Z`}
              fill="url(#lt-sky)"
            />

            {/* full sun path */}
            <path d={curvePath(dStart, dEnd)} fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="1.5" strokeDasharray="4 5" />

            {/* blue hour bands */}
            {[w.morningBlue, w.eveningBlue].map((span, i) => (
              <g key={`blue-${i}`}>
                <path d={curvePath(span.start, span.end)} fill="none" stroke={COLOR_BLUE} strokeWidth="7" strokeLinecap="round" opacity="0.45" filter="url(#lt-blur)" />
                <path d={curvePath(span.start, span.end)} fill="none" stroke={COLOR_BLUE} strokeWidth="3" strokeLinecap="round" />
              </g>
            ))}

            {/* golden hour bands */}
            {[w.morningGold, w.eveningGold].map((span, i) => (
              <g key={`gold-${i}`}>
                <path d={curvePath(span.start, span.end)} fill="none" stroke={COLOR_GOLD} strokeWidth="7" strokeLinecap="round" opacity="0.5" filter="url(#lt-blur)" />
                <path d={curvePath(span.start, span.end)} fill="none" stroke={COLOR_GOLD} strokeWidth="3" strokeLinecap="round" />
              </g>
            ))}

            {/* horizon + labels */}
            <line x1={LT.x0 - 24} x2={LT.x1 + 24} y1={LT.base} y2={LT.base} stroke="rgba(125,211,252,0.3)" />
            <circle cx={xOf(weather.sunriseMs)} cy={LT.base} r="3" fill="#fde68a" />
            <circle cx={xOf(weather.sunsetMs)} cy={LT.base} r="3" fill="#fde68a" />

            <text x={xOf(weather.sunriseMs)} y={LT.base + 46} textAnchor="middle" className="light-svg-label">{fmtClock(weather.sunriseMs, tz)}</text>
            <text x={xOf(weather.sunriseMs)} y={LT.base + 59} textAnchor="middle" className="light-svg-sub">Sunrise</text>
            <text x={xOf(weather.sunsetMs)} y={LT.base + 46} textAnchor="middle" className="light-svg-label">{fmtClock(weather.sunsetMs, tz)}</text>
            <text x={xOf(weather.sunsetMs)} y={LT.base + 59} textAnchor="middle" className="light-svg-sub">Sunset</text>
            <text x={xOf(w.noon)} y={LT.base + 46} textAnchor="middle" className="light-svg-label">{fmtDuration(weather.sunsetMs - weather.sunriseMs)}</text>
            <text x={xOf(w.noon)} y={LT.base + 59} textAnchor="middle" className="light-svg-sub">of daylight</text>
            <text x={LT.x0 - 24} y={LT.base + 8 * LT.below + 14} className="light-svg-sub">Blue-hour zone</text>

            {/* scrub guide */}
            {scrubMs !== null ? (
              <g pointerEvents="none">
                <line x1={focus.x} x2={focus.x} y1={focus.y} y2={LT.base + 8 * LT.below} stroke={focusQuality.color} strokeDasharray="3 4" opacity="0.8" />
                <circle cx={focus.x} cy={focus.y} r="6" fill={focusQuality.color} stroke="#f8fafc" strokeWidth="1.5" />
              </g>
            ) : null}

            {/* live sun */}
            {liveSun ? (
              <g pointerEvents="none">
                <circle cx={liveSun.x} cy={liveSun.y} r="26" fill="url(#lt-sun)" />
                <circle cx={liveSun.x} cy={liveSun.y} r="7" fill="#fde68a" />
              </g>
            ) : null}

            {/* today's shoots */}
            {markers
              .filter((m) => m.ms >= dStart && m.ms <= dEnd)
              .map((m) => {
                const p = pointAt(m.ms);
                return (
                  <g
                    key={m.event.id}
                    className="light-marker"
                    role="button"
                    tabIndex={0}
                    aria-label={`${m.event.name} at ${m.event.time}, ${m.quality.label}${m.risk !== "ok" ? `, weather risk: ${m.risk}` : ""}`}
                    onClick={() => onSelect(m.event)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(m.event);
                      }
                    }}
                  >
                    <title>{`${m.event.name} · ${m.event.time} · ${m.quality.label}`}</title>
                    <line x1={p.x} x2={p.x} y1={p.y} y2={LT.base} stroke={m.quality.color} strokeDasharray="2 4" opacity="0.7" />
                    {m.risk !== "ok" ? (
                      <circle cx={p.x} cy={p.y} r="13" fill="none" stroke={riskColor[m.risk]} strokeWidth="1.5" strokeDasharray="3 3" />
                    ) : null}
                    <circle cx={p.x} cy={p.y} r="8" fill={m.quality.color} stroke="#0f172a" strokeWidth="2" />
                    <text x={p.x} y={p.y - 17} textAnchor="middle" className="light-svg-label">{m.event.time}</text>
                  </g>
                );
              })}
          </svg>

          <div className="lt-readout">
            <i className="lt-readout-dot" style={{ background: focusQuality.color }} />
            <strong>{fmtClock(focusMs, tz)}</strong>
            <span>
              Sun {compassDir(focus.az)} {Math.round(focus.az)}° · {Math.abs(Math.round(focus.elev))}°{" "}
              {focus.elev >= 0 ? "above" : "below"} horizon
            </span>
            <span className="lt-readout-quality" style={{ color: focusQuality.color }}>{focusQuality.label}</span>
            <em>{scrubMs === null ? "Hover or drag across the curve to move the sun" : "Scrubbing"}</em>
          </div>

          <div className="lt-moments">
            {keyMoments.map((m) => (
              <button
                key={m.key}
                type="button"
                className="lt-moment"
                onMouseEnter={() => setScrubMs(m.ms)}
                onMouseLeave={() => setScrubMs(null)}
                onFocus={() => setScrubMs(m.ms)}
                onBlur={() => setScrubMs(null)}
              >
                <span>{m.label}</span>
                <strong>{fmtClock(m.ms, tz)}</strong>
                <em>{compassDir(m.pos.azimuth)} · {Math.round(m.pos.elevation)}°</em>
              </button>
            ))}
          </div>

          <div className="lt-windows">
            {windowCards.map((c) => (
              <div key={c.key} className={`lt-window lt-window-${c.state}`} style={{ ["--lt-c" as string]: c.color }}>
                <div className="lt-window-head">
                  <strong>{c.title}</strong>
                  <span>
                    {c.state === "now" ? "Happening now" : c.state === "past" ? "Passed" : `In ${fmtDuration(c.span.start - nowMs)}`}
                  </span>
                </div>
                <div className="lt-window-time">{fmtClock(c.span.start, tz)} – {fmtClock(c.span.end, tz)}</div>
                <em>{c.tip}</em>
              </div>
            ))}
          </div>

          <div className="light-events">
            {markers.length ? (
              markers.map((m) => (
                <button key={m.event.id} type="button" className="light-event" onClick={() => onSelect(m.event)}>
                  <i className="light-event-dot" style={{ background: m.quality.color }} />
                  <span className="light-event-main">
                    <strong>{m.event.name}</strong>
                    <em>{m.event.time} · {m.event.city}</em>
                  </span>
                  {m.risk !== "ok" ? (
                    <span className="light-event-risk" style={{ color: riskColor[m.risk] }}>
                      <WarningOutlined /> {m.risk === "danger" ? "Weather risk" : "Watch weather"}
                    </span>
                  ) : null}
                  <span className="light-event-quality" style={{ color: m.quality.color }}>{m.quality.label}</span>
                </button>
              ))
            ) : (
              <div className="light-empty">No shoots today — the golden and blue windows above are yours.</div>
            )}
          </div>
        </div>

        <div className="lt-side">
          <div className="lt-block">
            <Text strong className="lt-block-title">Weather now · {weatherNow.icon} {weatherNow.label}</Text>
            <div className="lt-wx-tiles">
              {tiles.map((t) => (
                <div key={t.label} className="lt-wx-tile">
                  <span>{t.label}</span>
                  <strong>{t.value}</strong>
                  <div className="lt-wx-bar"><i style={{ width: `${Math.max(3, t.pct)}%`, background: t.color }} /></div>
                </div>
              ))}
            </div>

            <div className="lt-hours">
              {upcomingHours.map((h) => {
                const q = lightQuality(h.ms, w);
                const d = describeWeather(h.code);
                return (
                  <div key={h.ms} className="lt-hour" style={{ borderBottomColor: q.color }} title={`${q.label} · ${d.label}`}>
                    <span className="lt-hour-time">{fmtHourLabel(h.ms, tz)}</span>
                    <span className="lt-hour-icon">{d.icon}</span>
                    <strong>{Math.round(h.temp)}°</strong>
                    <em>{Math.round(h.rain)}%</em>
                  </div>
                );
              })}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Next hours · temperature and rain chance · underline shows the light quality
            </Text>
          </div>

          <div className="lt-block">
            <Text strong className="lt-block-title">Moon phase</Text>
            <div className="lt-moon">
              <MoonDisc frac={moon.frac} />
              <div className="lt-moon-text">
                <strong>{moon.name}</strong>
                <span>{Math.round(moon.illum * 100)}% lit · day {Math.floor(moon.age) + 1} of 30</span>
                <em>
                  Full moon in {Math.round(moon.daysToFull)} {Math.round(moon.daysToFull) === 1 ? "day" : "days"} · new moon in {Math.round(moon.daysToNew)}{" "}
                  {Math.round(moon.daysToNew) === 1 ? "day" : "days"}
                </em>
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>{moon.tip}</Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Command palette — Ctrl/⌘ + K. Jump to any shoot or run a quick action.
// ---------------------------------------------------------------------------

interface CommandItem {
  key: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

const CommandPalette = ({ open, onClose, items }: CommandPaletteProps) => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? items.filter((item) => `${item.label} ${item.hint || ""} ${item.group}`.toLowerCase().includes(q))
      : items;
    return pool.slice(0, 8);
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const runItem = (item: CommandItem) => {
    onClose();
    item.run();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current) => (results.length ? (current + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current) => (results.length ? (current - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) runItem(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <div className="cp-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp-panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cp-input-row">
          <SearchOutlined />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search shoots…"
            role="combobox"
            aria-expanded="true"
            aria-controls="cp-list"
            aria-activedescendant={results[active] ? `cp-opt-${results[active].key}` : undefined}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="cp-list" id="cp-list" role="listbox">
          {results.length ? (
            results.map((item, index) => (
              <div
                key={item.key}
                id={`cp-opt-${item.key}`}
                role="option"
                aria-selected={index === active}
                className={index === active ? "cp-item cp-item-active" : "cp-item"}
                onMouseEnter={() => setActive(index)}
                onClick={() => runItem(item)}
              >
                <span className="cp-item-icon">{item.icon}</span>
                <span className="cp-item-text">
                  <strong>{item.label}</strong>
                  {item.hint ? <em>{item.hint}</em> : null}
                </span>
                <span className="cp-item-group">{item.group}</span>
              </div>
            ))
          ) : (
            <div className="cp-empty">No matches</div>
          )}
        </div>

        <div className="cp-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
        </div>
      </div>
    </div>,
    document.body
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
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
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
      <div className="cm-panel creative-modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
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
// quick actions (view / copy / advance stage). Used by the Events table and the
// Light Timeline — Pipeline Board cards open PipelineEventPanel instead.
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
  // same store EventPage.tsx uses.
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
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  // Still powers the user hits in the search spotlight.
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

  // Depends on the current day only, so memoised blocks don't recompute every clock tick.
  const currentDayKey = dayjs(currentTime).format("YYYY-MM-DD");

  const weekRange = useMemo(() => {
    const base = dayjs(currentDayKey);
    return { start: base.startOf("week"), end: base.endOf("week") };
  }, [currentDayKey]);

  const weekEvents = useMemo(
    () =>
      eventsWithDate.filter(
        (event) =>
          event.dateObj.isValid() &&
          !event.dateObj.isBefore(weekRange.start) &&
          !event.dateObj.isAfter(weekRange.end)
      ),
    [eventsWithDate, weekRange]
  );

  const hiddenFromBoardCount = eventsWithDate.length - weekEvents.length;

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
      // Command palette works everywhere, even while typing
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

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

    return userData.filter((u) =>
      [u.name, u.email, u.phone, u.role].some((field) =>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    { key: "palette", label: "Command Palette", icon: <SearchOutlined />, run: () => setPaletteOpen(true) },
    { key: "users", label: "Users", icon: <UsergroupAddOutlined />, run: goToUsersPage },
    { key: "events", label: "Events", icon: <VideoCameraOutlined />, run: () => goToEventPage() },
    { key: "shortcuts", label: "Shortcuts", icon: <QuestionCircleOutlined />, run: () => setShortcutsOpen(true) },
  ];

  const commandItems: CommandItem[] = [
    { key: "cmd-create", group: "Action", label: "New event", hint: "Create a shoot", icon: <PlusOutlined />, run: goToCreateEvent },
    { key: "cmd-events", group: "Go to", label: "Events", hint: "Open all events", icon: <VideoCameraOutlined />, run: () => goToEventPage() },
    { key: "cmd-users", group: "Go to", label: "Users", hint: "Open user management", icon: <UsergroupAddOutlined />, run: goToUsersPage },
    {
      key: "cmd-refresh",
      group: "Action",
      label: "Refresh data",
      hint: "Re-fetch events from the server",
      icon: <ReloadOutlined />,
      run: () => {
        dispatch(getEvents());
        message.success("Refreshing events…");
      },
    },
    { key: "cmd-shortcuts", group: "Help", label: "Keyboard shortcuts", hint: "Show all shortcuts", icon: <QuestionCircleOutlined />, run: () => setShortcutsOpen(true) },
    ...eventsWithDate.map((event) => ({
      key: `cmd-event-${event.id}`,
      group: "Shoot",
      label: event.name,
      hint: `${event.date} · ${event.city} · ${normalizeStage(event.pipeline)}`,
      icon: <CameraOutlined />,
      run: () => setSelectedEvent(event),
    })),
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

          <div className="dashboard-top-tools">
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

            <button type="button" className="palette-trigger" onClick={() => setPaletteOpen(true)}>
              <SearchOutlined />
              <span>Command</span>
              <kbd>Ctrl K</kbd>
            </button>
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
          extra={
            <Tag icon={<CalendarOutlined />}>
              This week · {weekRange.start.format("MMM D")} – {weekRange.end.format("MMM D")}
            </Tag>
          }
          className="dashboard-panel"
        >
          <PipelineBoard
            events={weekEvents}
            onMove={handleMovePipeline}
            onSelect={setPipelineEvent}
            onDelete={handleDeleteEvent}
            onAddNew={goToCreateEvent}
          />

          <div className="events-view-more">
            <Button type="link" onClick={() => goToEventPage()}>
              {hiddenFromBoardCount > 0
                ? `See more (${hiddenFromBoardCount} other ${hiddenFromBoardCount === 1 ? "event" : "events"})`
                : "See more"}{" "}
              <ArrowRightOutlined />
            </Button>
          </div>
        </Card>

        <Row gutter={[24, 24]} className="insight-row studio-intel-row">
          <Col xs={24}>
            <LightTimeline
              weather={weather}
              todaysEvents={todaysEvents}
              tomorrowsEvents={tomorrowsEvents}
              now={currentTime}
              onSelect={setSelectedEvent}
            />
          </Col>
        </Row>

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

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commandItems} />

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
              <span>Move the sun on Light Timeline</span>
              <Tag>Hover / drag</Tag>
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