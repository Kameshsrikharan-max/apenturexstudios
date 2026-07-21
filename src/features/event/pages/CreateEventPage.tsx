import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  CalendarOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  MailOutlined,
  PhoneOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "./CreateEventPage.css";

interface StepDef {
  label: string;
  icon: React.ReactNode;
}

const steps: StepDef[] = [
  { label: "Event Details", icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment", icon: <DollarOutlined /> },
  { label: "Attendance", icon: <ClockCircleOutlined /> },
  { label: "Media", icon: <CameraOutlined /> },
  { label: "Album", icon: <PictureOutlined /> },
  { label: "Closure", icon: <CheckCircleOutlined /> },
];

const SERVICES = [
  "Traditional Photography",
  "Candid Photography",
  "Candid Videography",
  "Drone",
];

interface AlbumTemplate {
  name: string;
  sheets: number;
  photos: number;
  size: string;
}

const ALBUM_TEMPLATES: AlbumTemplate[] = [
  { name: "Premium Wedding", sheets: 60, photos: 180, size: "12x36" },
  { name: "Classic Traditional", sheets: 48, photos: 135, size: "12x36" },
  { name: "Cinematic Story", sheets: 40, photos: 120, size: "10x30" },
  { name: "New template - 1", sheets: 20, photos: 40, size: "custom" },
  { name: "New template - 2", sheets: 10, photos: 40, size: "12x10" },
  { name: "New template - 3", sheets: 5, photos: 20, size: "A4" },
  { name: "Candid photography template", sheets: 20, photos: 40, size: "16x12" },
  { name: "Testing", sheets: 20, photos: 40, size: "10x8" },
  { name: "Album Template", sheets: 5, photos: 40, size: "16x12" },
  { name: "Meetup Album", sheets: 10, photos: 20, size: "A3" },
  { name: "Sprint Review", sheets: 10, photos: 20, size: "10x8" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

interface TimeParts {
  h: string;
  m: string;
  ap: string;
}

function formatAmount(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return "Rs. " + parseInt(digits, 10).toLocaleString("en-IN");
}

function stripAmount(display: string): string {
  return display.replace(/[^\d]/g, "");
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function dateToTimeParts(date: Date): TimeParts {
  let hours = date.getHours();
  const ap = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return {
    h: String(hours).padStart(2, "0"),
    m: String(date.getMinutes()).padStart(2, "0"),
    ap,
  };
}

function to24Minutes(hStr: string, mStr: string, apVal: string): number {
  let hour = parseInt(hStr, 10) % 12;
  if (apVal === "PM") hour += 12;
  return hour * 60 + parseInt(mStr, 10);
}

function clearAllEventPayments(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("eventPayments__")) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    sessionStorage.removeItem("eventPayments");
  } catch (error) {
    console.error(error);
  }
}

function dateToISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function timeObjTo24(time: TimeParts | null): string {
  if (!time) return "";
  let hour = parseInt(time.h, 10);
  if (time.ap === "PM" && hour !== 12) hour += 12;
  if (time.ap === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${time.m}`;
}

function addOneHour(time24: string): string {
  if (!time24) return "";
  const [hour, minute] = time24.split(":").map(Number);
  const total = (hour * 60 + minute + 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface EventFormState {
  eventName: string;
  eventDate: Date | null;
  startTime: TimeParts | null;
  customerName: string;
  phone: string;
  email: string;
  eventAmount: string;
  address: string;
  city: string;
  state: string;
  selectedServices: string[];
  albumData: Record<string, any>;
}

function syncEventToCalendar(form: EventFormState, createdAt: string): void {
  if (!form.eventDate) return;

  try {
    const dateKey = dateToISODate(form.eventDate);
    const startTime24 = timeObjTo24(form.startTime);
    const endTime24 = startTime24 ? addOneHour(startTime24) : "";

    const calendarEvent = {
      title: form.eventName.trim(),
      description: [form.customerName.trim(), form.selectedServices.join(", ")]
        .filter(Boolean)
        .join(" • "),
      startTime: startTime24,
      endTime: endTime24,
      color: "blue",
      category: "Booked Event",
      isHoliday: false,
      eventId: createdAt,
    };

    const existingRaw = localStorage.getItem("calendarEvents");
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    existing[dateKey] = [...(existing[dateKey] || []), calendarEvent];
    localStorage.setItem("calendarEvents", JSON.stringify(existing));

    window.dispatchEvent(new Event("calendarEventsUpdated"));
  } catch (error) {
    console.error(error);
  }
}

interface PopupPos {
  top: number;
  left: number;
  width: number;
}

function usePopupPos(
  anchorRef: React.RefObject<HTMLDivElement>,
  popupHeight: number
): PopupPos | null {
  const [pos, setPos] = useState<PopupPos | null>(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const update = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= popupHeight
        ? rect.bottom + window.scrollY + 8
        : Math.max(12, rect.top + window.scrollY - popupHeight - 8);
      setPos({ top, left: rect.left + window.scrollX, width: rect.width });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, popupHeight]);

  return pos;
}

interface CalendarPickerProps {
  anchorRef: React.RefObject<HTMLDivElement>;
  value: Date | null;
  onChange: (date: Date) => void;
  onClose: () => void;
}

function CalendarPicker({ anchorRef, value, onChange, onClose }: CalendarPickerProps) {
  const today = startOfDay(new Date());
  const [viewYear, setViewYear] = useState(value ? value.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? value.getMonth() : today.getMonth());
  const pos = usePopupPos(anchorRef, 370);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(year => year - 1);
    } else {
      setViewMonth(month => month - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(year => year + 1);
    } else {
      setViewMonth(month => month + 1);
    }
  };

  const chooseToday = () => {
    onChange(new Date(today));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onClose();
  };

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = Array(firstDay).fill(null).concat(
    Array.from({ length: days }, (_, i) => i + 1)
  );

  const isSelected = (day: number) =>
    !!value &&
    value.getDate() === day &&
    value.getMonth() === viewMonth &&
    value.getFullYear() === viewYear;

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isPast = (day: number) => startOfDay(new Date(viewYear, viewMonth, day)) < today;

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      className="cal-popup"
      style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
      onMouseDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
    >
      <div className="cal-nav">
        <button type="button" onClick={prevMonth} aria-label="Previous month">
          <LeftOutlined />
        </button>
        <span>{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} aria-label="Next month">
          <RightOutlined />
        </button>
      </div>

      <div className="cal-grid-head">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((day, index) =>
          day === null ? (
            <span key={`empty-${index}`} />
          ) : (
            <button
              key={day}
              type="button"
              disabled={isPast(day)}
              className={[
                "cal-day",
                isSelected(day) ? "selected" : "",
                isToday(day) ? "today" : "",
                isPast(day) ? "disabled" : "",
              ].join(" ").trim()}
              onClick={() => {
                onChange(new Date(viewYear, viewMonth, day));
                onClose();
              }}
            >
              {day}
            </button>
          )
        )}
      </div>

      <div className="cal-actions">
        <button type="button" className="cal-today" onClick={chooseToday}>
          Today
        </button>
      </div>
    </div>,
    document.body
  );
}

interface TimePickerProps {
  anchorRef: React.RefObject<HTMLDivElement>;
  value: TimeParts | null;
  onChange: (time: TimeParts | null) => void;
  onClose: () => void;
  minMinutes: number | null;
}

function TimePicker({ anchorRef, value, onChange, onClose, minMinutes }: TimePickerProps) {
  const now = dateToTimeParts(new Date());
  const [h, setH] = useState(value?.h || now.h);
  const [m, setM] = useState(value?.m || now.m);
  const [ap, setAp] = useState(value?.ap || now.ap);
  const pos = usePopupPos(anchorRef, 360);

  const isCombinationPast = (hh: string, mm: string, apVal: string) =>
    minMinutes != null && to24Minutes(hh, mm, apVal) < minMinutes;

  const currentInvalid = isCombinationPast(h, m, ap);

  const apply = () => {
    if (currentInvalid) return;
    onChange({ h, m, ap });
    onClose();
  };

  const applyNow = () => {
    const current = dateToTimeParts(new Date());
    onChange(current);
    setH(current.h);
    setM(current.m);
    setAp(current.ap);
    onClose();
  };

  const turnOff = () => {
    onChange(null);
    onClose();
  };

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      className="time-popup"
      style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
      onMouseDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
    >
      <div className="time-readout">
        <ClockCircleOutlined />
        <strong>{h}:{m} {ap}</strong>
      </div>

      {minMinutes != null && (
        <div className="time-restriction-note">Past times disabled</div>
      )}

      <div className="time-cols">
        <div className="time-col">
          <span className="time-col-label">Hour</span>
          {HOURS.map(hour => {
            const disabled = isCombinationPast(hour, m, ap);
            return (
              <button
                key={hour}
                type="button"
                disabled={disabled}
                className={`time-opt${h === hour ? " sel" : ""}`}
                onClick={() => setH(hour)}
              >
                {hour}
              </button>
            );
          })}
        </div>

        <div className="time-col">
          <span className="time-col-label">Min</span>
          {MINUTES.map(minute => {
            const disabled = isCombinationPast(h, minute, ap);
            return (
              <button
                key={minute}
                type="button"
                disabled={disabled}
                className={`time-opt${m === minute ? " sel" : ""}`}
                onClick={() => setM(minute)}
              >
                {minute}
              </button>
            );
          })}
        </div>

        <div className="time-col ampm">
          <span className="time-col-label">AM/PM</span>
          {["AM", "PM"].map(period => {
            const disabled = isCombinationPast(h, m, period);
            return (
              <button
                key={period}
                type="button"
                disabled={disabled}
                className={`time-opt${ap === period ? " sel" : ""}`}
                onClick={() => setAp(period)}
              >
                {period}
              </button>
            );
          })}
        </div>
      </div>

      <div className="time-actions">
        <button type="button" className="time-soft" onClick={turnOff}>Off</button>
        <button type="button" className="time-soft" onClick={applyNow}>Now</button>
        <button type="button" className="time-apply" disabled={currentInvalid} onClick={apply}>Set Time</button>
      </div>
    </div>,
    document.body
  );
}

interface AlbumEntry {
  template?: AlbumTemplate;
}

interface AlbumServiceData {
  numAlbums?: number;
  albums?: AlbumEntry[];
  droneCount?: number;
}

interface AlbumServiceCardProps {
  service: string;
  albumData: AlbumServiceData;
  onUpdate: (data: AlbumServiceData) => void;
  attemptedSubmit: boolean;
}

function AlbumServiceCard({ service, albumData, onUpdate, attemptedSubmit }: AlbumServiceCardProps) {
  const isPhotography = service === "Traditional Photography" || service === "Candid Photography";
  const isDrone = service === "Drone";
  const isVideo = service === "Candid Videography";

  const serviceLabel =
    service === "Traditional Photography" ? "Traditional Album" :
    service === "Candid Photography" ? "Candid Album" :
    service === "Candid Videography" ? "Candid Video" : "Drone";

  const icon = isDrone ? <ThunderboltOutlined /> : isVideo ? <CameraOutlined /> : <PictureOutlined />;
  const numAlbums = albumData.numAlbums || 1;
  const albums = albumData.albums || [{}];
  const droneCnt = albumData.droneCount || 1;

  const readyCount = isPhotography ? albums.filter(album => album.template).length : null;
  const totalCount = isPhotography ? numAlbums : null;
  const allReady = isPhotography && readyCount === totalCount && (totalCount ?? 0) > 0;
  const hasMissingTemplate = isPhotography && albums.some(album => !album.template);

  const statusLabel = isPhotography
    ? allReady ? `${readyCount} ready` : `${readyCount}/${totalCount}`
    : isVideo ? "Ready"
    : "Config";

  const [open, setOpen] = useState(true);
  const [tplOpen, setTplOpen] = useState<Record<number, boolean>>({});
  const [tplPos, setTplPos] = useState<Record<number, PopupPos>>({});
  const tplRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const clickedInsideTpl = Object.values(tplRefs.current).some(
        element => element && element.contains(event.target as Node)
      );
      if (!clickedInsideTpl) setTplOpen({});
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openTpl = (index: number) => {
    const element = tplRefs.current[index];
    if (element) {
      const rect = element.getBoundingClientRect();
      const dropdownHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= dropdownHeight
        ? rect.bottom + window.scrollY + 4
        : rect.top + window.scrollY - dropdownHeight - 4;
      setTplPos(previous => ({
        ...previous,
        [index]: { top, left: rect.left + window.scrollX, width: rect.width },
      }));
    }
    setTplOpen(previous => ({ ...previous, [index]: !previous[index] }));
  };

  const setNumAlbums = (value: string) => {
    const num = Math.max(1, parseInt(value, 10) || 1);
    const nextAlbums = Array.from({ length: num }, (_, index) => albums[index] || {});
    onUpdate({ ...albumData, numAlbums: num, albums: nextAlbums });
  };

  const setTemplate = (index: number, template: AlbumTemplate) => {
    const nextAlbums = albums.map((album, albumIndex) =>
      albumIndex === index ? { ...album, template } : album
    );
    onUpdate({ ...albumData, albums: nextAlbums });
    setTplOpen(previous => ({ ...previous, [index]: false }));
  };

  return (
    <div className={`alb-card${attemptedSubmit && hasMissingTemplate ? " alb-card-error" : ""}`}>
      <button className="alb-card-head" type="button" onClick={() => setOpen(value => !value)}>
        <span className="alb-card-left">
          <span className="alb-icon">{icon}</span>
          <span>
            <span className="alb-title">{serviceLabel}</span>
            <span className="alb-sub">
              {service}{isPhotography ? ` / ${numAlbums} album${numAlbums > 1 ? "s" : ""}` : ""}
            </span>
          </span>
        </span>
        <span className="alb-card-right">
          <span className={`alb-badge${allReady ? " ready" : ""}`}>{statusLabel}</span>
          <span className={`alb-chevron${open ? " up" : ""}`}>›</span>
        </span>
      </button>

      {open && (
        <div className="alb-body">
          {isPhotography && (
            <>
              <div className="alb-inline-row">
                <span className="alb-row-label">Number of Albums <span className="req">*</span></span>
                <div className="alb-inline-row-right">
                  <input
                    className="alb-num-input"
                    type="number"
                    min="1"
                    max="10"
                    value={numAlbums}
                    onChange={event => setNumAlbums(event.target.value)}
                  />
                  <span className={`alb-badge${allReady ? " ready" : ""}`}>
                    {readyCount}/{totalCount}
                  </span>
                </div>
              </div>

              <div className="alb-album-list">
                {albums.map((album, index) => {
                  const showAlbumError = attemptedSubmit && !album.template;
                  return (
                    <div
                      key={index}
                      className={`alb-album-item${showAlbumError ? " alb-album-item-error" : ""}`}
                    >
                      <div className="alb-album-item-head">
                        <span className="alb-album-num">{index + 1}</span>
                        <span className="alb-album-label">Album {index + 1} <span className="req">*</span></span>
                        {album.template && <span className="alb-badge ready">Ready</span>}
                        {showAlbumError && <span className="alb-inline-error">Template required</span>}
                      </div>
                      <div className="alb-tpl-wrap" ref={element => { tplRefs.current[index] = element; }}>
                        <button
                          className={`alb-tpl-trigger${showAlbumError ? " alb-tpl-trigger-error" : ""}`}
                          type="button"
                          onClick={() => openTpl(index)}
                        >
                          {album.template ? (
                            <span>
                              {album.template.name}{" "}
                              <em>- {album.template.sheets}sh / {album.template.photos}ph / {album.template.size}</em>
                            </span>
                          ) : (
                            <span className="alb-tpl-ph">Select Album Template</span>
                          )}
                          <span>▾</span>
                        </button>
                        {tplOpen[index] && tplPos[index] && ReactDOM.createPortal(
                          <div
                            className="alb-tpl-dropdown"
                            style={{
                              position: "absolute",
                              top: tplPos[index].top,
                              left: tplPos[index].left,
                              width: tplPos[index].width,
                              zIndex: 9999,
                            }}
                            onMouseDown={event => event.stopPropagation()}
                          >
                            {ALBUM_TEMPLATES.map(template => (
                              <button
                                key={template.name}
                                type="button"
                                className="alb-tpl-option"
                                onMouseDown={() => setTemplate(index, template)}
                              >
                                <span className="alb-tpl-name">{template.name}</span>
                                <span className="alb-tpl-meta">
                                  {template.sheets}sh / {template.photos}ph / {template.size}
                                </span>
                              </button>
                            ))}
                          </div>,
                          document.body
                        )}
                      </div>
                      {album.template && (
                        <div className="alb-chips">
                          <span className="alb-chip">{album.template.sheets} Sheets</span>
                          <span className="alb-chip">{album.template.photos} Photos</span>
                          <span className="alb-chip">{album.template.size}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {isDrone && (
            <div className="alb-inline-row">
              <span className="alb-row-label">Number of Drone Deliverables</span>
              <div className="alb-inline-row-right">
                <input
                  className="alb-num-input"
                  type="number"
                  min="1"
                  value={droneCnt}
                  onChange={event => onUpdate({
                    ...albumData,
                    droneCount: Math.max(1, parseInt(event.target.value, 10) || 1),
                  })}
                />
              </div>
            </div>
          )}

          {isVideo && (
            <div className="alb-info-box">
              <InfoCircleOutlined />
              No additional configuration required for video deliverables.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FormErrors {
  eventName?: string;
  eventDate?: string;
  startTime?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  eventAmount?: string;
  address?: string;
  city?: string;
  state?: string;
  services?: string;
  albums?: string;
}

export default function CreateEventPage() {
  const navigate = useNavigate();

  const defaultForm: EventFormState = {
    eventName: "",
    eventDate: null,
    startTime: null,
    customerName: "",
    phone: "",
    email: "",
    eventAmount: "",
    address: "",
    city: "",
    state: "",
    selectedServices: [],
    albumData: {},
  };

  const [form, setForm] = useState<EventFormState>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showCal, setShowCal] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  const commandWrapRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const stuckRef = useRef(false);
  const naturalHeightRef = useRef(0);
  const [dock, setDock] = useState({ left: 0, width: 0, top: 12 });

  useEffect(() => {
    stuckRef.current = stuck;
  }, [stuck]);

  useEffect(() => {
    const STICK_TOP = 12;

    const update = () => {
      const el = commandWrapRef.current;
      if (!el) return;

      if (!stuckRef.current) {
        naturalHeightRef.current = el.offsetHeight;
      }

      const rect = el.getBoundingClientRect();
      const shouldStick = rect.top <= STICK_TOP;

      if (shouldStick) {
        setDock({ left: rect.left, width: rect.width, top: STICK_TOP });
      }
      setStuck(shouldStick);
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  const railWrapRef = useRef<HTMLDivElement>(null);
  const [railStuck, setRailStuck] = useState(false);
  const railStuckRef = useRef(false);
  const [railDock, setRailDock] = useState({ left: 0, top: 22 });

  useEffect(() => {
    railStuckRef.current = railStuck;
  }, [railStuck]);

  useEffect(() => {
    const STICK_TOP = 22;

    const update = () => {
      const el = railWrapRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const shouldStick = rect.top <= STICK_TOP;

      if (shouldStick) {
        setRailDock({ left: rect.left, top: STICK_TOP });
      }
      setRailStuck(shouldStick);
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.removeItem("eventDraft");
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(event.target as Node)) setShowCal(false);
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) setShowTime(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const set = <K extends keyof EventFormState>(key: K, val: EventFormState[K]) =>
    setForm(current => ({ ...current, [key]: val }));

  const toggleService = (service: string) => {
    setForm(current => ({
      ...current,
      selectedServices: current.selectedServices.includes(service)
        ? current.selectedServices.filter(item => item !== service)
        : [...current.selectedServices, service],
    }));
  };

  const handleAmountChange = (raw: string) => {
    set("eventAmount", formatAmount(raw));
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    set("phone", digits);
  };

  const formatDateDisplay = (date: Date | null) =>
    date
      ? `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
      : "";

  const formatTimeDisplay = (time: TimeParts | null) => time ? `${time.h}:${time.m} ${time.ap}` : "";

  const timeMinMinutes = (() => {
    if (!form.eventDate) return null;
    const today = startOfDay(new Date());
    if (startOfDay(form.eventDate).getTime() !== today.getTime()) return null;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    const today = startOfDay(new Date());

    if (!form.eventName.trim()) nextErrors.eventName = "Event name is required";
    if (!form.eventDate) nextErrors.eventDate = "Event date is required";
    if (form.eventDate && startOfDay(form.eventDate) < today) {
      nextErrors.eventDate = "Past dates are not allowed";
    }

    if (!form.startTime) {
      nextErrors.startTime = "Start time is required";
    } else if (
      form.eventDate &&
      startOfDay(form.eventDate).getTime() === today.getTime() &&
      to24Minutes(form.startTime.h, form.startTime.m, form.startTime.ap) < today.getHours() * 60 + today.getMinutes()
    ) {
      nextErrors.startTime = "Past times are not allowed for today's date";
    }

    if (!form.customerName.trim()) nextErrors.customerName = "Customer name is required";
    if (!form.phone || form.phone.length < 10) nextErrors.phone = "Enter a valid 10-digit phone number";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email address";
    }
    if (!form.eventAmount || !stripAmount(form.eventAmount)) {
      nextErrors.eventAmount = "Event amount is required";
    }
    if (!form.address.trim()) nextErrors.address = "Address is required";
    if (!form.city.trim()) nextErrors.city = "City is required";
    if (!form.state.trim()) nextErrors.state = "State is required";
    if (form.selectedServices.length === 0) nextErrors.services = "Select at least one service";

    const albumIncomplete = form.selectedServices.some(service => {
      const isPhotography = service === "Traditional Photography" || service === "Candid Photography";
      if (!isPhotography) return false;
      const data: AlbumServiceData = form.albumData[service] || {};
      const albums = data.albums || [{}];
      return albums.some(album => !album.template);
    });
    if (albumIncomplete) {
      nextErrors.albums = "Select an album template for every album before continuing";
    }

    return nextErrors;
  };

  const handleSubmit = () => {
    setAttemptedSubmit(true);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const numericAmount = parseInt(stripAmount(form.eventAmount), 10) || 0;
    const createdAt = new Date().toISOString();

    const eventPayload = {
      ...form,
      eventDate: form.eventDate ? form.eventDate.toISOString() : null,
      eventAmountDisplay: form.eventAmount,
      eventAmountNumeric: numericAmount,
      _createdAt: createdAt,
      _step: "event-details",
    };

    sessionStorage.setItem("currentEvent", JSON.stringify(eventPayload));
    clearAllEventPayments();
    sessionStorage.removeItem("eventDraft");

    syncEventToCalendar(form, createdAt);

    navigate("/events/create/team-assignment");
  };

  const goBack = () => navigate("/events");

  const updateAlbumData = (service: string, data: AlbumServiceData) => {
    setForm(current => ({
      ...current,
      albumData: { ...current.albumData, [service]: data },
    }));
  };

  const renderError = (key: keyof FormErrors) =>
    errors[key] ? <span className="cep-error">{errors[key]}</span> : null;

  const renderStepButtons = () => (
    <>
      {steps.map((step, index) => (
        <div className="cep-step-wrap" key={step.label}>
          <button
            className={`cep-step ${index === activeStep ? "active" : ""}`}
            type="button"
            disabled={index !== activeStep}
            aria-label={step.label}
            aria-current={index === activeStep ? "step" : undefined}
          >
            {step.icon}
            {index === activeStep && <span className="cep-step-indicator" />}
          </button>
          <span className="cep-tooltip">{step.label}</span>
        </div>
      ))}
    </>
  );

  return (
    <main className="cep-page" onClick={() => { setShowCal(false); setShowTime(false); }}>
      <section className="cep-stage">
        <header className="cep-topbar">
          <button className="cep-back" type="button" onClick={goBack}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="cep-title-wrap">
            <span className="cep-title-icon"><CalendarOutlined /></span>
            <div>
              <p className="cep-subtitle">Step 1 of 7 / Event Details</p>
              <h1 className="cep-heading">Create New Event</h1>
            </div>
          </div>

          <div className="cep-progress" aria-label="Event progress">
            <button type="button" aria-label="Refresh page" onClick={() => window.location.reload()}>
              <ReloadOutlined />
            </button>
          </div>
        </header>

        <div className="cep-body">
          <div className="cep-rail-slot" ref={railWrapRef}>
            {!railStuck && (
              <aside className="cep-rail" aria-label="Create event steps">
                {renderStepButtons()}
              </aside>
            )}
          </div>

          {railStuck && ReactDOM.createPortal(
            <aside
              className="cep-rail cep-rail--docked"
              aria-label="Create event steps"
              style={{
                position: "fixed",
                top: railDock.top,
                left: railDock.left,
                zIndex: 500,
              }}
            >
              {renderStepButtons()}
            </aside>,
            document.body
          )}

          <form className="cep-form" onSubmit={event => event.preventDefault()}>
            <div className="cep-command-wrap" ref={commandWrapRef}>
              {stuck ? (
                <div style={{ height: naturalHeightRef.current }} />
              ) : (
                <div className="cep-command-strip">
                  <div>
                    <span className="cep-command-kicker">Live booking board</span>
                    <strong>{form.eventName || "Untitled event"}</strong>
                  </div>
                  <div className="cep-command-metrics">
                    <span>{formatDateDisplay(form.eventDate) || "No date"}</span>
                    <span>{formatTimeDisplay(form.startTime) || "Time off"}</span>
                    <span>{form.selectedServices.length} services</span>
                  </div>
                </div>
              )}
            </div>

            {stuck && ReactDOM.createPortal(
              <div
                className="cep-command-strip cep-command-strip--docked"
                style={{
                  position: "fixed",
                  top: dock.top,
                  left: dock.left,
                  width: dock.width,
                  zIndex: 500,
                }}
              >
                <div>
                  <span className="cep-command-kicker">Live booking board</span>
                  <strong>{form.eventName || "Untitled event"}</strong>
                </div>
                <div className="cep-command-metrics">
                  <span>{formatDateDisplay(form.eventDate) || "No date"}</span>
                  <span>{formatTimeDisplay(form.startTime) || "Time off"}</span>
                  <span>{form.selectedServices.length} services</span>
                </div>
              </div>,
              document.body
            )}

            <div className="cep-grid">
              <section className="cep-panel cep-panel-prime">
                <div className="cep-panel-head">
                  <h2><ThunderboltOutlined /> Event Information</h2>
                  <small>Primary booking details</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Event Name <span className="req">*</span></span>
                    <input
                      placeholder="e.g., Ram's Birthday"
                      value={form.eventName}
                      onChange={event => set("eventName", event.target.value)}
                      className={errors.eventName ? "inp-error" : ""}
                    />
                    {renderError("eventName")}
                  </label>

                  <label className="cep-field">
                    <span>Event Date <span className="req">*</span></span>
                    <div
                      className="cep-input-icon"
                      ref={calRef}
                      onClick={event => {
                        event.stopPropagation();
                        setShowCal(open => !open);
                        setShowTime(false);
                      }}
                    >
                      <input
                        placeholder="DD/MM/YYYY"
                        readOnly
                        value={formatDateDisplay(form.eventDate)}
                        className={errors.eventDate ? "inp-error" : ""}
                      />
                      <CalendarOutlined />
                      {showCal && (
                        <CalendarPicker
                          anchorRef={calRef}
                          value={form.eventDate}
                          onChange={date => set("eventDate", date)}
                          onClose={() => setShowCal(false)}
                        />
                      )}
                    </div>
                    {renderError("eventDate")}
                  </label>

                  <label className="cep-field">
                    <span>Start Time <span className="req">*</span></span>
                    <div
                      className="cep-input-icon"
                      ref={timeRef}
                      onClick={event => {
                        event.stopPropagation();
                        setShowTime(open => !open);
                        setShowCal(false);
                      }}
                    >
                      <input
                        placeholder="HH:MM AM/PM"
                        readOnly
                        value={formatTimeDisplay(form.startTime)}
                        className={errors.startTime ? "inp-error" : ""}
                      />
                      <ClockCircleOutlined />
                      {showTime && (
                        <TimePicker
                          anchorRef={timeRef}
                          value={form.startTime}
                          onChange={time => set("startTime", time)}
                          onClose={() => setShowTime(false)}
                          minMinutes={timeMinMinutes}
                        />
                      )}
                    </div>
                    {renderError("startTime")}
                  </label>
                </div>
              </section>

              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2><UserOutlined /> Customer Information</h2>
                  <small>Client and payment snapshot</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Customer Name <span className="req">*</span></span>
                    <input
                      placeholder="Enter customer name"
                      value={form.customerName}
                      onChange={event => set("customerName", event.target.value)}
                      className={errors.customerName ? "inp-error" : ""}
                    />
                    {renderError("customerName")}
                  </label>

                  <label className="cep-field">
                    <span>Phone <span className="req">*</span></span>
                    <div className="cep-input-icon">
                      <input
                        placeholder="1234567890"
                        value={form.phone}
                        maxLength={10}
                        inputMode="numeric"
                        onChange={event => handlePhoneChange(event.target.value)}
                        className={errors.phone ? "inp-error" : ""}
                      />
                      <PhoneOutlined />
                    </div>
                    {renderError("phone")}
                  </label>

                  <label className="cep-field">
                    <span>Email <span className="req">*</span></span>
                    <div className="cep-input-icon">
                      <input
                        placeholder="customer@example.com"
                        value={form.email}
                        onChange={event => set("email", event.target.value)}
                        className={errors.email ? "inp-error" : ""}
                      />
                      <MailOutlined />
                    </div>
                    {renderError("email")}
                  </label>

                  <label className="cep-field wide">
                    <span>Event Amount <span className="req">*</span></span>
                    <div className="cep-input-icon">
                      <input
                        placeholder="Rs. 0"
                        value={form.eventAmount}
                        onChange={event => handleAmountChange(event.target.value)}
                        className={errors.eventAmount ? "inp-error" : ""}
                      />
                      <DollarOutlined />
                    </div>
                    {renderError("eventAmount")}
                    {form.eventAmount && (
                      <span className="cep-hint">
                        Numeric value: Rs. {parseInt(stripAmount(form.eventAmount), 10).toLocaleString("en-IN")}
                      </span>
                    )}
                  </label>
                </div>
              </section>

              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2><EnvironmentOutlined /> Venue Details</h2>
                  <small>Manual city and state entry</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Address <span className="req">*</span></span>
                    <textarea
                      placeholder="Enter complete venue address"
                      value={form.address}
                      onChange={event => set("address", event.target.value)}
                      className={errors.address ? "inp-error" : ""}
                    />
                    {renderError("address")}
                  </label>

                  <label className="cep-field">
                    <span>City <span className="req">*</span></span>
                    <input
                      placeholder="Enter city"
                      value={form.city}
                      onChange={event => set("city", event.target.value)}
                      className={errors.city ? "inp-error" : ""}
                    />
                    {renderError("city")}
                  </label>

                  <label className="cep-field">
                    <span>State <span className="req">*</span></span>
                    <input
                      placeholder="Enter state"
                      value={form.state}
                      onChange={event => set("state", event.target.value)}
                      className={errors.state ? "inp-error" : ""}
                    />
                    {renderError("state")}
                  </label>
                </div>
              </section>

              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2><CameraOutlined /> Select Services</h2>
                  <span className="cep-count">{form.selectedServices.length} selected</span>
                </div>
                {errors.services && (
                  <span className="cep-error cep-service-error">{errors.services}</span>
                )}
                <div className="cep-services">
                  {SERVICES.map(service => (
                    <label className="cep-service" key={service}>
                      <input
                        type="checkbox"
                        checked={form.selectedServices.includes(service)}
                        onChange={() => toggleService(service)}
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </section>

              {form.selectedServices.length > 0 && (
                <section className="cep-panel cep-panel-wide">
                  <div className="cep-panel-head">
                    <h2><PictureOutlined /> Album & Deliverable Configuration</h2>
                    <small>Configure deliverables per service</small>
                  </div>
                  {errors.albums && (
                    <span className="cep-error cep-service-error">{errors.albums}</span>
                  )}
                  <div className="cep-album-stack">
                    {form.selectedServices.map(service => (
                      <AlbumServiceCard
                        key={service}
                        service={service}
                        albumData={form.albumData[service] || {}}
                        onUpdate={data => updateAlbumData(service, data)}
                        attemptedSubmit={attemptedSubmit}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <footer className="cep-actions">
              <button className="cep-secondary" type="button" onClick={goBack}>
                <CloseOutlined /> Cancel
              </button>
              <button className="cep-primary" type="button" onClick={handleSubmit}>
                <PlusOutlined /> Create New Event
              </button>
            </footer>
          </form>
        </div>
      </section>
    </main>
  );
}