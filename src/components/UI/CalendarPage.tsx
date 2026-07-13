import {useEffect,useMemo,useRef,useState,useCallback,useId,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type FormEvent,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs, { type Dayjs } from "dayjs";
import "./CalendarPage.css";

import { getHolidays, getPanchang } from "../../redux/actions/calendarActions";

/*Types */

export type EventColor = "blue" | "green" | "red" | "violet" | "gold";

export interface CalendarEvent {title: string;description: string;startTime: string;endTime: string;color: EventColor;category?: string;isHoliday: boolean;date?: string;}

export type EventsMap = Record<string, CalendarEvent[]>;

interface TamilMonth {en: string;ta: string;startMonth: number;startDay: number;}

interface TamilMonthInfo {month: TamilMonth;day: number;}

interface PanchangRange {start: string | number | null;end: string | number | null;}

interface PanchangFields {
  day: string | number | null;
  rahukaal: PanchangRange | null;
  murtham: PanchangRange | null;
}

type ViewMode = "day" | "week" | "month";

interface EventModalState {
  open: boolean;
  mode: "create" | "edit";
  index: number | null;
  initialValues: CalendarEvent | null;
}

interface CalendarPageProps {
  onClose?: () => void;
}
type RootState = any;


const STORAGE_KEY = "calendarEvents";

const EVENT_COLORS: { value: EventColor; label: string }[] = [
  { value: "blue", label: "Ocean Blue" },
  { value: "green", label: "Mint Green" },
  { value: "red", label: "Coral Red" },
  { value: "violet", label: "Festival Violet" },
  { value: "gold", label: "National Gold" },
];

const colorVars = (color: EventColor): CSSProperties =>
  ({
    "--evt-bg": `var(--evt-${color}-bg)`,
    "--evt-fg": `var(--evt-${color}-fg)`,
    "--evt-dot": `var(--evt-${color}-dot)`,
  }) as CSSProperties;

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


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
          `${y}-${String(month.startMonth).padStart(2, "0")}-${String(
            month.startDay
          ).padStart(2, "0")}`
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


const readEventsFromStorage = (): EventsMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EventsMap) : {};
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

const getMinutes = (time?: string): number => {
  if (!time) return 9 * 60;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const formatTimeLabel = (time?: string): string => {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
};

const formatEventTime = (event: CalendarEvent): string => {
  if (!event.startTime && !event.endTime) return event.category || "Event";
  if (event.startTime && event.endTime) {
    return `${formatTimeLabel(event.startTime)} – ${formatTimeLabel(event.endTime)}`;
  }
  return formatTimeLabel(event.startTime || event.endTime);
};

const splitEvents = (list: CalendarEvent[]) => ({
  created: list.filter((event) => !event.isHoliday),
  other: list.filter((event) => event.isHoliday),
});

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

  const rawMurtham =
    data.murtham ?? data.muhurtham ?? data.abhijit_muhurat ?? data.abhijit_muhurta ?? null;

  const murtham: PanchangRange | null =
    rawMurtham && typeof rawMurtham === "object"
      ? { start: asPrimitive(rawMurtham.start), end: asPrimitive(rawMurtham.end) }
      : null;

  return {
    day: asPrimitive(data.day),
    rahukaal,
    murtham,
  };
};


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

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ui-modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
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
  );
}

