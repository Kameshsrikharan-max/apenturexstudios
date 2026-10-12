import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useId,
  createContext,
  useContext,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import "./CalendarPage.css";

import { Calendar, dayjsLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(localizedFormat);

const rbcLocalizer = dayjsLocalizer(dayjs);

import { getHolidays, getPanchang } from "../../redux/actions/calendarActions";
import ConfirmDeleteButton from "../../components/common/DeleteButton";

/* ───────────────────────── Types ───────────────────────── */

export type EventColor = "blue" | "green" | "red" | "violet" | "gold";
export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
type Theme = "dark" | "light";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  color: EventColor;
  category?: string;
  isHoliday: boolean;
  /** The date this occurrence is shown on (filled in at runtime). */
  date?: string;
  recurrence?: Recurrence;
  /** Minutes before start. null/undefined = no reminder. */
  reminder?: number | null;
}

export type EventsMap = Record<string, CalendarEvent[]>;

interface TamilMonth {
  en: string;
  ta: string;
  startMonth: number;
  startDay: number;
}
interface TamilMonthInfo {
  month: TamilMonth;
  day: number;
}
interface PanchangRange {
  start: string | number | null;
  end: string | number | null;
}
interface PanchangFields {
  day: string | number | null;
  rahukaal: PanchangRange | null;
  murtham: PanchangRange | null;
}

type ViewMode = "day" | "week" | "month";

interface EventModalState {
  open: boolean;
  mode: "create" | "edit";
  id: string | null;
  date: string;
  initialValues: Partial<CalendarEvent> | null;
}

interface CalendarPageProps {
  onClose?: () => void;
}
type RootState = any;

interface Prefs {
  theme: Theme;
  viewMode: ViewMode;
  showTamilDates: boolean;
  showHolidays: boolean;
  showMine: boolean;
  hiddenColors: EventColor[];
}

interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/* ───────────────────────── Constants ───────────────────────── */

const STORAGE_KEY = "calendarEvents";
const PREFS_KEY = "calendarPrefs";

const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  viewMode: "month",
  showTamilDates: true,
  showHolidays: true,
  showMine: true,
  hiddenColors: [],
};

const EVENT_COLORS: { value: EventColor; label: string }[] = [
  { value: "blue", label: "Ocean Blue" },
  { value: "green", label: "Mint Green" },
  { value: "red", label: "Coral Red" },
  { value: "violet", label: "Festival Violet" },
  { value: "gold", label: "National Gold" },
];

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
];

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "No reminder" },
  { value: "0", label: "At start time" },
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "T", label: "Jump to today" },
  { keys: "D / W / M", label: "Day, week or month view" },
  { keys: "← / → or [ / ]", label: "Previous / next period" },
  { keys: "N", label: "New event" },
  { keys: "A", label: "Open agenda" },
  { keys: "/ or Ctrl+K", label: "Search & quick add" },
  { keys: "?", label: "Show this help" },
  { keys: "Esc", label: "Close any dialog" },
];

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const fmtDate = (d: Dayjs) => d.format("YYYY-MM-DD");
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const colorVars = (color: EventColor): CSSProperties =>
  ({
    "--evt-bg": `var(--evt-${color}-bg)`,
    "--evt-fg": `var(--evt-${color}-fg)`,
    "--evt-dot": `var(--evt-${color}-dot)`,
  }) as CSSProperties;

const ThemeContext = createContext<Theme>("dark");

/* ───────────────────────── Tamil calendar ───────────────────────── */

const TAMIL_MONTHS: TamilMonth[] = [
  { en: "Chithirai", ta: "சித்திரை", startMonth: 4, startDay: 14 },
  { en: "Vaikasi", ta: "வைகாசி", startMonth: 5, startDay: 15 },
  { en: "Aani", ta: "ஆனி", startMonth: 6, startDay: 15 },
  { en: "Aadi", ta: "ஆடி", startMonth: 7, startDay: 17 },
  { en: "Aavani", ta: "ஆவணி", startMonth: 8, startDay: 17 },
  { en: "Purattasi", ta: "புரட்டாசி", startMonth: 9, startDay: 17 },
  { en: "Aippasi", ta: "ஐப்பசி", startMonth: 10, startDay: 18 },
  { en: "Karthigai", ta: "கார்த்திகை", startMonth: 11, startDay: 16 },
  { en: "Margazhi", ta: "மார்கழி", startMonth: 12, startDay: 16 },
  { en: "Thai", ta: "தை", startMonth: 1, startDay: 14 },
  { en: "Maasi", ta: "மாசி", startMonth: 2, startDay: 13 },
  { en: "Panguni", ta: "பங்குனி", startMonth: 3, startDay: 14 },
];

const getTamilMonthInfo = (date: Dayjs): TamilMonthInfo => {
  const year = date.year();
  const boundaries: { month: TamilMonth; start: Dayjs }[] = [];

  TAMIL_MONTHS.forEach((month) => {
    [year - 1, year, year + 1].forEach((y) => {
      boundaries.push({
        month,
        start: dayjs(
          `${y}-${String(month.startMonth).padStart(2, "0")}-${String(month.startDay).padStart(2, "0")}`
        ),
      });
    });
  });

  boundaries.sort((a, b) => a.start.valueOf() - b.start.valueOf());

  let current = boundaries[0];
  for (const boundary of boundaries) {
    if (boundary.start.isAfter(date, "day")) break;
    current = boundary;
  }

  const day = date.startOf("day").diff(current.start, "day") + 1;
  return { month: current.month, day };
};

const tamilCache = new Map<string, TamilMonthInfo>();
const getTamilMonthInfoCached = (date: Dayjs): TamilMonthInfo => {
  const key = fmtDate(date);
  let hit = tamilCache.get(key);
  if (!hit) {
    hit = getTamilMonthInfo(date);
    tamilCache.set(key, hit);
  }
  return hit;
};

/* ───────────────────────── Storage ───────────────────────── */

const readEventsFromStorage = (): EventsMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as EventsMap;
    let migrated = false;
    const out: EventsMap = {};
    Object.keys(parsed).forEach((date) => {
      out[date] = (parsed[date] || []).map((event) => {
        if (!event.id || !event.recurrence) migrated = true;
        return { ...event, id: event.id || uid(), recurrence: event.recurrence || "none" };
      });
    });
    // Persist ids for events saved by older versions so they stay stable between reads.
    if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    return out;
  } catch (error) {
    console.error("Failed to read calendar events", error);
    return {};
  }
};

const writeEventsToStorage = (events: EventsMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    window.dispatchEvent(new Event("calendarEventsUpdated"));
  } catch (error) {
    console.error("Failed to write calendar events", error);
  }
};

const readPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

const pruneEmpty = (map: EventsMap): EventsMap => {
  const out: EventsMap = {};
  Object.keys(map).forEach((d) => {
    if (map[d] && map[d].length > 0) out[d] = map[d];
  });
  return out;
};

const findSourceEvent = (map: EventsMap, id: string): { date: string; event: CalendarEvent } | null => {
  for (const date of Object.keys(map)) {
    const event = (map[date] || []).find((e) => e.id === id);
    if (event) return { date, event };
  }
  return null;
};

/* ───────────────────────── Time helpers ───────────────────────── */

const getMinutes = (time?: string): number => {
  if (!time) return 9 * 60;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const toHHmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const formatTimeLabel = (time?: string): string => {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
};

const formatHour = (hour: number) => {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
};

const recurrenceLabel = (r?: Recurrence) =>
  r && r !== "none" ? RECURRENCE_OPTIONS.find((o) => o.value === r)?.label.replace("Every ", "Repeats ") ?? "" : "";

const formatEventTime = (event: CalendarEvent): string => {
  if (!event.startTime && !event.endTime) return event.category || (event.isHoliday ? "Holiday" : "All day");
  if (event.startTime && event.endTime) {
    return `${formatTimeLabel(event.startTime)} – ${formatTimeLabel(event.endTime)}`;
  }
  return formatTimeLabel(event.startTime || event.endTime);
};

const sortByTime = (a: CalendarEvent, b: CalendarEvent) =>
  (a.startTime ? getMinutes(a.startTime) : -1) - (b.startTime ? getMinutes(b.startTime) : -1);

const asPrimitive = (val: unknown): string | number | null => {
  if (typeof val === "string" || typeof val === "number") return val;
  return null;
};

const extractPanchangFields = (data: any): PanchangFields | null => {
  if (!data || typeof data !== "object") return null;

  const rahukaal: PanchangRange | null =
    data.rahukaal && typeof data.rahukaal === "object"
      ? { start: asPrimitive(data.rahukaal.start), end: asPrimitive(data.rahukaal.end) }
      : null;

  const rawMurtham = data.murtham ?? data.muhurtham ?? data.abhijit_muhurat ?? data.abhijit_muhurta ?? null;

  const murtham: PanchangRange | null =
    rawMurtham && typeof rawMurtham === "object"
      ? { start: asPrimitive(rawMurtham.start), end: asPrimitive(rawMurtham.end) }
      : null;

  return { day: asPrimitive(data.day), rahukaal, murtham };
};

/* ───────────────────────── Recurrence expansion ───────────────────────── */

const RECURRENCE_UNIT: Record<Exclude<Recurrence, "none">, "day" | "week" | "month" | "year"> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

/** Expands stored events (keyed by their first date) into every occurrence inside [start, end]. */
const expandUserEvents = (map: EventsMap, start: Dayjs, end: Dayjs): EventsMap => {
  const out: EventsMap = {};
  const push = (date: string, event: CalendarEvent) => {
    (out[date] = out[date] || []).push({ ...event, date });
  };

  Object.keys(map).forEach((date) => {
    (map[date] || []).forEach((event) => {
      const origin = dayjs(date);
      const rec = event.recurrence || "none";

      if (rec === "none") {
        if (!origin.isBefore(start, "day") && !origin.isAfter(end, "day")) push(date, event);
        return;
      }

      const unit = RECURRENCE_UNIT[rec];
      let k = Math.max(0, start.diff(origin, unit));
      let occurrence = origin.add(k, unit);
      while (occurrence.isBefore(start, "day")) {
        k += 1;
        occurrence = origin.add(k, unit);
      }
      let guard = 0;
      while (!occurrence.isAfter(end, "day") && guard < 800) {
        push(fmtDate(occurrence), event);
        k += 1;
        guard += 1;
        occurrence = origin.add(k, unit);
      }
    });
  });

  return out;
};

/* ───────────────────────── Day-view overlap layout ───────────────────────── */

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  col: number;
  cols: number;
}

