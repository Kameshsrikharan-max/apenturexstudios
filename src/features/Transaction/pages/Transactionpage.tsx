import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Layout, Typography, Table, Input, Button, Space, ConfigProvider, Tag, Tooltip, Popover,
  Select, DatePicker, Empty, Badge, message, Dropdown, Segmented, Popconfirm,
} from "antd";
import type { InputRef } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { MenuProps } from "antd";
import {
  SearchOutlined, ReloadOutlined, FilterOutlined, EyeOutlined, DownloadOutlined, MoreOutlined,
  WalletOutlined, CheckCircleOutlined, ClockCircleOutlined, RollbackOutlined, CalendarOutlined,
  CreditCardOutlined, MobileOutlined, BankOutlined, SwapOutlined, CloseOutlined, ExportOutlined,
  DollarCircleOutlined, TableOutlined, HistoryOutlined, CopyOutlined, FileTextOutlined,
  WarningOutlined, TrophyOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import AnimatedAmount from "../../../components/UI/AnimatedNumber";
import rootReducer from "../../../redux/rootReducer";
import {
  fetchTransactionsRequest, refundTransactionRequest, exportTransactionsRequest, resetTransactionError,
} from "../../../redux/actions/transactionActions";
import type { StoredTransaction, TransactionStatus, PaymentMethod } from "../../../redux/types/transactiontypes";
import { TRANSACTIONS_UPDATED_EVENT } from "../../../utils/transactionStore";
import { scanAndNotifyPaymentsDue } from "../../../components/UI/notificationTriggers";
import "./Transactionpage.css";
import "../../../components/UI/motion.css";

type RootState = ReturnType<typeof rootReducer>;

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/*  Types  */

type StatusFilterKey = "All" | TransactionStatus;
type SortKey = "newest" | "oldest" | "amountDesc" | "balanceDesc";
type ViewMode = "table" | "timeline";

interface TransactionRecord extends StoredTransaction {}

interface MonthBucket {
  key: string;
  label: string;
  billed: number;
  collected: number;
}

/*  Constants / helpers  */

const STATUS_OPTIONS: StatusFilterKey[] = ["All", "Paid", "Partial", "Pending", "Refunded"];
const PREFS_KEY = "tx-page-prefs-v1";

const statusIconMap: Record<StatusFilterKey, ReactNode> = {
  All: <WalletOutlined />,
  Paid: <CheckCircleOutlined />,
  Partial: <ClockCircleOutlined />,
  Pending: <ClockCircleOutlined />,
  Refunded: <RollbackOutlined />,
};

const methodIconMap: Record<PaymentMethod, ReactNode> = {
  UPI: <MobileOutlined />,
  Card: <CreditCardOutlined />,
  "Net Banking": <BankOutlined />,
  Cash: <DollarCircleOutlined />,
  "Bank Transfer": <SwapOutlined />,
};

const methodColor: Record<string, string> = {
  UPI: "#38bdf8",
  Card: "#a78bfa",
  "Net Banking": "#34d399",
  Cash: "#fbbf24",
  "Bank Transfer": "#f472b6",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amountDesc", label: "Highest amount" },
  { value: "balanceDesc", label: "Highest balance" },
];

const formatINR = (value: number) => `₹ ${value.toLocaleString("en-IN")}`;

const formatCompactINR = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
};

