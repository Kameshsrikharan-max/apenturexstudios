import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  ConfigProvider,
  Drawer,
  Empty,
  Input,
  Layout,
  message,
  Popover,
  Select,
  Slider,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AppstoreOutlined,
  BarsOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FilterOutlined,
  HistoryOutlined,
  IdcardOutlined,
  PieChartOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  SwapOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./ReviewPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const statusIconMap = {
  Pending: <ClockCircleOutlined />,
  Approved: <CheckCircleOutlined />,
  Rejected: <CloseCircleOutlined />,
};

const fallbackImage =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80";

interface ReferralRecord {
  key: string;
  submitted: string;
  applicant: string;
  location: string;
  avatar: string;
  status: "Pending" | "Approved" | "Rejected";
  score: number;
  role: string;
}

interface HistoryChange {
  key: string;
  from: ReferralRecord["status"];
  to: ReferralRecord["status"];
}

interface HistoryEntry {
  id: string;
  ts: number;
  type: "single" | "bulk";
  applicant: string;
  changes: HistoryChange[];
  undone?: boolean;
}

interface SnackbarState {
  id: string;
  message: string;
  historyId: string;
}

interface PaletteAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  run: () => void;
}

const statusMetaMap: Record<ReferralRecord["status"], { color: string; glow: string; label: string }> = {
  Approved: { color: "#22c55e", glow: "rgba(34,197,94,0.4)", label: "Approved" },
  Rejected: { color: "#ef4444", glow: "rgba(239,68,68,0.4)", label: "Rejected" },
  Pending: { color: "#f59e0b", glow: "rgba(245,158,11,0.4)", label: "Pending" },
};

const scoreColor = (score: number) =>
  score >= 80 ? "#22c55e" : score >= 60 ? "#38bdf8" : "#ef4444";

const timeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

const isNew = (dateStr: string) => {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return days >= 0 && days < 3;
};

