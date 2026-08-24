import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import {CameraOutlined,WalletOutlined,BellOutlined,RightOutlined,EnvironmentOutlined,TeamOutlined,
  CheckCircleFilled,ClockCircleOutlined,ExclamationCircleFilled,ArrowUpOutlined,ArrowDownOutlined,CalendarOutlined,
} from "@ant-design/icons";
import "./TodaysAgendaWidget.css";
import { fetchNotificationDataRequest } from "../../redux/actions/notificationDetailActions";
import type {
  NotificationEvent,
  NotificationMetaMap,
} from "../../redux/types/notificationDetailTypes";
import {
  getAllTransactions,
  TRANSACTIONS_UPDATED_EVENT,
} from "../../utils/transactionStore";
import type { StoredTransaction } from "../../utils/transactionStore";

/* Types */

export interface AgendaMember {
  name: string;
  role?: string;
  color?: string;
}

export interface AgendaEvent {
  id: string;
  eventName: string;
  eventType: string;
  clientName: string;
  startTime: string;
  endTime?: string;
  location?: string;
  assignedMembers: AgendaMember[];
  attendanceTime?: string;
  status?: "upcoming" | "ongoing" | "completed";
  date?: string;
}

export interface AgendaNotification {
  id: string;
  message: string;
  timeLabel: string;
  read?: boolean;
  category?: string;
}

export interface AgendaFinancials {
  paymentDueToday: number;
  pendingPayment: number;
  paymentReceivedToday: number;
}

export interface TodaysAgendaWidgetProps {
  events?: AgendaEvent[];
  notifications?: AgendaNotification[];
  financials?: AgendaFinancials;
  loading?: boolean;
  onNavigate?: (section: "events" | "payments" | "notifications") => void;
}

const EVENTS_STORAGE_KEY = "ax.events.v1";
const EVENTS_UPDATED_EVENT = "eventsBoardUpdated";

interface BoardEvent {
  id: string;
  name: string;
  type: string;
  date: string; 
  time: string; 
  address: string;
  city: string;
  customer: string;
  status: string;
  members: number;
  location?: { lat: number; lng: number } | null;
  assignedMembersList?: AssignedMember[];
}

function readBoardEvents(): BoardEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface AssignedMember {
  id: number;
  name: string;
  role?: string;
  status?: string;
}

function toAgendaMembers(list: AssignedMember[] | undefined): AgendaMember[] {
  if (!Array.isArray(list)) return [];
  return list.map((m) => ({
    name: m.name,
    role: m.role,
  }));
}

function boardEventToAgendaEvent(e: BoardEvent): AgendaEvent {
  return {
    id: e.id,
    eventName: e.name,
    eventType: e.type,
    clientName: e.customer,
    startTime: e.time,
    location: [e.address, e.city].filter(Boolean).join(", "),
    assignedMembers: toAgendaMembers(e.assignedMembersList),
    date: e.date,
  };
}

function useLiveAgendaEvents(enabled: boolean) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(() => {
    setEvents(readBoardEvents().map(boardEventToAgendaEvent));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    reload();
    window.addEventListener(EVENTS_UPDATED_EVENT, reload);
    window.addEventListener("storage", reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener(EVENTS_UPDATED_EVENT, reload);
      window.removeEventListener("storage", reload);
      window.removeEventListener("focus", reload);
    };
  }, [enabled, reload]);

  return { events, loading };
}


function computeFinancials(transactions: StoredTransaction[]): AgendaFinancials {
  const todayStr = new Date().toISOString().split("T")[0];

  const paymentReceivedToday = transactions
    .filter((t) => t.date === todayStr)
    .reduce((sum, t) => sum + (Number(t.amountPaid) || 0), 0);

  const paymentDueToday = transactions
    .filter((t) => t.date === todayStr && t.status !== "Paid" && t.status !== "Refunded")
    .reduce((sum, t) => sum + (Number(t.balanceAmount) || 0), 0);

  const pendingPayment = transactions.reduce(
    (sum, t) => sum + (Number(t.balanceAmount) || 0),
    0
  );

  return { paymentDueToday, pendingPayment, paymentReceivedToday };
}

