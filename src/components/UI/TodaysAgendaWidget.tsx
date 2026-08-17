import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {CameraOutlined,WalletOutlined,PictureOutlined,BellOutlined,RightOutlined,ClockCircleOutlined,ExclamationCircleFilled,} from "@ant-design/icons";
import "./TodaysAgendaWidget.css";


/*  Types  */

export interface AgendaShoot {
  id: string;
  time: string;
  clientName: string;
  eventType: string;
  location?: string;
}

export interface AgendaPayment {
  id: string;
  clientName: string;
  amount: number;
  dueLabel: string;
  overdue?: boolean;
}

export interface AgendaAlbum {
  id: string;
  albumName: string;
  clientName: string;
  submittedLabel: string; 
}

export interface AgendaNotification {
  id: string;
  message: string;
  timeLabel: string; 
  read?: boolean;
}

export interface TodaysAgendaWidgetProps {
  shoots?: AgendaShoot[];
  payments?: AgendaPayment[];
  albums?: AgendaAlbum[];
  notifications?: AgendaNotification[];
  loading?: boolean;
  onNavigate?: (section: "shoots" | "payments" | "albums" | "notifications") => void;
}


const STORAGE_KEYS = {
  shoots: "axs_agenda_shoots",
  payments: "axs_agenda_payments",
  albums: "axs_agenda_albums",
  notifications: "axs_agenda_notifications",
};

const AGENDA_UPDATE_EVENT = "axs-agenda-update";

function readFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

/*  Component  */

type SectionKey = "shoots" | "payments" | "albums" | "notifications";

const SECTION_ROUTES: Record<SectionKey, string> = {
  shoots: "/events",
  payments: "/transactions",
  albums: "/albums",
  notifications: "/notifications",
};