const layoutDayEvents = (list: CalendarEvent[]): PositionedEvent[] => {
  const items = list
    .filter((e) => e.startTime)
    .map((event) => {
      const start = getMinutes(event.startTime);
      const end = Math.max(getMinutes(event.endTime || event.startTime), start + 30);
      return { event, start, end };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: PositionedEvent[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  const flush = () => {
    const colEnds: number[] = [];
    const placed = cluster.map((it) => {
      let col = colEnds.findIndex((end) => end <= it.start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(it.end);
      } else {
        colEnds[col] = it.end;
      }
      return { ...it, col };
    });
    placed.forEach((p) =>
      result.push({ event: p.event, top: p.start, height: p.end - p.start, col: p.col, cols: colEnds.length })
    );
    cluster = [];
  };

  items.forEach((it) => {
    if (cluster.length && it.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  });
  if (cluster.length) flush();

  return result;
};

/* ───────────────────────── Quick add parser ───────────────────────── */

const WEEKDAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

interface QuickAddResult {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  recurrence: Recurrence;
  detected: boolean;
}

/** "Lunch with Ravi tomorrow 1pm", "Standup every week 9:30am", "Pongal prep 2027-01-10". */
const parseQuickAdd = (raw: string, base: Dayjs): QuickAddResult | null => {
  let text = ` ${raw} `;
  let detected = false;
  let date = base;
  let startTime = "";
  let recurrence: Recurrence = "none";

  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = text.match(re);
    if (m) {
      text = text.replace(re, " ");
      detected = true;
    }
    return m;
  };

  const rec = take(/\s(every\s+(day|week|month|year)|daily|weekly|monthly|yearly)\s/i);
  if (rec) {
    const word = (rec[2] || rec[1]).toLowerCase();
    recurrence = ({ d: "daily", w: "weekly", m: "monthly", y: "yearly" } as const)[
      word[0] as "d" | "w" | "m" | "y"
    ];
  }

  const iso = take(/\s(\d{4}-\d{2}-\d{2})\s/);
  if (iso && dayjs(iso[1]).isValid()) {
    date = dayjs(iso[1]);
  } else {
    const rel = take(/\s(today|tomorrow|tmrw)\s/i);
    if (rel) {
      date = rel[1].toLowerCase() === "today" ? base : base.add(1, "day");
    } else {
      const wd = take(
        /\s(?:on\s+|next\s+)?(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\s/i
      );
      if (wd) {
        const target = WEEKDAY_INDEX[wd[1].slice(0, 3).toLowerCase()];
        const diff = (target - base.day() + 7) % 7 || 7;
        date = base.add(diff, "day");
      }
    }
  }

  const ampm = take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = Number(ampm[2] || 0);
    const pm = ampm[3].toLowerCase() === "pm";
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    if (h <= 23 && min <= 59) startTime = toHHmm(h * 60 + min);
  } else {
    const h24 = take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\s/);
    if (h24) startTime = toHHmm(Number(h24[1]) * 60 + Number(h24[2]));
  }

  const title = text.replace(/\s+/g, " ").trim();
  if (!title) return null;

  const endTime = startTime ? toHHmm(Math.min(getMinutes(startTime) + 60, 23 * 60 + 59)) : "";
  return { title, date: fmtDate(date), startTime, endTime, recurrence, detected };
};

/* ───────────────────────── ICS import / export ───────────────────────── */

const toICSDate = (date: string, time?: string) =>
  time ? `${date.replace(/-/g, "")}T${time.replace(":", "")}00` : date.replace(/-/g, "");

const escapeICS = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const unescapeICS = (s: string) => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

const buildICS = (map: EventsMap): string => {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Indian Calendar//EN", "CALSCALE:GREGORIAN"];
  const stamp = dayjs().format("YYYYMMDDTHHmmss");

  Object.keys(map)
    .sort()
    .forEach((date) => {
      map[date].forEach((ev) => {
        lines.push("BEGIN:VEVENT", `UID:${ev.id}@indian-calendar`, `DTSTAMP:${stamp}`);
        if (ev.startTime) {
          lines.push(`DTSTART:${toICSDate(date, ev.startTime)}`);
          lines.push(`DTEND:${toICSDate(date, ev.endTime || ev.startTime)}`);
        } else {
          lines.push(`DTSTART;VALUE=DATE:${toICSDate(date)}`);
          lines.push(`DTEND;VALUE=DATE:${toICSDate(fmtDate(dayjs(date).add(1, "day")))}`);
        }
        lines.push(`SUMMARY:${escapeICS(ev.title)}`);
        if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
        if (ev.recurrence && ev.recurrence !== "none") lines.push(`RRULE:FREQ=${ev.recurrence.toUpperCase()}`);
        if (ev.reminder != null && ev.startTime) {
          lines.push("BEGIN:VALARM", `TRIGGER:-PT${ev.reminder}M`, "ACTION:DISPLAY", "DESCRIPTION:Reminder", "END:VALARM");
        }
        lines.push("END:VEVENT");
      });
    });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

const parseICSDate = (value: string): { date: string; time: string } | null => {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  if (m[4] === undefined) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: "" };
  if (m[7]) {
    const d = dayjs(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])));
    return { date: fmtDate(d), time: d.format("HH:mm") };
  }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
};

const parseICS = (text: string): { date: string; event: CalendarEvent }[] => {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const result: { date: string; event: CalendarEvent }[] = [];
  let current: Record<string, string> | null = null;

  lines.forEach((line) => {
    if (line === "BEGIN:VEVENT") {
      current = {};
      return;
    }
    if (line === "END:VEVENT") {
      if (current && current.DTSTART) {
        const start = parseICSDate(current.DTSTART);
        if (start) {
          const end = current.DTEND ? parseICSDate(current.DTEND) : null;
          const freq = /FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/i.exec(current.RRULE || "")?.[1]?.toLowerCase() as
            | Recurrence
            | undefined;
          let endTime = "";
          if (start.time) endTime = end && end.date === start.date && end.time ? end.time : end ? "23:59" : "";
          result.push({
            date: start.date,
            event: {
              id: current.UID ? current.UID.split("@")[0] : uid(),
              title: unescapeICS(current.SUMMARY || "Untitled event"),
              description: unescapeICS(current.DESCRIPTION || ""),
              startTime: start.time,
              endTime,
              color: "violet",
              category: "Imported",
              isHoliday: false,
              recurrence: freq || "none",
              reminder: null,
            },
          });
        }
      }
      current = null;
      return;
    }
    if (!current) return;
    const idx = line.indexOf(":");
    if (idx < 0) return;
    const name = line.slice(0, idx).split(";")[0].toUpperCase();
    if (!(name in current)) current[name] = line.slice(idx + 1);
  });

  return result;
};

/* ───────────────────────── Small hooks ───────────────────────── */

