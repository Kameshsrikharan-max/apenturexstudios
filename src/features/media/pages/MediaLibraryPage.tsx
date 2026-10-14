import { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "antd";
import "./MediaLibraryPage.css";

import {
  PictureOutlined, VideoCameraOutlined, FolderOpenOutlined, SearchOutlined, FilterOutlined,
  HeartOutlined, HeartFilled, DeleteOutlined, UploadOutlined, AppstoreOutlined, BarsOutlined,
  CloseOutlined, LeftOutlined, RightOutlined, EditOutlined, PlusOutlined, ZoomInOutlined,
  ZoomOutOutlined, ReloadOutlined, CompassOutlined, StarOutlined, StarFilled, CheckCircleFilled,
  DownloadOutlined, InfoCircleOutlined, SlidersOutlined, PlayCircleOutlined, PauseCircleOutlined,
  SwapOutlined, UndoOutlined, RestOutlined, TagOutlined, QuestionCircleOutlined, BlockOutlined,
  CheckSquareOutlined, ColumnWidthOutlined, CloudUploadOutlined, CopyOutlined,
} from "@ant-design/icons";
import ConfirmDeleteButton from "../../../components/common/DeleteButton";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Adjust = { brightness: number; contrast: number; saturate: number; sepia: number; grayscale: number; hue: number; blur: number };

type MediaItem = {
  id: number;
  type: "photo" | "video";
  title: string;
  url: string;
  liked: boolean;
  albumId: number | null;
  rating: number;
  tags: string[];
  addedAt: number;
  size: number;
  w: number;
  h: number;
  dom: string;
  palette: string[];
  analyzed: boolean;
  adjust: Adjust;
  deletedAt: number | null;
};

type Album = { id: number; title: string };
type FolderKey = "all" | "photo" | "video" | "album" | "trash";
type ViewMode = "grid" | "masonry" | "list";
type SortKey = "newest" | "oldest" | "name" | "rating" | "size";
type PanelTab = "info" | "edit" | null;
type Toast = { id: number; msg: string; undo?: () => void };
type UploadJob = { id: number; name: string; pct: number };

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */
const DAY = 86400000;
const STORAGE_BUDGET = 5000000;

const DEFAULT_ADJ: Adjust = { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, hue: 0, blur: 0 };

const ADJ_CONTROLS: { key: keyof Adjust; label: string; min: number; max: number; unit: string }[] = [
  { key: "brightness", label: "Brightness", min: 40, max: 160, unit: "%" },
  { key: "contrast", label: "Contrast", min: 40, max: 160, unit: "%" },
  { key: "saturate", label: "Saturation", min: 0, max: 250, unit: "%" },
  { key: "sepia", label: "Warmth", min: 0, max: 100, unit: "%" },
  { key: "grayscale", label: "Mono", min: 0, max: 100, unit: "%" },
  { key: "hue", label: "Hue shift", min: 0, max: 360, unit: "°" },
  { key: "blur", label: "Blur", min: 0, max: 12, unit: "px" },
];

const PRESETS: { name: string; adj: Partial<Adjust> }[] = [
  { name: "Original", adj: {} },
  { name: "Vivid", adj: { saturate: 160, contrast: 112 } },
  { name: "Noir", adj: { grayscale: 100, contrast: 125, brightness: 92 } },
  { name: "Warm", adj: { sepia: 35, saturate: 120, brightness: 104 } },
  { name: "Fade", adj: { contrast: 85, brightness: 112, saturate: 80 } },
  { name: "Retro", adj: { sepia: 60, contrast: 110, saturate: 130, hue: 350 } },
  { name: "Dream", adj: { blur: 1.5, brightness: 110, saturate: 130, contrast: 92 } },
];

const COLOR_BUCKETS = [
  { key: "red", label: "Red", swatch: "#ef4444" },
  { key: "gold", label: "Gold", swatch: "#f59e0b" },
  { key: "green", label: "Green", swatch: "#22c55e" },
  { key: "blue", label: "Blue", swatch: "#38bdf8" },
  { key: "violet", label: "Violet", swatch: "#a78bfa" },
  { key: "neutral", label: "Neutral", swatch: "#94a3b8" },
];

const SHORTCUTS: [string, string][] = [
  ["/", "Focus search"],
  ["U", "Upload files"],
  ["S", "Toggle select mode"],
  ["G", "Cycle grid / masonry / list"],
  ["Ctrl + A", "Select all (select mode)"],
  ["Shift + Click", "Range select"],
  ["Ctrl + Click", "Quick select"],
  ["← →", "Previous / next in preview"],
  ["Space", "Slideshow on / off"],
  ["+  −  0", "Zoom in / out / reset"],
  ["L", "Like in preview"],
  ["I  /  E", "Info / Edit panel"],
  ["Esc", "Close or clear"],
];

const sorters: Record<SortKey, (a: MediaItem, b: MediaItem) => number> = {
  newest: (a, b) => b.addedAt - a.addedAt,
  oldest: (a, b) => a.addedAt - b.addedAt,
  name: (a, b) => a.title.localeCompare(b.title),
  rating: (a, b) => b.rating - a.rating || b.addedAt - a.addedAt,
  size: (a, b) => b.size - a.size,
};

const normalize = (m: Partial<MediaItem>): MediaItem => ({
  id: m.id ?? Date.now() + Math.random(),
  type: m.type ?? "photo",
  title: m.title ?? "Untitled",
  url: m.url ?? "",
  liked: m.liked ?? false,
  albumId: m.albumId ?? null,
  rating: m.rating ?? 0,
  tags: m.tags ?? [],
  addedAt: m.addedAt ?? Date.now(),
  size: m.size ?? 0,
  w: m.w ?? 0,
  h: m.h ?? 0,
  dom: m.dom ?? "",
  palette: m.palette ?? [],
  analyzed: m.analyzed ?? false,
  adjust: { ...DEFAULT_ADJ, ...(m.adjust ?? {}) },
  deletedAt: m.deletedAt ?? null,
});

const BASE = Date.now();
const initialMedia: MediaItem[] = [
  { id: 1, type: "photo", title: "Wedding Shot 1", url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e", liked: false, albumId: null, addedAt: BASE - 3 * DAY },
  { id: 2, type: "photo", title: "Studio Portrait", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e", liked: true, albumId: null, addedAt: BASE - 6 * DAY },
  { id: 3, type: "video", title: "Behind Scenes", url: "https://www.w3schools.com/html/mov_bbb.mp4", liked: false, albumId: null, addedAt: BASE - 9 * DAY },
].map((m) => normalize(m as Partial<MediaItem>));

const initialAlbums: Album[] = [
  { id: 101, title: "Summer Vacation" },
  { id: 102, title: "Client Shoots" },
];

const isEdited = (a: Adjust) => (Object.keys(DEFAULT_ADJ) as (keyof Adjust)[]).some((k) => a[k] !== DEFAULT_ADJ[k]);

const filterCss = (a: Adjust) =>
  isEdited(a)
    ? `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%) sepia(${a.sepia}%) grayscale(${a.grayscale}%) hue-rotate(${a.hue}deg) blur(${a.blur}px)`
    : "none";

const fmtSize = (b: number) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
};

const colorBucket = (hex: string): string => {
  if (!hex || hex[0] !== "#" || hex.length < 7) return "";
  const [h, s, l] = hexToHsl(hex);
  if (s < 0.18 || l < 0.1 || l > 0.9) return "neutral";
  if (h < 20 || h >= 335) return "red";
  if (h < 70) return "gold";
  if (h < 170) return "green";
  if (h < 260) return "blue";
  return "violet";
};

/** Reads natural size + a 5-colour palette from a photo. Never rejects. */
const analyzeImage = (url: string): Promise<{ w: number; h: number; dom: string; palette: string[] }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      try {
        const c = document.createElement("canvas");
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const k = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
          const e = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
          e.n++;
          e.r += r;
          e.g += g;
          e.b += b;
          buckets.set(k, e);
        }
        const top = Array.from(buckets.values())
          .sort((a, b) => b.n - a.n)
          .slice(0, 5)
          .map((e) => toHex(e.r / e.n, e.g / e.n, e.b / e.n));
        resolve({ w, h, dom: top[0] || "", palette: top });
      } catch {
        resolve({ w, h, dom: "", palette: [] });
      }
    };
    img.onerror = () => resolve({ w: 0, h: 0, dom: "", palette: [] });
    img.src = url;
  });