export default function TodaysAgendaWidget({
  shoots: shootsProp,
  payments: paymentsProp,
  albums: albumsProp,
  notifications: notificationsProp,
  loading: loadingProp,
  onNavigate,
}: TodaysAgendaWidgetProps) {
  const navigate = useNavigate();

  const [shoots, setShoots] = useState<AgendaShoot[]>(shootsProp ?? []);
  const [payments, setPayments] = useState<AgendaPayment[]>(paymentsProp ?? []);
  const [albums, setAlbums] = useState<AgendaAlbum[]>(albumsProp ?? []);
  const [notifications, setNotifications] = useState<AgendaNotification[]>(
    notificationsProp ?? []
  );
  const [loading, setLoading] = useState(loadingProp ?? shootsProp === undefined);
  const [expanded, setExpanded] = useState<SectionKey | null>(null);

  const loadFromStorage = useCallback(() => {
    setShoots(readFromStorage<AgendaShoot>(STORAGE_KEYS.shoots));
    setPayments(readFromStorage<AgendaPayment>(STORAGE_KEYS.payments));
    setAlbums(readFromStorage<AgendaAlbum>(STORAGE_KEYS.albums));
    setNotifications(readFromStorage<AgendaNotification>(STORAGE_KEYS.notifications));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (shootsProp !== undefined) return;

    loadFromStorage();

    const handleUpdate = () => loadFromStorage();
    window.addEventListener(AGENDA_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(AGENDA_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [shootsProp, loadFromStorage]);

  useEffect(() => {
    if (shootsProp !== undefined) setShoots(shootsProp);
  }, [shootsProp]);
  useEffect(() => {
    if (paymentsProp !== undefined) setPayments(paymentsProp);
  }, [paymentsProp]);
  useEffect(() => {
    if (albumsProp !== undefined) setAlbums(albumsProp);
  }, [albumsProp]);
  useEffect(() => {
    if (notificationsProp !== undefined) setNotifications(notificationsProp);
  }, [notificationsProp]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    []
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  );
  const overduePayments = useMemo(
    () => payments.filter((p) => p.overdue),
    [payments]
  );

  const totalDue = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  const handleRowClick = (section: SectionKey) => {
    if (onNavigate) {
      onNavigate(section);
      return;
    }
    navigate(SECTION_ROUTES[section]);
  };

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    section: SectionKey
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(section);
    }
  };

  const toggleExpand = (section: SectionKey, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => (prev === section ? null : section));
  };

  const rows: Array<{
    key: SectionKey;
    icon: React.ReactNode;
    label: string;
    accent: "cyan" | "amber" | "green" | "danger";
    count: number;
    preview: string[];
    emptyText: string;
  }> = [
    {
      key: "shoots",
      icon: <CameraOutlined />,
      label: "Today's Shoots",
      accent: "cyan",
      count: shoots.length,
      preview: shoots
        .slice(0, 2)
        .map((s) => `${s.time} · ${s.clientName} (${s.eventType})`),
      emptyText: "No shoots scheduled today",
    },
    {
      key: "payments",
      icon: <WalletOutlined />,
      label: "Payments Due",
      accent: overduePayments.length > 0 ? "danger" : "amber",
      count: payments.length,
      preview: payments
        .slice(0, 2)
        .map(
          (p) =>
            `${p.clientName} · ₹${p.amount.toLocaleString("en-IN")} · ${p.dueLabel}`
        ),
      emptyText: "No pending payments",
    },
    {
      key: "albums",
      icon: <PictureOutlined />,
      label: "Albums Awaiting Approval",
      accent: "green",
      count: albums.length,
      preview: albums
        .slice(0, 2)
        .map((a) => `${a.albumName} · ${a.clientName} · ${a.submittedLabel}`),
      emptyText: "Nothing waiting on review",
    },
    {
      key: "notifications",
      icon: <BellOutlined />,
      label: "Unread Notifications",
      accent: "cyan",
      count: unreadNotifications.length,
      preview: unreadNotifications.slice(0, 2).map((n) => n.message),
      emptyText: "You're all caught up",
    },
  ];

  return (
    <section className="agenda-widget" aria-label="Today's agenda">
      <header className="agenda-widget__header">
        <div className="agenda-widget__title-group">
          <ClockCircleOutlined className="agenda-widget__title-icon" aria-hidden />
          <h2 className="agenda-widget__title">Today's Agenda</h2>
        </div>
        <span className="agenda-widget__date">{todayLabel}</span>
      </header>

      {loading ? (
        <div className="agenda-widget__skeleton" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div className="agenda-widget__skeleton-row" key={i} />
          ))}
        </div>
      ) : (
        <ul className="agenda-widget__list" role="list">
          {rows.map((row, idx) => (
            <motion.li
              key={row.key}
              className={`agenda-row agenda-row--${row.accent}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
            >
              <div
                className="agenda-row__main"
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(row.key)}
                onKeyDown={(e) => handleRowKeyDown(e, row.key)}
                aria-label={`${row.label}, ${row.count} item${
                  row.count === 1 ? "" : "s"
                }. View all.`}
              >
                <span className="agenda-row__icon" aria-hidden>
                  {row.icon}
                </span>

                <span className="agenda-row__label">{row.label}</span>

                {row.key === "payments" && overduePayments.length > 0 && (
                  <span className="agenda-row__flag" title="Overdue payments">
                    <ExclamationCircleFilled aria-hidden />
                  </span>
                )}

                <span className="agenda-row__count">{row.count}</span>

                <button
                  type="button"
                  className="agenda-row__expand-btn"
                  onClick={(e) => toggleExpand(row.key, e)}
                  aria-expanded={expanded === row.key}
                  aria-label={`${
                    expanded === row.key ? "Collapse" : "Expand"
                  } ${row.label} preview`}
                >
                  <RightOutlined
                    className={`agenda-row__chevron ${
                      expanded === row.key ? "agenda-row__chevron--open" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {expanded === row.key && (
                  <motion.div
                    className="agenda-row__preview"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {row.preview.length > 0 ? (
                      <ul>
                        {row.preview.map((text, i) => (
                          <li key={i}>{text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="agenda-row__empty">{row.emptyText}</p>
                    )}
                    {row.count > row.preview.length && (
                      <button
                        type="button"
                        className="agenda-row__view-all"
                        onClick={() => handleRowClick(row.key)}
                      >
                        View all {row.count} →
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </ul>
      )}

      {!loading && payments.length > 0 && (
        <footer className="agenda-widget__footer">
          <span>Total due today</span>
          <strong>₹{totalDue.toLocaleString("en-IN")}</strong>
        </footer>
      )}
    </section>
  );
}