function useLiveAgendaFinancials(enabled: boolean) {
  const [financials, setFinancials] = useState<AgendaFinancials>({
    paymentDueToday: 0,
    pendingPayment: 0,
    paymentReceivedToday: 0,
  });

  const reload = useCallback(() => {
    setFinancials(computeFinancials(getAllTransactions()));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    reload();
    window.addEventListener(TRANSACTIONS_UPDATED_EVENT, reload);
    window.addEventListener("storage", reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener(TRANSACTIONS_UPDATED_EVENT, reload);
      window.removeEventListener("storage", reload);
      window.removeEventListener("focus", reload);
    };
  }, [enabled, reload]);

  return financials;
}

interface NotificationRootState {
  notificationDetail: {
    events: NotificationEvent[];
    metaMap: NotificationMetaMap;
    loading: boolean;
    saving: boolean;
    deleting: boolean;
    error: string | null;
  };
}

function useLiveAgendaNotifications(enabled: boolean) {
  const dispatch = useDispatch();

  const { events, metaMap, loading } = useSelector(
    (state: NotificationRootState) => state.notificationDetail
  );

  useEffect(() => {
    if (!enabled) return;
    dispatch(fetchNotificationDataRequest() as any);
  }, [enabled, dispatch]);

  const notifications = useMemo<AgendaNotification[]>(() => {
    if (!enabled) return [];
    return [...events]
      .sort((a, b) => {
        const aRead = metaMap[a.id]?.read ? 1 : 0;
        const bRead = metaMap[b.id]?.read ? 1 : 0;
        if (aRead !== bRead) return aRead - bRead; // unread bubbles to the top
        return dayjs(b.date).valueOf() - dayjs(a.date).valueOf(); // newest first
      })
      .map((e) => ({
        id: e.id,
        message: e.title,
        timeLabel: `${dayjs(e.date).format("DD MMM")}${e.time ? ` · ${e.time}` : ""}`,
        read: !!metaMap[e.id]?.read,
        category: e.category,
      }));
  }, [enabled, events, metaMap]);

  return { notifications, loading };
}

/* Helpers  */

const pad2 = (n: number) => n.toString().padStart(2, "0");

function formatClock(d: Date) {
  return `${pad2(d.getHours() % 12 === 0 ? 12 : d.getHours() % 12)}:${pad2(
    d.getMinutes()
  )}:${pad2(d.getSeconds())}`;
}