/** Bakes the non-destructive edits into a real JPEG (needs CORS-clean image). */
const bakeEdited = (item: MediaItem): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.filter = filterCss(item.adjust);
        ctx.drawImage(img, 0, 0);
        c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : null), "image/jpeg", 0.92);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = item.url;
  });

const triggerDownload = (href: string, name: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const downloadItem = async (item: MediaItem) => {
  if (item.type === "photo" && isEdited(item.adjust)) {
    const baked = await bakeEdited(item);
    if (baked) {
      triggerDownload(baked, `${item.title}-edited.jpg`);
      setTimeout(() => URL.revokeObjectURL(baked), 4000);
      return;
    }
  }
  const mime = item.url.match(/^data:([^;]+)/);
  const ext = mime ? mime[1].split("/")[1].replace("jpeg", "jpg") : item.type === "video" ? "mp4" : "jpg";
  if (item.url.startsWith("data:")) {
    triggerDownload(item.url, `${item.title}.${ext}`);
    return;
  }
  try {
    const r = await fetch(item.url);
    const blob = await r.blob();
    const href = URL.createObjectURL(blob);
    triggerDownload(href, `${item.title}.${ext}`);
    setTimeout(() => URL.revokeObjectURL(href), 4000);
  } catch {
    window.open(item.url, "_blank");
  }
};

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function Stars({ value, onChange, size = 14 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className={`stars ${onChange ? "interactive" : ""}`} style={{ fontSize: size }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= shown ? "star on" : "star"}
          onMouseEnter={() => (onChange ? setHover(n) : undefined)}
          onClick={(e) => {
            if (!onChange) return;
            e.stopPropagation();
            onChange(value === n ? 0 : n);
          }}
        >
          {n <= shown ? <StarFilled /> : <StarOutlined />}
        </span>
      ))}
    </span>
  );
}

