import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar, Button, Card, ConfigProvider, Drawer, Empty, Input, Layout, message,
  Select, Space, Table, Tag, Tooltip, Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AppstoreOutlined, ArrowRightOutlined, BarsOutlined, CalendarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, CloseOutlined, DownloadOutlined, EnvironmentOutlined,
  EyeOutlined, FilterOutlined, HistoryOutlined, HourglassOutlined, IdcardOutlined, PieChartOutlined,
  PlayCircleOutlined, ProjectOutlined, ReloadOutlined, SearchOutlined, SwapOutlined,
  ThunderboltOutlined, TrophyFilled, UndoOutlined, UsergroupAddOutlined,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./ReviewPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

type Status = "Pending" | "Approved" | "Rejected";

const statusIconMap = {
  Pending: <ClockCircleOutlined />,
  Approved: <CheckCircleOutlined />,
  Rejected: <CloseCircleOutlined />,
};

const fallbackImage =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80";

interface Skills { tech: number; comms: number; culture: number; exp: number }

interface ReferralRecord {
  key: string;
  submitted: string;
  applicant: string;
  location: string;
  avatar: string;
  status: Status;
  role: string;
  skills: Skills;
}

interface HistoryChange { key: string; from: Status; to: Status }

interface HistoryEntry {
  id: string;
  ts: number;
  type: "single" | "bulk";
  applicant: string;
  changes: HistoryChange[];
  undone?: boolean;
}

interface SnackbarState { id: string; message: string; historyId: string }

interface PaletteAction { id: string; label: string; icon: React.ReactNode; run: () => void }

const SKILL_AXES: { key: keyof Skills; label: string; color: string }[] = [
  { key: "tech", label: "Tech", color: "#38bdf8" },
  { key: "comms", label: "Comms", color: "#a78bfa" },
  { key: "culture", label: "Culture", color: "#f472b6" },
  { key: "exp", label: "Experience", color: "#fbbf24" },
];

const statusMetaMap: Record<Status, { color: string; glow: string; label: string }> = {
  Approved: { color: "#22c55e", glow: "rgba(34,197,94,0.4)", label: "Approved" },
  Rejected: { color: "#ef4444", glow: "rgba(239,68,68,0.4)", label: "Rejected" },
  Pending: { color: "#f59e0b", glow: "rgba(245,158,11,0.4)", label: "Pending" },
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const ageDays = (d: string) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));

