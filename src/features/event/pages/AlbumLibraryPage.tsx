import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined, SearchOutlined, DeleteOutlined, BookOutlined, PictureOutlined, CloseOutlined,
  LeftOutlined, RightOutlined, CaretRightOutlined, PauseCircleOutlined, SoundOutlined, AudioMutedOutlined,
  CalendarOutlined, TagOutlined, StarOutlined, StarFilled, EditOutlined, CopyOutlined, AppstoreOutlined,
  UnorderedListOutlined, CheckSquareOutlined, ExportOutlined, ImportOutlined, PlusOutlined, DatabaseOutlined,
  ThunderboltOutlined, PushpinOutlined, PushpinFilled, InfoCircleOutlined, FullscreenOutlined,
  FullscreenExitOutlined, ZoomInOutlined, ZoomOutOutlined, ReadOutlined, FieldTimeOutlined, MoreOutlined,
  CloudUploadOutlined, ClockCircleOutlined, UndoOutlined,
} from "@ant-design/icons";
import {
  getSavedAlbums, deleteSavedAlbum, deleteSavedAlbums, subscribeToAlbumLibrary, getFavoriteIds, toggleFavorite,
  renameSavedAlbum, duplicateSavedAlbum, getLibraryStats, exportAlbumsAsJson, importAlbumsFromJsonText,
  beginEditAlbum, beginBlankAlbum, upsertSavedAlbum,
  type SavedAlbumEntry, type LibrarySheetSnapshot, type LibraryTextSnapshot, type LibraryStats,
} from "../../../utils/albumLibraryStore"; // adjust path to your project structure
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
const RECENT_DAYS = 14;

type FlipDir = "forward" | "backward";
interface TurnState { from: number; to: number; dir: FlipDir; committing: boolean }
type ViewMode = "grid" | "list" | "shelf" | "timeline";
type SortMode = "newest" | "oldest" | "name" | "pages" | "completion" | "opened" | "custom";
type Collection = "all" | "favorites" | "pinned" | "recent" | "incomplete";
const VIEW_ORDER: ViewMode[] = ["grid", "list", "shelf", "timeline"];

interface AlbumMeta { tags: string[]; note: string; color: string | null; pinned: boolean; opens: number; lastOpened?: string }
const DEFAULT_META: AlbumMeta = { tags: [], note: "", color: null, pinned: false, opens: 0 };
interface Prefs { view: ViewMode; sort: SortMode; density: number }
interface Fill { filled: number; total: number; pct: number }
interface ToastState { msg: string; action?: { label: string; run: () => void } }
interface MenuItem { id: string; label: string; icon?: React.ReactNode; run?: () => void; danger?: boolean; sep?: boolean }
interface PaletteItem { id: string; label: string; hint?: string; icon: React.ReactNode; run: () => void; group: "Actions" | "Albums" }

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

