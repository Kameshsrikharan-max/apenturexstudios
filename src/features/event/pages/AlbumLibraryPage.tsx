import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined, SearchOutlined, DeleteOutlined, BookOutlined, PictureOutlined, CloseOutlined,
  LeftOutlined, RightOutlined, CaretRightOutlined, PauseCircleOutlined, SoundOutlined, AudioMutedOutlined,
  CalendarOutlined, TagOutlined, StarOutlined, StarFilled, EditOutlined, CopyOutlined, AppstoreOutlined,
  UnorderedListOutlined, CheckSquareOutlined, ExportOutlined, ImportOutlined, PlusOutlined, DatabaseOutlined,
  ThunderboltOutlined, PushpinOutlined, PushpinFilled, InfoCircleOutlined, FullscreenOutlined,
  FullscreenExitOutlined, ZoomInOutlined, ZoomOutOutlined, ReadOutlined, FieldTimeOutlined, MoreOutlined,
  CloudUploadOutlined, ClockCircleOutlined, UndoOutlined, CameraOutlined, HddOutlined, CompressOutlined,
  SafetyCertificateOutlined, BgColorsOutlined, WarningOutlined, BulbOutlined,
  SaveOutlined, TableOutlined, UpOutlined, DownOutlined, CheckCircleFilled, MinusCircleOutlined,
} from "@ant-design/icons";
import {
  getSavedAlbums, deleteSavedAlbum, deleteSavedAlbums, subscribeToAlbumLibrary, getFavoriteIds, toggleFavorite,
  renameSavedAlbum, duplicateSavedAlbum, getLibraryStats, exportAlbumsAsJson, importAlbumsFromJsonText,
  beginEditAlbum, beginBlankAlbum, upsertSavedAlbum, LIBRARY_LIMITS, isLibraryReady, whenLibraryReady,
  subscribeToStorageErrors, getStorageEstimate, requestPersistentStorage, optimizeLibrary,
  type SavedAlbumEntry, type LibrarySheetSnapshot, type LibraryTextSnapshot, type LibraryStats,
  type StorageEstimateInfo, type OptimizeOptions, type OptimizeResult,
} from "../../../utils/albumLibraryStore"; 
import { getLayout, rectStyle } from "./TemplateEditorPage"; // adjust path if this page lives elsewhere
import "./AlbumLibraryPage.css";

/* ════════════════════════════ constants & types ════════════════════════════ */
const CANVAS_W = 2540;
const CANVAS_H = 2032;
const FLIP_MS = 640;
const MAX_STACK_PAGES = 16;
const SPEEDS = [
  { label: "Fast", ms: 1500 },
  { label: "Normal", ms: 2600 },
  { label: "Slow", ms: 4200 },
];
const LABEL_COLORS = ["#38d5ff", "#4ade80", "#fbbf24", "#f472b6", "#a78bfa", "#fb7185"];
const MIX_COLORS = ["#38d5ff", "#4ade80", "#fbbf24", "#a78bfa", "#f472b6", "#fb7185", "#94a3b8"];
const META_KEY = "axs.albumLibrary.meta.v1";
const ORDER_KEY = "axs.albumLibrary.order.v1";
const PREFS_KEY = "axs.albumLibrary.prefs.v1";
const BACKUP_KEY = "axs.albumLibrary.lastBackup.v1";
const VIEWS_KEY = "axs.albumLibrary.savedViews.v1";
const RECENT_DAYS = 14;
const BACKUP_NUDGE_DAYS = 7;
const WALL_PAGE = 96;
const MAX_SAVED_VIEWS = 8;

const PRESETS: { id: string; label: string; hint: string; opts: OptimizeOptions }[] = [
  { id: "balanced", label: "Balanced", hint: "1600 px · sharp on screens and 8×10 prints", opts: { maxDim: 1600, quality: 0.82 } },
  { id: "compact", label: "Compact", hint: "1280 px · smallest files, fits the most photos", opts: { maxDim: 1280, quality: 0.72 } },
  { id: "archive", label: "High quality", hint: "2400 px · large prints, uses more space", opts: { maxDim: 2400, quality: 0.9 } },
];

type FlipDir = "forward" | "backward";
interface TurnState { from: number; to: number; dir: FlipDir; committing: boolean }
type ViewMode = "grid" | "list" | "shelf" | "timeline" | "wall";
type SortMode = "newest" | "oldest" | "name" | "pages" | "completion" | "opened" | "mostOpened" | "custom";
type Collection = "all" | "favorites" | "pinned" | "recent" | "incomplete";
const VIEW_ORDER: ViewMode[] = ["grid", "list", "shelf", "timeline", "wall"];

interface AlbumMeta { tags: string[]; note: string; color: string | null; pinned: boolean; opens: number; lastOpened?: string }
const DEFAULT_META: AlbumMeta = { tags: [], note: "", color: null, pinned: false, opens: 0 };
interface Prefs { view: ViewMode; sort: SortMode; density: number }
interface Fill { filled: number; total: number; pct: number }
interface ToastState { msg: string; action?: { label: string; run: () => void } }
interface MenuItem { id: string; label: string; icon?: React.ReactNode; run?: () => void; danger?: boolean; sep?: boolean }
interface PaletteItem { id: string; label: string; hint?: string; icon: React.ReactNode; run: () => void; group: "Actions" | "Albums" }
interface OptState { running: boolean; done: number; total: number; result?: OptimizeResult }
interface WallPhoto { key: string; album: SavedAlbumEntry; sheet: number; src: string; label: string }
interface SavedView { id: string; name: string; search: string; service: string; collection: Collection; tag: string | null }
interface Insight { id: string; label: string; icon: React.ReactNode; tone: "warn" | "info"; run: () => void }

/* ════════════════════════════ helpers ════════════════════════════ */
function usePersisted<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      if (initial && typeof initial === "object" && !Array.isArray(initial) && parsed && typeof parsed === "object") {
        return { ...initial, ...parsed };
      }
      return parsed as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage full / blocked */ }
  }, [key, val]);
  return [val, setVal];
}

const pageCount = (a: SavedAlbumEntry) => a.sheetCount ?? a.sheets.length;

function albumFill(a: SavedAlbumEntry): Fill {
  let filled = 0;
  let total = 0;
  a.sheets.forEach((s) => s.slots.forEach((sl) => { total++; if (sl.image) filled++; }));
  return { filled, total, pct: total ? Math.round((filled / total) * 100) : 100 };
}

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });

