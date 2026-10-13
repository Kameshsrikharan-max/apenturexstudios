import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import {Layout,Table,Input,Button,ConfigProvider,message,Select,Form,Tooltip,Empty,Avatar,Dropdown,DatePicker,theme,} from "antd";
import type { InputRef } from "antd";
import type { ColumnsType } from "antd/es/table";
import {SearchOutlined,ReloadOutlined,PlusOutlined,EyeOutlined,EditOutlined,UserOutlined,PhoneOutlined,ClockCircleOutlined,FileTextOutlined,CalendarOutlined,EnvironmentOutlined,CheckCircleOutlined,CameraOutlined,CloseOutlined,DownloadOutlined,UnorderedListOutlined,AppstoreOutlined,WhatsAppOutlined,SendOutlined,DownOutlined,ThunderboltOutlined,} from "@ant-design/icons";

import Sidebar from "../../../components/UI/Sidebar";
import DeleteButton from "../../../components/common/DeleteButton";
import "./EnquiryPage.css";

const { Header, Content } = Layout;

/* ───────────────────────────── Types ───────────────────────────── */

type EnquiryStatus = "DRAFT" | "NEW" | "FOLLOWUP" | "CONFIRMED" | "CANCELLED";
type ViewMode = "table" | "board";

interface TimelineEntry {
  text: string;
  at: string; // ISO datetime
}

interface EnquiryRecord {
  id: string;
  enquiryName: string;
  customerName: string;
  phone: string;
  eventDate: string; // ISO date YYYY-MM-DD
  status: EnquiryStatus;
  city: string;
  createdBy: string;
  createdAt: string; // ISO date
  image?: string;
  notes?: string;
  timeline: TimelineEntry[];
}

interface EnquiryFormValues {
  enquiryName: string;
  customerName: string;
  phone: string;
  eventDate: Dayjs;
  status: EnquiryStatus;
  city: string;
  image?: string;
  notes?: string;
}

/* ──────────────────────────── Constants ─────────────────────────── */

const imageFallback =
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80";

const STATUS_ORDER: EnquiryStatus[] = ["DRAFT", "NEW", "FOLLOWUP", "CONFIRMED", "CANCELLED"];
const STATUS_FLOW: EnquiryStatus[] = ["DRAFT", "NEW", "FOLLOWUP", "CONFIRMED"];

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  DRAFT: "Draft",
  NEW: "New",
  FOLLOWUP: "Follow-up",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

const DATE_FMT = "MMM DD, YYYY";

const inDays = (n: number) => dayjs().add(n, "day").format("YYYY-MM-DD");
const agoLog = (text: string, daysAgo: number, hour = 11): TimelineEntry => ({
  text,
  at: dayjs().subtract(daysAgo, "day").hour(hour).minute(0).toISOString(),
});

const initialEnquiries: EnquiryRecord[] = [
  {
    id: "1",
    enquiryName: "Brand - Wedding",
    customerName: "Apsi",
    phone: "9597846525",
    eventDate: inDays(5),
    status: "DRAFT",
    city: "Coimbatore",
    createdBy: "super admin",
    createdAt: inDays(-8),
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
    notes: "Client is interested in premium wedding coverage with candid team.",
    timeline: [
      agoLog("Enquiry created", 8),
      agoLog("Budget discussed", 4, 15),
      agoLog("Awaiting follow-up", 1, 10),
    ],
  },
  {
    id: "2",
    enquiryName: "John - Wedding",
    customerName: "John",
    phone: "6560235894",
    eventDate: inDays(21),
    status: "NEW",
    city: "Chennai",
    createdBy: "super admin",
    createdAt: inDays(-12),
    image:
      "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=80",
    notes: "Needs album, traditional photography, and candid event coverage.",
    timeline: [
      agoLog("Enquiry created", 12),
      agoLog("Package shared", 6, 16),
      agoLog("Waiting for confirmation", 2),
    ],
  },
  {
    id: "3",
    enquiryName: "Priya - Engagement",
    customerName: "Priya",
    phone: "9845012458",
    eventDate: inDays(48),
    status: "FOLLOWUP",
    city: "Bangalore",
    createdBy: "super admin",
    createdAt: inDays(-6),
    image:
      "https://images.unsplash.com/photo-1529634597503-139d3726fed5?auto=format&fit=crop&w=900&q=80",
    notes: "Highly interested. Wants cinematic teaser and couple portraits.",
    timeline: [
      agoLog("Enquiry created", 6),
      agoLog("Call completed", 3, 14),
      agoLog("Follow-up scheduled", 1, 17),
    ],
  },
  {
    id: "4",
    enquiryName: "Meera - Baby Shoot",
    customerName: "Meera",
    phone: "9791234567",
    eventDate: inDays(-3),
    status: "CONFIRMED",
    city: "Coimbatore",
    createdBy: "super admin",
    createdAt: inDays(-20),
    image:
      "https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=900&q=80",
    notes: "Studio session with props. Advance paid.",
    timeline: [agoLog("Enquiry created", 20), agoLog("Advance received", 15, 12), agoLog("Marked as Confirmed", 14)],
  },
];

