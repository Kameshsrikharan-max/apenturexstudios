import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import {ArrowLeftOutlined,SearchOutlined,ReloadOutlined,DownloadOutlined,CloseOutlined,CopyOutlined,CheckCircleOutlined,CloseCircleOutlined,KeyOutlined,UserAddOutlined,ExclamationCircleOutlined,CameraOutlined,SafetyCertificateOutlined,ThunderboltOutlined,LoadingOutlined,LeftOutlined,RightOutlined,AuditOutlined,} from "@ant-design/icons";
import "./AuditLogPage.css";
import { fetchAuditLogsRequest, fetchAuditStatsRequest } from "../../../redux/actions/auditLogActions";
import { AuditLogEntry, AuditLogFilters, AuditLogState } from "../../../redux/types/auditLogTypes";

interface RootStateLike {
  auditLog?: AuditLogState;
}

const EMPTY_STATE: AuditLogState = {
  logs: [],
  total: 0,
  page: 1,
  pages: 1,
  loading: false,
  error: null,
  stats: null,
  statsLoading: false,
};

const LIVE_INTERVAL_MS = 15000;

const CATEGORIES: Array<{ key: AuditLogFilters["category"]; label: string }> = [
  { key: "all", label: "All" },
  { key: "auth", label: "Auth" },
  { key: "registration", label: "Registrations" },
  { key: "delete_request", label: "Deletions" },
  { key: "checkin", label: "Check-ins" },
  { key: "admin", label: "Admin" },
];

const CATEGORY_META: Record<string, { label: string; icon: ReactNode }> = {
  auth: { label: "Auth", icon: <KeyOutlined /> },
  registration: { label: "Registration", icon: <UserAddOutlined /> },
  delete_request: { label: "Deletion", icon: <ExclamationCircleOutlined /> },
  checkin: { label: "Check-in", icon: <CameraOutlined /> },
  admin: { label: "Admin", icon: <SafetyCertificateOutlined /> },
  system: { label: "System", icon: <ThunderboltOutlined /> },
};

const getCategoryMeta = (category: string) => CATEGORY_META[category] || CATEGORY_META.system;

const dayLabel = (iso: string): string => {
  const d = dayjs(iso);
  if (d.isSame(dayjs(), "day")) return "Today";
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return d.format("dddd, DD MMM YYYY");
};

const relativeTime = (iso: string): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return dayjs(iso).format("DD MMM, hh:mm A");
};

const prettyRole = (role: string): string =>
  role ? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const initialFilters: AuditLogFilters = {
  category: "all",
  outcome: "all",
  search: "",
  from: "",
  to: "",
  page: 1,
  limit: 25,
};

function AuditLogPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { logs, total, page, pages, loading, error, stats, statsLoading } = useSelector(
    (state: RootStateLike) => state.auditLog || EMPTY_STATE
  );

  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const patchFilters = (patch: Partial<AuditLogFilters>) =>
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  useEffect(() => {
    dispatch(fetchAuditLogsRequest(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    dispatch(fetchAuditStatsRequest());
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput, page: 1 }
      );
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      dispatch(fetchAuditLogsRequest(filtersRef.current));
      dispatch(fetchAuditStatsRequest());
    }, LIVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [live, dispatch]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const refresh = () => {
    dispatch(fetchAuditLogsRequest(filters));
    dispatch(fetchAuditStatsRequest());
  };

  const series = useMemo(() => {
    const map = new Map((stats?.perDay || []).map((d) => [d.date, d.count]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = dayjs().subtract(6 - i, "day");
      const key = d.format("YYYY-MM-DD");
      return { key, label: d.format("dd"), count: map.get(key) || 0 };
    });
  }, [stats]);
  const maxCount = Math.max(1, ...series.map((s) => s.count));

  const groups = useMemo(() => {
    const out: Array<{ label: string; items: AuditLogEntry[] }> = [];
    logs.forEach((entry) => {
      const label = dayLabel(entry.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) {
        last.items.push(entry);
      } else {
        out.push({ label, items: [entry] });
      }
    });
    return out;
  }, [logs]);

  const exportCsv = () => {
    const header = ["Time", "Actor", "Email", "Role", "Action", "Category", "Outcome", "Status", "Method", "Path", "Target", "IP"];
    const rows = logs.map((l) => [
      dayjs(l.createdAt).format("YYYY-MM-DD HH:mm:ss"),
      l.actorName,
      l.actorEmail,
      l.actorRole,
      l.action,
      l.category,
      l.outcome,
      l.statusCode,
      l.method,
      l.path,
      l.targetType ? `${l.targetType}:${l.targetId}` : "",
      l.ip,
    ]);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${dayjs().format("YYYYMMDD-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyEntry = async (entry: AuditLogEntry) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const hasFilters =
    filters.category !== "all" || filters.outcome !== "all" || Boolean(filters.search) || Boolean(filters.from) || Boolean(filters.to);

  const clearFilters = () => {
    setSearchInput("");
    setFilters(initialFilters);
  };

  const topActor = stats?.topActors?.[0];

  return (
    <div className="alq-page">
      <div className="alq-header">
        <button type="button" className="alq-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined /> Back
        </button>
        <div className="alq-header-icon">
          <AuditOutlined />
        </div>
        <div className="alq-header-text">
          <h1>Audit Log</h1>
          <p>Who did what, and when — every sensitive action across AXS</p>
        </div>
        <div className="alq-header-actions">
          <button
            type="button"
            className={`alq-live-btn${live ? " is-live" : ""}`}
            onClick={() => setLive((v) => !v)}
            aria-pressed={live}
          >
            <span className="alq-live-dot" /> {live ? "Live" : "Go live"}
          </button>
          <button type="button" className="alq-icon-btn" onClick={refresh} aria-label="Refresh">
            {loading ? <LoadingOutlined spin /> : <ReloadOutlined />}
          </button>
          <button type="button" className="alq-btn-primary" onClick={exportCsv} disabled={logs.length === 0}>
            <DownloadOutlined /> Export CSV
          </button>
        </div>
      </div>

      <div className="alq-stats">
        <div className="alq-stat">
          <span className="alq-stat-label">Total events</span>
          <strong>{statsLoading && !stats ? "…" : (stats?.total ?? 0).toLocaleString("en-IN")}</strong>
        </div>
        <div className="alq-stat">
          <span className="alq-stat-label">Last 24 hours</span>
          <strong>{stats?.last24h ?? 0}</strong>
        </div>
        <div className={`alq-stat${(stats?.failures24h ?? 0) > 0 ? " alq-stat--danger" : ""}`}>
          <span className="alq-stat-label">Failed (24h)</span>
          <strong>{stats?.failures24h ?? 0}</strong>
        </div>
        <div className="alq-stat">
          <span className="alq-stat-label">Most active (7d)</span>
          <strong className="alq-stat-small">{topActor ? topActor.name || topActor.email : "—"}</strong>
          {topActor ? <small>{topActor.count} actions</small> : null}
        </div>
        <div className="alq-stat alq-stat--chart" aria-label="Events per day, last 7 days">
          <span className="alq-stat-label">Last 7 days</span>
          <div className="alq-bars">
            {series.map((s) => (
              <div className="alq-bar-col" key={s.key} title={`${s.key}: ${s.count}`}>
                <motion.span
                  className="alq-bar"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(6, (s.count / maxCount) * 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <em>{s.label}</em>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="alq-toolbar">
        <div className="alq-search-box">
          <SearchOutlined />
          <input
            type="text"
            placeholder="Search actor, action, target..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search audit log"
          />
        </div>
        <select
          className="alq-select"
          value={filters.outcome}
          onChange={(e) => patchFilters({ outcome: e.target.value as AuditLogFilters["outcome"] })}
          aria-label="Filter by outcome"
        >
          <option value="all">All outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failed</option>
        </select>
        <input
          type="date"
          className="alq-select"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => patchFilters({ from: e.target.value })}
          aria-label="From date"
        />
        <input
          type="date"
          className="alq-select"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => patchFilters({ to: e.target.value })}
          aria-label="To date"
        />
        {hasFilters ? (
          <button type="button" className="alq-btn-ghost" onClick={clearFilters}>
            <CloseOutlined /> Clear
          </button>
        ) : null}
      </div>

      <div className="alq-chips" role="tablist" aria-label="Category">
        {CATEGORIES.map((c) => {
          const count = c.key === "all" ? null : stats?.byCategory.find((b) => b.category === c.key)?.count;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={filters.category === c.key}
              className={`alq-chip${filters.category === c.key ? " is-active" : ""}`}
              onClick={() => patchFilters({ category: c.key })}
            >
              {c.label}
              {count ? <span>{count}</span> : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="alq-banner">
          <ExclamationCircleOutlined /> {error}
        </div>
      ) : null}

      {loading && logs.length === 0 ? (
        <div className="alq-loading">
          <LoadingOutlined spin /> Loading activity...
        </div>
      ) : logs.length === 0 ? (
        <div className="alq-empty">
          <AuditOutlined />
          <p>{hasFilters ? "No activity matches your filters." : "No activity recorded yet."}</p>
        </div>
      ) : (
        <div className="alq-timeline">
          {groups.map((group) => (
            <section key={group.label} className="alq-group">
              <h2 className="alq-group-label">{group.label}</h2>
              <div className="alq-group-list">
                <AnimatePresence initial={false}>
                  {group.items.map((entry) => {
                    const meta = getCategoryMeta(entry.category);
                    const isFail = entry.outcome === "failure";
                    return (
                      <motion.div
                        layout
                        key={entry._id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`alq-entry${isFail ? " is-failure" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(entry)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelected(entry);
                          }
                        }}
                      >
                        <span className={`alq-entry-icon alq-cat--${entry.category}`}>{meta.icon}</span>
                        <div className="alq-entry-main">
                          <div className="alq-entry-top">
                            <strong>{entry.actorName || entry.actorEmail || "Anonymous"}</strong>
                            {entry.actorRole ? <span className="alq-role">{prettyRole(entry.actorRole)}</span> : null}
                            <code className="alq-action">{entry.action}</code>
                          </div>
                          <p>
                            {entry.summary || `${entry.method} ${entry.path}`}
                            {entry.targetId ? <em> · {entry.targetType || "target"} {entry.targetId.slice(-6)}</em> : null}
                          </p>
                        </div>
                        <span className={`alq-outcome ${isFail ? "is-fail" : "is-ok"}`}>
                          {isFail ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                          {isFail ? "Failed" : "OK"}
                        </span>
                        <time className="alq-time" dateTime={entry.createdAt} title={dayjs(entry.createdAt).format("DD MMM YYYY, hh:mm:ss A")}>
                          {relativeTime(entry.createdAt)}
                        </time>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      {total > 0 ? (
        <div className="alq-pager">
          <span>
            {total.toLocaleString("en-IN")} events · page {page} of {pages}
          </span>
          <div>
            <button
              type="button"
              className="alq-icon-btn"
              disabled={page <= 1 || loading}
              onClick={() => setFilters((c) => ({ ...c, page: c.page - 1 }))}
              aria-label="Previous page"
            >
              <LeftOutlined />
            </button>
            <button
              type="button"
              className="alq-icon-btn"
              disabled={page >= pages || loading}
              onClick={() => setFilters((c) => ({ ...c, page: c.page + 1 }))}
              aria-label="Next page"
            >
              <RightOutlined />
            </button>
          </div>
        </div>
      ) : null}

      {createPortal(
        <AnimatePresence>
          {selected ? (
            <motion.div
              className="alq-drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            >
              <motion.aside
                className="alq-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Audit entry details"
                initial={{ x: 480 }}
                animate={{ x: 0 }}
                exit={{ x: 480 }}
                transition={{ type: "spring", damping: 30, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="alq-drawer-head">
                  <span className={`alq-entry-icon alq-cat--${selected.category}`}>{getCategoryMeta(selected.category).icon}</span>
                  <div>
                    <h3>{selected.summary || selected.action}</h3>
                    <code>{selected.action}</code>
                  </div>
                  <button type="button" className="alq-icon-btn" onClick={() => setSelected(null)} aria-label="Close details">
                    <CloseOutlined />
                  </button>
                </div>

                <div className="alq-drawer-body">
                  <span className={`alq-outcome ${selected.outcome === "failure" ? "is-fail" : "is-ok"}`}>
                    {selected.outcome === "failure" ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                    {selected.outcome === "failure" ? "Failed" : "Succeeded"} · HTTP {selected.statusCode}
                  </span>

                  <dl className="alq-dl">
                    <dt>When</dt>
                    <dd>{dayjs(selected.createdAt).format("dddd, DD MMM YYYY · hh:mm:ss A")}</dd>
                    <dt>Actor</dt>
                    <dd>
                      {selected.actorName || "—"}
                      <small>{selected.actorEmail || "Unknown"}{selected.actorRole ? ` · ${prettyRole(selected.actorRole)}` : ""}</small>
                    </dd>
                    <dt>Request</dt>
                    <dd>
                      <code>{selected.method} {selected.path}</code>
                    </dd>
                    <dt>Target</dt>
                    <dd>{selected.targetType ? `${selected.targetType} · ${selected.targetId || "—"}` : "—"}</dd>
                    <dt>IP</dt>
                    <dd>{selected.ip || "—"}</dd>
                    <dt>Device</dt>
                    <dd className="alq-ua">{selected.userAgent || "—"}</dd>
                  </dl>

                  <span className="alq-drawer-label">Details</span>
                  <pre>{JSON.stringify(selected.meta || {}, null, 2)}</pre>

                  <button type="button" className="alq-btn-primary" onClick={() => copyEntry(selected)}>
                    {copied ? <CheckCircleOutlined /> : <CopyOutlined />} {copied ? "Copied" : "Copy full entry as JSON"}
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default AuditLogPage;