import { useEffect, useMemo, useState, useRef } from "react";
import {
  Layout, Typography, Table, Input, Button, Space, ConfigProvider, Tag, Avatar,
  Tabs, Tooltip, Popover, Modal, Form, Select, message, Empty, Divider, Progress,
} from "antd";
import {
  SearchOutlined, ReloadOutlined, UserAddOutlined, FilterOutlined, EyeOutlined,
  EditOutlined, DeleteOutlined, MailOutlined, PhoneOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SendOutlined, UserSwitchOutlined, WarningOutlined,
  EnvironmentOutlined, CalendarOutlined, SaveOutlined, TeamOutlined, LinkOutlined,
  CameraOutlined, AppstoreOutlined, GoogleOutlined, ClockCircleOutlined, StarOutlined,
  CloseOutlined, StarFilled,
} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import "./UsersPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const fallbackImage =
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=900&q=80";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const filterIconMap = {
  All: <AppstoreOutlined />,
  Active: <CheckCircleOutlined />,
  Inactive: <CloseCircleOutlined />,
  Pending: <ClockCircleOutlined />,
  Registered: <UserSwitchOutlined />,
  Google: <GoogleOutlined />,
  Invited: <SendOutlined />,
};

const tabItems = [
  {
    key: "all",
    label: (
      <Tooltip title="All users">
        <span className="tab-icon-label">
          <TeamOutlined />
        </span>
      </Tooltip>
    ),
  },
  {
    key: "referrals",
    label: (
      <Tooltip title="Referrals">
        <span className="tab-icon-label">
          <LinkOutlined />
        </span>
      </Tooltip>
    ),
  },
  {
    key: "photographers",
    label: (
      <Tooltip title="Photographers">
        <span className="tab-icon-label">
          <CameraOutlined />
        </span>
      </Tooltip>
    ),
  },
];

/* ── Persist helpers ── */
const loadLS = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const saveLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