const exportCSV = (data: ReferralRecord[], filename: string) => {
  const headers = ["Name", "Role", "City", "Status", "Score", "Submitted"];
  const rows = data.map((r) => [r.applicant, r.role, r.location, r.status, String(r.score), r.submitted]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ScoreRing = ({ score }: { score: number }) => (
  <div
    className="score-ring"
    style={{ "--p": score, "--c": scoreColor(score) } as React.CSSProperties}
  >
    <span>{score}</span>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  ReviewProfileOverlay                                                       */
/* -------------------------------------------------------------------------- */

interface ReviewProfileOverlayProps {
  referral: ReferralRecord;
  onClose: () => void;
  onStatusChange: (key: string, status: "Approved" | "Rejected") => void;
  onCompareToggle: (key: string) => void;
  isComparing: boolean;
}

const ReviewProfileOverlay = ({
  referral,
  onClose,
  onStatusChange,
  onCompareToggle,
  isComparing,
}: ReviewProfileOverlayProps) => {
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const statusMeta = statusMetaMap[referral.status] || {
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.3)",
    label: referral.status,
  };

  const infoItems = [
    { icon: <EnvironmentOutlined />, label: "City", value: referral.location, accent: "#a78bfa" },
    { icon: <CalendarOutlined />, label: "Submitted", value: timeAgo(referral.submitted), accent: "#fb923c" },
    { icon: <IdcardOutlined />, label: "Role", value: referral.role, accent: "#f59e0b" },
  ];

  return (
    <div className="rvo-root">
      <div className="rvo-bg-blur">
        <img
          src={referral.avatar || fallbackImage}
          alt=""
          onError={(e) => {
            e.currentTarget.src = fallbackImage;
          }}
        />
      </div>
      <div className="rvo-bg-noise" />
      <div className="rvo-bg-vignette" />

      <div className="rvo-particles" aria-hidden="true">
        {[...Array(22)].map((_, i) => (
          <span
            key={i}
            className="rvo-particle"
            style={
              {
                "--x": `${Math.random() * 100}%`,
                "--y": `${Math.random() * 100}%`,
                "--d": `${4 + Math.random() * 10}s`,
                "--s": `${2 + Math.random() * 5}px`,
                "--o": `${0.15 + Math.random() * 0.45}`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="rvo-orbital-bg" aria-hidden="true">
        <div className="rvo-orb rvo-orb-1" />
        <div className="rvo-orb rvo-orb-2" />
        <div className="rvo-orb rvo-orb-3" />
      </div>

      <button className="rvo-x" onClick={onClose} aria-label="Close">
        <CloseOutlined />
      </button>

      <div className="rvo-panel">
        <div className="rvo-card">
          <div className="rvo-profile-visual">
            <div className="rvo-avatar-glow" style={{ "--gcolor": statusMeta.glow } as React.CSSProperties} />

            <div className="rvo-avatar-shell">
              <img
                className={`rvo-profile-img ${imgLoaded ? "loaded" : ""}`}
                src={referral.avatar}
                alt={referral.applicant}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => {
                  e.currentTarget.src = fallbackImage;
                  setImgLoaded(true);
                }}
              />
              <div className="rvo-ring rvo-ring-1" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
              <div className="rvo-ring rvo-ring-2" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
              <div className="rvo-ring rvo-ring-3" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
            </div>

            <h1 className="rvo-name">{referral.applicant}</h1>
            <p className="rvo-role-label">{referral.role}</p>

            <div className="rvo-badge-row">
              <Tooltip title={`Status: ${statusMeta.label}`}>
                <span
                  className="rvo-status-badge"
                  style={{ "--bc": statusMeta.color, "--bg": statusMeta.glow } as React.CSSProperties}
                >
                  {statusIconMap[referral.status]}
                  {statusMeta.label}
                </span>
              </Tooltip>
              <span className="rvo-score-badge" style={{ "--sc": scoreColor(referral.score) } as React.CSSProperties}>
                <StarFilled /> {referral.score} match
              </span>
            </div>
          </div>

          <div className="rvo-info-grid">
            {infoItems.map(({ icon, label, value, accent }) => (
              <div key={label} className="rvo-info-card" style={{ "--acc": accent } as React.CSSProperties}>
                <div className="rvo-info-icon">{icon}</div>
                <div className="rvo-info-text">
                  <small>{label}</small>
                  <strong title={String(value)}>{value}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="rvo-action-row">
            <Button
              className={`rvo-compare-btn ${isComparing ? "active" : ""}`}
              icon={<SwapOutlined />}
              onClick={() => onCompareToggle(referral.key)}
            >
              {isComparing ? "Comparing" : "Compare"}
            </Button>
          </div>

          {referral.status === "Pending" && (
            <div className="rvo-action-row">
              <Button
                className="rvo-reject-btn"
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  onStatusChange(referral.key, "Rejected");
                  onClose();
                }}
              >
                Reject
              </Button>
              <Button
                type="primary"
                className="rvo-approve-btn"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  onStatusChange(referral.key, "Approved");
                  onClose();
                }}
              >
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  ReviewPage                                                                 */
/* -------------------------------------------------------------------------- */

const ReviewPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [viewMode, setViewMode] = useState("table");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralRecord | null>(null);
  const [activeRowKey, setActiveRowKey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [showInsights, setShowInsights] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteActiveIndex, setPaletteActiveIndex] = useState(0);

  const searchInputRef = useRef<any>(null);
  const PAGE_SIZE = 6;

  const [referralsData, setReferralsData] = useState<ReferralRecord[]>([
    { key: "1", submitted: "2026-05-02", applicant: "Rajesh", location: "Chennai", avatar: "https://randomuser.me/api/portraits/men/32.jpg", status: "Pending", score: 78, role: "Full Stack" },
    { key: "2", submitted: "2026-05-01", applicant: "Priya", location: "Bangalore", avatar: "https://randomuser.me/api/portraits/women/44.jpg", status: "Approved", score: 92, role: "UI/UX" },
    { key: "3", submitted: "2026-04-30", applicant: "Arjun", location: "Hyderabad", avatar: "https://randomuser.me/api/portraits/men/45.jpg", status: "Rejected", score: 45, role: "Data" },
  ]);

  /* ---------------------------- derived data ---------------------------- */

  const filteredData = useMemo(() => {
    return referralsData.filter((item) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        item.applicant.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.role.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesScore = item.score >= scoreRange[0] && item.score <= scoreRange[1];
      return matchesSearch && matchesStatus && matchesScore;
    });
  }, [referralsData, searchTerm, statusFilter, scoreRange]);

  const pendingCount = referralsData.filter((item) => item.status === "Pending").length;
  const approvedCount = referralsData.filter((item) => item.status === "Approved").length;
  const rejectedCount = referralsData.filter((item) => item.status === "Rejected").length;
  const topCandidate = useMemo(
    () => (referralsData.length ? referralsData.reduce((a, b) => (b.score > a.score ? b : a)) : null),
    [referralsData]
  );

  const donutSegments = useMemo(() => {
    const total = referralsData.length;
    const R = 40;
    const C = 2 * Math.PI * R;
    const items = [
      { label: "Approved", value: approvedCount, color: "#22c55e" },
      { label: "Pending", value: pendingCount, color: "#f59e0b" },
      { label: "Rejected", value: rejectedCount, color: "#ef4444" },
    ];
    let cum = 0;
    return items.map((it) => {
      const pct = total ? it.value / total : 0;
      const dash = pct * C;
      const seg = { ...it, dash, offset: cum, circumference: C };
      cum += dash;
      return seg;
    });
  }, [referralsData, approvedCount, pendingCount, rejectedCount]);

  const approvalRatePct = referralsData.length ? Math.round((approvedCount / referralsData.length) * 100) : 0;

  /* ------------------------------- history ------------------------------- */

  const pushHistory = (changes: HistoryChange[], applicantLabel: string, type: "single" | "bulk") => {
    const id = `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setHistory((prev) => [{ id, ts: Date.now(), type, applicant: applicantLabel, changes }, ...prev].slice(0, 50));
    return id;
  };

  const showSnackbar = (msg: string, historyId: string) => {
    setSnackbar({ id: `s_${Date.now()}`, message: msg, historyId });
  };

  useEffect(() => {
    if (!snackbar) return;
    const t = setTimeout(() => setSnackbar(null), 5000);
    return () => clearTimeout(t);
  }, [snackbar]);

  const handleUndo = (historyId: string) => {
    const entry = history.find((h) => h.id === historyId);
    if (!entry || entry.undone) return;
    setReferralsData((prev) =>
      prev.map((r) => {
        const change = entry.changes.find((c) => c.key === r.key);
        return change ? { ...r, status: change.from } : r;
      })
    );
    setHistory((prev) => prev.map((h) => (h.id === historyId ? { ...h, undone: true } : h)));
    setSnackbar(null);
    message.info("Reverted");
  };

  /* --------------------------- status handlers --------------------------- */

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      message.success("Updated");
    }, 900);
  };

  const handleStatusChange = (key: string, status: "Approved" | "Rejected") => {
    const record = referralsData.find((r) => r.key === key);
    if (!record) return;
    const from = record.status;
    setReferralsData((prev) => prev.map((item) => (item.key === key ? { ...item, status } : item)));
    setSelectedReferral((prev) => (prev && prev.key === key ? { ...prev, status } : prev));
    const id = pushHistory([{ key, from, to: status }], record.applicant, "single");
    showSnackbar(`${status} ${record.applicant}`, id);
  };

  const handleBulkStatusChange = (keys: React.Key[], status: "Approved" | "Rejected") => {
    const changes: HistoryChange[] = [];
    keys.forEach((k) => {
      const r = referralsData.find((x) => x.key === k);
      if (r && r.status !== status) changes.push({ key: String(k), from: r.status, to: status });
    });
    if (changes.length === 0) return;
    setReferralsData((prev) =>
      prev.map((r) => (changes.some((c) => c.key === r.key) ? { ...r, status } : r))
    );
    const id = pushHistory(changes, `${changes.length} candidates`, "bulk");
    showSnackbar(`${status} ${changes.length} candidates`, id);
    setSelectedRowKeys([]);
  };

  const toggleCompare = (key: string) => {
    setCompareKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length < 2) return [...prev, key];
      return [prev[1], key];
    });
  };

  const getStatusClass = (status: string) => {
    if (status === "Approved") return "approved";
    if (status === "Rejected") return "rejected";
    return "pending";
  };

  /* -------------------------- command palette -------------------------- */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        return;
      }
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      {
        id: "approve-pending",
        label: "Approve all pending",
        icon: <CheckCircleOutlined />,
        run: () => {
          handleBulkStatusChange(
            referralsData.filter((r) => r.status === "Pending").map((r) => r.key),
            "Approved"
          );
          setPaletteOpen(false);
        },
      },
      {
        id: "export-all",
        label: "Export current view as CSV",
        icon: <DownloadOutlined />,
        run: () => {
          exportCSV(filteredData, "referrals.csv");
          setPaletteOpen(false);
        },
      },
      {
        id: "filter-pending",
        label: "Filter: Pending only",
        icon: <FilterOutlined />,
        run: () => {
          setStatusFilter("pending");
          setPaletteOpen(false);
        },
      },
      {
        id: "filter-approved",
        label: "Filter: Approved only",
        icon: <FilterOutlined />,
        run: () => {
          setStatusFilter("approved");
          setPaletteOpen(false);
        },
      },
      {
        id: "filter-rejected",
        label: "Filter: Rejected only",
        icon: <FilterOutlined />,
        run: () => {
          setStatusFilter("rejected");
          setPaletteOpen(false);
        },
      },
      {
        id: "clear-filters",
        label: "Clear all filters",
        icon: <ReloadOutlined />,
        run: () => {
          setStatusFilter("all");
          setSearchTerm("");
          setScoreRange([0, 100]);
          setPaletteOpen(false);
        },
      },
      {
        id: "open-activity",
        label: "Open activity log",
        icon: <HistoryOutlined />,
        run: () => {
          setActivityOpen(true);
          setPaletteOpen(false);
        },
      },
      {
        id: "toggle-view",
        label: viewMode === "table" ? "Switch to card view" : "Switch to table view",
        icon: <AppstoreOutlined />,
        run: () => {
          setViewMode((v) => (v === "table" ? "card" : "table"));
          setPaletteOpen(false);
        },
      },
      {
        id: "toggle-insights",
        label: showInsights ? "Hide insights panel" : "Show insights panel",
        icon: <PieChartOutlined />,
        run: () => {
          setShowInsights((v) => !v);
          setPaletteOpen(false);
        },
      },
    ],
    [referralsData, filteredData, viewMode, showInsights]
  );

  const candidateMatches = useMemo(() => {
    if (!paletteQuery.trim()) return [];
    const q = paletteQuery.toLowerCase();
    return referralsData.filter((r) => r.applicant.toLowerCase().includes(q)).slice(0, 4);
  }, [paletteQuery, referralsData]);

  const combinedPaletteList: PaletteAction[] = useMemo(() => {
    const candidateActions: PaletteAction[] = candidateMatches.map((c) => ({
      id: `cand-${c.key}`,
      label: `Open profile — ${c.applicant}`,
      icon: <EyeOutlined />,
      run: () => {
        setSelectedReferral(c);
        setPaletteOpen(false);
      },
    }));
    const filteredActions = paletteQuery.trim()
      ? paletteActions.filter((a) => a.label.toLowerCase().includes(paletteQuery.toLowerCase()))
      : paletteActions;
    return [...candidateActions, ...filteredActions];
  }, [candidateMatches, paletteActions, paletteQuery]);

  useEffect(() => {
    setPaletteActiveIndex(0);
  }, [paletteQuery, paletteOpen]);

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPaletteActiveIndex((i) => Math.min(i + 1, combinedPaletteList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPaletteActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      combinedPaletteList[paletteActiveIndex]?.run?.();
    } else if (e.key === "Escape") {
      setPaletteOpen(false);
    }
  };

  /* --------------------------------- table -------------------------------- */

  const renderStatusTag = (status: ReferralRecord["status"]) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`status-dot status-${getStatusClass(status)} icon-only`}>{statusIconMap[status]}</Tag>
    </Tooltip>
  );

  const renderRowActionsOverlay = (record: ReferralRecord) => (
    <div className="review-row-actions-overlay">
      <Tooltip title="View">
        <Button
          type="text"
          icon={<EyeOutlined />}
          className="review-action-btn view"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReferral(record);
          }}
        />
      </Tooltip>

      <Tooltip title={compareKeys.includes(record.key) ? "Remove from compare" : "Add to compare"}>
        <Button
          type="text"
          icon={<SwapOutlined />}
          className={`review-action-btn compare ${compareKeys.includes(record.key) ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleCompare(record.key);
          }}
        />
      </Tooltip>

      {record.status === "Pending" && (
        <>
          <Tooltip title="Approve">
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              className="review-action-btn approve"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(record.key, "Approved");
              }}
            />
          </Tooltip>

          <Tooltip title="Reject">
            <Button
              type="text"
              icon={<CloseCircleOutlined />}
              className="review-action-btn reject"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(record.key, "Rejected");
              }}
            />
          </Tooltip>
        </>
      )}
    </div>
  );

  const columns: ColumnsType<ReferralRecord> = [
    {
      title: "Name",
      dataIndex: "applicant",
      key: "applicant",
      width: 240,
      render: (_, record) => (
        <button type="button" className="review-name-cell" onClick={() => setSelectedReferral(record)}>
          <Avatar src={record.avatar} className="review-name-avatar" />
          <span>
            <strong>
              {record.applicant}
              {isNew(record.submitted) && <Tag className="new-tag">NEW</Tag>}
            </strong>
            <small>{record.role}</small>
          </span>
        </button>
      ),
    },
    {
      title: "City",
      dataIndex: "location",
      key: "location",
      width: 160,
      render: (location) => <span className="review-soft-cell">{location}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      align: "center",
      render: renderStatusTag,
    },
    {
      title: "Date",
      dataIndex: "submitted",
      key: "submitted",
      width: 170,
      sorter: (a, b) => new Date(a.submitted).getTime() - new Date(b.submitted).getTime(),
      onCell: () => ({ className: "review-actions-anchor-cell" }),
      render: (date, record) => (
        <>
          <Tooltip title={timeAgo(date)}>
            <Tag className="review-date-tag">
              <CalendarOutlined /> {date}
            </Tag>
          </Tooltip>
          {renderRowActionsOverlay(record)}
        </>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    columnWidth: 40,
  };

  const compareRecords = compareKeys
    .map((k) => referralsData.find((r) => r.key === k))
    .filter(Boolean) as ReferralRecord[];
  const compareMaxScore = compareRecords.length ? Math.max(...compareRecords.map((r) => r.score)) : 0;

  const scoreFilterActive = scoreRange[0] > 0 || scoreRange[1] < 100;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#38bdf8",
          borderRadius: 14,
          colorText: "#f8fafc",
          colorTextSecondary: "#94a3b8",
        },
      }}
    >
      <Layout className="dashboard-page dashboard-dark review-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell review-shell">
            <Header className="dashboard-navbar review-navbar">
              <div className="dashboard-brand">
                <Title level={3} className="dashboard-title review-title">
                  Review
                </Title>
              </div>
            </Header>

            <Content className="dashboard-content review-content">
              <div className="review-page-scroll">
                <div className="review-page-inner">
                  <div className="review-hero">
                    <div>
                      <Text className="hero-kicker">Live</Text>
                      <Title level={1}>Reviews</Title>
                    </div>
                    <Tooltip title="Open command palette">
                      <button className="cmdk-hint" onClick={() => setPaletteOpen(true)}>
                        <ThunderboltOutlined /> <span>⌘K</span>
                      </button>
                    </Tooltip>
                  </div>

                  <div className="stats-row">
                    <Card className="review-metric-card">
                      <div className="metric-icon">
                        <UsergroupAddOutlined />
                      </div>
                      <div>
                        <h3>{referralsData.length}</h3>
                        <p>Total</p>
                      </div>
                    </Card>

                    <Card className="review-metric-card">
                      <div className="metric-icon icon-pending">
                        <ClockCircleOutlined />
                      </div>
                      <div>
                        <h3>{pendingCount}</h3>
                        <p>Pending</p>
                      </div>
                    </Card>

                    <Card className="review-metric-card">
                      <div className="metric-icon icon-approved">
                        <CheckCircleOutlined />
                      </div>
                      <div>
                        <h3>{approvedCount}</h3>
                        <p>Approved</p>
                      </div>
                    </Card>

                    <Card className="review-metric-card">
                      <div className="metric-icon icon-rejected">
                        <CloseCircleOutlined />
                      </div>
                      <div>
                        <h3>{rejectedCount}</h3>
                        <p>Rejected</p>
                      </div>
                    </Card>
                  </div>

                  {showInsights && (
                    <div className="insights-row">
                      <Card className="insight-card donut-card">
                        <h4>Status Breakdown</h4>
                        <div className="donut-wrap">
                          <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
                            {donutSegments.map(
                              (s) =>
                                s.dash > 0 && (
                                  <circle
                                    key={s.label}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth="14"
                                    strokeDasharray={`${s.dash} ${s.circumference - s.dash}`}
                                    strokeDashoffset={-s.offset}
                                    strokeLinecap="round"
                                    transform="rotate(-90 50 50)"
                                    className="donut-seg"
                                  />
                                )
                            )}
                          </svg>
                          <div className="donut-center">
                            <strong>{approvalRatePct}%</strong>
                            <span>Approved</span>
                          </div>
                        </div>
                        <div className="donut-legend">
                          {donutSegments.map((s) => (
                            <div key={s.label} className="legend-item">
                              <span className="legend-dot" style={{ background: s.color }} />
                              {s.label} · {s.value}
                            </div>
                          ))}
                        </div>
                      </Card>

                      {topCandidate && (
                        <Card className="insight-card spotlight-card" onClick={() => setSelectedReferral(topCandidate)}>
                          <h4>
                            <StarFilled /> Top Match
                          </h4>
                          <div className="spotlight-body">
                            <Avatar src={topCandidate.avatar} size={48} className="avatar-ring" />
                            <div>
                              <strong>{topCandidate.applicant}</strong>
                              <p>{topCandidate.role}</p>
                            </div>
                            <ScoreRing score={topCandidate.score} />
                          </div>
                        </Card>
                      )}
                    </div>
                  )}

                  <div className="review-toolbar">
                    <Space size="middle" wrap>
                      <Input
                        ref={searchInputRef}
                        placeholder="Search... (press /)"
                        prefix={<SearchOutlined />}
                        className="dashboard-search review-search"
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          setCurrentPage(1);
                        }}
                        allowClear
                      />

                      <Select
                        value={statusFilter}
                        className="status-select"
                        onChange={(value) => {
                          setStatusFilter(value);
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: "all", label: "All" },
                          { value: "pending", label: "Pending" },
                          { value: "approved", label: "Approved" },
                          { value: "rejected", label: "Rejected" },
                        ]}
                      />

                      <Popover
                        trigger="click"
                        placement="bottomLeft"
                        content={
                          <div className="score-filter-pop">
                            <Slider
                              range
                              value={scoreRange}
                              onChange={(v) => setScoreRange(v as [number, number])}
                              onChangeComplete={() => setCurrentPage(1)}
                            />
                            <div className="score-filter-labels">
                              <span>{scoreRange[0]}</span>
                              <span>{scoreRange[1]}</span>
                            </div>
                          </div>
                        }
                      >
                        <Tooltip title="Filter by score">
                          <Button
                            icon={<FilterOutlined />}
                            className={`icon-action ${scoreFilterActive ? "filter-active" : ""}`}
                          />
                        </Tooltip>
                      </Popover>

                      <Tooltip title="Refresh">
                        <Button
                          icon={<ReloadOutlined spin={isLoading} />}
                          onClick={handleRefresh}
                          className="refresh-btn icon-action"
                        />
                      </Tooltip>

                      <Tooltip title={showInsights ? "Hide insights" : "Show insights"}>
                        <Button
                          icon={<PieChartOutlined />}
                          onClick={() => setShowInsights((v) => !v)}
                          className={`icon-action ${showInsights ? "filter-active" : ""}`}
                        />
                      </Tooltip>

                      <Tooltip title="Activity log">
                        <Button icon={<HistoryOutlined />} onClick={() => setActivityOpen(true)} className="icon-action" />
                      </Tooltip>

                      <Tooltip title="Export current view">
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => exportCSV(filteredData, "referrals.csv")}
                          className="icon-action"
                        />
                      </Tooltip>
                    </Space>

                    <div className="view-toggle">
                      <Tooltip title="Table">
                        <Button
                          type={viewMode === "table" ? "primary" : "default"}
                          icon={<BarsOutlined />}
                          onClick={() => setViewMode("table")}
                        />
                      </Tooltip>

                      <Tooltip title="Cards">
                        <Button
                          type={viewMode === "card" ? "primary" : "default"}
                          icon={<AppstoreOutlined />}
                          onClick={() => setViewMode("card")}
                        />
                      </Tooltip>
                    </div>
                  </div>

                  {selectedRowKeys.length > 0 && (
                    <div className="bulk-toolbar">
                      <span className="bulk-count">{selectedRowKeys.length} selected</span>
                      <Button
                        size="small"
                        icon={<CheckCircleOutlined />}
                        className="bulk-approve"
                        onClick={() => handleBulkStatusChange(selectedRowKeys, "Approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseCircleOutlined />}
                        className="bulk-reject"
                        onClick={() => handleBulkStatusChange(selectedRowKeys, "Rejected")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() =>
                          exportCSV(
                            referralsData.filter((r) => selectedRowKeys.includes(r.key)),
                            "selected-referrals.csv"
                          )
                        }
                      >
                        Export
                      </Button>
                      <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])} />
                    </div>
                  )}

                  {filteredData.length === 0 ? (
                    <div className="empty-state">
                      <Empty description={false} />
                    </div>
                  ) : viewMode === "table" ? (
                    <div className="table-wrapper animated-panel">
                      <Table
                        columns={columns}
                        dataSource={filteredData}
                        rowKey="key"
                        tableLayout="fixed"
                        className="review-table-custom"
                        rowSelection={rowSelection}
                        rowClassName={(record) => (activeRowKey === record.key ? "review-row-active" : "")}
                        onRow={(record) => ({
                          onMouseEnter: () => setActiveRowKey(record.key),
                          onMouseLeave: () =>
                            setActiveRowKey((current) => (current === record.key ? null : current)),
                          onTouchStart: () =>
                            setActiveRowKey((current) => (current === record.key ? null : record.key)),
                        })}
                        locale={{ emptyText: <Empty description="No matching referrals" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                        pagination={{
                          current: currentPage,
                          pageSize: PAGE_SIZE,
                          total: filteredData.length,
                          onChange: (page) => setCurrentPage(page),
                          showSizeChanger: false,
                          hideOnSinglePage: true,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="card-grid">
                      {filteredData.map((item, index) => (
                        <Card
                          key={item.key}
                          className={`talent-card talent-card-${getStatusClass(item.status)}`}
                          hoverable
                          style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}
                        >
                          <div className="talent-card-shine" />

                          <div className="talent-top">
                            <Avatar src={item.avatar} size={58} className="avatar-ring" />
                            <ScoreRing score={item.score} />
                          </div>

                          <h4>
                            {item.applicant}
                            {isNew(item.submitted) && <Tag className="new-tag">NEW</Tag>}
                          </h4>
                          <p className="role-text">{item.role}</p>

                          <span className={`status-pill ${getStatusClass(item.status)}`}>
                            <span className="status-dot-mark" />
                            {item.status}
                          </span>

                          <div className="card-meta">
                            <span>{item.location}</span>
                            <Tooltip title={item.submitted}>
                              <span>{timeAgo(item.submitted)}</span>
                            </Tooltip>
                          </div>

                          <div className="card-actions">
                            <Tooltip title="View">
                              <Button
                                icon={<EyeOutlined />}
                                className="action-btn icon-action"
                                onClick={() => setSelectedReferral(item)}
                              />
                            </Tooltip>

                            <Tooltip title="Compare">
                              <Button
                                icon={<SwapOutlined />}
                                className={`action-btn icon-action ${compareKeys.includes(item.key) ? "filter-active" : ""}`}
                                onClick={() => toggleCompare(item.key)}
                              />
                            </Tooltip>

                            {item.status === "Pending" && (
                              <>
                                <Tooltip title="Approve">
                                  <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    className="approve-btn icon-action"
                                    onClick={() => handleStatusChange(item.key, "Approved")}
                                  />
                                </Tooltip>

                                <Tooltip title="Reject">
                                  <Button
                                    danger
                                    icon={<CloseCircleOutlined />}
                                    className="reject-btn icon-action"
                                    onClick={() => handleStatusChange(item.key, "Rejected")}
                                  />
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Content>
          </Layout>
        </div>

        {selectedReferral && (
          <ReviewProfileOverlay
            referral={selectedReferral}
            onClose={() => setSelectedReferral(null)}
            onStatusChange={handleStatusChange}
            onCompareToggle={toggleCompare}
            isComparing={compareKeys.includes(selectedReferral.key)}
          />
        )}

        {compareKeys.length > 0 && (
          <div className="compare-bar">
            <div className="compare-bar-avatars">
              {compareRecords.map((r) => (
                <Avatar key={r.key} src={r.avatar} size={30} className="compare-avatar" />
              ))}
            </div>
            <span className="compare-bar-label">{compareKeys.length} selected to compare</span>
            <Button size="small" type="primary" disabled={compareKeys.length < 2} onClick={() => setCompareOpen(true)}>
              Compare
            </Button>
            <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setCompareKeys([])} />
          </div>
        )}

        <Drawer
          title="Activity Log"
          open={activityOpen}
          onClose={() => setActivityOpen(false)}
          className="review-drawer"
          width={380}
        >
          {history.length === 0 ? (
            <Empty description="No activity yet" />
          ) : (
            <div className="activity-list">
              {history.map((h) => (
                <div key={h.id} className={`activity-item ${h.undone ? "undone" : ""}`}>
                  <div className="activity-icon">{h.type === "bulk" ? <ThunderboltOutlined /> : <HistoryOutlined />}</div>
                  <div className="activity-body">
                    <p>
                      <strong>{h.applicant}</strong>{" "}
                      {h.type === "bulk" ? `marked ${h.changes[0]?.to}` : `${h.changes[0]?.from} → ${h.changes[0]?.to}`}
                    </p>
                    <span className="activity-time">{new Date(h.ts).toLocaleString()}</span>
                  </div>
                  {!h.undone ? (
                    <Button size="small" icon={<UndoOutlined />} onClick={() => handleUndo(h.id)}>
                      Undo
                    </Button>
                  ) : (
                    <Tag>Reverted</Tag>
                  )}
                </div>
              ))}
            </div>
          )}
        </Drawer>

        <Drawer
          title="Compare Candidates"
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          className="review-drawer"
          width={520}
        >
          <div className="compare-grid">
            {compareRecords.map((r) => (
              <div key={r.key} className="compare-col">
                <Avatar src={r.avatar} size={64} className="avatar-ring" />
                <h4>
                  {r.applicant}
                  {r.score === compareMaxScore && <StarFilled className="compare-crown" />}
                </h4>
                <p className="role-text">{r.role}</p>
                <ScoreRing score={r.score} />
                <span className={`status-pill ${getStatusClass(r.status)}`}>
                  <span className="status-dot-mark" />
                  {r.status}
                </span>
                <div className="compare-row">
                  <EnvironmentOutlined /> {r.location}
                </div>
                <div className="compare-row">
                  <CalendarOutlined /> {timeAgo(r.submitted)}
                </div>
              </div>
            ))}
          </div>
        </Drawer>

        {paletteOpen && (
          <div className="cmdk-backdrop" onClick={() => setPaletteOpen(false)}>
            <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
              <div className="cmdk-input-row">
                <SearchOutlined />
                <input
                  autoFocus
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  onKeyDown={handlePaletteKeyDown}
                  placeholder="Type a command or search a candidate..."
                />
                <kbd>ESC</kbd>
              </div>
              <div className="cmdk-list">
                {combinedPaletteList.length === 0 && <div className="cmdk-empty">No results</div>}
                {combinedPaletteList.map((item, i) => (
                  <div
                    key={item.id}
                    className={`cmdk-item ${i === paletteActiveIndex ? "active" : ""}`}
                    onMouseEnter={() => setPaletteActiveIndex(i)}
                    onClick={item.run}
                  >
                    <span className="cmdk-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {snackbar && (
          <div className="snackbar">
            <span>{snackbar.message}</span>
            <button className="snackbar-undo" onClick={() => handleUndo(snackbar.historyId)}>
              <UndoOutlined /> Undo
            </button>
            <button className="snackbar-close" onClick={() => setSnackbar(null)}>
              <CloseOutlined />
            </button>
          </div>
        )}
      </Layout>
    </ConfigProvider>
  );
};

export default ReviewPage;