// Handles both "2026-09-14" and full ISO timestamps; returns null when unparsable.
const parseDate = (raw?: string): Date | null => {
  if (!raw) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDisplayDate = (raw: string): string => {
  if (!raw) return "—";
  const parsed = parseDate(raw);
  if (!parsed) return raw;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (value: string | number): string =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const rowCountDelay = (index: number) => Math.min(index, 12) * 55 + 150;

const paidPercent = (t: TransactionRecord) =>
  t.status === "Refunded" || t.totalAmount <= 0 ? 0 : Math.min(100, Math.round((t.amountPaid / t.totalAmount) * 100));

// Days past due (0 when not overdue / no due date / settled).
const daysOverdue = (t: TransactionRecord): number => {
  const due = parseDate((t as any).dueDate);
  if (!due || t.status === "Paid" || t.status === "Refunded" || t.balanceAmount <= 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
};

const downloadBlob = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const exportRowsCsv = (rows: TransactionRecord[], filename: string) => {
  const head = ["ID", "Event", "Client", "Date", "Method", "Status", "Total", "Paid", "Balance"];
  const cell = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.id, r.eventName, r.clientName, formatDisplayDate(r.date), r.method, r.status, r.totalAmount, r.amountPaid, r.balanceAmount]
      .map(cell)
      .join(",")
  );
  downloadBlob("\uFEFF" + [head.map(cell).join(","), ...lines].join("\n"), filename, "text/csv;charset=utf-8");
};

const downloadReceipt = (t: TransactionRecord) => {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Receipt ${escapeHtml(t.id)}</title>
<style>body{font-family:Georgia,serif;max-width:560px;margin:40px auto;padding:32px;border:1px solid #cbd5e1;border-radius:14px;color:#0f172a}
h1{margin:0 0 4px;font-size:24px}small{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:22px}
td{padding:10px 0;border-bottom:1px solid #e2e8f0}td:last-child{text-align:right;font-weight:700}
.tot td{border-bottom:0;font-size:18px}.badge{display:inline-block;padding:3px 12px;border:1px solid #0ea5e9;border-radius:99px;color:#0369a1;font-size:12px}
@media print{body{border:0}}</style></head><body>
<h1>Payment Receipt</h1><small>Ref: ${escapeHtml(t.id)}</small> <span class="badge">${escapeHtml(t.status)}</span>
<table><tr><td>Event</td><td>${escapeHtml(t.eventName)}</td></tr><tr><td>Client</td><td>${escapeHtml(t.clientName || "—")}</td></tr>
<tr><td>Date</td><td>${escapeHtml(formatDisplayDate(t.date))}</td></tr><tr><td>Method</td><td>${escapeHtml(t.method)}</td></tr>
<tr><td>Total</td><td>${escapeHtml(formatINR(t.totalAmount))}</td></tr><tr><td>Paid</td><td>${escapeHtml(formatINR(t.amountPaid))}</td></tr>
<tr class="tot"><td>Balance</td><td>${escapeHtml(formatINR(t.balanceAmount))}</td></tr></table>
<p><small>Generated ${escapeHtml(new Date().toLocaleString("en-IN"))}. Use your browser's Print to save as PDF.</small></p></body></html>`;
  downloadBlob(html, `receipt-${t.id}.html`, "text/html;charset=utf-8");
  message.success("Receipt downloaded");
};

/*  Small SVG visuals  */

const Donut = ({ percent }: { percent: number }) => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const r = 42;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (on ? (clamped / 100) * c : 0);
  return (
    <svg viewBox="0 0 110 110" className="tx-donut" role="img" aria-label={`Collection rate ${Math.round(clamped)} percent`}>
      <defs>
        <linearGradient id="txRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <circle cx="55" cy="55" r={r} className="ring-bg" />
      <circle cx="55" cy="55" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 55 55)" />
      <text x="55" y="53" textAnchor="middle" className="ring-num">{Math.round(clamped)}%</text>
      <text x="55" y="68" textAnchor="middle" className="ring-sub">collected</text>
    </svg>
  );
};

const MonthBars = ({ data }: { data: MonthBucket[] }) => {
  const max = Math.max(1, ...data.flatMap((d) => [d.billed, d.collected]));
  const W = 300;
  const H = 96;
  const slot = W / data.length;
  const bw = slot * 0.26;
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="tx-bars" role="img" aria-label="Billed versus collected amounts for the last six months">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1="0" x2={W} y1={H - H * g} y2={H - H * g} className="bar-grid" />
      ))}
      {data.map((d, i) => {
        const x = i * slot + slot / 2;
        const hb = (d.billed / max) * H;
        const hc = (d.collected / max) * H;
        const style = { "--d": `${i * 70}ms` } as CSSProperties;
        return (
          <g key={d.key} style={style}>
            <rect className="bar bar-billed" x={x - bw - 1.5} y={H - hb} width={bw} height={Math.max(hb, 1)} rx={3}>
              <title>{`${d.label} billed ${formatINR(d.billed)}`}</title>
            </rect>
            <rect className="bar bar-collected" x={x + 1.5} y={H - hc} width={bw} height={Math.max(hc, 1)} rx={3}>
              <title>{`${d.label} collected ${formatINR(d.collected)}`}</title>
            </rect>
            <text x={x} y={H + 13} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

/*  Modal  */

interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

const CustomModal = ({ open, onClose, width = 560, children }: CustomModalProps) => {
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

/*  TransactionPage  */

const loadPrefs = (): { view?: ViewMode; sort?: SortKey; pageSize?: number } => {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
  } catch {
    return {};
  }
};

const TransactionPage = () => {
  const dispatch = useDispatch<any>();

  const {
    list: transactions,
    loading: isLoading,
    error,
    refundLoadingId,
    exporting,
  } = useSelector((state: RootState) => state.transaction);

  const initialPrefs = useMemo(loadPrefs, []);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("All");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [viewTransaction, setViewTransaction] = useState<TransactionRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPrefs.pageSize || 10);
  const [sortKey, setSortKey] = useState<SortKey>(initialPrefs.sort || "newest");
  const [viewMode, setViewMode] = useState<ViewMode>(initialPrefs.view || "table");
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  const searchRef = useRef<InputRef>(null);

  // Persist view preferences
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ view: viewMode, sort: sortKey, pageSize }));
    } catch {
      /* storage unavailable */
    }
  }, [viewMode, sortKey, pageSize]);

  useEffect(() => {
    dispatch(fetchTransactionsRequest());
  }, [dispatch]);

  useEffect(() => {
    const handleUpdate = () => dispatch(fetchTransactionsRequest());
    window.addEventListener(TRANSACTIONS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(TRANSACTIONS_UPDATED_EVENT, handleUpdate);
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(resetTransactionError());
    }
  }, [error, dispatch]);

  // Overdue + unpaid → "paymentDue" notification (deduped internally).
  useEffect(() => {
    if (!transactions || transactions.length === 0) return;
    scanAndNotifyPaymentsDue(
      transactions.map((t) => ({
        id: t.id,
        clientName: t.clientName,
        totalAmount: t.totalAmount,
        amountPaid: t.amountPaid,
        balanceAmount: t.balanceAmount,
        status: t.status,
        dueDate: (t as any).dueDate,
      }))
    );
  }, [transactions]);

  // Keyboard shortcuts: "/" search · "r" refresh · "v" toggle view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "Escape" && typing && el === searchRef.current?.input) {
        setSearchTerm("");
        (el as HTMLInputElement).blur();
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "r") {
        dispatch(fetchTransactionsRequest());
      } else if (e.key.toLowerCase() === "v") {
        setViewMode((m) => (m === "table" ? "timeline" : "table"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  const statusCounts = useMemo<Record<string, number>>(() => {
    return STATUS_OPTIONS.reduce((acc: Record<string, number>, status) => {
      acc[status] = status === "All" ? transactions.length : transactions.filter((i) => i.status === status).length;
      return acc;
    }, {});
  }, [transactions]);

  const overdueCount = useMemo(() => transactions.filter((t) => daysOverdue(t) > 0).length, [transactions]);

  const filteredData = useMemo<TransactionRecord[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    const from = dateRange?.[0]?.startOf("day").valueOf?.();
    const to = dateRange?.[1]?.endOf("day").valueOf?.();

    const rows = transactions.filter((row) => {
      const matchesSearch =
        !term ||
        row.eventName.toLowerCase().includes(term) ||
        row.clientName.toLowerCase().includes(term) ||
        String(row.id).toLowerCase().includes(term);
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesMethod = methodFilter === "all" || row.method.toLowerCase() === methodFilter;
      const matchesOverdue = !overdueOnly || daysOverdue(row) > 0;
      let matchesDate = true;
      if (from || to) {
        const d = parseDate(row.date)?.getTime();
        matchesDate = d !== undefined && (!from || d >= from) && (!to || d <= to);
      }
      return matchesSearch && matchesStatus && matchesMethod && matchesOverdue && matchesDate;
    });

    const time = (r: TransactionRecord) => parseDate(r.date)?.getTime() ?? 0;
    const sorters: Record<SortKey, (a: TransactionRecord, b: TransactionRecord) => number> = {
      newest: (a, b) => time(b) - time(a),
      oldest: (a, b) => time(a) - time(b),
      amountDesc: (a, b) => b.totalAmount - a.totalAmount,
      balanceDesc: (a, b) => b.balanceAmount - a.balanceAmount,
    };
    return [...rows].sort(sorters[sortKey]);
  }, [transactions, searchTerm, statusFilter, methodFilter, overdueOnly, dateRange, sortKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, methodFilter, overdueOnly, dateRange, sortKey, pageSize]);

  const totals = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const successful = transactions.filter((t) => t.status === "Paid").reduce((sum, t) => sum + t.amountPaid, 0);
    const pending = transactions
      .filter((t) => t.status === "Pending" || t.status === "Partial")
      .reduce((sum, t) => sum + t.balanceAmount, 0);
    const refunded = transactions.filter((t) => t.status === "Refunded").reduce((sum, t) => sum + t.balanceAmount, 0);
    return { total, successful, pending, refunded };
  }, [transactions]);

  // Insights: collection rate, 6-month cashflow, top clients, method mix
  const insights = useMemo(() => {
    const live = transactions.filter((t) => t.status !== "Refunded");
    const billedAll = live.reduce((s, t) => s + t.totalAmount, 0);
    const collectedAll = live.reduce((s, t) => s + t.amountPaid, 0);
    const rate = billedAll > 0 ? (collectedAll / billedAll) * 100 : 0;

    const now = new Date();
    const buckets: MonthBucket[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: monthKey(d), label: d.toLocaleDateString("en-IN", { month: "short" }), billed: 0, collected: 0 };
    });
    live.forEach((t) => {
      const d = parseDate(t.date);
      const b = d && buckets.find((x) => x.key === monthKey(d));
      if (b) {
        b.billed += t.totalAmount;
        b.collected += t.amountPaid;
      }
    });

    const byClient = new Map<string, number>();
    live.forEach((t) => {
      if (t.clientName) byClient.set(t.clientName, (byClient.get(t.clientName) || 0) + t.amountPaid);
    });
    const topClients = [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    const byMethod = new Map<string, number>();
    live.forEach((t) => byMethod.set(t.method, (byMethod.get(t.method) || 0) + t.amountPaid));
    const methodTotal = [...byMethod.values()].reduce((s, v) => s + v, 0);
    const methodMix = [...byMethod.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([method, value]) => ({ method, value, share: methodTotal ? (value / methodTotal) * 100 : 0 }));

    return { rate, buckets, topClients, methodMix, outstanding: billedAll - collectedAll };
  }, [transactions]);

  const timelineGroups = useMemo(() => {
    const groups: { key: string; label: string; rows: TransactionRecord[]; collected: number; balance: number }[] = [];
    filteredData.forEach((row) => {
      const d = parseDate(row.date);
      const key = d ? monthKey(d) : "unknown";
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = {
          key,
          label: d ? d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Undated",
          rows: [],
          collected: 0,
          balance: 0,
        };
        groups.push(g);
      }
      g.rows.push(row);
      g.collected += row.amountPaid;
      g.balance += row.balanceAmount;
    });
    return groups;
  }, [filteredData]);

  const selectedRows = useMemo(() => {
    const set = new Set(selectedKeys.map(String));
    return transactions.filter((t) => set.has(String(t.id)));
  }, [selectedKeys, transactions]);

  const highlightText = (value: string | number): ReactNode => {
    if (!searchTerm.trim()) return value;
    const regex = new RegExp(`(${escapeRegExp(searchTerm.trim())})`, "gi");
    const parts = String(value).split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.trim().toLowerCase() ? (
        <mark className="search-highlight" key={`${part}-${index}`}>{part}</mark>
      ) : (
        part
      )
    );
  };

  const handleRefresh = () => dispatch(fetchTransactionsRequest());
  const handleExport = () => dispatch(exportTransactionsRequest());

  const handleRefund = (record: TransactionRecord) => {
    if (record.status === "Refunded") {
      message.info("This transaction is already refunded");
      return;
    }
    dispatch(refundTransactionRequest(record.id));
  };

  const handleBulkRefund = () => {
    const eligible = selectedRows.filter((r) => r.status !== "Refunded");
    eligible.forEach((r) => dispatch(refundTransactionRequest(r.id)));
    message.info(`Refund requested for ${eligible.length} transaction${eligible.length === 1 ? "" : "s"}`);
    setSelectedKeys([]);
  };

  const copyId = (record: TransactionRecord) => {
    navigator.clipboard
      ?.writeText(String(record.id))
      .then(() => message.success("Transaction ID copied"))
      .catch(() => message.error("Could not copy"));
  };

  const clearAllFilters = () => {
    setMethodFilter("all");
    setDateRange(null);
    setStatusFilter("All");
    setOverdueOnly(false);
    setSearchTerm("");
  };

  const activeFilterCount =
    (methodFilter !== "all" ? 1 : 0) + (dateRange ? 1 : 0) + (statusFilter !== "All" ? 1 : 0) + (overdueOnly ? 1 : 0) + (searchTerm ? 1 : 0);

  const advancedFilterPanel = (
    <div className="filter-adv-panel">
      <div className="filter-adv-title">Filter Transactions</div>
      <div className="filter-adv-grid">
        <div className="filter-adv-item">
          <label>Date Range</label>
          <RangePicker
            className="tx-range-picker"
            popupClassName="tx-range-dropdown"
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        <div className="filter-adv-item">
          <label>Payment Method</label>
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            classNames={{ popup: { root: "dark-select-dropdown" } }}
            options={[
              { value: "all", label: "All Methods" },
              { value: "upi", label: "UPI" },
              { value: "card", label: "Card" },
              { value: "net banking", label: "Net Banking" },
              { value: "cash", label: "Cash" },
              { value: "bank transfer", label: "Bank Transfer" },
            ]}
          />
        </div>
      </div>
      <div className="filter-adv-footer">
        <Button
          className="modal-cancel-btn"
          onClick={() => {
            clearAllFilters();
            setFilterOpen(false);
          }}
        >
          Clear Filters
        </Button>
        <Button type="primary" className="invite-btn-styled tx-apply-btn" onClick={() => setFilterOpen(false)}>
          Apply Filters
        </Button>
      </div>
    </div>
  );

  const renderStatusTag = (status: TransactionStatus) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`tx-status-dot tx-status-${status.toLowerCase()}`}>{status}</Tag>
    </Tooltip>
  );

  const renderOverdue = (record: TransactionRecord) => {
    const days = daysOverdue(record);
    return days > 0 ? (
      <Tag className="tx-overdue-tag">
        <WarningOutlined /> {days}d overdue
      </Tag>
    ) : null;
  };

  const renderProgress = (record: TransactionRecord) => {
    const pct = paidPercent(record);
    return (
      <div
        className={`tx-progress tx-progress-${record.status.toLowerCase()}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${pct}% paid`}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
    );
  };

  const renderRowActionsOverlay = (record: TransactionRecord) => {
    const menuItems: MenuProps["items"] = [
      { key: "copy", label: "Copy transaction ID", icon: <CopyOutlined />, onClick: () => copyId(record) },
      { key: "receipt", label: "Download receipt", icon: <FileTextOutlined />, onClick: () => downloadReceipt(record) },
      { type: "divider" },
      {
        key: "refund",
        label: record.status === "Refunded" ? "Already Refunded" : "Mark as Refunded",
        icon: <RollbackOutlined />,
        danger: record.status !== "Refunded",
        disabled: record.status === "Refunded" || refundLoadingId === record.id,
        onClick: () => handleRefund(record),
      },
    ];

    return (
      <div className="tx-row-actions-overlay">
        <Tooltip title="View transaction">
          <Button
            type="text"
            icon={<EyeOutlined />}
            aria-label={`View ${record.eventName}`}
            className="tx-action-btn view"
            onClick={(e) => {
              e.stopPropagation();
              setViewTransaction(record);
            }}
          />
        </Tooltip>
        <Tooltip title="Download receipt">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            aria-label={`Download receipt for ${record.eventName}`}
            className="tx-action-btn download"
            onClick={(e) => {
              e.stopPropagation();
              downloadReceipt(record);
            }}
          />
        </Tooltip>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
          <Tooltip title="More options">
            <Button
              type="text"
              icon={<MoreOutlined />}
              aria-label="More options"
              className="tx-action-btn more"
              loading={refundLoadingId === record.id}
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        </Dropdown>
      </div>
    );
  };

  const columns: ColumnsType<TransactionRecord> = [
    {
      title: "S.No",
      key: "sNo",
      width: 56,
      align: "center",
      render: (_, __, index) => <span className="tx-soft-cell">{(currentPage - 1) * pageSize + index + 1}</span>,
    },
    {
      title: "Event Name",
      dataIndex: "eventName",
      key: "eventName",
      width: 190,
      render: (text: string, record) => (
        <button type="button" className="tx-name-cell" onClick={() => setViewTransaction(record)}>
          <span className="tx-name-icon"><WalletOutlined /></span>
          <span>
            <strong>{highlightText(text)}</strong>
            <small>{record.method}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Client Name",
      dataIndex: "clientName",
      key: "clientName",
      width: 130,
      render: (text: string) => <span className="tx-soft-cell">{text ? highlightText(text) : "—"}</span>,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 130,
      render: (text: string) => (
        <Tag className="tx-pipeline-tag">
          <CalendarOutlined /> {formatDisplayDate(text)}
        </Tag>
      ),
    },
    {
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 110,
      align: "right",
      render: (value: number, _record, index) => (
        <span className="tx-soft-cell">
          <AnimatedAmount value={value} format={formatINR} duration={800} delay={rowCountDelay(index)} />
        </span>
      ),
    },
    {
      title: "Amount Paid",
      dataIndex: "amountPaid",
      key: "amountPaid",
      width: 120,
      align: "right",
      render: (value: number, record, index) => (
        <div className="tx-paid-stack">
          <span className="tx-cell-paid">
            <AnimatedAmount value={value} format={formatINR} duration={800} delay={rowCountDelay(index)} />
          </span>
          {renderProgress(record)}
        </div>
      ),
    },
    {
      title: "Balance",
      dataIndex: "balanceAmount",
      key: "balanceAmount",
      width: 110,
      align: "right",
      render: (value: number, record, index) =>
        value > 0 ? (
          <div className="tx-paid-stack">
            <span className="tx-cell-balance">
              <AnimatedAmount value={value} format={formatINR} duration={800} delay={rowCountDelay(index)} />
            </span>
            {renderOverdue(record)}
          </div>
        ) : (
          <span className="tx-soft-cell tx-muted">—</span>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      align: "center",
      render: (status: TransactionStatus) => renderStatusTag(status),
    },
    {
      title: "Actions",
      key: "actions",
      width: 116,
      align: "center",
      className: "tx-actions-anchor-cell",
      render: (_, record) => renderRowActionsOverlay(record),
    },
  ];

  const emptyState = (
    <Empty
      description={
        transactions.length === 0
          ? "No transactions recorded yet — payments entered in Payment Details will appear here"
          : "No transactions match your filters"
      }
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    >
      {transactions.length > 0 && activeFilterCount > 0 && (
        <Button className="modal-cancel-btn" onClick={clearAllFilters}>Reset filters</Button>
      )}
    </Empty>
  );

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#38bdf8", borderRadius: 14 } }}>
      <Layout className="dashboard-page dashboard-dark review-page transaction-visual-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell transaction-shell">
            <Header className="dashboard-navbar review-navbar transaction-navbar" />

            <Content className="dashboard-content review-content transaction-content">
              <div className="transaction-page-heading">
                <Title level={2}>Transaction Management</Title>
              </div>

              <div className="table-wrapper animated-panel transaction-panel-container">
                <div className="sr-only" aria-live="polite">{filteredData.length} transactions shown</div>

                <div className="tx-hero-strip">
                  <div>
                    <span className="hero-mini-pill">
                      <WalletOutlined /> Payment Records
                    </span>
                    <Title level={2}>Transaction Management</Title>
                    <Text>Manage all event payment transactions, balances, and payment history.</Text>
                    <div className="tx-kbd-hints" aria-hidden="true">
                      <span><kbd>/</kbd> search</span>
                      <span><kbd>R</kbd> refresh</span>
                      <span><kbd>V</kbd> switch view</span>
                    </div>
                  </div>

                  <div className="tx-summary-grid mo-stagger">
                    <div className="tx-summary-card tx-summary-total">
                      <span className="tx-summary-icon"><WalletOutlined /></span>
                      <div>
                        <small>Total Payments</small>
                        <strong><AnimatedAmount value={totals.total} format={formatINR} duration={1100} /></strong>
                      </div>
                    </div>
                    <div className="tx-summary-card tx-summary-success">
                      <span className="tx-summary-icon"><CheckCircleOutlined /></span>
                      <div>
                        <small>Successful</small>
                        <strong><AnimatedAmount value={totals.successful} format={formatINR} duration={1100} /></strong>
                      </div>
                    </div>
                    <div className="tx-summary-card tx-summary-pending">
                      <span className="tx-summary-icon"><ClockCircleOutlined /></span>
                      <div>
                        <small>Pending</small>
                        <strong><AnimatedAmount value={totals.pending} format={formatINR} duration={1100} /></strong>
                      </div>
                    </div>
                    <div className="tx-summary-card tx-summary-refund">
                      <span className="tx-summary-icon"><RollbackOutlined /></span>
                      <div>
                        <small>Refunded</small>
                        <strong><AnimatedAmount value={totals.refunded} format={formatINR} duration={1100} /></strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                <div className="tx-insights mo-stagger">
                  <section className="tx-insight-card" aria-label="Collection rate">
                    <h3>Collection Rate</h3>
                    <div className="tx-insight-donut">
                      <Donut percent={insights.rate} />
                      <div className="tx-donut-legend">
                        <small>Outstanding</small>
                        <strong>{formatINR(Math.max(0, insights.outstanding))}</strong>
                        <small>Overdue invoices</small>
                        <strong className={overdueCount > 0 ? "tx-danger-text" : ""}>{overdueCount}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="tx-insight-card tx-insight-wide" aria-label="Cashflow last six months">
                    <h3>
                      Cashflow · 6 months
                      <span className="tx-legend">
                        <i className="dot dot-billed" /> Billed <i className="dot dot-collected" /> Collected
                      </span>
                    </h3>
                    <MonthBars data={insights.buckets} />
                  </section>

                  <section className="tx-insight-card" aria-label="Top clients and payment methods">
                    <h3><TrophyOutlined /> Top Clients</h3>
                    <ol className="tx-top-clients">
                      {insights.topClients.length === 0 && <li className="tx-muted">No data yet</li>}
                      {insights.topClients.map(([name, value], i) => (
                        <li key={name}>
                          <span className="rank">{i + 1}</span>
                          <button type="button" className="tx-link-btn" onClick={() => setSearchTerm(name)} title={`Filter by ${name}`}>
                            {name}
                          </button>
                          <b>{formatCompactINR(value)}</b>
                        </li>
                      ))}
                    </ol>
                    {insights.methodMix.length > 0 && (
                      <>
                        <div className="tx-mix" role="img" aria-label="Payment method share">
                          {insights.methodMix.map((m) => (
                            <i key={m.method} style={{ width: `${m.share}%`, background: methodColor[m.method] || "#64748b" }} title={`${m.method} ${Math.round(m.share)}%`} />
                          ))}
                        </div>
                        <div className="tx-mix-legend">
                          {insights.methodMix.slice(0, 3).map((m) => (
                            <span key={m.method}>
                              <i style={{ background: methodColor[m.method] || "#64748b" }} /> {m.method} {Math.round(m.share)}%
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                </div>

                <div className="smart-filter-row mo-stagger" role="group" aria-label="Filter by status">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={statusFilter === status}
                      className={`smart-chip ${statusFilter === status ? "active" : ""}`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {statusIconMap[status]}
                      <span className="chip-label">{status}</span>
                      <b>{statusCounts[status] || 0}</b>
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={overdueOnly}
                    className={`smart-chip chip-overdue ${overdueOnly ? "active" : ""}`}
                    onClick={() => setOverdueOnly((v) => !v)}
                  >
                    <WarningOutlined />
                    <span className="chip-label">Overdue</span>
                    <b>{overdueCount}</b>
                  </button>
                </div>

                <div className="review-toolbar transaction-toolbar-inline">
                  <Space size="middle" wrap>
                    <Input
                      ref={searchRef}
                      placeholder="Search event, client or ID…  ( / )"
                      aria-label="Search transactions"
                      prefix={<SearchOutlined />}
                      className="review-search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      allowClear
                    />
                    <Popover
                      open={filterOpen}
                      onOpenChange={setFilterOpen}
                      content={advancedFilterPanel}
                      trigger="click"
                      placement="bottomLeft"
                      overlayClassName="filter-popover-overlay"
                      zIndex={3000}
                    >
                      <Tooltip title="Filter">
                        <Badge dot={methodFilter !== "all" || !!dateRange} offset={[-4, 4]}>
                          <Button type="text" icon={<FilterOutlined />} aria-label="Open filters" className="icon-btn-glass" />
                        </Badge>
                      </Tooltip>
                    </Popover>
                    <Tooltip title="Refresh">
                      <Button
                        type="text"
                        icon={<ReloadOutlined spin={isLoading} />}
                        aria-label="Refresh transactions"
                        onClick={handleRefresh}
                        className="icon-btn-glass"
                      />
                    </Tooltip>
                    <Select
                      value={sortKey}
                      onChange={setSortKey}
                      options={SORT_OPTIONS}
                      aria-label="Sort transactions"
                      className="tx-sort-select"
                      classNames={{ popup: { root: "dark-select-dropdown" } }}
                    />
                    {activeFilterCount > 0 && (
                      <Button type="link" className="tx-clear-link" onClick={clearAllFilters}>
                        Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                      </Button>
                    )}
                  </Space>

                  <Space wrap>
                    <Segmented
                      className="tx-view-toggle"
                      value={viewMode}
                      onChange={(v) => setViewMode(v as ViewMode)}
                      options={[
                        { value: "table", icon: <TableOutlined />, label: "Table" },
                        { value: "timeline", icon: <HistoryOutlined />, label: "Timeline" },
                      ]}
                    />
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          { key: "all", label: "Export all (server)", icon: <ExportOutlined />, onClick: handleExport },
                          {
                            key: "csv",
                            label: `Export filtered (${filteredData.length}) as CSV`,
                            icon: <FileTextOutlined />,
                            disabled: filteredData.length === 0,
                            onClick: () => exportRowsCsv(filteredData, "transactions-filtered.csv"),
                          },
                        ],
                      }}
                    >
                      <Button icon={<ExportOutlined />} className="tx-export-btn" loading={exporting}>
                        Export
                      </Button>
                    </Dropdown>
                  </Space>
                </div>

                {viewMode === "table" ? (
                  <div className="tx-table-holder">
                    <Table
                      columns={columns}
                      dataSource={filteredData}
                      className="user-table-custom tx-table-custom"
                      rowKey="id"
                      tableLayout="fixed"
                      loading={isLoading}
                      rowSelection={{
                        selectedRowKeys: selectedKeys,
                        onChange: setSelectedKeys,
                        columnWidth: 40,
                      }}
                      onRow={(record, index) => ({
                        className: `mo-row-enter ${daysOverdue(record) > 0 ? "tx-row-overdue" : ""}`,
                        style: { "--i": Math.min(index ?? 0, 12) } as CSSProperties,
                      })}
                      locale={{ emptyText: emptyState }}
                      pagination={{
                        current: currentPage,
                        pageSize,
                        total: filteredData.length,
                        onChange: (page, size) => {
                          setCurrentPage(page);
                          if (size !== pageSize) setPageSize(size);
                        },
                        showSizeChanger: true,
                        pageSizeOptions: [10, 20, 50],
                        hideOnSinglePage: false,
                        showTotal: (total, range) =>
                          total > 0 ? `${range[0]}–${range[1]} of ${total} transactions` : "",
                        className: "user-table-pagination",
                      }}
                    />
                  </div>
                ) : (
                  <div className="tx-timeline-holder">
                    {timelineGroups.length === 0 && <div className="tx-timeline-empty">{emptyState}</div>}
                    {timelineGroups.map((group) => (
                      <section key={group.key} className="tx-tl-group" aria-label={group.label}>
                        <header className="tx-tl-header">
                          <h3>{group.label}</h3>
                          <span>
                            <b className="tx-cell-paid">{formatINR(group.collected)}</b> collected
                            {group.balance > 0 && (
                              <> · <b className="tx-cell-balance">{formatINR(group.balance)}</b> due</>
                            )}
                          </span>
                        </header>
                        <ol className="tx-tl-list">
                          {group.rows.map((row, i) => {
                            const checked = selectedKeys.map(String).includes(String(row.id));
                            return (
                              <li
                                key={row.id}
                                className={`tx-tl-item tx-tl-${row.status.toLowerCase()} mo-row-enter`}
                                style={{ "--i": Math.min(i, 12) } as CSSProperties}
                              >
                                <span className="tx-tl-dot" aria-hidden="true">{statusIconMap[row.status]}</span>
                                <article className={`tx-tl-card ${checked ? "selected" : ""}`}>
                                  <div className="tx-tl-main">
                                    <label className="tx-tl-check">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        aria-label={`Select ${row.eventName}`}
                                        onChange={(e) =>
                                          setSelectedKeys((keys) =>
                                            e.target.checked ? [...keys, row.id] : keys.filter((k) => String(k) !== String(row.id))
                                          )
                                        }
                                      />
                                    </label>
                                    <button type="button" className="tx-name-cell" onClick={() => setViewTransaction(row)}>
                                      <span className="tx-name-icon">{methodIconMap[row.method] || <WalletOutlined />}</span>
                                      <span>
                                        <strong>{highlightText(row.eventName)}</strong>
                                        <small>{row.clientName ? highlightText(row.clientName) : "—"} · {row.method}</small>
                                      </span>
                                    </button>
                                    <Tag className="tx-pipeline-tag"><CalendarOutlined /> {formatDisplayDate(row.date)}</Tag>
                                  </div>
                                  <div className="tx-tl-side">
                                    <div className="tx-tl-amounts">
                                      <span className="tx-soft-cell">{formatINR(row.totalAmount)}</span>
                                      {renderProgress(row)}
                                      <small>{paidPercent(row)}% paid{row.balanceAmount > 0 && ` · ${formatINR(row.balanceAmount)} left`}</small>
                                    </div>
                                    {renderOverdue(row)}
                                    {renderStatusTag(row.status)}
                                    {renderRowActionsOverlay(row)}
                                  </div>
                                </article>
                              </li>
                            );
                          })}
                        </ol>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </Content>
          </Layout>
        </div>

        {/* Bulk action bar */}
        {selectedRows.length > 0 && (
          <div className="tx-bulk-bar" role="region" aria-label="Bulk actions">
            <span className="tx-bulk-count">
              <b>{selectedRows.length}</b> selected
              <small>
                {formatINR(selectedRows.reduce((s, r) => s + r.balanceAmount, 0))} balance
              </small>
            </span>
            <Button
              icon={<FileTextOutlined />}
              className="tx-export-btn"
              onClick={() => exportRowsCsv(selectedRows, "transactions-selected.csv")}
            >
              Export CSV
            </Button>
            <Popconfirm
              title={`Mark ${selectedRows.filter((r) => r.status !== "Refunded").length} as refunded?`}
              okText="Refund"
              onConfirm={handleBulkRefund}
              disabled={selectedRows.every((r) => r.status === "Refunded")}
            >
              <Button
                icon={<RollbackOutlined />}
                className="tx-bulk-danger"
                disabled={selectedRows.every((r) => r.status === "Refunded")}
              >
                Refund
              </Button>
            </Popconfirm>
            <Button type="text" className="tx-bulk-clear" onClick={() => setSelectedKeys([])} aria-label="Clear selection" icon={<CloseOutlined />} />
          </div>
        )}

        <CustomModal open={!!viewTransaction} onClose={() => setViewTransaction(null)} width={520}>
          {viewTransaction && (
            <div className="modal-shell tx-view-modal">
              <div className="modal-title-row">
                <span className="tx-modal-icon"><WalletOutlined /></span>
                <Title level={3}>{viewTransaction.eventName}</Title>
              </div>

              <div className="tx-view-progress">
                <div className="tx-view-progress-head">
                  <span>{paidPercent(viewTransaction)}% paid</span>
                  {renderOverdue(viewTransaction)}
                </div>
                {renderProgress(viewTransaction)}
              </div>

              <div className="tx-view-grid mo-stagger">
                <div className="tx-view-item">
                  <small>Client</small>
                  <strong>{viewTransaction.clientName || "—"}</strong>
                </div>
                <div className="tx-view-item">
                  <small>Date</small>
                  <strong>{formatDisplayDate(viewTransaction.date)}</strong>
                </div>
                <div className="tx-view-item">
                  <small>Payment Method</small>
                  <strong>{methodIconMap[viewTransaction.method]} {viewTransaction.method}</strong>
                </div>
                <div className="tx-view-item">
                  <small>Status</small>
                  <strong>{renderStatusTag(viewTransaction.status)}</strong>
                </div>
                <div className="tx-view-item">
                  <small>Total Amount</small>
                  <strong><AnimatedAmount value={viewTransaction.totalAmount} format={formatINR} duration={800} /></strong>
                </div>
                <div className="tx-view-item">
                  <small>Amount Paid</small>
                  <strong className="tx-cell-paid">
                    <AnimatedAmount value={viewTransaction.amountPaid} format={formatINR} duration={800} delay={80} />
                  </strong>
                </div>
                <div className="tx-view-item tx-view-item-full">
                  <small>Balance Amount</small>
                  <strong className="tx-cell-balance">
                    <AnimatedAmount value={viewTransaction.balanceAmount} format={formatINR} duration={800} delay={160} />
                  </strong>
                </div>
                <div className="tx-view-item tx-view-item-full">
                  <small>Transaction ID</small>
                  <strong className="tx-id-row">
                    <code>{String(viewTransaction.id)}</code>
                    <Button type="text" size="small" icon={<CopyOutlined />} aria-label="Copy transaction ID" className="tx-action-btn" onClick={() => copyId(viewTransaction)} />
                  </strong>
                </div>
              </div>

              <div className="modal-action-row">
                <Button className="modal-cancel-btn" onClick={() => setViewTransaction(null)}>Close</Button>
                {viewTransaction.status !== "Refunded" && (
                  <Popconfirm
                    title="Mark this transaction as refunded?"
                    okText="Refund"
                    onConfirm={() => {
                      handleRefund(viewTransaction);
                      setViewTransaction(null);
                    }}
                  >
                    <Button icon={<RollbackOutlined />} className="tx-bulk-danger">Refund</Button>
                  </Popconfirm>
                )}
                <Tooltip title="Download receipt">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    aria-label="Download receipt"
                    className="invite-btn-styled"
                    onClick={() => downloadReceipt(viewTransaction)}
                  />
                </Tooltip>
              </div>
            </div>
          )}
        </CustomModal>
      </Layout>
    </ConfigProvider>
  );
};

export default TransactionPage;