/* ──────────────────────────── Helpers ───────────────────────────── */

const fmtDate = (iso: string) => dayjs(iso).format(DATE_FMT);
const daysUntil = (iso: string) => dayjs(iso).startOf("day").diff(dayjs().startOf("day"), "day");

const countdownLabel = (d: number) => {
  if (d < 0) return `${Math.abs(d)}d ago`;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `in ${d}d`;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const hueOf = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

const useCountUp = (target: number, ms = 700) => {
  const [value, setValue] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const from = prev.current;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1);
      setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
};

/* ─────────────────────── Small presentational bits ─────────────────────── */

const CountChip = ({ iso }: { iso: string }) => {
  const d = daysUntil(iso);
  const tone = d < 0 ? "past" : d <= 7 ? "soon" : "later";
  return <span className={`eq-count ${tone}`}>{countdownLabel(d)}</span>;
};

const NameAvatar = ({ name, size = 34 }: { name: string; size?: number }) => (
  <span
    className="eq-initials"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.38,
      background: `linear-gradient(135deg, hsl(${hueOf(name)} 70% 52%), hsl(${(hueOf(name) + 40) % 360} 70% 38%))`,
    }}
  >
    {initials(name) || "?"}
  </span>
);

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  suffix?: string;
  tone: string;
  active?: boolean;
  onClick: () => void;
}

const StatCard = ({ icon, label, value, suffix, tone, active, onClick }: StatCardProps) => {
  const shown = useCountUp(value);
  return (
    <button
      type="button"
      className={`eq-stat ${tone} ${active ? "is-active" : ""}`}
      onClick={onClick}
      aria-pressed={!!active}
    >
      <span className="eq-stat-icon">{icon}</span>
      <strong>
        {shown}
        {suffix}
      </strong>
      <span className="eq-stat-label">{label}</span>
    </button>
  );
};

/* ───────────────────────────── Modal shell ───────────────────────────── */

interface GlassModalProps {
  open: boolean;
  width?: number;
  dismissible?: boolean;
  onClose?: () => void;
  children: ReactNode;
}

const GlassModal = ({ open, width = 680, dismissible = true, onClose, children }: GlassModalProps) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="eq-backdrop"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="eq-panel" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="eq-panel-scroll">{children}</div>
      </div>
    </div>,
    document.body
  );
};

/* ───────────────────────────── EnquiryPage ───────────────────────────── */