const normalizeTag = (t: string) => t.trim().toLowerCase().replace(/^#+/, "").slice(0, 24);
const clampNum = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const spreadForSheet = (i: number) => (i > 0 ? 1 + Math.floor((i - 1) / 2) : 0);

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

/** Search operators: tag:x  service:x  is:fav  is:pinned  is:incomplete  pages>10  pages<5 */
function parseQuery(raw: string) {
  const out = {
    terms: [] as string[], tags: [] as string[], services: [] as string[],
    fav: false, pinned: false, incomplete: false, pagesMin: null as number | null, pagesMax: null as number | null,
  };
  raw.trim().toLowerCase().split(/\s+/).filter(Boolean).forEach((t) => {
    let m: RegExpMatchArray | null;
    if (t.startsWith("tag:") && t.length > 4) out.tags.push(t.slice(4));
    else if (t.startsWith("service:") && t.length > 8) out.services.push(t.slice(8));
    else if (t === "is:fav" || t === "is:favorite") out.fav = true;
    else if (t === "is:pinned") out.pinned = true;
    else if (t === "is:incomplete" || t === "is:empty") out.incomplete = true;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToPage("forward");
      else if (e.key === "ArrowLeft") goToPage("backward");
      else if (e.key === "Home") jumpToPage(0);
      else if (e.key === "End") jumpToPage(totalSpreads - 1);
      else if (e.key === "Escape") onClose();
      else if (e.key === " ") { e.preventDefault(); setAutoPlay((a) => !a); }
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
      else if (e.key === "+" || e.key === "=") changeZoom(zoom + 0.5);
      else if (e.key === "-") changeZoom(zoom - 0.5);
      else if (e.key === "0") changeZoom(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewIndex, turn, zoom]);

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
          <span className="alv-page-count" aria-live="polite">
            {reviewIndex === 0
              ? `Cover — Page 1 of ${sheets.length}`
              : firstPageNum === lastPageNum ? `Page ${firstPageNum} of ${sheets.length}` : `Pages ${firstPageNum}–${lastPageNum} of ${sheets.length}`}
            {" — "}
            {reviewIndex === 0 ? currentRight?.name : currentLeft?.name}
            {reviewIndex !== 0 && currentRight ? ` · ${currentRight.name}` : ""}
          </span>
          <div className="alv-progress-rail" aria-hidden><div className="alv-progress-rail-fill" style={{ width: `${progressPct}%` }} /></div>
          <span className="alv-kbd-hint">
            <kbd>←</kbd><kbd>→</kbd> turn <kbd>Space</kbd> play <kbd>F</kbd> full screen <kbd>+</kbd><kbd>−</kbd> zoom <kbd>Home</kbd><kbd>End</kbd> jump
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
  a, view, fav, fill, meta, selected, selectMode, renaming, renameDraft, setRenameDraft, draggable, dragging, dropTarget, h,
}: {
  a: SavedAlbumEntry; view: ViewMode; fav: boolean; fill: Fill; meta: AlbumMeta; selected: boolean; selectMode: boolean;
  renaming: boolean; renameDraft: string; setRenameDraft: (s: string) => void; draggable: boolean; dragging: boolean;
  dropTarget: boolean; h: CardHandlers;
}) {
  const glow = useDominantColor(a.coverImage);
  const [scrub, setScrub] = useState<number | null>(null);
  const pages = pageCount(a);
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

  const cover = a.coverImage ? <img src={a.coverImage} alt="" loading="lazy" /> : (
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
          {pages} pages · {fill.filled} photos{meta.lastOpened ? ` · opened ${relativeTime(meta.lastOpened)}` : ""}
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
  album, meta, fill, fav, onClose, onPatch, onOpen, onEdit, onDuplicate, onExport, onDelete, onToggleFav,
}: {
  album: SavedAlbumEntry; meta: AlbumMeta; fill: Fill; fav: boolean; onClose: () => void;
  onPatch: (patch: Partial<AlbumMeta>) => void; onOpen: (sheetIndex: number) => void; onEdit: () => void;
  onDuplicate: () => void; onExport: () => void; onDelete: () => void; onToggleFav: () => void;
}) {
  const [tagDraft, setTagDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prevFocus.current?.focus?.();
  }, [album.id]);

  const addTag = () => {
    const t = normalizeTag(tagDraft);
    setTagDraft("");
    if (!t || meta.tags.includes(t) || meta.tags.length >= 8) return;
    onPatch({ tags: [...meta.tags, t] });
  };

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
        <button ref={closeRef} className="alv-icon-btn" onClick={onClose} aria-label="Close details"><CloseOutlined /></button>
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
          <div><dt>Photos</dt><dd>{fill.filled} of {fill.total} slots</dd></div>
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

/* ════════════════════════════ main page ════════════════════════════ */
export default function AlbumLibraryPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<SavedAlbumEntry[]>(() => getSavedAlbums());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set(getFavoriteIds()));
  const [stats, setStats] = useState<LibraryStats>(() => getLibraryStats());

  const [metaMap, setMetaMap] = usePersisted<Record<string, AlbumMeta>>(META_KEY, {});
  const [order, setOrder] = usePersisted<string[]>(ORDER_KEY, []);
  const [prefs, setPrefs] = usePersisted<Prefs>(PREFS_KEY, { view: "grid", sort: "newest", density: 230 });
  const { view: viewMode, sort: sortMode, density } = prefs;

  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [collection, setCollection] = useState<Collection>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [viewing, setViewing] = useState<{ album: SavedAlbumEntry; sheet: number } | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; album: SavedAlbumEntry } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [fileDrag, setFileDrag] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setAlbums(getSavedAlbums());
    setFavoriteIds(new Set(getFavoriteIds()));
    setStats(getLibraryStats());
  };
  useEffect(() => subscribeToAlbumLibrary(refresh), []);
  useEffect(() => () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); }, []);

  const showToast = (msg: string, action?: ToastState["action"]) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ msg, action });
    toastTimerRef.current = window.setTimeout(() => setToast(null), action ? 7000 : 2600);
  };

  /* ── derived data ── */
  const metaOf = useCallback((id: string) => metaMap[id] ?? DEFAULT_META, [metaMap]);
  const patchMeta = (id: string, patch: Partial<AlbumMeta>) =>
    setMetaMap((p) => ({ ...p, [id]: { ...(p[id] ?? DEFAULT_META), ...patch } }));

  const fills = useMemo(() => new Map(albums.map((a) => [a.id, albumFill(a)])), [albums]);
  const fillOf = (a: SavedAlbumEntry): Fill => fills.get(a.id) ?? { filled: 0, total: 0, pct: 100 };

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

  const recents = useMemo(
    () => albums.filter((a) => metaOf(a.id).lastOpened).sort((a, b) => (metaOf(b.id).lastOpened! > metaOf(a.id).lastOpened! ? 1 : -1)).slice(0, 5),
    [albums, metaOf]
  );

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

  const exportOne = (a: SavedAlbumEntry) => {
    exportAlbumsAsJson([a], `axs-album-${a.templateName.replace(/\W+/g, "-").toLowerCase()}-${Date.now()}.json`);
    showToast("Exported album");
  };
  const handleExportAll = () => {
    if (!albums.length) return;
    exportAlbumsAsJson(albums);
    showToast(`Exported ${albums.length} album(s)`);
  };
  const handleBulkExport = () => {
    const sel = albums.filter((a) => selectedIds.has(a.id));
    if (!sel.length) return;
    exportAlbumsAsJson(sel, `axs-selected-albums-${Date.now()}.json`);
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

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const count = importAlbumsFromJsonText(String(reader.result || ""));
      showToast(count ? `Imported ${count} album(s)` : "Nothing to import — check the file");
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
  const canReorder = sortMode === "custom" && !selectMode && viewMode !== "list";
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids = filtered.map((a) => a.id).filter((id) => id !== dragId);
    const at = ids.indexOf(targetId);
    ids.splice(at, 0, dragId);
    setOrder([...ids, ...order.filter((id) => !ids.includes(id))]);
    setDragId(null);
    setOverId(null);
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
  const clearFilters = () => { setSearch(""); setServiceFilter("all"); setCollection("all"); setTagFilter(null); };

  const paletteItems: PaletteItem[] = paletteOpen
    ? [
        { id: "new", label: "New album", icon: <PlusOutlined />, group: "Actions", run: handleNewBlank },
        { id: "rand", label: "Open a random album", hint: "Feeling lucky", icon: <ThunderboltOutlined />, group: "Actions", run: () => { if (albums.length) openAlbum(albums[Math.floor(Math.random() * albums.length)]); } },
        { id: "sel", label: selectMode ? "Exit select mode" : "Select multiple", icon: <CheckSquareOutlined />, group: "Actions", run: toggleSelectMode },
        { id: "imp", label: "Import library backup", icon: <ImportOutlined />, group: "Actions", run: () => importInputRef.current?.click() },
        { id: "exp", label: "Export entire library", icon: <ExportOutlined />, group: "Actions", run: handleExportAll },
        { id: "vg", label: "View: grid", icon: <AppstoreOutlined />, group: "Actions", run: () => setView("grid") },
        { id: "vl", label: "View: list", icon: <UnorderedListOutlined />, group: "Actions", run: () => setView("list") },
        { id: "vs", label: "View: bookshelf", icon: <ReadOutlined />, group: "Actions", run: () => setView("shelf") },
        { id: "vt", label: "View: timeline", icon: <FieldTimeOutlined />, group: "Actions", run: () => setView("timeline") },
        { id: "cf", label: "Show favorites", icon: <StarOutlined />, group: "Actions", run: () => setCollection("favorites") },
        { id: "ci", label: "Show incomplete albums", hint: "Missing photos", icon: <PictureOutlined />, group: "Actions", run: () => setCollection("incomplete") },
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
      if (viewing || paletteOpen || menu) return;
      const t = e.target as HTMLElement;
      const typing = /^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable;
      if (e.key === "Escape") {
        if (detailsId) setDetailsId(null);
        else if (selectMode) toggleSelectMode();
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key.toLowerCase() === "n") handleNewBlank();
      else if (e.key.toLowerCase() === "s") toggleSelectMode();
      else if (e.key.toLowerCase() === "v") setView(VIEW_ORDER[(VIEW_ORDER.indexOf(viewMode) + 1) % VIEW_ORDER.length]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing, paletteOpen, menu, detailsId, selectMode, viewMode]);

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

  const detailsAlbum = detailsId ? albums.find((a) => a.id === detailsId) ?? null : null;
  const VIEWS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: "grid", label: "Grid view", icon: <AppstoreOutlined /> },
    { id: "list", label: "List view", icon: <UnorderedListOutlined /> },
    { id: "shelf", label: "Bookshelf view", icon: <ReadOutlined /> },
    { id: "timeline", label: "Timeline view", icon: <FieldTimeOutlined /> },
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
            <div className="al-stat"><span className="al-stat-val">{stats.totalAlbums}</span><span className="al-stat-label">Albums</span></div>
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
              <div className="al-storage-head"><DatabaseOutlined /><span>{stats.storageKB} KB used</span></div>
              <div className="al-storage-track" role="progressbar" aria-valuenow={stats.storagePct} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
                <div className={`al-storage-fill ${stats.storagePct > 80 ? "warn" : ""}`} style={{ width: `${stats.storagePct}%` }} />
              </div>
              {stats.storagePct > 80 && <span className="al-storage-warn">Almost full — export a backup, then remove old albums.</span>}
            </div>
          </section>

          {/* jump back in */}
          {!isFiltering && recents.length > 0 && (
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

          {/* toolbar */}
          <div className="al-toolbar">
            <div className="al-toolbar-left">
              <div className="al-search">
                <SearchOutlined />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…  try  tag:wedding  is:fav  pages>10"
                  aria-label="Search albums. Supports tag:, service:, is:fav, is:pinned, is:incomplete, pages> and pages<"
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
              <button className="al-tool-btn" onClick={() => importInputRef.current?.click()}><ImportOutlined /> Import</button>
              <input ref={importInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportFile} aria-label="Import library backup" />
              <button className="al-tool-btn" onClick={handleExportAll} disabled={!albums.length}><ExportOutlined /> Export All</button>
            </div>
          </div>

          {/* collections + filters */}
          <div className="al-tabs" role="tablist" aria-label="Collections">
            {COLLECTIONS.map((c) => (
              <button key={c.id} role="tab" aria-selected={collection === c.id} className={`al-tab ${collection === c.id ? "active" : ""}`} onClick={() => setCollection(c.id)}>
                {c.label}<span className="al-chip-count">{collectionCounts[c.id]}</span>
              </button>
            ))}
          </div>

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
                <button className="al-tool-btn" onClick={handleBulkTag} disabled={!selectedIds.size}><TagOutlined /> Tag</button>
                <button className="al-tool-btn" onClick={handleBulkExport} disabled={!selectedIds.size}><ExportOutlined /> Export</button>
                <button className="al-tool-btn danger" onClick={() => removeAlbums(albums.filter((a) => selectedIds.has(a.id)))} disabled={!selectedIds.size}><DeleteOutlined /> Delete</button>
              </div>
            </div>
          )}

          {sortMode === "custom" && !selectMode && viewMode !== "list" && filtered.length > 1 && (
            <p className="al-hint">Drag albums to arrange them. Your order is saved on this device.</p>
          )}

          {filtered.length === 0 ? (
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
          onClose={() => setDetailsId(null)}
          onPatch={(patch) => patchMeta(detailsAlbum.id, patch)}
          onOpen={(i) => openAlbum(detailsAlbum, i)}
          onEdit={() => handleEdit(detailsAlbum)}
          onDuplicate={() => handleDuplicate(detailsAlbum)}
          onExport={() => exportOne(detailsAlbum)}
          onDelete={() => removeAlbums([detailsAlbum])}
          onToggleFav={() => toggleFavorite(detailsAlbum.id)}
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