function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const t = window.setInterval(() => setNow(dayjs()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* ───────────────────────── Icons ───────────────────────── */

const svgProps = { viewBox: "0 0 20 20", fill: "none", "aria-hidden": true } as const;

const IconClose = () => (
  <svg {...svgProps} width="16" height="16">
    <path d="M15 5 5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconPlus = () => (
  <svg {...svgProps} width="16" height="16">
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconChevronLeft = () => (
  <svg {...svgProps} width="16" height="16">
    <path d="M12 15 7 10l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronRight = () => (
  <svg {...svgProps} width="16" height="16">
    <path d="M8 15l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconToday = () => (
  <svg {...svgProps} width="16" height="16">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="10" cy="10" r="1.6" fill="currentColor" />
  </svg>
);
const IconEdit = () => (
  <svg {...svgProps} width="14" height="14">
    <path d="M13.5 3.5 16.5 6.5 7 16H4v-3l9.5-9.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const IconTrash = () => (
  <svg {...svgProps} width="14" height="14">
    <path
      d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6 0v9.5A1.5 1.5 0 0 0 7.5 17h5a1.5 1.5 0 0 0 1.5-1.5V6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconAgenda = () => (
  <svg {...svgProps} width="16" height="16">
    <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconBack = () => (
  <svg {...svgProps} width="16" height="16">
    <path d="M12 15 7 10l5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconSearch = () => (
  <svg {...svgProps} width="16" height="16">
    <circle cx="9" cy="9" r="5.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconMore = () => (
  <svg {...svgProps} width="16" height="16">
    <circle cx="4.5" cy="10" r="1.4" fill="currentColor" />
    <circle cx="10" cy="10" r="1.4" fill="currentColor" />
    <circle cx="15.5" cy="10" r="1.4" fill="currentColor" />
  </svg>
);
const IconRepeat = () => (
  <svg {...svgProps} width="12" height="12">
    <path
      d="M4 9V8a3 3 0 0 1 3-3h8m0 0-2-2m2 2-2 2M16 11v1a3 3 0 0 1-3 3H5m0 0 2 2m-2-2 2-2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconBell = () => (
  <svg {...svgProps} width="12" height="12">
    <path
      d="M5 14h10l-1.2-1.6V9a3.8 3.8 0 1 0-7.6 0v3.4L5 14Zm3 2.2a2 2 0 0 0 4 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ───────────────────────── UI primitives ───────────────────────── */

function ThemedPortal({ children }: { children: ReactNode }) {
  const theme = useContext(ThemeContext);
  return createPortal(
    <div className="cal-portal" data-theme={theme}>
      {children}
    </div>,
    document.body
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "ghost" | "danger";
}

function IconButton({ label, children, variant = "ghost", className = "", ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`ui-icon-btn ui-icon-btn--${variant} ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
}

function Button({ variant = "secondary", icon, children, className = "", ...rest }: ButtonProps) {
  return (
    <button type="button" className={`ui-btn ui-btn--${variant} ${className}`} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowRight", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + dir + options.length) % options.length;
    onChange(options[nextIndex].value);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div className="ui-segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className={`ui-segmented__item ${value === option.value ? "is-active" : ""}`}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

function Modal({ open, onClose, title, icon, children, footer, className = "" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const root = dialogRef.current;
    if (root && !root.contains(document.activeElement)) root.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      // Keep Tab / Shift+Tab inside the dialog.
      const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <ThemedPortal>
      <div className="ui-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div
          className={`ui-modal ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          ref={dialogRef}
          tabIndex={-1}
        >
          <div className="ui-modal__header">
            <h3 className="ui-modal__title" id={titleId}>
              {icon}
              {title}
            </h3>
            <IconButton label="Close dialog" onClick={onClose}>
              <IconClose />
            </IconButton>
          </div>

          <div className="ui-modal__body">{children}</div>

          {footer && <div className="ui-modal__footer">{footer}</div>}
        </div>
      </div>
    </ThemedPortal>
  );
}

/* ── Overflow menu ── */

interface MenuItem {
  label: string;
  hint?: string;
  onSelect?: () => void;
  checked?: boolean;
  divider?: boolean;
}

function MenuButton({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    const first = wrapRef.current?.querySelector<HTMLElement>('[role^="menuitem"]');
    first?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      nodes[(idx + 1) % nodes.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nodes[(idx - 1 + nodes.length) % nodes.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      nodes[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      nodes[nodes.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="cal-menu" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-icon-btn"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMore />
      </button>

      {open && (
        <div className="cal-menu__panel" role="menu" id={menuId} aria-label={label} onKeyDown={onMenuKeyDown}>
          {items.map((item, i) =>
            item.divider ? (
              <div key={`d${i}`} className="cal-menu__divider" role="separator" />
            ) : (
              <button
                key={item.label}
                type="button"
                role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
                aria-checked={item.checked}
                tabIndex={-1}
                className="cal-menu__item"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  item.onSelect?.();
                }}
              >
                <span className="cal-menu__check" aria-hidden="true">
                  {item.checked ? "✓" : ""}
                </span>
                <span className="cal-menu__label">{item.label}</span>
                {item.hint && <kbd className="cal-kbd">{item.hint}</kbd>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="cal-toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className="cal-toast">
          <span className="cal-toast__msg">{t.message}</span>
          {t.onAction && (
            <button
              type="button"
              className="cal-toast__action"
              onClick={() => {
                t.onAction?.();
                onDismiss(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
          <IconButton label="Dismiss notification" onClick={() => onDismiss(t.id)}>
            <IconClose />
          </IconButton>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Event atoms ───────────────────────── */

function EventDot({ color }: { color: EventColor }) {
  return <span className="evt-dot" style={colorVars(color)} aria-hidden="true" />;
}

function EventMeta({ event }: { event: CalendarEvent }) {
  const repeats = event.recurrence && event.recurrence !== "none";
  const hasReminder = event.reminder != null && !!event.startTime;
  if (!repeats && !hasReminder) return null;
  return (
    <span className="evt-meta">
      {repeats && (
        <span className="evt-meta__icon" title={recurrenceLabel(event.recurrence)}>
          <IconRepeat />
          <span className="sr-only">{recurrenceLabel(event.recurrence)}</span>
        </span>
      )}
      {hasReminder && (
        <span className="evt-meta__icon" title="Has a reminder">
          <IconBell />
          <span className="sr-only">Has a reminder</span>
        </span>
      )}
    </span>
  );
}

function EventPill({ event, onClick, dense }: { event: CalendarEvent; onClick?: () => void; dense?: boolean }) {
  return (
    <button
      type="button"
      className={`evt-pill ${dense ? "evt-pill--dense" : ""}`}
      style={colorVars(event.color)}
      onClick={onClick}
    >
      <EventDot color={event.color} />
      <span className="evt-pill__text">
        {event.startTime ? `${formatTimeLabel(event.startTime)} · ` : ""}
        {event.title}
      </span>
      <EventMeta event={event} />
    </button>
  );
}

function EventRow({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="evt-row" style={colorVars(event.color)}>
      <EventDot color={event.color} />
      <div className="evt-row__body">
        <strong>
          {event.title}
          <EventMeta event={event} />
        </strong>
        <small>
          {formatEventTime(event)}
          {event.description ? ` · ${event.description}` : ""}
        </small>
      </div>

      {!event.isHoliday && (onEdit || onDelete) && (
        <div className="evt-row__actions">
          {onEdit && (
            <IconButton label={`Edit ${event.title}`} onClick={onEdit}>
              <IconEdit />
            </IconButton>
          )}
          {onDelete && (
            <ConfirmDeleteButton
              mode="popover"
              label={`Delete ${event.title}`}
              itemName={event.title}
              icon={<IconTrash />}
              onDelete={onDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Agenda list ───────────────────────── */

interface AgendaGroup {
  date: string;
  events: CalendarEvent[];
}

function AgendaList({
  groups,
  onEdit,
  onDelete,
  showDates = true,
}: {
  groups: AgendaGroup[];
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  showDates?: boolean;
}) {
  return (
    <div className="ui-scroll-list">
      {groups.map((group) => (
        <section key={group.date} aria-label={dayjs(group.date).format("dddd, MMMM D")}>
          {showDates && <h4 className="ui-section-title">{dayjs(group.date).format("ddd, MMM D")}</h4>}
          {group.events.map((event) => (
            <EventRow
              key={`${event.id}-${group.date}`}
              event={event}
              onEdit={() => onEdit(event)}
              onDelete={() => onDelete(event)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

/* ───────────────────────── Event create / edit modal ───────────────────────── */

export interface EventFormValues {
  title: string;
  description: string;
  color: EventColor;
  date: string;
  startTime: string;
  endTime: string;
  recurrence: Recurrence;
  reminder: number | null;
}

interface EventModalProps {
  open: boolean;
  mode: "create" | "edit";
  date: string;
  initialValues: Partial<CalendarEvent> | null;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => void;
  onDelete: () => void;
}

function EventModal({ open, mode, date, initialValues, onClose, onSubmit, onDelete }: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<EventColor>("blue");
  const [eventDate, setEventDate] = useState(date);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [reminder, setReminder] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const hasTimes = initialValues ? initialValues.startTime !== "" : true;
    setTitle(initialValues?.title || "");
    setDescription(initialValues?.description || "");
    setColor(initialValues?.color || "blue");
    setEventDate(date);
    setAllDay(!hasTimes);
    setStartTime(initialValues?.startTime || "09:00");
    setEndTime(initialValues?.endTime || (initialValues?.startTime ? toHHmm(Math.min(getMinutes(initialValues.startTime) + 60, 1439)) : "10:00"));
    setRecurrence(initialValues?.recurrence || "none");
    setReminder(initialValues?.reminder != null ? String(initialValues.reminder) : "");
    setError("");
  }, [open, initialValues, date]);

  const handleSubmit = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();

    if (!title.trim()) {
      setError("Give the event a title.");
      return;
    }
    if (!eventDate || !dayjs(eventDate).isValid()) {
      setError("Pick a valid date.");
      return;
    }
    if (!allDay && startTime && endTime && getMinutes(endTime) <= getMinutes(startTime)) {
      setError("End time must be after the start time.");
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      color,
      date: eventDate,
      startTime: allDay ? "" : startTime,
      endTime: allDay ? "" : endTime,
      recurrence,
      reminder: allDay || reminder === "" ? null : Number(reminder),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit event" : "Create event"}
      icon={<IconPlus />}
      footer={
        <>
          {mode === "edit" && (
            <ConfirmDeleteButton
              mode="popover"
              iconOnly={false}
              icon={<IconTrash />}
              label="Delete"
              itemName={title || "this event"}
              onDelete={onDelete}
              style={{ marginRight: "auto" }}
            />
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleSubmit()}>
            {mode === "edit" ? "Save changes" : "Create event"}
          </Button>
        </>
      }
    >
      <form className="ui-form" onSubmit={handleSubmit} noValidate>
        <label className="ui-field">
          <span>Title</span>
          <input
            className="ui-input"
            placeholder="Client call, birthday plan, project review…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <label className="ui-field">
          <span>Description</span>
          <input
            className="ui-input"
            placeholder="Optional details"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="ui-field-row">
          <label className="ui-field">
            <span>Date</span>
            <input className="ui-input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </label>
          <label className="ui-field">
            <span>Repeat</span>
            <select
              className="ui-input ui-select"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="ui-check">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          <span>All-day event</span>
        </label>

        {!allDay && (
          <>
            <div className="ui-field-row">
              <label className="ui-field">
                <span>Starts</span>
                <input className="ui-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </label>
              <label className="ui-field">
                <span>Ends</span>
                <input className="ui-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </label>
            </div>

            <label className="ui-field">
              <span>Reminder</span>
              <select className="ui-input ui-select" value={reminder} onChange={(e) => setReminder(e.target.value)}>
                {REMINDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <fieldset className="ui-field">
          <legend>Color</legend>
          <div className="ui-swatch-row">
            {EVENT_COLORS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`ui-swatch ${color === item.value ? "is-selected" : ""}`}
                style={colorVars(item.value)}
                onClick={() => setColor(item.value)}
                aria-pressed={color === item.value}
                aria-label={item.label}
                title={item.label}
              />
            ))}
          </div>
        </fieldset>

        {mode === "edit" && recurrence !== "none" && (
          <p className="ui-hint">Changes apply to every occurrence in this series.</p>
        )}

        {error && (
          <p className="ui-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

/* ───────────────────────── Search / quick add palette ───────────────────────── */

interface PaletteItem {
  key: string;
  kind: "event" | "create";
  label: string;
  meta: string;
  color?: EventColor;
  date: string;
  quick?: QuickAddResult;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  userEvents: EventsMap;
  holidayEvents: EventsMap;
  today: string;
  onJump: (date: string) => void;
  onCreate: (quick: QuickAddResult) => void;
}

function CommandPalette({ open, onClose, userEvents, holidayEvents, today, onJump, onCreate }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    if (!open) return [];
    const base = dayjs(today);
    const q = query.trim();
    const out: PaletteItem[] = [];

    const metaFor = (date: string, ev: CalendarEvent) =>
      `${dayjs(date).format("ddd, MMM D, YYYY")}${ev.startTime ? ` · ${formatTimeLabel(ev.startTime)}` : ""}${
        ev.isHoliday ? " · Holiday" : ""
      }`;

    if (!q) {
      const upcoming = expandUserEvents(userEvents, base, base.add(60, "day"));
      Object.keys(upcoming)
        .sort()
        .forEach((d) =>
          upcoming[d].sort(sortByTime).forEach((ev) =>
            out.push({ key: `${ev.id}-${d}`, kind: "event", label: ev.title, meta: metaFor(d, ev), color: ev.color, date: d })
          )
        );
      return out.slice(0, 8);
    }

    const needle = q.toLowerCase();
    const pool: { date: string; event: CalendarEvent }[] = [];
    Object.keys(userEvents).forEach((d) => userEvents[d].forEach((event) => pool.push({ date: d, event })));
    Object.keys(holidayEvents || {}).forEach((d) =>
      (holidayEvents[d] || []).forEach((event, i) => pool.push({ date: d, event: { ...event, id: `h:${d}:${i}` } }))
    );

    pool
      .filter(
        ({ event }) =>
          event.title.toLowerCase().includes(needle) || (event.description || "").toLowerCase().includes(needle)
      )
      .sort((a, b) => Math.abs(dayjs(a.date).diff(base, "day")) - Math.abs(dayjs(b.date).diff(base, "day")))
      .slice(0, 30)
      .forEach(({ date, event }) =>
        out.push({ key: `${event.id}-${date}`, kind: "event", label: event.title, meta: metaFor(date, event), color: event.color, date })
      );

    const quick = parseQuickAdd(q, base);
    if (quick) {
      const when = `${dayjs(quick.date).format("ddd, MMM D")}${quick.startTime ? ` · ${formatTimeLabel(quick.startTime)}` : " · All day"}${
        quick.recurrence !== "none" ? ` · ${recurrenceLabel(quick.recurrence)}` : ""
      }`;
      const createItem: PaletteItem = {
        key: "create",
        kind: "create",
        label: `Create “${quick.title}”`,
        meta: when,
        date: quick.date,
        quick,
      };
      if (quick.detected) out.unshift(createItem);
      else out.push(createItem);
    }

    return out;
  }, [open, query, userEvents, holidayEvents, today]);

  useEffect(() => setActive(0), [query]);

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    if (item.kind === "create" && item.quick) onCreate(item.quick);
    else onJump(item.date);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(items[active]);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Search & quick add" icon={<IconSearch />} className="ui-modal--palette">
      <input
        className="ui-input ui-input--lg"
        placeholder="Search events, or type “Lunch tomorrow 1pm” to add one"
        value={query}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-activedescendant={items.length ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        autoFocus
      />

      <p className="ui-modal__subtitle ui-modal__subtitle--tight">
        {query.trim() ? `${items.length} result${items.length === 1 ? "" : "s"}` : "Coming up in the next 60 days"}
      </p>

      {items.length === 0 ? (
        <p className="cal-sidebar__empty">{query.trim() ? "Nothing matches that." : "No upcoming events. Type to add one."}</p>
      ) : (
        <ul className="palette-list" role="listbox" id={listId} aria-label="Results">
          {items.map((item, i) => (
            <li
              key={item.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`palette-item ${i === active ? "is-active" : ""} ${item.kind === "create" ? "palette-item--create" : ""}`}
              style={item.color ? colorVars(item.color) : undefined}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(item)}
            >
              {item.kind === "create" ? <IconPlus /> : <EventDot color={item.color || "blue"} />}
              <span className="palette-item__text">
                <strong>{item.label}</strong>
                <small>{item.meta}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/* ───────────────────────── Shortcuts modal ───────────────────────── */

function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" icon={<IconAgenda />}>
      <dl className="shortcut-list">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="shortcut-row">
            <dt>{s.label}</dt>
            <dd>
              <kbd className="cal-kbd">{s.keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

/* ───────────────────────── Mini month ───────────────────────── */

interface MiniMonthProps {
  month: Dayjs;
  selected: string;
  today: string;
  events: EventsMap;
  onPick: (date: string) => void;
  onShift: (delta: number) => void;
}

function MiniMonth({ month, selected, today, events, onPick, onShift }: MiniMonthProps) {
  const gridStart = month.startOf("month").startOf("week");
  const days = Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day"));
  const weekdayLabels = days.slice(0, 7).map((d) => d.format("dd"));

  return (
    <div className="mini" role="group" aria-label={`Mini calendar, ${month.format("MMMM YYYY")}`}>
      <div className="mini__head">
        <strong className="mini__title">{month.format("MMMM YYYY")}</strong>
        <div className="mini__nav">
          <IconButton label="Previous month" onClick={() => onShift(-1)}>
            <IconChevronLeft />
          </IconButton>
          <IconButton label="Next month" onClick={() => onShift(1)}>
            <IconChevronRight />
          </IconButton>
        </div>
      </div>

      <div className="mini__grid" aria-hidden="true">
        {weekdayLabels.map((w, i) => (
          <span key={i} className="mini__dow">
            {w}
          </span>
        ))}
      </div>

      <div className="mini__grid">
        {days.map((d) => {
          const key = fmtDate(d);
          const list = events[key] || [];
          const outside = d.month() !== month.month();
          return (
            <button
              key={key}
              type="button"
              className={`mini__day ${outside ? "is-outside" : ""} ${key === today ? "is-today" : ""} ${
                key === selected ? "is-selected" : ""
              }`}
              aria-label={`${d.format("dddd, MMMM D")}${list.length ? `, ${list.length} event${list.length > 1 ? "s" : ""}` : ""}`}
              aria-pressed={key === selected}
              aria-current={key === today ? "date" : undefined}
              onClick={() => onPick(key)}
            >
              <span>{d.date()}</span>
              {list.length > 0 && (
                <i className="mini__dot" style={{ background: `var(--evt-${list[0].color}-dot)` }} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Tamil panchang badge ───────────────────────── */

interface TamilPanchangBadgeProps {
  isOpen: boolean;
  onToggle: () => void;
  tamilInfo: TamilMonthInfo | null;
  panchang: PanchangFields | null | undefined;
  isPending: boolean;
  variant?: "cell" | "header";
}

const TAMIL_POPOVER_WIDTH = 220;
const TAMIL_POPOVER_EST_HEIGHT = 210;
const TAMIL_POPOVER_GAP = 6;
const TAMIL_POPOVER_VIEWPORT_PADDING = 10;

function TamilPanchangBadge({
  isOpen,
  onToggle,
  tamilInfo,
  panchang,
  isPending,
  variant = "cell",
}: TamilPanchangBadgeProps) {
  const hasPanchangInfo = !!panchang?.rahukaal?.start || !!panchang?.murtham?.start;
  const badgeRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const recalcPosition = useCallback(() => {
    const el = badgeRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = rect.right - TAMIL_POPOVER_WIDTH;
    left = Math.min(
      Math.max(left, TAMIL_POPOVER_VIEWPORT_PADDING),
      window.innerWidth - TAMIL_POPOVER_WIDTH - TAMIL_POPOVER_VIEWPORT_PADDING
    );

    let top = rect.bottom + TAMIL_POPOVER_GAP;
    const overflowsBottom = top + TAMIL_POPOVER_EST_HEIGHT > window.innerHeight - TAMIL_POPOVER_VIEWPORT_PADDING;
    if (overflowsBottom) {
      const above = rect.top - TAMIL_POPOVER_EST_HEIGHT - TAMIL_POPOVER_GAP;
      top = Math.max(above, TAMIL_POPOVER_VIEWPORT_PADDING);
    }

    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return undefined;
    }
    recalcPosition();
    window.addEventListener("resize", recalcPosition);
    window.addEventListener("scroll", recalcPosition, true);
    return () => {
      window.removeEventListener("resize", recalcPosition);
      window.removeEventListener("scroll", recalcPosition, true);
    };
  }, [isOpen, recalcPosition]);

  const touchHandledRef = useRef(false);

  const stopEarly = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    touchHandledRef.current = true;
    onToggle();
    window.setTimeout(() => {
      touchHandledRef.current = false;
    }, 350);
  };

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (touchHandledRef.current) return;
    onToggle();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onToggle();
  };

  const popover =
    isOpen && tamilInfo && coords ? (
      <ThemedPortal>
        <div
          className="tamil-popover"
          role="dialog"
          aria-label="Tamil panchang"
          style={{ top: coords.top, left: coords.left, width: TAMIL_POPOVER_WIDTH }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="tamil-popover__day" lang="ta">{tamilInfo.day}</div>
          <div className="tamil-popover__month" lang="ta">
            {tamilInfo.month.ta}
            <small lang="en">
              {tamilInfo.month.en} {tamilInfo.day}
            </small>
          </div>

          <div className="tamil-popover__divider" />

          {isPending && (
            <div className="tamil-popover__loading">
              <span className="ui-spinner ui-spinner--sm" />
              <small>Loading panchangam…</small>
            </div>
          )}

          {!isPending && hasPanchangInfo && (
            <div className="tamil-popover__facts" lang="ta">
              {panchang?.murtham?.start && (
                <div className="tamil-fact tamil-fact--good">
                  முர்த்தம் {panchang.murtham.start}
                  {panchang.murtham.end ? ` – ${panchang.murtham.end}` : ""}
                </div>
              )}
              {panchang?.rahukaal?.start && (
                <div className="tamil-fact tamil-fact--caution">
                  ராகு காலம் {panchang.rahukaal.start}
                  {panchang.rahukaal.end ? ` – ${panchang.rahukaal.end}` : ""}
                </div>
              )}
            </div>
          )}

          {!isPending && !hasPanchangInfo && (
            <div className="tamil-popover__empty" lang="ta">பஞ்சாங்க தகவல் இல்லை</div>
          )}
        </div>
      </ThemedPortal>
    ) : null;

  return (
    <div
      className={`tamil-wrap ${variant === "header" ? "tamil-wrap--header" : ""}`}
      onMouseDown={stopEarly}
      onTouchStart={stopEarly}
      onTouchMove={stopEarly}
    >
      <div
        ref={badgeRef}
        role="button"
        tabIndex={0}
        className="tamil-badge"
        lang="ta"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Show Tamil panchang for this day"
        onMouseDown={stopEarly}
        onTouchStart={stopEarly}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        த
      </div>

      {popover}
    </div>
  );
}

/* ───────────────────────── Day schedule ───────────────────────── */

interface DayScheduleProps {
  selectedDate: string;
  events: CalendarEvent[];
  dayHours: number[];
  onAddEvent: (startTime?: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onClose?: () => void;
  variant?: "overlay" | "inline";
}

function DaySchedule({
  selectedDate,
  events,
  dayHours,
  onAddEvent,
  onEventClick,
  onClose,
  variant = "overlay",
}: DayScheduleProps) {
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isToday = selectedDate === fmtDate(now);
  const nowMinutes = now.hour() * 60 + now.minute();
  const positioned = useMemo(() => layoutDayEvents(events.filter((e) => !e.isHoliday)), [events]);

  // Scroll to "now" (today) or the first event / 8 AM (other days).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstStart = positioned.length ? Math.min(...positioned.map((p) => p.top)) : 8 * 60;
    el.scrollTop = Math.max(0, (isToday ? nowMinutes : firstStart) - 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return (
    <div className={`day-view ${variant === "inline" ? "day-view--inline" : ""}`} role="region" aria-label="Day schedule">
      <div className="day-view__top">
        <div className="day-view__date">
          <span>{dayjs(selectedDate).format("ddd").toUpperCase()}</span>
          <strong>{dayjs(selectedDate).format("D")}</strong>
        </div>

        <div>
          <h2>{dayjs(selectedDate).format("dddd, MMMM D")}</h2>
          <p className="cal-eyebrow">GMT+05:30</p>
        </div>

        <div className="day-view__actions">
          <Button variant="primary" icon={<IconPlus />} onClick={() => onAddEvent()}>
            Add event
          </Button>
          {onClose && (
            <IconButton label="Close day view" onClick={onClose}>
              <IconClose />
            </IconButton>
          )}
        </div>
      </div>

      {events.length > 0 && (
        <div className="day-view__chips">
          {events.map((event) => (
            <EventPill key={`${event.id}-${event.date}`} event={event} dense onClick={() => onEventClick(event)} />
          ))}
        </div>
      )}

      <div className="day-schedule" ref={scrollRef}>
        <div className="day-schedule__timeline">
          {positioned.map(({ event, top, height, col, cols }) => (
            <button
              type="button"
              key={`${event.id}-${event.date}`}
              className="day-schedule__event"
              onClick={() => onEventClick(event)}
              style={{
                top,
                height: Math.max(height, 34),
                left: `${(col / cols) * 100}%`,
                width: `calc(${100 / cols}% - 4px)`,
                ...colorVars(event.color),
              }}
            >
              <strong>{event.title}</strong>
              <small>{formatEventTime(event)}</small>
            </button>
          ))}
        </div>

        {isToday && (
          <div className="day-schedule__now" style={{ top: nowMinutes }} aria-hidden="true">
            <span />
          </div>
        )}

        {dayHours.map((hour) => (
          <div
            key={hour}
            className="day-schedule__row"
            onClick={() => onAddEvent(toHHmm(hour * 60))}
            title={`Add event at ${formatHour(hour)}`}
          >
            <div className="day-schedule__label">{formatHour(hour)}</div>
            <div className="day-schedule__line" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Week timeline ───────────────────────── */

interface WeekDayColumn {
  date: string;
  isToday: boolean;
  isWeekend: boolean;
  allDay: CalendarEvent[];
  timed: CalendarEvent[];
}

interface WeekTimelineProps {
  weekStart: Dayjs;
  events: EventsMap;
  today: string;
  tamilOpenDate: string | null;
  tamilInfoForOpenDate: TamilMonthInfo | null;
  panchangForOpenDate: PanchangFields | null | undefined;
  isPanchangPending: boolean;
  onToggleTamil: (date: string) => void;
  onAddEvent: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function NowMarker() {
  return (
    <div className="week-now">
      <span className="week-now__dot" aria-hidden="true" />
      <span className="week-now__line" aria-hidden="true" />
      <span className="week-now__label">Now</span>
    </div>
  );
}

function WeekTimeline({
  weekStart,
  events,
  today,
  tamilOpenDate,
  tamilInfoForOpenDate,
  panchangForOpenDate,
  isPanchangPending,
  onToggleTamil,
  onAddEvent,
  onEventClick,
}: WeekTimelineProps) {
  const now = useNow();
  const nowMinutes = now.hour() * 60 + now.minute();

  const columns: WeekDayColumn[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = weekStart.add(i, "day");
      const fullDate = fmtDate(d);
      const dayEvents = events[fullDate] || [];

      return {
        date: fullDate,
        isToday: fullDate === today,
        isWeekend: d.day() === 0 || d.day() === 6,
        allDay: dayEvents.filter((e) => !e.startTime),
        timed: dayEvents.filter((e) => !!e.startTime).slice().sort(sortByTime),
      };
    });
  }, [weekStart, events, today]);

  return (
    <div className="week-board">
      {columns.map((col) => {
        const dayjsDate = dayjs(col.date);
        const isTamilOpen = tamilOpenDate === col.date;

        let nowIndex = col.timed.length;
        if (col.isToday) {
          const firstLater = col.timed.findIndex((event) => getMinutes(event.startTime) > nowMinutes);
          nowIndex = firstLater === -1 ? col.timed.length : firstLater;
        }

        return (
          <div
            key={col.date}
            className={`week-col ${col.isToday ? "week-col--today" : ""} ${col.isWeekend ? "week-col--weekend" : ""}`}
          >
            <div className="week-col__header">
              <div className="week-col__date">
                <span className="week-col__weekday">{dayjsDate.format("ddd")}</span>
                <strong className="week-col__daynum">{dayjsDate.format("D")}</strong>
              </div>

              <TamilPanchangBadge
                variant="header"
                isOpen={isTamilOpen}
                onToggle={() => onToggleTamil(col.date)}
                tamilInfo={isTamilOpen ? tamilInfoForOpenDate : null}
                panchang={isTamilOpen ? panchangForOpenDate : null}
                isPending={isTamilOpen && isPanchangPending}
              />
            </div>

            {col.allDay.length > 0 && (
              <div className="week-col__allday">
                {col.allDay.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="week-chip"
                    style={colorVars(event.color)}
                    onClick={() => onEventClick(event)}
                  >
                    <EventDot color={event.color} />
                    <span>{event.title}</span>
                    <EventMeta event={event} />
                  </button>
                ))}
              </div>
            )}

            <div className="week-timeline">
              {col.timed.length === 0 && (
                <button type="button" className="week-empty" onClick={() => onAddEvent(col.date)}>
                  <span className="week-empty__dot" aria-hidden="true" />
                  Nothing planned — tap to add
                </button>
              )}

              {col.timed.map((event, i) => (
                <div key={event.id}>
                  {col.isToday && nowIndex === i && <NowMarker />}
                  <button
                    type="button"
                    className="week-node"
                    style={colorVars(event.color)}
                    onClick={() => onEventClick(event)}
                  >
                    <span className="week-node__dot" aria-hidden="true" />
                    <span className="week-node__card">
                      <strong>{event.title}</strong>
                      <small>
                        {formatEventTime(event)}
                        <EventMeta event={event} />
                      </small>
                    </span>
                  </button>
                </div>
              ))}

              {col.isToday && nowIndex === col.timed.length && <NowMarker />}
            </div>

            <button
              type="button"
              className="week-col__add"
              onClick={() => onAddEvent(col.date)}
              aria-label={`Add event on ${dayjsDate.format("MMMM D")}`}
            >
              <IconPlus />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Main component ───────────────────────── */

const CalendarPage = ({ onClose }: CalendarPageProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (onClose) onClose();
    else navigate(-1);
  }, [onClose, navigate]);

  /* ---- persisted preferences ---- */
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());
  const updatePrefs = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable */
    }
  }, [prefs]);

  const viewMode = prefs.viewMode;
  const setViewMode = useCallback((v: ViewMode) => updatePrefs({ viewMode: v }), [updatePrefs]);

  /* ---- data ---- */
  const [userEvents, setUserEvents] = useState<EventsMap>(() => readEventsFromStorage());
  const holidayEvents = useSelector((state: RootState) => state.calendar.holidays as EventsMap);
  const holidaysLoading = useSelector((state: RootState) => state.calendar.holidaysLoading as boolean);
  const rawPanchang = useSelector((state: RootState) => state.calendar.panchang);
  const panchangLoading = useSelector((state: RootState) => state.calendar.panchangLoading as boolean);

  const [selectedDate, setSelectedDate] = useState(fmtDate(dayjs()));
  const [rbcDate, setRbcDate] = useState<Date>(dayjs().toDate());

  /* ---- overlays ---- */
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [mobileAgendaOpen, setMobileAgendaOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const [eventModal, setEventModal] = useState<EventModalState>({
    open: false,
    mode: "create",
    id: null,
    date: fmtDate(dayjs()),
    initialValues: null,
  });

  /* ---- toasts ---- */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const dismissToast = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  const pushToast = useCallback(
    (message: string, opts?: { actionLabel?: string; onAction?: () => void; duration?: number }) => {
      toastIdRef.current += 1;
      const id = toastIdRef.current;
      setToasts((p) => [...p.slice(-3), { id, message, actionLabel: opts?.actionLabel, onAction: opts?.onAction }]);
      window.setTimeout(() => dismissToast(id), opts?.duration ?? 6000);
    },
    [dismissToast]
  );

  /* ---- Tamil / panchang popover ---- */
  const [tamilOpenDate, setTamilOpenDate] = useState<string | null>(null);
  const [panchangCache, setPanchangCache] = useState<Record<string, PanchangFields | null>>({});
  const pendingPanchangDateRef = useRef<string | null>(null);

  const fetchPanchangIfNeeded = useCallback(
    (fullDate: string) => {
      if (panchangCache[fullDate]) return;
      pendingPanchangDateRef.current = fullDate;
      dispatch(getPanchang(fullDate) as any);
    },
    [dispatch, panchangCache]
  );

  const toggleTamilPopover = useCallback(
    (fullDate: string) => {
      const next = tamilOpenDate === fullDate ? null : fullDate;
      setTamilOpenDate(next);
      if (next) fetchPanchangIfNeeded(next);
    },
    [tamilOpenDate, fetchPanchangIfNeeded]
  );

  const openDayDetails = useCallback(
    (fullDate: string) => {
      setSelectedDate(fullDate);
      setDayDetailsOpen(true);
      fetchPanchangIfNeeded(fullDate);
    },
    [fetchPanchangIfNeeded]
  );

  const openFullDayView = useCallback(
    (fullDate: string) => {
      setSelectedDate(fullDate);
      setRbcDate(dayjs(fullDate).toDate());
      setViewMode("day");
    },
    [setViewMode]
  );

  useEffect(() => {
    if (!tamilOpenDate) return undefined;
    const onDocClick = () => setTamilOpenDate(null);
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setTamilOpenDate(null);
    document.addEventListener("click", onDocClick);
    document.addEventListener("touchend", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("touchend", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tamilOpenDate]);

  useEffect(() => {
    if (!rawPanchang || !pendingPanchangDateRef.current) return;
    const date = pendingPanchangDateRef.current;
    setPanchangCache((prev) => ({ ...prev, [date]: extractPanchangFields(rawPanchang) }));
    pendingPanchangDateRef.current = null;
  }, [rawPanchang]);

  const tamilInfoForOpenDate = useMemo(
    () => (tamilOpenDate ? getTamilMonthInfo(dayjs(tamilOpenDate)) : null),
    [tamilOpenDate]
  );
  const panchangForOpenDate = tamilOpenDate ? panchangCache[tamilOpenDate] : null;
  const isPanchangPending =
    !!tamilOpenDate &&
    !panchangForOpenDate &&
    (panchangLoading || pendingPanchangDateRef.current === tamilOpenDate);

  const dayDetailsTamilInfo = useMemo(
    () => (dayDetailsOpen ? getTamilMonthInfo(dayjs(selectedDate)) : null),
    [dayDetailsOpen, selectedDate]
  );
  const dayDetailsPanchang = dayDetailsOpen ? panchangCache[selectedDate] : null;
  const isDayDetailsPanchangPending =
    dayDetailsOpen && !dayDetailsPanchang && (panchangLoading || pendingPanchangDateRef.current === selectedDate);
  const dayDetailsHasPanchangInfo = !!dayDetailsPanchang?.rahukaal?.start || !!dayDetailsPanchang?.murtham?.start;

  /* ---- derived dates ---- */
  const currentMonth = useMemo(() => dayjs(rbcDate), [rbcDate]);
  const currentYear = currentMonth.format("YYYY");
  const today = fmtDate(dayjs());
  const monthKey = currentMonth.format("YYYY-MM");
  const dayHours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const weekStart = useMemo(() => dayjs(rbcDate).startOf("week"), [rbcDate]);

  const headerTitle = useMemo(() => {
    if (viewMode === "day") return dayjs(selectedDate).format("MMMM D, YYYY");
    if (viewMode === "week") {
      const end = weekStart.add(6, "day");
      return `${weekStart.format("MMM D")} – ${end.format("MMM D, YYYY")}`;
    }
    return dayjs(rbcDate).format("MMMM YYYY");
  }, [viewMode, selectedDate, rbcDate, weekStart]);

  // Screen-reader announcement when the visible period or view changes.
  const [announcement, setAnnouncement] = useState("");
  const firstAnnounceRef = useRef(true);
  useEffect(() => {
    if (firstAnnounceRef.current) {
      firstAnnounceRef.current = false;
      return;
    }
    setAnnouncement(`${VIEW_MODES.find((v) => v.value === viewMode)?.label} view, ${headerTitle}`);
  }, [viewMode, headerTitle]);

  /* ---- storage sync ---- */
  const refreshEventsFromStorage = useCallback(() => setUserEvents(readEventsFromStorage()), []);

  useEffect(() => {
    window.addEventListener("calendarEventsUpdated", refreshEventsFromStorage);
    window.addEventListener("storage", refreshEventsFromStorage);
    return () => {
      window.removeEventListener("calendarEventsUpdated", refreshEventsFromStorage);
      window.removeEventListener("storage", refreshEventsFromStorage);
    };
  }, [refreshEventsFromStorage]);

  const fetchedYearsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (fetchedYearsRef.current.has(currentYear)) return;
    fetchedYearsRef.current.add(currentYear);
    dispatch(getHolidays(currentYear) as any);
  }, [currentYear, dispatch]);

  /* ---- merged + filtered events ---- */
  const rangeStart = useMemo(() => {
    const a = dayjs(rbcDate);
    const b = dayjs(selectedDate);
    return (a.isBefore(b) ? a : b).subtract(1, "month").startOf("month");
  }, [rbcDate, selectedDate]);
  const rangeEnd = useMemo(() => {
    const a = dayjs(rbcDate);
    const b = dayjs(selectedDate);
    return (a.isAfter(b) ? a : b).add(1, "month").endOf("month");
  }, [rbcDate, selectedDate]);

  const events = useMemo<EventsMap>(() => {
    const expanded = expandUserEvents(userEvents, rangeStart, rangeEnd);
    const merged: EventsMap = {};
    Object.keys({ ...expanded, ...(holidayEvents || {}) }).forEach((date) => {
      const holidays = (holidayEvents?.[date] || []).map((e, i) => ({
        ...e,
        id: e.id || `h:${date}:${i}`,
        date,
      }));
      merged[date] = [...holidays, ...(expanded[date] || []).sort(sortByTime)];
    });
    return merged;
  }, [userEvents, holidayEvents, rangeStart, rangeEnd]);

  const visibleEvents = useMemo<EventsMap>(() => {
    const out: EventsMap = {};
    Object.keys(events).forEach((date) => {
      const list = events[date].filter((e) => {
        if (prefs.hiddenColors.includes(e.color)) return false;
        return e.isHoliday ? prefs.showHolidays : prefs.showMine;
      });
      if (list.length) out[date] = list;
    });
    return out;
  }, [events, prefs.hiddenColors, prefs.showHolidays, prefs.showMine]);

  const selectedEvents = useMemo(() => visibleEvents[selectedDate] || [], [visibleEvents, selectedDate]);

  const visibleRange = useMemo(() => {
    if (viewMode !== "week") return null;
    return { start: weekStart, end: weekStart.add(7, "day") };
  }, [viewMode, weekStart]);

  const monthDates = useMemo(
    () => Object.keys(visibleEvents).filter((d) => d.startsWith(monthKey)).sort(),
    [visibleEvents, monthKey]
  );

  const agendaGroups = useMemo<AgendaGroup[]>(() => {
    if (viewMode === "day") {
      return selectedEvents.length ? [{ date: selectedDate, events: selectedEvents }] : [];
    }
    if (viewMode === "week" && visibleRange) {
      return Array.from({ length: 7 }, (_, i) => fmtDate(visibleRange.start.add(i, "day")))
        .filter((d) => (visibleEvents[d] || []).length > 0)
        .map((d) => ({ date: d, events: visibleEvents[d] }));
    }
    return monthDates.map((d) => ({ date: d, events: visibleEvents[d] }));
  }, [viewMode, selectedDate, selectedEvents, visibleRange, visibleEvents, monthDates]);

  const rbcEvents = useMemo(() => {
    const list: any[] = [];
    Object.keys(visibleEvents).forEach((date) => {
      visibleEvents[date].forEach((event) => {
        const hasTime = !!event.startTime;
        const start = hasTime ? dayjs(`${date}T${event.startTime}`).toDate() : dayjs(date).startOf("day").toDate();
        const end = hasTime
          ? dayjs(`${date}T${event.endTime || event.startTime}`).toDate()
          : dayjs(date).endOf("day").toDate();

        list.push({
          id: `${date}::${event.id}`,
          title: event.title,
          start,
          end,
          allDay: !hasTime,
          resource: { date, id: event.id, color: event.color, isHoliday: event.isHoliday },
        });
      });
    });
    return list;
  }, [visibleEvents]);

  /* ---- navigation ---- */
  const jumpToDate = useCallback((date: string) => {
    setSelectedDate(date);
    setRbcDate(dayjs(date).toDate());
  }, []);

  const goToPrevious = () => {
    if (viewMode === "day") jumpToDate(fmtDate(dayjs(selectedDate).subtract(1, "day")));
    else if (viewMode === "week") setRbcDate(dayjs(rbcDate).subtract(1, "week").toDate());
    else setRbcDate(dayjs(rbcDate).subtract(1, "month").toDate());
  };

  const goToNext = () => {
    if (viewMode === "day") jumpToDate(fmtDate(dayjs(selectedDate).add(1, "day")));
    else if (viewMode === "week") setRbcDate(dayjs(rbcDate).add(1, "week").toDate());
    else setRbcDate(dayjs(rbcDate).add(1, "month").toDate());
  };

  const goToToday = () => jumpToDate(fmtDate(dayjs()));

  const openAgenda = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 900) setMobileAgendaOpen(true);
    else setAgendaOpen(true);
  };

  /* ---- CRUD (all keyed by event id, so recurring + reordered events stay correct) ---- */
  const openCreateModal = (fullDate: string, preset?: Partial<CalendarEvent>) => {
    setSelectedDate(fullDate);
    setEventModal({ open: true, mode: "create", id: null, date: fullDate, initialValues: preset || null });
  };

  const openEditModal = (event: CalendarEvent) => {
    if (event.isHoliday) return;
    const source = findSourceEvent(readEventsFromStorage(), event.id);
    if (!source) return;
    setSelectedDate(event.date || source.date);
    setEventModal({ open: true, mode: "edit", id: event.id, date: source.date, initialValues: source.event });
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.isHoliday) openDayDetails(event.date || selectedDate);
    else openEditModal(event);
  };

  const closeEventModal = () => setEventModal((prev) => ({ ...prev, open: false }));

  const handleSelectSlot = (slotInfo: { start: Date }) => openFullDayView(fmtDate(dayjs(slotInfo.start)));

  const handleSelectRbcEvent = (rbcEvent: any) => {
    const { date, id } = rbcEvent.resource || {};
    if (!date || !id) return;
    const ev = (visibleEvents[date] || []).find((e) => e.id === id);
    if (ev) handleEventClick(ev);
  };

  const requestNotificationPermission = () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  };

  const handleEventSubmit = (values: EventFormValues) => {
    const current = readEventsFromStorage();
    if (values.reminder !== null) requestNotificationPermission();

    const { date, ...rest } = values;

    if (eventModal.mode === "create") {
      const created: CalendarEvent = { ...rest, id: uid(), category: "Personal Event", isHoliday: false };
      const next: EventsMap = { ...current, [date]: [...(current[date] || []), created] };
      writeEventsToStorage(next);
      setUserEvents(next);
    } else if (eventModal.id) {
      const source = findSourceEvent(current, eventModal.id);
      if (!source) return;
      const updated: CalendarEvent = { ...source.event, ...rest };
      const next: EventsMap = { ...current };

      if (source.date === date) {
        next[date] = (next[date] || []).map((e) => (e.id === updated.id ? updated : e));
      } else {
        next[source.date] = (next[source.date] || []).filter((e) => e.id !== updated.id);
        next[date] = [...(next[date] || []), updated];
      }
      const cleaned = pruneEmpty(next);
      writeEventsToStorage(cleaned);
      setUserEvents(cleaned);
    }

    setSelectedDate(date);
    closeEventModal();
  };

  const deleteEventById = (id: string) => {
    const previous = readEventsFromStorage();
    const source = findSourceEvent(previous, id);
    if (!source) return;

    const next = pruneEmpty({
      ...previous,
      [source.date]: (previous[source.date] || []).filter((e) => e.id !== id),
    });
    writeEventsToStorage(next);
    setUserEvents(next);

    pushToast(`Deleted “${source.event.title}”`, {
      actionLabel: "Undo",
      onAction: () => {
        writeEventsToStorage(previous);
        setUserEvents(previous);
      },
      duration: 8000,
    });
  };

  const handleModalDelete = () => {
    if (eventModal.id) deleteEventById(eventModal.id);
    closeEventModal();
  };

  const quickCreate = (quick: QuickAddResult) => {
    const current = readEventsFromStorage();
    const created: CalendarEvent = {
      id: uid(),
      title: quick.title,
      description: "",
      startTime: quick.startTime,
      endTime: quick.endTime,
      color: "blue",
      category: "Personal Event",
      isHoliday: false,
      recurrence: quick.recurrence,
      reminder: null,
    };
    const next: EventsMap = { ...current, [quick.date]: [...(current[quick.date] || []), created] };
    writeEventsToStorage(next);
    setUserEvents(next);
    jumpToDate(quick.date);
    pushToast(`Added “${quick.title}” on ${dayjs(quick.date).format("ddd, MMM D")}`, {
      actionLabel: "Undo",
      onAction: () => {
        writeEventsToStorage(current);
        setUserEvents(current);
      },
    });
  };

  /* ---- reminders ---- */
  const userEventsRef = useRef(userEvents);
  userEventsRef.current = userEvents;
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      const now = dayjs();
      const day = fmtDate(now);
      const nowMin = now.hour() * 60 + now.minute();
      const todays = expandUserEvents(userEventsRef.current, now, now)[day] || [];

      todays.forEach((ev) => {
        if (ev.reminder == null || !ev.startTime) return;
        const start = getMinutes(ev.startTime);
        if (nowMin < start - ev.reminder || nowMin > start) return;

        const key = `${ev.id}:${day}:${ev.startTime}:${ev.reminder}`;
        if (notifiedRef.current.has(key)) return;
        notifiedRef.current.add(key);

        const left = start - nowMin;
        const body = left <= 0 ? "Starting now" : `Starts in ${left} min · ${formatTimeLabel(ev.startTime)}`;
        pushToast(`${ev.title} — ${body}`, { duration: 15000 });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(ev.title, { body });
          } catch {
            /* some browsers only allow notifications via service worker */
          }
        }
      });
    };

    check();
    const timer = window.setInterval(check, 30000);
    return () => window.clearInterval(timer);
  }, [pushToast]);

  /* ---- import / export ---- */
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportICS = () => {
    const current = readEventsFromStorage();
    const count = Object.values(current).reduce((n, l) => n + l.length, 0);
    if (count === 0) {
      pushToast("Nothing to export yet — add an event first.");
      return;
    }
    const blob = new Blob([buildICS(current)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `indian-calendar-${today}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast(`Exported ${count} event${count === 1 ? "" : "s"}`);
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = parseICS(await file.text());
      if (parsed.length === 0) {
        pushToast("No events found in that file.");
        return;
      }
      const previous = readEventsFromStorage();
      const known = new Set<string>();
      Object.values(previous).forEach((l) => l.forEach((ev) => known.add(ev.id)));

      const next: EventsMap = { ...previous };
      let added = 0;
      parsed.forEach(({ date, event }) => {
        if (known.has(event.id)) return;
        known.add(event.id);
        next[date] = [...(next[date] || []), event];
        added += 1;
      });

      writeEventsToStorage(next);
      setUserEvents(next);
      pushToast(
        added === parsed.length ? `Imported ${added} events` : `Imported ${added} new events (${parsed.length - added} already here)`,
        {
          actionLabel: "Undo",
          onAction: () => {
            writeEventsToStorage(previous);
            setUserEvents(previous);
          },
        }
      );
    } catch (error) {
      console.error("Import failed", error);
      pushToast("Couldn't read that file. Use an .ics calendar export.");
    }
  };

  /* ---- keyboard shortcuts ---- */
  const shortcutRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  shortcutRef.current = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    if (document.body.style.overflow === "hidden") return; // a dialog is open

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setPaletteOpen(true);
      return;
    }

    const t = e.target as HTMLElement | null;
    const typing = !!t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const onBody = !t || t === document.body;

    switch (e.key) {
      case "t":
        goToToday();
        break;
      case "d":
        setViewMode("day");
        break;
      case "w":
        setViewMode("week");
        break;
      case "m":
        setViewMode("month");
        break;
      case "n":
        e.preventDefault();
        openCreateModal(selectedDate || today);
        break;
      case "a":
        openAgenda();
        break;
      case "/":
        e.preventDefault();
        setPaletteOpen(true);
        break;
      case "?":
        setShortcutsOpen(true);
        break;
      case "[":
        goToPrevious();
        break;
      case "]":
        goToNext();
        break;
      case "ArrowLeft":
        if (onBody) goToPrevious();
        break;
      case "ArrowRight":
        if (onBody) goToNext();
        break;
      default:
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => shortcutRef.current(e);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* ---- react-big-calendar custom components ---- */
  const showTamilDates = prefs.showTamilDates;
  const rbcComponents = useMemo(
    () => ({
      event: ({ event }: any) => {
        const color = (event.resource?.color as EventColor) || "blue";
        return (
          <div className="rbcx-event" style={colorVars(color)}>
            <EventDot color={color} />
            <span className="rbcx-event__text">{event.title}</span>
          </div>
        );
      },
      month: {
        dateHeader: ({ date, label }: { date: Date; label: string }) => {
          const d = dayjs(date);
          const fullDate = fmtDate(d);
          const isToday = fullDate === fmtDate(dayjs());
          const tamil = showTamilDates ? getTamilMonthInfoCached(d) : null;
          return (
            <div className="rbcx-daycell-top">
              <span
                className={`rbcx-daynum ${isToday ? "rbcx-daynum--today" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`Open details for ${d.format("MMMM D, YYYY")}${isToday ? " (today)" : ""}${
                  tamil ? `, Tamil ${tamil.month.en} ${tamil.day}` : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  openDayDetails(fullDate);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    openDayDetails(fullDate);
                  }
                }}
              >
                {label}
              </span>
              {tamil && (
                <span className={`rbcx-tamil ${tamil.day === 1 ? "is-first" : ""}`} lang="ta" aria-hidden="true">
                  {tamil.day === 1 ? tamil.month.ta : tamil.day}
                </span>
              )}
            </div>
          );
        },
      },
    }),
    [openDayDetails, showTamilDates]
  );

  /* ---- menu ---- */
  const menuItems: MenuItem[] = [
    { label: "Search & quick add", hint: "/", onSelect: () => setPaletteOpen(true) },
    { label: "Keyboard shortcuts", hint: "?", onSelect: () => setShortcutsOpen(true) },
    { divider: true, label: "d1" },
    { label: "Light theme", checked: prefs.theme === "light", onSelect: () => updatePrefs({ theme: prefs.theme === "light" ? "dark" : "light" }) },
    { label: "Show Tamil dates", checked: prefs.showTamilDates, onSelect: () => updatePrefs({ showTamilDates: !prefs.showTamilDates }) },
    { divider: true, label: "d2" },
    { label: "Export calendar (.ics)", onSelect: exportICS },
    { label: "Import calendar (.ics)", onSelect: () => fileInputRef.current?.click() },
    ...(typeof Notification !== "undefined" && Notification.permission === "default"
      ? [
          { divider: true, label: "d3" },
          {
            label: "Enable desktop reminders",
            onSelect: () => requestNotificationPermission(),
          } as MenuItem,
        ]
      : []),
  ];

  const toggleColor = (color: EventColor) =>
    updatePrefs({
      hiddenColors: prefs.hiddenColors.includes(color)
        ? prefs.hiddenColors.filter((c) => c !== color)
        : [...prefs.hiddenColors, color],
    });

  const agendaTitle = viewMode === "week" ? "Week agenda" : viewMode === "day" ? "Day agenda" : "Month agenda";
  const agendaSubtitle =
    viewMode === "day"
      ? dayjs(selectedDate).format("dddd, MMMM D, YYYY")
      : viewMode === "week" && visibleRange
        ? `${visibleRange.start.format("MMM D")} – ${visibleRange.end.subtract(1, "day").format("MMM D, YYYY")}`
        : currentMonth.format("MMMM YYYY");

  return (
    <ThemeContext.Provider value={prefs.theme}>
      <div className="cal" data-theme={prefs.theme}>
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>

        {/*  Header  */}
        <header className="cal-topbar">
          <button type="button" className="cal-topbar__back" onClick={handleBack} aria-label="Go back">
            <IconBack />
          </button>

          <div className="cal-topbar__title">
            <div className="cal-topbar__eyebrow-row">
              <span className="cal-eyebrow">Indian Calendar</span>
              <span className="cal-today-badge">
                <span className="cal-today-badge__dot" aria-hidden="true" />
                {dayjs().format("ddd, MMM D, YYYY")}
              </span>
            </div>
            <h1>{headerTitle}</h1>
          </div>

          <div className="cal-topbar__nav">
            <Button variant="secondary" icon={<IconToday />} onClick={goToToday}>
              Today
            </Button>
            <IconButton label="Previous" onClick={goToPrevious}>
              <IconChevronLeft />
            </IconButton>
            <IconButton label="Next" onClick={goToNext}>
              <IconChevronRight />
            </IconButton>
          </div>

          <div className="cal-topbar__controls">
            <Segmented<ViewMode> ariaLabel="Calendar view" options={VIEW_MODES} value={viewMode} onChange={setViewMode} />

            <IconButton label="Search and quick add (/)" onClick={() => setPaletteOpen(true)}>
              <IconSearch />
            </IconButton>
            <Button variant="secondary" icon={<IconAgenda />} onClick={openAgenda}>
              Agenda
            </Button>
            <Button variant="primary" icon={<IconPlus />} onClick={() => openCreateModal(selectedDate || today)}>
              New event
            </Button>
            <MenuButton label="More options" items={menuItems} />
          </div>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,text/calendar"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleImportFile}
        />

        <div className="cal-body">
          <aside className={`cal-sidebar ${mobileAgendaOpen ? "is-open" : ""}`} aria-label="Calendar sidebar">
            <div className="cal-sidebar__header">
              <h2>Calendar</h2>
              <IconButton label="Close agenda" className="cal-sidebar__close" onClick={() => setMobileAgendaOpen(false)}>
                <IconClose />
              </IconButton>
            </div>

            <MiniMonth
              month={currentMonth}
              selected={selectedDate}
              today={today}
              events={visibleEvents}
              onPick={(d) => {
                jumpToDate(d);
                setMobileAgendaOpen(false);
              }}
              onShift={(delta) => setRbcDate(dayjs(rbcDate).add(delta, "month").startOf("month").toDate())}
            />

            <fieldset className="cal-filters">
              <legend>Show</legend>
              <label className="ui-check">
                <input type="checkbox" checked={prefs.showMine} onChange={(e) => updatePrefs({ showMine: e.target.checked })} />
                <span>My events</span>
              </label>
              <label className="ui-check">
                <input
                  type="checkbox"
                  checked={prefs.showHolidays}
                  onChange={(e) => updatePrefs({ showHolidays: e.target.checked })}
                />
                <span>Holidays</span>
              </label>
              <div className="cal-filters__colors" role="group" aria-label="Filter by color">
                {EVENT_COLORS.map((c) => {
                  const hidden = prefs.hiddenColors.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      className={`ui-swatch ui-swatch--sm ${hidden ? "is-off" : ""}`}
                      style={colorVars(c.value)}
                      aria-pressed={!hidden}
                      aria-label={`${hidden ? "Show" : "Hide"} ${c.label} events`}
                      title={`${hidden ? "Show" : "Hide"} ${c.label}`}
                      onClick={() => toggleColor(c.value)}
                    />
                  );
                })}
              </div>
            </fieldset>

            <div className="cal-sidebar__header">
              <h2>This month</h2>
            </div>

            {holidaysLoading ? (
              <div className="ui-loading">
                <span className="ui-spinner" />
              </div>
            ) : monthDates.length === 0 ? (
              <p className="cal-sidebar__empty">No events this month yet.</p>
            ) : (
              <div className="cal-sidebar__list">
                {monthDates.map((date) => (
                  <div key={date} className="cal-sidebar__group">
                    <strong>{dayjs(date).format("MMM D, ddd")}</strong>
                    {visibleEvents[date].map((event) => (
                      <button
                        type="button"
                        key={`${event.id}-${date}`}
                        className="cal-sidebar__item"
                        style={colorVars(event.color)}
                        onClick={() => handleEventClick(event)}
                      >
                        <EventDot color={event.color} />
                        <span>{event.title}</span>
                        <EventMeta event={event} />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </aside>
          {mobileAgendaOpen && <div className="cal-scrim" onClick={() => setMobileAgendaOpen(false)} aria-hidden="true" />}

          {/*  Main area  */}
          <main className="cal-main">
            {viewMode === "day" ? (
              <DaySchedule
                selectedDate={selectedDate}
                events={selectedEvents}
                dayHours={dayHours}
                onAddEvent={(time) =>
                  openCreateModal(
                    selectedDate,
                    time ? { startTime: time, endTime: toHHmm(Math.min(getMinutes(time) + 60, 1439)) } : undefined
                  )
                }
                onEventClick={handleEventClick}
                variant="inline"
              />
            ) : viewMode === "week" ? (
              <div className="cal-week-wrap">
                <WeekTimeline
                  weekStart={weekStart}
                  events={visibleEvents}
                  today={today}
                  tamilOpenDate={tamilOpenDate}
                  tamilInfoForOpenDate={tamilInfoForOpenDate}
                  panchangForOpenDate={panchangForOpenDate}
                  isPanchangPending={isPanchangPending}
                  onToggleTamil={toggleTamilPopover}
                  onAddEvent={(d) => openCreateModal(d)}
                  onEventClick={handleEventClick}
                />
              </div>
            ) : (
              <div className="cal-rbc-wrap">
                <Calendar
                  localizer={rbcLocalizer}
                  events={rbcEvents}
                  date={rbcDate}
                  view={Views.MONTH}
                  onView={() => {}}
                  onNavigate={(d: Date) => setRbcDate(d)}
                  toolbar={false}
                  popup
                  selectable
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectRbcEvent}
                  components={rbcComponents}
                  style={{ height: "100%" }}
                />
              </div>
            )}
          </main>
        </div>

        {/* Day details modal */}
        <Modal
          open={dayDetailsOpen}
          onClose={() => setDayDetailsOpen(false)}
          title={dayjs(selectedDate).format("dddd, MMMM D, YYYY")}
          icon={<IconAgenda />}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setDayDetailsOpen(false);
                  openFullDayView(selectedDate);
                }}
              >
                Open day
              </Button>
              <Button variant="secondary" onClick={() => setDayDetailsOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={<IconPlus />}
                onClick={() => {
                  setDayDetailsOpen(false);
                  openCreateModal(selectedDate);
                }}
              >
                Add event
              </Button>
            </>
          }
        >
          {dayDetailsTamilInfo && (
            <div className="day-details__tamil">
              <div className="day-details__tamil-day" lang="ta">{dayDetailsTamilInfo.day}</div>
              <div className="day-details__tamil-month" lang="ta">
                {dayDetailsTamilInfo.month.ta}
                <small lang="en">
                  {dayDetailsTamilInfo.month.en} {dayDetailsTamilInfo.day}
                </small>
              </div>

              <div className="day-details__tamil-divider" />

              {isDayDetailsPanchangPending && (
                <div className="tamil-popover__loading">
                  <span className="ui-spinner ui-spinner--sm" />
                  <small>Loading panchangam…</small>
                </div>
              )}

              {!isDayDetailsPanchangPending && dayDetailsHasPanchangInfo && (
                <div className="tamil-popover__facts" lang="ta">
                  {dayDetailsPanchang?.murtham?.start && (
                    <div className="tamil-fact tamil-fact--good">
                      முர்த்தம் {dayDetailsPanchang.murtham.start}
                      {dayDetailsPanchang.murtham.end ? ` – ${dayDetailsPanchang.murtham.end}` : ""}
                    </div>
                  )}
                  {dayDetailsPanchang?.rahukaal?.start && (
                    <div className="tamil-fact tamil-fact--caution">
                      ராகு காலம் {dayDetailsPanchang.rahukaal.start}
                      {dayDetailsPanchang.rahukaal.end ? ` – ${dayDetailsPanchang.rahukaal.end}` : ""}
                    </div>
                  )}
                </div>
              )}

              {!isDayDetailsPanchangPending && !dayDetailsHasPanchangInfo && (
                <div className="tamil-popover__empty" lang="ta">பஞ்சாங்க தகவல் இல்லை</div>
              )}
            </div>
          )}

          {selectedEvents.length === 0 ? (
            <p className="cal-sidebar__empty">No events for this day.</p>
          ) : (
            <AgendaList
              showDates={false}
              groups={[{ date: selectedDate, events: selectedEvents }]}
              onEdit={(event) => {
                setDayDetailsOpen(false);
                openEditModal(event);
              }}
              onDelete={(event) => deleteEventById(event.id)}
            />
          )}
        </Modal>

        {/*  Agenda modal  */}
        <Modal open={agendaOpen} onClose={() => setAgendaOpen(false)} title={agendaTitle} icon={<IconAgenda />}>
          <p className="ui-modal__subtitle">{agendaSubtitle}</p>
          {agendaGroups.length === 0 ? (
            <p className="cal-sidebar__empty">
              No events {viewMode === "day" ? "for this day" : viewMode === "week" ? "this week" : "this month"}.
            </p>
          ) : (
            <AgendaList
              groups={agendaGroups}
              showDates={viewMode !== "day"}
              onEdit={(event) => {
                setAgendaOpen(false);
                openEditModal(event);
              }}
              onDelete={(event) => deleteEventById(event.id)}
            />
          )}
        </Modal>

        {/* Create / edit modal  */}
        <EventModal
          open={eventModal.open}
          mode={eventModal.mode}
          date={eventModal.date}
          initialValues={eventModal.initialValues}
          onClose={closeEventModal}
          onSubmit={handleEventSubmit}
          onDelete={handleModalDelete}
        />

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          userEvents={userEvents}
          holidayEvents={holidayEvents}
          today={today}
          onJump={openFullDayView}
          onCreate={quickCreate}
        />

        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>
    </ThemeContext.Provider>
  );
};

export default CalendarPage;