/* ── Gallery photos ── */
const galleryPhotos = [
  { id: 1,  title: "Royal Wedding Frame",  category: "Wedding",   image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400" },
  { id: 2,  title: "Golden Couple Walk",   category: "Wedding",   image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1400" },
  { id: 3,  title: "Classic Portrait",     category: "Portraits", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1400" },
  { id: 4,  title: "Forest Light",         category: "Nature",    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400" },
  { id: 5,  title: "Camera Mood",          category: "Cinematic", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1400" },
  { id: 6,  title: "Bride Detail",         category: "Wedding",   image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1400" },
  { id: 7,  title: "Wedding Rings",        category: "Wedding",   image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1400" },
  { id: 8,  title: "Outdoor Couple",       category: "Wedding",   image: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?q=80&w=1400" },
  { id: 9,  title: "Soft Portrait",        category: "Portraits", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1400" },
  { id: 10, title: "Golden Portrait",      category: "Portraits", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1400" },
  { id: 11, title: "Street Portrait",      category: "Portraits", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1400" },
  { id: 12, title: "Mountain Air",         category: "Nature",    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400" },
  { id: 13, title: "Nature Story",         category: "Nature",    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1400" },
  { id: 14, title: "Wild Hills",           category: "Nature",    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1400" },
  { id: 15, title: "Lake Mirror",          category: "Nature",    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1400" },
  { id: 16, title: "Film Look",            category: "Cinematic", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1400" },
  { id: 17, title: "Night Lens",           category: "Cinematic", image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1400" },
  { id: 18, title: "Studio Shadow",        category: "Cinematic", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1400" },
  { id: 19, title: "Editorial Glow",       category: "Cinematic", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400" },
  { id: 20, title: "Fashion Frame",        category: "Portraits", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1400" },
];

/* ════════════════════════════════════════════
   CINEMATIC FULL-PAGE USER VIEW OVERLAY
════════════════════════════════════════════ */
const UserViewOverlay = ({ user, onClose }) => {
  const [lbPhoto, setLbPhoto] = useState(null);
  const [lbIdx, setLbIdx]     = useState(0);
  const [imgLoaded, setImgLoaded]   = useState(false);
  const scrollRef = useRef(null);

  const starred = loadLS("axsStarredPhotos", []);
  const bestPics = galleryPhotos.filter((p) => starred.includes(p.id));

  const openLb = (photo, idx) => { setLbPhoto(photo); setLbIdx(idx); };
  const prevLb = () => { const i = (lbIdx - 1 + bestPics.length) % bestPics.length; setLbPhoto(bestPics[i]); setLbIdx(i); };
  const nextLb = () => { const i = (lbIdx + 1) % bestPics.length; setLbPhoto(bestPics[i]); setLbIdx(i); };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { if (lbPhoto) setLbPhoto(null); else onClose(); }
      if (e.key === "ArrowLeft"  && lbPhoto) prevLb();
      if (e.key === "ArrowRight" && lbPhoto) nextLb();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lbPhoto, lbIdx]);

  const statusMeta = {
    Active:   { color: "#22c55e", glow: "rgba(34,197,94,0.4)",   label: "Active" },
    Inactive: { color: "#ef4444", glow: "rgba(239,68,68,0.4)",   label: "Inactive" },
    Pending:  { color: "#f59e0b", glow: "rgba(245,158,11,0.4)",  label: "Pending" },
  }[user.status] || { color: "#94a3b8", glow: "rgba(148,163,184,0.3)", label: user.status };

  const signupMeta = {
    Invited:    { color: "#f59e0b", label: "Invited" },
    Google:     { color: "#3b82f6", label: "Google" },
    Registered: { color: "#22c55e", label: "Registered" },
  }[user.signupType] || { color: "#94a3b8", label: user.signupType };

  const infoCards = [
    { icon: <MailOutlined />,        label: "Email",    value: user.email,                         accent: "#38bdf8" },
    { icon: <PhoneOutlined />,       label: "Phone",    value: user.phone,                         accent: "#34d399" },
    { icon: <CameraOutlined />,      label: "Role",     value: user.role,                          accent: "#f59e0b" },
    { icon: <EnvironmentOutlined />, label: "Location", value: user.location || "Wave Studios",    accent: "#a78bfa" },
    { icon: <CalendarOutlined />,    label: "Joined",   value: user.created,                       accent: "#fb923c" },
    { icon: <TeamOutlined />,        label: "Studio",   value: user.studio || "Wave Studios",      accent: "#f472b6" },
    ...(user.shoots !== undefined
      ? [{ icon: <CameraOutlined />, label: "Shoots",   value: `${user.shoots} shoots`,            accent: "#e879f9" }]
      : []),
    { icon: <EditOutlined />,        label: "Notes",    value: user.notes || "—",                  accent: "#94a3b8", wide: true },
  ];

  return (
    <div className="uvo-root">
      {/* ── BACKGROUND LAYERS ── */}
      <div className="uvo-bg-blur">
        <img
          src={user.image || fallbackImage}
          alt=""
          onError={(e) => { e.currentTarget.src = fallbackImage; }}
        />
      </div>
      <div className="uvo-bg-noise" />
      <div className="uvo-bg-vignette" />

      {/* ── FLOATING PARTICLES ── */}
      <div className="uvo-particles" aria-hidden="true">
        {[...Array(18)].map((_, i) => (
          <span key={i} className="uvo-particle" style={{
            "--x": `${Math.random() * 100}%`,
            "--y": `${Math.random() * 100}%`,
            "--d": `${4 + Math.random() * 10}s`,
            "--s": `${2 + Math.random() * 4}px`,
            "--o": `${0.2 + Math.random() * 0.5}`,
          }} />
        ))}
      </div>

      {/* ── CLOSE BUTTON ── */}
      <button className="uvo-x" onClick={onClose} aria-label="Close">
        <CloseOutlined />
      </button>

      {/* ── MAIN PANEL ── */}
      <div className="uvo-panel" ref={scrollRef}>

        {/* LEFT COLUMN — sticky profile card */}
        <aside className="uvo-sidebar">
          <div className="uvo-profile-card">
            {/* Glow ring behind avatar */}
            <div
              className="uvo-avatar-glow"
              style={{ "--gcolor": statusMeta.glow }}
            />

            {/* Profile image (real photo, not just initials) */}
            <div className="uvo-avatar-shell">
              {user.image ? (
                <>
                  <img
                    className={`uvo-profile-img ${imgLoaded ? "loaded" : ""}`}
                    src={user.image}
                    alt={user.name}
                    onLoad={() => setImgLoaded(true)}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextSibling.style.display = "grid";
                    }}
                  />
                  <div className="uvo-profile-fallback" style={{ display: "none" }}>
                    {user.name.charAt(0)}
                  </div>
                </>
              ) : (
                <div className="uvo-profile-fallback">{user.name.charAt(0)}</div>
              )}

              {/* Animated ring */}
              <div className="uvo-ring uvo-ring-1" style={{ "--rc": statusMeta.color }} />
              <div className="uvo-ring uvo-ring-2" style={{ "--rc": statusMeta.color }} />
            </div>

            {/* Name & role */}
            <h1 className="uvo-name">{user.name}</h1>
            <p className="uvo-role-label">{user.role}</p>

            {/* Status badges */}
            <div className="uvo-badge-row">
              <span
                className="uvo-status-badge"
                style={{ "--bc": statusMeta.color, "--bg": statusMeta.glow }}
              >
                {filterIconMap[user.status]} {statusMeta.label}
              </span>
              <span
                className="uvo-signup-badge"
                style={{ "--bc": signupMeta.color }}
              >
                {filterIconMap[user.signupType] || <UserSwitchOutlined />} {signupMeta.label}
              </span>
            </div>

            {/* Score ring */}
            {user.score !== undefined && (
              <div className="uvo-score-wrap">
                <svg className="uvo-score-svg" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" className="uvo-score-track" />
                  <circle
                    cx="40" cy="40" r="34"
                    className="uvo-score-fill"
                    style={{
                      "--dash": `${(user.score / 100) * 213.6}`,
                      "--color": user.score > 75 ? "#22c55e" : user.score > 45 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </svg>
                <div className="uvo-score-inner">
                  <strong>{user.score}</strong>
                  <small>Score</small>
                </div>
              </div>
            )}

            {/* Quick contact links */}
            <div className="uvo-quick-links">
              <a href={`mailto:${user.email}`} className="uvo-quick-btn" title="Send email">
                <MailOutlined />
              </a>
              <a href={`tel:${user.phone}`} className="uvo-quick-btn" title="Call">
                <PhoneOutlined />
              </a>
              <span className="uvo-quick-btn" title="Location">
                <EnvironmentOutlined />
              </span>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN — scrollable: profile + gallery together */}
        <main className="uvo-main">

          {/* ── PROFILE DETAILS ── */}
          <div className="uvo-info-section">
            <div className="uvo-section-header">
              <div className="uvo-section-line" />
              <span>Profile Details</span>
              <div className="uvo-section-line" />
            </div>

            <div className="uvo-info-grid">
              {infoCards.map(({ icon, label, value, accent, wide }, i) => (
                <div
                  key={label}
                  className={`uvo-info-tile ${wide ? "wide" : ""}`}
                  style={{ "--acc": accent, "--delay": `${i * 0.06}s` }}
                >
                  <div className="uvo-tile-icon">{icon}</div>
                  <div className="uvo-tile-text">
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </div>
                  <div className="uvo-tile-glow" />
                </div>
              ))}
            </div>
          </div>

          {/* ── BEST SHOTS GALLERY (always visible below) ── */}
          {bestPics.length > 0 && (
            <div className="uvo-gallery-section">
              <div className="uvo-section-header">
                <div className="uvo-section-line" />
                <span><StarFilled style={{ color: "#f5ba5e", marginRight: 6 }} />Best Shots</span>
                <div className="uvo-section-line" />
              </div>

              <div className="uvo-gallery-grid">
                {bestPics.map((photo, i) => (
                  <button
                    key={photo.id}
                    className="uvo-gallery-tile"
                    style={{ "--delay": `${i * 0.07}s` }}
                    onClick={() => openLb(photo, i)}
                  >
                    <img
                      src={photo.image}
                      alt={photo.title}
                      onError={(e) => { e.currentTarget.src = fallbackImage; }}
                    />
                    <div className="uvo-gallery-overlay">
                      <span className="uvo-gallery-cat">{photo.category}</span>
                      <span className="uvo-gallery-title">{photo.title}</span>
                    </div>
                    <div className="uvo-gallery-star"><StarFilled /></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── LIGHTBOX ── */}
      {lbPhoto && (
        <div
          className="uvo-lb-backdrop"
          onClick={(e) => e.target === e.currentTarget && setLbPhoto(null)}
        >
          <div className="uvo-lb-box">
            <button className="uvo-lb-x" onClick={() => setLbPhoto(null)}><CloseOutlined /></button>
            {bestPics.length > 1 && (
              <>
                <button className="uvo-lb-nav prev" onClick={prevLb}>&#8249;</button>
                <button className="uvo-lb-nav next" onClick={nextLb}>&#8250;</button>
              </>
            )}
            <img src={lbPhoto.image} alt={lbPhoto.title} />
            <div className="uvo-lb-footer">
              <span className="uvo-lb-cat">{lbPhoto.category}</span>
              <h3>{lbPhoto.title}</h3>
              <small>{lbIdx + 1} / {bestPics.length}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [editForm] = Form.useForm();
  const [inviteForm] = Form.useForm();

  const [usersData, setUsersData] = useState([
    {
      id: "1", name: "Kamesh Srikharan.T", email: "kameshsrikharan.t@gmail.com",
      phone: "8888888888", studio: "Wave Studios", role: "Studio Admin",
      status: "Active", signupType: "Registered", created: "06 May 2026",
      location: "Chennai", score: 92,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
      notes: "Manages studio users and booking activity.",
    },
    {
      id: "2", name: "Arun Kumar", email: "arun.photography@gmail.com",
      phone: "9840123456", studio: "Wave Studios", role: "Photographer",
      status: "Active", signupType: "Google", created: "05 May 2026",
      location: "Coimbatore", score: 84,
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
      notes: "Strong candid photography profile.",
    },
    {
      id: "3", name: "Priya", email: "priya.sharma@outlook.com",
      phone: "9123456789", studio: "Wave Studios", role: "Editor",
      status: "Inactive", signupType: "Registered", created: "04 May 2026",
      location: "Bangalore", score: 61,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
      notes: "Editing access currently inactive.",
    },
    {
      id: "4", name: "John", email: "john.d@wavestudios.com",
      phone: "8056123987", studio: "Wave Studios", role: "Photographer",
      status: "Active", signupType: "Registered", created: "03 May 2026",
      location: "Madurai", score: 76,
      image: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=900&q=80",
      notes: "Event photographer.",
    },
    {
      id: "5", name: "Meera", email: "meera.reddy@gmail.com",
      phone: "7012345678", studio: "Wave Studios", role: "Studio Admin",
      status: "Active", signupType: "Google", created: "02 May 2026",
      location: "Salem", score: 88,
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
      notes: "Handles booking operations.",
    },
    {
      id: "6", name: "Vikram", email: "vikram.seth@live.com",
      phone: "9944556677", studio: "Wave Studios", role: "Photographer",
      status: "Pending", signupType: "Registered", created: "01 May 2026",
      location: "Trichy", score: 45,
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80",
      notes: "Pending approval.",
    },
  ]);

  const [referralsData] = useState([
    {
      id: "r1", name: "Referral User", email: "referral@gmail.com",
      phone: "9999999999", studio: "Wave Studios", role: "Referral",
      status: "Active", signupType: "Registered", created: "06 May 2026",
      location: "Chennai", score: 70,
      image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
      notes: "Referral contact.",
    },
  ]);

  const [photographersData, setPhotographersData] = useState([
    {
      id: "p1", name: "Srikharan Kamesh", email: "srikharankamesh@gmail.com",
      phone: "8888888888", role: "Freelance Photographer",
      status: "Active", signupType: "Registered", created: "06 May 2026",
      shoots: 18, location: "Chennai", score: 94,
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
      notes: "Reliable for wedding and event shoots.",
    },
    {
      id: "p2", name: "photo grapher(user-2)", email: "tolewi9752@pertok.com",
      phone: "8383838383", role: "Freelance Photographer",
      status: "Active", signupType: "Invited", created: "05 May 2026",
      shoots: 4, location: "Bangalore", score: 52,
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
      notes: "Invite opened, profile pending.",
    },
    {
      id: "p3", name: "photo grapher(user-1)", email: "velafe9699@mugstock.com",
      phone: "8569742356", role: "Freelance Photographer",
      status: "Active", signupType: "Invited", created: "04 May 2026",
      shoots: 6, location: "Coimbatore", score: 64,
      image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1400",
      notes: "Good candid photographer.",
    },
    {
      id: "p4", name: "photographer-chandran", email: "tosaf14628@soppat.com",
      phone: "5457452158", role: "Freelance Photographer",
      status: "Active", signupType: "Registered", created: "03 May 2026",
      shoots: 24, location: "Madurai", score: 89,
      image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1400",
      notes: "Preferred for outdoor shoots.",
    },
    {
      id: "p5", name: "photographer chandran", email: "netimil194@bmoar.com",
      phone: "3838383678", role: "Freelance Photographer",
      status: "Inactive", signupType: "Invited", created: "02 May 2026",
      shoots: 2, location: "Trichy", score: 35,
      image: "https://images.unsplash.com/photo-1528892952291-009c663ce843?q=80&w=1400",
      notes: "Needs follow up.",
    },
    {
      id: "p6", name: "ley opo", email: "leyopoj378@spotshops.com",
      phone: "9840203148", role: "Freelance Photographer",
      status: "Pending", signupType: "Registered", created: "01 May 2026",
      shoots: 0, location: "Salem", score: 25,
      image: "https://images.unsplash.com/photo-1554080353-a576cf803bda?q=80&w=1400",
      notes: "New profile under review.",
    },
  ]);

  useEffect(() => {
    if (editUser) editForm.setFieldsValue(editUser);
  }, [editUser, editForm]);

  const currentData = useMemo(() => {
    if (activeTab === "referrals") return referralsData;
    if (activeTab === "photographers") return photographersData;
    return usersData;
  }, [activeTab, referralsData, photographersData, usersData]);

  const filterOptions = useMemo(() => {
    if (activeTab !== "photographers") {
      return ["All", "Active", "Inactive", "Pending", "Registered", "Google"];
    }
    return ["All", "Active", "Inactive", "Pending", "Registered", "Invited"];
  }, [activeTab]);

  const filterCounts = useMemo(() => {
    return filterOptions.reduce((acc, filter) => {
      acc[filter] = filter === "All"
        ? currentData.length
        : currentData.filter((item) => item.status === filter || item.signupType === filter).length;
      return acc;
    }, {});
  }, [currentData, filterOptions]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return currentData.filter((user) => {
      const matchesSearch = !term || Object.values(user).some((value) =>
        String(value).toLowerCase().includes(term)
      );
      const matchesFilter = activeFilter === "All" ||
        user.status === activeFilter || user.signupType === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [currentData, searchTerm, activeFilter]);

  const highlightText = (value) => {
    if (!searchTerm.trim()) return value;
    const regex = new RegExp(`(${escapeRegExp(searchTerm.trim())})`, "gi");
    const parts = String(value).split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.trim().toLowerCase() ? (
        <mark className="search-highlight" key={`${part}-${index}`}>{part}</mark>
      ) : part
    );
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); message.success("Users refreshed"); }, 800);
  };

  const handleEditSave = (values) => {
    const updatedValues = {
      ...values,
      shoots: values.shoots === undefined ? values.shoots : Number(values.shoots),
      score: values.score === undefined ? values.score : Number(values.score),
    };
    if (editUser.id.startsWith("p")) {
      setPhotographersData((prev) =>
        prev.map((item) => item.id === editUser.id ? { ...item, ...updatedValues } : item)
      );
    } else {
      setUsersData((prev) =>
        prev.map((item) => item.id === editUser.id ? { ...item, ...updatedValues } : item)
      );
    }
    setEditUser(null);
    message.success("Saved");
  };

  const handleDeleteConfirm = () => {
    if (deleteUser.id.startsWith("p")) {
      setPhotographersData((prev) => prev.filter((item) => item.id !== deleteUser.id));
    } else {
      setUsersData((prev) => prev.filter((item) => item.id !== deleteUser.id));
    }
    setSelectedRowKeys((prev) => prev.filter((key) => key !== deleteUser.id));
    message.success("Deleted");
    setDeleteUser(null);
  };

  const handleBulkDelete = () => {
    setPhotographersData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)));
    message.success("Deleted");
    setSelectedRowKeys([]);
    setBulkDeleteOpen(false);
  };

  const handleBulkStatus = (status) => {
    setPhotographersData((prev) =>
      prev.map((item) => selectedRowKeys.includes(item.id) ? { ...item, status } : item)
    );
    message.success("Updated");
  };

  const handleBulkSignup = () => {
    setPhotographersData((prev) =>
      prev.map((item) => selectedRowKeys.includes(item.id) ? { ...item, signupType: "Invited" } : item)
    );
    message.success("Invited");
  };

  const handleInvite = (values) => {
    const isPhotographer = activeTab === "photographers";
    const newUser = {
      id: `${isPhotographer ? "p" : "u"}${Date.now()}`,
      name: values.name, email: values.email, phone: values.phone,
      studio: "Wave Studios",
      role: isPhotographer ? "Freelance Photographer" : values.role,
      status: "Pending", signupType: "Invited", created: "18 May 2026",
      shoots: 0, location: values.location || "Chennai", score: 10,
      image: values.image || fallbackImage, notes: "Invited from users page.",
    };
    if (isPhotographer) setPhotographersData((prev) => [newUser, ...prev]);
    else setUsersData((prev) => [newUser, ...prev]);
    inviteForm.resetFields();
    setInviteOpen(false);
    message.success("Invite sent");
  };

  const renderStatusTag = (status) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`status-dot status-${status.toLowerCase()}`}>
        {filterIconMap[status]} {status}
      </Tag>
    </Tooltip>
  );

  const renderSignupTag = (text) => (
    <Tooltip title={`Signup: ${text}`}>
      <Tag className={text === "Invited" ? "signup-dot invited" : "signup-dot"}>
        {filterIconMap[text] || <UserSwitchOutlined />} {text}
      </Tag>
    </Tooltip>
  );

  const actionColumn = {
    title: "Actions",
    key: "actions",
    fixed: "right",
    width: 132,
    render: (_, record) => (
      <Space size={6} className="photographer-actions">
        <Tooltip title="View profile">
          <Button type="text" icon={<EyeOutlined />} className="circle-action view-action"
            onClick={() => setViewUser(record)} />
        </Tooltip>
        <Tooltip title="Edit profile">
          <Button type="text" icon={<EditOutlined />} className="circle-action edit-action"
            onClick={() => setEditUser(record)} />
        </Tooltip>
        <Tooltip title="Delete profile">
          <Button type="text" icon={<DeleteOutlined />} className="circle-action delete-action"
            onClick={() => setDeleteUser(record)} />
        </Tooltip>
      </Space>
    ),
  };

  const commonColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 220,
      render: (text, record) => (
        <div className="clean-user-cell" onClick={() => setViewUser(record)} style={{ cursor: "pointer" }}>
          <Avatar className="name-avatar">{text.charAt(0)}</Avatar>
          <div>
            <Tooltip title={record.name}>
              <strong>{highlightText(text)}</strong>
            </Tooltip>
            <span>
              {activeTab === "photographers" ? <CameraOutlined /> : <TeamOutlined />}
              {record.role}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 230,
      render: (text) => (
        <Tooltip title={text}>
          <span className="muted-cell">{highlightText(text)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 140,
      render: (text) => (
        <Tooltip title={text}>
          <span className="muted-cell">{highlightText(text)}</span>
        </Tooltip>
      ),
    },
  ];

  const usersColumns = [
    ...commonColumns,
    {
      title: "Studio",
      dataIndex: "studio",
      key: "studio",
      width: 130,
      render: (text) => (
        <Tag className="text-pill">
          <EnvironmentOutlined /> {text}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: renderStatusTag,
    },
    {
      title: "Signup",
      dataIndex: "signupType",
      key: "signupType",
      width: 110,
      render: renderSignupTag,
    },
    {
      title: "Created",
      dataIndex: "created",
      key: "created",
      sorter: true,
      width: 130,
      render: (text) => (
        <Tag className="text-pill">
          <CalendarOutlined /> {text}
        </Tag>
      ),
    },
    actionColumn,
  ];

  const photographersColumns = [
    ...commonColumns,
    {
      title: "Shoots",
      dataIndex: "shoots",
      key: "shoots",
      width: 100,
      render: (shoots) => (
        <Tooltip title={`${shoots ?? 0} shoots`}>
          <Tag className="shoot-chip">
            <CameraOutlined /> {shoots ?? 0}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: renderStatusTag,
    },
    {
      title: "Signup",
      dataIndex: "signupType",
      key: "signupType",
      width: 110,
      render: renderSignupTag,
    },
    {
      title: "Created",
      dataIndex: "created",
      key: "created",
      sorter: true,
      width: 130,
      render: (text) => (
        <Tag className="text-pill">
          <CalendarOutlined /> {text}
        </Tag>
      ),
    },
    actionColumn,
  ];

  const filterMenu = (
    <div className="filter-popover-panel">
      <div className="filter-popover-list">
        {filterOptions.map((filter) => (
          <Tooltip title={filter} key={filter}>
            <Button
              type={activeFilter === filter ? "primary" : "text"}
              icon={filterIconMap[filter]}
              onClick={() => { setActiveFilter(filter); setFilterOpen(false); }}
            >
              {filterCounts[filter] || 0}
            </Button>
          </Tooltip>
        ))}
      </div>
    </div>
  );

  const columns = activeTab === "photographers" ? photographersColumns : usersColumns;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#3b82f6", borderRadius: 14 } }}>
      <Layout className="dashboard-page dashboard-dark review-page user-visual-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell user-shell">
            <Header className="dashboard-navbar review-navbar user-navbar">
              <div className="user-mini-stats">
                <Tooltip title="Visible users">
                  <span><TeamOutlined /> {filteredData.length}</span>
                </Tooltip>
                <Tooltip title="Active users">
                  <span><CheckCircleOutlined /> {filterCounts.Active || 0}</span>
                </Tooltip>
              </div>
            </Header>

            <Content className="dashboard-content review-content user-content">
              <div className="users-page-heading">
                <Title level={2}>Users</Title>
              </div>

              <div className="table-wrapper animated-panel user-panel-container">
                <div className="user-hero-strip">
                  <div>
                    <span className="hero-mini-pill">
                      <TeamOutlined /> Studio People Board
                    </span>
                    <Title level={2}>Users</Title>
                    <Text>
                      Manage users, referrals and photographers with clean rows,
                      icon headers, smart filters and visual profile details.
                    </Text>
                  </div>
                  {activeTab === "photographers" && (
                    <div className="hero-face-stack">
                      {filteredData.slice(0, 4).map((item) => (
                        <Tooltip title={item.name} key={item.id}>
                          <img src={item.image || fallbackImage} alt={item.name}
                            onError={(e) => { e.currentTarget.src = fallbackImage; }} />
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>

                <Tabs
                  activeKey={activeTab}
                  onChange={(key) => {
                    setActiveTab(key);
                    setSearchTerm("");
                    setActiveFilter("All");
                    setSelectedRowKeys([]);
                  }}
                  className="user-tabs-glass"
                  items={tabItems}
                />

                <div className="smart-filter-row">
                  <div className="smart-filter-row">
                    {filterOptions.map((filter) => (
                      <Tooltip title={filter} key={filter}>
                        <button
                          type="button"
                          className={`smart-chip ${activeFilter === filter ? "active" : ""}`}
                          onClick={() => setActiveFilter(filter)}
                        >
                          {filterIconMap[filter]}
                          <b>{filterCounts[filter] || 0}</b>
                        </button>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="review-toolbar user-toolbar-inline">
                    <Space size="middle" wrap>
                      <Input
                        placeholder="Search"
                        prefix={<SearchOutlined />}
                        className="review-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        allowClear
                      />
                      <Popover
                        open={filterOpen}
                        onOpenChange={setFilterOpen}
                        content={filterMenu}
                        trigger="click"
                        placement="bottomLeft"
                      >
                        <Tooltip title="Filter">
                          <Button type="text" icon={<FilterOutlined />} className="icon-btn-glass" />
                        </Tooltip>
                      </Popover>
                      <Tooltip title="Refresh">
                        <Button type="text" icon={<ReloadOutlined spin={isLoading} />}
                          onClick={handleRefresh} className="icon-btn-glass" />
                      </Tooltip>
                    </Space>

                    <Space wrap>
                      {activeTab === "photographers" && selectedRowKeys.length > 0 && (
                        <div className="bulk-action-bar">
                          <b>{selectedRowKeys.length}</b>
                          <Tooltip title="Mark active">
                            <Button type="text" icon={<CheckCircleOutlined />}
                              className="bulk-icon-btn active-bulk"
                              onClick={() => handleBulkStatus("Active")} />
                          </Tooltip>
                          <Tooltip title="Mark inactive">
                            <Button type="text" icon={<CloseCircleOutlined />}
                              className="bulk-icon-btn inactive-bulk"
                              onClick={() => handleBulkStatus("Inactive")} />
                          </Tooltip>
                          <Tooltip title="Mark invited">
                            <Button type="text" icon={<SendOutlined />}
                              className="bulk-icon-btn invite-bulk"
                              onClick={handleBulkSignup} />
                          </Tooltip>
                          <Tooltip title="Delete selected">
                            <Button type="text" icon={<DeleteOutlined />}
                              className="bulk-icon-btn delete-bulk"
                              onClick={() => setBulkDeleteOpen(true)} />
                          </Tooltip>
                        </div>
                      )}
                      <Tooltip title="Invite user">
                        <Button type="primary" icon={<UserAddOutlined />}
                          className="invite-btn-styled" onClick={() => setInviteOpen(true)} />
                      </Tooltip>
                    </Space>
                  </div>

                  <Table
                    columns={columns}
                    dataSource={filteredData}
                    pagination={false}
                    className="review-table user-table-custom photographers-hover-table"
                    rowKey="id"
                    rowSelection={
                      activeTab === "photographers"
                        ? { selectedRowKeys, onChange: setSelectedRowKeys }
                        : undefined
                    }
                    scroll={{ x: 1100 }}
                    locale={{
                      emptyText: (
                        <Empty description="No matching users" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ),
                    }}
                  />
                </div>

                <div className="footer-copyright">
                  <Text>© AXS</Text>
                </div>
              </div>
            </Content>
          </Layout>
        </div>

        {/* ── CINEMATIC FULL-PAGE VIEW OVERLAY ── */}
        {viewUser && (
          <UserViewOverlay user={viewUser} onClose={() => setViewUser(null)} />
        )}

        {/* Edit Modal */}
        <Modal open={!!editUser} onCancel={() => setEditUser(null)} footer={null}
          width={660} title={null} className="creative-modal edit-modal" centered>
          {editUser && (
            <div className="modal-shell">
              <div className="modal-title-row">
                <Avatar className="modal-small-avatar"><EditOutlined /></Avatar>
                <Title level={3}>Edit</Title>
              </div>
              <Form form={editForm} layout="vertical" onFinish={handleEditSave}>
                <div className="edit-form-grid">
                  <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="role" label="Role">
                    <Select options={[
                      { value: "Studio Admin", label: "Studio Admin" },
                      { value: "Freelance Photographer", label: "Freelance Photographer" },
                      { value: "Photographer", label: "Photographer" },
                      { value: "Editor", label: "Editor" },
                      { value: "Lead Photographer", label: "Lead Photographer" },
                    ]} />
                  </Form.Item>
                  <Form.Item name="status" label="Status">
                    <Select options={[
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" },
                      { value: "Pending", label: "Pending" },
                    ]} />
                  </Form.Item>
                  <Form.Item name="signupType" label="Signup">
                    <Select options={[
                      { value: "Registered", label: "Registered" },
                      { value: "Invited", label: "Invited" },
                      { value: "Google", label: "Google" },
                    ]} />
                  </Form.Item>
                  <Form.Item name="location" label="Location"><Input /></Form.Item>
                  <Form.Item name="shoots" label="Shoots"><Input type="number" /></Form.Item>
                  <Form.Item name="score" label="Score"><Input type="number" min={0} max={100} /></Form.Item>
                  <Form.Item name="image" label="Image URL" className="edit-notes-field"><Input /></Form.Item>
                  <Form.Item name="notes" label="Notes" className="edit-notes-field">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                </div>
                <div className="modal-action-row">
                  <Button onClick={() => setEditUser(null)}>Cancel</Button>
                  <Button htmlType="submit" type="primary" icon={<SaveOutlined />} className="invite-btn-styled" />
                </div>
              </Form>
            </div>
          )}
        </Modal>

        {/* Invite Modal */}
        <Modal open={inviteOpen} onCancel={() => setInviteOpen(false)} footer={null}
          width={580} title={null} className="creative-modal edit-modal" centered>
          <div className="modal-shell">
            <div className="modal-title-row">
              <Avatar className="modal-small-avatar"><UserAddOutlined /></Avatar>
              <Title level={3}>Invite</Title>
            </div>
            <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
              <div className="edit-form-grid">
                <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}><Input /></Form.Item>
                <Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item name="role" label="Role" initialValue="Photographer">
                  <Select options={[
                    { value: "Studio Admin", label: "Studio Admin" },
                    { value: "Photographer", label: "Photographer" },
                    { value: "Editor", label: "Editor" },
                  ]} />
                </Form.Item>
                <Form.Item name="location" label="Location"><Input /></Form.Item>
                <Form.Item name="image" label="Image URL"><Input /></Form.Item>
              </div>
              <div className="modal-action-row">
                <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button htmlType="submit" type="primary" icon={<SendOutlined />} className="invite-btn-styled" />
              </div>
            </Form>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal open={!!deleteUser} onCancel={() => setDeleteUser(null)} footer={null}
          width={430} title={null} className="creative-modal delete-modal" centered>
          {deleteUser && (
            <div className="modal-shell delete-modal-shell">
              <div className="delete-warning-icon"><WarningOutlined /></div>
              <Avatar size={58} className="delete-avatar">{deleteUser.name.charAt(0)}</Avatar>
              <Title level={3}>{deleteUser.name}</Title>
              <div className="modal-action-row delete-actions-row">
                <Button onClick={() => setDeleteUser(null)}>Cancel</Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleDeleteConfirm} />
              </div>
            </div>
          )}
        </Modal>

        {/* Bulk Delete Modal */}
        <Modal open={bulkDeleteOpen} onCancel={() => setBulkDeleteOpen(false)} footer={null}
          width={430} title={null} className="creative-modal delete-modal" centered>
          <div className="modal-shell delete-modal-shell">
            <div className="delete-warning-icon"><WarningOutlined /></div>
            <Title level={3}>{selectedRowKeys.length} selected</Title>
            <div className="modal-action-row delete-actions-row">
              <Button onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete} />
            </div>
          </div>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default UsersPage;