function CompareModal({ a, b, onClose, onSwap }: { a: MediaItem; b: MediaItem; onClose: () => void; onSwap: () => void }) {
  const [pos, setPos] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = (clientX: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return createPortal(
    <div className="media-modal-backdrop compare-backdrop" onClick={onClose}>
      <div className="compare-window" onClick={(e) => e.stopPropagation()}>
        <div className="compare-head">
          <h3>Compare</h3>
          <div className="compare-head-actions">
            <button className="modal-inline-edit-trigger" onClick={onSwap}><SwapOutlined /> Swap sides</button>
            <button className="modal-top-close-trigger" onClick={onClose}><CloseOutlined /></button>
          </div>
        </div>
        <div
          className="compare-stage"
          ref={boxRef}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            move(e.clientX);
          }}
          onPointerMove={(e) => {
            if (dragging.current) move(e.clientX);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
        >
          <img className="cmp-img" src={b.url} alt={b.title} draggable={false} style={{ filter: filterCss(b.adjust) }} />
          <img
            className="cmp-img cmp-top"
            src={a.url}
            alt={a.title}
            draggable={false}
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, filter: filterCss(a.adjust) }}
          />
          <div className="cmp-handle" style={{ left: `${pos}%` }}>
            <span><ColumnWidthOutlined /></span>
          </div>
          <span className="cmp-label left">{a.title}</span>
          <span className="cmp-label right">{b.title}</span>
        </div>
        <input
          className="cmp-range"
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Comparison position"
        />
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function MediaLibraryPage() {
  /* ---- data ---- */
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem("persistent_media");
      if (saved) return (JSON.parse(saved) as Partial<MediaItem>[]).map((m) => normalize(m));
    } catch {
      /* fall back to seed data */
    }
    return initialMedia;
  });

  const [albums, setAlbums] = useState<Album[]>(() => {
    try {
      const saved = localStorage.getItem("persistent_albums");
      if (saved) return JSON.parse(saved);
    } catch {
      /* fall back to seed data */
    }
    return initialAlbums;
  });

  /* ---- browsing state ---- */
  const [activeFolder, setActiveFolder] = useState<FolderKey>("all");
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterLikedOnly, setFilterLikedOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  /* ---- selection / drag ---- */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const lastSelRef = useRef<number | null>(null);
  const [draggingIds, setDraggingIds] = useState<number[] | null>(null);
  const dragIdsRef = useRef<number[] | null>(null);
  const [dropAlbumId, setDropAlbumId] = useState<number | null>(null);
  const [fileDragging, setFileDragging] = useState(false);
  const [compareIds, setCompareIds] = useState<[number, number] | null>(null);

  /* ---- preview ---- */
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isRenameMode, setIsRenameMode] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isNavigating, setIsNavigating] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>(null);
  const [slideshow, setSlideshow] = useState(false);
  const [peekOriginal, setPeekOriginal] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const dragStart = useRef({ x: 0, y: 0 });
  const filmRef = useRef<HTMLDivElement>(null);

  /* ---- misc UI ---- */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [uploads, setUploads] = useState<UploadJob[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzingRef = useRef<Set<number>>(new Set());

  /* ---- smooth height / cross-fade ---- */
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
  const [contentFading, setContentFading] = useState(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    try {
      localStorage.setItem("persistent_media", JSON.stringify(mediaList));
      setStorageFull(false);
    } catch {
      setStorageFull(true);
    }
  }, [mediaList]);

  useEffect(() => {
    try {
      localStorage.setItem("persistent_albums", JSON.stringify(albums));
    } catch {
      /* ignore */
    }
  }, [albums]);

  // Trash older than 30 days is removed for good
  useEffect(() => {
    const cutoff = Date.now() - 30 * DAY;
    setMediaList((p) => p.filter((m) => !m.deletedAt || m.deletedAt > cutoff));
  }, []);

  // Background analysis: dimensions + palette for photos (a few at a time)
  useEffect(() => {
    const pending = mediaList
      .filter((m) => m.type === "photo" && !m.analyzed && !analyzingRef.current.has(m.id))
      .slice(0, 4);
    pending.forEach((m) => {
      analyzingRef.current.add(m.id);
      analyzeImage(m.url).then((res) => {
        setMediaList((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...res, analyzed: true } : x)));
      });
    });
  }, [mediaList]);

  /* ------------------------------------------------------------------ */
  /*  Derived data                                                       */
  /* ------------------------------------------------------------------ */
  const live = useMemo(() => mediaList.filter((m) => !m.deletedAt), [mediaList]);
  const trashed = useMemo(() => mediaList.filter((m) => !!m.deletedAt), [mediaList]);

  const counts = useMemo(
    () => ({
      photos: live.filter((m) => m.type === "photo").length,
      videos: live.filter((m) => m.type === "video").length,
      albums: albums.length,
      favorites: live.filter((m) => m.liked).length,
      trash: trashed.length,
    }),
    [live, trashed, albums]
  );

  const storagePct = useMemo(() => Math.min(100, (JSON.stringify(mediaList).length / STORAGE_BUDGET) * 100), [mediaList]);

  const tagCloud = useMemo(() => {
    const map = new Map<string, number>();
    live.forEach((m) => m.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [live]);

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    live.forEach((m) => {
      const b = colorBucket(m.dom);
      if (b) set.add(b);
    });
    return COLOR_BUCKETS.filter((c) => set.has(c.key));
  }, [live]);

  const inTrash = activeFolder === "trash";
  const albumRoot = activeFolder === "album" && !selectedAlbumId;
  const hasActiveFilters = search.trim() !== "" || filterLikedOnly || minRating > 0 || activeTag !== null || colorFilter !== null;

  const displayedMedia = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = mediaList.filter((item) => {
      if (inTrash) return !!item.deletedAt;
      if (item.deletedAt) return false;
      if (activeFolder === "photo" && item.type !== "photo") return false;
      if (activeFolder === "video" && item.type !== "video") return false;
      if (activeFolder === "album") {
        if (!selectedAlbumId) return false;
        if (item.albumId !== selectedAlbumId) return false;
      }
      if (filterLikedOnly && !item.liked) return false;
      if (minRating > 0 && item.rating < minRating) return false;
      if (activeTag && !item.tags.includes(activeTag)) return false;
      if (colorFilter && colorBucket(item.dom) !== colorFilter) return false;
      if (q && !(item.title.toLowerCase().includes(q) || item.tags.some((t) => t.includes(q.replace(/^#/, ""))))) return false;
      return true;
    });
    return list.sort(sorters[sortBy]);
  }, [mediaList, activeFolder, selectedAlbumId, search, filterLikedOnly, minRating, activeTag, colorFilter, sortBy, inTrash]);

  const folderTabs: { key: FolderKey; label: string; icon: React.ReactNode; info: string }[] = [
    { key: "all", label: "All Media", icon: <FolderOpenOutlined />, info: `${counts.photos}P · ${counts.videos}V` },
    { key: "photo", label: "Photos", icon: <PictureOutlined />, info: `${counts.photos} photos` },
    { key: "video", label: "Videos", icon: <VideoCameraOutlined />, info: `${counts.videos} videos` },
    { key: "album", label: "Albums", icon: <CompassOutlined />, info: `${counts.albums} albums` },
    { key: "trash", label: "Trash", icon: <RestOutlined />, info: `${counts.trash} items` },
  ];

  const currentPreviewItem = previewIndex !== null ? displayedMedia[previewIndex] ?? null : null;
  const previewOpen = previewIndex !== null;
  const selectedItems = mediaList.filter((m) => selectedIds.includes(m.id));
  const canCompare = selectedItems.length === 2 && selectedItems.every((m) => m.type === "photo");

  /* ------------------------------------------------------------------ */
  /*  Generic helpers                                                    */
  /* ------------------------------------------------------------------ */
  const pushToast = (msg: string, undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-3), { id, msg, undo }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5500);
  };

  const updateItem = (id: number, patch: Partial<MediaItem>) =>
    setMediaList((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const updateMany = (ids: number[], patch: Partial<MediaItem>) =>
    setMediaList((p) => p.map((m) => (ids.includes(m.id) ? { ...m, ...patch } : m)));

  const swap = (fn: () => void) => {
    const node = contentWrapperRef.current;
    if (node) setContainerHeight(node.offsetHeight);
    setContentFading(true);
    fn();
  };

  useLayoutEffect(() => {
    const node = contentWrapperRef.current;
    if (!node) return;
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    const targetHeight = node.scrollHeight;
    const raf = requestAnimationFrame(() => setContainerHeight(targetHeight));
    fadeTimerRef.current = setTimeout(() => setContentFading(false), 40);
    unlockTimerRef.current = setTimeout(() => setContainerHeight(undefined), 420);
    return () => {
      cancelAnimationFrame(raf);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    };
  }, [activeFolder, selectedAlbumId, viewMode, mediaList, albums, search, filterLikedOnly, minRating, activeTag, colorFilter, sortBy]);

  const switchFolder = (key: FolderKey) => {
    if (key === activeFolder) return;
    swap(() => {
      setActiveFolder(key);
      setSelectedAlbumId(null);
      setSelectedIds([]);
      lastSelRef.current = null;
    });
  };

  const openAlbumFolder = (id: number) => swap(() => setSelectedAlbumId(id));
  const backToAlbums = () => swap(() => setSelectedAlbumId(null));
  const switchViewMode = (mode: ViewMode) => {
    if (mode !== viewMode) swap(() => setViewMode(mode));
  };
  const cycleView = () => {
    const order: ViewMode[] = ["grid", "masonry", "list"];
    switchViewMode(order[(order.indexOf(viewMode) + 1) % order.length]);
  };
  const clearFilters = () => {
    setSearch("");
    setFilterLikedOnly(false);
    setMinRating(0);
    setActiveTag(null);
    setColorFilter(null);
  };

  /* ------------------------------------------------------------------ */
  /*  Upload                                                             */
  /* ------------------------------------------------------------------ */
  const ingestFiles = (files: File[]) => {
    files.forEach((file) => {
      const fileType: "photo" | "video" | null = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "photo" : null;
      if (!fileType) {
        pushToast(`${file.name} skipped — only images and videos are supported.`);
        return;
      }
      if (activeFolder === "photo" && fileType !== "photo") {
        pushToast("The Photos tab accepts image files only.");
        return;
      }
      if (activeFolder === "video" && fileType !== "video") {
        pushToast("The Videos tab accepts video files only.");
        return;
      }
      const jobId = Date.now() + Math.random();
      setUploads((p) => [...p, { id: jobId, name: file.name, pct: 0 }]);
      const reader = new FileReader();
      reader.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setUploads((p) => p.map((u) => (u.id === jobId ? { ...u, pct: Math.round((ev.loaded / ev.total) * 100) } : u)));
        }
      };
      reader.onloadend = () => {
        setUploads((p) => p.filter((u) => u.id !== jobId));
        if (!reader.result) return;
        const newItem = normalize({
          id: Date.now() + Math.random(),
          type: fileType,
          title: file.name.split(".").slice(0, -1).join(".") || "Untitled Resource",
          url: reader.result as string,
          albumId: activeFolder === "album" ? selectedAlbumId : null,
          size: file.size,
          addedAt: Date.now(),
        });
        setMediaList((p) => [newItem, ...p]);
      };
      reader.readAsDataURL(file);
    });
  };

  const ingestRef = useRef(ingestFiles);
  ingestRef.current = ingestFiles;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    ingestFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  // Drop files anywhere on the page
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !dragIdsRef.current && Array.from(e.dataTransfer?.types || []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setFileDragging(true);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setFileDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setFileDragging(false);
      ingestRef.current(Array.from(e.dataTransfer?.files || []));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Albums                                                             */
  /* ------------------------------------------------------------------ */
  const createAlbum = () => {
    const name = prompt("Enter new album title name:");
    if (!name || !name.trim()) return;
    setAlbums((p) => [...p, { id: Date.now(), title: name.trim() }]);
  };

  const renameAlbum = (alb: Album, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt("Rename album:", alb.title);
    if (!name || !name.trim()) return;
    setAlbums((p) => p.map((a) => (a.id === alb.id ? { ...a, title: name.trim() } : a)));
  };

  const deleteAlbum = (id: number) => {
    setAlbums((p) => p.filter((a) => a.id !== id));
    setMediaList((p) => p.map((item) => (item.albumId === id ? { ...item, albumId: null } : item)));
    if (selectedAlbumId === id) setSelectedAlbumId(null);
  };

  const moveToAlbum = (ids: number[], albumId: number | null) => {
    if (!ids.length) return;
    updateMany(ids, { albumId });
    const title = albumId === null ? "no album" : albums.find((a) => a.id === albumId)?.title ?? "album";
    pushToast(`Moved ${ids.length} item${ids.length > 1 ? "s" : ""} to ${title}`);
  };

  /* ------------------------------------------------------------------ */
  /*  Trash / delete / like                                              */
  /* ------------------------------------------------------------------ */
  const restoreItems = (ids: number[]) => {
    updateMany(ids, { deletedAt: null });
    setSelectedIds((p) => p.filter((id) => !ids.includes(id)));
  };

  const trashItems = (ids: number[]) => {
    if (!ids.length) return;
    updateMany(ids, { deletedAt: Date.now() });
    setSelectedIds((p) => p.filter((id) => !ids.includes(id)));
    pushToast(`${ids.length} item${ids.length > 1 ? "s" : ""} moved to Trash`, () => restoreItems(ids));
  };

  const purgeItems = (ids: number[]) => {
    setMediaList((p) => p.filter((m) => !ids.includes(m.id)));
    setSelectedIds((p) => p.filter((id) => !ids.includes(id)));
  };

  const toggleLike = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMediaList((p) => p.map((item) => (item.id === id ? { ...item, liked: !item.liked } : item)));
  };

  const bulkFavorite = () => {
    const all = selectedItems.every((m) => m.liked);
    updateMany(selectedIds, { liked: !all });
  };

  const bulkDownload = async () => {
    for (const m of selectedItems) await downloadItem(m);
  };

  /* ------------------------------------------------------------------ */
  /*  Selection                                                          */
  /* ------------------------------------------------------------------ */
  const exitSelect = () => {
    setSelectMode(false);
    setSelectedIds([]);
    lastSelRef.current = null;
  };

  const toggleSelectMode = () => (selectMode ? exitSelect() : setSelectMode(true));

  const toggleSelect = (id: number, idx: number, shift: boolean) => {
    if (shift && lastSelRef.current !== null) {
      const a = Math.min(lastSelRef.current, idx);
      const b = Math.max(lastSelRef.current, idx);
      const range = displayedMedia.slice(a, b + 1).map((m) => m.id);
      setSelectedIds((p) => Array.from(new Set([...p, ...range])));
    } else {
      setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    }
    lastSelRef.current = idx;
  };

  const onCardClick = (e: React.MouseEvent, item: MediaItem, idx: number) => {
    const multi = selectMode || e.ctrlKey || e.metaKey || e.shiftKey;
    if (multi) {
      if (!selectMode) setSelectMode(true);
      toggleSelect(item.id, idx, e.shiftKey);
      return;
    }
    if (!inTrash) openPreview(idx);
  };

  /* ------------------------------------------------------------------ */
  /*  Drag media onto albums                                             */
  /* ------------------------------------------------------------------ */
  const onCardDragStart = (e: React.DragEvent, id: number) => {
    const ids = selectedIds.includes(id) ? selectedIds : [id];
    e.dataTransfer.setData("text/x-media-ids", JSON.stringify(ids));
    e.dataTransfer.effectAllowed = "move";
    dragIdsRef.current = ids;
    setDraggingIds(ids);
  };

  const onCardDragEnd = () => {
    dragIdsRef.current = null;
    setDraggingIds(null);
    setDropAlbumId(null);
  };

  const dropOnAlbum = (albumId: number | null) => {
    if (draggingIds) moveToAlbum(draggingIds, albumId);
    onCardDragEnd();
  };

  /* ------------------------------------------------------------------ */
  /*  Preview                                                            */
  /* ------------------------------------------------------------------ */
  const resetView = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsRenameMode(false);
    setPeekOriginal(false);
    setTagDraft("");
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setRenameTitle(displayedMedia[index].title);
    resetView();
  };

  const closePreview = () => {
    setPreviewIndex(null);
    setSlideshow(false);
    resetView();
  };

  const goTo = (index: number) => {
    setPreviewIndex(index);
    setRenameTitle(displayedMedia[index]?.title ?? "");
    resetView();
  };

  const navigatePreview = (direction: number) => {
    if (displayedMedia.length < 2 || previewIndex === null) return;
    setIsNavigating(direction > 0 ? "right" : "left");
    setTimeout(() => {
      let next = previewIndex + direction;
      if (next < 0) next = displayedMedia.length - 1;
      if (next >= displayedMedia.length) next = 0;
      goTo(next);
      setIsNavigating(null);
    }, 200);
  };

  const saveRename = (id: number) => {
    if (!renameTitle.trim()) return;
    updateItem(id, { title: renameTitle.trim() });
    setIsRenameMode(false);
  };

  const deleteFromPreview = (id: number) => {
    const len = displayedMedia.length;
    trashItems([id]);
    if (len <= 1) closePreview();
    else if (previewIndex !== null && previewIndex >= len - 1) goTo(len - 2);
  };

  const addTag = (id: number, raw: string) => {
    const clean = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    const item = mediaList.find((m) => m.id === id);
    if (!clean || !item || item.tags.includes(clean)) {
      setTagDraft("");
      return;
    }
    updateItem(id, { tags: [...item.tags, clean] });
    setTagDraft("");
  };

  const removeTag = (id: number, tag: string) => {
    const item = mediaList.find((m) => m.id === id);
    if (item) updateItem(id, { tags: item.tags.filter((t) => t !== tag) });
  };

  const copyHex = (hex: string) => {
    try {
      navigator.clipboard.writeText(hex);
      pushToast(`Copied ${hex}`);
    } catch {
      pushToast(hex);
    }
  };

  const handleZoomIn = () => setZoomScale((p) => Math.min(p + 0.35, 4));
  const handleZoomOut = () =>
    setZoomScale((p) => {
      const next = Math.max(p - 0.35, 0.5);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  const handleZoomReset = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (currentPreviewItem?.type !== "photo") return;
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  /* ---- slideshow ---- */
  useEffect(() => {
    if (!slideshow || !previewOpen) return;
    const t = setInterval(() => {
      setPreviewIndex((p) => (p === null ? p : (p + 1) % Math.max(displayedMedia.length, 1)));
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    }, 3800);
    return () => clearInterval(t);
  }, [slideshow, previewOpen, displayedMedia.length]);

  // keep preview index valid + rename field in sync
  useEffect(() => {
    if (previewIndex !== null && !displayedMedia[previewIndex]) setPreviewIndex(null);
  }, [displayedMedia, previewIndex]);

  useEffect(() => {
    if (currentPreviewItem) setRenameTitle(currentPreviewItem.title);
  }, [previewIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep active filmstrip thumb centred
  useEffect(() => {
    const el = filmRef.current?.querySelector(".film-thumb.active");
    if (el) (el as HTMLElement).scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [previewIndex]);

  // lock page scroll while an overlay is open
  useEffect(() => {
    if (!previewOpen && !compareIds) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [previewOpen, compareIds]);

  /* ---- keyboard: preview ---- */
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        if (e.key === "Escape") t.blur();
        return;
      }
      if (e.key === "Escape") closePreview();
      else if (e.key === "ArrowRight") navigatePreview(1);
      else if (e.key === "ArrowLeft") navigatePreview(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setSlideshow((s) => !s);
      } else if (e.key === "+" || e.key === "=") handleZoomIn();
      else if (e.key === "-") handleZoomOut();
      else if (e.key === "0") handleZoomReset();
      else if ((e.key === "l" || e.key === "L") && currentPreviewItem) toggleLike(currentPreviewItem.id);
      else if (e.key === "i" || e.key === "I") setPanelTab((p) => (p === "info" ? null : "info"));
      else if ((e.key === "e" || e.key === "E") && currentPreviewItem?.type === "photo") setPanelTab((p) => (p === "edit" ? null : "edit"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---- keyboard: page + compare ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (compareIds) {
        if (e.key === "Escape") setCompareIds(null);
        return;
      }
      const t = e.target as HTMLElement;
      const typing = t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
      if (typing || previewOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && selectMode) {
        e.preventDefault();
        setSelectedIds(displayedMedia.map((m) => m.id));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case "?":
          setShowShortcuts((s) => !s);
          break;
        case "s":
        case "S":
          toggleSelectMode();
          break;
        case "g":
        case "G":
          cycleView();
          break;
        case "u":
        case "U":
          fileInputRef.current?.click();
          break;
        case "Escape":
          setShowShortcuts(false);
          if (selectMode) exitSelect();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ------------------------------------------------------------------ */
  /*  Overlay: preview                                                   */
  /* ------------------------------------------------------------------ */
  const adjustItem = (item: MediaItem, key: keyof Adjust, value: number) =>
    updateItem(item.id, { adjust: { ...item.adjust, [key]: value } });

  const previewModal = currentPreviewItem ? (
    <div className="media-modal-backdrop" onClick={closePreview}>
      <div
        className="holographic-glow-backdrop"
        style={{
          backgroundImage: currentPreviewItem.type === "photo" ? `url(${currentPreviewItem.url})` : "none",
          backgroundColor: currentPreviewItem.type === "video" ? "#101223" : "transparent",
        }}
      ></div>

      <div className="media-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top-header-bar">
          <div className="modal-header-left-group">
            {isRenameMode ? (
              <div className="modal-rename-inline-row">
                <input
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="modal-rename-input"
                  autoFocus
                  onKeyDown={(e) => (e.key === "Enter" ? saveRename(currentPreviewItem.id) : null)}
                />
                <button className="modal-rename-save-btn" onClick={() => saveRename(currentPreviewItem.id)}>Save</button>
                <button className="modal-rename-cancel-btn" onClick={() => setIsRenameMode(false)}>Cancel</button>
              </div>
            ) : (
              <div className="modal-title-display-line">
                <h3 className="modal-media-title">{currentPreviewItem.title}</h3>
                <button className="modal-inline-edit-trigger" onClick={() => setIsRenameMode(true)}>
                  <EditOutlined /> Rename
                </button>
                <span className="modal-media-badge">{currentPreviewItem.type.toUpperCase()}</span>
                <span className="modal-counter">{(previewIndex ?? 0) + 1} / {displayedMedia.length}</span>
              </div>
            )}
          </div>

          <div className="modal-header-right-group">
            <Tooltip title="Like (L)">
              <button
                className={`modal-inline-like-btn ${currentPreviewItem.liked ? "liked-active" : ""}`}
                onClick={(e) => toggleLike(currentPreviewItem.id, e)}
              >
                {currentPreviewItem.liked ? <HeartFilled /> : <HeartOutlined />}
              </button>
            </Tooltip>
            <Tooltip title={slideshow ? "Pause slideshow (Space)" : "Slideshow (Space)"}>
              <button className={`hdr-btn ${slideshow ? "on" : ""}`} onClick={() => setSlideshow((s) => !s)}>
                {slideshow ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              </button>
            </Tooltip>
            <Tooltip title="Info (I)">
              <button className={`hdr-btn ${panelTab === "info" ? "on" : ""}`} onClick={() => setPanelTab((p) => (p === "info" ? null : "info"))}>
                <InfoCircleOutlined />
              </button>
            </Tooltip>
            {currentPreviewItem.type === "photo" ? (
              <Tooltip title="Edit (E)">
                <button className={`hdr-btn ${panelTab === "edit" ? "on" : ""}`} onClick={() => setPanelTab((p) => (p === "edit" ? null : "edit"))}>
                  <SlidersOutlined />
                </button>
              </Tooltip>
            ) : null}
            <Tooltip title="Download">
              <button className="hdr-btn" onClick={() => downloadItem(currentPreviewItem)}><DownloadOutlined /></button>
            </Tooltip>
            <Tooltip title="Move to Trash">
              <button className="hdr-btn danger" onClick={() => deleteFromPreview(currentPreviewItem.id)}><DeleteOutlined /></button>
            </Tooltip>
            <button className="modal-top-close-trigger" onClick={closePreview}><CloseOutlined /></button>
          </div>
        </div>

        <div className="modal-body-row">
          <div className="modal-stage">
            <button className="modal-nav-arrow arrow-left-slide" onClick={() => navigatePreview(-1)}><LeftOutlined /></button>
            <button className="modal-nav-arrow arrow-right-slide" onClick={() => navigatePreview(1)}><RightOutlined /></button>

            <div
              className={`modal-media-viewport-center ${isNavigating ? `navigating-${isNavigating}` : ""}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onDoubleClick={() => (zoomScale === 1 ? setZoomScale(2) : handleZoomReset())}
              style={{ cursor: zoomScale > 1 ? "grab" : "default" }}
            >
              <div
                className="zoom-transform-container-fluid"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                  transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
              >
                {currentPreviewItem.type === "video" ? (
                  <video key={currentPreviewItem.id} src={currentPreviewItem.url} controls autoPlay className="modal-main-element-fluid" />
                ) : (
                  <img
                    key={currentPreviewItem.id}
                    src={currentPreviewItem.url}
                    alt={currentPreviewItem.title}
                    className={`modal-main-element-fluid ${slideshow ? "kenburns" : ""}`}
                    draggable={false}
                    style={{ filter: peekOriginal ? "none" : filterCss(currentPreviewItem.adjust) }}
                  />
                )}
              </div>
            </div>

            {slideshow ? (
              <div className="slideshow-progress" key={previewIndex}><span /></div>
            ) : null}

            {currentPreviewItem.type === "photo" ? (
              <div className="modal-bottom-zoom-cockpit">
                <button onClick={handleZoomOut} className="cockpit-btn" title="Zoom out"><ZoomOutOutlined /></button>
                <div className="scale-indicator-readout" onClick={handleZoomReset}>{Math.round(zoomScale * 100)}%</div>
                <button onClick={handleZoomIn} className="cockpit-btn" title="Zoom in"><ZoomInOutlined /></button>
                {zoomScale !== 1 ? (
                  <button onClick={handleZoomReset} className="cockpit-reset-btn"><ReloadOutlined /> Reset</button>
                ) : null}
              </div>
            ) : null}
          </div>

          <aside className={`modal-side-panel ${panelTab ? "open" : ""}`}>
            <div className="panel-inner">
              <div className="panel-tabs">
                <button className={panelTab === "info" ? "active" : ""} onClick={() => setPanelTab("info")}><InfoCircleOutlined /> Info</button>
                {currentPreviewItem.type === "photo" ? (
                  <button className={panelTab === "edit" ? "active" : ""} onClick={() => setPanelTab("edit")}><SlidersOutlined /> Edit</button>
                ) : null}
              </div>

              {panelTab === "edit" && currentPreviewItem.type === "photo" ? (
                <div className="panel-scroll">
                  <div className="panel-section">
                    <h5>Presets</h5>
                    <div className="preset-row">
                      {PRESETS.map((p) => (
                        <button
                          key={p.name}
                          className="preset-chip"
                          onClick={() => updateItem(currentPreviewItem.id, { adjust: { ...DEFAULT_ADJ, ...p.adj } })}
                        >
                          <span className="preset-thumb" style={{ backgroundImage: `url(${currentPreviewItem.url})`, filter: filterCss({ ...DEFAULT_ADJ, ...p.adj }) }} />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="panel-section">
                    <h5>Adjust</h5>
                    {ADJ_CONTROLS.map((c) => (
                      <label key={c.key} className="slider-row">
                        <span>{c.label}</span>
                        <input
                          type="range"
                          min={c.min}
                          max={c.max}
                          value={currentPreviewItem.adjust[c.key]}
                          onChange={(e) => adjustItem(currentPreviewItem, c.key, Number(e.target.value))}
                        />
                        <em>{currentPreviewItem.adjust[c.key]}{c.unit}</em>
                      </label>
                    ))}
                  </div>
                  <div className="panel-actions">
                    <button
                      className="peek-btn"
                      onPointerDown={() => setPeekOriginal(true)}
                      onPointerUp={() => setPeekOriginal(false)}
                      onPointerLeave={() => setPeekOriginal(false)}
                    >
                      Hold to see original
                    </button>
                    <button className="peek-btn ghost" onClick={() => updateItem(currentPreviewItem.id, { adjust: { ...DEFAULT_ADJ } })}>
                      <UndoOutlined /> Reset
                    </button>
                  </div>
                  <p className="panel-note">Edits are non-destructive. Download exports the edited version.</p>
                </div>
              ) : (
                <div className="panel-scroll">
                  <div className="panel-section">
                    <h5>Rating</h5>
                    <Stars value={currentPreviewItem.rating} onChange={(v) => updateItem(currentPreviewItem.id, { rating: v })} size={22} />
                  </div>
                  <div className="panel-section">
                    <h5>Details</h5>
                    <dl className="meta-grid">
                      <dt>Type</dt><dd>{currentPreviewItem.type}</dd>
                      <dt>Size</dt><dd>{fmtSize(currentPreviewItem.size)}</dd>
                      <dt>Dimensions</dt><dd>{currentPreviewItem.w ? `${currentPreviewItem.w} × ${currentPreviewItem.h}` : "—"}</dd>
                      <dt>Added</dt><dd>{fmtDate(currentPreviewItem.addedAt)}</dd>
                      <dt>Album</dt>
                      <dd>
                        <select
                          className="panel-select"
                          value={currentPreviewItem.albumId ?? ""}
                          onChange={(e) => updateItem(currentPreviewItem.id, { albumId: e.target.value === "" ? null : Number(e.target.value) })}
                        >
                          <option value="">None</option>
                          {albums.map((a) => (<option key={a.id} value={a.id}>{a.title}</option>))}
                        </select>
                      </dd>
                    </dl>
                  </div>
                  <div className="panel-section">
                    <h5>Tags</h5>
                    <div className="tag-editor">
                      {currentPreviewItem.tags.map((t) => (
                        <span key={t} className="tag-chip">#{t}<button onClick={() => removeTag(currentPreviewItem.id, t)}><CloseOutlined /></button></span>
                      ))}
                      <input
                        value={tagDraft}
                        placeholder="Add tag…"
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === "," ? (e.preventDefault(), addTag(currentPreviewItem.id, tagDraft)) : null)}
                        onBlur={() => (tagDraft.trim() ? addTag(currentPreviewItem.id, tagDraft) : null)}
                      />
                    </div>
                  </div>
                  <div className="panel-section">
                    <h5>Palette</h5>
                    {currentPreviewItem.palette.length > 0 ? (
                      <div className="palette-row">
                        {currentPreviewItem.palette.map((c) => (
                          <button key={c} className="swatch" style={{ background: c }} title={`Copy ${c}`} onClick={() => copyHex(c)}>
                            <CopyOutlined />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="muted-note">{currentPreviewItem.type === "video" ? "Palette is for photos." : "Not available for this image."}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="modal-filmstrip" ref={filmRef}>
          {displayedMedia.map((m, i) => (
            <button key={m.id} className={`film-thumb ${i === previewIndex ? "active" : ""}`} onClick={() => goTo(i)}>
              {m.type === "video" ? (
                <span className="film-video"><VideoCameraOutlined /></span>
              ) : (
                <img src={m.url} alt={m.title} loading="lazy" draggable={false} style={{ filter: filterCss(m.adjust) }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  /* ------------------------------------------------------------------ */
  /*  Overlay: compare / bulk / dock / toasts / uploads / drop / keys    */
  /* ------------------------------------------------------------------ */
  const cmpA = compareIds ? mediaList.find((m) => m.id === compareIds[0]) : undefined;
  const cmpB = compareIds ? mediaList.find((m) => m.id === compareIds[1]) : undefined;
  const compareModal = compareIds && cmpA && cmpB ? (
    <CompareModal a={cmpA} b={cmpB} onClose={() => setCompareIds(null)} onSwap={() => setCompareIds([compareIds[1], compareIds[0]])} />
  ) : null;

  const bulkBar = selectMode && selectedIds.length > 0 ? (
    <div className="bulk-bar">
      <span className="bulk-count">{selectedIds.length} selected</span>
      <button className="bulk-btn" onClick={() => setSelectedIds(displayedMedia.map((m) => m.id))}><CheckSquareOutlined /> All</button>
      {inTrash ? (
        <>
          <button className="bulk-btn" onClick={() => restoreItems(selectedIds)}><UndoOutlined /> Restore</button>
          <ConfirmDeleteButton
            mode="popover"
            itemName={`${selectedIds.length} item(s)`}
            icon={<DeleteOutlined />}
            iconOnly={false}
            label="Delete forever"
            className="bulk-btn danger"
            onDelete={() => purgeItems(selectedIds)}
          />
        </>
      ) : (
        <>
          <button className="bulk-btn" onClick={bulkFavorite}><HeartOutlined /> Favorite</button>
          <select
            className="bulk-select"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              moveToAlbum(selectedIds, v === "none" ? null : Number(v));
            }}
          >
            <option value="">Move to…</option>
            <option value="none">No album</option>
            {albums.map((a) => (<option key={a.id} value={a.id}>{a.title}</option>))}
          </select>
          <button className="bulk-btn" disabled={!canCompare} onClick={() => setCompareIds([selectedItems[0].id, selectedItems[1].id])}>
            <ColumnWidthOutlined /> Compare
          </button>
          <button className="bulk-btn" onClick={bulkDownload}><DownloadOutlined /> Download</button>
          <button className="bulk-btn danger" onClick={() => trashItems(selectedIds)}><DeleteOutlined /> Trash</button>
        </>
      )}
      <button className="bulk-btn ghost" onClick={exitSelect}><CloseOutlined /></button>
    </div>
  ) : null;

  const dock = draggingIds ? (
    <div className="album-dock">
      <span className="dock-label">Drop {draggingIds.length} item{draggingIds.length > 1 ? "s" : ""} into</span>
      {albums.map((a) => (
        <div
          key={a.id}
          className={`dock-chip ${dropAlbumId === a.id ? "hot" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDropAlbumId(a.id); }}
          onDragLeave={() => setDropAlbumId(null)}
          onDrop={(e) => { e.preventDefault(); dropOnAlbum(a.id); }}
        >
          <FolderOpenOutlined /> {a.title}
        </div>
      ))}
      <div
        className={`dock-chip muted ${dropAlbumId === -1 ? "hot" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDropAlbumId(-1); }}
        onDragLeave={() => setDropAlbumId(null)}
        onDrop={(e) => { e.preventDefault(); dropOnAlbum(null); }}
      >
        No album
      </div>
    </div>
  ) : null;

  const toastsUi = toasts.length > 0 ? (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="toast-item">
          <span>{t.msg}</span>
          {t.undo ? (
            <button
              onClick={() => {
                t.undo?.();
                setToasts((p) => p.filter((x) => x.id !== t.id));
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ))}
    </div>
  ) : null;

  const uploadTray = uploads.length > 0 ? (
    <div className="upload-tray">
      {uploads.map((u) => (
        <div key={u.id} className="upload-row">
          <span className="upload-name">{u.name}</span>
          <div className="upload-bar"><i style={{ width: `${u.pct}%` }} /></div>
        </div>
      ))}
    </div>
  ) : null;

  const dropOverlay = fileDragging ? (
    <div className="file-drop-overlay">
      <div className="file-drop-card">
        <CloudUploadOutlined />
        <h3>Drop to add to your library</h3>
        <p>{activeFolder === "album" && selectedAlbumId ? `Files will go into "${albums.find((a) => a.id === selectedAlbumId)?.title}"` : "Photos and videos are supported"}</p>
      </div>
    </div>
  ) : null;

  const shortcutsModal = showShortcuts ? (
    <div className="media-modal-backdrop shortcuts-backdrop" onClick={() => setShowShortcuts(false)}>
      <div className="shortcuts-card" onClick={(e) => e.stopPropagation()}>
        <div className="compare-head">
          <h3>Keyboard shortcuts</h3>
          <button className="modal-top-close-trigger" onClick={() => setShowShortcuts(false)}><CloseOutlined /></button>
        </div>
        <div className="shortcut-list">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="shortcut-row"><kbd>{k}</kbd><span>{d}</span></div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  const ringC = 2 * Math.PI * 18;

  const emptyState = (
    <div className="empty-state-notice custom-dash entrance-shimmer">
      {inTrash ? <RestOutlined className="empty-icon" /> : <CloudUploadOutlined className="empty-icon" />}
      <h4>{inTrash ? "Trash is empty" : hasActiveFilters ? "No matches" : "Nothing here yet"}</h4>
      <p>
        {inTrash
          ? "Deleted items stay here for 30 days."
          : hasActiveFilters
          ? "Try removing a filter or searching for something else."
          : "Drop files anywhere on this page or upload to get started."}
      </p>
      {inTrash ? null : hasActiveFilters ? (
        <button className="create-album-btn" onClick={clearFilters}><CloseOutlined /> Clear filters</button>
      ) : (
        <button className="create-album-btn" onClick={() => fileInputRef.current?.click()}><UploadOutlined /> Upload media</button>
      )}
    </div>
  );

  return (
    <div className="media-page animate-fade-in">
      <div className="glow-blob blob-1"></div>
      <div className="glow-blob blob-2"></div>

      <div className="media-header">
        <div className="brand-stack">
          <h2>Media <span className="neon-accent">Library</span></h2>
          <p>Organize, edit, and deliver your studio photos and videos in one place.</p>
        </div>

        <div className="media-controls-top">
          <div className="media-search glow-focus">
            <SearchOutlined className="search-icon" />
            <input
              ref={searchRef}
              placeholder="Search title or #tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd className="kbd-hint">/</kbd>
          </div>

          <Tooltip title={filterLikedOnly ? "Show all media" : "Show favorites only"}>
            <button className={`fav-toggle-pill ${filterLikedOnly ? "active" : ""}`} onClick={() => setFilterLikedOnly(!filterLikedOnly)}>
              {filterLikedOnly ? <HeartFilled /> : <HeartOutlined />}
              <span> ({counts.favorites})</span>
            </button>
          </Tooltip>

          <Tooltip title="Upload media (U)">
            <button className="upload-btn dynamic-button" onClick={() => fileInputRef.current?.click()}>
              <UploadOutlined className="bounce-loop" />
            </button>
          </Tooltip>

          <Tooltip title="Shortcuts (?)">
            <button className="icon-pill" onClick={() => setShowShortcuts(true)}><QuestionCircleOutlined /></button>
          </Tooltip>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={activeFolder === "photo" ? "image/*" : activeFolder === "video" ? "video/*" : "image/*,video/*"}
            onChange={handleUpload}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <div className="stats-strip">
        <div className="stat-card"><PictureOutlined /><div><b>{counts.photos}</b><span>Photos</span></div></div>
        <div className="stat-card"><VideoCameraOutlined /><div><b>{counts.videos}</b><span>Videos</span></div></div>
        <div className="stat-card"><HeartFilled className="pink" /><div><b>{counts.favorites}</b><span>Favorites</span></div></div>
        <div className={`stat-card storage-card ${storagePct > 85 || storageFull ? "warn" : ""}`}>
          <svg viewBox="0 0 44 44" className="ring" aria-hidden="true">
            <circle cx="22" cy="22" r="18" className="ring-bg" />
            <circle cx="22" cy="22" r="18" className="ring-fg" strokeDasharray={ringC} strokeDashoffset={ringC * (1 - storagePct / 100)} />
          </svg>
          <div>
            <b>{storagePct.toFixed(0)}%</b>
            <span>{storageFull ? "Storage full" : "Local storage"}</span>
          </div>
        </div>
      </div>

      <div className="media-folders-switchboard">
        {folderTabs.map((folder) => (
          <div key={folder.key} className={`folder-pill ${activeFolder === folder.key ? "active" : ""}`} onClick={() => switchFolder(folder.key)}>
            <span className="pill-icon">{folder.icon}</span>
            <span className="pill-label">{folder.label}</span>
            <span className="pill-badge">{folder.info}</span>
          </div>
        ))}
      </div>

      <div className="content-height-wrapper" style={{ height: containerHeight !== undefined ? `${containerHeight}px` : "auto" }}>
        <div ref={contentWrapperRef} className={`content-fade-inner ${contentFading ? "fading" : ""}`}>
          {albumRoot ? (
            <div className="album-directory-wrapper">
              <div className="album-action-bar">
                <h3>Folders</h3>
                <button className="create-album-btn" onClick={createAlbum}><PlusOutlined /> Create New Album</button>
              </div>
              {albums.length === 0 ? (
                <div className="empty-state-notice custom-dash">
                  <FolderOpenOutlined className="empty-icon" />
                  <h4>No albums yet</h4>
                  <p>Create an album, then drag photos onto it.</p>
                </div>
              ) : (
                <div className="albums-grid">
                  {albums.map((alb, index) => {
                    const inAlbum = live.filter((m) => m.albumId === alb.id);
                    const covers = inAlbum.filter((m) => m.type === "photo").slice(0, 3);
                    return (
                      <div
                        key={alb.id}
                        className={`album-folder-card ${dropAlbumId === alb.id ? "drop-hover" : ""}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => openAlbumFolder(alb.id)}
                        onDragOver={(e) => { if (draggingIds) { e.preventDefault(); setDropAlbumId(alb.id); } }}
                        onDragLeave={() => setDropAlbumId(null)}
                        onDrop={(e) => { e.preventDefault(); dropOnAlbum(alb.id); }}
                      >
                        {covers.length === 0 ? (
                          <div className="folder-graphic-stack">
                            <div className="folder-back-plate"></div>
                            <FolderOpenOutlined className="large-folder-icon" />
                          </div>
                        ) : (
                          <div className="album-cover-stack">
                            {covers.map((c, i) => (
                              <img key={c.id} src={c.url} alt="" draggable={false} className={`cover-shot cover-${i}`} style={{ filter: filterCss(c.adjust) }} />
                            ))}
                          </div>
                        )}
                        <h4>{alb.title}</h4>
                        <span className="items-badge">{inAlbum.length} items</span>
                        <button className="album-card-edit" onClick={(e) => renameAlbum(alb, e)} title="Rename album"><EditOutlined /></button>
                        <ConfirmDeleteButton
                          mode="popover"
                          itemName={alb.title}
                          icon={<DeleteOutlined />}
                          className="album-card-delete"
                          onDelete={() => deleteAlbum(alb.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {albumRoot ? null : (
            <>
              <div className="media-filter-bar">
                <div className="filter-left">
                  <FilterOutlined className="pulse-icon" />
                  <span>
                    {`${displayedMedia.length} item${displayedMedia.length === 1 ? "" : "s"}`}
                    {selectedAlbumId ? ` in "${albums.find((a) => a.id === selectedAlbumId)?.title}"` : ""}
                  </span>
                  {selectedAlbumId ? (
                    <button className="back-to-albums-link" onClick={backToAlbums}>← Back to Albums</button>
                  ) : null}
                  {hasActiveFilters ? (
                    <button className="back-to-albums-link subtle" onClick={clearFilters}>Clear filters</button>
                  ) : null}
                </div>

                <div className="filter-right">
                  <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} aria-label="Sort">
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">Name A–Z</option>
                    <option value="rating">Top rated</option>
                    <option value="size">Largest</option>
                  </select>

                  <Tooltip title="Minimum rating">
                    <span className="rating-filter"><Stars value={minRating} onChange={setMinRating} size={13} /></span>
                  </Tooltip>

                  <div className="view-toggle-buttons">
                    <Tooltip title="Grid view">
                      <button className={viewMode === "grid" ? "active-toggle" : ""} onClick={() => switchViewMode("grid")}><AppstoreOutlined /></button>
                    </Tooltip>
                    <Tooltip title="Masonry view">
                      <button className={viewMode === "masonry" ? "active-toggle" : ""} onClick={() => switchViewMode("masonry")}><BlockOutlined /></button>
                    </Tooltip>
                    <Tooltip title="List view">
                      <button className={viewMode === "list" ? "active-toggle" : ""} onClick={() => switchViewMode("list")}><BarsOutlined /></button>
                    </Tooltip>
                  </div>

                  <Tooltip title="Select multiple (S)">
                    <button className={`select-toggle ${selectMode ? "active" : ""}`} onClick={toggleSelectMode}>
                      <CheckSquareOutlined /> Select
                    </button>
                  </Tooltip>
                </div>
              </div>

              {tagCloud.length > 0 || availableColors.length > 0 ? (
                <div className="chips-row">
                  {tagCloud.map(([t, n]) => (
                    <button key={t} className={`chip ${activeTag === t ? "active" : ""}`} onClick={() => setActiveTag(activeTag === t ? null : t)}>
                      <TagOutlined /> {t} <em>{n}</em>
                    </button>
                  ))}
                  {availableColors.length > 0 ? <span className="chips-sep"></span> : null}
                  {availableColors.map((c) => (
                    <Tooltip key={c.key} title={c.label}>
                      <button
                        className={`color-dot ${colorFilter === c.key ? "active" : ""}`}
                        style={{ background: c.swatch }}
                        onClick={() => setColorFilter(colorFilter === c.key ? null : c.key)}
                        aria-label={`Filter ${c.label}`}
                      />
                    </Tooltip>
                  ))}
                </div>
              ) : null}

              {inTrash && trashed.length > 0 ? (
                <div className="trash-banner">
                  <span>Items in Trash are removed automatically after 30 days.</span>
                  <ConfirmDeleteButton
                    mode="popover"
                    itemName="everything in Trash"
                    icon={<DeleteOutlined />}
                    iconOnly={false}
                    label="Empty Trash"
                    className="empty-trash-btn"
                    onDelete={() => purgeItems(trashed.map((m) => m.id))}
                  />
                </div>
              ) : null}

              {displayedMedia.length === 0 ? (
                emptyState
              ) : (
                <div className={`media-layout-${viewMode} streams-container`}>
                  {displayedMedia.map((item, idx) => {
                    const selected = selectedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`media-card sequential-node ${selected ? "is-selected" : ""} ${selectMode ? "select-mode" : ""}`}
                        style={{ "--node-index": Math.min(idx, 30) } as React.CSSProperties}
                        draggable={!inTrash}
                        onDragStart={(e) => onCardDragStart(e, item.id)}
                        onDragEnd={onCardDragEnd}
                        onClick={(e) => onCardClick(e, item, idx)}
                      >
                        <div className="media-image-wrapper">
                          {item.type === "video" ? (
                            <video src={item.url} muted playsInline className="media-element-thumb" />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.title}
                              className="media-element-thumb"
                              loading="lazy"
                              draggable={false}
                              style={{ filter: filterCss(item.adjust) }}
                            />
                          )}

                          <div className={`media-overlay-tag ${item.type}`}>{item.type === "video" ? "▶ Video" : "📷 Photo"}</div>

                          {isEdited(item.adjust) ? <span className="edited-dot" title="Edited"><SlidersOutlined /></span> : null}

                          <div className={`select-check ${selected ? "on" : ""}`}>{selected ? <CheckCircleFilled /> : null}</div>

                          <div className="media-thumb-actions-drawer">
                            {inTrash ? (
                              <>
                                <button className="action-drawer-btn heart-action" title="Restore" onClick={(e) => { e.stopPropagation(); restoreItems([item.id]); }}>
                                  <UndoOutlined />
                                </button>
                                <ConfirmDeleteButton
                                  mode="popover"
                                  itemName={item.title}
                                  icon={<DeleteOutlined />}
                                  className="action-drawer-btn delete-action"
                                  onDelete={() => purgeItems([item.id])}
                                />
                              </>
                            ) : (
                              <>
                                <button className="action-drawer-btn heart-action" onClick={(e) => toggleLike(item.id, e)}>
                                  {item.liked ? <HeartFilled style={{ color: "#ff2e63" }} /> : <HeartOutlined />}
                                </button>
                                <button className="action-drawer-btn delete-action" title="Move to Trash" onClick={(e) => { e.stopPropagation(); trashItems([item.id]); }}>
                                  <DeleteOutlined />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="media-info-deck">
                          <div className="media-title-line">
                            <h4>{item.title}</h4>
                            {item.liked ? <StarOutlined className="neon-star" /> : null}
                          </div>
                          <div className="meta-footer">
                            <span className="media-type-label">{item.type}</span>
                            <span className="meta-right">
                              {item.dom ? <i className="dom-dot" style={{ background: item.dom }} title={item.dom} /> : null}
                              {inTrash ? null : <Stars value={item.rating} onChange={(v) => updateItem(item.id, { rating: v })} size={12} />}
                            </span>
                          </div>
                          {item.tags.length > 0 ? (
                            <div className="mini-tags">
                              {item.tags.slice(0, 3).map((t) => (<span key={t} className="mini-tag">#{t}</span>))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <>
              {previewModal}
              {compareModal}
              {bulkBar}
              {dock}
              {toastsUi}
              {uploadTray}
              {dropOverlay}
              {shortcutsModal}
            </>,
            document.body
          )
        : null}
    </div>
  );
}