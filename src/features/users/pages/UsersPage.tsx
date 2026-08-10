import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import {Layout,Typography,Table,Input,Button,Space,ConfigProvider,Tag,Avatar,Tabs,Tooltip,Popover,Form,Select,message,Empty,Badge,} from "antd";
import type { ColumnsType } from "antd/es/table";
import {SearchOutlined,ReloadOutlined,UserAddOutlined,FilterOutlined,EyeOutlined,EditOutlined,MailOutlined,PhoneOutlined,CheckCircleOutlined,CloseCircleOutlined,SendOutlined,UserSwitchOutlined,EnvironmentOutlined,CalendarOutlined,SaveOutlined,TeamOutlined,LinkOutlined,CameraOutlined,AppstoreOutlined,GoogleOutlined,ClockCircleOutlined,StarOutlined,CloseOutlined,StarFilled,RobotOutlined,LoadingOutlined,BulbOutlined,} from "@ant-design/icons";
import Sidebar from "../../../components/UI/Sidebar";
import DeleteButton from "../../../components/common/DeleteButton";
import "./UsersPage.css";

const { Header, Content } = Layout;
const { Title, Text } = Typography;


/*  Types */

type UserStatus = "Active" | "Inactive" | "Pending";
type SignupType = "Registered" | "Google" | "Invited";
type TabKey = "all" | "referrals" | "photographers";
type FilterKey = "All" | UserStatus | SignupType;
type DatePeriod = "today" | "week" | "month" | "year";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  studio?: string;
  role: string;
  status: UserStatus;
  signupType: SignupType;
  created: string;
  location?: string;
  image?: string;
  notes?: string;
  shoots?: number;
}

interface GalleryPhoto {
  id: number;
  title: string;
  category: string;
  image: string;
}

interface InviteFormValues {
  name: string;
  email: string;
  phone: string;
  role?: string;
  location?: string;
  image?: string;
}

interface EditFormValues {
  name: string;
  email: string;
  phone: string;
  role?: string;
  status: UserStatus;
  signupType: SignupType;
  location?: string;
  shoots?: number | string;
  image?: string;
  notes?: string;
}

interface AdvancedFilters {
  roles: string[];
  status?: UserStatus;
  inviteStatus?: SignupType;
  period?: DatePeriod;
}

const emptyAdvancedFilters: AdvancedFilters = {
  roles: [],
  status: undefined,
  inviteStatus: undefined,
  period: undefined,
};

/*  Constants / helpers                                                       */


const fallbackImage =
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=900&q=80";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchesDatePeriod = (dateStr: string, period: DatePeriod): boolean => {
  const created = new Date(dateStr);
  if (isNaN(created.getTime())) return true;
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  switch (period) {
    case "today":
      return created.toDateString() === now.toDateString();
    case "week":
      return diffDays >= 0 && diffDays <= 7;
    case "month":
      return diffDays >= 0 && diffDays <= 30;
    case "year":
      return created.getFullYear() === now.getFullYear();
    default:
      return true;
  }
};

const filterIconMap: Record<string, ReactNode> = {
  All: <AppstoreOutlined />,
  Active: <CheckCircleOutlined />,
  Inactive: <CloseCircleOutlined />,
  Pending: <ClockCircleOutlined />,
  Registered: <UserSwitchOutlined />,
  Google: <GoogleOutlined />,
  Invited: <SendOutlined />,
};