const timeAgo = (dateStr: string) => {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

const isNew = (d: string) => ageDays(d) < 3;

const exportCSV = (data: ReferralRecord[], filename: string) => {
  const headers = ["Name", "Role", "City", "Status", "Submitted"];
  const rows = data.map((r) => [r.applicant, r.role, r.location, r.status, r.submitted]);
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const useCountUp = (target: number) => {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const f = from.current;
    const step = (now: number) => {
      const p = Math.min((now - start) / 650, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(f + (target - f) * eased);
      setV(val);
      from.current = val;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
};

const Stat = ({ icon, cls, label, value }: { icon: React.ReactNode; cls?: string; label: string; value: number }) => {
  const v = useCountUp(value);
  return (
    <Card className="review-metric-card">
      <div className={`metric-icon ${cls || ""}`}>{icon}</div>
      <div>
        <h3>{v}</h3>
        <p>{label}</p>
      </div>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/*  Skill bars                                                                 */
/* -------------------------------------------------------------------------- */

const SkillBars = ({ skills }: { skills: Skills }) => (
  <div className="skill-bars">
    {SKILL_AXES.map((a) => (
      <div key={a.key} className="skill-row" title={a.label}>
        <span>{a.label}</span>
        <div><i style={{ width: `${skills[a.key]}%`, background: a.color }} /></div>
      </div>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Compare view — head to head                                                */
/* -------------------------------------------------------------------------- */

const compareColors = ["#38bdf8", "#f472b6"];

const CompareView = ({ records }: { records: ReferralRecord[] }) => {
  if (records.length < 2) return <Empty description="Pick two candidates to compare" />;
  const [a, b] = records;
  const wins = [0, 0];
  SKILL_AXES.forEach((ax) => {
    if (a.skills[ax.key] > b.skills[ax.key]) wins[0] += 1;
    else if (b.skills[ax.key] > a.skills[ax.key]) wins[1] += 1;
  });
  const facts: { label: string; icon: React.ReactNode; va: string; vb: string }[] = [
    { label: "Role", icon: <IdcardOutlined />, va: a.role, vb: b.role },
    { label: "City", icon: <EnvironmentOutlined />, va: a.location, vb: b.location },
    { label: "Submitted", icon: <CalendarOutlined />, va: timeAgo(a.submitted), vb: timeAgo(b.submitted) },
  ];

  return (
    <div className="cmp">
      <div className="cmp-head">
        {records.map((r, i) => (
          <div key={r.key} className="cmp-card" style={{ "--cc": compareColors[i] } as React.CSSProperties}>
            {wins[i] > wins[1 - i] && <span className="cmp-lead"><TrophyFilled /> Leads</span>}
            <Avatar src={r.avatar} size={72} className="cmp-avatar" />
            <h4>{r.applicant}</h4>
            <p className="role-text">{r.role}</p>
            <span className={`status-pill ${r.status.toLowerCase()}`}><span className="status-dot-mark" />{r.status}</span>
          </div>
        ))}
        <div className="cmp-vs">VS</div>
      </div>

      <h5 className="cmp-title">Skills</h5>
      <div className="cmp-skills">
        {SKILL_AXES.map((ax) => {
          const va = a.skills[ax.key];
          const vb = b.skills[ax.key];
          return (
            <div key={ax.key} className="cmp-skill-row">
              <div className="cmp-skill-label">{ax.label}</div>
              <div className="cmp-track">
                <div className="cmp-half left">
                  <i className={va > vb ? "win" : ""} style={{ width: `${va}%`, "--c": compareColors[0] } as React.CSSProperties} />
                </div>
                <div className="cmp-half right">
                  <i className={vb > va ? "win" : ""} style={{ width: `${vb}%`, "--c": compareColors[1] } as React.CSSProperties} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h5 className="cmp-title">Details</h5>
      <div className="cmp-facts">
        {facts.map((f) => (
          <div key={f.label} className="cmp-fact">
            <strong style={{ color: compareColors[0] }}>{f.va}</strong>
            <span>{f.icon}{f.label}</span>
            <strong style={{ color: compareColors[1] }}>{f.vb}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Triage mode — swipe / keyboard through pending candidates                  */
/* -------------------------------------------------------------------------- */

interface TriageProps {
  queue: ReferralRecord[];
  onDecide: (key: string, status: "Approved" | "Rejected") => void;
  onClose: () => void;
}

const TriageMode = ({ queue, onDecide, onClose }: TriageProps) => {
  const [idx, setIdx] = useState(0);
  const [dx, setDx] = useState(0);
  const [fly, setFly] = useState<0 | 1 | -1>(0);
  const startX = useRef<number | null>(null);
  const total = useRef(queue.length);
  const safeIdx = queue.length ? idx % queue.length : 0;
  const current = queue[safeIdx];
  const done = total.current - queue.length;

  const decide = (status: "Approved" | "Rejected") => {
    if (!current || fly) return;
    setFly(status === "Approved" ? 1 : -1);
    setTimeout(() => {
      onDecide(current.key, status);
      setFly(0);
      setDx(0);
    }, 260);
  };
  const skip = () => { setDx(0); setIdx((i) => i + 1); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "a") decide("Approved");
      else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "r") decide("Rejected");
      else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") skip();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const progress = total.current ? (done / total.current) * 100 : 100;
  const cardStyle: React.CSSProperties = {
    transform: fly ? `translateX(${fly * 620}px) rotate(${fly * 24}deg)` : `translateX(${dx}px) rotate(${dx / 14}deg)`,
    transition: startX.current === null ? "transform 0.26s ease" : "none",
    opacity: fly ? 0 : 1,
  };

  return (
    <div className="tri-root" role="dialog" aria-label="Triage mode">
      <button className="rvo-x" onClick={onClose} aria-label="Close triage"><CloseOutlined /></button>
      <div className="tri-progress"><i style={{ width: `${progress}%` }} /></div>
      <p className="tri-count">{current ? `${queue.length} left to review` : "Inbox zero"}</p>

      {current ? (
        <>
          <div className="tri-stage">
            <div className="tri-hint tri-hint-no" style={{ opacity: Math.min(1, Math.max(0, -dx / 120)) }}>Reject</div>
            <div className="tri-hint tri-hint-yes" style={{ opacity: Math.min(1, Math.max(0, dx / 120)) }}>Approve</div>
            <div
              className="tri-card"
              style={cardStyle}
              onPointerDown={(e) => { startX.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={(e) => { if (startX.current !== null) setDx(e.clientX - startX.current); }}
              onPointerUp={() => {
                startX.current = null;
                if (dx > 120) decide("Approved");
                else if (dx < -120) decide("Rejected");
                else setDx(0);
              }}
            >
              <img src={current.avatar} alt="" draggable={false} onError={(e) => { e.currentTarget.src = fallbackImage; }} />
              <h2>{current.applicant}</h2>
              <p className="role-text">{current.role} · {current.location}</p>
              <SkillBars skills={current.skills} />
              <span className="tri-wait">Waiting {ageDays(current.submitted)}d</span>
            </div>
          </div>
          <div className="tri-actions">
            <Button className="rvo-reject-btn" size="large" icon={<CloseCircleOutlined />} onClick={() => decide("Rejected")}>Reject <kbd>R</kbd></Button>
            <Button size="large" onClick={skip}>Skip <kbd>S</kbd></Button>
            <Button type="primary" className="rvo-approve-btn" size="large" icon={<CheckCircleOutlined />} onClick={() => decide("Approved")}>Approve <kbd>A</kbd></Button>
          </div>
        </>
      ) : (
        <div className="tri-done">
          <CheckCircleOutlined />
          <h2>Nothing pending</h2>
          <Button onClick={onClose}>Back to review</Button>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  ReviewProfileOverlay                                                       */
/* -------------------------------------------------------------------------- */

interface ReviewProfileOverlayProps {
  referral: ReferralRecord;
  onClose: () => void;
  onStatusChange: (key: string, status: Status) => void;
  onCompareToggle: (key: string) => void;
  isComparing: boolean;
}

const ReviewProfileOverlay = ({ referral, onClose, onStatusChange, onCompareToggle, isComparing }: ReviewProfileOverlayProps) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const statusMeta = statusMetaMap[referral.status];
  const infoItems = [
    { icon: <EnvironmentOutlined />, label: "City", value: referral.location, accent: "#a78bfa" },
    { icon: <CalendarOutlined />, label: "Submitted", value: timeAgo(referral.submitted), accent: "#fb923c" },
    { icon: <IdcardOutlined />, label: "Role", value: referral.role, accent: "#f59e0b" },
  ];

  return (
    <div className="rvo-root">
      <div className="rvo-bg-blur">
        <img src={referral.avatar || fallbackImage} alt="" onError={(e) => { e.currentTarget.src = fallbackImage; }} />
      </div>
      <div className="rvo-bg-noise" />
      <div className="rvo-bg-vignette" />
      <div className="rvo-orbital-bg" aria-hidden="true">
        <div className="rvo-orb rvo-orb-1" />
        <div className="rvo-orb rvo-orb-2" />
        <div className="rvo-orb rvo-orb-3" />
      </div>

      <button className="rvo-x" onClick={onClose} aria-label="Close"><CloseOutlined /></button>

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
                onError={(e) => { e.currentTarget.src = fallbackImage; setImgLoaded(true); }}
              />
              <div className="rvo-ring rvo-ring-1" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
              <div className="rvo-ring rvo-ring-2" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
              <div className="rvo-ring rvo-ring-3" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
            </div>
            <h1 className="rvo-name">{referral.applicant}</h1>
            <p className="rvo-role-label">{referral.role}</p>
            <div className="rvo-badge-row">
              <span className="rvo-status-badge" style={{ "--bc": statusMeta.color, "--bg": statusMeta.glow } as React.CSSProperties}>
                {statusIconMap[referral.status]}{statusMeta.label}
              </span>
            </div>
          </div>

          <div className="rvo-skills-wrap">
            <SkillBars skills={referral.skills} />
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
            <Button className={`rvo-compare-btn ${isComparing ? "active" : ""}`} icon={<SwapOutlined />} onClick={() => onCompareToggle(referral.key)}>
              {isComparing ? "Comparing" : "Compare"}
            </Button>
            {referral.status !== "Pending" && (
              <Button icon={<ClockCircleOutlined />} onClick={() => { onStatusChange(referral.key, "Pending"); onClose(); }}>
                Reopen
              </Button>
            )}
          </div>

          {referral.status === "Pending" && (
            <div className="rvo-action-row">
              <Button className="rvo-reject-btn" icon={<CloseCircleOutlined />} onClick={() => { onStatusChange(referral.key, "Rejected"); onClose(); }}>Reject</Button>
              <Button type="primary" className="rvo-approve-btn" icon={<CheckCircleOutlined />} onClick={() => { onStatusChange(referral.key, "Approved"); onClose(); }}>Approve</Button>
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

const seed = (key: string, d: number, applicant: string, location: string, pic: string, status: Status, role: string, t: number, c: number, cu: number, e: number): ReferralRecord => ({
  key, submitted: daysAgo(d), applicant, location, avatar: `https://randomuser.me/api/portraits/${pic}.jpg`, status, role,
  skills: { tech: t, comms: c, culture: cu, exp: e },
});

const ReviewPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "card" | "board">("table");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralRecord | null>(null);
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null);
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
  const [triageOpen, setTriageOpen] = useState(false);
  const [dragOver, setDragOver] = useState<Status | null>(null);

  const searchInputRef = useRef<any>(null);
  const PAGE_SIZE = 6;

  const [referralsData, setReferralsData] = useState<ReferralRecord[]>([
    seed("1", 1, "Rajesh", "Chennai", "men/32", "Pending", "Full Stack", 82, 70, 76, 74),
    seed("2", 2, "Priya", "Bangalore", "women/44", "Approved", "UI/UX", 88, 95, 94, 90),
    seed("3", 3, "Arjun", "Hyderabad", "men/45", "Rejected", "Data", 52, 38, 44, 40),
    seed("4", 0, "Meena", "Coimbatore", "women/68", "Pending", "Frontend", 90, 84, 82, 86),
    seed("5", 4, "Karthik", "Madurai", "men/12", "Pending", "DevOps", 70, 55, 62, 68),
    seed("6", 6, "Divya", "Chennai", "women/21", "Pending", "QA", 66, 78, 74, 68),
    seed("7", 9, "Suresh", "Pune", "men/77", "Approved", "Backend", 92, 76, 85, 90),
    seed("8", 12, "Anitha", "Kochi", "women/33", "Pending", "Data", 60, 52, 58, 56),
    seed("9", 1, "Vikram", "Mumbai", "men/54", "Pending", "Mobile", 95, 88, 92, 96),
  ]);

  /* ---------------------------- derived data ---------------------------- */

  const filteredData = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return referralsData.filter((item) => {
      const matchesSearch = item.applicant.toLowerCase().includes(query) || item.location.toLowerCase().includes(query) || item.role.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [referralsData, searchTerm, statusFilter]);

  const pendingCount = referralsData.filter((i) => i.status === "Pending").length;
  const approvedCount = referralsData.filter((i) => i.status === "Approved").length;
  const rejectedCount = referralsData.filter((i) => i.status === "Rejected").length;
  const triageQueue = useMemo(
    () => referralsData.filter((r) => r.status === "Pending").sort((a, b) => ageDays(b.submitted) - ageDays(a.submitted)),
    [referralsData]
  );
  const longestWaiting = triageQueue.length ? triageQueue[0] : null;
  const oldestPending = longestWaiting ? ageDays(longestWaiting.submitted) : 0;

  const donutSegments = useMemo(() => {
    const total = referralsData.length;
    const C = 2 * Math.PI * 40;
    const items = [
      { label: "Approved", value: approvedCount, color: "#22c55e" },
      { label: "Pending", value: pendingCount, color: "#f59e0b" },
      { label: "Rejected", value: rejectedCount, color: "#ef4444" },
    ];
    let cum = 0;
    return items.map((it) => {
      const dash = (total ? it.value / total : 0) * C;
      const seg = { ...it, dash, offset: cum, circumference: C };
      cum += dash;
      return seg;
    });
  }, [referralsData, approvedCount, pendingCount, rejectedCount]);

  // Submissions over the last 7 days
  const timeline = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => 6 - i);
    const counts = days.map((d) => referralsData.filter((r) => ageDays(r.submitted) === d).length);
    const max = Math.max(1, ...counts);
    return days.map((d, i) => ({ d, n: counts[i], h: (counts[i] / max) * 100, label: d === 0 ? "T" : `-${d}` }));
  }, [referralsData]);

  /* ------------------------------- history ------------------------------- */

  const pushHistory = (changes: HistoryChange[], applicantLabel: string, type: "single" | "bulk") => {
    const id = `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setHistory((prev) => [{ id, ts: Date.now(), type, applicant: applicantLabel, changes }, ...prev].slice(0, 50));
    return id;
  };

  const showSnackbar = (msg: string, historyId: string) => setSnackbar({ id: `s_${Date.now()}`, message: msg, historyId });

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
    setTimeout(() => { setIsLoading(false); message.success("Updated"); }, 900);
  };

  const handleStatusChange = (key: string, status: Status) => {
    const record = referralsData.find((r) => r.key === key);
    if (!record || record.status === status) return;
    const from = record.status;
    setReferralsData((prev) => prev.map((item) => (item.key === key ? { ...item, status } : item)));
    setSelectedReferral((prev) => (prev && prev.key === key ? { ...prev, status } : prev));
    const id = pushHistory([{ key, from, to: status }], record.applicant, "single");
    showSnackbar(`${status === "Pending" ? "Reopened" : status} ${record.applicant}`, id);
  };

  const handleBulkStatusChange = (keys: React.Key[], status: "Approved" | "Rejected") => {
    const changes: HistoryChange[] = [];
    keys.forEach((k) => {
      const r = referralsData.find((x) => x.key === k);
      if (r && r.status !== status) changes.push({ key: String(k), from: r.status, to: status });
    });
    if (changes.length === 0) return;
    setReferralsData((prev) => prev.map((r) => (changes.some((c) => c.key === r.key) ? { ...r, status } : r)));
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

  const getStatusClass = (status: string) => (status === "Approved" ? "approved" : status === "Rejected" ? "rejected" : "pending");

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
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const paletteActions: PaletteAction[] = useMemo(() => {
    const close = () => setPaletteOpen(false);
    const act = (id: string, label: string, icon: React.ReactNode, fn: () => void): PaletteAction => ({ id, label, icon, run: () => { fn(); close(); } });
    return [
      act("triage", "Start triage mode", <PlayCircleOutlined />, () => setTriageOpen(true)),
      act("approve-pending", "Approve all pending", <CheckCircleOutlined />, () => handleBulkStatusChange(referralsData.filter((r) => r.status === "Pending").map((r) => r.key), "Approved")),
      act("export-all", "Export current view as CSV", <DownloadOutlined />, () => exportCSV(filteredData, "referrals.csv")),
      act("filter-pending", "Filter: Pending only", <FilterOutlined />, () => setStatusFilter("pending")),
      act("filter-approved", "Filter: Approved only", <FilterOutlined />, () => setStatusFilter("approved")),
      act("filter-rejected", "Filter: Rejected only", <FilterOutlined />, () => setStatusFilter("rejected")),
      act("clear-filters", "Clear all filters", <ReloadOutlined />, () => { setStatusFilter("all"); setSearchTerm(""); }),
      act("open-activity", "Open activity log", <HistoryOutlined />, () => setActivityOpen(true)),
      act("view-table", "View: Table", <BarsOutlined />, () => setViewMode("table")),
      act("view-card", "View: Cards", <AppstoreOutlined />, () => setViewMode("card")),
      act("view-board", "View: Board", <ProjectOutlined />, () => setViewMode("board")),
      act("toggle-insights", showInsights ? "Hide insights panel" : "Show insights panel", <PieChartOutlined />, () => setShowInsights((v) => !v)),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralsData, filteredData, showInsights]);

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
      run: () => { setSelectedReferral(c); setPaletteOpen(false); },
    }));
    const filtered = paletteQuery.trim() ? paletteActions.filter((a) => a.label.toLowerCase().includes(paletteQuery.toLowerCase())) : paletteActions;
    return [...candidateActions, ...filtered];
  }, [candidateMatches, paletteActions, paletteQuery]);

  useEffect(() => { setPaletteActiveIndex(0); }, [paletteQuery, paletteOpen]);

  const handlePaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setPaletteActiveIndex((i) => Math.min(i + 1, combinedPaletteList.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setPaletteActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") combinedPaletteList[paletteActiveIndex]?.run?.();
    else if (e.key === "Escape") setPaletteOpen(false);
  };

  /* --------------------------------- table -------------------------------- */

  const renderStatusTag = (status: Status) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`status-dot status-${getStatusClass(status)} icon-only`}>{statusIconMap[status]}</Tag>
    </Tooltip>
  );

  const renderRowActionsOverlay = (record: ReferralRecord) => (
    <div className="review-row-actions-overlay">
      <Tooltip title="View">
        <Button type="text" icon={<EyeOutlined />} className="review-action-btn view" onClick={(e) => { e.stopPropagation(); setSelectedReferral(record); }} />
      </Tooltip>
      <Tooltip title={compareKeys.includes(record.key) ? "Remove from compare" : "Add to compare"}>
        <Button type="text" icon={<SwapOutlined />} className={`review-action-btn compare ${compareKeys.includes(record.key) ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); toggleCompare(record.key); }} />
      </Tooltip>
      {record.status === "Pending" && (
        <>
          <Tooltip title="Approve">
            <Button type="text" icon={<CheckCircleOutlined />} className="review-action-btn approve" onClick={(e) => { e.stopPropagation(); handleStatusChange(record.key, "Approved"); }} />
          </Tooltip>
          <Tooltip title="Reject">
            <Button type="text" icon={<CloseCircleOutlined />} className="review-action-btn reject" onClick={(e) => { e.stopPropagation(); handleStatusChange(record.key, "Rejected"); }} />
          </Tooltip>
        </>
      )}
    </div>
  );

  const columns: ColumnsType<ReferralRecord> = [
    {
      title: "Name", dataIndex: "applicant", key: "applicant", width: 240,
      render: (_, record) => (
        <button type="button" className="review-name-cell" onClick={() => setSelectedReferral(record)}>
          <Avatar src={record.avatar} className="review-name-avatar" />
          <span>
            <strong>{record.applicant}{isNew(record.submitted) && <Tag className="new-tag">NEW</Tag>}</strong>
            <small>{record.role}</small>
          </span>
        </button>
      ),
    },
    { title: "City", dataIndex: "location", key: "location", width: 160, render: (l) => <span className="review-soft-cell">{l}</span> },
    { title: "Status", dataIndex: "status", key: "status", width: 100, align: "center", render: renderStatusTag },
    {
      title: "Date", dataIndex: "submitted", key: "submitted", width: 170,
      sorter: (a, b) => new Date(a.submitted).getTime() - new Date(b.submitted).getTime(),
      onCell: () => ({ className: "review-actions-anchor-cell" }),
      render: (date, record) => (
        <>
          <Tooltip title={timeAgo(date)}>
            <Tag className="review-date-tag"><CalendarOutlined /> {date}</Tag>
          </Tooltip>
          {renderRowActionsOverlay(record)}
        </>
      ),
    },
  ];

  const rowSelection = { selectedRowKeys, onChange: (keys: React.Key[]) => setSelectedRowKeys(keys), columnWidth: 40 };

  const compareRecords = compareKeys.map((k) => referralsData.find((r) => r.key === k)).filter(Boolean) as ReferralRecord[];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#38bdf8", borderRadius: 14, colorText: "#f8fafc", colorTextSecondary: "#94a3b8" } }}>
      <Layout className="dashboard-page dashboard-dark review-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell review-shell">
            <Header className="dashboard-navbar review-navbar">
              <div className="dashboard-brand">
                <Title level={3} className="dashboard-title review-title">Review</Title>
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
                    <div className="hero-actions">
                      <button className="triage-cta" onClick={() => setTriageOpen(true)} disabled={!pendingCount}>
                        <PlayCircleOutlined />
                        <span>
                          <strong>Start triage</strong>
                          <small>{pendingCount ? `${pendingCount} waiting · oldest ${oldestPending}d` : "All caught up"}</small>
                        </span>
                      </button>
                      <Tooltip title="Open command palette">
                        <button className="cmdk-hint" onClick={() => setPaletteOpen(true)}>
                          <ThunderboltOutlined /> <span>⌘K</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="stats-row">
                    <Stat icon={<UsergroupAddOutlined />} label="Total" value={referralsData.length} />
                    <Stat icon={<ClockCircleOutlined />} cls="icon-pending" label="Pending" value={pendingCount} />
                    <Stat icon={<CheckCircleOutlined />} cls="icon-approved" label="Approved" value={approvedCount} />
                    <Stat icon={<CloseCircleOutlined />} cls="icon-rejected" label="Rejected" value={rejectedCount} />
                  </div>

                  {showInsights && (
                    <div className="insights-row">
                      <Card className="insight-card donut-card">
                        <h4>Status Breakdown</h4>
                        <div className="donut-wrap">
                          <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
                            {donutSegments.map((s) => s.dash > 0 && (
                              <circle
                                key={s.label} cx="50" cy="50" r="40" fill="none" stroke={s.color} strokeWidth="14"
                                strokeDasharray={`${s.dash} ${s.circumference - s.dash}`} strokeDashoffset={-s.offset}
                                strokeLinecap="round" transform="rotate(-90 50 50)" className="donut-seg"
                              />
                            ))}
                          </svg>
                          <div className="donut-center"><strong>{referralsData.length}</strong><span>Total</span></div>
                        </div>
                        <div className="donut-legend">
                          {donutSegments.map((s) => (
                            <div key={s.label} className="legend-item">
                              <span className="legend-dot" style={{ background: s.color }} />{s.label} · {s.value}
                            </div>
                          ))}
                        </div>
                      </Card>

                      {longestWaiting && (
                        <Card className="insight-card spotlight-card" onClick={() => setSelectedReferral(longestWaiting)}>
                          <h4><HourglassOutlined /> Longest waiting</h4>
                          <div className="spotlight-body">
                            <Avatar src={longestWaiting.avatar} size={48} className="avatar-ring" />
                            <div><strong>{longestWaiting.applicant}</strong><p>{longestWaiting.role} · {oldestPending}d</p></div>
                          </div>
                          <SkillBars skills={longestWaiting.skills} />
                        </Card>
                      )}

                      <Card className="insight-card">
                        <h4>Last 7 days</h4>
                        <div className="spark">
                          {timeline.map((t) => (
                            <Tooltip key={t.d} title={`${t.n} submitted`}>
                              <div className="spark-col">
                                <i style={{ height: `${Math.max(t.h, 6)}%`, opacity: t.n ? 1 : 0.25 }} />
                                <small>{t.label}</small>
                              </div>
                            </Tooltip>
                          ))}
                        </div>
                        <p className="spark-note">{triageQueue.length ? `${triageQueue.length} still need a decision` : "No backlog"}</p>
                      </Card>
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
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        allowClear
                      />
                      <Select
                        value={statusFilter}
                        className="status-select"
                        onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                        options={[
                          { value: "all", label: "All" },
                          { value: "pending", label: "Pending" },
                          { value: "approved", label: "Approved" },
                          { value: "rejected", label: "Rejected" },
                        ]}
                      />
                      <Tooltip title="Refresh"><Button icon={<ReloadOutlined spin={isLoading} />} onClick={handleRefresh} className="refresh-btn icon-action" /></Tooltip>
                      <Tooltip title={showInsights ? "Hide insights" : "Show insights"}>
                        <Button icon={<PieChartOutlined />} onClick={() => setShowInsights((v) => !v)} className={`icon-action ${showInsights ? "filter-active" : ""}`} />
                      </Tooltip>
                      <Tooltip title="Activity log"><Button icon={<HistoryOutlined />} onClick={() => setActivityOpen(true)} className="icon-action" /></Tooltip>
                      <Tooltip title="Export current view"><Button icon={<DownloadOutlined />} onClick={() => exportCSV(filteredData, "referrals.csv")} className="icon-action" /></Tooltip>
                    </Space>

                    <div className="view-toggle">
                      <Tooltip title="Table"><Button type={viewMode === "table" ? "primary" : "default"} icon={<BarsOutlined />} onClick={() => setViewMode("table")} /></Tooltip>
                      <Tooltip title="Cards"><Button type={viewMode === "card" ? "primary" : "default"} icon={<AppstoreOutlined />} onClick={() => setViewMode("card")} /></Tooltip>
                      <Tooltip title="Board"><Button type={viewMode === "board" ? "primary" : "default"} icon={<ProjectOutlined />} onClick={() => setViewMode("board")} /></Tooltip>
                    </div>
                  </div>

                  {selectedRowKeys.length > 0 && (
                    <div className="bulk-toolbar">
                      <span className="bulk-count">{selectedRowKeys.length} selected</span>
                      <Button size="small" icon={<CheckCircleOutlined />} className="bulk-approve" onClick={() => handleBulkStatusChange(selectedRowKeys, "Approved")}>Approve</Button>
                      <Button size="small" icon={<CloseCircleOutlined />} className="bulk-reject" onClick={() => handleBulkStatusChange(selectedRowKeys, "Rejected")}>Reject</Button>
                      <Button size="small" icon={<DownloadOutlined />} onClick={() => exportCSV(referralsData.filter((r) => selectedRowKeys.includes(r.key)), "selected-referrals.csv")}>Export</Button>
                      <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])} />
                    </div>
                  )}

                  {filteredData.length === 0 ? (
                    <div className="empty-state"><Empty description={false} /></div>
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
                          onMouseLeave: () => setActiveRowKey((c) => (c === record.key ? null : c)),
                          onTouchStart: () => setActiveRowKey((c) => (c === record.key ? null : record.key)),
                        })}
                        locale={{ emptyText: <Empty description="No matching referrals" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                        pagination={{ current: currentPage, pageSize: PAGE_SIZE, total: filteredData.length, onChange: (p) => setCurrentPage(p), showSizeChanger: false, hideOnSinglePage: true }}
                      />
                    </div>
                  ) : viewMode === "board" ? (
                    <div className="kanban">
                      {(["Pending", "Approved", "Rejected"] as Status[]).map((col) => {
                        const items = filteredData.filter((r) => r.status === col);
                        return (
                          <div
                            key={col}
                            className={`kanban-col kanban-${getStatusClass(col)} ${dragOver === col ? "over" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
                            onDragLeave={() => setDragOver((c) => (c === col ? null : c))}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOver(null);
                              const key = e.dataTransfer.getData("text/plain");
                              if (key) handleStatusChange(key, col);
                            }}
                          >
                            <div className="kanban-head">{statusIconMap[col]}<strong>{col}</strong><span>{items.length}</span></div>
                            {items.length === 0 && <p className="kanban-empty">Drop here</p>}
                            {items.map((r) => (
                              <div
                                key={r.key}
                                className="kanban-card"
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", r.key)}
                                onClick={() => setSelectedReferral(r)}
                              >
                                <Avatar src={r.avatar} size={36} className="avatar-ring" />
                                <div className="kanban-info">
                                  <strong>{r.applicant}{isNew(r.submitted) && <Tag className="new-tag">NEW</Tag>}</strong>
                                  <small>{r.role} · {r.location}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="card-grid">
                      {filteredData.map((item, index) => (
                        <Card key={item.key} className={`talent-card talent-card-${getStatusClass(item.status)}`} hoverable style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}>
                          <div className="talent-top">
                            <Avatar src={item.avatar} size={58} className="avatar-ring" />
                            <span className={`status-pill ${getStatusClass(item.status)}`}><span className="status-dot-mark" />{item.status}</span>
                          </div>
                          <h4>{item.applicant}{isNew(item.submitted) && <Tag className="new-tag">NEW</Tag>}</h4>
                          <p className="role-text">{item.role}</p>
                          <SkillBars skills={item.skills} />
                          <div className="card-meta">
                            <span>{item.location}</span>
                            <Tooltip title={item.submitted}><span>{timeAgo(item.submitted)}</span></Tooltip>
                          </div>
                          <div className="card-actions">
                            <Tooltip title="View"><Button icon={<EyeOutlined />} className="action-btn icon-action" onClick={() => setSelectedReferral(item)} /></Tooltip>
                            <Tooltip title="Compare">
                              <Button icon={<SwapOutlined />} className={`action-btn icon-action ${compareKeys.includes(item.key) ? "filter-active" : ""}`} onClick={() => toggleCompare(item.key)} />
                            </Tooltip>
                            {item.status === "Pending" && (
                              <>
                                <Tooltip title="Approve"><Button type="primary" icon={<CheckCircleOutlined />} className="approve-btn icon-action" onClick={() => handleStatusChange(item.key, "Approved")} /></Tooltip>
                                <Tooltip title="Reject"><Button danger icon={<CloseCircleOutlined />} className="reject-btn icon-action" onClick={() => handleStatusChange(item.key, "Rejected")} /></Tooltip>
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

        {triageOpen && (
          <TriageMode queue={triageQueue} onDecide={handleStatusChange} onClose={() => setTriageOpen(false)} />
        )}

        {compareKeys.length > 0 && (
          <div className="compare-bar">
            <div className="compare-bar-avatars">
              {compareRecords.map((r) => <Avatar key={r.key} src={r.avatar} size={30} className="compare-avatar" />)}
            </div>
            <span className="compare-bar-label">{compareKeys.length} of 2 selected</span>
            <Button size="small" type="primary" disabled={compareKeys.length < 2} onClick={() => setCompareOpen(true)}>Compare</Button>
            <Button size="small" type="text" className="compare-bar-close" icon={<CloseOutlined />} onClick={() => setCompareKeys([])} />
          </div>
        )}

        <Drawer title="Activity" open={activityOpen} onClose={() => setActivityOpen(false)} rootClassName="review-drawer" width={400}>
          {history.length === 0 ? (
            <div className="drawer-empty"><HistoryOutlined /><p>No activity yet</p></div>
          ) : (
            <div className="activity-list">
              {history.map((h) => {
                const to = h.changes[0]?.to as Status;
                const from = h.changes[0]?.from as Status;
                return (
                  <div
                    key={h.id}
                    className={`activity-item ${h.undone ? "undone" : ""}`}
                    style={{ "--dc": statusMetaMap[to]?.color || "#38bdf8" } as React.CSSProperties}
                  >
                    <div className="activity-body">
                      <p className="activity-name">{h.applicant}</p>
                      {h.type === "bulk" ? (
                        <p className="activity-flow"><span className={`status-pill ${getStatusClass(to)}`}>{to}</span></p>
                      ) : (
                        <p className="activity-flow">
                          <span className={`status-pill ${getStatusClass(from)}`}>{from}</span>
                          <ArrowRightOutlined />
                          <span className={`status-pill ${getStatusClass(to)}`}>{to}</span>
                        </p>
                      )}
                      <span className="activity-time">{new Date(h.ts).toLocaleString()}</span>
                    </div>
                    {!h.undone ? (
                      <Button size="small" icon={<UndoOutlined />} className="activity-undo" onClick={() => handleUndo(h.id)}>Undo</Button>
                    ) : (
                      <span className="activity-reverted">Reverted</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Drawer>

        <Drawer title="Head to head" open={compareOpen} onClose={() => setCompareOpen(false)} rootClassName="review-drawer" width={560}>
          <CompareView records={compareRecords} />
        </Drawer>

        {paletteOpen && (
          <div className="cmdk-backdrop" onClick={() => setPaletteOpen(false)}>
            <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
              <div className="cmdk-input-row">
                <SearchOutlined />
                <input autoFocus value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)} onKeyDown={handlePaletteKeyDown} placeholder="Type a command or search a candidate..." />
                <kbd>ESC</kbd>
              </div>
              <div className="cmdk-list">
                {combinedPaletteList.length === 0 && <div className="cmdk-empty">No results</div>}
                {combinedPaletteList.map((item, i) => (
                  <div key={item.id} className={`cmdk-item ${i === paletteActiveIndex ? "active" : ""}`} onMouseEnter={() => setPaletteActiveIndex(i)} onClick={item.run}>
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
            <button className="snackbar-undo" onClick={() => handleUndo(snackbar.historyId)}><UndoOutlined /> Undo</button>
            <button className="snackbar-close" onClick={() => setSnackbar(null)}><CloseOutlined /></button>
          </div>
        )}
      </Layout>
    </ConfigProvider>
  );
};

export default ReviewPage;