function formatMeridiem(d: Date) {
  return d.getHours() >= 12 ? "PM" : "AM";
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dayProgressPercent(d: Date) {
  const secondsIntoDay = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  return (secondsIntoDay / 86400) * 100;
}

function getGreeting(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Winding down";
}


function parseTimeToday(timeStr: string | undefined, base: Date): Date | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function computeStatus(
  ev: AgendaEvent,
  now: Date
): "upcoming" | "ongoing" | "completed" {
  const start = parseTimeToday(ev.startTime, now);
  const end = parseTimeToday(ev.endTime, now) ?? (start ? new Date(start.getTime() + 2 * 3600 * 1000) : null);
  if (!start) return ev.status ?? "upcoming";
  if (now < start) return "upcoming";
  if (end && now > end) return "completed";
  return "ongoing";
}

function isToday(dateStr: string | undefined) {
  if (!dateStr) return true; 

  const trimmed = dateStr.trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? dayjs(trimmed, "YYYY-MM-DD")
    : dayjs(trimmed);

  if (!parsed.isValid()) return false;
  return parsed.isSame(dayjs(), "day");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const MEMBER_PALETTE = ["#38bdf8", "#4ade80", "#fac775", "#c084fc", "#ff8a8a", "#5eead4"];
function memberColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_PALETTE[Math.abs(hash) % MEMBER_PALETTE.length];
}

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const STATUS_META: Record<
  "upcoming" | "ongoing" | "completed",
  { label: string; accent: string }
> = {
  upcoming: { label: "Upcoming", accent: "amber" },
  ongoing: { label: "Ongoing", accent: "cyan" },
  completed: { label: "Wrapped", accent: "green" },
};

/* Component */

type SectionKey = "events" | "payments" | "notifications";

const SECTION_ROUTES: Record<SectionKey, string> = {
  events: "/events",
  payments: "/transactions",
  notifications: "/notifications",
};

export default function TodaysAgendaWidget({
  events: eventsProp,
  notifications: notificationsProp,
  financials: financialsProp,
  loading: loadingProp,
  onNavigate,
}: TodaysAgendaWidgetProps) {
  const navigate = useNavigate();
  const liveEvents = useLiveAgendaEvents(eventsProp === undefined);
  const liveFinancials = useLiveAgendaFinancials(financialsProp === undefined);
  const liveNotifications = useLiveAgendaNotifications(notificationsProp === undefined);

  const events = eventsProp ?? liveEvents.events;
  const notifications = notificationsProp ?? liveNotifications.notifications;
  const financials = financialsProp ?? liveFinancials;
  const loading =
    loadingProp ??
    ((eventsProp === undefined ? liveEvents.loading : false) ||
      (notificationsProp === undefined ? liveNotifications.loading : false));

  const [now, setNow] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const todaysEvents = useMemo(
    () =>
      events
        .filter((e) => isToday(e.date))
        .map((e) => ({ ...e, _status: computeStatus(e, now) }))
        .sort((a, b) => {
          const ta = parseTimeToday(a.startTime, now)?.getTime() ?? 0;
          const tb = parseTimeToday(b.startTime, now)?.getTime() ?? 0;
          return ta - tb;
        }),
    [events, now]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  );

  const totalFinancial =
    financials.paymentDueToday + financials.pendingPayment + financials.paymentReceivedToday;

  const receivedPct = totalFinancial > 0 ? (financials.paymentReceivedToday / totalFinancial) * 100 : 0;
  const duePct = totalFinancial > 0 ? (financials.paymentDueToday / totalFinancial) * 100 : 0;
  const pendingPct = totalFinancial > 0 ? (financials.pendingPayment / totalFinancial) * 100 : 0;

  const ongoingCount = todaysEvents.filter((e) => e._status === "ongoing").length;
  const dayPct = dayProgressPercent(now);
  const greeting = getGreeting(now.getHours());

  const handleGo = (section: SectionKey) => {
    if (onNavigate) {
      onNavigate(section);
      return;
    }
    navigate(SECTION_ROUTES[section]);
  };

  
  const RADIUS = 42;
  const CIRC = 2 * Math.PI * RADIUS;
  const receivedLen = (receivedPct / 100) * CIRC;
  const dueLen = (duePct / 100) * CIRC;
  const pendingLen = (pendingPct / 100) * CIRC;

  return (
    <section className="cmd" aria-label="Today's command center">
      {/* ambient glow orbs */}
      <div className="cmd__orb cmd__orb--a" aria-hidden />
      <div className="cmd__orb cmd__orb--b" aria-hidden />

      {/* ===== Header ===== */}
      <header className="cmd__header">
        <div className="cmd__ring-wrap">
          <svg viewBox="0 0 120 120" className="cmd__ring" aria-hidden>
            <circle cx="60" cy="60" r="52" className="cmd__ring-track" />
            <circle
              cx="60"
              cy="60"
              r="52"
              className="cmd__ring-progress"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - dayPct / 100)}`}
            />
          </svg>
          <div className="cmd__ring-center">
            <span className="cmd__clock">
              {formatClock(now)}
              <span className="cmd__meridiem">{formatMeridiem(now)}</span>
            </span>
            <span className="cmd__day-pct">{dayPct.toFixed(0)}% of day elapsed</span>
          </div>
        </div>

        <div className="cmd__heading">
          <span className="cmd__greeting">{greeting}</span>
          <h2 className="cmd__title">Today's Command Center</h2>
          <span className="cmd__date">
            <CalendarOutlined aria-hidden /> {formatDateLong(now)}
          </span>
        </div>

        <div className="cmd__notif-wrap" ref={notifRef}>
          <button
            type="button"
            className="cmd__notif-btn"
            onClick={() => setNotifOpen((v) => !v)}
            aria-expanded={notifOpen}
            aria-label={`${unreadNotifications.length} unread notifications`}
          >
            <BellOutlined />
            {unreadNotifications.length > 0 && (
              <span className="cmd__notif-badge">{unreadNotifications.length}</span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                className="cmd__notif-pop"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <div className="cmd__notif-pop-head">
                  <span>Notifications</span>
                  <span className="cmd__notif-pop-count">{unreadNotifications.length} unread</span>
                </div>
                {notifications.length === 0 ? (
                  <p className="cmd__notif-empty">You're all caught up — nothing waiting.</p>
                ) : (
                  <ul className="cmd__notif-list">
                    {notifications.slice(0, 5).map((n) => (
                      <li key={n.id} className={n.read ? "" : "is-unread"}>
                        <span className="cmd__notif-dot" aria-hidden />
                        <div>
                          <p>{n.message}</p>
                          <time>{n.timeLabel}</time>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="cmd__notif-viewall" onClick={() => handleGo("notifications")}>
                  View all notifications <RightOutlined />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ===== Stat strip ===== */}
      {!loading && (
        <div className="cmd__stats">
          <motion.button
            type="button"
            className="cmd__stat cmd__stat--cyan"
            onClick={() => handleGo("events")}
            whileHover={{ y: -2 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <CameraOutlined className="cmd__stat-icon" />
            <span className="cmd__stat-value">{todaysEvents.length}</span>
            <span className="cmd__stat-label">Events today</span>
            {ongoingCount > 0 && <span className="cmd__stat-pulse">{ongoingCount} live</span>}
          </motion.button>

          <motion.button
            type="button"
            className="cmd__stat cmd__stat--amber"
            onClick={() => handleGo("notifications")}
            whileHover={{ y: -2 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <BellOutlined className="cmd__stat-icon" />
            <span className="cmd__stat-value">{unreadNotifications.length}</span>
            <span className="cmd__stat-label">Unread alerts</span>
          </motion.button>

          <motion.button
            type="button"
            className="cmd__stat cmd__stat--danger"
            onClick={() => handleGo("payments")}
            whileHover={{ y: -2 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <ArrowDownOutlined className="cmd__stat-icon" />
            <span className="cmd__stat-value">{formatINR(financials.paymentDueToday)}</span>
            <span className="cmd__stat-label">Due today</span>
          </motion.button>

          <motion.button
            type="button"
            className="cmd__stat cmd__stat--green"
            onClick={() => handleGo("payments")}
            whileHover={{ y: -2 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ArrowUpOutlined className="cmd__stat-icon" />
            <span className="cmd__stat-value">{formatINR(financials.paymentReceivedToday)}</span>
            <span className="cmd__stat-label">Received today</span>
          </motion.button>
        </div>
      )}

      {/* ===== Main grid ===== */}
      <div className="cmd__grid">
        {/* ---- Events timeline ---- */}
        <div className="cmd__panel cmd__panel--events">
          <div className="cmd__panel-head">
            <h3>Today's Shoots</h3>
            <button type="button" className="cmd__panel-link" onClick={() => handleGo("events")}>
              View all <RightOutlined />
            </button>
          </div>

          {loading ? (
            <div className="cmd__skeleton">
              {[0, 1, 2].map((i) => (
                <div className="cmd__skeleton-row" key={i} />
              ))}
            </div>
          ) : todaysEvents.length === 0 ? (
            <div className="cmd__empty">
              <CameraOutlined />
              <p>No shoots on the books today.</p>
              <span>Enjoy the quiet — or line one up.</span>
            </div>
          ) : (
            <ol className="cmd__timeline">
              {todaysEvents.map((ev, idx) => {
                const meta = STATUS_META[ev._status];
                return (
                  <motion.li
                    key={ev.id}
                    className={`cmd__event cmd__event--${meta.accent}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                  >
                    <div className="cmd__event-rail">
                      <span className={`cmd__event-dot ${ev._status === "ongoing" ? "is-pulsing" : ""}`} />
                      {idx < todaysEvents.length - 1 && <span className="cmd__event-line" />}
                    </div>

                    <div className="cmd__event-body">
                      <div className="cmd__event-top">
                        <span className="cmd__event-time">
                          {ev.startTime}
                          {ev.endTime ? ` – ${ev.endTime}` : ""}
                        </span>
                        <span className={`cmd__event-status cmd__event-status--${meta.accent}`}>
                          {meta.label}
                        </span>
                      </div>

                      <h4 className="cmd__event-name">{ev.eventName}</h4>
                      <p className="cmd__event-sub">
                        {ev.eventType} · {ev.clientName}
                      </p>

                      {ev.location && (
                        <p className="cmd__event-location">
                          <EnvironmentOutlined /> {ev.location}
                        </p>
                      )}

                      <div className="cmd__event-foot">
                        <div className="cmd__event-members">
                          <TeamOutlined className="cmd__event-members-icon" />
                          <div className="cmd__avatar-stack">
                            {ev.assignedMembers.slice(0, 4).map((m, i) => (
                              <span
                                key={m.name + i}
                                className="cmd__avatar"
                                style={{ background: m.color ?? memberColor(m.name), zIndex: 10 - i }}
                                title={m.role ? `${m.name} · ${m.role}` : m.name}
                              >
                                {initials(m.name)}
                              </span>
                            ))}
                            {ev.assignedMembers.length > 4 && (
                              <span className="cmd__avatar cmd__avatar--more">
                                +{ev.assignedMembers.length - 4}
                              </span>
                            )}
                            {ev.assignedMembers.length === 0 && (
                              <span className="cmd__event-unassigned">Unassigned</span>
                            )}
                          </div>
                        </div>

                        {ev.attendanceTime ? (
                          <span className="cmd__event-attendance">
                            <CheckCircleFilled /> Checked in {ev.attendanceTime}
                          </span>
                        ) : (
                          <span className="cmd__event-attendance cmd__event-attendance--pending">
                            <ClockCircleOutlined /> Awaiting check-in
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </div>

        {/* ---- Financials ---- */}
        <div className="cmd__panel cmd__panel--finance">
          <div className="cmd__panel-head">
            <h3>Today's Financials</h3>
            <button type="button" className="cmd__panel-link" onClick={() => handleGo("payments")}>
              Ledger <RightOutlined />
            </button>
          </div>

          {loading ? (
            <div className="cmd__skeleton">
              <div className="cmd__skeleton-row" style={{ height: 120 }} />
            </div>
          ) : totalFinancial === 0 ? (
            <div className="cmd__empty">
              <WalletOutlined />
              <p>No financial activity today.</p>
              <span>Dues, pending and receipts will show up here.</span>
            </div>
          ) : (
            <>
              <div className="cmd__donut-wrap">
                <svg viewBox="0 0 100 100" className="cmd__donut">
                  <circle cx="50" cy="50" r={RADIUS} className="cmd__donut-track" />
                  <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    className="cmd__donut-seg cmd__donut-seg--green"
                    strokeDasharray={`${receivedLen} ${CIRC - receivedLen}`}
                    strokeDashoffset={0}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    className="cmd__donut-seg cmd__donut-seg--danger"
                    strokeDasharray={`${dueLen} ${CIRC - dueLen}`}
                    strokeDashoffset={-receivedLen}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    className="cmd__donut-seg cmd__donut-seg--amber"
                    strokeDasharray={`${pendingLen} ${CIRC - pendingLen}`}
                    strokeDashoffset={-(receivedLen + dueLen)}
                  />
                </svg>
                <div className="cmd__donut-center">
                  <span className="cmd__donut-total">{formatINR(totalFinancial)}</span>
                  <span className="cmd__donut-total-label">Total in motion</span>
                </div>
              </div>

              <ul className="cmd__finance-legend">
                <li>
                  <span className="cmd__legend-dot cmd__legend-dot--green" />
                  <span className="cmd__legend-label">Received today</span>
                  <span className="cmd__legend-value">{formatINR(financials.paymentReceivedToday)}</span>
                </li>
                <li>
                  <span className="cmd__legend-dot cmd__legend-dot--danger" />
                  <span className="cmd__legend-label">Due today</span>
                  <span className="cmd__legend-value">{formatINR(financials.paymentDueToday)}</span>
                </li>
                <li>
                  <span className="cmd__legend-dot cmd__legend-dot--amber" />
                  <span className="cmd__legend-label">Pending overall</span>
                  <span className="cmd__legend-value">{formatINR(financials.pendingPayment)}</span>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}