const tabItems: { key: TabKey; label: ReactNode }[] = [
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

const loadLS = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

const saveLS = <T,>(key: string, val: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
};

const galleryPhotos: GalleryPhoto[] = [
  { id: 1, title: "Royal Wedding Frame", category: "Wedding", image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400" },
  { id: 2, title: "Golden Couple Walk", category: "Wedding", image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1400" },
  { id: 3, title: "Classic Portrait", category: "Portraits", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1400" },
  { id: 4, title: "Forest Light", category: "Nature", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400" },
  { id: 5, title: "Camera Mood", category: "Cinematic", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1400" },
  { id: 6, title: "Bride Detail", category: "Wedding", image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1400" },
  { id: 7, title: "Wedding Rings", category: "Wedding", image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1400" },
  { id: 8, title: "Outdoor Couple", category: "Wedding", image: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?q=80&w=1400" },
  { id: 9, title: "Soft Portrait", category: "Portraits", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1400" },
  { id: 10, title: "Golden Portrait", category: "Portraits", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80" },
  { id: 11, title: "Street Portrait", category: "Portraits", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1400" },
  { id: 12, title: "Mountain Air", category: "Nature", image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400" },
  { id: 13, title: "Nature Story", category: "Nature", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1400" },
  { id: 14, title: "Wild Hills", category: "Nature", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1400" },
  { id: 15, title: "Lake Mirror", category: "Nature", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1400" },
  { id: 16, title: "Film Look", category: "Cinematic", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1400" },
  { id: 17, title: "Night Lens", category: "Cinematic", image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1400" },
  { id: 18, title: "Studio Shadow", category: "Cinematic", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1400" },
  { id: 19, title: "Editorial Glow", category: "Cinematic", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400" },
  { id: 20, title: "Fashion Frame", category: "Portraits", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1400" },
];


/*  CustomModal — replaces antd Modal entirely, uses the neon-glass tokens    */


interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

const CustomModal = ({ open, onClose, width = 620, children }: CustomModalProps) => {
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
      <div className="cm-panel creative-modal" style={{ maxWidth: width }}>
        <button className="cm-close" onClick={onClose} aria-label="Close">
          <CloseOutlined />
        </button>
        {children}
      </div>
    </div>
  );
};


/*  AILightbox                                                                 */


interface AILightboxProps {
  photos: GalleryPhoto[];
  initialIdx: number;
  onClose: () => void;
  onStar: (id: number) => void;
  starredIds: number[];
}

const AILightbox = ({ photos, initialIdx, onClose, onStar, starredIds }: AILightboxProps) => {
  const [idx, setIdx] = useState<number>(initialIdx);
  const [aiText, setAiText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  const current = photos[idx];

  const prev = () => {
    setIdx((i) => (i - 1 + photos.length) % photos.length);
    setAiText("");
    setImgLoaded(false);
  };
  const next = () => {
    setIdx((i) => (i + 1) % photos.length);
    setAiText("");
    setImgLoaded(false);
  };

  const fetchInsight = useCallback(async () => {
    if (!current) return;
    setAiLoading(true);
    setAiError(false);
    setAiText("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `You are a creative photography critic and storyteller. The photo is titled "${current.title}" and categorized as "${current.category}". Write a short, poetic, vivid 2–3 sentence insight about what this photo likely captures — its mood, composition, and emotional resonance. Be cinematic and evocative. No bullet points. No preamble. Just the insight.`,
            },
          ],
        }),
      });
      const data = await res.json();
      const text: string = data?.content?.[0]?.text || "";
      setAiText(text);
    } catch {
      setAiError(true);
    }
    setAiLoading(false);
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!current) return null;
  const isStarred = starredIds.includes(current.id);

  return (
    <div className="ailb-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ailb-shell">
        <button className="ailb-x" onClick={onClose}>
          <CloseOutlined />
        </button>

        {photos.length > 1 && (
          <>
            <button className="ailb-nav ailb-prev" onClick={prev}>
              &#8249;
            </button>
            <button className="ailb-nav ailb-next" onClick={next}>
              &#8250;
            </button>
          </>
        )}

        <div className="ailb-image-pane">
          <div className={`ailb-img-wrap ${imgLoaded ? "loaded" : ""}`}>
            <img
              key={current.id}
              src={current.image}
              alt={current.title}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                e.currentTarget.src = fallbackImage;
                setImgLoaded(true);
              }}
            />
            {!imgLoaded && <div className="ailb-img-skeleton" />}
          </div>

          <div className="ailb-img-footer">
            <span className="ailb-counter">
              {idx + 1} / {photos.length}
            </span>
            <button
              className={`ailb-star-btn ${isStarred ? "starred" : ""}`}
              onClick={() => onStar(current.id)}
            >
              {isStarred ? <StarFilled /> : <StarOutlined />}
              {isStarred ? "Starred" : "Star"}
            </button>
          </div>
        </div>

        <div className="ailb-info-pane">
          <div className="ailb-info-top">
            <span className="ailb-cat-pill">{current.category}</span>
            <h2 className="ailb-title">{current.title}</h2>
          </div>

          <div className="ailb-divider" />

          <div className="ailb-ai-section">
            <div className="ailb-ai-header">
              <RobotOutlined />
              <span>AI Insight</span>
            </div>

            {!aiText && !aiLoading && !aiError && (
              <button className="ailb-ai-btn" onClick={fetchInsight}>
                <BulbOutlined /> Generate Insight
              </button>
            )}

            {aiLoading && (
              <div className="ailb-ai-loading">
                <LoadingOutlined spin />
                <span>Analysing composition...</span>
              </div>
            )}

            {aiError && (
              <div className="ailb-ai-error">
                <span>Could not connect. </span>
                <button onClick={fetchInsight}>Retry</button>
              </div>
            )}

            {aiText && <p className="ailb-ai-text">{aiText}</p>}
          </div>

          <div className="ailb-thumbs">
            {photos.map((p, i) => (
              <button
                key={p.id}
                className={`ailb-thumb ${i === idx ? "active" : ""}`}
                onClick={() => {
                  setIdx(i);
                  setAiText("");
                  setImgLoaded(false);
                }}
              >
                <img
                  src={p.image}
                  alt={p.title}
                  onError={(e) => {
                    e.currentTarget.src = fallbackImage;
                  }}
                />
                {starredIds.includes(p.id) && (
                  <span className="ailb-thumb-star">
                    <StarFilled />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


/*  UserViewOverlay                                                            */

interface UserViewOverlayProps {
  user: UserRecord;
  onClose: () => void;
}

interface InfoItem {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent: string;
}

const UserViewOverlay = ({ user, onClose }: UserViewOverlayProps) => {
  const [starredIds, setStarredIds] = useState<number[]>(() => loadLS<number[]>("axsStarredPhotos", []));
  const [lbOpen, setLbOpen] = useState<boolean>(false);
  const [lbIdx, setLbIdx] = useState<number>(0);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("All");

  useEffect(() => {
    saveLS<number[]>("axsStarredPhotos", starredIds);
  }, [starredIds]);

  const toggleStar = (id: number) => {
    setStarredIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const categories = useMemo(() => {
    const cats = [...new Set(galleryPhotos.map((p) => p.category))];
    return ["All", ...cats];
  }, []);

  const filteredPhotos = useMemo(() => {
    const base =
      activeFilter === "All" ? galleryPhotos : galleryPhotos.filter((p) => p.category === activeFilter);
    const starred = base.filter((p) => starredIds.includes(p.id));
    const rest = base.filter((p) => !starredIds.includes(p.id));
    return [...starred, ...rest];
  }, [activeFilter, starredIds]);

  const openLb = (photo: GalleryPhoto) => {
    const idx = filteredPhotos.findIndex((p) => p.id === photo.id);
    setLbIdx(idx >= 0 ? idx : 0);
    setLbOpen(true);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lbOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbOpen]);

  const statusMetaMap: Record<UserStatus, { color: string; glow: string; label: string }> = {
    Active: { color: "#22c55e", glow: "rgba(34,197,94,0.4)", label: "Active" },
    Inactive: { color: "#ef4444", glow: "rgba(239,68,68,0.4)", label: "Inactive" },
    Pending: { color: "#f59e0b", glow: "rgba(245,158,11,0.4)", label: "Pending" },
  };
  const statusMeta = statusMetaMap[user.status] || {
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.3)",
    label: user.status,
  };

  const signupMetaMap: Record<SignupType, { color: string; label: string }> = {
    Invited: { color: "#f59e0b", label: "Invited" },
    Google: { color: "#3b82f6", label: "Google" },
    Registered: { color: "#22c55e", label: "Registered" },
  };
  const signupMeta = signupMetaMap[user.signupType] || { color: "#94a3b8", label: user.signupType };

  const infoItems: InfoItem[] = [
    { icon: <MailOutlined />, label: "Email", value: user.email, accent: "#38bdf8" },
    { icon: <PhoneOutlined />, label: "Phone", value: user.phone, accent: "#34d399" },
    { icon: <CameraOutlined />, label: "Role", value: user.role, accent: "#f59e0b" },
    { icon: <EnvironmentOutlined />, label: "Location", value: user.location || "Wave Studios", accent: "#a78bfa" },
    { icon: <CalendarOutlined />, label: "Joined", value: user.created, accent: "#fb923c" },
    { icon: <TeamOutlined />, label: "Studio", value: user.studio || "Wave Studios", accent: "#f472b6" },
    ...(user.shoots !== undefined
      ? [{ icon: <CameraOutlined />, label: "Shoots", value: `${user.shoots} shoots`, accent: "#e879f9" }]
      : []),
    { icon: <EditOutlined />, label: "Notes", value: user.notes || "—", accent: "#94a3b8" },
  ];

  return (
    <>
      <div className="uvo-root">
        <div className="uvo-bg-blur">
          <img
            src={user.image || fallbackImage}
            alt=""
            onError={(e) => {
              e.currentTarget.src = fallbackImage;
            }}
          />
        </div>
        <div className="uvo-bg-noise" />
        <div className="uvo-bg-vignette" />

        <div className="uvo-particles" aria-hidden="true">
          {[...Array(22)].map((_, i) => (
            <span
              key={i}
              className="uvo-particle"
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

        <div className="uvo-orbital-bg" aria-hidden="true">
          <div className="uvo-orb uvo-orb-1" />
          <div className="uvo-orb uvo-orb-2" />
          <div className="uvo-orb uvo-orb-3" />
        </div>

        <button className="uvo-x" onClick={onClose} aria-label="Close">
          <CloseOutlined />
        </button>

        <div className="uvo-panel">
          <aside className="uvo-drawer">
            <div className="uvo-profile-visual">
              <div className="uvo-avatar-glow" style={{ "--gcolor": statusMeta.glow } as React.CSSProperties} />

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
                        const fallback = e.currentTarget.nextSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "grid";
                      }}
                    />
                    <div className="uvo-profile-fallback" style={{ display: "none" }}>
                      {user.name.charAt(0)}
                    </div>
                  </>
                ) : (
                  <div className="uvo-profile-fallback">{user.name.charAt(0)}</div>
                )}
                <div className="uvo-ring uvo-ring-1" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
                <div className="uvo-ring uvo-ring-2" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
                <div className="uvo-ring uvo-ring-3" style={{ "--rc": statusMeta.color } as React.CSSProperties} />
              </div>

              <h1 className="uvo-name">{user.name}</h1>
              <p className="uvo-role-label">{user.role}</p>

              <div className="uvo-badge-row">
                <Tooltip title={`Status: ${statusMeta.label}`}>
                  <span
                    className="uvo-status-badge icon-only"
                    style={{ "--bc": statusMeta.color, "--bg": statusMeta.glow } as React.CSSProperties}
                  >
                    {filterIconMap[user.status]}
                  </span>
                </Tooltip>
                <Tooltip title={`Signup: ${signupMeta.label}`}>
                  <span className="uvo-signup-badge icon-only" style={{ "--bc": signupMeta.color } as React.CSSProperties}>
                    {filterIconMap[user.signupType] || <UserSwitchOutlined />}
                  </span>
                </Tooltip>
              </div>
            </div>

            <div className="uvo-info-grid">
              {infoItems.map(({ icon, label, value, accent }) => (
                <div key={label} className="uvo-info-card" style={{ "--acc": accent } as React.CSSProperties}>
                  <div className="uvo-info-icon">{icon}</div>
                  <div className="uvo-info-text">
                    <small>{label}</small>
                    <strong title={String(value)}>{value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="uvo-gallery-pane">
            <div className="uvo-cat-strip">
              <div className="uvo-cat-inner">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`uvo-cat-pill ${activeFilter === cat ? "active" : ""}`}
                    onClick={() => setActiveFilter(cat)}
                  >
                    {cat}
                    {cat !== "All" && (
                      <span className="uvo-cat-count">
                        {galleryPhotos.filter((p) => p.category === cat).length}
                      </span>
                    )}
                  </button>
                ))}
                <span className="uvo-gallery-note">
                  <StarFilled style={{ color: "#f5ba5e", fontSize: 11 }} /> starred first
                </span>
              </div>
            </div>

            <div className="uvo-mosaic">
              {filteredPhotos.map((photo, i) => {
                const isStarred = starredIds.includes(photo.id);
                return (
                  <button
                    key={photo.id}
                    className={`uvo-mosaic-tile ${isStarred ? "is-starred" : ""}`}
                    style={{ "--delay": `${i * 0.04}s` } as React.CSSProperties}
                    onClick={() => openLb(photo)}
                  >
                    <img
                      src={photo.image}
                      alt={photo.title}
                      onError={(e) => {
                        e.currentTarget.src = fallbackImage;
                      }}
                    />
                    <div className="uvo-tile-overlay">
                      <span className="uvo-tile-cat">{photo.category}</span>
                      <span className="uvo-tile-title">{photo.title}</span>
                    </div>
                    {isStarred && (
                      <div className="uvo-tile-star-badge">
                        <StarFilled />
                      </div>
                    )}
                    <button
                      className="uvo-tile-star-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(photo.id);
                      }}
                      title={isStarred ? "Unstar" : "Star"}
                    >
                      {isStarred ? <StarFilled style={{ color: "#f5ba5e" }} /> : <StarOutlined />}
                    </button>
                  </button>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      {lbOpen && (
        <AILightbox
          photos={filteredPhotos}
          initialIdx={lbIdx}
          onClose={() => setLbOpen(false)}
          onStar={toggleStar}
          starredIds={starredIds}
        />
      )}
    </>
  );
};


/*  UsersPage                                                                  */


const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [viewUser, setViewUser] = useState<UserRecord | null>(null);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [inviteOpen, setInviteOpen] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters>(emptyAdvancedFilters);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const PAGE_SIZE = 10;

  const [editForm] = Form.useForm<EditFormValues>();
  const [inviteForm] = Form.useForm<InviteFormValues>();
  const [advFilterForm] = Form.useForm<AdvancedFilters>();

  const [usersData, setUsersData] = useState<UserRecord[]>([
    { id: "1", name: "Kamesh Srikharan.T", email: "kameshsrikharan.t@gmail.com", phone: "8888888888", studio: "Wave Studios", role: "Studio Admin", status: "Active", signupType: "Registered", created: "06 May 2026", location: "Chennai", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80", notes: "Manages studio users and booking activity." },
    { id: "2", name: "Arun Kumar", email: "arun.photography@gmail.com", phone: "9840123456", studio: "Wave Studios", role: "Photographer", status: "Active", signupType: "Google", created: "05 May 2026", location: "Coimbatore", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80", notes: "Strong candid photography profile." },
    { id: "3", name: "Priya", email: "priya.sharma@outlook.com", phone: "9123456789", studio: "Wave Studios", role: "Editor", status: "Inactive", signupType: "Registered", created: "04 May 2026", location: "Bangalore", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80", notes: "Editing access currently inactive." },
    { id: "4", name: "John", email: "john.d@wavestudios.com", phone: "8056123987", studio: "Wave Studios", role: "Photographer", status: "Active", signupType: "Registered", created: "03 May 2026", location: "Madurai", image: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=900&q=80", notes: "Event photographer." },
    { id: "5", name: "Meera", email: "meera.reddy@gmail.com", phone: "7012345678", studio: "Wave Studios", role: "Studio Admin", status: "Active", signupType: "Google", created: "02 May 2026", location: "Salem", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80", notes: "Handles booking operations." },
    { id: "6", name: "Vikram", email: "vikram.seth@live.com", phone: "9944556677", studio: "Wave Studios", role: "Photographer", status: "Pending", signupType: "Registered", created: "01 May 2026", location: "Trichy", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80", notes: "Pending approval." },
  ]);

  const [referralsData] = useState<UserRecord[]>([
    { id: "r1", name: "Referral User", email: "referral@gmail.com", phone: "9999999999", studio: "Wave Studios", role: "Referral", status: "Active", signupType: "Registered", created: "06 May 2026", location: "Chennai", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80", notes: "Referral contact." },
  ]);

  const [photographersData, setPhotographersData] = useState<UserRecord[]>([
    { id: "p1", name: "Srikharan Kamesh", email: "srikharankamesh@gmail.com", phone: "8888888888", role: "Freelance Photographer", status: "Active", signupType: "Registered", created: "06 May 2026", shoots: 18, location: "Chennai", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80", notes: "Reliable for wedding and event shoots." },
    { id: "p2", name: "photo grapher(user-2)", email: "tolewi9752@pertok.com", phone: "8383838383", role: "Freelance Photographer", status: "Active", signupType: "Invited", created: "05 May 2026", shoots: 4, location: "Bangalore", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80", notes: "Invite opened, profile pending." },
    { id: "p3", name: "photo grapher(user-1)", email: "velafe9699@mugstock.com", phone: "8569742356", role: "Freelance Photographer", status: "Active", signupType: "Invited", created: "04 May 2026", shoots: 6, location: "Coimbatore", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1400", notes: "Good candid photographer." },
    { id: "p4", name: "photographer-chandran", email: "tosaf14628@soppat.com", phone: "5457452158", role: "Freelance Photographer", status: "Active", signupType: "Registered", created: "03 May 2026", shoots: 24, location: "Madurai", image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1400", notes: "Preferred for outdoor shoots." },
    { id: "p5", name: "photographer chandran", email: "netimil194@bmoar.com", phone: "3838383678", role: "Freelance Photographer", status: "Inactive", signupType: "Invited", created: "02 May 2026", shoots: 2, location: "Trichy", image: "https://images.unsplash.com/photo-1528892952291-009c663ce843?q=80&w=1400", notes: "Needs follow up." },
    { id: "p6", name: "ley opo", email: "leyopoj378@spotshops.com", phone: "9840203148", role: "Freelance Photographer", status: "Pending", signupType: "Registered", created: "01 May 2026", shoots: 0, location: "Salem", image: "https://images.unsplash.com/photo-1554080353-a576cf803bda?q=80&w=1400", notes: "New profile under review." },
  ]);

  useEffect(() => {
    if (editUser) editForm.setFieldsValue(editUser as unknown as EditFormValues);
  }, [editUser, editForm]);

  const currentData = useMemo<UserRecord[]>(() => {
    if (activeTab === "referrals") return referralsData;
    if (activeTab === "photographers") return photographersData;
    return usersData;
  }, [activeTab, referralsData, photographersData, usersData]);

  const filterOptions = useMemo<FilterKey[]>(() => {
    if (activeTab !== "photographers") return ["All", "Active", "Inactive", "Pending", "Registered", "Google"];
    return ["All", "Active", "Inactive", "Pending", "Registered", "Invited"];
  }, [activeTab]);

  const filterCounts = useMemo<Record<string, number>>(() => {
    return filterOptions.reduce((acc: Record<string, number>, filter) => {
      acc[filter] =
        filter === "All"
          ? currentData.length
          : currentData.filter((item) => item.status === filter || item.signupType === filter).length;
      return acc;
    }, {});
  }, [currentData, filterOptions]);

  // --- Advanced filter panel config, tab-aware ------------------------------
  const roleOptionsByTab = useMemo<string[]>(() => {
    if (activeTab === "referrals") return ["Referral"];
    if (activeTab === "photographers") return []; 
    return ["Studio Admin", "Photographer", "Editor"];
  }, [activeTab]);

  const inviteStatusOptionsByTab = useMemo<SignupType[]>(() => {
    return activeTab === "photographers" ? ["Registered", "Invited"] : ["Registered", "Google"];
  }, [activeTab]);

  const activeAdvancedFilterCount = useMemo(() => {
    return (
      appliedFilters.roles.length +
      (appliedFilters.status ? 1 : 0) +
      (appliedFilters.inviteStatus ? 1 : 0) +
      (appliedFilters.period ? 1 : 0)
    );
  }, [appliedFilters]);

  const resetAdvancedFilters = useCallback(() => {
    advFilterForm.resetFields();
    setAppliedFilters(emptyAdvancedFilters);
  }, [advFilterForm]);

  const handleApplyAdvancedFilters = (values: AdvancedFilters) => {
    setAppliedFilters({
      roles: values.roles || [],
      status: values.status,
      inviteStatus: values.inviteStatus,
      period: values.period,
    });
    setFilterOpen(false);
  };

  const handleClearAdvancedFilters = () => {
    resetAdvancedFilters();
    setFilterOpen(false);
  };

  const filteredData = useMemo<UserRecord[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    return currentData.filter((user) => {
      const matchesSearch =
        !term || Object.values(user).some((value) => String(value).toLowerCase().includes(term));
      const matchesFilter =
        activeFilter === "All" || user.status === activeFilter || user.signupType === activeFilter;
      const matchesRole = appliedFilters.roles.length === 0 || appliedFilters.roles.includes(user.role);
      const matchesStatusAdv = !appliedFilters.status || user.status === appliedFilters.status;
      const matchesInviteAdv = !appliedFilters.inviteStatus || user.signupType === appliedFilters.inviteStatus;
      const matchesPeriod = !appliedFilters.period || matchesDatePeriod(user.created, appliedFilters.period);
      return (
        matchesSearch && matchesFilter && matchesRole && matchesStatusAdv && matchesInviteAdv && matchesPeriod
      );
    });
  }, [currentData, searchTerm, activeFilter, appliedFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, activeFilter, appliedFilters]);

  const highlightText = (value: string | number): ReactNode => {
    if (!searchTerm.trim()) return value;
    const regex = new RegExp(`(${escapeRegExp(searchTerm.trim())})`, "gi");
    const parts = String(value).split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.trim().toLowerCase() ? (
        <mark className="search-highlight" key={`${part}-${index}`}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      message.success("Refreshed");
    }, 800);
  };

  const handleEditSave = (values: EditFormValues) => {
    if (!editUser) return;
    const upd: Partial<UserRecord> = {
      ...values,
      shoots: values.shoots !== undefined ? Number(values.shoots) : (values.shoots as unknown as number),
    };
    if (editUser.id.startsWith("p")) {
      setPhotographersData((prev) => prev.map((item) => (item.id === editUser.id ? { ...item, ...upd } : item)));
    } else {
      setUsersData((prev) => prev.map((item) => (item.id === editUser.id ? { ...item, ...upd } : item)));
    }
    setEditUser(null);
    message.success("Saved");
  };

  const handleDeleteUser = (record: UserRecord) => {
    if (record.id.startsWith("p")) {
      setPhotographersData((prev) => prev.filter((item) => item.id !== record.id));
    } else {
      setUsersData((prev) => prev.filter((item) => item.id !== record.id));
    }
    setSelectedRowKeys((prev) => prev.filter((key) => key !== record.id));
  };

  const handleBulkDelete = () => {
    setPhotographersData((prev) => prev.filter((item) => !selectedRowKeys.includes(item.id)));
    setSelectedRowKeys([]);
  };

  const handleBulkStatus = (status: UserStatus) => {
    setPhotographersData((prev) =>
      prev.map((item) => (selectedRowKeys.includes(item.id) ? { ...item, status } : item))
    );
    message.success("Updated");
  };

  const handleBulkSignup = () => {
    setPhotographersData((prev) =>
      prev.map((item) => (selectedRowKeys.includes(item.id) ? { ...item, signupType: "Invited" as SignupType } : item))
    );
    message.success("Invited");
  };

  const handleInvite = (values: InviteFormValues) => {
    const isPhotographer = activeTab === "photographers";
    const newUser: UserRecord = {
      id: `${isPhotographer ? "p" : "u"}${Date.now()}`,
      name: values.name,
      email: values.email,
      phone: values.phone,
      studio: "Wave Studios",
      role: isPhotographer ? "Freelance Photographer" : values.role || "Photographer",
      status: "Pending",
      signupType: "Invited",
      created: "01 Jun 2026",
      shoots: 0,
      location: values.location || "Chennai",
      image: values.image || fallbackImage,
      notes: "Invited from users page.",
    };
    if (isPhotographer) setPhotographersData((prev) => [newUser, ...prev]);
    else setUsersData((prev) => [newUser, ...prev]);
    inviteForm.resetFields();
    setInviteOpen(false);
    message.success("Invite sent");
  };

  // Status / Signup tags — icon-only, full word shown via Tooltip on hover
  const renderStatusTag = (status: UserStatus) => (
    <Tooltip title={`Status: ${status}`}>
      <Tag className={`status-dot status-${status.toLowerCase()} icon-only`}>{filterIconMap[status]}</Tag>
    </Tooltip>
  );

  const renderSignupTag = (text: SignupType) => (
    <Tooltip title={`Signup: ${text}`}>
      <Tag className={`${text === "Invited" ? "signup-dot invited" : "signup-dot"} icon-only`}>
        {filterIconMap[text] || <UserSwitchOutlined />}
      </Tag>
    </Tooltip>
  );

  const renderRowActionsOverlay = (record: UserRecord) => (
    <div className="user-row-actions-overlay">
      <Tooltip title="View profile">
        <Button
          type="text"
          icon={<EyeOutlined />}
          className="user-action-btn view"
          onClick={(e) => {
            e.stopPropagation();
            setViewUser(record);
          }}
        />
      </Tooltip>
      <Tooltip title="Edit profile">
        <Button
          type="text"
          icon={<EditOutlined />}
          className="user-action-btn edit"
          onClick={(e) => {
            e.stopPropagation();
            setEditUser(record);
          }}
        />
      </Tooltip>
      <Tooltip title="Delete profile">
        <DeleteButton
          itemName={record.name}
          onDelete={() => handleDeleteUser(record)}
          className="user-action-btn delete"
        />
      </Tooltip>
    </div>
  );

  const commonColumns: ColumnsType<UserRecord> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 160,
      render: (text: string, record) => (
        <button type="button" className="user-name-cell" onClick={() => setViewUser(record)}>
          <Avatar src={record.image} className="user-name-avatar">
            {text.charAt(0)}
          </Avatar>
          <span>
            <strong>{highlightText(text)}</strong>
            <small>{record.role}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
      ellipsis: true,
      render: (text: string) => <span className="user-soft-cell">{highlightText(text)}</span>,
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 100,
      render: (text: string) => <span className="user-soft-cell">{highlightText(text)}</span>,
    },
    {
      title: activeTab === "photographers" ? "Shoots" : "Studio",
      key: "studioOrShoots",
      width: 110,
      render: (_, record) =>
        activeTab === "photographers" ? (
          <Tag className="user-pipeline-tag">
            <CameraOutlined /> {record.shoots ?? 0}
          </Tag>
        ) : (
          <Tag className="user-pipeline-tag">
            <EnvironmentOutlined /> {record.studio}
          </Tag>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 60,
      align: "center",
      render: renderStatusTag,
    },
    {
      title: "Signup",
      dataIndex: "signupType",
      key: "signupType",
      width: 60,
      align: "center",
      render: renderSignupTag,
    },
    {
      title: "Created",
      dataIndex: "created",
      key: "created",
      sorter: true,
      width: 120,
      onCell: () => ({ className: "user-actions-anchor-cell" }),
      render: (text: string, record) => (
        <>
          <Tag className="user-created-tag">
            <CalendarOutlined /> {text}
          </Tag>
          {renderRowActionsOverlay(record)}
        </>
      ),
    },
  ];

  const advancedFilterPanel = (
    <div className="filter-adv-panel">
      <div className="filter-adv-title">
        Filter {activeTab === "photographers" ? "Photographers" : "Users"}
      </div>
      <Form<AdvancedFilters>
        form={advFilterForm}
        layout="vertical"
        initialValues={appliedFilters}
        onFinish={handleApplyAdvancedFilters}
      >
        <div className="filter-adv-grid">
          {roleOptionsByTab.length > 0 && (
            <Form.Item name="roles" label="Role" className="filter-adv-item">
              <Select
                mode="multiple"
                allowClear
                placeholder="Select role(s)"
                classNames={{ popup: { root: "dark-select-dropdown" } }}
                options={roleOptionsByTab.map((r) => ({ value: r, label: r }))}
              />
            </Form.Item>
          )}
          <Form.Item name="status" label="Status" className="filter-adv-item">
            <Select
              allowClear
              placeholder="Select status"
              classNames={{ popup: { root: "dark-select-dropdown" } }}
              options={(["Active", "Inactive", "Pending"] as UserStatus[]).map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
          <Form.Item name="inviteStatus" label="Invite Status" className="filter-adv-item">
            <Select
              allowClear
              placeholder="Select invite status"
              classNames={{ popup: { root: "dark-select-dropdown" } }}
              options={inviteStatusOptionsByTab.map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
          <Form.Item name="period" label="Date Filter" className="filter-adv-item">
            <Select
              allowClear
              placeholder="Select period"
              classNames={{ popup: { root: "dark-select-dropdown" } }}
              options={[
                { value: "today", label: "Today" },
                { value: "week", label: "Last 7 days" },
                { value: "month", label: "Last 30 days" },
                { value: "year", label: "This year" },
              ]}
            />
          </Form.Item>
        </div>
        <div className="filter-adv-footer">
          <Button className="modal-cancel-btn" onClick={handleClearAdvancedFilters}>
            Clear Filters
          </Button>
          <Button type="primary" htmlType="submit" className="invite-btn-styled filter-adv-apply">
            Apply Filters
          </Button>
        </div>
      </Form>
    </div>
  );

  const columns = commonColumns;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#3b82f6", borderRadius: 14, zIndexPopupBase: 3000 } }}>
      <Layout className="dashboard-page dashboard-dark review-page user-visual-page">
        <div className="dashboard-frame">
          <Sidebar dark />

          <Layout className="dashboard-shell user-shell">
            <Header className="dashboard-navbar review-navbar user-navbar" />

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
                      Manage users, referrals and photographers with clean rows, icon headers, smart filters and
                      visual profile details.
                    </Text>
                  </div>
                  {activeTab === "photographers" && (
                    <div className="hero-face-stack">
                      {filteredData.slice(0, 4).map((item) => (
                        <Tooltip title={item.name} key={item.id}>
                          <img
                            src={item.image || fallbackImage}
                            alt={item.name}
                            onError={(e) => {
                              e.currentTarget.src = fallbackImage;
                            }}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>

                <Tabs
                  activeKey={activeTab}
                  onChange={(key) => {
                    setActiveTab(key as TabKey);
                    setSearchTerm("");
                    setActiveFilter("All");
                    setSelectedRowKeys([]);
                    resetAdvancedFilters();
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
                        content={advancedFilterPanel}
                        trigger="click"
                        placement="bottomLeft"
                        overlayClassName="filter-popover-overlay"
                      >
                        <Tooltip title="Filter">
                          <Badge dot={activeAdvancedFilterCount > 0} offset={[-4, 4]}>
                            <Button type="text" icon={<FilterOutlined />} className="icon-btn-glass" />
                          </Badge>
                        </Tooltip>
                      </Popover>
                      <Tooltip title="Refresh">
                        <Button
                          type="text"
                          icon={<ReloadOutlined spin={isLoading} />}
                          onClick={handleRefresh}
                          className="icon-btn-glass"
                        />
                      </Tooltip>
                    </Space>

                    <Space wrap>
                      {activeTab === "photographers" && selectedRowKeys.length > 0 && (
                        <div className="bulk-action-bar">
                          <b>{selectedRowKeys.length}</b>
                          <Tooltip title="Mark active">
                            <Button
                              type="text"
                              icon={<CheckCircleOutlined />}
                              className="bulk-icon-btn active-bulk"
                              onClick={() => handleBulkStatus("Active")}
                            />
                          </Tooltip>
                          <Tooltip title="Mark inactive">
                            <Button
                              type="text"
                              icon={<CloseCircleOutlined />}
                              className="bulk-icon-btn inactive-bulk"
                              onClick={() => handleBulkStatus("Inactive")}
                            />
                          </Tooltip>
                          <Tooltip title="Mark invited">
                            <Button
                              type="text"
                              icon={<SendOutlined />}
                              className="bulk-icon-btn invite-bulk"
                              onClick={handleBulkSignup}
                            />
                          </Tooltip>
                          <Tooltip title="Delete selected">
                            <DeleteButton
                              itemName={`${selectedRowKeys.length} selected user${
                                selectedRowKeys.length > 1 ? "s" : ""
                              }`}
                              onDelete={handleBulkDelete}
                              className="bulk-icon-btn delete-bulk"
                            />
                          </Tooltip>
                        </div>
                      )}
                      <Tooltip title="Invite user">
                        <Button
                          type="primary"
                          icon={<UserAddOutlined />}
                          className="invite-btn-styled"
                          onClick={() => setInviteOpen(true)}
                        />
                      </Tooltip>
                    </Space>
                  </div>

                  <Table<UserRecord>
                    columns={columns}
                    dataSource={filteredData}
                    className="user-table-custom"
                    rowKey="id"
                    tableLayout="fixed"
                    rowClassName={(record) => (activeRowId === record.id ? "user-row-active" : "")}
                    onRow={(record) => ({
                      onMouseEnter: () => setActiveRowId(record.id),
                      onMouseLeave: () => setActiveRowId((current) => (current === record.id ? null : current)),
                      onTouchStart: () => setActiveRowId((current) => (current === record.id ? null : record.id)),
                    })}
                    rowSelection={
                      activeTab === "photographers" ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined
                    }
                    locale={{ emptyText: <Empty description="No matching users" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    pagination={{
                      current: currentPage,
                      pageSize: PAGE_SIZE,
                      total: filteredData.length,
                      onChange: (page) => setCurrentPage(page),
                      showSizeChanger: false,
                      hideOnSinglePage: false,
                      className: "user-table-pagination",
                    }}
                  />
                </div>

               
              </div>
            </Content>
          </Layout>
        </div>

        {viewUser && <UserViewOverlay user={viewUser} onClose={() => setViewUser(null)} />}

        <CustomModal open={!!editUser} onClose={() => setEditUser(null)} width={660}>
          {editUser && (
            <div className="modal-shell">
              <div className="modal-title-row">
                <Avatar className="modal-small-avatar">
                  <EditOutlined />
                </Avatar>
                <Title level={3}>Edit</Title>
              </div>
              <Form<EditFormValues> form={editForm} layout="vertical" onFinish={handleEditSave}>
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
                    <Select
                      classNames={{ popup: { root: "dark-select-dropdown" } }}
                      options={[
                        { value: "Studio Admin", label: "Studio Admin" },
                        { value: "Freelance Photographer", label: "Freelance Photographer" },
                        { value: "Photographer", label: "Photographer" },
                        { value: "Editor", label: "Editor" },
                        { value: "Lead Photographer", label: "Lead Photographer" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="status" label="Status">
                    <Select
                      classNames={{ popup: { root: "dark-select-dropdown" } }}
                      options={[
                        { value: "Active", label: "Active" },
                        { value: "Inactive", label: "Inactive" },
                        { value: "Pending", label: "Pending" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="signupType" label="Signup">
                    <Select
                      classNames={{ popup: { root: "dark-select-dropdown" } }}
                      options={[
                        { value: "Registered", label: "Registered" },
                        { value: "Invited", label: "Invited" },
                        { value: "Google", label: "Google" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="location" label="Location">
                    <Input />
                  </Form.Item>
                  <Form.Item name="shoots" label="Shoots">
                    <Input type="number" />
                  </Form.Item>
                  <Form.Item name="image" label="Image URL" className="edit-notes-field">
                    <Input />
                  </Form.Item>
                  <Form.Item name="notes" label="Notes" className="edit-notes-field">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </div>
                <div className="modal-action-row">
                  <Tooltip title="Discard changes">
                    <Button className="modal-cancel-btn" onClick={() => setEditUser(null)}>
                      Cancel
                    </Button>
                  </Tooltip>
                  <Tooltip title="Save changes">
                    <Button htmlType="submit" type="primary" icon={<SaveOutlined />} className="invite-btn-styled" />
                  </Tooltip>
                </div>
              </Form>
            </div>
          )}
        </CustomModal>

        <CustomModal open={inviteOpen} onClose={() => setInviteOpen(false)} width={580}>
          <div className="modal-shell">
            <div className="modal-title-row">
              <Avatar className="modal-small-avatar">
                <UserAddOutlined />
              </Avatar>
              <Title level={3}>Invite</Title>
            </div>
            <Form<InviteFormValues> form={inviteForm} layout="vertical" onFinish={handleInvite}>
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
                <Form.Item name="role" label="Role" initialValue="Photographer">
                  <Select
                    classNames={{ popup: { root: "dark-select-dropdown" } }}
                    options={[
                      { value: "Studio Admin", label: "Studio Admin" },
                      { value: "Photographer", label: "Photographer" },
                      { value: "Editor", label: "Editor" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="location" label="Location">
                  <Input />
                </Form.Item>
                <Form.Item name="image" label="Image URL">
                  <Input />
                </Form.Item>
              </div>
              <div className="modal-action-row">
                <Tooltip title="Discard invite">
                  <Button className="modal-cancel-btn" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </Button>
                </Tooltip>
                <Tooltip title="Send invite">
                  <Button htmlType="submit" type="primary" icon={<SendOutlined />} className="invite-btn-styled" />
                </Tooltip>
              </div>
            </Form>
          </div>
        </CustomModal>
      </Layout>
    </ConfigProvider>
  );
};

export default UsersPage;