const EnquiryPage = () => {
  const [enquiriesData, setEnquiriesData] = useState<EnquiryRecord[]>(initialEnquiries);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnquiryStatus>("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [editEnquiry, setEditEnquiry] = useState<EnquiryRecord | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<EnquiryStatus | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [form] = Form.useForm<EnquiryFormValues>();
  const searchRef = useRef<InputRef>(null);

  const viewEnquiry = useMemo(
    () => enquiriesData.find((e) => e.id === viewId) ?? null,
    [enquiriesData, viewId]
  );
  const journeyEnquiry = useMemo(
    () => enquiriesData.find((e) => e.id === journeyId) ?? null,
    [enquiriesData, journeyId]
  );

  const formOpen = !!editEnquiry || isCreateOpen;

  /* Keyboard shortcuts: "/" focuses search, "n" creates a new enquiry */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "n" && !viewId && !journeyId && !formOpen) {
        e.preventDefault();
        openCreateModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId, journeyId, formOpen]);

  /* Fill the form whenever the create / edit modal opens */
  useEffect(() => {
    if (editEnquiry) {
      form.setFieldsValue({
        enquiryName: editEnquiry.enquiryName,
        customerName: editEnquiry.customerName,
        phone: editEnquiry.phone,
        eventDate: dayjs(editEnquiry.eventDate),
        status: editEnquiry.status,
        city: editEnquiry.city,
        image: editEnquiry.image,
        notes: editEnquiry.notes,
      });
    } else if (isCreateOpen) {
      form.resetFields();
      form.setFieldsValue({ status: "DRAFT" });
    }
  }, [editEnquiry, isCreateOpen, form]);

  const cities = useMemo(
    () => ["ALL", ...Array.from(new Set(enquiriesData.map((item) => item.city)))],
    [enquiriesData]
  );

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return enquiriesData.filter((enq) => {
      const haystack = [enq.enquiryName, enq.customerName, enq.phone, enq.city, enq.status, enq.notes ?? ""]
        .join(" ")
        .toLowerCase();

      return (
        haystack.includes(term) &&
        (statusFilter === "ALL" || enq.status === statusFilter) &&
        (cityFilter === "ALL" || enq.city === cityFilter)
      );
    });
  }, [enquiriesData, searchTerm, statusFilter, cityFilter]);

  const statusCounts = useMemo(() => {
    const base: Record<EnquiryStatus, number> = { DRAFT: 0, NEW: 0, FOLLOWUP: 0, CONFIRMED: 0, CANCELLED: 0 };
    enquiriesData.forEach((e) => (base[e.status] += 1));
    return base;
  }, [enquiriesData]);

  const total = enquiriesData.length;
  const conversion = total ? Math.round((statusCounts.CONFIRMED / total) * 100) : 0;

  /* ─── Actions ─── */

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      message.success("Enquiries refreshed");
    }, 700);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCityFilter("ALL");
  };

  const addLog = (id: string, text: string) =>
    setEnquiriesData((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, timeline: [...e.timeline, { text, at: dayjs().toISOString() }] } : e
      )
    );

  const updateStatus = (id: string, status: EnquiryStatus) => {
    const current = enquiriesData.find((e) => e.id === id);
    if (!current || current.status === status) return;

    setEnquiriesData((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              timeline: [
                ...item.timeline,
                { text: `Status changed to ${STATUS_LABEL[status]}`, at: dayjs().toISOString() },
              ],
            }
          : item
      )
    );
    message.success(`Moved to ${STATUS_LABEL[status]}`);
  };

  const handleDeleteEnquiry = (record: EnquiryRecord) => {
    setEnquiriesData((prev) => prev.filter((item) => item.id !== record.id));
    setSelectedRowKeys((prev) => prev.filter((key) => key !== record.id));
  };

  const handleBulkDelete = () => {
    setEnquiriesData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)));
    setSelectedRowKeys([]);
  };

  const openEditModal = (record: EnquiryRecord) => {
    setViewId(null);
    setIsCreateOpen(false);
    setEditEnquiry(record);
  };

  const openCreateModal = () => {
    setEditEnquiry(null);
    setIsCreateOpen(true);
  };

  const closeFormModal = () => {
    setEditEnquiry(null);
    setIsCreateOpen(false);
    form.resetFields();
  };

  const handleSaveEnquiry = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, eventDate: values.eventDate.format("YYYY-MM-DD") };

      if (editEnquiry) {
        const statusChanged = editEnquiry.status !== payload.status;
        setEnquiriesData((prev) =>
          prev.map((item) =>
            item.id === editEnquiry.id
              ? {
                  ...item,
                  ...payload,
                  timeline: [
                    ...item.timeline,
                    {
                      text: statusChanged
                        ? `Edited · status changed to ${STATUS_LABEL[payload.status]}`
                        : "Enquiry details edited",
                      at: dayjs().toISOString(),
                    },
                  ],
                }
              : item
          )
        );
        message.success("Enquiry updated");
      } else {
        const newEnquiry: EnquiryRecord = {
          ...payload,
          id: Date.now().toString(),
          createdBy: "super admin",
          createdAt: dayjs().format("YYYY-MM-DD"),
          timeline: [{ text: "Enquiry created", at: dayjs().toISOString() }],
        };
        setEnquiriesData((prev) => [newEnquiry, ...prev]);
        message.success("Enquiry created");
      }

      closeFormModal();
    } catch {
      /* validation errors are shown inline */
    }
  };

  const handleAddNote = () => {
    const text = noteDraft.trim();
    if (!text || !journeyId) return;
    addLog(journeyId, text);
    setNoteDraft("");
  };

  const handleExport = () => {
    const rows = filteredData.map((e) =>
      [e.enquiryName, e.customerName, e.phone, fmtDate(e.eventDate), e.city, STATUS_LABEL[e.status], e.notes ?? ""]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = ["Enquiry,Customer,Phone,Event date,City,Status,Notes", ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquiries-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`Exported ${rows.length} enquiries`);
  };

  /* ─── Board drag & drop ─── */

  const handleDrop = (column: EnquiryStatus) => {
    if (dragId) updateStatus(dragId, column);
    setDragId(null);
    setDragOver(null);
  };

  /* ─── Status pill with dropdown ─── */

  const renderStatusPill = (record: EnquiryRecord) => (
    <Dropdown
      trigger={["click"]}
      menu={{
        selectedKeys: [record.status],
        items: STATUS_ORDER.map((s) => ({
          key: s,
          label: <span className={`eq-menu-item st-${s}`}>{STATUS_LABEL[s]}</span>,
        })),
        onClick: ({ key }) => updateStatus(record.id, key as EnquiryStatus),
      }}
    >
      <button type="button" className={`eq-pill st-${record.status}`} aria-label="Change status">
        {STATUS_LABEL[record.status]}
        <DownOutlined />
      </button>
    </Dropdown>
  );

  /* ─── Table columns ─── */

  const columns: ColumnsType<EnquiryRecord> = [
    {
      title: "Enquiry",
      dataIndex: "enquiryName",
      key: "enquiryName",
      sorter: (a, b) => a.enquiryName.localeCompare(b.enquiryName),
      render: (text: string, record) => (
        <button type="button" className="eq-name-cell" onClick={() => setViewId(record.id)}>
          <img
            src={record.image || imageFallback}
            alt=""
            onError={(e) => {
              e.currentTarget.src = imageFallback;
            }}
          />
          <span>
            <strong>{text}</strong>
            <small>Added {fmtDate(record.createdAt)}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      render: (text: string) => (
        <span className="eq-cell">
          <NameAvatar name={text} size={28} />
          {text}
        </span>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (text: string) => (
        <a className="eq-cell eq-link" href={`tel:${text}`}>
          <PhoneOutlined /> {text}
        </a>
      ),
    },
    {
      title: "Event",
      dataIndex: "eventDate",
      key: "eventDate",
      sorter: (a, b) => a.eventDate.localeCompare(b.eventDate),
      render: (iso: string) => (
        <span className="eq-cell">
          <CalendarOutlined /> {fmtDate(iso)}
          <CountChip iso={iso} />
        </span>
      ),
    },
    {
      title: "City",
      dataIndex: "city",
      key: "city",
      render: (text: string) => (
        <span className="eq-cell">
          <EnvironmentOutlined /> {text}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (_: EnquiryStatus, record) => renderStatusPill(record),
    },
    {
      title: "",
      key: "actions",
      width: 196,
      align: "right",
      render: (_: unknown, record) => (
        <div className="eq-row-actions">
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} className="eq-icon-btn view" onClick={() => setViewId(record.id)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} className="eq-icon-btn edit" onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip title="Journey">
            <Button
              type="text"
              icon={<ClockCircleOutlined />}
              className="eq-icon-btn journey"
              onClick={() => setJourneyId(record.id)}
            />
          </Tooltip>
          <Tooltip title="Mark as confirmed">
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              className="eq-icon-btn confirm"
              disabled={record.status === "CONFIRMED"}
              onClick={() => updateStatus(record.id, "CONFIRMED")}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <DeleteButton
              itemName={record.enquiryName}
              onDelete={() => handleDeleteEnquiry(record)}
              className="eq-icon-btn delete"
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  /* ─── Render ─── */

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#38bdf8",
          borderRadius: 12,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          colorBgElevated: "#0d1430",
          colorBgContainer: "rgba(2, 6, 23, 0.55)",
          colorBorder: "rgba(56, 189, 248, 0.26)",
          zIndexPopupBase: 1100,
        },
        components: {
          Table: {
            colorBgContainer: "transparent",
            headerBg: "rgba(2, 6, 23, 0.45)",
            rowHoverBg: "rgba(56, 189, 248, 0.09)",
            borderColor: "rgba(56, 189, 248, 0.12)",
            headerSplitColor: "transparent",
          },
        },
      }}
    >
      <Layout className="enquiry-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell enquiry-shell">
            <Header className="dashboard-navbar enquiry-navbar">
              <h1 className="enquiry-title">Enquiries</h1>
              <div className="enquiry-hints" aria-hidden="true">
                <kbd>/</kbd> search <kbd>N</kbd> new
              </div>
            </Header>

            <Content className="content-area enquiry-content">
              <div className="enquiry-page-scroll">
                <div className="enquiry-page-inner">
                  {/* ── Hero ── */}
                  <section className="eq-hero">
                    <div className="eq-hero-copy">
                      <span className="eq-hero-pill">
                        <CameraOutlined /> Lead board
                      </span>
                      <h2 className="eq-display">Every enquiry, from first call to booked shoot</h2>
                      <p>
                        {statusCounts.NEW + statusCounts.FOLLOWUP > 0
                          ? `${statusCounts.NEW + statusCounts.FOLLOWUP} enquiries are waiting on you. Drag cards on the board to move them along.`
                          : "You're all caught up. New enquiries will show up here."}
                      </p>

                      <div className="eq-pipebar" role="img" aria-label="Pipeline breakdown by status">
                        {STATUS_ORDER.map(
                          (s) =>
                            statusCounts[s] > 0 && (
                              <Tooltip key={s} title={`${STATUS_LABEL[s]}: ${statusCounts[s]}`}>
                                <span className={`eq-pipe-seg st-${s}`} style={{ flexGrow: statusCounts[s] }} />
                              </Tooltip>
                            )
                        )}
                      </div>
                      <span className="eq-pipe-caption">{conversion}% of enquiries confirmed</span>

                      <div className="eq-hero-buttons">
                        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreateModal}>
                          New enquiry
                        </Button>
                        <Tooltip title="Refresh">
                          <Button icon={<ReloadOutlined spin={isLoading} />} size="large" onClick={handleRefresh} />
                        </Tooltip>
                        <Tooltip title="Export current list as CSV">
                          <Button icon={<DownloadOutlined />} size="large" onClick={handleExport} />
                        </Tooltip>
                      </div>
                    </div>

                    <div className="eq-aperture" aria-hidden="true">
                      <span className="eq-ring r1" />
                      <span className="eq-ring r2" />
                      <div className="eq-photo-stack">
                        {enquiriesData.slice(0, 3).map((item) => (
                          <img
                            key={item.id}
                            src={item.image || imageFallback}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.src = imageFallback;
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* ── Stats (click to filter) ── */}
                  <section className="eq-stats">
                    <StatCard
                      icon={<FileTextOutlined />}
                      label="All enquiries"
                      value={total}
                      tone="blue"
                      active={statusFilter === "ALL"}
                      onClick={() => setStatusFilter("ALL")}
                    />
                    <StatCard
                      icon={<EditOutlined />}
                      label="Drafts"
                      value={statusCounts.DRAFT}
                      tone="slate"
                      active={statusFilter === "DRAFT"}
                      onClick={() => setStatusFilter("DRAFT")}
                    />
                    <StatCard
                      icon={<ClockCircleOutlined />}
                      label="Follow-ups"
                      value={statusCounts.FOLLOWUP}
                      tone="yellow"
                      active={statusFilter === "FOLLOWUP"}
                      onClick={() => setStatusFilter("FOLLOWUP")}
                    />
                    <StatCard
                      icon={<CheckCircleOutlined />}
                      label="Confirmed"
                      value={statusCounts.CONFIRMED}
                      tone="green"
                      active={statusFilter === "CONFIRMED"}
                      onClick={() => setStatusFilter("CONFIRMED")}
                    />
                  </section>

                  {/* ── Workspace ── */}
                  <section className="eq-workspace">
                    <div className="eq-toolbar">
                      <div className="eq-toolbar-left">
                        <Input
                          ref={searchRef}
                          className="eq-search"
                          placeholder="Search name, phone, city…"
                          prefix={<SearchOutlined />}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          allowClear
                        />

                        <Select
                          className="eq-city-select"
                          value={cityFilter}
                          onChange={setCityFilter}
                          options={cities.map((city) => ({
                            value: city,
                            label: city === "ALL" ? "All cities" : city,
                          }))}
                        />

                        <Button onClick={clearFilters}>Clear</Button>
                      </div>

                      <div className="eq-toolbar-right">
                        <div className="eq-view-toggle" role="tablist" aria-label="View mode">
                          <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === "table"}
                            className={viewMode === "table" ? "is-on" : ""}
                            onClick={() => setViewMode("table")}
                          >
                            <UnorderedListOutlined /> List
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === "board"}
                            className={viewMode === "board" ? "is-on" : ""}
                            onClick={() => setViewMode("board")}
                          >
                            <AppstoreOutlined /> Board
                          </button>
                        </div>

                        <DeleteButton
                          itemName={`${selectedRowKeys.length} selected enquir${selectedRowKeys.length === 1 ? "y" : "ies"}`}
                          onDelete={handleBulkDelete}
                          disabled={!selectedRowKeys.length}
                        />
                      </div>
                    </div>

                    <div className="eq-chips" role="group" aria-label="Filter by status">
                      <button
                        type="button"
                        className={`eq-chip ${statusFilter === "ALL" ? "is-on" : ""}`}
                        onClick={() => setStatusFilter("ALL")}
                      >
                        All <b>{total}</b>
                      </button>
                      {STATUS_ORDER.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`eq-chip st-${s} ${statusFilter === s ? "is-on" : ""}`}
                          onClick={() => setStatusFilter(s)}
                        >
                          {STATUS_LABEL[s]} <b>{statusCounts[s]}</b>
                        </button>
                      ))}
                    </div>

                    {viewMode === "table" ? (
                      <Table<EnquiryRecord>
                        className="eq-table"
                        columns={columns}
                        dataSource={filteredData}
                        rowKey="id"
                        loading={isLoading}
                        rowSelection={{
                          selectedRowKeys,
                          onChange: (keys) => setSelectedRowKeys(keys as string[]),
                        }}
                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                        scroll={{ x: 980 }}
                        locale={{
                          emptyText: (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="No enquiries match these filters. Clear them or add a new enquiry."
                            />
                          ),
                        }}
                      />
                    ) : (
                      <div className="eq-board" aria-label="Enquiry pipeline board">
                        {STATUS_ORDER.map((col) => {
                          const items = filteredData.filter((e) => e.status === col);
                          return (
                            <div
                              key={col}
                              className={`eq-col st-${col} ${dragOver === col ? "is-over" : ""}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (dragOver !== col) setDragOver(col);
                              }}
                              onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                              }}
                              onDrop={() => handleDrop(col)}
                            >
                              <header className="eq-col-head">
                                <span className="eq-col-dot" />
                                <strong>{STATUS_LABEL[col]}</strong>
                                <em>{items.length}</em>
                              </header>

                              <div className="eq-col-body">
                                {items.length === 0 && <div className="eq-col-empty">Drop an enquiry here</div>}

                                {items.map((e) => (
                                  <article
                                    key={e.id}
                                    className={`eq-card ${dragId === e.id ? "is-dragging" : ""}`}
                                    draggable
                                    onDragStart={() => setDragId(e.id)}
                                    onDragEnd={() => {
                                      setDragId(null);
                                      setDragOver(null);
                                    }}
                                    onClick={() => setViewId(e.id)}
                                  >
                                    <img
                                      src={e.image || imageFallback}
                                      alt=""
                                      draggable={false}
                                      onError={(ev) => {
                                        ev.currentTarget.src = imageFallback;
                                      }}
                                    />
                                    <div className="eq-card-body">
                                      <strong>{e.enquiryName}</strong>
                                      <span className="eq-cell">
                                        <UserOutlined /> {e.customerName}
                                      </span>
                                      <div className="eq-card-foot">
                                        <span className="eq-cell">
                                          <EnvironmentOutlined /> {e.city}
                                        </span>
                                        <CountChip iso={e.eventDate} />
                                      </div>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </Content>
          </Layout>
        </div>

        {/* ── View enquiry ── */}
        <GlassModal open={!!viewEnquiry} width={820} onClose={() => setViewId(null)}>
          {viewEnquiry && (
            <>
              <div className="eq-cover">
                <img
                  src={viewEnquiry.image || imageFallback}
                  alt={viewEnquiry.enquiryName}
                  onError={(e) => {
                    e.currentTarget.src = imageFallback;
                  }}
                />
                <button type="button" className="eq-close" onClick={() => setViewId(null)} aria-label="Close">
                  <CloseOutlined />
                </button>
                <div className="eq-cover-text">
                  <h3 className="eq-display">{viewEnquiry.enquiryName}</h3>
                  <div className="eq-cover-meta">
                    <span className={`eq-pill static st-${viewEnquiry.status}`}>{STATUS_LABEL[viewEnquiry.status]}</span>
                    <CountChip iso={viewEnquiry.eventDate} />
                  </div>
                </div>
              </div>

              <div className="eq-view-body">
                {/* Pipeline stepper */}
                <div className="eq-stepper" role="group" aria-label="Move enquiry through pipeline">
                  {STATUS_FLOW.map((s, i) => {
                    const currentIdx = STATUS_FLOW.indexOf(viewEnquiry.status);
                    const state = viewEnquiry.status === "CANCELLED" ? "idle" : i < currentIdx ? "done" : i === currentIdx ? "now" : "idle";
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`eq-step ${state} st-${s}`}
                        onClick={() => updateStatus(viewEnquiry.id, s)}
                      >
                        <span className="eq-step-dot">{state === "done" ? <CheckCircleOutlined /> : i + 1}</span>
                        {STATUS_LABEL[s]}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`eq-step cancel st-CANCELLED ${viewEnquiry.status === "CANCELLED" ? "now" : "idle"}`}
                    onClick={() => updateStatus(viewEnquiry.id, "CANCELLED")}
                  >
                    Cancelled
                  </button>
                </div>

                <div className="eq-info-grid">
                  <div className="eq-info">
                    <span>
                      <UserOutlined /> Customer
                    </span>
                    <strong>{viewEnquiry.customerName}</strong>
                  </div>
                  <div className="eq-info">
                    <span>
                      <PhoneOutlined /> Phone
                    </span>
                    <strong>{viewEnquiry.phone}</strong>
                  </div>
                  <div className="eq-info">
                    <span>
                      <CalendarOutlined /> Event date
                    </span>
                    <strong>{fmtDate(viewEnquiry.eventDate)}</strong>
                  </div>
                  <div className="eq-info">
                    <span>
                      <EnvironmentOutlined /> City
                    </span>
                    <strong>{viewEnquiry.city}</strong>
                  </div>
                  <div className="eq-info full">
                    <span>
                      <FileTextOutlined /> Notes
                    </span>
                    <p>{viewEnquiry.notes || "No notes added yet."}</p>
                  </div>
                  <div className="eq-info full subtle">
                    <span>
                      Created by {viewEnquiry.createdBy} on {fmtDate(viewEnquiry.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="eq-view-actions">
                  <Button type="primary" icon={<PhoneOutlined />} href={`tel:${viewEnquiry.phone}`}>
                    Call
                  </Button>
                  <Button
                    icon={<WhatsAppOutlined />}
                    href={`https://wa.me/91${viewEnquiry.phone}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </Button>
                  <Button
                    icon={<ClockCircleOutlined />}
                    onClick={() => {
                      setJourneyId(viewEnquiry.id);
                      setViewId(null);
                    }}
                  >
                    Journey
                  </Button>
                  <Button icon={<EditOutlined />} onClick={() => openEditModal(viewEnquiry)}>
                    Edit
                  </Button>
                </div>
              </div>
            </>
          )}
        </GlassModal>

        {/* ── Journey ── */}
        <GlassModal open={!!journeyEnquiry} width={560} onClose={() => setJourneyId(null)}>
          {journeyEnquiry && (
            <div className="eq-journey">
              <div className="eq-form-title">
                <Avatar className="eq-avatar">
                  <ThunderboltOutlined />
                </Avatar>
                <div>
                  <h3 className="eq-display">{journeyEnquiry.enquiryName}</h3>
                  <span className="eq-subtle">Journey so far</span>
                </div>
                <button type="button" className="eq-close inline" onClick={() => setJourneyId(null)} aria-label="Close">
                  <CloseOutlined />
                </button>
              </div>

              <ol className="eq-timeline">
                {[...journeyEnquiry.timeline].reverse().map((entry, i) => (
                  <li key={`${entry.at}-${i}`}>
                    <span className="eq-tl-dot" />
                    <div>
                      <strong>{entry.text}</strong>
                      <small>{dayjs(entry.at).format("MMM DD, h:mm A")}</small>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="eq-note-row">
                <Input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onPressEnter={handleAddNote}
                  placeholder="Add a note, e.g. Called, wants a quote by Friday"
                />
                <Button type="primary" icon={<SendOutlined />} onClick={handleAddNote} disabled={!noteDraft.trim()}>
                  Add note
                </Button>
              </div>
            </div>
          )}
        </GlassModal>

        {/* ── Create / Edit (only Cancel or Save closes it) ── */}
        <GlassModal open={formOpen} width={680} dismissible={false}>
          <div className="eq-form-shell">
            <div className="eq-form-title">
              <Avatar className="eq-avatar">{editEnquiry ? <EditOutlined /> : <PlusOutlined />}</Avatar>
              <h3 className="eq-display">{editEnquiry ? "Edit enquiry" : "Create new enquiry"}</h3>
            </div>

            <Form<EnquiryFormValues> form={form} layout="vertical" className="eq-form" requiredMark>
              <div className="eq-form-grid">
                <Form.Item
                  name="enquiryName"
                  label="Enquiry name"
                  rules={[{ required: true, message: "Enquiry name is required" }]}
                >
                  <Input prefix={<FileTextOutlined />} placeholder="e.g. Priya - Wedding" />
                </Form.Item>

                <Form.Item
                  name="customerName"
                  label="Customer name"
                  rules={[{ required: true, message: "Customer name is required" }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Customer full name" />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label="Phone"
                  rules={[
                    { required: true, message: "Phone number is required" },
                    { pattern: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit mobile number" },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="10-digit mobile number" maxLength={10} />
                </Form.Item>

                <Form.Item
                  name="eventDate"
                  label="Event date"
                  rules={[{ required: true, message: "Event date is required" }]}
                >
                  <DatePicker style={{ width: "100%" }} format={DATE_FMT} placeholder="Pick the event date" />
                </Form.Item>

                <Form.Item name="city" label="City" rules={[{ required: true, message: "City is required" }]}>
                  <Input prefix={<EnvironmentOutlined />} placeholder="Event city" />
                </Form.Item>

                <Form.Item name="status" label="Status" rules={[{ required: true, message: "Status is required" }]}>
                  <Select options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
                </Form.Item>

                <Form.Item
                  name="image"
                  label="Cover image URL"
                  className="eq-form-full"
                  rules={[{ type: "url", message: "Enter a valid image URL" }]}
                >
                  <Input placeholder="https://…" />
                </Form.Item>

                <Form.Item name="notes" label="Notes" className="eq-form-full">
                  <Input.TextArea rows={4} placeholder="Anything the team should know about this enquiry" />
                </Form.Item>
              </div>
            </Form>

            <div className="eq-form-actions">
              <Button className="eq-btn-cancel" onClick={closeFormModal}>
                Cancel
              </Button>
              <Button type="primary" className="eq-btn-save" onClick={handleSaveEnquiry}>
                {editEnquiry ? "Save changes" : "Create enquiry"}
              </Button>
            </div>
          </div>
        </GlassModal>
      </Layout>
    </ConfigProvider>
  );
};

export default EnquiryPage;