/* Minimal inline icon set (no external icon package needed) */
const IconClose = () => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
    <path d="M15 5 5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconChevronLeft = () => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
    <path d="M12 15 7 10l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronRight = () => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
    <path d="M8 15l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconToday = () => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="10" cy="10" r="1.6" fill="currentColor" />
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
    <path
      d="M13.5 3.5 16.5 6.5 7 16H4v-3l9.5-9.5Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
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
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
    <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconBack = () => (
  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
    <path d="M12 15 7 10l5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* -------------------------------------------------------------------------
   Event chip / row — one generic set of markup for every place an event
   appears, colored purely through CSS custom properties.
   ---------------------------------------------------------------------- */

function EventDot({ color }: { color: EventColor }) {
  return <span className="evt-dot" style={colorVars(color)} aria-hidden="true" />;
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
        <strong>{event.title}</strong>
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
            <IconButton label={`Delete ${event.title}`} variant="danger" onClick={onDelete}>
              <IconTrash />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Create / edit event modal (single component used for both flows so the
   form only exists once, instead of being duplicated inline per card)
   ---------------------------------------------------------------------- */

export interface EventFormValues {
  title: string;
  description: string;
  color: EventColor;
  startTime: string;
  endTime: string;
}

interface EventModalProps {
  open: boolean;
  mode: "create" | "edit";
  date: string;
  initialValues: CalendarEvent | null;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => void;
  onDelete: () => void;
}

function EventModal({ open, mode, date, initialValues, onClose, onSubmit, onDelete }: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<EventColor>("blue");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initialValues?.title || "");
    setDescription(initialValues?.description || "");
    setColor(initialValues?.color || "blue");
    setStartTime(initialValues?.startTime || "09:00");
    setEndTime(initialValues?.endTime || "10:00");
    setError("");
  }, [open, initialValues]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Give the event a title.");
      return;
    }
    if (startTime && endTime && getMinutes(endTime) <= getMinutes(startTime)) {
      setError("End time must be after the start time.");
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      color,
      startTime,
      endTime,
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
            <Button variant="danger" icon={<IconTrash />} onClick={onDelete} style={{ marginRight: "auto" }}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {mode === "edit" ? "Save changes" : "Create event"}
          </Button>
        </>
      }
    >
      <form className="ui-form" onSubmit={handleSubmit}>
        <div className="ui-date-pill">
          <IconAgenda />
          {dayjs(date).format("dddd, MMMM D, YYYY")}
        </div>

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
            <span>Starts</span>
            <input
              className="ui-input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="ui-field">
            <span>Ends</span>
            <input
              className="ui-input"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

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

        {error && (
          <p className="ui-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------
   Tamil panchang popover — now click/tap + keyboard driven instead of
   hover-only, so it works on touch devices and for keyboard users.
   ---------------------------------------------------------------------- */

interface TamilPanchangBadgeProps {
  isOpen: boolean;
  onToggle: () => void;
  tamilInfo: TamilMonthInfo | null;
  panchang: PanchangFields | null | undefined;
  isPending: boolean;
}

function TamilPanchangBadge({ isOpen, onToggle, tamilInfo, panchang, isPending }: TamilPanchangBadgeProps) {
  const hasPanchangInfo = !!panchang?.rahukaal?.start || !!panchang?.murtham?.start;

  return (
    <div className="tamil-wrap">
      <button
        type="button"
        className="tamil-badge"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Show Tamil panchang for this day"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        த
      </button>

      {isOpen && tamilInfo && (
        <div
          className="tamil-popover"
          role="dialog"
          aria-label="Tamil panchang"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tamil-popover__day">{tamilInfo.day}</div>
          <div className="tamil-popover__month">
            {tamilInfo.month.ta}
            <small>
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
            <div className="tamil-popover__facts">
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
            <div className="tamil-popover__empty">பஞ்சாங்க தகவல் இல்லை</div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Day schedule — single component used both as the click-a-cell overlay
   (variant="overlay", fixed full-screen) and as the inline body of the
   "Day" tab (variant="inline", sits inside cal-main). Extracting this
   means the timeline markup only exists once.
   ---------------------------------------------------------------------- */

interface DayScheduleProps {
  selectedDate: string;
  events: CalendarEvent[];
  timelineEvents: CalendarEvent[];
  dayHours: number[];
  formatHour: (hour: number) => string;
  onAddEvent: () => void;
  onEditEvent: (index: number, event: CalendarEvent) => void;
  onClose?: () => void;
  variant?: "overlay" | "inline";
}

function DaySchedule({
  selectedDate,
  events,
  timelineEvents,
  dayHours,
  formatHour,
  onAddEvent,
  onEditEvent,
  onClose,
  variant = "overlay",
}: DayScheduleProps) {
  return (
    <div
      className={`day-view ${variant === "inline" ? "day-view--inline" : ""}`}
      role="region"
      aria-label="Day schedule"
    >
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
          <Button variant="primary" icon={<IconPlus />} onClick={onAddEvent}>
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
          {events.map((event, index) => (
            <EventPill key={index} event={event} dense onClick={() => onEditEvent(index, event)} />
          ))}
        </div>
      )}

      <div className="day-schedule">
        <div className="day-schedule__timeline">
          {timelineEvents.map((event) => {
            const start = getMinutes(event.startTime);
            const end = getMinutes(event.endTime || event.startTime);
            return (
              <div
                key={`${event.title}-${event.startTime}`}
                className="day-schedule__event"
                style={{ top: start, height: Math.max(end - start, 38), ...colorVars(event.color) }}
              >
                <strong>{event.title}</strong>
                <small>{formatEventTime(event)}</small>
              </div>
            );
          })}
        </div>

        {dayHours.map((hour) => (
          <div key={hour} className="day-schedule__row">
            <div className="day-schedule__label">{formatHour(hour)}</div>
            <div className="day-schedule__line" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Main component
   ---------------------------------------------------------------------- */

const CalendarPage = ({ onClose }: CalendarPageProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    if (onClose) onClose();
    else navigate(-1);
  }, [onClose, navigate]);

  const [userEvents, setUserEvents] = useState<EventsMap>(() => readEventsFromStorage());
  const holidayEvents = useSelector((state: RootState) => state.calendar.holidays as EventsMap);
  const holidaysLoading = useSelector((state: RootState) => state.calendar.holidaysLoading as boolean);
  const rawPanchang = useSelector((state: RootState) => state.calendar.panchang);
  const panchangLoading = useSelector((state: RootState) => state.calendar.panchangLoading as boolean);

  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedWeek, setSelectedWeek] = useState(1);

  const [dayViewOpen, setDayViewOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [mobileAgendaOpen, setMobileAgendaOpen] = useState(false);

  const [eventModal, setEventModal] = useState<EventModalState>({
    open: false,
    mode: "create",
    index: null,
    initialValues: null,
  });

  // ---- Tamil / Panchang popover state ----
  const [tamilOpenDate, setTamilOpenDate] = useState<string | null>(null);
  const [panchangCache, setPanchangCache] = useState<Record<string, PanchangFields | null>>({});
  const pendingPanchangDateRef = useRef<string | null>(null);

  // FIX: previously this dispatched getPanchang(...) from *inside* the
  // functional updater passed to setTamilOpenDate. React may invoke a
  // functional updater more than once while resolving a render, and
  // dispatching mid-render caused a "Cannot update a component while
  // rendering a different component" warning plus a burst of duplicate
  // getPanchang dispatches — which is what produced the storm of 429s
  // from json.astrologyapi.com. Now we compute `next` from state we
  // already have, call the plain setter, and dispatch exactly once from
  // the event handler body (not from inside any setState updater).
  const toggleTamilPopover = useCallback(
    (fullDate: string) => {
      const next = tamilOpenDate === fullDate ? null : fullDate;
      setTamilOpenDate(next);

      if (next && !panchangCache[next]) {
        pendingPanchangDateRef.current = next;
        dispatch(getPanchang(next) as any);
      }
    },
    [dispatch, panchangCache, tamilOpenDate]
  );

  // close the popover on outside click / Escape
  useEffect(() => {
    if (!tamilOpenDate) return undefined;
    const onDocClick = () => setTamilOpenDate(null);
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setTamilOpenDate(null);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
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

  const currentYear = currentMonth.format("YYYY");
  const today = dayjs().format("YYYY-MM-DD");
  const monthKey = currentMonth.format("YYYY-MM");
  const dayHours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);

  const refreshEventsFromStorage = useCallback(() => setUserEvents(readEventsFromStorage()), []);

  useEffect(() => {
    window.addEventListener("calendarEventsUpdated", refreshEventsFromStorage);
    window.addEventListener("storage", refreshEventsFromStorage);
    return () => {
      window.removeEventListener("calendarEventsUpdated", refreshEventsFromStorage);
      window.removeEventListener("storage", refreshEventsFromStorage);
    };
  }, [refreshEventsFromStorage]);

  useEffect(() => {
    dispatch(getHolidays(currentYear) as any);
  }, [currentYear, dispatch]);

  const events = useMemo<EventsMap>(() => {
    const merged: EventsMap = { ...userEvents };
    Object.keys(holidayEvents || {}).forEach((date) => {
      merged[date] = [...(holidayEvents[date] || []), ...(userEvents[date] || [])];
    });
    return merged;
  }, [userEvents, holidayEvents]);

  const dates = useMemo<(number | null)[]>(() => {
    const list: (number | null)[] = [];
    const startDay = currentMonth.startOf("month").day();
    const daysInMonth = currentMonth.daysInMonth();
    for (let i = 0; i < startDay; i++) list.push(null);
    for (let i = 1; i <= daysInMonth; i++) list.push(i);
    return list;
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const daysInMonth = currentMonth.daysInMonth();
    const totalWeeks = Math.ceil(daysInMonth / 7);
    return Array.from({ length: totalWeeks }, (_, index) => {
      const start = index * 7 + 1;
      const end = Math.min(start + 6, daysInMonth);
      return { value: index + 1, label: `Week ${index + 1}`, start, end };
    });
  }, [currentMonth]);

  const selectedWeekInfo = weeks.find((week) => week.value === selectedWeek);

  const displayedDates = useMemo<(number | null)[]>(() => {
    if (viewMode !== "week" || !selectedWeekInfo) return dates;
    const weekDates: (number | null)[] = [];
    for (let day = selectedWeekInfo.start; day <= selectedWeekInfo.end; day++) weekDates.push(day);
    return weekDates;
  }, [dates, viewMode, selectedWeekInfo]);

  const getFullDate = (date: number) => `${monthKey}-${String(date).padStart(2, "0")}`;

  const selectedEvents = useMemo(() => events[selectedDate] || [], [events, selectedDate]);
  const selectedEventGroups = useMemo(() => splitEvents(selectedEvents), [selectedEvents]);

  const timelineEvents = useMemo(
    () =>
      selectedEvents
        .filter((event) => !event.isHoliday && event.startTime)
        .sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime)),
    [selectedEvents]
  );

  const selectedWeekEvents = useMemo(() => {
    if (!selectedWeekInfo) return [] as CalendarEvent[];
    const result: CalendarEvent[] = [];
    for (let day = selectedWeekInfo.start; day <= selectedWeekInfo.end; day++) {
      const fullDate = `${monthKey}-${String(day).padStart(2, "0")}`;
      (events[fullDate] || []).forEach((event) => result.push({ ...event, date: fullDate }));
    }
    return result;
  }, [events, monthKey, selectedWeekInfo]);

  const selectedMonthEvents = useMemo(() => {
    const result: CalendarEvent[] = [];
    Object.keys(events)
      .filter((date) => date.startsWith(monthKey))
      .sort()
      .forEach((date) => events[date].forEach((event) => result.push({ ...event, date })));
    return result;
  }, [events, monthKey]);

  const selectedWeekGroups = useMemo(() => splitEvents(selectedWeekEvents), [selectedWeekEvents]);
  const selectedMonthGroups = useMemo(() => splitEvents(selectedMonthEvents), [selectedMonthEvents]);

  /* ---- header navigation: month/week views step by month, Day view steps by day ---- */
  const goToPrevious = () => {
    if (viewMode === "day") {
      const prevDate = dayjs(selectedDate).subtract(1, "day");
      setSelectedDate(prevDate.format("YYYY-MM-DD"));
      if (prevDate.format("YYYY-MM") !== monthKey) setCurrentMonth(prevDate);
    } else {
      setCurrentMonth((prev) => prev.subtract(1, "month"));
    }
  };

  const goToNext = () => {
    if (viewMode === "day") {
      const nextDate = dayjs(selectedDate).add(1, "day");
      setSelectedDate(nextDate.format("YYYY-MM-DD"));
      if (nextDate.format("YYYY-MM") !== monthKey) setCurrentMonth(nextDate);
    } else {
      setCurrentMonth((prev) => prev.add(1, "month"));
    }
  };

  const goToToday = () => {
    const now = dayjs();
    setCurrentMonth(now);
    setSelectedDate(now.format("YYYY-MM-DD"));
  };

  const openAgenda = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 900) setMobileAgendaOpen(true);
    else setAgendaOpen(true);
  };

  /* ---- CRUD ---- */

  const openCreateModal = (fullDate: string) => {
    setSelectedDate(fullDate);
    setEventModal({ open: true, mode: "create", index: null, initialValues: null });
  };

  const openEditModal = (index: number, event: CalendarEvent) => {
    if (event.isHoliday) return;
    setEventModal({ open: true, mode: "edit", index, initialValues: event });
  };

  const closeEventModal = () => setEventModal((prev) => ({ ...prev, open: false }));

  const getUserEventIndex = (date: string, mergedIndex: number) => {
    const holidayCount = holidayEvents?.[date]?.length || 0;
    return mergedIndex - holidayCount;
  };

  const handleEventSubmit = (values: EventFormValues) => {
    const current = readEventsFromStorage();

    if (eventModal.mode === "create") {
      const next: EventsMap = {
        ...current,
        [selectedDate]: [
          ...(current[selectedDate] || []),
          { ...values, category: "Personal Event", isHoliday: false },
        ],
      };
      writeEventsToStorage(next);
      setUserEvents(next);
    } else {
      const userIndex = getUserEventIndex(selectedDate, eventModal.index as number);
      if (userIndex < 0) return;
      const dayEvents = current[selectedDate] || [];
      const nextDayEvents = dayEvents.map((event, i) => (i === userIndex ? { ...event, ...values } : event));
      const next: EventsMap = { ...current, [selectedDate]: nextDayEvents };
      writeEventsToStorage(next);
      setUserEvents(next);
    }

    closeEventModal();
  };

  const deleteEventAt = (mergedIndex: number) => {
    const userIndex = getUserEventIndex(selectedDate, mergedIndex);
    if (userIndex < 0) return;

    const current = readEventsFromStorage();
    const dayEvents = current[selectedDate] || [];
    const nextDayEvents = dayEvents.filter((_, i) => i !== userIndex);

    const next: EventsMap = { ...current };
    if (nextDayEvents.length > 0) next[selectedDate] = nextDayEvents;
    else delete next[selectedDate];

    writeEventsToStorage(next);
    setUserEvents(next);
  };

  const handleModalDelete = () => {
    if (eventModal.index !== null) deleteEventAt(eventModal.index);
    closeEventModal();
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  /* ---- keyboard-navigable month/week grid (roving tabindex) ---- */
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedCellIndex, setFocusedCellIndex] = useState(0);

  const focusableIndexes = useMemo(
    () => displayedDates.map((d, i) => (d ? i : null)).filter((i): i is number => i !== null),
    [displayedDates]
  );

  const moveFocus = (fromIndex: number, delta: number) => {
    let target = fromIndex + delta;
    while (target >= 0 && target < displayedDates.length && displayedDates[target] === null) {
      target += delta;
    }
    if (target < 0 || target >= displayedDates.length) return;
    setFocusedCellIndex(target);
    cellRefs.current[target]?.focus();
  };

  const onCellKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, index: number, date: number | null) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveFocus(index, 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(index, -1);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveFocus(index, 7);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(index, -7);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (date) {
          setSelectedDate(getFullDate(date));
          setDayViewOpen(true);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="cal">
      {/* ---------------- Header ---------------- */}
      <header className="cal-topbar">
        <button type="button" className="cal-topbar__back" onClick={handleBack} aria-label="Go back">
          <IconBack />
        </button>

        <div className="cal-topbar__title">
          <span className="cal-eyebrow">Indian Calendar</span>
          <h1>{viewMode === "day" ? dayjs(selectedDate).format("MMMM D, YYYY") : currentMonth.format("MMMM YYYY")}</h1>
        </div>

        <div className="cal-topbar__nav">
          <IconButton label="Previous" onClick={goToPrevious}>
            <IconChevronLeft />
          </IconButton>
          <Button variant="secondary" icon={<IconToday />} onClick={goToToday}>
            Today
          </Button>
          <IconButton label="Next" onClick={goToNext}>
            <IconChevronRight />
          </IconButton>
        </div>

        <div className="cal-topbar__controls">
          <Segmented<ViewMode> ariaLabel="Calendar view" options={VIEW_MODES} value={viewMode} onChange={setViewMode} />

          {viewMode === "week" && (
            <select
              className="ui-select"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              aria-label="Select week"
            >
              {weeks.map((week) => (
                <option key={week.value} value={week.value}>
                  {week.label}
                </option>
              ))}
            </select>
          )}

          <Button variant="secondary" icon={<IconAgenda />} onClick={openAgenda}>
            Agenda
          </Button>
          <Button variant="primary" icon={<IconPlus />} onClick={() => openCreateModal(selectedDate || today)}>
            New event
          </Button>
        </div>
      </header>

      <div className="cal-body">
        {/* ---------------- Sidebar (desktop) / drawer (mobile) ---------------- */}
        <aside className={`cal-sidebar ${mobileAgendaOpen ? "is-open" : ""}`}>
          <div className="cal-sidebar__header">
            <h2>This month</h2>
            <IconButton
              label="Close agenda"
              className="cal-sidebar__close"
              onClick={() => setMobileAgendaOpen(false)}
            >
              <IconClose />
            </IconButton>
          </div>

          {holidaysLoading ? (
            <div className="ui-loading">
              <span className="ui-spinner" />
            </div>
          ) : selectedMonthEvents.length === 0 ? (
            <p className="cal-sidebar__empty">No events this month yet.</p>
          ) : (
            <div className="cal-sidebar__list">
              {Object.keys(events)
                .filter((date) => date.startsWith(monthKey) && events[date].length > 0)
                .sort()
                .map((date) => (
                  <div key={date} className="cal-sidebar__group">
                    <strong>{dayjs(date).format("MMM D, ddd")}</strong>
                    {events[date].map((event, index) => (
                      <div key={index} className="cal-sidebar__item" style={colorVars(event.color)}>
                        <EventDot color={event.color} />
                        <span>{event.title}</span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </aside>
        {mobileAgendaOpen && (
          <div className="cal-scrim" onClick={() => setMobileAgendaOpen(false)} aria-hidden="true" />
        )}

        {/* ---------------- Main area ---------------- */}
        <main className="cal-main">
          {viewMode === "day" ? (
            <DaySchedule
              selectedDate={selectedDate}
              events={selectedEvents}
              timelineEvents={timelineEvents}
              dayHours={dayHours}
              formatHour={formatHour}
              onAddEvent={() => openCreateModal(selectedDate)}
              onEditEvent={openEditModal}
              variant="inline"
            />
          ) : (
            <div className={`cal-grid ${viewMode === "week" ? "cal-grid--week" : ""}`} role="grid" aria-label="Calendar">
              {WEEKDAYS.map((day) => (
                <div key={day} className="cal-grid__weekday" role="columnheader">
                  {day}
                </div>
              ))}

              {displayedDates.map((date, index) => {
                const fullDate = date ? getFullDate(date) : null;
                const dayEvents = fullDate ? events[fullDate] || [] : [];
                const visibleEvents = dayEvents.slice(0, 3);
                const hiddenCount = dayEvents.length - visibleEvents.length;
                const isTamilOpen = !!fullDate && tamilOpenDate === fullDate;
                const isFocusable = focusableIndexes[0] === index || index === focusedCellIndex;

                return (
                  <div
                    key={index}
                    role="gridcell"
                    ref={(el) => {
                      cellRefs.current[index] = el;
                    }}
                    tabIndex={date ? (isFocusable ? 0 : -1) : -1}
                    className={`cal-cell ${!date ? "is-empty" : ""} ${fullDate === today ? "is-today" : ""} ${
                      fullDate === selectedDate ? "is-selected" : ""
                    } ${isTamilOpen ? "cal-cell--tamil-open" : ""}`}
                    onClick={() => {
                      if (!date || !fullDate) return;
                      setSelectedDate(fullDate);
                      setDayViewOpen(true);
                    }}
                    onKeyDown={(event) => onCellKeyDown(event, index, date)}
                    onFocus={() => setFocusedCellIndex(index)}
                    aria-label={
                      date && fullDate
                        ? `${dayjs(fullDate).format("dddd, MMMM D")}, ${dayEvents.length} event${
                            dayEvents.length === 1 ? "" : "s"
                          }`
                        : undefined
                    }
                  >
                    {date && fullDate && (
                      <>
                        <div className="cal-cell__top">
                          <button
                            type="button"
                            className="cal-cell__date"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCreateModal(fullDate);
                            }}
                            aria-label={`Add event on ${dayjs(fullDate).format("MMMM D")}`}
                          >
                            {date}
                          </button>

                          <TamilPanchangBadge
                            isOpen={isTamilOpen}
                            onToggle={() => toggleTamilPopover(fullDate)}
                            tamilInfo={isTamilOpen ? tamilInfoForOpenDate : null}
                            panchang={isTamilOpen ? panchangForOpenDate : null}
                            isPending={isTamilOpen && isPanchangPending}
                          />
                        </div>

                        {dayEvents.length > 0 && (
                          <div className="cal-cell__events">
                            {visibleEvents.map((event, i) => (
                              <div key={i} className="cal-cell__event" style={colorVars(event.color)}>
                                <EventDot color={event.color} />
                                <span>{event.title}</span>
                              </div>
                            ))}
                            {hiddenCount > 0 && <div className="cal-cell__more">+{hiddenCount} more</div>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ---------------- Day view overlay (opened by clicking a cell in month/week view) ---------------- */}
      {dayViewOpen && (
        <DaySchedule
          selectedDate={selectedDate}
          events={selectedEvents}
          timelineEvents={timelineEvents}
          dayHours={dayHours}
          formatHour={formatHour}
          onAddEvent={() => openCreateModal(selectedDate)}
          onEditEvent={openEditModal}
          onClose={() => setDayViewOpen(false)}
          variant="overlay"
        />
      )}

      {/* ---------------- Agenda modal (week / month summary) ---------------- */}
      <Modal
        open={agendaOpen}
        onClose={() => setAgendaOpen(false)}
        title={viewMode === "week" ? "Week agenda" : viewMode === "day" ? "Day agenda" : "Month agenda"}
        icon={<IconAgenda />}
      >
        {viewMode === "day" && (
          <>
            <p className="ui-modal__subtitle">{dayjs(selectedDate).format("dddd, MMMM D, YYYY")}</p>
            {selectedEvents.length === 0 ? (
              <p className="cal-sidebar__empty">No events for this day.</p>
            ) : (
              <div className="ui-scroll-list">
                <h4 className="ui-section-title">Created events</h4>
                {selectedEventGroups.created.length === 0 && <p className="ui-empty-note">No events</p>}
                {selectedEventGroups.created.map((event, i) => (
                  <EventRow
                    key={i}
                    event={event}
                    onEdit={() => openEditModal(i, event)}
                    onDelete={() => deleteEventAt(i)}
                  />
                ))}
                <h4 className="ui-section-title">Holidays &amp; other</h4>
                {selectedEventGroups.other.length === 0 && <p className="ui-empty-note">No events</p>}
                {selectedEventGroups.other.map((event, i) => (
                  <EventRow key={i} event={event} />
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === "week" && selectedWeekInfo && (
          <>
            <p className="ui-modal__subtitle">
              {currentMonth.format("MMMM")} {selectedWeekInfo.start}–{selectedWeekInfo.end}, {currentMonth.format("YYYY")}
            </p>
            {selectedWeekEvents.length === 0 ? (
              <p className="cal-sidebar__empty">No events this week.</p>
            ) : (
              <div className="ui-scroll-list">
                <h4 className="ui-section-title">Created events</h4>
                {selectedWeekGroups.created.map((event, i) => (
                  <EventRow key={i} event={event} />
                ))}
                <h4 className="ui-section-title">Holidays &amp; other</h4>
                {selectedWeekGroups.other.map((event, i) => (
                  <EventRow key={i} event={event} />
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === "month" && (
          <>
            <p className="ui-modal__subtitle">{currentMonth.format("MMMM YYYY")}</p>
            {selectedMonthEvents.length === 0 ? (
              <p className="cal-sidebar__empty">No events this month.</p>
            ) : (
              <div className="ui-scroll-list">
                <h4 className="ui-section-title">Created events</h4>
                {selectedMonthGroups.created.map((event, i) => (
                  <EventRow key={i} event={event} />
                ))}
                <h4 className="ui-section-title">Holidays &amp; other</h4>
                {selectedMonthGroups.other.map((event, i) => (
                  <EventRow key={i} event={event} />
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ---------------- Create / edit modal ---------------- */}
      <EventModal
        open={eventModal.open}
        mode={eventModal.mode}
        date={selectedDate}
        initialValues={eventModal.initialValues}
        onClose={closeEventModal}
        onSubmit={handleEventSubmit}
        onDelete={handleModalDelete}
      />
    </div>
  );
};

export default CalendarPage;