function relativeTime(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtBytes(n: number) {
  if (!n || n < 0) return "0 KB";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const normalizeTag = (t: string) => t.trim().toLowerCase().replace(/^#+/, "").slice(0, 24);
const clampNum = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const spreadForSheet = (i: number) => (i > 0 ? 1 + Math.floor((i - 1) / 2) : 0);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Average colour of a cover, used to tint each card's glow. */
const colorCache = new Map<string, string>();
function useDominantColor(src?: string | null) {
  const [rgb, setRgb] = useState<string | null>(src ? colorCache.get(src) ?? null : null);
  useEffect(() => {
    if (!src) { setRgb(null); return; }
    const hit = colorCache.get(src);
    if (hit) { setRgb(hit); return; }
    let dead = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = cv.height = 8;
        const cx = cv.getContext("2d");
        if (!cx) return;
        cx.drawImage(img, 0, 0, 8, 8);
        const d = cx.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0;
        const n = d.length / 4;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        r /= n; g /= n; b /= n;
        const mean = (r + g + b) / 3;
        const boost = (v: number) => Math.round(clampNum(mean + (v - mean) * 1.5, 40, 255));
        const val = `${boost(r)},${boost(g)},${boost(b)}`;
        colorCache.set(src, val);
        if (!dead) setRgb(val);
      } catch { /* tainted canvas — keep default glow */ }
    };
    img.src = src;
    return () => { dead = true; };
  }, [src]);
  return rgb;
}

/** Colour story: the 5 most characteristic colours across an album's photos. */
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(clampNum(v, 0, 255)).toString(16).padStart(2, "0")).join("")}`;

function useAlbumPalette(album: SavedAlbumEntry | null) {
  const [colors, setColors] = useState<string[]>([]);
  useEffect(() => {
    if (!album) { setColors([]); return; }
    let dead = false;
    const srcs: string[] = [];
    if (album.coverImage) srcs.push(album.coverImage);
    outer: for (const s of album.sheets) {
      for (const sl of s.slots) {
        if (sl.image) srcs.push(sl.image);
        if (srcs.length >= 14) break outer;
      }
    }
    if (!srcs.length) { setColors([]); return; }

    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    let pending = srcs.length;
    const finish = () => {
      if (dead) return;
      const ranked = [...buckets.values()].sort((a, b) => b.n - a.n);
      const picked: { r: number; g: number; b: number }[] = [];
      for (const v of ranked) {
        const c = { r: v.r / v.n, g: v.g / v.n, b: v.b / v.n };
        if (picked.every((p) => Math.abs(p.r - c.r) + Math.abs(p.g - c.g) + Math.abs(p.b - c.b) > 110)) picked.push(c);
        if (picked.length === 5) break;
      }
      setColors(picked.map((c) => toHex(c.r, c.g, c.b)));
    };
    srcs.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement("canvas");
          cv.width = cv.height = 12;
          const cx = cv.getContext("2d");
          if (cx) {
            cx.drawImage(img, 0, 0, 12, 12);
            const d = cx.getImageData(0, 0, 12, 12).data;
            for (let i = 0; i < d.length; i += 4) {
              const r = d[i], g = d[i + 1], b = d[i + 2];
              const lum = (r + g + b) / 3;
              if (lum < 28 || lum > 240) continue; // skip pure black / white
              const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
              const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
              cur.n++; cur.r += r; cur.g += g; cur.b += b;
              buckets.set(key, cur);
            }
          }
        } catch { /* ignore */ }
        if (--pending === 0) finish();
      };
      img.onerror = () => { if (--pending === 0) finish(); };
      img.src = src;
    });
    return () => { dead = true; };
  }, [album?.id, album?.savedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  return colors;
}

/** Search operators: tag:x  service:x  is:fav  is:pinned  is:incomplete  is:untagged  is:heavy  pages>10  pages<5 */
function parseQuery(raw: string) {
  const out = {
    terms: [] as string[], tags: [] as string[], services: [] as string[],
    fav: false, pinned: false, incomplete: false, untagged: false, heavy: false,
    pagesMin: null as number | null, pagesMax: null as number | null,
  };
  raw.trim().toLowerCase().split(/\s+/).filter(Boolean).forEach((t) => {
    let m: RegExpMatchArray | null;
    if (t.startsWith("tag:") && t.length > 4) out.tags.push(t.slice(4));
    else if (t.startsWith("service:") && t.length > 8) out.services.push(t.slice(8));
    else if (t === "is:fav" || t === "is:favorite") out.fav = true;
    else if (t === "is:pinned") out.pinned = true;
    else if (t === "is:incomplete" || t === "is:empty") out.incomplete = true;
    else if (t === "is:untagged") out.untagged = true;
    else if (t === "is:heavy") out.heavy = true;
    else if ((m = t.match(/^pages([<>])(\d+)$/))) {
      if (m[1] === ">") out.pagesMin = Number(m[2]) + 1; else out.pagesMax = Number(m[2]) - 1;
    } else out.terms.push(t);
  });
  return out;
}

/* ════════════════════════════ read-only page renderer ════════════════════════════ */
function LibraryTextLayer({ el }: { el: LibraryTextSnapshot }) {
  return (
    <div
      className="alv-text-el"
      style={{
        top: `${el.yPct}%`, left: `${el.xPct}%`, width: `${el.wPct}%`, height: `${el.hPct}%`,
        transform: `rotate(${el.rotate}deg)`, color: el.color, fontFamily: el.fontFamily,
        fontWeight: el.bold ? 800 : 500, fontStyle: el.italic ? "italic" : "normal",
        textDecoration: el.underline ? "underline" : "none", textAlign: el.align, background: el.bg,
        fontSize: `${el.fontSize}cqw`,
        justifyContent: el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
      }}
    >
      {el.text}
    </div>
  );
}

function renderLibraryPage(sheet: LibrarySheetSnapshot | undefined, pageNumber?: number) {
  if (!sheet) return <div className="alv-blank-leaf" />;
  const meta = getLayout(sheet.layout as any);
  return (
    <div className="alv-page-surface" style={{ background: sheet.bgImage ? `url(${sheet.bgImage}) center/cover` : sheet.bgColor }}>
      {meta.id === "magazine" && meta.textRect ? (
        <div className="alv-magazine-text" style={rectStyle(meta.textRect, 6, 0)}>
          <div className="alv-magazine-title">{sheet.title || "Your Story"}</div>
          <div className="alv-magazine-subtitle">{sheet.subtitle || "A moment worth remembering"}</div>
        </div>
      ) : null}
      {meta.decorative === "vs" ? <div className="alv-vs-badge">VS</div> : null}
      {meta.decorative === "spine" ? <div className="alv-panoramic-spine" /> : null}
      {meta.decorative === "timeline" ? <div className="alv-timeline-line" /> : null}

      {sheet.slots.map((slot, i) => {
        const rect = meta.rects[i] ?? meta.rects[meta.rects.length - 1];
        const rotate = (rect.rotate ?? 0) + (slot.rotateExtra ?? 0);
        const transform = `rotate(${rotate}deg) scaleX(${slot.flip ? -1 : 1}) scale(${slot.scale ?? 1})`;
        return (
          <div
            key={slot.id}
            className={`alv-slot ${meta.style === "polaroid" ? "alv-slot-polaroid" : ""} ${meta.style === "collage" ? "alv-slot-collage" : ""}`}
            style={{ ...rectStyle(rect, 6, meta.style === "polaroid" ? 2 : 10), transform, zIndex: slot.front ? 50 : rect.z ?? 1 }}
          >
            <div className="alv-slot-media">
              {slot.image ? (
                <img src={slot.image} alt={slot.fileName ?? "photo"} style={{ filter: slot.filter || "none" }} />
              ) : (
                <div className="alv-slot-empty"><PictureOutlined /><span>No photo</span></div>
              )}
            </div>
            {meta.decorative === "timeline" ? <span className="alv-timeline-step">{i + 1}</span> : null}
            {meta.captions ? <div className="alv-slot-caption">{slot.caption}</div> : null}
          </div>
        );
      })}
      {sheet.textElements.map((el) => <LibraryTextLayer key={el.id} el={el} />)}
      {typeof pageNumber === "number" ? <span className="alv-leaf-page-num">{pageNumber}</span> : null}
    </div>
  );
}

/* ════════════════════════════ flip-book viewer ════════════════════════════ */
function AlbumViewer({
  album, initialSheet = 0, onClose, onEdit,
}: {
  album: SavedAlbumEntry; initialSheet?: number; onClose: () => void; onEdit: (album: SavedAlbumEntry) => void;
}) {
  const sheets = album.sheets;
  const totalSpreads = sheets.length <= 1 ? 1 : 1 + Math.ceil((sheets.length - 1) / 2);
  const [reviewIndex, setReviewIndex] = useState(() => Math.min(spreadForSheet(initialSheet), totalSpreads - 1));
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [gap, setGap] = useState(SPEEDS[1].ms);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFs, setIsFs] = useState(false);
  const [overview, setOverview] = useState(false);
  const [goto, setGoto] = useState("");

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const flipTimerRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const turnRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const dragMeta = useRef<{ dir: FlipDir; startX: number; width: number; progress: number } | null>(null);
  const panMeta = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);

  const spreadLeft = (i: number): LibrarySheetSnapshot | undefined => (i === 0 ? undefined : sheets[1 + (i - 1) * 2]);
  const spreadRight = (i: number): LibrarySheetSnapshot | undefined => (i === 0 ? sheets[0] : sheets[1 + (i - 1) * 2 + 1]);

  /* focus management: trap into the dialog, restore on close */
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    overlayRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => () => {
    if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
    if (autoPlayTimerRef.current) window.clearTimeout(autoPlayTimerRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
  }, []);

  const toggleFullscreen = () => {
    const el = overlayRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const clampPan = (x: number, y: number, z: number) => {
    const w = bookRef.current?.offsetWidth ?? 0;
    const h = bookRef.current?.offsetHeight ?? 0;
    const mx = ((z - 1) * w) / 2;
    const my = ((z - 1) * h) / 2;
    return { x: clampNum(x, -mx, mx), y: clampNum(y, -my, my) };
  };

  const changeZoom = (z: number) => {
    const nz = clampNum(Math.round(z * 100) / 100, 1, 3);
    setZoom(nz);
    setPan((p) => (nz === 1 ? { x: 0, y: 0 } : clampPan(p.x, p.y, nz)));
  };

  const clearTurnTimer = () => {
    if (flipTimerRef.current) { window.clearTimeout(flipTimerRef.current); flipTimerRef.current = null; }
  };

  const playFlipSound = () => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current!;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const duration = 0.3;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.3);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2600, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + duration);
      filter.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + duration + 0.02);
    } catch { /* audio unavailable */ }
  };

  const setTurnVisual = (angleDeg: number, withTransition: boolean, durationMs: number = FLIP_MS) => {
    const el = turnRef.current;
    if (el) {
      el.style.transition = withTransition ? `transform ${durationMs}ms cubic-bezier(0.45,0,0.2,1)` : "none";
      el.style.transform = `rotateY(${angleDeg}deg)`;
    }
    const shadowEl = shadowRef.current;
    if (shadowEl) {
      const norm = Math.min(Math.abs(angleDeg) / 180, 1);
      shadowEl.style.transition = withTransition ? `opacity ${durationMs}ms ease` : "none";
      shadowEl.style.opacity = String(Math.sin(norm * Math.PI) * 0.6);
    }
  };

  const startCommittedFlip = (nextIndex: number, dir: FlipDir, fromAngle = 0, duration = FLIP_MS) => {
    if (turn || nextIndex < 0 || nextIndex >= totalSpreads) return;
    clearTurnTimer();
    playFlipSound();
    setPan({ x: 0, y: 0 });
    setTurn({ from: reviewIndex, to: nextIndex, dir, committing: true });
    requestAnimationFrame(() => {
      setTurnVisual(fromAngle, false);
      requestAnimationFrame(() => setTurnVisual(dir === "forward" ? -180 : 180, true, duration));
    });
    flipTimerRef.current = window.setTimeout(() => {
      setReviewIndex(nextIndex);
      setTurn(null);
      flipTimerRef.current = null;
    }, duration);
  };

  const goToPage = (dir: FlipDir) => {
    if (turn) return;
    startCommittedFlip(dir === "forward" ? reviewIndex + 1 : reviewIndex - 1, dir);
  };
  const jumpToPage = (index: number) => {
    if (turn || index === reviewIndex) return;
    startCommittedFlip(index, index > reviewIndex ? "forward" : "backward");
  };

  const submitGoto = () => {
    const n = clampNum(parseInt(goto, 10) || 0, 1, sheets.length);
    setGoto("");
    setAutoPlay(false);
    jumpToPage(spreadForSheet(n - 1));
    overlayRef.current?.focus();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(input|textarea)$/i.test(t.tagName)) {
        if (e.key === "Escape") t.blur();
        return;
      }
      if (overview) {
        if (e.key === "Escape" || e.key.toLowerCase() === "g") { e.preventDefault(); setOverview(false); }
        return;
      }
      if (e.key === "ArrowRight") goToPage("forward");
      else if (e.key === "ArrowLeft") goToPage("backward");
      else if (e.key === "Home") jumpToPage(0);
      else if (e.key === "End") jumpToPage(totalSpreads - 1);
      else if (e.key === "Escape") onClose();
      else if (e.key === " ") { e.preventDefault(); setAutoPlay((a) => !a); }
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
      else if (e.key.toLowerCase() === "g") { setAutoPlay(false); setOverview(true); }
      else if (e.key === "+" || e.key === "=") changeZoom(zoom + 0.5);
      else if (e.key === "-") changeZoom(zoom - 0.5);
      else if (e.key === "0") changeZoom(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewIndex, turn, zoom, overview]);

  useEffect(() => {
    if (!autoPlay || turn) return;
    if (reviewIndex >= totalSpreads - 1) { setAutoPlay(false); return; }
    autoPlayTimerRef.current = window.setTimeout(() => goToPage("forward"), gap);
    return () => {
      if (autoPlayTimerRef.current) { window.clearTimeout(autoPlayTimerRef.current); autoPlayTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, reviewIndex, turn, totalSpreads, gap]);

  const onBookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      panMeta.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
      return;
    }
    if (turn) return;
    setAutoPlay(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const dir: FlipDir = e.clientX - rect.left > rect.width / 2 ? "forward" : "backward";
    const targetIndex = dir === "forward" ? reviewIndex + 1 : reviewIndex - 1;
    if (targetIndex < 0 || targetIndex >= totalSpreads) return;
    dragMeta.current = { dir, startX: e.clientX, width: rect.width / 2, progress: 0 };
    setTurn({ from: reviewIndex, to: targetIndex, dir, committing: false });
    requestAnimationFrame(() => setTurnVisual(0, false));
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const onBookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pm = panMeta.current;
    if (pm) {
      setPan(clampPan(pm.ox + (e.clientX - pm.sx), pm.oy + (e.clientY - pm.sy), zoom));
      return;
    }
    const meta = dragMeta.current;
    if (!meta || !turn || turn.committing) return;
    const deltaX = e.clientX - meta.startX;
    const raw = meta.dir === "forward" ? -deltaX : deltaX;
    const progress = Math.min(Math.max(raw / (meta.width * 0.92), 0), 1);
    meta.progress = progress;
    setTurnVisual(meta.dir === "forward" ? -progress * 178 : progress * 178, false);
  };

  const finishDrag = () => {
    if (panMeta.current) { panMeta.current = null; return; }
    const meta = dragMeta.current;
    dragMeta.current = null;
    if (!meta || !turn || turn.committing) return;
    const targetIndex = turn.to;
    const dir = turn.dir;
    if (meta.progress > 0.32) {
      const duration = Math.max(180, Math.round(FLIP_MS * (1 - meta.progress) + 120));
      playFlipSound();
      setTurn((t) => (t ? { ...t, committing: true } : t));
      clearTurnTimer();
      requestAnimationFrame(() => setTurnVisual(dir === "forward" ? -180 : 180, true, duration));
      flipTimerRef.current = window.setTimeout(() => { setReviewIndex(targetIndex); setTurn(null); flipTimerRef.current = null; }, duration);
    } else {
      const duration = Math.max(160, Math.round(FLIP_MS * meta.progress * 0.5 + 160));
      setTurn((t) => (t ? { ...t, committing: true } : t));
      clearTurnTimer();
      requestAnimationFrame(() => setTurnVisual(0, true, duration));
      flipTimerRef.current = window.setTimeout(() => { setTurn(null); flipTimerRef.current = null; }, duration);
    }
  };

  const renderHardCover = () => (
    <div className="alv-hard-cover">
      <div className="alv-cover-board" />
      {renderLibraryPage(sheets[0])}
      <div className="alv-cover-gloss" />
      <div className="alv-cover-spine" />
    </div>
  );

  const currentLeft = spreadLeft(reviewIndex);
  const currentRight = spreadRight(reviewIndex);
  const visibleIndex = turn?.to ?? reviewIndex;
  const visibleLeft = spreadLeft(visibleIndex);
  const visibleRight = spreadRight(visibleIndex);
  const showingCover = visibleIndex === 0;
  const firstPageNum = reviewIndex === 0 ? 1 : 2 + (reviewIndex - 1) * 2;
  const lastPageNum = reviewIndex === 0 ? 1 : currentRight ? firstPageNum + 1 : firstPageNum;
  const vFirstPageNum = visibleIndex === 0 ? 1 : 2 + (visibleIndex - 1) * 2;
  const vLastPageNum = visibleIndex === 0 ? 1 : visibleRight ? vFirstPageNum + 1 : vFirstPageNum;
  const turnedCount = Math.min(reviewIndex, MAX_STACK_PAGES);
  const remainingCount = Math.min(totalSpreads - 1 - reviewIndex, MAX_STACK_PAGES);
  const progressPct = totalSpreads > 1 ? Math.round((reviewIndex / (totalSpreads - 1)) * 100) : 100;

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Album viewer: ${album.templateName}`}
      className={`alv-overlay ${isFs ? "alv-fullscreen" : ""}`}
      onClick={onClose}
    >
      <div className="alv-shell" onClick={(e) => e.stopPropagation()}>
        <div className="alv-shell-head">
          <div className="alv-shell-title">
            <BookOutlined /> {album.templateName}
            <span className="alv-shell-subtitle">{album.eventName} · {album.serviceName} · v{album.versionNum}</span>
          </div>
          <div className="alv-shell-actions">
            <button className="alv-mini-btn" onClick={() => onEdit(album)}><EditOutlined /> Edit</button>
            <button className="alv-mini-btn" onClick={() => { setAutoPlay(false); setOverview(true); }} aria-haspopup="dialog" title="All pages (G)">
              <TableOutlined /> Pages
            </button>
            <button
              className={`alv-mini-btn ${autoPlay ? "active" : ""}`}
              onClick={() => setAutoPlay((a) => !a)}
              disabled={reviewIndex >= totalSpreads - 1 && !autoPlay}
              aria-pressed={autoPlay}
            >
              {autoPlay ? <PauseCircleOutlined /> : <CaretRightOutlined />} {autoPlay ? "Pause" : "Play"}
            </button>
            <select className="alv-speed" value={gap} onChange={(e) => setGap(Number(e.target.value))} aria-label="Slideshow speed">
              {SPEEDS.map((s) => <option key={s.ms} value={s.ms}>{s.label}</option>)}
            </select>
            <button
              className={`alv-mini-btn ${soundOn ? "active" : ""}`}
              onClick={() => setSoundOn((s) => !s)}
              aria-pressed={soundOn}
              aria-label={soundOn ? "Mute page-turn sound" : "Enable page-turn sound"}
            >
              {soundOn ? <SoundOutlined /> : <AudioMutedOutlined />}
            </button>
            <button className="alv-icon-btn" onClick={toggleFullscreen} aria-label={isFs ? "Exit full screen" : "Enter full screen"}>
              {isFs ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>
            <button className="alv-icon-btn" onClick={onClose} aria-label="Close viewer"><CloseOutlined /></button>
          </div>
        </div>

        <div className="alv-book-stage">
          <button
            className="alv-nav alv-nav-left"
            onClick={() => { setAutoPlay(false); goToPage("backward"); }}
            disabled={reviewIndex === 0 || !!turn}
            aria-label="Previous page"
          >
            <LeftOutlined />
          </button>

          <div
            className={`alv-book ${showingCover ? "alv-book-cover" : ""} ${turn && !turn.committing ? "is-dragging" : ""} ${turn ? "alv-turning" : ""} ${zoom > 1 ? "alv-zoomed" : ""}`}
            style={{
              aspectRatio: showingCover ? `${CANVAS_W} / ${CANVAS_H}` : `${CANVAS_W * 2} / ${CANVAS_H}`,
              transform: zoom > 1 ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` : undefined,
            }}
            ref={bookRef}
            onPointerDown={onBookPointerDown}
            onPointerMove={onBookPointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onDoubleClick={() => changeZoom(zoom > 1 ? 1 : 2)}
            onPointerLeave={(e) => { if ((dragMeta.current || panMeta.current) && e.buttons === 0) finishDrag(); }}
          >
            {!showingCover ? (
              <>
                <div className="alv-stack alv-stack-left" style={{ ["--pages" as any]: turnedCount }} aria-hidden />
                <div className="alv-stack alv-stack-right" style={{ ["--pages" as any]: remainingCount }} aria-hidden />
              </>
            ) : null}

            {showingCover ? renderHardCover() : (
              <div className="alv-spread" style={{ pointerEvents: turn ? "none" : "auto" }}>
                <div className="alv-leaf alv-leaf-left">{renderLibraryPage(visibleLeft, vFirstPageNum)}</div>
                <div className="alv-leaf alv-leaf-right">{renderLibraryPage(visibleRight, visibleRight ? vLastPageNum : undefined)}</div>
              </div>
            )}

            {!showingCover ? <div className="alv-gutter" /> : null}
            {!showingCover ? <div className="alv-bookmark" aria-hidden><span>{progressPct}%</span></div> : null}

            {turn ? (
              <div
                ref={turnRef}
                className={`alv-turn ${turn.dir === "forward" ? "turn-from-right" : "turn-from-left"}`}
                style={{ transformOrigin: turn.dir === "forward" ? "left center" : "right center" }}
              >
                <div className="alv-flip-face alv-flip-front">
                  {turn.from === 0 ? renderHardCover() : turn.dir === "forward" ? renderLibraryPage(spreadRight(turn.from)) : renderLibraryPage(spreadLeft(turn.from))}
                </div>
                <div className="alv-flip-face alv-flip-back">
                  {turn.to === 0 ? renderHardCover() : turn.dir === "forward" ? renderLibraryPage(spreadLeft(turn.to)) : renderLibraryPage(spreadRight(turn.to))}
                </div>
                <div ref={shadowRef} className="alv-flip-shadow" />
              </div>
            ) : null}
            <div className="alv-page-shine" />
          </div>

          <button
            className="alv-nav alv-nav-right"
            onClick={() => { setAutoPlay(false); goToPage("forward"); }}
            disabled={reviewIndex === totalSpreads - 1 || !!turn}
            aria-label="Next page"
          >
            <RightOutlined />
          </button>

          <div className="alv-zoom-controls" role="group" aria-label="Zoom">
            <button onClick={() => changeZoom(zoom - 0.5)} disabled={zoom <= 1} aria-label="Zoom out"><ZoomOutOutlined /></button>
            <span className="alv-zoom-level" aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button onClick={() => changeZoom(zoom + 0.5)} disabled={zoom >= 3} aria-label="Zoom in"><ZoomInOutlined /></button>
          </div>
        </div>

        <div className="alv-shell-foot">
          <div className="alv-foot-row">
            <span className="alv-page-count" aria-live="polite">
              {reviewIndex === 0
                ? `Cover — Page 1 of ${sheets.length}`
                : firstPageNum === lastPageNum ? `Page ${firstPageNum} of ${sheets.length}` : `Pages ${firstPageNum}–${lastPageNum} of ${sheets.length}`}
              {" — "}
              {reviewIndex === 0 ? currentRight?.name : currentLeft?.name}
              {reviewIndex !== 0 && currentRight ? ` · ${currentRight.name}` : ""}
            </span>
            <label className="alv-goto">
              <span>Go to page</span>
              <input
                type="number"
                min={1}
                max={sheets.length}
                value={goto}
                placeholder={`1–${sheets.length}`}
                onChange={(e) => setGoto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitGoto(); } }}
                aria-label="Go to page number"
              />
            </label>
          </div>
          <div className="alv-progress-rail" aria-hidden><div className="alv-progress-rail-fill" style={{ width: `${progressPct}%` }} /></div>
          <span className="alv-kbd-hint">
            <kbd>←</kbd><kbd>→</kbd> turn <kbd>Space</kbd> play <kbd>G</kbd> all pages <kbd>F</kbd> full screen <kbd>+</kbd><kbd>−</kbd> zoom <kbd>Home</kbd><kbd>End</kbd> jump
          </span>

          <div className="alv-filmstrip" role="tablist" aria-label="Jump to page">
            {Array.from({ length: totalSpreads }, (_, i) => {
              const left = spreadLeft(i);
              const right = spreadRight(i);
              return (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === reviewIndex}
                  className={`alv-film-thumb ${i === reviewIndex ? "active" : ""}`}
                  onClick={() => { setAutoPlay(false); jumpToPage(i); }}
                  aria-label={i === 0 ? "Go to cover" : `Go to spread ${i}`}
                >
                  {i === 0 ? (
                    <span className="alv-film-mini alv-film-mini-cover" style={{ background: right?.bgImage ? `url(${right.bgImage}) center/cover` : right?.bgColor || "#4a2517" }} />
                  ) : (
                    <>
                      <span className="alv-film-mini" style={{ background: left?.bgImage ? `url(${left.bgImage}) center/cover` : left?.bgColor || "#eef1f5" }} />
                      <span className="alv-film-mini" style={{ background: right?.bgImage ? `url(${right.bgImage}) center/cover` : right?.bgColor || "#eef1f5" }} />
                    </>
                  )}
                  <span className="alv-film-label">{i === 0 ? "Cover" : i}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {overview && (
        <div
          className="alv-overview"
          role="dialog"
          aria-modal="true"
          aria-label="All pages"
          onClick={(e) => { e.stopPropagation(); setOverview(false); }}
        >
          <div className="alv-overview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="alv-overview-head">
              <strong><TableOutlined /> All pages <em>{sheets.length}</em></strong>
              <button className="alv-icon-btn" onClick={() => setOverview(false)} aria-label="Close page overview" autoFocus><CloseOutlined /></button>
            </div>
            <div className="alv-overview-grid">
              {sheets.map((s, i) => (
                <button
                  key={s.id}
                  className={`alv-ov-thumb ${spreadForSheet(i) === reviewIndex ? "active" : ""}`}
                  onClick={() => { setOverview(false); setAutoPlay(false); jumpToPage(spreadForSheet(i)); }}
                  aria-label={`Go to page ${i + 1}, ${s.name}`}
                >
                  <span className="alv-ov-page">{renderLibraryPage(s)}</span>
                  <em>{i + 1}</em>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════ album card (grid · list · shelf · timeline) ════════════════════════════ */
interface CardHandlers {
  onCardClick: (a: SavedAlbumEntry, e: React.MouseEvent) => void;
  onToggleFav: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (a: SavedAlbumEntry) => void;
  onEdit: (a: SavedAlbumEntry) => void;
  onDuplicate: (a: SavedAlbumEntry) => void;
  onStartRename: (a: SavedAlbumEntry) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onContext: (a: SavedAlbumEntry, x: number, y: number) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}

function AlbumCard({
  a, view, fav, fill, meta, size, selected, selectMode, renaming, renameDraft, setRenameDraft, draggable, dragging, dropTarget, h,
}: {
  a: SavedAlbumEntry; view: ViewMode; fav: boolean; fill: Fill; meta: AlbumMeta; size: number; selected: boolean; selectMode: boolean;
  renaming: boolean; renameDraft: string; setRenameDraft: (s: string) => void; draggable: boolean; dragging: boolean;
  dropTarget: boolean; h: CardHandlers;
}) {
  const glow = useDominantColor(a.coverImage);
  const [scrub, setScrub] = useState<number | null>(null);
  const pages = pageCount(a);
  const overLimit = fill.filled > LIBRARY_LIMITS.maxPhotosPerAlbum;
  const style = { ["--glow" as any]: glow ?? "56,213,255" } as React.CSSProperties;
  const moreRef = useRef<HTMLButtonElement | null>(null);

  const openContextFromButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    h.onContext(a, r.left, r.bottom + 4);
  };

  const onArticleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, a, select")) return;
    h.onCardClick(a, e);
  };

  const dragProps = draggable
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData("text/plain", a.id); e.dataTransfer.effectAllowed = "move"; h.onDragStart(a.id); },
        onDragOver: (e: React.DragEvent) => { e.preventDefault(); h.onDragOver(a.id); },
        onDrop: (e: React.DragEvent) => { e.preventDefault(); h.onDrop(a.id); },
        onDragEnd: h.onDragEnd,
      }
    : {};

  const cover = a.coverImage ? <img src={a.coverImage} alt="" loading="lazy" decoding="async" /> : (
    <div className="al-card-cover-empty"><PictureOutlined /></div>
  );

  /* shelf: albums stand upright on a wooden board */
  if (view === "shelf") {
    return (
      <article
        className={`al-book ${selected ? "selected" : ""} ${dragging ? "al-dragging" : ""} ${dropTarget ? "al-drop-target" : ""}`}
        style={style}
        onContextMenu={(e) => { e.preventDefault(); h.onContext(a, e.clientX, e.clientY); }}
        {...dragProps}
      >
        <button
          className="al-book-open"
          onClick={(e) => h.onCardClick(a, e)}
          aria-label={`${selectMode ? "Select" : "Open"} ${a.templateName}, ${pages} pages, ${fill.pct}% filled`}
          aria-pressed={selectMode ? selected : undefined}
        >
          <span className="al-book-spine" style={meta.color ? { background: meta.color } : undefined}><span>{a.templateName}</span></span>
          <span className="al-book-cover">{cover}</span>
          {meta.pinned ? <span className="al-book-pin" aria-hidden><PushpinFilled /></span> : null}
        </button>
        <div className="al-book-tools">
          <button onClick={() => h.onToggleFav(a.id)} className={fav ? "active" : ""} aria-pressed={fav} aria-label={fav ? "Remove from favorites" : "Add to favorites"}>
            {fav ? <StarFilled /> : <StarOutlined />}
          </button>
          <button onClick={() => h.onPin(a.id)} aria-pressed={meta.pinned} aria-label={meta.pinned ? "Unpin" : "Pin to top"}>
            {meta.pinned ? <PushpinFilled /> : <PushpinOutlined />}
          </button>
          <button onClick={openContextFromButton} aria-label={`More actions for ${a.templateName}`} aria-haspopup="menu"><MoreOutlined /></button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`al-card ${view === "list" ? "al-card-list" : ""} ${selected ? "selected" : ""} ${selectMode ? "select-mode" : ""} ${dragging ? "al-dragging" : ""} ${dropTarget ? "al-drop-target" : ""} ${meta.pinned ? "is-pinned" : ""}`}
      style={style}
      onClick={onArticleClick}
      onContextMenu={(e) => { e.preventDefault(); h.onContext(a, e.clientX, e.clientY); }}
      {...dragProps}
    >
      <div
        className="al-card-cover"
        onMouseMove={(e) => {
          if (selectMode || pages < 2) return;
          const r = e.currentTarget.getBoundingClientRect();
          setScrub(clampNum(Math.floor(((e.clientX - r.left) / r.width) * a.sheets.length), 0, a.sheets.length - 1));
        }}
        onMouseLeave={() => setScrub(null)}
      >
        {cover}
        {scrub !== null && a.sheets[scrub] ? (
          <div className="al-scrub" aria-hidden>
            <div className="al-scrub-page">{renderLibraryPage(a.sheets[scrub])}</div>
            <span className="al-scrub-count">{scrub + 1}/{a.sheets.length}</span>
            <span className="al-scrub-bar"><i style={{ width: `${((scrub + 1) / a.sheets.length) * 100}%` }} /></span>
          </div>
        ) : null}

        <span className="al-card-version">v{a.versionNum}</span>
        {meta.color ? <span className="al-card-label-dot" style={{ background: meta.color }} aria-hidden /> : null}
        {meta.pinned ? <span className="al-card-pinned" role="img" aria-label="Pinned"><PushpinFilled /></span> : null}
        <span
          className={`al-card-progress ${fill.pct >= 100 ? "done" : ""}`}
          style={{ ["--pct" as any]: fill.pct }}
          data-pct={fill.pct}
          role="img"
          aria-label={`${fill.filled} of ${fill.total} photo slots filled`}
          title={`${fill.filled}/${fill.total} photo slots filled`}
        />

        {selectMode ? (
          <button
            className={`al-card-select ${selected ? "checked" : ""}`}
            onClick={(e) => { e.stopPropagation(); h.onCardClick(a, e); }}
            aria-pressed={selected}
            aria-label={`Select ${a.templateName}`}
          >
            {selected ? <CheckSquareOutlined /> : null}
          </button>
        ) : (
          <>
            <button className={`al-card-fav ${fav ? "active" : ""}`} onClick={() => h.onToggleFav(a.id)} aria-pressed={fav} aria-label={fav ? `Remove ${a.templateName} from favorites` : `Add ${a.templateName} to favorites`}>
              {fav ? <StarFilled /> : <StarOutlined />}
            </button>
            <button className={`al-card-pin ${meta.pinned ? "active" : ""}`} onClick={() => h.onPin(a.id)} aria-pressed={meta.pinned} aria-label={meta.pinned ? `Unpin ${a.templateName}` : `Pin ${a.templateName} to top`}>
              {meta.pinned ? <PushpinFilled /> : <PushpinOutlined />}
            </button>
            <button className="al-card-delete" onClick={() => h.onDelete(a)} aria-label={`Delete ${a.templateName}`}><DeleteOutlined /></button>
          </>
        )}
      </div>

      <div className="al-card-body">
        {renaming ? (
          <input
            className="al-card-rename-input"
            value={renameDraft}
            autoFocus
            aria-label="Album name"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={h.onCommitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") h.onCommitRename();
              if (e.key === "Escape") h.onCancelRename();
            }}
          />
        ) : (
          <button
            className="al-card-name"
            onClick={(e) => h.onCardClick(a, e)}
            onKeyDown={(e) => { if (e.key === "F2") { e.preventDefault(); h.onStartRename(a); } }}
            title="Open · F2 to rename"
          >
            {a.templateName}
          </button>
        )}

        <div className="al-card-meta">
          <span><TagOutlined /> {a.serviceName}</span>
          <span title={new Date(a.savedAt).toLocaleString()}><CalendarOutlined /> {new Date(a.savedAt).toLocaleDateString()}</span>
        </div>
        <div className="al-card-event">{a.eventName}</div>
        <div className="al-card-sheets">
          {pages} pages · {fill.filled} photos · {fmtBytes(size)}
          {meta.lastOpened ? ` · opened ${relativeTime(meta.lastOpened)}` : ""}
          {overLimit ? <span className="al-card-warn" title={`Over the ${LIBRARY_LIMITS.maxPhotosPerAlbum}-photo guideline`}> <WarningOutlined /> over {LIBRARY_LIMITS.maxPhotosPerAlbum}</span> : null}
        </div>

        {meta.tags.length ? (
          <ul className="al-card-tags" aria-label="Tags">
            {meta.tags.slice(0, 3).map((t) => <li key={t}>#{t}</li>)}
            {meta.tags.length > 3 ? <li className="more">+{meta.tags.length - 3}</li> : null}
          </ul>
        ) : null}

        {!selectMode && (
          <div className="al-card-actions">
            <button className="al-card-action-btn" onClick={() => h.onEdit(a)}><EditOutlined /> Edit</button>
            <button className="al-card-action-btn" onClick={() => h.onDuplicate(a)}><CopyOutlined /> Duplicate</button>
            <button ref={moreRef} className="al-card-action-btn icon" onClick={openContextFromButton} aria-haspopup="menu" aria-label={`More actions for ${a.templateName}`}>
              <MoreOutlined />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/* ════════════════════════════ context menu ════════════════════════════ */
function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) });
      (el.querySelector("button") as HTMLElement | null)?.focus();
    }
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current(); };
    const close = () => closeRef.current();
    window.addEventListener("mousedown", down);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      prevFocus.current?.focus?.();
    };
  }, [x, y]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const btns = Array.from(ref.current?.querySelectorAll("button") ?? []) as HTMLElement[];
    const i = btns.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); btns[(i + 1) % btns.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length]?.focus(); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); onClose(); }
  };

  return (
    <div ref={ref} className="al-ctx-menu" role="menu" style={pos} onKeyDown={onKeyDown}>
      {items.map((it) =>
        it.sep ? <div key={it.id} className="al-ctx-sep" role="separator" /> : (
          <button key={it.id} role="menuitem" className={`al-ctx-item ${it.danger ? "danger" : ""}`} onClick={() => { onClose(); it.run?.(); }}>
            {it.icon} {it.label}
          </button>
        )
      )}
    </div>
  );
}

/* ════════════════════════════ command palette ════════════════════════════ */
function CommandPalette({ items, onClose }: { items: PaletteItem[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => prevFocus.current?.focus?.();
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) {
      return [...items.filter((i) => i.group === "Actions").slice(0, 8), ...items.filter((i) => i.group === "Albums").slice(0, 4)];
    }
    return items.filter((i) => `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(t)).slice(0, 12);
  }, [q, items]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    document.getElementById(`al-pal-${idx}`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  const run = (item?: PaletteItem) => {
    if (!item) return;
    onClose();
    window.setTimeout(item.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (results.length ? (i + 1) % results.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (results.length ? (i - 1 + results.length) % results.length : 0)); }
    else if (e.key === "Enter") { e.preventDefault(); run(results[idx]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <div className="al-pal-overlay" onClick={onClose}>
      <div className="al-pal" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="al-pal-input">
          <ThunderboltOutlined />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command or album name…"
            role="combobox"
            aria-expanded="true"
            aria-controls="al-pal-list"
            aria-activedescendant={results[idx] ? `al-pal-${idx}` : undefined}
            aria-label="Command or album"
          />
        </div>
        <ul id="al-pal-list" className="al-pal-list" role="listbox">
          {results.length === 0 ? <li className="al-pal-empty" role="presentation">Nothing matches “{q}”.</li> : null}
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`al-pal-${i}`}
              role="option"
              aria-selected={i === idx}
              className={`al-pal-item ${i === idx ? "active" : ""}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => run(r)}
            >
              <span className="al-pal-icon">{r.icon}</span>
              <span className="al-pal-label">{r.label}</span>
              {r.hint ? <span className="al-pal-hint">{r.hint}</span> : null}
              <span className="al-pal-group">{r.group}</span>
            </li>
          ))}
        </ul>
        <div className="al-pal-foot"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>Enter</kbd> run <kbd>Esc</kbd> close</div>
      </div>
    </div>
  );
}

/* ════════════════════════════ details drawer (quick look) ════════════════════════════ */
function DetailsDrawer({
  album, meta, fill, fav, size, position, onClose, onPatch, onOpen, onEdit, onDuplicate, onExport, onDelete, onToggleFav, onCopyColor, onStep,
}: {
  album: SavedAlbumEntry; meta: AlbumMeta; fill: Fill; fav: boolean; size: number;
  position: { index: number; count: number };
  onClose: () => void;
  onPatch: (patch: Partial<AlbumMeta>) => void; onOpen: (sheetIndex: number) => void; onEdit: () => void;
  onDuplicate: () => void; onExport: () => void; onDelete: () => void; onToggleFav: () => void; onCopyColor: (hex: string) => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const palette = useAlbumPalette(album);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prevFocus.current?.focus?.();
  }, []); // focus once; stepping between albums keeps focus where the person is

  useEffect(() => { setShowAll(false); setTagDraft(""); }, [album.id]);

  const addTag = () => {
    const t = normalizeTag(tagDraft);
    setTagDraft("");
    if (!t || meta.tags.includes(t) || meta.tags.length >= 8) return;
    onPatch({ tags: [...meta.tags, t] });
  };

  const checks = [
    { ok: fill.pct >= 100, label: "Every photo slot is filled" },
    { ok: !!album.coverImage, label: "Cover image is set" },
    { ok: meta.tags.length > 0, label: "Tagged, so it turns up in search" },
    { ok: meta.note.trim().length > 0, label: "Has a note or print spec" },
    { ok: fill.filled <= LIBRARY_LIMITS.maxPhotosPerAlbum, label: `Within the ${LIBRARY_LIMITS.maxPhotosPerAlbum}-photo guideline` },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  const thumbs = showAll ? album.sheets : album.sheets.slice(0, 24);

  return (
    <aside
      className="al-drawer"
      role="dialog"
      aria-label={`Details for ${album.templateName}`}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}
    >
      <div className="al-drawer-head">
        <h2>{album.templateName}</h2>
        <div className="al-drawer-nav">
          <button className="alv-icon-btn" onClick={() => onStep(-1)} disabled={position.index <= 0} aria-label="Previous album (K)" title="Previous album (K)"><UpOutlined /></button>
          <button className="alv-icon-btn" onClick={() => onStep(1)} disabled={position.index >= position.count - 1} aria-label="Next album (J)" title="Next album (J)"><DownOutlined /></button>
          <button ref={closeRef} className="alv-icon-btn" onClick={onClose} aria-label="Close details"><CloseOutlined /></button>
        </div>
      </div>

      <div className="al-drawer-body">
        <div className="al-drawer-cover">
          {album.coverImage ? <img src={album.coverImage} alt="" /> : <div className="al-card-cover-empty"><PictureOutlined /></div>}
        </div>

        <dl className="al-drawer-facts">
          <div><dt>Event</dt><dd>{album.eventName}</dd></div>
          <div><dt>Service</dt><dd>{album.serviceName}</dd></div>
          <div><dt>Version</dt><dd>v{album.versionNum}</dd></div>
          <div><dt>Canvas</dt><dd>{album.canvasSize}</dd></div>
          <div><dt>Pages</dt><dd>{pageCount(album)}</dd></div>
          <div><dt>Photos</dt><dd>{fill.filled} of {LIBRARY_LIMITS.maxPhotosPerAlbum} max · {fill.total} slots</dd></div>
          <div><dt>Size</dt><dd>{fmtBytes(size)}</dd></div>
          <div><dt>Saved</dt><dd>{new Date(album.savedAt).toLocaleString()}</dd></div>
          <div><dt>Opened</dt><dd>{meta.opens ? `${meta.opens}× · last ${relativeTime(meta.lastOpened)}` : "Never"}</dd></div>
        </dl>

        <div className="al-drawer-meter" role="img" aria-label={`${fill.pct}% complete`}>
          <div style={{ width: `${fill.pct}%` }} />
        </div>

        <div className="al-drawer-actions">
          <button className="al-tool-btn active" onClick={() => onOpen(0)}><BookOutlined /> Open</button>
          <button className="al-tool-btn" onClick={onEdit}><EditOutlined /> Edit</button>
          <button className="al-tool-btn" onClick={onDuplicate}><CopyOutlined /> Duplicate</button>
          <button className="al-tool-btn" onClick={onToggleFav} aria-pressed={fav}>{fav ? <StarFilled /> : <StarOutlined />} {fav ? "Favorited" : "Favorite"}</button>
          <button className="al-tool-btn" onClick={onExport}><ExportOutlined /> Export</button>
          <button className="al-tool-btn danger" onClick={onDelete}><DeleteOutlined /> Delete</button>
        </div>

        <h3 className="al-drawer-h"><SafetyCertificateOutlined /> Ready to deliver <span className={`al-health-score ${score === 100 ? "perfect" : ""}`}>{score}%</span></h3>
        <ul className="al-health" aria-label="Delivery checklist">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "ok" : ""}>
              {c.ok ? <CheckCircleFilled aria-hidden /> : <MinusCircleOutlined aria-hidden />}
              <span>{c.label}</span>
              <span className="al-sr-only">{c.ok ? "done" : "not done"}</span>
            </li>
          ))}
        </ul>

        {palette.length > 0 && (
          <>
            <h3 className="al-drawer-h"><BgColorsOutlined /> Colour story</h3>
            <div className="al-palette" role="group" aria-label="Album colour story. Click a colour to copy its hex code">
              {palette.map((c) => (
                <button key={c} style={{ background: c }} onClick={() => onCopyColor(c)} title={`Copy ${c}`} aria-label={`Copy colour ${c}`}>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <h3 className="al-drawer-h">Label</h3>
        <div className="al-swatches" role="group" aria-label="Color label">
          <button className={`al-swatch none ${meta.color === null ? "on" : ""}`} onClick={() => onPatch({ color: null })} aria-pressed={meta.color === null} aria-label="No label"><CloseOutlined /></button>
          {LABEL_COLORS.map((c) => (
            <button key={c} className={`al-swatch ${meta.color === c ? "on" : ""}`} style={{ background: c }} onClick={() => onPatch({ color: c })} aria-pressed={meta.color === c} aria-label={`Label ${c}`} />
          ))}
        </div>

        <h3 className="al-drawer-h">Tags</h3>
        <div className="al-tag-edit">
          {meta.tags.map((t) => (
            <span key={t} className="al-tag">
              #{t}
              <button onClick={() => onPatch({ tags: meta.tags.filter((x) => x !== t) })} aria-label={`Remove tag ${t}`}><CloseOutlined /></button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
            onBlur={addTag}
            placeholder={meta.tags.length >= 8 ? "Tag limit reached" : "Add tag, press Enter"}
            disabled={meta.tags.length >= 8}
            aria-label="Add tag"
          />
        </div>

        <h3 className="al-drawer-h">Notes</h3>
        <textarea
          className="al-note"
          rows={3}
          value={meta.note}
          onChange={(e) => onPatch({ note: e.target.value })}
          placeholder="Client requests, print specs, reminders…"
          aria-label="Notes"
        />

        <h3 className="al-drawer-h">Contact sheet</h3>
        <div className="al-contact">
          {thumbs.map((s, i) => (
            <button key={s.id} className="al-contact-thumb" onClick={() => onOpen(i)} aria-label={`Open at page ${i + 1}, ${s.name}`}>
              <span className="al-contact-page">{renderLibraryPage(s)}</span>
              <em>{i + 1}</em>
            </button>
          ))}
        </div>
        {album.sheets.length > 24 && !showAll ? (
          <button className="al-tool-btn" onClick={() => setShowAll(true)}>Show all {album.sheets.length} pages</button>
        ) : null}
      </div>
    </aside>
  );
}

/* ════════════════════════════ storage manager ════════════════════════════ */
function StorageManager({
  albums, stats, estimate, fills, opt, onClose, onOptimize, onPersist, onOpen, onDelete,
}: {
  albums: SavedAlbumEntry[]; stats: LibraryStats; estimate: StorageEstimateInfo | null; fills: Map<string, Fill>; opt: OptState;
  onClose: () => void; onOptimize: (o: OptimizeOptions) => void; onPersist: () => void;
  onOpen: (a: SavedAlbumEntry) => void; onDelete: (a: SavedAlbumEntry) => void;
}) {
  const [preset, setPreset] = useState(PRESETS[0].id);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prevFocus.current?.focus?.();
  }, []);

  const usedBytes = stats.storageKB * 1024;
  const deviceUsed = estimate?.supported ? estimate.usage : usedBytes;
  const quota = estimate?.supported && estimate.quota ? estimate.quota : stats.quotaBytes;
  const devicePct = clampNum(Math.round((deviceUsed / quota) * 100), 0, 100);
  const avgPhoto = stats.totalPhotos ? usedBytes / stats.totalPhotos : 0;
  const roomPhotos = avgPhoto ? Math.max(0, Math.floor((quota * 0.9 - deviceUsed) / avgPhoto)) : null;
  const sorted = [...albums].sort((a, b) => (stats.albumBytes[b.id] ?? 0) - (stats.albumBytes[a.id] ?? 0));
  const biggest = Math.max(1, ...sorted.map((a) => stats.albumBytes[a.id] ?? 0));
  const chosen = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];
  const saved = opt.result ? opt.result.before - opt.result.after : 0;

  return (
    <div className="al-modal-overlay" onClick={onClose}>
      <section
        className="al-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Storage manager"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}
      >
        <header className="al-sm-head">
          <h2><HddOutlined /> Storage manager</h2>
          <button ref={closeRef} className="alv-icon-btn" onClick={onClose} aria-label="Close storage manager"><CloseOutlined /></button>
        </header>

        <div className="al-sm-body">
          <div className="al-sm-grid">
            <div className="al-sm-card">
              <span className="al-sm-k">Device storage</span>
              <strong>{fmtBytes(deviceUsed)} <em>of {fmtBytes(quota)}</em></strong>
              <div className="al-storage-track"><div className={`al-storage-fill ${devicePct > 80 ? "warn" : ""}`} style={{ width: `${devicePct}%` }} /></div>
              <small>{roomPhotos === null ? "Add photos to see how many more will fit." : `Room for about ${roomPhotos.toLocaleString()} more photos at your current photo size.`}</small>
            </div>
            <div className="al-sm-card">
              <span className="al-sm-k">Albums</span>
              <strong>{stats.totalAlbums} <em>of {stats.maxAlbums}</em></strong>
              <div className="al-storage-track"><div className={`al-storage-fill ${stats.totalAlbums >= stats.maxAlbums ? "warn" : ""}`} style={{ width: `${(stats.totalAlbums / stats.maxAlbums) * 100}%` }} /></div>
              <small>{stats.totalAlbums >= stats.maxAlbums ? "Library is full. Export, then delete an album to add another." : `${stats.maxAlbums - stats.totalAlbums} more album${stats.maxAlbums - stats.totalAlbums === 1 ? "" : "s"} can be saved.`}</small>
            </div>
            <div className="al-sm-card">
              <span className="al-sm-k">Photos in library</span>
              <strong>{stats.totalPhotos.toLocaleString()} <em>up to {stats.maxPhotosPerAlbum} per album</em></strong>
              <small>Average {avgPhoto ? fmtBytes(avgPhoto) : "—"} per photo.</small>
            </div>
          </div>

          {estimate?.supported && (
            <div className={`al-sm-persist ${estimate.persisted ? "on" : ""}`}>
              <SafetyCertificateOutlined />
              <p>
                {estimate.persisted
                  ? "Protected: your browser won't clear this library when disk space runs low."
                  : "Not protected yet: under disk pressure the browser may clear saved albums. Ask it to keep them."}
              </p>
              {!estimate.persisted && <button className="al-tool-btn active" onClick={onPersist}>Protect my albums</button>}
            </div>
          )}

          <div className="al-sm-opt">
            <h3><CompressOutlined /> Optimize photos</h3>
            <p>Shrinks every saved photo to fit far more into the same space. Identical photos are processed once. Layouts and captions are untouched.</p>
            <div className="al-sm-presets" role="radiogroup" aria-label="Optimization level">
              {PRESETS.map((p) => (
                <button key={p.id} role="radio" aria-checked={preset === p.id} className={preset === p.id ? "on" : ""} onClick={() => setPreset(p.id)} disabled={opt.running}>
                  <strong>{p.label}</strong><span>{p.hint}</span>
                </button>
              ))}
            </div>
            <div className="al-sm-run">
              <button className="al-new-btn" onClick={() => onOptimize(chosen.opts)} disabled={opt.running || !albums.length}>
                <CompressOutlined /> {opt.running ? "Optimizing…" : "Optimize now"}
              </button>
              {opt.running && (
                <div className="al-sm-progress" role="progressbar" aria-valuemin={0} aria-valuemax={opt.total || 1} aria-valuenow={opt.done}>
                  <div style={{ width: `${opt.total ? (opt.done / opt.total) * 100 : 0}%` }} />
                  <span>{opt.done} / {opt.total} photos</span>
                </div>
              )}
              {!opt.running && opt.result && (
                <p className="al-sm-result">
                  {saved > 0 ? `Freed ${fmtBytes(saved)} (${fmtBytes(opt.result.before)} → ${fmtBytes(opt.result.after)}).` : "Already as small as this level can make it."}
                </p>
              )}
            </div>
          </div>

          <h3 className="al-sm-h">Space by album</h3>
          {sorted.length === 0 ? <p className="al-sm-empty">No albums saved yet.</p> : (
            <ul className="al-sm-list">
              {sorted.map((a) => {
                const b = stats.albumBytes[a.id] ?? 0;
                const photos = fills.get(a.id)?.filled ?? 0;
                return (
                  <li key={a.id}>
                    <div className="al-sm-row-top">
                      <button className="al-sm-name" onClick={() => onOpen(a)}>{a.templateName}</button>
                      <span>{fmtBytes(b)}</span>
                      <span className={photos > stats.maxPhotosPerAlbum ? "al-card-warn" : ""}>{photos}/{stats.maxPhotosPerAlbum} photos</span>
                      <button className="al-sm-del" onClick={() => onDelete(a)} aria-label={`Delete ${a.templateName}`}><DeleteOutlined /></button>
                    </div>
                    <div className="al-sm-bar"><i style={{ width: `${(b / biggest) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/* ════════════════════════════ main page ════════════════════════════ */
export default function AlbumLibraryPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean>(() => isLibraryReady());
  const [albums, setAlbums] = useState<SavedAlbumEntry[]>(() => getSavedAlbums());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set(getFavoriteIds()));
  const [stats, setStats] = useState<LibraryStats>(() => getLibraryStats());
  const [estimate, setEstimate] = useState<StorageEstimateInfo | null>(null);

  const [metaMap, setMetaMap] = usePersisted<Record<string, AlbumMeta>>(META_KEY, {});
  const [order, setOrder] = usePersisted<string[]>(ORDER_KEY, []);
  const [prefs, setPrefs] = usePersisted<Prefs>(PREFS_KEY, { view: "grid", sort: "newest", density: 230 });
  const [lastBackup, setLastBackup] = usePersisted<string | null>(BACKUP_KEY, null);
  const [savedViews, setSavedViews] = usePersisted<SavedView[]>(VIEWS_KEY, []);
  const { view: viewMode, sort: sortMode, density } = prefs;

  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [collection, setCollection] = useState<Collection>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [savingView, setSavingView] = useState(false);
  const [viewName, setViewName] = useState("");

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [viewing, setViewing] = useState<{ album: SavedAlbumEntry; sheet: number } | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; album: SavedAlbumEntry } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [fileDrag, setFileDrag] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [wallLimit, setWallLimit] = useState(WALL_PAGE);
  const [nudgeHidden, setNudgeHidden] = useState(false);
  const [opt, setOpt] = useState<OptState>({ running: false, done: 0, total: 0 });

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const refreshEstimate = useCallback(() => { getStorageEstimate().then(setEstimate).catch(() => {}); }, []);

  const refresh = () => {
    setAlbums(getSavedAlbums());
    setFavoriteIds(new Set(getFavoriteIds()));
    setStats(getLibraryStats());
  };
  useEffect(() => subscribeToAlbumLibrary(refresh), []);
  useEffect(() => {
    let live = true;
    whenLibraryReady().then(() => { if (live) { setReady(true); refresh(); refreshEstimate(); } });
    return () => { live = false; };
  }, [refreshEstimate]);
  useEffect(() => { refreshEstimate(); }, [albums, refreshEstimate]);
  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); }, []);

  const showToast = (msg: string, action?: ToastState["action"]) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ msg, action });
    toastTimerRef.current = window.setTimeout(() => setToast(null), action ? 7000 : 2600);
  };
  useEffect(() => subscribeToStorageErrors((msg) => showToast(msg)), []);

  /* ── derived data ── */
  const metaOf = useCallback((id: string) => metaMap[id] ?? DEFAULT_META, [metaMap]);
  const patchMeta = (id: string, patch: Partial<AlbumMeta>) =>
    setMetaMap((p) => ({ ...p, [id]: { ...(p[id] ?? DEFAULT_META), ...patch } }));

  const fills = useMemo(() => new Map(albums.map((a) => [a.id, albumFill(a)])), [albums]);
  const fillOf = (a: SavedAlbumEntry): Fill => fills.get(a.id) ?? { filled: 0, total: 0, pct: 100 };
  const sizeOf = (a: SavedAlbumEntry) => stats.albumBytes[a.id] ?? 0;
  const atLimit = albums.length >= LIBRARY_LIMITS.maxAlbums;

  const services = useMemo(() => Array.from(new Set(albums.map((a) => a.serviceName))), [albums]);
  const serviceMix = useMemo(() => {
    const m = new Map<string, number>();
    albums.forEach((a) => m.set(a.serviceName, (m.get(a.serviceName) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [albums]);

  const insight = useMemo(() => {
    let filled = 0, total = 0;
    fills.forEach((f) => { filled += f.filled; total += f.total; });
    return { photos: filled, completion: total ? Math.round((filled / total) * 100) : 100 };
  }, [fills]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    albums.forEach((a) => metaOf(a.id).tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [albums, metaOf]);

  const isRecent = (a: SavedAlbumEntry) => Date.now() - new Date(a.savedAt).getTime() < RECENT_DAYS * 86400000;

  const collectionCounts = useMemo(() => ({
    all: albums.length,
    favorites: albums.filter((a) => favoriteIds.has(a.id)).length,
    pinned: albums.filter((a) => metaOf(a.id).pinned).length,
    recent: albums.filter(isRecent).length,
    incomplete: albums.filter((a) => (fills.get(a.id)?.pct ?? 100) < 100).length,
  }), [albums, favoriteIds, fills, metaOf]);

  const query = useMemo(() => parseQuery(search), [search]);
  const isFiltering = !!search.trim() || serviceFilter !== "all" || collection !== "all" || !!tagFilter;

  const filtered = useMemo(() => {
    let list = albums.filter((a) => {
      const m = metaOf(a.id);
      const pct = fills.get(a.id)?.pct ?? 100;
      const photos = fills.get(a.id)?.filled ?? 0;
      const pages = pageCount(a);
      if (serviceFilter !== "all" && a.serviceName !== serviceFilter) return false;
      if (tagFilter && !m.tags.includes(tagFilter)) return false;
      if (collection === "favorites" && !favoriteIds.has(a.id)) return false;
      if (collection === "pinned" && !m.pinned) return false;
      if (collection === "recent" && !isRecent(a)) return false;
      if (collection === "incomplete" && pct >= 100) return false;
      if (query.fav && !favoriteIds.has(a.id)) return false;
      if (query.pinned && !m.pinned) return false;
      if (query.incomplete && pct >= 100) return false;
      if (query.untagged && m.tags.length) return false;
      if (query.heavy && photos <= LIBRARY_LIMITS.maxPhotosPerAlbum) return false;
      if (query.pagesMin !== null && pages < query.pagesMin) return false;
      if (query.pagesMax !== null && pages > query.pagesMax) return false;
      if (query.tags.some((t) => !m.tags.some((x) => x.includes(t)))) return false;
      if (query.services.some((s) => !a.serviceName.toLowerCase().includes(s))) return false;
      if (query.terms.length) {
        const hay = `${a.templateName} ${a.eventName} ${a.serviceName} ${m.tags.join(" ")} ${m.note}`.toLowerCase();
        if (query.terms.some((t) => !hay.includes(t))) return false;
      }
      return true;
    });

    const effective: SortMode = viewMode === "timeline" && sortMode !== "oldest" ? "newest" : sortMode;
    const t = (s: string) => new Date(s).getTime();
    list = [...list].sort((a, b) => {
      const ma = metaOf(a.id), mb = metaOf(b.id);
      if (effective !== "custom" && ma.pinned !== mb.pinned) return ma.pinned ? -1 : 1;
      switch (effective) {
        case "oldest": return t(a.savedAt) - t(b.savedAt);
        case "name": return a.templateName.localeCompare(b.templateName);
        case "pages": return pageCount(b) - pageCount(a);
        case "completion": return (fills.get(a.id)?.pct ?? 100) - (fills.get(b.id)?.pct ?? 100);
        case "opened": return t(mb.lastOpened ?? "1970-01-01") - t(ma.lastOpened ?? "1970-01-01");
        case "mostOpened": return mb.opens - ma.opens || t(b.savedAt) - t(a.savedAt);
        case "custom": {
          const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
          if (ia === -1 && ib === -1) return t(b.savedAt) - t(a.savedAt);
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        }
        default: return t(b.savedAt) - t(a.savedAt);
      }
    });
    return list;
  }, [albums, metaOf, fills, favoriteIds, serviceFilter, tagFilter, collection, query, sortMode, viewMode, order]);

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  const recents = useMemo(
    () => albums.filter((a) => metaOf(a.id).lastOpened).sort((a, b) => (metaOf(b.id).lastOpened! > metaOf(a.id).lastOpened! ? 1 : -1)).slice(0, 5),
    [albums, metaOf]
  );

  /** Spotlight: one album resurfaced per day so old work doesn't get buried. */
  const spotlight = useMemo(() => {
    const withCover = albums.filter((a) => a.coverImage);
    if (!withCover.length) return null;
    return withCover[Math.floor(Date.now() / 86400000) % withCover.length];
  }, [albums]);

  const groups = useMemo(() => {
    if (viewMode !== "timeline") return [{ label: "", items: filtered }];
    const out: { label: string; items: SavedAlbumEntry[] }[] = [];
    filtered.forEach((a) => {
      const label = monthLabel(a.savedAt);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(a); else out.push({ label, items: [a] });
    });
    return out;
  }, [filtered, viewMode]);

  /** Photo wall: every photo from the albums currently shown. */
  const wallPhotos = useMemo<WallPhoto[]>(() => {
    if (viewMode !== "wall") return [];
    const out: WallPhoto[] = [];
    filtered.forEach((a) => a.sheets.forEach((s, si) => s.slots.forEach((sl) => {
      if (sl.image) out.push({ key: `${a.id}-${sl.id}`, album: a, sheet: si, src: sl.image, label: sl.caption || sl.fileName || a.templateName });
    })));
    return out;
  }, [filtered, viewMode]);
  useEffect(() => { setWallLimit(WALL_PAGE); }, [search, serviceFilter, collection, tagFilter, viewMode]);

  const needsBackup = ready && albums.length > 0 && !nudgeHidden &&
    (!lastBackup || Date.now() - new Date(lastBackup).getTime() > BACKUP_NUDGE_DAYS * 86400000);

  const usedBytes = stats.storageKB * 1024;
  const quotaBytes = estimate?.supported && estimate.quota ? estimate.quota : stats.quotaBytes;
  const storagePct = clampNum(Math.round((usedBytes / quotaBytes) * 100), 0, 100);

  /* ── actions ── */
  const openAlbum = (a: SavedAlbumEntry, sheet = 0) => {
    setViewing({ album: a, sheet });
    setMetaMap((p) => {
      const m = p[a.id] ?? DEFAULT_META;
      return { ...p, [a.id]: { ...m, opens: m.opens + 1, lastOpened: new Date().toISOString() } };
    });
  };

  const handleEdit = (album: SavedAlbumEntry) => {
    beginEditAlbum(album);
    navigate("/events/create/album/template-editor");
  };

  const handleNewBlank = () => {
    if (atLimit) {
      showToast(`Library is full (${LIBRARY_LIMITS.maxAlbums} albums). Export a backup, then delete one.`);
      setStorageOpen(true);
      return;
    }
    beginBlankAlbum();
    navigate("/events/create/album/template-editor");
  };

  const removeAlbums = (list: SavedAlbumEntry[]) => {
    if (!list.length) return;
    const favs = list.filter((a) => favoriteIds.has(a.id)).map((a) => a.id);
    if (list.length === 1) deleteSavedAlbum(list[0].id); else deleteSavedAlbums(list.map((a) => a.id));
    setSelectedIds(new Set());
    if (detailsId && list.some((a) => a.id === detailsId)) setDetailsId(null);
    showToast(list.length === 1 ? `Removed “${list[0].templateName}”` : `Removed ${list.length} albums`, {
      label: "Undo",
      run: () => {
        list.forEach((a) => upsertSavedAlbum(a));
        const cur = new Set(getFavoriteIds());
        favs.forEach((id) => { if (!cur.has(id)) toggleFavorite(id); });
        setToast(null);
      },
    });
  };

  const handleDuplicate = (a: SavedAlbumEntry) => {
    if (atLimit) {
      showToast(`Library is full (${LIBRARY_LIMITS.maxAlbums} albums). Delete one before duplicating.`);
      return;
    }
    const copy = duplicateSavedAlbum(a.id);
    if (copy) {
      const m = metaOf(a.id);
      patchMeta(copy.id, { tags: m.tags, color: m.color, note: m.note });
      showToast(`Duplicated as “${copy.templateName}”`);
    }
  };

  const startRename = (a: SavedAlbumEntry) => { setRenamingId(a.id); setRenameDraft(a.templateName); };
  const commitRename = () => {
    if (renamingId && renameDraft.trim()) renameSavedAlbum(renamingId, renameDraft);
    setRenamingId(null);
  };

  const metaFor = (list: SavedAlbumEntry[]) => {
    const subset: Record<string, AlbumMeta> = {};
    list.forEach((a) => { if (metaMap[a.id]) subset[a.id] = metaMap[a.id]; });
    return { meta: subset };
  };

  const exportOne = (a: SavedAlbumEntry) => {
    exportAlbumsAsJson([a], `axs-album-${a.templateName.replace(/\W+/g, "-").toLowerCase()}-${Date.now()}.json`, metaFor([a]));
    showToast("Exported album");
  };
  const handleExportAll = () => {
    if (!albums.length) return;
    exportAlbumsAsJson(albums, undefined, metaFor(albums));
    setLastBackup(new Date().toISOString());
    showToast(`Backed up ${albums.length} album(s)`);
  };
  const handleBulkExport = () => {
    const sel = albums.filter((a) => selectedIds.has(a.id));
    if (!sel.length) return;
    exportAlbumsAsJson(sel, `axs-selected-albums-${Date.now()}.json`, metaFor(sel));
    showToast(`Exported ${sel.length} album(s)`);
  };
  const handleBulkFavorite = () => {
    selectedIds.forEach((id) => { if (!favoriteIds.has(id)) toggleFavorite(id); });
    showToast(`Favorited ${selectedIds.size} album(s)`);
  };
  const handleBulkTag = () => {
    const raw = window.prompt("Add a tag to the selected albums:");
    const tag = raw ? normalizeTag(raw) : "";
    if (!tag) return;
    setMetaMap((p) => {
      const next = { ...p };
      selectedIds.forEach((id) => {
        const m = next[id] ?? DEFAULT_META;
        if (!m.tags.includes(tag) && m.tags.length < 8) next[id] = { ...m, tags: [...m.tags, tag] };
      });
      return next;
    });
    showToast(`Tagged ${selectedIds.size} album(s) #${tag}`);
  };
  const handleBulkLabel = (color: string | null) => {
    if (!selectedIds.size) return;
    setMetaMap((p) => {
      const next = { ...p };
      selectedIds.forEach((id) => { next[id] = { ...(next[id] ?? DEFAULT_META), color }; });
      return next;
    });
    showToast(color ? `Labelled ${plural(selectedIds.size, "album")}` : `Cleared labels on ${plural(selectedIds.size, "album")}`);
  };
  const handleBulkPin = () => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    const allPinned = ids.every((id) => metaOf(id).pinned);
    setMetaMap((p) => {
      const next = { ...p };
      ids.forEach((id) => { next[id] = { ...(next[id] ?? DEFAULT_META), pinned: !allPinned }; });
      return next;
    });
    showToast(`${allPinned ? "Unpinned" : "Pinned"} ${plural(ids.length, "album")}`);
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importAlbumsFromJsonText(String(reader.result || ""));
      if (res.count && res.extra?.meta) {
        setMetaMap((p) => {
          const next = { ...p };
          Object.entries(res.idMap).forEach(([oldId, newId]) => {
            const m = res.extra.meta[oldId];
            if (m) next[newId] = { ...DEFAULT_META, ...m, opens: 0, lastOpened: undefined };
          });
          return next;
        });
      }
      if (!res.count && !res.skipped) showToast("Nothing to import — check the file");
      else if (res.skipped) showToast(`Imported ${res.count}; skipped ${res.skipped} (library limit is ${LIBRARY_LIMITS.maxAlbums} albums)`);
      else showToast(`Imported ${res.count} album(s)`);
    };
    reader.onerror = () => showToast("Could not read that file");
    reader.readAsText(file);
  };
  const importFileRef = useRef(importFile);
  importFileRef.current = importFile;

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) importFile(file);
  };

  const runOptimize = async (o: OptimizeOptions) => {
    setOpt({ running: true, done: 0, total: 0 });
    try {
      const result = await optimizeLibrary(o, (done, total) => setOpt((p) => ({ ...p, done, total })));
      setOpt({ running: false, done: result.images, total: result.images, result });
      const saved = result.before - result.after;
      showToast(saved > 0 ? `Freed ${fmtBytes(saved)}` : "Photos were already optimized");
    } catch {
      setOpt({ running: false, done: 0, total: 0 });
      showToast("Optimization stopped — nothing was lost");
    }
    refresh();
    refreshEstimate();
  };

  const handlePersist = async () => {
    const ok = await requestPersistentStorage();
    refreshEstimate();
    showToast(ok ? "Library protected from browser cleanup" : "Browser declined — installing the app or bookmarking the site can help");
  };

  const copyColor = (hex: string) => {
    navigator.clipboard?.writeText(hex).then(() => showToast(`Copied ${hex}`)).catch(() => showToast(hex));
  };

  /* ── saved views ── */
  const clearFilters = () => { setSearch(""); setServiceFilter("all"); setCollection("all"); setTagFilter(null); };

  const applyView = (v: SavedView) => {
    setSearch(v.search);
    setServiceFilter(v.service);
    setCollection(v.collection);
    setTagFilter(v.tag);
  };
  const isActiveView = (v: SavedView) =>
    v.search === search && v.service === serviceFilter && v.collection === collection && v.tag === tagFilter;

  const commitSaveView = () => {
    const name = viewName.trim().slice(0, 28);
    setSavingView(false);
    setViewName("");
    if (!name || !isFiltering) return;
    if (savedViews.length >= MAX_SAVED_VIEWS) { showToast(`You can keep ${MAX_SAVED_VIEWS} saved views. Remove one first.`); return; }
    setSavedViews((p) => [...p, { id: `v${Date.now().toString(36)}`, name, search, service: serviceFilter, collection, tag: tagFilter }]);
    showToast(`Saved view “${name}”`);
  };
  const removeView = (v: SavedView) => {
    setSavedViews((p) => p.filter((x) => x.id !== v.id));
    showToast(`Removed view “${v.name}”`, { label: "Undo", run: () => { setSavedViews((p) => [...p, v]); setToast(null); } });
  };

  /* ── selection ── */
  const toggleSelectMode = () => { setSelectMode((m) => !m); setSelectedIds(new Set()); lastSelectedRef.current = null; };

  const selectItem = (a: SavedAlbumEntry, range: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (range && lastSelectedRef.current) {
        const ids = filtered.map((x) => x.id);
        const i = ids.indexOf(lastSelectedRef.current);
        const j = ids.indexOf(a.id);
        if (i > -1 && j > -1) {
          ids.slice(Math.min(i, j), Math.max(i, j) + 1).forEach((id) => next.add(id));
          return next;
        }
      }
      if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
      return next;
    });
    lastSelectedRef.current = a.id;
  };

  const handleCardClick = (a: SavedAlbumEntry, e: React.MouseEvent) => {
    if (selectMode || e.shiftKey || e.metaKey || e.ctrlKey) {
      if (!selectMode) setSelectMode(true);
      selectItem(a, e.shiftKey);
      return;
    }
    openAlbum(a);
  };

  /* ── manual ordering ── */
  const canReorder = sortMode === "custom" && !selectMode && viewMode !== "list" && viewMode !== "wall";
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids = filtered.map((a) => a.id).filter((id) => id !== dragId);
    const at = ids.indexOf(targetId);
    ids.splice(at, 0, dragId);
    setOrder([...ids, ...order.filter((id) => !ids.includes(id))]);
    setDragId(null);
    setOverId(null);
  };

  /* ── quick look stepping ── */
  const stepDetails = (dir: 1 | -1) => {
    const list = filteredRef.current;
    const i = list.findIndex((a) => a.id === detailsId);
    const next = list[i + dir];
    if (next) setDetailsId(next.id);
  };

  /* ── menu & palette contents ── */
  const menuItems = (a: SavedAlbumEntry): MenuItem[] => [
    { id: "open", label: "Open viewer", icon: <BookOutlined />, run: () => openAlbum(a) },
    { id: "info", label: "Quick look", icon: <InfoCircleOutlined />, run: () => setDetailsId(a.id) },
    { id: "edit", label: "Edit in editor", icon: <EditOutlined />, run: () => handleEdit(a) },
    { id: "dup", label: "Duplicate", icon: <CopyOutlined />, run: () => handleDuplicate(a) },
    { id: "ren", label: "Rename", icon: <EditOutlined />, run: () => startRename(a) },
    { id: "fav", label: favoriteIds.has(a.id) ? "Remove favorite" : "Add favorite", icon: <StarOutlined />, run: () => toggleFavorite(a.id) },
    { id: "pin", label: metaOf(a.id).pinned ? "Unpin" : "Pin to top", icon: <PushpinOutlined />, run: () => patchMeta(a.id, { pinned: !metaOf(a.id).pinned }) },
    { id: "exp", label: "Export JSON", icon: <ExportOutlined />, run: () => exportOne(a) },
    { id: "sep", label: "", sep: true },
    { id: "del", label: "Delete", icon: <DeleteOutlined />, danger: true, run: () => removeAlbums([a]) },
  ];

  const setView = (v: ViewMode) => setPrefs((p) => ({ ...p, view: v }));
  const setSort = (s: SortMode) => setPrefs((p) => ({ ...p, sort: s }));

  const paletteItems: PaletteItem[] = paletteOpen
    ? [
        { id: "new", label: "New album", icon: <PlusOutlined />, group: "Actions", run: handleNewBlank },
        { id: "stor", label: "Manage storage", hint: "Space, limits, optimize", icon: <HddOutlined />, group: "Actions", run: () => setStorageOpen(true) },
        { id: "opt", label: "Optimize photos", hint: "Free up space", icon: <CompressOutlined />, group: "Actions", run: () => setStorageOpen(true) },
        { id: "rand", label: "Open a random album", hint: "Feeling lucky", icon: <ThunderboltOutlined />, group: "Actions", run: () => { if (albums.length) openAlbum(albums[Math.floor(Math.random() * albums.length)]); } },
        { id: "sel", label: selectMode ? "Exit select mode" : "Select multiple", icon: <CheckSquareOutlined />, group: "Actions", run: toggleSelectMode },
        { id: "imp", label: "Import library backup", icon: <ImportOutlined />, group: "Actions", run: () => importInputRef.current?.click() },
        { id: "exp", label: "Back up entire library", icon: <ExportOutlined />, group: "Actions", run: handleExportAll },
        ...(isFiltering ? [{ id: "sv", label: "Save current view", hint: "Keep this search and filters", icon: <SaveOutlined />, group: "Actions" as const, run: () => setSavingView(true) }] : []),
        ...savedViews.map((v): PaletteItem => ({ id: `sv-${v.id}`, label: `View: ${v.name}`, hint: "Saved view", icon: <SaveOutlined />, group: "Actions", run: () => applyView(v) })),
        { id: "vg", label: "View: grid", icon: <AppstoreOutlined />, group: "Actions", run: () => setView("grid") },
        { id: "vl", label: "View: list", icon: <UnorderedListOutlined />, group: "Actions", run: () => setView("list") },
        { id: "vs", label: "View: bookshelf", icon: <ReadOutlined />, group: "Actions", run: () => setView("shelf") },
        { id: "vt", label: "View: timeline", icon: <FieldTimeOutlined />, group: "Actions", run: () => setView("timeline") },
        { id: "vw", label: "View: photo wall", hint: "Every photo, all albums", icon: <CameraOutlined />, group: "Actions", run: () => setView("wall") },
        { id: "cf", label: "Show favorites", icon: <StarOutlined />, group: "Actions", run: () => setCollection("favorites") },
        { id: "ci", label: "Show incomplete albums", hint: "Missing photos", icon: <PictureOutlined />, group: "Actions", run: () => setCollection("incomplete") },
        { id: "cu", label: "Show untagged albums", hint: "Hard to find in search", icon: <TagOutlined />, group: "Actions", run: () => setSearch("is:untagged") },
        { id: "cr", label: "Show recently saved", icon: <ClockCircleOutlined />, group: "Actions", run: () => setCollection("recent") },
        { id: "cc", label: "Clear all filters", icon: <CloseOutlined />, group: "Actions", run: clearFilters },
        ...albums.map((a): PaletteItem => ({
          id: `a-${a.id}`, label: a.templateName, hint: `${a.eventName} · ${a.serviceName}`, icon: <BookOutlined />, group: "Albums", run: () => openAlbum(a),
        })),
      ]
    : [];

  /* ── global keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!viewing) setPaletteOpen((o) => !o);
        return;
      }
      if (viewing || paletteOpen || menu || storageOpen) return;
      const t = e.target as HTMLElement;
      const typing = /^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable;
      if (e.key === "Escape") {
        if (detailsId) setDetailsId(null);
        else if (selectMode) toggleSelectMode();
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (detailsId && k === "j") stepDetails(1);
      else if (detailsId && k === "k") stepDetails(-1);
      else if (k === "n") handleNewBlank();
      else if (k === "s") toggleSelectMode();
      else if (k === "m") setStorageOpen(true);
      else if (k === "v") setView(VIEW_ORDER[(VIEW_ORDER.indexOf(viewMode) + 1) % VIEW_ORDER.length]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing, paletteOpen, menu, storageOpen, detailsId, selectMode, viewMode, atLimit]);

  /* ── drop a backup file anywhere to import ── */
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setFileDrag(true); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const leave = (e: DragEvent) => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) setFileDrag(false); } };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setFileDrag(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) importFileRef.current(f);
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

  const handlers: CardHandlers = {
    onCardClick: handleCardClick,
    onToggleFav: (id) => toggleFavorite(id),
    onPin: (id) => patchMeta(id, { pinned: !metaOf(id).pinned }),
    onDelete: (a) => removeAlbums([a]),
    onEdit: handleEdit,
    onDuplicate: handleDuplicate,
    onStartRename: startRename,
    onCommitRename: commitRename,
    onCancelRename: () => setRenamingId(null),
    onContext: (a, x, y) => setMenu({ x, y, album: a }),
    onDragStart: (id) => setDragId(id),
    onDragOver: (id) => setOverId(id),
    onDrop: handleDrop,
    onDragEnd: () => { setDragId(null); setOverId(null); },
  };

  const renderCards = (list: SavedAlbumEntry[]) =>
    list.map((a) => (
      <AlbumCard
        key={a.id}
        a={a}
        view={viewMode}
        fav={favoriteIds.has(a.id)}
        fill={fillOf(a)}
        meta={metaOf(a.id)}
        size={sizeOf(a)}
        selected={selectedIds.has(a.id)}
        selectMode={selectMode}
        renaming={renamingId === a.id}
        renameDraft={renameDraft}
        setRenameDraft={setRenameDraft}
        draggable={canReorder}
        dragging={dragId === a.id}
        dropTarget={!!dragId && overId === a.id && dragId !== a.id}
        h={handlers}
      />
    ));

  /* ── smart insights: what needs attention, one click to see it ── */
  const insights: Insight[] = [];
  if (ready && albums.length) {
    const needPhotos = collectionCounts.incomplete;
    const untagged = albums.filter((a) => !metaOf(a.id).tags.length).length;
    const heavy = albums.filter((a) => (fills.get(a.id)?.filled ?? 0) > LIBRARY_LIMITS.maxPhotosPerAlbum).length;
    if (needPhotos > 0) insights.push({ id: "photos", label: `${plural(needPhotos, "album")} still ${needPhotos === 1 ? "needs" : "need"} photos`, icon: <PictureOutlined />, tone: "warn", run: () => setCollection("incomplete") });
    if (heavy > 0) insights.push({ id: "heavy", label: `${plural(heavy, "album")} over the ${LIBRARY_LIMITS.maxPhotosPerAlbum}-photo guideline`, icon: <WarningOutlined />, tone: "warn", run: () => setSearch("is:heavy") });
    if (storagePct > 80) insights.push({ id: "space", label: `Storage is ${storagePct}% full`, icon: <HddOutlined />, tone: "warn", run: () => setStorageOpen(true) });
    if (untagged > 0 && albums.length > 2) insights.push({ id: "tags", label: `${plural(untagged, "album")} without tags`, icon: <TagOutlined />, tone: "info", run: () => setSearch("is:untagged") });
  }

  const detailsAlbum = detailsId ? albums.find((a) => a.id === detailsId) ?? null : null;
  const detailsIndex = detailsAlbum ? filtered.findIndex((a) => a.id === detailsAlbum.id) : -1;
  const VIEWS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: "grid", label: "Grid view", icon: <AppstoreOutlined /> },
    { id: "list", label: "List view", icon: <UnorderedListOutlined /> },
    { id: "shelf", label: "Bookshelf view", icon: <ReadOutlined /> },
    { id: "timeline", label: "Timeline view", icon: <FieldTimeOutlined /> },
    { id: "wall", label: "Photo wall", icon: <CameraOutlined /> },
  ];
  const COLLECTIONS: { id: Collection; label: string }[] = [
    { id: "all", label: "All" }, { id: "favorites", label: "Favorites" }, { id: "pinned", label: "Pinned" },
    { id: "recent", label: `Last ${RECENT_DAYS} days` }, { id: "incomplete", label: "Needs photos" },
  ];

  return (
    <main className={`al-page ${detailsAlbum ? "has-drawer" : ""}`}>
      <div className="al-sr-only" aria-live="polite">{toast?.msg}</div>
      {toast && (
        <div className="al-toast">
          {toast.msg}
          {toast.action && <button className="al-toast-action" onClick={toast.action.run}><UndoOutlined /> {toast.action.label}</button>}
        </div>
      )}

      {fileDrag && (
        <div className="al-dropzone" aria-hidden>
          <CloudUploadOutlined />
          <strong>Drop your backup to import</strong>
          <span>JSON exported from Album Library</span>
        </div>
      )}

      <section className="al-stage">
        <header className="al-topbar">
          <button className="al-back" type="button" onClick={() => navigate(-1)}><ArrowLeftOutlined /> Back</button>
          <div className="al-title-wrap">
            <span className="al-title-icon"><BookOutlined /></span>
            <div>
              <p className="al-subtitle">Album Library</p>
              <h1 className="al-heading">Saved Albums</h1>
            </div>
          </div>
          <button className="al-pal-trigger" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
            <ThunderboltOutlined /> <span>Quick actions</span> <kbd>Ctrl K</kbd>
          </button>
          <button className="al-new-btn" onClick={handleNewBlank}><PlusOutlined /> New Album</button>
        </header>

        <div className="al-body">
          {/* stats */}
          <section className="al-stats-bar" aria-label="Library statistics">
            <div className="al-stat">
              <span className={`al-stat-val ${atLimit ? "full" : ""}`}>{stats.totalAlbums}<small>/{stats.maxAlbums}</small></span>
              <span className="al-stat-label">Albums</span>
            </div>
            <div className="al-stat"><span className="al-stat-val">{stats.totalPages}</span><span className="al-stat-label">Total Pages</span></div>
            <div className="al-stat"><span className="al-stat-val">{insight.photos}</span><span className="al-stat-label">Photos</span></div>
            <div className="al-stat"><span className="al-stat-val">{stats.totalServices}</span><span className="al-stat-label">Services</span></div>
            <div className="al-stat"><span className="al-stat-val">{stats.favorites}</span><span className="al-stat-label">Favorites</span></div>
            <div className="al-stat"><span className="al-stat-val">{insight.completion}%</span><span className="al-stat-label">Photo slots filled</span></div>

            {serviceMix.length > 0 && (
              <div className="al-stat al-stat-mix">
                <div className="al-mix-bar" role="img" aria-label={`Albums by service: ${serviceMix.map(([n, c]) => `${n} ${c}`).join(", ")}`}>
                  {serviceMix.map(([n, c], i) => (
                    <button
                      key={n}
                      style={{ flex: c, background: MIX_COLORS[i % MIX_COLORS.length] }}
                      className={serviceFilter === n ? "on" : ""}
                      onClick={() => setServiceFilter(serviceFilter === n ? "all" : n)}
                      aria-label={`Filter by ${n}, ${c} albums`}
                      title={`${n} · ${c}`}
                    />
                  ))}
                </div>
                <span className="al-stat-label">Service mix</span>
              </div>
            )}

            <div className="al-stat al-stat-storage">
              <div className="al-storage-head">
                <DatabaseOutlined />
                <span>{fmtBytes(usedBytes)} of {fmtBytes(quotaBytes)}</span>
                <button className="al-link-btn" onClick={() => setStorageOpen(true)}>Manage</button>
              </div>
              <div className="al-storage-track" role="progressbar" aria-valuenow={storagePct} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
                <div className={`al-storage-fill ${storagePct > 80 ? "warn" : ""}`} style={{ width: `${Math.max(storagePct, usedBytes ? 1 : 0)}%` }} />
              </div>
              {(storagePct > 80 || atLimit) && (
                <span className="al-storage-warn">
                  {atLimit ? `Album limit reached (${stats.maxAlbums}). ` : ""}
                  {storagePct > 80 ? "Almost full — optimize photos or export a backup." : ""}
                </span>
              )}
            </div>
          </section>

          {/* smart insights */}
          {!isFiltering && insights.length > 0 && (
            <section className="al-insights" aria-label="Needs attention">
              <span className="al-insights-title">Needs attention</span>
              {insights.map((i) => (
                <button key={i.id} className={`al-insight ${i.tone}`} onClick={i.run}>
                  {i.icon}<span>{i.label}</span>
                </button>
              ))}
            </section>
          )}

          {/* backup nudge */}
          {needsBackup && (
            <div className="al-nudge" role="status">
              <SafetyCertificateOutlined />
              <p>{lastBackup ? `Last backup was ${relativeTime(lastBackup)}.` : "This library has never been backed up."} Browser data can be cleared; a backup file keeps your albums safe.</p>
              <button className="al-tool-btn active" onClick={handleExportAll}><ExportOutlined /> Back up now</button>
              <button className="alv-icon-btn" onClick={() => setNudgeHidden(true)} aria-label="Dismiss backup reminder"><CloseOutlined /></button>
            </div>
          )}

          {/* spotlight + jump back in */}
          {!isFiltering && ready && (spotlight || recents.length > 0) && (
            <div className="al-top-row">
              {spotlight && (
                <section className="al-spot" aria-label="Album spotlight" style={{ ["--spot" as any]: `url(${spotlight.coverImage})` }}>
                  <div className="al-spot-img" />
                  <div className="al-spot-text">
                    <span className="al-spot-tag"><BulbOutlined /> Today's spotlight</span>
                    <strong>{spotlight.templateName}</strong>
                    <em>{spotlight.eventName} · {pageCount(spotlight)} pages · saved {relativeTime(spotlight.savedAt)}</em>
                    <div className="al-spot-actions">
                      <button className="al-tool-btn active" onClick={() => openAlbum(spotlight)}><BookOutlined /> Open</button>
                      <button className="al-tool-btn" onClick={() => setDetailsId(spotlight.id)}><InfoCircleOutlined /> Quick look</button>
                    </div>
                  </div>
                </section>
              )}
              {recents.length > 0 && (
                <section className="al-jump" aria-label="Jump back in">
                  <span className="al-jump-title"><ClockCircleOutlined /> Jump back in</span>
                  <div className="al-jump-row">
                    {recents.map((a) => (
                      <button key={a.id} className="al-jump-item" onClick={() => openAlbum(a)}>
                        <span className="al-jump-thumb">{a.coverImage ? <img src={a.coverImage} alt="" /> : <PictureOutlined />}</span>
                        <span className="al-jump-text"><strong>{a.templateName}</strong><em>{relativeTime(metaOf(a.id).lastOpened)}</em></span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* toolbar */}
          <div className="al-toolbar">
            <div className="al-toolbar-left">
              <div className="al-search">
                <SearchOutlined />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…  try  tag:wedding  is:fav  is:untagged  pages>10"
                  aria-label="Search albums. Supports tag:, service:, is:fav, is:pinned, is:incomplete, is:untagged, is:heavy, pages> and pages<"
                />
                {search && <button className="al-search-clear" onClick={() => setSearch("")} aria-label="Clear search"><CloseOutlined /></button>}
              </div>
            </div>

            <div className="al-toolbar-right">
              <select className="al-sort-select" value={sortMode} onChange={(e) => setSort(e.target.value as SortMode)} aria-label="Sort albums">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A–Z)</option>
                <option value="pages">Most pages</option>
                <option value="completion">Least complete</option>
                <option value="opened">Recently opened</option>
                <option value="mostOpened">Most opened</option>
                <option value="custom">My order (drag)</option>
              </select>

              <div className="al-view-toggle" role="group" aria-label="View mode">
                {VIEWS.map((v) => (
                  <button key={v.id} className={viewMode === v.id ? "active" : ""} onClick={() => setView(v.id)} aria-pressed={viewMode === v.id} aria-label={v.label} title={v.label}>
                    {v.icon}
                  </button>
                ))}
              </div>

              {(viewMode === "grid" || viewMode === "timeline") && (
                <label className="al-density" title="Card size">
                  <span className="al-sr-only">Card size</span>
                  <input type="range" min={160} max={340} step={10} value={density} onChange={(e) => setPrefs((p) => ({ ...p, density: Number(e.target.value) }))} />
                </label>
              )}

              <button className={`al-tool-btn ${selectMode ? "active" : ""}`} onClick={toggleSelectMode} aria-pressed={selectMode}><CheckSquareOutlined /> Select</button>
              <button className="al-tool-btn" onClick={() => setStorageOpen(true)}><HddOutlined /> Storage</button>
              <button className="al-tool-btn" onClick={() => importInputRef.current?.click()}><ImportOutlined /> Import</button>
              <input ref={importInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportFile} aria-label="Import library backup" />
              <button className="al-tool-btn" onClick={handleExportAll} disabled={!albums.length}><ExportOutlined /> Export All</button>
            </div>
          </div>

          {/* collections + saved views + filters */}
          <div className="al-tabs" role="tablist" aria-label="Collections">
            {COLLECTIONS.map((c) => (
              <button key={c.id} role="tab" aria-selected={collection === c.id} className={`al-tab ${collection === c.id ? "active" : ""}`} onClick={() => setCollection(c.id)}>
                {c.label}<span className="al-chip-count">{collectionCounts[c.id]}</span>
              </button>
            ))}
          </div>

          {(savedViews.length > 0 || isFiltering) && (
            <div className="al-views" role="group" aria-label="Saved views">
              <span className="al-views-title"><SaveOutlined /> Saved views</span>
              {savedViews.map((v) => (
                <span key={v.id} className={`al-view-chip ${isActiveView(v) ? "active" : ""}`}>
                  <button onClick={() => applyView(v)} aria-pressed={isActiveView(v)}>{v.name}</button>
                  <button className="x" onClick={() => removeView(v)} aria-label={`Remove saved view ${v.name}`}><CloseOutlined /></button>
                </span>
              ))}
              {isFiltering && !savingView && savedViews.length < MAX_SAVED_VIEWS && !savedViews.some(isActiveView) && (
                <button className="al-view-save" onClick={() => setSavingView(true)}><PlusOutlined /> Save this view</button>
              )}
              {savingView && (
                <span className="al-view-form">
                  <input
                    autoFocus
                    value={viewName}
                    maxLength={28}
                    placeholder="Name this view"
                    aria-label="Saved view name"
                    onChange={(e) => setViewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitSaveView(); }
                      if (e.key === "Escape") { e.stopPropagation(); setSavingView(false); setViewName(""); }
                    }}
                  />
                  <button className="al-tool-btn active" onClick={commitSaveView} disabled={!viewName.trim()}>Save</button>
                  <button className="al-tool-btn" onClick={() => { setSavingView(false); setViewName(""); }}>Cancel</button>
                </span>
              )}
            </div>
          )}

          {(services.length > 1 || allTags.length > 0) && (
            <div className="al-filter-chips" aria-label="Filters">
              {services.length > 1 && (
                <>
                  <button className={`al-chip ${serviceFilter === "all" ? "active" : ""}`} aria-pressed={serviceFilter === "all"} onClick={() => setServiceFilter("all")}>All services</button>
                  {services.map((s) => (
                    <button key={s} className={`al-chip ${serviceFilter === s ? "active" : ""}`} aria-pressed={serviceFilter === s} onClick={() => setServiceFilter(s)}>{s}</button>
                  ))}
                </>
              )}
              {allTags.map(([t, c]) => (
                <button key={t} className={`al-chip al-chip-tag ${tagFilter === t ? "active" : ""}`} aria-pressed={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? null : t)}>
                  #{t}<span className="al-chip-count">{c}</span>
                </button>
              ))}
            </div>
          )}

          {selectMode && (
            <div className="al-bulk-bar" role="region" aria-label="Bulk actions">
              <span aria-live="polite">{selectedIds.size} selected</span>
              <div className="al-bulk-actions">
                <button className="al-tool-btn" onClick={() => setSelectedIds(new Set(filtered.map((a) => a.id)))}>Select all ({filtered.length})</button>
                <button className="al-tool-btn" onClick={handleBulkFavorite} disabled={!selectedIds.size}><StarOutlined /> Favorite</button>
                <button className="al-tool-btn" onClick={handleBulkPin} disabled={!selectedIds.size}><PushpinOutlined /> Pin</button>
                <button className="al-tool-btn" onClick={handleBulkTag} disabled={!selectedIds.size}><TagOutlined /> Tag</button>
                <span className="al-bulk-swatches" role="group" aria-label="Apply colour label to selected albums">
                  <button className="al-swatch none" onClick={() => handleBulkLabel(null)} disabled={!selectedIds.size} aria-label="Clear label on selected albums" title="Clear label"><CloseOutlined /></button>
                  {LABEL_COLORS.map((c) => (
                    <button key={c} className="al-swatch" style={{ background: c }} onClick={() => handleBulkLabel(c)} disabled={!selectedIds.size} aria-label={`Label selected albums ${c}`} title="Apply label" />
                  ))}
                </span>
                <button className="al-tool-btn" onClick={handleBulkExport} disabled={!selectedIds.size}><ExportOutlined /> Export</button>
                <button className="al-tool-btn danger" onClick={() => removeAlbums(albums.filter((a) => selectedIds.has(a.id)))} disabled={!selectedIds.size}><DeleteOutlined /> Delete</button>
              </div>
            </div>
          )}

          {canReorder && filtered.length > 1 && (
            <p className="al-hint">Drag albums to arrange them. Your order is saved on this device.</p>
          )}

          {!ready ? (
            <div className="al-loading" role="status">
              <span className="al-spinner" aria-hidden />
              <strong>Opening your library…</strong>
              <p>Loading albums from local storage.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="al-empty">
              <BookOutlined className="al-empty-icon" />
              <strong>{albums.length === 0 ? "No albums saved yet" : "No albums match"}</strong>
              <p>
                {albums.length === 0
                  ? "Save an album from the Template Editor, start a new one, or drop a backup file here."
                  : "Loosen the search, switch collection, or clear the filters."}
              </p>
              {albums.length === 0 ? (
                <button className="al-new-btn" onClick={handleNewBlank}><PlusOutlined /> Start a New Album</button>
              ) : (
                <button className="al-tool-btn" onClick={clearFilters}>Clear filters</button>
              )}
            </div>
          ) : viewMode === "wall" ? (
            <div>
              <p className="al-hint">{wallPhotos.length.toLocaleString()} photos across {filtered.length} album{filtered.length === 1 ? "" : "s"}. Click a photo to open its page.</p>
              {wallPhotos.length === 0 ? (
                <div className="al-empty"><PictureOutlined className="al-empty-icon" /><strong>No photos yet</strong><p>Albums in this view don't contain any photos.</p></div>
              ) : (
                <>
                  <div className="al-wall">
                    {wallPhotos.slice(0, wallLimit).map((p) => (
                      <button key={p.key} className="al-wall-tile" onClick={() => openAlbum(p.album, p.sheet)} aria-label={`Open ${p.album.templateName}, page ${p.sheet + 1}`}>
                        <img src={p.src} alt={p.label} loading="lazy" decoding="async" />
                        <span><strong>{p.album.templateName}</strong> · page {p.sheet + 1}</span>
                      </button>
                    ))}
                  </div>
                  {wallLimit < wallPhotos.length && (
                    <div className="al-wall-more">
                      <button className="al-tool-btn" onClick={() => setWallLimit((n) => n + WALL_PAGE)}>
                        Show {Math.min(WALL_PAGE, wallPhotos.length - wallLimit)} more ({wallPhotos.length - wallLimit} left)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : viewMode === "timeline" ? (
            <div className="al-timeline">
              {groups.map((g) => (
                <section key={g.label} className="al-tl-group" aria-label={g.label}>
                  <h2 className="al-tl-label"><span>{g.label}</span><em>{g.items.length}</em></h2>
                  <div className="al-grid" style={{ ["--al-card-min" as any]: `${density}px` }}>{renderCards(g.items)}</div>
                </section>
              ))}
            </div>
          ) : (
            <div
              className={viewMode === "grid" ? "al-grid" : viewMode === "list" ? "al-list" : "al-shelf"}
              style={viewMode === "grid" ? ({ ["--al-card-min" as any]: `${density}px` } as React.CSSProperties) : undefined}
            >
              {renderCards(filtered)}
            </div>
          )}
        </div>
      </section>

      {detailsAlbum && (
        <DetailsDrawer
          album={detailsAlbum}
          meta={metaOf(detailsAlbum.id)}
          fill={fillOf(detailsAlbum)}
          fav={favoriteIds.has(detailsAlbum.id)}
          size={sizeOf(detailsAlbum)}
          position={{ index: detailsIndex, count: filtered.length }}
          onClose={() => setDetailsId(null)}
          onPatch={(patch) => patchMeta(detailsAlbum.id, patch)}
          onOpen={(i) => openAlbum(detailsAlbum, i)}
          onEdit={() => handleEdit(detailsAlbum)}
          onDuplicate={() => handleDuplicate(detailsAlbum)}
          onExport={() => exportOne(detailsAlbum)}
          onDelete={() => removeAlbums([detailsAlbum])}
          onToggleFav={() => toggleFavorite(detailsAlbum.id)}
          onCopyColor={copyColor}
          onStep={stepDetails}
        />
      )}

      {storageOpen && (
        <StorageManager
          albums={albums}
          stats={stats}
          estimate={estimate}
          fills={fills}
          opt={opt}
          onClose={() => setStorageOpen(false)}
          onOptimize={runOptimize}
          onPersist={handlePersist}
          onOpen={(a) => { setStorageOpen(false); openAlbum(a); }}
          onDelete={(a) => removeAlbums([a])}
        />
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.album)} onClose={() => setMenu(null)} />}
      {paletteOpen && <CommandPalette items={paletteItems} onClose={() => setPaletteOpen(false)} />}

      {viewing ? (
        <AlbumViewer
          album={viewing.album}
          initialSheet={viewing.sheet}
          onClose={() => setViewing(null)}
          onEdit={(album) => { setViewing(null); handleEdit(album); }}
        />
      ) : null}
    </main>
  );
}