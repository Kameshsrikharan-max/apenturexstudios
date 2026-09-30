import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeftOutlined, UndoOutlined, RedoOutlined, SettingOutlined, SaveOutlined, ShareAltOutlined,
  PlusOutlined, DeleteOutlined, PictureOutlined, MoreOutlined, UploadOutlined, CloseOutlined,
  CopyOutlined, RotateRightOutlined, SwapOutlined, CheckOutlined, SendOutlined, AppstoreOutlined,
  HistoryOutlined, MessageOutlined, VerticalAlignTopOutlined, VerticalAlignBottomOutlined,
  ReadOutlined, LeftOutlined, RightOutlined, BookOutlined, CaretRightOutlined, PauseCircleOutlined,
  SoundOutlined, AudioMutedOutlined, FontSizeOutlined, SmileOutlined, BoldOutlined, ItalicOutlined,
  UnderlineOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, BgColorsOutlined,
  FolderOpenOutlined, ThunderboltOutlined, FullscreenOutlined, FullscreenExitOutlined,
  DownloadOutlined, SearchOutlined, DragOutlined, WarningOutlined, CheckCircleOutlined,
  CameraOutlined, EditOutlined, AimOutlined, ExperimentOutlined, TableOutlined, EyeOutlined,
  QuestionCircleOutlined, FileImageOutlined, VerticalAlignMiddleOutlined, ColumnWidthOutlined,
} from "@ant-design/icons";
import "./TemplateEditorPage.css";
import {
  upsertSavedAlbum,
  getAlbumById,
  readEditorSession,
  clearEditorSession,
  isLibraryReady,
  whenLibraryReady,
  newAlbumId,
  type SavedAlbumEntry,
  type LibrarySheetSnapshot,
} from "../../../utils/albumLibraryStore"; 

/* ───────────────────────────── Types ───────────────────────────── */

interface EditorContext {
  templateId: number;
  templateName: string;
  sheetsCount: number;
  canvasSize: string;
  photosRequired: number;
  versionNum: number;
  isLatest: boolean;
  status: string;
  eventId?: string | null;
  serviceName?: string;
  eventName?: string;
}

export type FrameId = "none" | "white" | "gold" | "film" | "shadow" | "circle";

export interface PhotoAdjust {
  b: number; // brightness %
  c: number; // contrast %
  s: number; // saturation %
}

export interface Slot {
  id: string;
  image: string | null;
  fileName?: string;
  caption?: string;
  rotateExtra?: number;
  flip?: boolean;
  front?: boolean;
  filter?: string;
  scale?: number;
  /** in-frame zoom (1–3) */
  zoom?: number;
  /** focal point, 0–100 */
  fx?: number;
  fy?: number;
  frame?: FrameId;
  adj?: PhotoAdjust;
  /** free tilt in degrees (-20 – 20) */
  tilt?: number;
  /** dark cinematic vignette */
  vignette?: boolean;
}

type LayoutId =
  | "full" | "split2h" | "split2v" | "three" | "grid4" | "grid6" | "collage" | "hero"
  | "beforeAfter" | "timeline" | "magazine" | "panoramic" | "minimal" | "asymmetrical" | "polaroid";
type TextAlign = "left" | "center" | "right";
type TextPreset = "heading" | "caption" | "date" | "quote" | "monogram" | "signature" | "title";

export interface TextElement {
  id: string;
  text: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  rotate: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  bg: string;
  isSticker?: boolean;
  shadow?: boolean;
  spacing?: number; // letter spacing in em
  opacity?: number; // 0.1 – 1
  stroke?: number; // outline width in cqw
  strokeColor?: string;
}

export interface Sheet {
  id: string;
  name: string;
  layout: LayoutId;
  slots: Slot[];
  bgColor: string;
  bgImage: string | null;
  title?: string;
  subtitle?: string;
  textElements: TextElement[];
  /** per-page overrides of the album-wide spacing */
  gap?: number;
  radius?: number;
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  rotate?: number;
  z?: number;
}

export interface LayoutMeta {
  id: LayoutId;
  label: string;
  blurb: string;
  rects: Rect[];
  captions?: boolean;
  captionStyle?: "before-after" | "timeline";
  style?: "collage" | "polaroid";
  decorative?: "vs" | "timeline" | "spine";
  textRect?: Rect;
}

interface Comment { id: string; text: string; author: string; time: string; }
interface VersionEntry { id: string; label: string; time: string; sheetCount: number; snapshot: Sheet[]; }
interface PoolPhoto { id: string; url: string; name: string; w: number; h: number; }
interface Theme {
  id: string; label: string; cover: string; page: string; text: string; coverText: string;
  font: string; frame: FrameId; gap: number; radius: number;
}
interface PageStyle { bgColor: string; bgImage: string | null; frame: FrameId; gap?: number; radius?: number; }
interface Cmd { id: string; group: string; label: string; hint?: string; run: () => void; }

type FlipDir = "forward" | "backward";
interface TurnState { from: number; to: number; dir: FlipDir; committing: boolean; }
type RightTab = "layout" | "photos" | "elements" | "design" | "comments" | "history";
type TextDragMode = "move" | "resize" | "rotate";

/* ───────────────────────────── Layout catalogue ───────────────────────────── */

export const LAYOUTS: LayoutMeta[] = [
  { id: "full", label: "Full-Page", blurb: "One large photo covering the entire page", rects: [{ top: 0, left: 0, width: 100, height: 100 }] },
  {
    id: "split2h", label: "2-Photo Split", blurb: "Two photos side-by-side",
    rects: [{ top: 0, left: 0, width: 50, height: 100 }, { top: 0, left: 50, width: 50, height: 100 }],
  },
  {
    id: "split2v", label: "2-Photo Stack", blurb: "Two photos, top and bottom",
    rects: [{ top: 0, left: 0, width: 100, height: 50 }, { top: 50, left: 0, width: 100, height: 50 }],
  },
  {
    id: "three", label: "3-Photo Layout", blurb: "One large image + two smaller images",
    rects: [
      { top: 0, left: 0, width: 66.66, height: 100 },
      { top: 0, left: 66.66, width: 33.34, height: 50 },
      { top: 50, left: 66.66, width: 33.34, height: 50 },
    ],
  },
  {
    id: "grid4", label: "4-Grid Layout", blurb: "Four equal photos in a clean grid",
    rects: [
      { top: 0, left: 0, width: 50, height: 50 }, { top: 0, left: 50, width: 50, height: 50 },
      { top: 50, left: 0, width: 50, height: 50 }, { top: 50, left: 50, width: 50, height: 50 },
    ],
  },
  {
    id: "grid6", label: "6-Grid Layout", blurb: "Six photos arranged evenly",
    rects: [
      { top: 0, left: 0, width: 33.33, height: 50 }, { top: 0, left: 33.33, width: 33.33, height: 50 },
      { top: 0, left: 66.66, width: 33.34, height: 50 }, { top: 50, left: 0, width: 33.33, height: 50 },
      { top: 50, left: 33.33, width: 33.33, height: 50 }, { top: 50, left: 66.66, width: 33.34, height: 50 },
    ],
  },
  {
    id: "collage", label: "Collage Layout", blurb: "Overlapping photos with creative positioning", style: "collage",
    rects: [
      { top: 2, left: 4, width: 46, height: 50, rotate: -4, z: 2 },
      { top: 6, left: 46, width: 34, height: 30, rotate: 5, z: 4 },
      { top: 40, left: 50, width: 38, height: 42, rotate: -3, z: 3 },
      { top: 52, left: 6, width: 32, height: 34, rotate: 6, z: 1 },
      { top: 4, left: 70, width: 24, height: 24, rotate: -8, z: 5 },
    ],
  },
  {
    id: "hero", label: "Hero + Supporting", blurb: "One main photo with supporting images",
    rects: [
      { top: 0, left: 0, width: 64, height: 100 },
      { top: 0, left: 66, width: 34, height: 23.5 }, { top: 25.5, left: 66, width: 34, height: 23.5 },
      { top: 51, left: 66, width: 34, height: 23.5 }, { top: 76.5, left: 66, width: 34, height: 23.5 },
    ],
  },
  {
    id: "beforeAfter", label: "Before & After", blurb: "Two photos with a clear comparison",
    captions: true, captionStyle: "before-after", decorative: "vs",
    rects: [{ top: 0, left: 0, width: 50, height: 100 }, { top: 0, left: 50, width: 50, height: 100 }],
  },
  {
    id: "timeline", label: "Story / Timeline", blurb: "Photos arranged chronologically",
    captions: true, captionStyle: "timeline", decorative: "timeline",
    rects: [
      { top: 0, left: 0, width: 25, height: 100 }, { top: 0, left: 25, width: 25, height: 100 },
      { top: 0, left: 50, width: 25, height: 100 }, { top: 0, left: 75, width: 25, height: 100 },
    ],
  },
  {
    id: "magazine", label: "Magazine Layout", blurb: "Large photo + typography + supporting images",
    textRect: { top: 0, left: 60, width: 40, height: 46 },
    rects: [
      { top: 0, left: 0, width: 58, height: 100 },
      { top: 48, left: 60, width: 40, height: 25 }, { top: 75, left: 60, width: 40, height: 25 },
    ],
  },
  { id: "panoramic", label: "Panoramic Spread", blurb: "One image spanning both pages", decorative: "spine", rects: [{ top: 0, left: 0, width: 100, height: 100 }] },
  {
    id: "minimal", label: "Minimal Layout", blurb: "Lots of whitespace, 1–2 carefully placed photos",
    rects: [{ top: 14, left: 10, width: 32, height: 32 }, { top: 56, left: 56, width: 32, height: 32 }],
  },
  {
    id: "asymmetrical", label: "Asymmetrical Layout", blurb: "Different sizes, unconventional positioning",
    rects: [
      { top: 0, left: 0, width: 62, height: 58 }, { top: 0, left: 64, width: 36, height: 27 },
      { top: 29, left: 64, width: 36, height: 71 }, { top: 60, left: 0, width: 62, height: 40 },
    ],
  },
  {
    id: "polaroid", label: "Polaroid Layout", blurb: "Photos styled like printed polaroid pictures", style: "polaroid",
    rects: [
      { top: 4, left: 6, width: 40, height: 44, rotate: -6 }, { top: 2, left: 52, width: 40, height: 40, rotate: 4 },
      { top: 52, left: 4, width: 40, height: 44, rotate: 5 }, { top: 50, left: 52, width: 40, height: 44, rotate: -4 },
    ],
  },
];

export const layoutMap = new Map(LAYOUTS.map((l) => [l.id, l]));
export const getLayout = (id: LayoutId) => layoutMap.get(id) ?? LAYOUTS[0];

/* ───────────────────────────── Constants ───────────────────────────── */

const CANVAS_W = 2540;
const CANVAS_H = 2032;
const BASE_CANVAS_PX = 900;
const FLIP_MS = 640;
const AUTOPLAY_GAP_MS = 2600;
const MAX_STACK_PAGES = 16;
const LOW_RES_EDGE = 1400;
const COALESCE_MS = 700;
/** photos are downscaled to this long edge when saved to the library (keeps localStorage small) */
const PERSIST_MAX_EDGE = 1800;

const FONT_OPTIONS = [
  "'Times New Roman', Times, serif",
  "'Playfair Display', Georgia, serif",
  "'Poppins', 'Segoe UI', sans-serif",
  "'Caveat', 'Segoe Print', cursive",
  "'Bebas Neue', Impact, sans-serif",
  "Georgia, serif",
  "'Courier New', monospace",
  "'Segoe UI', sans-serif",
  "'Great Vibes', 'Segoe Script', cursive",
  "'Cinzel', 'Times New Roman', serif",
  "'Montserrat', 'Segoe UI', sans-serif",
];

const FILTER_PRESETS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Original", css: "none" },
  { id: "bw", label: "B & W", css: "grayscale(1) contrast(1.05)" },
  { id: "sepia", label: "Sepia", css: "sepia(0.65) contrast(1.02) saturate(1.1)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.55) contrast(1.1)" },
  { id: "fade", label: "Fade", css: "saturate(0.7) brightness(1.08) contrast(0.9)" },
  { id: "cool", label: "Cool", css: "hue-rotate(-10deg) saturate(1.1) brightness(1.02)" },
  { id: "warm", label: "Warm", css: "hue-rotate(8deg) saturate(1.2) brightness(1.04)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.35) brightness(0.92)" },
];

const FRAMES: { id: FrameId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "white", label: "Matte" },
  { id: "gold", label: "Gilded" },
  { id: "film", label: "Film strip" },
  { id: "shadow", label: "Lifted" },
  { id: "circle", label: "Oval" },
];

const THEMES: Theme[] = [
  { id: "ivory", label: "Ivory Classic", cover: "#3a2418", page: "#faf6ee", text: "#2a2118", coverText: "#f4dab1", font: "'Playfair Display', Georgia, serif", frame: "white", gap: 10, radius: 2 },
  { id: "midnight", label: "Midnight Gold", cover: "#0b1424", page: "#121c30", text: "#e9d8a6", coverText: "#e9d8a6", font: "'Playfair Display', Georgia, serif", frame: "gold", gap: 8, radius: 4 },
  { id: "blush", label: "Blush Wedding", cover: "#e8c9c4", page: "#fdf3f0", text: "#7a3b45", coverText: "#5b2a33", font: "'Caveat', 'Segoe Print', cursive", frame: "white", gap: 12, radius: 14 },
  { id: "noir", label: "Noir Film", cover: "#0a0a0a", page: "#141414", text: "#f2f2f2", coverText: "#ffffff", font: "'Bebas Neue', Impact, sans-serif", frame: "film", gap: 6, radius: 2 },
  { id: "sage", label: "Sage Garden", cover: "#3f5a48", page: "#eef2ea", text: "#2f4a3a", coverText: "#eef2ea", font: "'Poppins', 'Segoe UI', sans-serif", frame: "none", gap: 8, radius: 16 },
  { id: "studio", label: "Studio Cyan", cover: "#0c2740", page: "#0a1626", text: "#edf8ff", coverText: "#38d5ff", font: "'Poppins', 'Segoe UI', sans-serif", frame: "shadow", gap: 6, radius: 10 },
];

const EMOJI_LIST = [
  "❤️", "💕", "💖", "💛", "💚", "💙", "💜", "🧡", "✨", "⭐", "🌟", "💫",
  "🎉", "🎊", "🎈", "🎁", "🌸", "🌺", "🌼", "🌻", "🌷", "🍀", "🌈", "☀️",
  "📸", "📷", "🎬", "🎵", "🎶", "😊", "😍", "🥰", "😂", "😎", "🥳", "😇",
  "👶", "👰", "🤵", "💍", "💐", "🕊️", "🏆", "👑", "🔥", "💯", "✅", "👍",
];

/** Auto-build: how many photos each generated page takes, and which layouts fit that count. */
const CHUNK_PLAN = [3, 2, 4, 1, 5, 2, 6, 3];
const LAYOUT_BY_COUNT: Record<number, LayoutId[]> = {
  1: ["full", "panoramic"],
  2: ["split2h", "split2v", "minimal"],
  3: ["three"],
  4: ["grid4", "asymmetrical", "polaroid"],
  5: ["hero", "collage"],
  6: ["grid6"],
};

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Ctrl K", label: "Command palette" },
  { keys: "Ctrl S", label: "Save album" },
  { keys: "Ctrl Z / Ctrl Shift Z", label: "Undo / Redo" },
  { keys: "Ctrl D", label: "Duplicate text or page" },
  { keys: "Del", label: "Delete selection" },
  { keys: "Arrows", label: "Nudge text (Shift = big steps)" },
  { keys: "PageUp / PageDown", label: "Previous / next page" },
  { keys: "Alt ← / →", label: "Previous / next page" },
  { keys: "P", label: "Preview mode" },
  { keys: "F", label: "Focus mode" },
  { keys: "Ctrl + Scroll", label: "Zoom canvas" },
  { keys: "Double-click photo", label: "Reposition focus" },
  { keys: "Double-click text", label: "Edit text" },
  { keys: "Esc", label: "Clear selection / close" },
  { keys: "?", label: "This cheat-sheet" },
];

const PHOTO_DND = "text/axs-photo";
const EVENT_CTX_KEY = "currentTemplateEditor";

/* ───────────────────────────── Helpers ───────────────────────────── */

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadContext(): EditorContext {
  try {
    const raw = sessionStorage.getItem(EVENT_CTX_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    templateId: 0, templateName: "Untitled Album", sheetsCount: 14, canvasSize: "10x8",
    photosRequired: 0, versionNum: 1, isLatest: true, status: "Draft", eventId: null,
    serviceName: "", eventName: "Untitled Event",
  };
}

function makeSlot(): Slot {
  return { id: `slot_${uid()}`, image: null };
}

function makeSheet(index: number, layout: LayoutId = "full"): Sheet {
  const meta = getLayout(layout);
  return {
    id: `sheet_${uid()}`, name: `Page ${index}`, layout,
    slots: Array.from({ length: meta.rects.length }, makeSlot),
    bgColor: "#ffffff", bgImage: null, textElements: [],
  };
}

function buildInitialSheets(count: number): Sheet[] {
  const defaults: LayoutId[] = ["hero", "full", "grid4", "three"];
  return Array.from({ length: Math.max(count, 1) }, (_, i) => {
    const sheet = makeSheet(i + 1, defaults[i % defaults.length]);
    if (i === 0) sheet.bgColor = "#7a1f2f";
    return sheet;
  });
}

function cloneSheets(sheets: Sheet[]): Sheet[] {
  return typeof structuredClone === "function" ? structuredClone(sheets) : JSON.parse(JSON.stringify(sheets));
}

/** Library snapshot → editable sheet (ids preserved so "continue editing" is seamless). */
function fromSnapshot(s: LibrarySheetSnapshot): Sheet {
  const layout = (layoutMap.has(s.layout as LayoutId) ? s.layout : "full") as LayoutId;
  const slots = (s.slots ?? []).map((sl) => ({ ...sl })) as Slot[];
  const need = getLayout(layout).rects.length;
  while (slots.length < need) slots.push(makeSlot());
  return {
    id: s.id || `sheet_${uid()}`,
    name: s.name || "Page",
    layout,
    slots,
    bgColor: s.bgColor ?? "#ffffff",
    bgImage: s.bgImage ?? null,
    title: s.title,
    subtitle: s.subtitle,
    gap: s.gap,
    radius: s.radius,
    textElements: (s.textElements ?? []).map((t) => ({ ...t })) as TextElement[],
  };
}

/** Re-flows a sheet's slots into a new layout (optionally packing filled slots first). */
function reflowSheet(s: Sheet, layoutId: LayoutId, compact = false): Sheet {
  const meta = getLayout(layoutId);
  const src = compact ? [...s.slots.filter((x) => x.image), ...s.slots.filter((x) => !x.image)] : s.slots;
  const needed = meta.rects.length;
  const newSlots: Slot[] = Array.from({ length: needed }, (_, i) => (src[i] ? { ...src[i] } : makeSlot()));
  if (meta.captions) {
    newSlots.forEach((sl, i) => {
      if (!sl.caption) {
        sl.caption = meta.captionStyle === "before-after" ? (i === 0 ? "Before" : "After") : `Moment ${i + 1}`;
      }
    });
  }
  return {
    ...s,
    layout: layoutId,
    slots: newSlots,
    title: layoutId === "magazine" ? s.title || "Your Story" : s.title,
    subtitle: layoutId === "magazine" ? s.subtitle || "A moment worth remembering" : s.subtitle,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function measureImage(src: string): Promise<{ w: number; h: number }> {
  const img = await loadImage(src);
  return { w: img.naturalWidth, h: img.naturalHeight };
}

/** Dominant-colour palette via a 48×48 downsample and 3-bit-per-channel bucketing. */
async function extractPalette(src: string, count = 5): Promise<string[]> {
  const img = await loadImage(src);
  const S = 48;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  g.drawImage(img, 0, 0, S, S);
  const data = g.getImageData(0, 0, S, S).data;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i], gg = data[i + 1], b = data[i + 2];
    const key = ((r >> 5) << 6) | ((gg >> 5) << 3) | (b >> 5);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += gg; e.b += b;
    buckets.set(key, e);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((e) => [e.r / e.n, e.g / e.n, e.b / e.n]);
  const picked: number[][] = [];
  for (const c of sorted) {
    if (picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 48)) picked.push(c);
    if (picked.length >= count) break;
  }
  return picked.map(([r, g2, b]) => "#" + [r, g2, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""));
}


async function detectFocus(src: string): Promise<{ fx: number; fy: number }> {
  const img = await loadImage(src);
  const W = 64;
  const H = Math.max(8, Math.round((W * img.naturalHeight) / Math.max(1, img.naturalWidth)));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return { fx: 50, fy: 50 };
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H);
  const sat = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
    lum[i] = 0.299 * r + 0.587 * gg + 0.114 * b;
    sat[i] = Math.max(r, gg, b) - Math.min(r, gg, b);
  }
  const energy = new Float32Array(W * H);
  let sum = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + W] - lum[i - W];
      const nx = (x / W - 0.5) * 2;
      const ny = (y / H - 0.5) * 2;
      const centre = 1 - 0.35 * Math.min(1, Math.hypot(nx, ny));
      const e = (Math.hypot(gx, gy) + sat[i] * 0.45) * centre;
      energy[i] = e;
      sum += e;
    }
  }
  const mean = sum / (W * H);
  let wx = 0, wy = 0, wt = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const e = energy[y * W + x];
      if (e < mean) continue;
      const w = e * e;
      wx += x * w; wy += y * w; wt += w;
    }
  }
  if (!wt) return { fx: 50, fy: 50 };
  return { fx: clamp(Math.round((wx / wt / W) * 100), 12, 88), fy: clamp(Math.round((wy / wt / H) * 100), 12, 88) };
}

function hexToRgb(h: string): [number, number, number] {
  const v = h.replace("#", "");
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
}
function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function lumOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}


async function blobUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Downscale + JPEG-encode so a whole album fits comfortably in localStorage. */
async function compressImage(src: string, maxEdge = PERSIST_MAX_EDGE, quality = 0.86): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  if (!g) throw new Error("no ctx");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.drawImage(img, 0, 0, w, h);
  return cv.toDataURL("image/jpeg", quality);
}

const persistCache = new Map<string, string>();

async function toPersistableImage(src: string | null | undefined): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:") && src.length < 400_000) return src; // already small
  const hit = persistCache.get(src);
  if (hit) return hit;
  let out: string | null = null;
  try {
    out = await compressImage(src);
  } catch {
    if (src.startsWith("blob:")) {
      try { out = await blobUrlToDataUrl(src); } catch { out = null; }
    } else {
      out = src; // remote / tainted image – keep the reference
    }
  }
  if (out) persistCache.set(src, out);
  return out;
}

async function buildLibrarySheets(sheets: Sheet[]): Promise<LibrarySheetSnapshot[]> {
  return Promise.all(
    sheets.map(async (s) => ({
      id: s.id,
      name: s.name,
      layout: s.layout,
      bgColor: s.bgColor,
      bgImage: await toPersistableImage(s.bgImage),
      title: s.title,
      subtitle: s.subtitle,
      gap: s.gap,
      radius: s.radius,
      textElements: s.textElements.map((t) => ({ ...t })),
      slots: await Promise.all(s.slots.map(async (sl) => ({ ...sl, image: await toPersistableImage(sl.image) }))),
    }))
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const adjOf = (sl: Slot): PhotoAdjust => sl.adj ?? { b: 100, c: 100, s: 100 };


function slotFilter(sl: Slot): string {
  const parts: string[] = [];
  if (sl.filter && sl.filter !== "none") parts.push(sl.filter);
  if (sl.adj && (sl.adj.b !== 100 || sl.adj.c !== 100 || sl.adj.s !== 100)) {
    parts.push(`brightness(${sl.adj.b}%) contrast(${sl.adj.c}%) saturate(${sl.adj.s}%)`);
  }
  return parts.length ? parts.join(" ") : "none";
}

export function rectStyle(r: Rect, gap: number, radius: number): React.CSSProperties {
  return {
    top: `calc(${r.top}% + ${gap}px)`,
    left: `calc(${r.left}% + ${gap}px)`,
    width: `calc(${r.width}% - ${gap * 2}px)`,
    height: `calc(${r.height}% - ${gap * 2}px)`,
    borderRadius: `${radius}px`,
    zIndex: r.z ?? 1,
  };
}

function makeTextElement(preset?: TextPreset): TextElement {
  const base: TextElement = {
    id: `text_${uid()}`, text: "Double-click to edit", xPct: 26, yPct: 40, wPct: 48, hPct: 14,
    rotate: 0, color: "#ffffff", fontFamily: FONT_OPTIONS[0], fontSize: 5, bold: false, italic: false,
    underline: false, align: "center", bg: "transparent",
  };
  if (preset === "heading") return { ...base, text: "Our Story", fontSize: 9, bold: true, wPct: 60, hPct: 16, yPct: 8 };
  if (preset === "caption") return { ...base, text: "Add a caption…", fontSize: 3.2, wPct: 46, hPct: 9, yPct: 84 };
  if (preset === "date") {
    return { ...base, text: new Date().toLocaleDateString(), fontSize: 3, italic: true, wPct: 30, hPct: 7, xPct: 4, yPct: 90, align: "left" };
  }
  if (preset === "quote") {
    return {
      ...base, text: "“Every picture tells a story.”", fontFamily: FONT_OPTIONS[1], italic: true, fontSize: 4.6,
      wPct: 64, hPct: 20, xPct: 18, yPct: 38, shadow: true,
    };
  }
  if (preset === "monogram") {
    return { ...base, text: "A & B", fontFamily: FONT_OPTIONS[4], fontSize: 12, wPct: 46, hPct: 22, xPct: 27, yPct: 34, spacing: 0.18, shadow: true };
  }
  if (preset === "signature") {
    return { ...base, text: "with love", fontFamily: FONT_OPTIONS[8], fontSize: 7, wPct: 40, hPct: 14, xPct: 30, yPct: 76, shadow: true };
  }
  if (preset === "title") {
    return { ...base, text: "THE ALBUM", fontFamily: FONT_OPTIONS[9], fontSize: 8, bold: true, wPct: 70, hPct: 18, xPct: 15, yPct: 36, spacing: 0.12, shadow: true };
  }
  return base;
}

function roundedRectPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

function drawCover(
  g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number,
  fx: number, fy: number, zoom: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const br = w / h;
  let dw: number, dh: number;
  if (ir > br) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
  dw *= zoom; dh *= zoom;
  g.drawImage(img, x + ((w - dw) * fx) / 100, y + ((h - dh) * fy) / 100, dw, dh);
}

/* ───────────────────────────── Small presentational bits ───────────────────────────── */

function LayoutThumb({ rects, images }: { rects: Rect[]; images?: (string | null)[] }) {
  return (
    <span className="tp-thumb">
      {rects.map((r, i) => {
        const img = images?.[i];
        return (
          <span
            key={i}
            className={`tp-thumb-rect ${img ? "has-img" : ""}`}
            style={{
              top: `${r.top}%`, left: `${r.left}%`, width: `${r.width}%`, height: `${r.height}%`,
              transform: r.rotate ? `rotate(${r.rotate}deg)` : undefined, zIndex: r.z ?? 1,
              backgroundImage: img ? `url(${img})` : undefined,
            }}
          />
        );
      })}
    </span>
  );
}


function SheetMini({ sheet }: { sheet: Sheet }) {
  const meta = getLayout(sheet.layout);
  return (
    <span className="tp-mini" style={{ background: sheet.bgImage ? `url(${sheet.bgImage}) center/cover` : sheet.bgColor }}>
      {sheet.slots.map((sl, i) => {
        const r = meta.rects[i] ?? meta.rects[meta.rects.length - 1];
        return (
          <span
            key={sl.id}
            className="tp-mini-slot"
            style={{
              top: `${r.top}%`, left: `${r.left}%`, width: `${r.width}%`, height: `${r.height}%`,
              transform: r.rotate ? `rotate(${r.rotate}deg)` : undefined, zIndex: r.z ?? 1,
            }}
          >
            {sl.image && (
              <img
                src={sl.image} alt="" draggable={false}
                style={{ filter: slotFilter(sl), objectPosition: `${sl.fx ?? 50}% ${sl.fy ?? 50}%` }}
              />
            )}
          </span>
        );
      })}
    </span>
  );
}

function SlotImage({ slot, alt }: { slot: Slot; alt: string }) {
  const zoom = slot.zoom ?? 1;
  const fx = slot.fx ?? 50;
  const fy = slot.fy ?? 50;
  return (
    <img
      src={slot.image ?? ""}
      alt={alt}
      draggable={false}
      style={{
        filter: slotFilter(slot),
        objectPosition: `${fx}% ${fy}%`,
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: `${fx}% ${fy}%`,
      }}
    />
  );
}

function TextLayerStatic({ el, className }: { el: TextElement; className: string }) {
  return (
    <div
      className={className}
      style={{
        top: `${el.yPct}%`, left: `${el.xPct}%`, width: `${el.wPct}%`, height: `${el.hPct}%`,
        transform: `rotate(${el.rotate}deg)`, color: el.color, fontFamily: el.fontFamily,
        fontWeight: el.bold ? 800 : 500, fontStyle: el.italic ? "italic" : "normal",
        textDecoration: el.underline ? "underline" : "none", textAlign: el.align, background: el.bg,
        fontSize: `${el.fontSize}cqw`,
        letterSpacing: el.spacing ? `${el.spacing}em` : undefined,
        opacity: el.opacity ?? 1,
        textShadow: el.shadow ? "0 2px 10px rgba(0,0,0,0.55)" : undefined,
        WebkitTextStroke: el.stroke ? `${el.stroke}cqw ${el.strokeColor ?? "#000000"}` : undefined,
        paintOrder: el.stroke ? "stroke fill" : undefined,
        justifyContent: el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
      }}
    >
      {el.text}
    </div>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <label className="tp-field">
      <div>
        <span>{label}</span>
        {value && <strong>{value}</strong>}
      </div>
      {children}
    </label>
  );
}

/* ───────────────────────────── Editor ───────────────────────────── */

function TemplateEditorInner() {
  const navigate = useNavigate();

  /**
   * Boot once per mount (the wrapper remounts this on every navigation):
   *  - event flow  → `currentTemplateEditor` exists. It is the NEWER hand-off, so any leftover
   *                   library editor session is stale: clear it and start a fresh album.
   *  - library "edit" session → load THAT album and continue
   *  - library "new" session  → blank album with its own id
   *  - nothing at all         → legacy behaviour
   */
  const boot = useMemo(() => {
    let hasEventCtx = false;
    try { hasEventCtx = !!sessionStorage.getItem(EVENT_CTX_KEY); } catch { /* ignore */ }
    if (hasEventCtx) clearEditorSession();

    const session = hasEventCtx ? null : readEditorSession();
    const existing = session ? getAlbumById(session.albumId) : null;
    if (existing && existing.sheets.length) {
      const c: EditorContext = {
        templateId: existing.templateId,
        templateName: existing.templateName,
        sheetsCount: existing.sheets.length,
        canvasSize: existing.canvasSize,
        photosRequired: 0,
        versionNum: existing.versionNum,
        isLatest: true,
        status: "Draft",
        eventId: existing.eventId,
        serviceName: existing.serviceName,
        eventName: existing.eventName,
      };
      return {
        ctx: c,
        sheets: existing.sheets.map(fromSnapshot),
        albumId: existing.id,
        resumed: true,
        settings: existing.settings ?? null,
      };
    }
    const c = loadContext();
    const albumId = session?.albumId ?? (c.templateId ? `${c.eventId ?? "no-event"}_${c.templateId}_v${c.versionNum}` : newAlbumId());
    return { ctx: c, sheets: buildInitialSheets(c.sheetsCount || 14), albumId, resumed: false, settings: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctx = boot.ctx;
  const albumIdRef = useRef<string>(boot.albumId);
  const [albumName, setAlbumName] = useState<string>(ctx.templateName || "Untitled Album");
  const [savedName, setSavedName] = useState<string>(ctx.templateName || "Untitled Album");

  const [sheets, setSheets] = useState<Sheet[]>(boot.sheets);
  const sheetsRef = useRef<Sheet[]>(sheets);
  const [savedSnap, setSavedSnap] = useState<Sheet[]>(sheets);
  const [activeSheetId, setActiveSheetId] = useState<string>(sheets[0]?.id ?? "");
  const [rightTab, setRightTab] = useState<RightTab>("layout");
  const [zoom, setZoom] = useState(55);
  const [previewMode, setPreviewMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    gap: boot.settings?.gap ?? 6,
    radius: boot.settings?.radius ?? 10,
    showGuides: false, showSafe: false, showBleed: false,
  });

  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [dragSheetId, setDragSheetId] = useState<string | null>(null);
  const [menuSlotId, setMenuSlotId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [repositionId, setRepositionId] = useState<string | null>(null);

  const [undoStack, setUndoStack] = useState<Sheet[][]>([]);
  const [redoStack, setRedoStack] = useState<Sheet[][]>([]);
  const lastCommit = useRef<{ key: string; time: number } | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [versions, setVersions] = useState<VersionEntry[]>([]);

  /* Photo tray, image metadata, palette */
  const [pool, setPool] = useState<PoolPhoto[]>([]);
  const [imgDims, setImgDims] = useState<Record<string, { w: number; h: number }>>({});
  const [palette, setPalette] = useState<string[]>([]);
  const [paletteAll, setPaletteAll] = useState(false);

  /* Overlays */
  const [healthOpen, setHealthOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdIndex, setCmdIndex] = useState(0);
  const [storyOpen, setStoryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [styleClip, setStyleClip] = useState<PageStyle | null>(null);

  /* Text boxes & stickers */
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [snap, setSnap] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragText = useRef<{
    id: string; mode: TextDragMode; startClientX: number; startClientY: number;
    startX: number; startY: number; startW: number; startH: number; rect: DOMRect;
  } | null>(null);
  const repoDrag = useRef<{ id: string; sx: number; sy: number; fx: number; fy: number; w: number; h: number } | null>(null);

  /* Toast */
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  /* Review Album (real page-turning flip-book, cover + spreads)
     reviewIndex is a SPREAD index:
       0     → the single front-cover page (sheets[0]), shown alone on the right.
       1..n  → real two-page spreads built from the remaining sheets:
                 spread i → left = sheets[1 + (i-1)*2], right = sheets[1 + (i-1)*2 + 1]
     Every turn only animates a single "leaf" layered above the settled spread. */
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const flipTimerRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const turnRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const dragMeta = useRef<{ dir: FlipDir; startX: number; width: number; progress: number } | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const slotFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const trayFileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const cmdInputRef = useRef<HTMLInputElement>(null);
  const activeSlotIdForUpload = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];
  const activeIndex = Math.max(0, sheets.findIndex((s) => s.id === activeSheet?.id));
  const layoutMeta = getLayout(activeSheet?.layout ?? "full");
  const selectedText = activeSheet?.textElements.find((t) => t.id === selectedTextId) ?? null;
  const selectedSlot = activeSheet?.slots.find((s) => s.id === selectedSlotId) ?? null;
  const selectedSlotIndex = selectedSlot ? activeSheet.slots.findIndex((s) => s.id === selectedSlot.id) : -1;
  const totalSpreads = sheets.length <= 1 ? 1 : 1 + Math.ceil((sheets.length - 1) / 2);
  const spreadLeft = (i: number): Sheet | undefined => (i === 0 ? undefined : sheets[1 + (i - 1) * 2]);
  const spreadRight = (i: number): Sheet | undefined => (i === 0 ? sheets[0] : sheets[1 + (i - 1) * 2 + 1]);
  const dirty = sheets !== savedSnap || albumName !== savedName;

  const usedUrls = useMemo(() => {
    const set = new Set<string>();
    sheets.forEach((s) => s.slots.forEach((sl) => sl.image && set.add(sl.image)));
    return set;
  }, [sheets]);

  /* Album health: completion, empty slots, low-res photos, duplicates */
  const health = useMemo(() => {
    let total = 0;
    let filled = 0;
    const empty: { sheetId: string; name: string; count: number }[] = [];
    const lowRes: { sheetId: string; name: string; file: string; edge: number }[] = [];
    const seen = new Map<string, number>();
    sheets.forEach((s) => {
      let e = 0;
      s.slots.forEach((sl) => {
        total++;
        if (!sl.image) { e++; return; }
        filled++;
        seen.set(sl.image, (seen.get(sl.image) ?? 0) + 1);
        const d = imgDims[sl.image];
        if (d && Math.max(d.w, d.h) < LOW_RES_EDGE) {
          lowRes.push({ sheetId: s.id, name: s.name, file: sl.fileName ?? "photo", edge: Math.max(d.w, d.h) });
        }
      });
      if (e) empty.push({ sheetId: s.id, name: s.name, count: e });
    });
    let dupes = 0;
    seen.forEach((n) => { if (n > 1) dupes++; });
    return { total, filled, pct: total ? Math.round((filled / total) * 100) : 0, empty, lowRes, dupes };
  }, [sheets, imgDims]);
  const healthIssues = health.empty.length + health.lowRes.length + health.dupes;
  const emptyPages = sheets.filter(
    (s, i) => i > 0 && s.slots.every((sl) => !sl.image) && !s.textElements.length && !s.bgImage
  ).length;

  /* ── Effects ── */
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      if (autoPlayTimerRef.current) window.clearTimeout(autoPlayTimerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (sheets.length && !sheets.some((s) => s.id === activeSheetId)) setActiveSheetId(sheets[0].id);
  }, [sheets, activeSheetId]);

  useEffect(() => {
    setSelectedTextId(null);
    setEditingTextId(null);
    setEmojiPickerOpen(false);
    setSelectedSlotId(null);
    setRepositionId(null);
  }, [activeSheetId]);

  useEffect(() => {
    if (!editingTextId) return;
    const node = document.querySelector(`[data-text-id="${editingTextId}"]`) as HTMLElement | null;
    if (!node) return;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editingTextId]);

  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  // Palette of the first photo on the current page
  const paletteSource = activeSheet?.slots.find((sl) => sl.image)?.image ?? activeSheet?.bgImage ?? null;
  useEffect(() => {
    let alive = true;
    if (!paletteSource) { setPalette([]); return; }
    extractPalette(paletteSource)
      .then((p) => alive && setPalette(p))
      .catch(() => alive && setPalette([]));
    return () => { alive = false; };
  }, [paletteSource]);

  // Fit the page to the viewport on mount and whenever focus mode changes
  const fitZoom = () => {
    const w = wrapRef.current;
    if (!w) return;
    const availW = w.clientWidth - 72;
    const availH = w.clientHeight - 130;
    const byW = availW / BASE_CANVAS_PX;
    const byH = ((availH * CANVAS_W) / CANVAS_H) / BASE_CANVAS_PX;
    setZoom(clamp(Math.floor(Math.min(byW, byH) * 100), 20, 150));
  };
  useEffect(() => {
    const id = window.setTimeout(fitZoom, 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMode]);

  // Ctrl / ⌘ + wheel zooms the canvas
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clamp(z - Math.sign(e.deltaY) * 5, 20, 150));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (cmdOpen) {
      setCmdQuery("");
      setCmdIndex(0);
      window.setTimeout(() => cmdInputRef.current?.focus(), 20);
    }
  }, [cmdOpen]);

  /* ── History (coalesced so drags and sliders create ONE undo step) ── */
  const commitSheets = (updater: (prev: Sheet[]) => Sheet[], coalesceKey?: string) => {
    const prev = sheetsRef.current;
    const next = updater(prev);
    if (next === prev) return;
    const now = Date.now();
    const last = lastCommit.current;
    const coalesce = !!coalesceKey && !!last && last.key === coalesceKey && now - last.time < COALESCE_MS;
    lastCommit.current = coalesceKey ? { key: coalesceKey, time: now } : null;
    sheetsRef.current = next;
    setSheets(next);
    if (!coalesce) setUndoStack((u) => [...u.slice(-49), prev]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    const prev = undoStack[undoStack.length - 1];
    if (!prev) return;
    lastCommit.current = null;
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, sheetsRef.current]);
    sheetsRef.current = prev;
    setSheets(prev);
  };

  const handleRedo = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    lastCommit.current = null;
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, sheetsRef.current]);
    sheetsRef.current = next;
    setSheets(next);
  };

  /* ── Toast ── */
  const showToast = (message: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2400);
  };

  /* ── Sheet operations ── */
  const addSheet = () => {
    const newSheet = makeSheet(sheetsRef.current.length + 1, "full");
    const ref = sheetsRef.current[sheetsRef.current.length - 1];
    if (ref && sheetsRef.current.length > 1) newSheet.bgColor = ref.bgColor;
    commitSheets((prev) => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  const duplicateSheet = (id: string) => {
    const source = sheetsRef.current.find((s) => s.id === id);
    if (!source) return;
    const copy: Sheet = {
      ...cloneSheets([source])[0],
      id: `sheet_${uid()}`,
      name: `${source.name} Copy`,
      slots: source.slots.map((sl) => ({ ...sl, id: `slot_${uid()}` })),
      textElements: source.textElements.map((t) => ({ ...t, id: `text_${uid()}` })),
    };
    commitSheets((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setActiveSheetId(copy.id);
  };

  const deleteSheet = (id: string) => {
    const cur = sheetsRef.current;
    if (cur.length <= 1) return;
    const idx = cur.findIndex((s) => s.id === id);
    const remaining = cur.filter((s) => s.id !== id);
    if (id === activeSheetId) setActiveSheetId(remaining[Math.min(idx, remaining.length - 1)].id);
    commitSheets(() => remaining);
  };

  const removeEmptyPages = () => {
    const cur = sheetsRef.current;
    const keep = cur.filter(
      (s, i) => i === 0 || s.slots.some((sl) => sl.image) || s.textElements.length > 0 || !!s.bgImage
    );
    if (keep.length === cur.length) {
      showToast("No empty pages to remove");
      return;
    }
    commitSheets(() => keep);
    showToast(`Removed ${cur.length - keep.length} empty page${cur.length - keep.length > 1 ? "s" : ""}`);
  };

  const goSheet = (delta: number) => {
    const cur = sheetsRef.current;
    const idx = cur.findIndex((s) => s.id === activeSheetId);
    const next = cur[clamp(idx + delta, 0, cur.length - 1)];
    if (next) setActiveSheetId(next.id);
  };

  const commitRename = () => {
    if (renamingId) {
      const name = renameDraft.trim() || "Untitled Page";
      commitSheets((prev) => prev.map((s) => (s.id === renamingId ? { ...s, name } : s)));
    }
    setRenamingId(null);
  };

  const handleSheetDrop = (targetId: string) => {
    if (!dragSheetId || dragSheetId === targetId) {
      setDragSheetId(null);
      return;
    }
    commitSheets((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((s) => s.id === dragSheetId);
      const toIdx = next.findIndex((s) => s.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragSheetId(null);
  };

  /* ── Layout ── */
  const applyLayout = (layoutId: LayoutId, compact = false) => {
    if (!activeSheet) return;
    commitSheets((prev) => prev.map((s) => (s.id !== activeSheet.id ? s : reflowSheet(s, layoutId, compact))));
    setSelectedSlotId(null);
    setRepositionId(null);
  };

  /** Picks the next layout that fits the number of photos already on this page. */
  const magicLayout = () => {
    if (!activeSheet) return;
    const filled = activeSheet.slots.filter((s) => s.image).length;
    const target = filled || activeSheet.slots.length;
    let candidates = LAYOUTS.filter((l) => l.rects.length === target && !l.captions);
    if (!candidates.length) {
      const bigger = LAYOUTS.filter((l) => l.rects.length >= target && !l.captions);
      const min = Math.min(...bigger.map((l) => l.rects.length));
      candidates = bigger.filter((l) => l.rects.length === min);
    }
    if (!candidates.length) return;
    const curIdx = candidates.findIndex((l) => l.id === activeSheet.layout);
    const next = candidates[(curIdx + 1) % candidates.length];
    applyLayout(next.id);
    showToast(`Layout: ${next.label}`);
  };

  /* Orientation-aware layout choice */
  const orientOf = (url: string | null | undefined): "p" | "l" | "s" => {
    const d = url ? imgDims[url] : undefined;
    if (!d) return "l";
    return d.h > d.w * 1.08 ? "p" : d.w > d.h * 1.08 ? "l" : "s";
  };

  const pickLayout = (urls: (string | null)[], variety = 0): LayoutId => {
    const n = urls.length;
    const o = urls.map(orientOf);
    const ports = o.filter((x) => x === "p").length;
    if (n === 1) {
      const d = urls[0] ? imgDims[urls[0] as string] : undefined;
      return d && d.w / d.h > 1.9 ? "panoramic" : "full";
    }
    if (n === 2) return ports === 2 ? "split2h" : ports === 0 ? (variety % 2 ? "split2h" : "split2v") : "minimal";
    if (n === 3) return "three";
    if (n === 4) return ports === 0 ? "grid4" : ports === 4 ? "polaroid" : variety % 2 ? "asymmetrical" : "grid4";
    if (n === 5) return o[0] === "p" ? "hero" : "collage";
    if (n === 6) return "grid6";
    const opts = LAYOUT_BY_COUNT[n] ?? ["full"];
    return opts[variety % opts.length];
  };

  const smartLayoutThisPage = () => {
    if (!activeSheet) return;
    const imgs = activeSheet.slots.filter((s) => s.image).map((s) => s.image);
    if (!imgs.length) {
      showToast("Add photos to this page first");
      return;
    }
    const id = pickLayout(imgs, activeIndex);
    applyLayout(id, true);
    showToast(`Smart layout: ${getLayout(id).label}`);
  };

  const remixAlbum = () => {
    commitSheets((prev) =>
      prev.map((s, i) => {
        if (i === 0) return s;
        const c = LAYOUTS.filter((l) => l.rects.length === s.slots.length && !l.captions && l.id !== s.layout);
        if (!c.length) return s;
        return reflowSheet(s, c[Math.floor(Math.random() * c.length)].id);
      })
    );
    showToast("Album remixed — Ctrl Z to undo");
  };

  /* ── Slots ── */
  const patchSlot = (slotId: string, patch: Partial<Slot> | ((sl: Slot) => Partial<Slot>), key?: string) => {
    if (!activeSheet) return;
    commitSheets(
      (prev) =>
        prev.map((s) =>
          s.id !== activeSheet.id
            ? s
            : {
                ...s,
                slots: s.slots.map((sl) =>
                  sl.id === slotId ? { ...sl, ...(typeof patch === "function" ? patch(sl) : patch) } : sl
                ),
              }
        ),
      key ? `slot_${slotId}_${key}` : undefined
    );
  };

  const trackDims = (url: string) => {
    measureImage(url)
      .then((d) => setImgDims((m) => ({ ...m, [url]: d })))
      .catch(() => {});
  };

  // When continuing an existing album, measure its photos so health / smart layout work immediately
  useEffect(() => {
    if (!boot.resumed) return;
    sheetsRef.current.forEach((s) => s.slots.forEach((sl) => sl.image && trackDims(sl.image)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSlotImage = (sheetId: string, slotId: string, url: string, name?: string) => {
    trackDims(url);
    commitSheets((prev) =>
      prev.map((s) =>
        s.id !== sheetId
          ? s
          : {
              ...s,
              slots: s.slots.map((sl) =>
                sl.id === slotId ? { ...sl, image: url, fileName: name, fx: 50, fy: 50, zoom: 1 } : sl
              ),
            }
      )
    );
  };

  const applyImageToSlot = (slotId: string, file: File) => {
    if (!activeSheet) return;
    setSlotImage(activeSheet.id, slotId, URL.createObjectURL(file), file.name);
  };

  const removeSlotImage = (slotId: string) => {
    patchSlot(slotId, { image: null, fileName: undefined, fx: 50, fy: 50, zoom: 1 });
    setRepositionId((cur) => (cur === slotId ? null : cur));
  };

  const openSlotUpload = (slotId: string) => {
    if (previewMode) return;
    activeSlotIdForUpload.current = slotId;
    slotFileRef.current?.click();
  };

  const handleSlotFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = activeSlotIdForUpload.current;
    if (file && slotId) applyImageToSlot(slotId, file);
    e.target.value = "";
  };

  const rotateSlot = (slotId: string) => patchSlot(slotId, (sl) => ({ rotateExtra: ((sl.rotateExtra ?? 0) + 90) % 360 }));
  const flipSlot = (slotId: string) => patchSlot(slotId, (sl) => ({ flip: !sl.flip }));
  const updateSlotCaption = (slotId: string, caption: string) => patchSlot(slotId, { caption });

  const bringToFront = (slotId: string) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) => (s.id !== activeSheet.id ? s : { ...s, slots: s.slots.map((sl) => ({ ...sl, front: sl.id === slotId })) }))
    );
  };

  const setAllFrames = (frame: FrameId) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) => (s.id !== activeSheet.id ? s : { ...s, slots: s.slots.map((sl) => ({ ...sl, frame })) }))
    );
  };

  /* Smart focus (saliency-based auto crop) */
  const smartFocusSlot = async (slotId: string) => {
    const sl = activeSheet?.slots.find((x) => x.id === slotId);
    if (!sl?.image) return;
    try {
      const f = await detectFocus(sl.image);
      patchSlot(slotId, { fx: f.fx, fy: f.fy });
      showToast("Focus set automatically");
    } catch {
      showToast("Could not analyse that photo");
    }
  };

  const smartFocusAll = async () => {
    const urls = [
      ...new Set(
        sheetsRef.current.flatMap((s) => s.slots.map((sl) => sl.image)).filter((u): u is string => !!u)
      ),
    ];
    if (!urls.length) {
      showToast("No photos to analyse");
      return;
    }
    showToast("Analysing photos…");
    const map = new Map<string, { fx: number; fy: number }>();
    await Promise.all(
      urls.map(async (u) => {
        try {
          map.set(u, await detectFocus(u));
        } catch {
          /* skip unreadable photo */
        }
      })
    );
    commitSheets((prev) =>
      prev.map((s) => ({
        ...s,
        slots: s.slots.map((sl) => {
          const f = sl.image ? map.get(sl.image) : undefined;
          return f ? { ...sl, fx: f.fx, fy: f.fy } : sl;
        }),
      }))
    );
    showToast(`Smart focus applied to ${map.size} photo${map.size === 1 ? "" : "s"}`);
  };

  const handleSlotDragStart = (slotId: string) => setDragSlotId(slotId);

  const handleSlotDrop = (targetSlotId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlotId(null);
    if (!activeSheet) return;

    const photoId = e.dataTransfer.getData(PHOTO_DND);
    if (photoId) {
      const ph = pool.find((p) => p.id === photoId);
      if (ph) setSlotImage(activeSheet.id, targetSlotId, ph.url, ph.name);
      setDragSlotId(null);
      return;
    }

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      applyImageToSlot(targetSlotId, droppedFile);
      setDragSlotId(null);
      return;
    }

    if (!dragSlotId || dragSlotId === targetSlotId) return;
    commitSheets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSheet.id) return s;
        const slots = [...s.slots];
        const fromIdx = slots.findIndex((sl) => sl.id === dragSlotId);
        const toIdx = slots.findIndex((sl) => sl.id === targetSlotId);
        if (fromIdx === -1 || toIdx === -1) return s;
        const [moved] = slots.splice(fromIdx, 1);
        slots.splice(toIdx, 0, moved);
        return { ...s, slots };
      })
    );
    setDragSlotId(null);
  };

  /* Focal-point repositioning: drag inside a photo */
  const onRepoMove = (e: PointerEvent) => {
    const d = repoDrag.current;
    if (!d) return;
    patchSlot(
      d.id,
      {
        fx: clamp(d.fx - ((e.clientX - d.sx) / d.w) * 100, 0, 100),
        fy: clamp(d.fy - ((e.clientY - d.sy) / d.h) * 100, 0, 100),
      },
      "focus"
    );
  };
  const onRepoUp = () => {
    repoDrag.current = null;
    window.removeEventListener("pointermove", onRepoMove);
    window.removeEventListener("pointerup", onRepoUp);
  };
  const onRepoDown = (e: React.PointerEvent, slot: Slot) => {
    if (repositionId !== slot.id || previewMode || !slot.image) return;
    e.preventDefault();
    e.stopPropagation();
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    repoDrag.current = { id: slot.id, sx: e.clientX, sy: e.clientY, fx: slot.fx ?? 50, fy: slot.fy ?? 50, w: box.width, h: box.height };
    window.addEventListener("pointermove", onRepoMove);
    window.addEventListener("pointerup", onRepoUp);
  };

  /* ── Photo tray ── */
  const addToTray = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const added: PoolPhoto[] = await Promise.all(
      list.map(async (f) => {
        const url = URL.createObjectURL(f);
        const d = await measureImage(url).catch(() => ({ w: 0, h: 0 }));
        return { id: `photo_${uid()}`, url, name: f.name, w: d.w, h: d.h };
      })
    );
    setPool((p) => [...p, ...added]);
    setImgDims((m) => {
      const next = { ...m };
      added.forEach((a) => { if (a.w) next[a.url] = { w: a.w, h: a.h }; });
      return next;
    });
    showToast(`${added.length} photo${added.length > 1 ? "s" : ""} added to tray`);
  };

  const placePhoto = (photo: PoolPhoto) => {
    if (!activeSheet) return;
    const target = selectedSlot ?? activeSheet.slots.find((s) => !s.image);
    if (!target) {
      showToast("No empty slot here — select a slot to replace");
      return;
    }
    setSlotImage(activeSheet.id, target.id, photo.url, photo.name);
  };

  const dropPhotoOnSheet = (photoId: string, sheetId: string) => {
    const ph = pool.find((p) => p.id === photoId);
    const sheet = sheetsRef.current.find((s) => s.id === sheetId);
    const slot = sheet?.slots.find((s) => !s.image);
    if (!ph || !sheet) return;
    if (!slot) {
      showToast(`${sheet.name} has no empty slot`);
      return;
    }
    setSlotImage(sheet.id, slot.id, ph.url, ph.name);
  };

  const removeFromTray = (id: string) => setPool((p) => p.filter((x) => x.id !== id));

  const autoFillEmpty = () => {
    const unused = pool.filter((p) => !usedUrls.has(p.url));
    if (!unused.length) {
      showToast("Every tray photo is already on a page");
      return;
    }
    let i = 0;
    commitSheets((prev) =>
      prev.map((s) => ({
        ...s,
        slots: s.slots.map((sl) => {
          if (sl.image || i >= unused.length) return sl;
          const ph = unused[i++];
          trackDims(ph.url);
          return { ...sl, image: ph.url, fileName: ph.name, fx: 50, fy: 50, zoom: 1 };
        }),
      }))
    );
    showToast(`Filled ${i} empty slot${i === 1 ? "" : "s"}`);
  };

  const autoBuildPages = () => {
    const unused = pool.filter((p) => !usedUrls.has(p.url));
    if (!unused.length) {
      showToast("Add photos to the tray first");
      return;
    }
    const base = sheetsRef.current;
    const bg = base.length > 1 ? base[base.length - 1].bgColor : "#ffffff";
    const created: Sheet[] = [];
    let i = 0;
    let p = 0;
    while (i < unused.length) {
      const n = Math.min(CHUNK_PLAN[p % CHUNK_PLAN.length], unused.length - i);
      const chunk = unused.slice(i, i + n);
      const layout = pickLayout(chunk.map((ph) => ph.url), p);
      const sheet = makeSheet(base.length + created.length + 1, layout);
      sheet.bgColor = bg;
      sheet.slots = chunk.map((ph) => ({ ...makeSlot(), image: ph.url, fileName: ph.name }));
      created.push(sheet);
      i += n;
      p++;
    }
    commitSheets((prev) => [...prev, ...created]);
    setActiveSheetId(created[0].id);
    showToast(`Built ${created.length} page${created.length > 1 ? "s" : ""} from ${unused.length} photos`);
  };

  /* ── Background / themes ── */
  const setSheetBg = (patch: Partial<Pick<Sheet, "bgColor" | "bgImage">>) => {
    if (!activeSheet) return;
    commitSheets((prev) => prev.map((s) => (s.id === activeSheet.id ? { ...s, ...patch } : s)));
  };

  const handleBgImageChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSheetBg({ bgImage: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const usePaletteColor = (hex: string) => {
    if (paletteAll) {
      commitSheets((prev) => prev.map((s, i) => (i === 0 ? s : { ...s, bgColor: hex, bgImage: null })));
      showToast("Applied to every inner page");
    } else {
      setSheetBg({ bgColor: hex, bgImage: null });
    }
  };

  const applyTheme = (t: Theme) => {
    commitSheets((prev) =>
      prev.map((s, i) => ({
        ...s,
        bgColor: i === 0 ? t.cover : t.page,
        bgImage: null,
        gap: undefined,
        radius: undefined,
        slots: s.slots.map((sl) => ({ ...sl, frame: t.frame })),
        textElements: s.textElements.map((el) =>
          el.isSticker ? el : { ...el, color: i === 0 ? t.coverText : t.text, fontFamily: t.font }
        ),
      }))
    );
    setSettings((st) => ({ ...st, gap: t.gap, radius: t.radius }));
    showToast(`Theme applied: ${t.label}`);
  };

  /** Generates a full album theme from the dominant colours of this page's photo. */
  const themeFromPhoto = () => {
    if (!palette.length) {
      showToast("Put a photo on this page first");
      return;
    }
    const sorted = [...palette].sort((a, b) => lumOf(a) - lumOf(b));
    const darkest = sorted[0];
    const lightest = sorted[sorted.length - 1];
    applyTheme({
      id: "photo", label: "From photo",
      cover: mixHex(darkest, "#000000", 0.45),
      page: mixHex(lightest, "#ffffff", 0.84),
      text: mixHex(darkest, "#000000", 0.6),
      coverText: mixHex(lightest, "#ffffff", 0.7),
      font: FONT_OPTIONS[1], frame: "white", gap: 10, radius: 4,
    });
  };

  const setPageSpacing = (patch: Partial<Pick<Sheet, "gap" | "radius">>) => {
    if (!activeSheet) return;
    commitSheets((prev) => prev.map((s) => (s.id === activeSheet.id ? { ...s, ...patch } : s)), "pagespacing");
  };

  const copyPageStyle = () => {
    if (!activeSheet) return;
    setStyleClip({
      bgColor: activeSheet.bgColor, bgImage: activeSheet.bgImage,
      frame: activeSheet.slots[0]?.frame ?? "none", gap: activeSheet.gap, radius: activeSheet.radius,
    });
    showToast("Page style copied");
  };

  const pastePageStyle = (all: boolean) => {
    if (!styleClip || !activeSheet) return;
    commitSheets((prev) =>
      prev.map((s, i) => {
        if (all ? i === 0 : s.id !== activeSheet.id) return s;
        return {
          ...s, bgColor: styleClip.bgColor, bgImage: styleClip.bgImage, gap: styleClip.gap, radius: styleClip.radius,
          slots: s.slots.map((sl) => ({ ...sl, frame: styleClip.frame })),
        };
      })
    );
    showToast(all ? "Style pasted to every inner page" : "Style pasted");
  };

  const updateSheetText = (field: "title" | "subtitle", value: string) => {
    if (!activeSheet) return;
    commitSheets((prev) => prev.map((s) => (s.id === activeSheet.id ? { ...s, [field]: value } : s)));
  };

  /* ── Text boxes & stickers ── */
  const addTextElement = (preset?: TextPreset) => {
    if (!activeSheet) return;
    const el = makeTextElement(preset);
    if (activeIndex === 0) el.color = "#f4dab1";
    commitSheets((prev) => prev.map((s) => (s.id !== activeSheet.id ? s : { ...s, textElements: [...s.textElements, el] })));
    setSelectedTextId(el.id);
    setEditingTextId(el.id);
    setRightTab("elements");
  };

  /** Adds a title, subtitle and date to the cover page in one go. */
  const designCover = () => {
    const first = sheetsRef.current[0];
    if (!first) return;
    const title = makeTextElement("title");
    title.text = (ctx.eventName && ctx.eventName !== "Untitled Event" ? ctx.eventName : albumName).toUpperCase();
    title.color = "#f4dab1"; title.xPct = 10; title.wPct = 80; title.yPct = 34; title.hPct = 18; title.fontSize = 7;
    const sub = makeTextElement("signature");
    sub.text = "A story in photographs";
    sub.color = "#f4dab1"; sub.xPct = 20; sub.wPct = 60; sub.yPct = 54; sub.hPct = 14; sub.fontSize = 6.5;
    const date = makeTextElement("date");
    date.text = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long" });
    date.color = "#f4dab1"; date.align = "center"; date.italic = false; date.spacing = 0.2;
    date.xPct = 30; date.wPct = 40; date.yPct = 86; date.fontSize = 2.6;
    commitSheets((prev) => prev.map((s, i) => (i === 0 ? { ...s, textElements: [...s.textElements, title, sub, date] } : s)));
    setActiveSheetId(first.id);
    setRightTab("elements");
    showToast("Cover designed");
  };

  const addEmojiSticker = (emoji: string) => {
    if (!activeSheet) return;
    const el: TextElement = {
      id: `text_${uid()}`, text: emoji, xPct: 38, yPct: 38, wPct: 22, hPct: 22, rotate: 0,
      color: "#ffffff", fontFamily: FONT_OPTIONS[0], fontSize: 15, bold: false, italic: false,
      underline: false, align: "center", bg: "transparent", isSticker: true,
    };
    commitSheets((prev) => prev.map((s) => (s.id !== activeSheet.id ? s : { ...s, textElements: [...s.textElements, el] })));
    setSelectedTextId(el.id);
  };

  const updateTextField = (id: string, patch: Partial<TextElement>, key?: string) => {
    if (!activeSheet) return;
    commitSheets(
      (prev) =>
        prev.map((s) =>
          s.id !== activeSheet.id ? s : { ...s, textElements: s.textElements.map((t) => (t.id === id ? { ...t, ...patch } : t)) }
        ),
      key ? `text_${id}_${key}` : undefined
    );
  };

  const commitTextContent = (id: string, text: string) => updateTextField(id, { text });

  const deleteTextElement = (id: string) => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) => (s.id !== activeSheet.id ? s : { ...s, textElements: s.textElements.filter((t) => t.id !== id) }))
    );
    setSelectedTextId((cur) => (cur === id ? null : cur));
    setEditingTextId((cur) => (cur === id ? null : cur));
  };

  const duplicateTextElement = (id: string) => {
    if (!activeSheet) return;
    const src = activeSheet.textElements.find((t) => t.id === id);
    if (!src) return;
    const copy: TextElement = { ...src, id: `text_${uid()}`, xPct: clamp(src.xPct + 4, 0, 90), yPct: clamp(src.yPct + 4, 0, 90) };
    commitSheets((prev) => prev.map((s) => (s.id !== activeSheet.id ? s : { ...s, textElements: [...s.textElements, copy] })));
    setSelectedTextId(copy.id);
  };

  const reorderTextElement = (id: string, dir: "front" | "back") => {
    if (!activeSheet) return;
    commitSheets((prev) =>
      prev.map((s) => {
        if (s.id !== activeSheet.id) return s;
        const list = [...s.textElements];
        const idx = list.findIndex((t) => t.id === id);
        if (idx === -1) return s;
        const [item] = list.splice(idx, 1);
        if (dir === "front") list.push(item);
        else list.unshift(item);
        return { ...s, textElements: list };
      })
    );
  };

  const nudgeText = (id: string, dx: number, dy: number) => {
    const el = activeSheet?.textElements.find((t) => t.id === id);
    if (!el) return;
    updateTextField(id, { xPct: clamp(el.xPct + dx, -10, 96), yPct: clamp(el.yPct + dy, -10, 96) }, "nudge");
  };

  const insertEmojiIntoSelected = (emoji: string) => {
    if (!selectedText) return;
    updateTextField(selectedText.id, { text: `${selectedText.text}${emoji}` });
    setEmojiPickerOpen(false);
  };

  const onTextPointerDown = (e: React.PointerEvent, id: string, mode: TextDragMode) => {
    if (previewMode) return;
    if (mode === "move" && editingTextId === id) return; // let text selection happen normally
    e.stopPropagation();
    e.preventDefault();
    const el = activeSheet?.textElements.find((t) => t.id === id);
    if (!el || !canvasRef.current) return;
    setSelectedTextId(id);
    const rect = canvasRef.current.getBoundingClientRect();
    dragText.current = {
      id, mode, startClientX: e.clientX, startClientY: e.clientY,
      startX: el.xPct, startY: el.yPct, startW: el.wPct, startH: el.hPct, rect,
    };
    window.addEventListener("pointermove", onTextPointerMove);
    window.addEventListener("pointerup", onTextPointerUp);
  };

  const onTextPointerMove = (e: PointerEvent) => {
    const d = dragText.current;
    if (!d) return;
    const dxPct = ((e.clientX - d.startClientX) / d.rect.width) * 100;
    const dyPct = ((e.clientY - d.startClientY) / d.rect.height) * 100;
    const key = `drag_${d.mode}`;
    if (d.mode === "move") {
      let x = d.startX + dxPct;
      let y = d.startY + dyPct;
      let sv = false;
      let sh = false;
      const SNAP = 1.2;
      // snap the box centre to the page centre, and edges to the 5% safe margin
      if (Math.abs(x + d.startW / 2 - 50) < SNAP) { x = 50 - d.startW / 2; sv = true; }
      else if (Math.abs(x - 5) < SNAP) x = 5;
      else if (Math.abs(x + d.startW - 95) < SNAP) x = 95 - d.startW;
      if (Math.abs(y + d.startH / 2 - 50) < SNAP) { y = 50 - d.startH / 2; sh = true; }
      else if (Math.abs(y - 5) < SNAP) y = 5;
      else if (Math.abs(y + d.startH - 95) < SNAP) y = 95 - d.startH;
      setSnap((cur) => (cur.v === sv && cur.h === sh ? cur : { v: sv, h: sh }));
      updateTextField(d.id, { xPct: clamp(x, -10, 96), yPct: clamp(y, -10, 96) }, key);
    } else if (d.mode === "resize") {
      updateTextField(d.id, { wPct: clamp(d.startW + dxPct, 6, 100), hPct: clamp(d.startH + dyPct, 4, 100) }, key);
    } else if (d.mode === "rotate") {
      const cx = d.rect.left + d.rect.width * ((d.startX + d.startW / 2) / 100);
      const cy = d.rect.top + d.rect.height * ((d.startY + d.startH / 2) / 100);
      const angle = Math.round(Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90);
      const rem = ((angle % 15) + 15) % 15;
      const snapped = rem <= 3 || rem >= 12 ? Math.round(angle / 15) * 15 : angle; // magnetic 15° steps
      updateTextField(d.id, { rotate: snapped }, key);
    }
  };

  const onTextPointerUp = () => {
    dragText.current = null;
    setSnap({ v: false, h: false });
    window.removeEventListener("pointermove", onTextPointerMove);
    window.removeEventListener("pointerup", onTextPointerUp);
  };

  /* ── Save / Share / Export / Versions ── */

  /**
   * Saves the album into the library under a STABLE id, so:
   *  - first save of a new album creates the library entry
   *  - every later save (here, or after pressing Edit in the library) overwrites the same entry
   */
  const saveAlbum = async (goLibrary: boolean) => {
    if (saving) return;
    setSaving(true);
    const current = sheetsRef.current;
    const finalName = albumName.trim() || "Untitled Album";
    try {
      const librarySheets = await buildLibrarySheets(current);
      const cover = librarySheets[0];
      const firstWithPhoto = librarySheets.find((s) => s.slots.some((sl) => sl.image));
      const coverImage =
        cover?.slots.find((sl) => sl.image)?.image ??
        cover?.bgImage ??
        firstWithPhoto?.slots.find((sl) => sl.image)?.image ??
        null;

      const entry: SavedAlbumEntry = {
        id: albumIdRef.current,
        templateId: ctx.templateId,
        templateName: finalName,
        serviceName: ctx.serviceName || "Album",
        eventId: ctx.eventId ?? null,
        eventName: ctx.eventName || "Untitled Event",
        versionNum: ctx.versionNum,
        canvasSize: ctx.canvasSize,
        sheetCount: librarySheets.length,
        coverImage,
        savedAt: new Date().toISOString(),
        sheets: librarySheets,
        settings: { gap: settings.gap, radius: settings.radius },
      };

      const ok = upsertSavedAlbum(entry);
      if (!ok) {
        showToast("Storage is full — export a backup and remove old albums");
        return;
      }

      try {
        sessionStorage.setItem(
          `albumTemplate_${ctx.templateId}_v${ctx.versionNum}`,
          JSON.stringify({ ...ctx, sheets: librarySheets })
        );
      } catch {
        /* session copy is optional */
      }

      setAlbumName(finalName);
      setSavedName(finalName);
      setVersions((v) => [
        ...v,
        {
          id: uid(),
          label: `Save ${v.length + 1}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sheetCount: current.length,
          snapshot: cloneSheets(current),
        },
      ]);
      setSavedSnap(current);
      setSaved(true);
      setMenuSlotId(null);
      window.setTimeout(() => setSaved(false), 1800);

      if (goLibrary) {
        navigate("/albums/library");
      } else {
        setPreviewMode(true);
        showToast("✓ Saved to Album Library");
      }
    } catch (e) {
      console.warn("TemplateEditorPage: could not save album", e);
      showToast("Could not save album");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => { void saveAlbum(false); };
  const handleSaveAndOpenLibrary = () => { void saveAlbum(true); };

  const restoreVersion = (entry: VersionEntry) => {
    commitSheets(() => cloneSheets(entry.snapshot));
    setActiveSheetId((prev) => (entry.snapshot.some((s) => s.id === prev) ? prev : entry.snapshot[0]?.id ?? prev));
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/events/create/album/template-editor?template=${ctx.templateId}&v=${ctx.versionNum}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Share link copied");
    } catch {
      alert(link);
    }
  };

  const exportAlbumFile = async () => {
    showToast("Preparing export…");
    const librarySheets = await buildLibrarySheets(sheetsRef.current);
    const blob = new Blob(
      [JSON.stringify({
        app: "axs-album", version: 2, templateName: albumName, canvasSize: ctx.canvasSize,
        exportedAt: new Date().toISOString(), sheets: librarySheets,
      })],
      { type: "application/json" }
    );
    downloadBlob(blob, `${albumName.replace(/\s+/g, "_")}_v${ctx.versionNum}.axsalbum.json`);
    showToast("✓ Album exported");
  };

  /** Renders the current page to a high-resolution PNG (frames simplified). */
  const exportPagePng = async () => {
    if (!activeSheet) return;
    showToast("Rendering PNG…");
    try {
      const sheet = activeSheet;
      const meta = getLayout(sheet.layout);
      const W = 2000;
      const H = Math.round((W * CANVAS_H) / CANVAS_W);
      const k = W / BASE_CANVAS_PX;
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const g = cv.getContext("2d");
      if (!g) throw new Error("no ctx");

      g.fillStyle = sheet.bgColor;
      g.fillRect(0, 0, W, H);
      if (sheet.bgImage) {
        try { drawCover(g, await loadImage(sheet.bgImage), 0, 0, W, H, 50, 50, 1); } catch { /* ignore */ }
      }

      const gap = (sheet.gap ?? settings.gap) * k;
      const radius = (sheet.radius ?? settings.radius) * k;
      const ordered = sheet.slots
        .map((sl, i) => ({ sl, i }))
        .sort((a, b) => (a.sl.front ? 50 : meta.rects[a.i]?.z ?? 1) - (b.sl.front ? 50 : meta.rects[b.i]?.z ?? 1));

      for (const { sl, i } of ordered) {
        if (!sl.image) continue;
        const r = meta.rects[i] ?? meta.rects[meta.rects.length - 1];
        const x = (r.left / 100) * W + gap;
        const y = (r.top / 100) * H + gap;
        const w = (r.width / 100) * W - gap * 2;
        const h = (r.height / 100) * H - gap * 2;
        const rot = (((r.rotate ?? 0) + (sl.rotateExtra ?? 0) + (sl.tilt ?? 0)) * Math.PI) / 180;
        const rr = sl.frame === "circle" ? Math.min(w, h) / 2 : meta.style === "polaroid" ? 2 * k : radius;
        const img = await loadImage(sl.image);
        g.save();
        g.translate(x + w / 2, y + h / 2);
        g.rotate(rot);
        g.scale((sl.flip ? -1 : 1) * (sl.scale ?? 1), sl.scale ?? 1);
        g.translate(-w / 2, -h / 2);
        g.beginPath();
        roundedRectPath(g, 0, 0, w, h, rr);
        g.shadowColor = "rgba(0,0,0,0.35)";
        g.shadowBlur = 22 * k;
        g.shadowOffsetY = 8 * k;
        g.fillStyle = "#dddddd";
        g.fill();
        g.shadowColor = "transparent";
        g.save();
        g.clip();
        try { g.filter = slotFilter(sl); } catch { /* filter unsupported */ }
        drawCover(g, img, 0, 0, w, h, sl.fx ?? 50, sl.fy ?? 50, sl.zoom ?? 1);
        try { g.filter = "none"; } catch { /* ignore */ }
        if (sl.vignette) {
          const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(0,0,0,0.55)");
          g.fillStyle = grad;
          g.fillRect(0, 0, w, h);
        }
        g.restore();
        if (sl.frame === "white" || sl.frame === "gold") {
          g.beginPath();
          roundedRectPath(g, 0, 0, w, h, rr);
          g.lineWidth = (sl.frame === "white" ? 12 : 10) * k;
          g.strokeStyle = sl.frame === "white" ? "#ffffff" : "#d9b25f";
          g.save();
          g.clip();
          g.stroke();
          g.restore();
        }
        g.restore();
      }

      for (const el of sheet.textElements) {
        const bw = (el.wPct / 100) * W;
        const bh = (el.hPct / 100) * H;
        const bx = (el.xPct / 100) * W;
        const by = (el.yPct / 100) * H;
        const px = (el.fontSize / 100) * W;
        g.save();
        g.translate(bx + bw / 2, by + bh / 2);
        g.rotate((el.rotate * Math.PI) / 180);
        g.globalAlpha = el.opacity ?? 1;
        if (el.bg && el.bg !== "transparent") {
          g.fillStyle = el.bg;
          g.fillRect(-bw / 2, -bh / 2, bw, bh);
        }
        g.font = `${el.italic ? "italic " : ""}${el.bold ? 800 : 500} ${px}px ${el.fontFamily}`;
        (g as any).letterSpacing = `${(el.spacing ?? 0) * px}px`;
        g.fillStyle = el.color;
        g.textBaseline = "middle";
        g.textAlign = el.align;
        const pad = 8 * k;
        const tx = el.align === "left" ? -bw / 2 + pad : el.align === "right" ? bw / 2 - pad : 0;
        const maxW = bw - pad * 2;
        const lines: string[] = [];
        el.text.split("\n").forEach((par) => {
          let line = "";
          par.split(" ").forEach((word) => {
            const test = line ? `${line} ${word}` : word;
            if (g.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
          });
          lines.push(line);
        });
        const lh = px * 1.2;
        const startY = (-(lines.length - 1) * lh) / 2;
        if (el.shadow) {
          g.shadowColor = "rgba(0,0,0,0.55)";
          g.shadowBlur = 10 * k;
          g.shadowOffsetY = 2 * k;
        }
        lines.forEach((ln, li) => {
          const yy = startY + li * lh;
          if (el.stroke) {
            g.lineWidth = (el.stroke / 100) * W;
            g.strokeStyle = el.strokeColor ?? "#000000";
            g.strokeText(ln, tx, yy);
          }
          g.fillText(ln, tx, yy);
        });
        g.restore();
      }

      cv.toBlob((b) => {
        if (!b) { showToast("Could not render page"); return; }
        downloadBlob(b, `${albumName.replace(/\s+/g, "_")}_${sheet.name.replace(/\s+/g, "_")}.png`);
        showToast("✓ Page exported as PNG");
      }, "image/png");
    } catch (e) {
      console.warn("TemplateEditorPage: PNG export failed", e);
      showToast("Could not render page");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const list = Array.isArray(json) ? json : json.sheets;
      if (!Array.isArray(list) || !list.length) throw new Error("empty");
      const next: Sheet[] = list
        .filter((s: any) => s && layoutMap.has(s.layout))
        .map((s: any) => ({
          id: `sheet_${uid()}`,
          name: s.name ?? "Page",
          layout: s.layout as LayoutId,
          bgColor: s.bgColor ?? "#ffffff",
          bgImage: s.bgImage ?? null,
          title: s.title,
          subtitle: s.subtitle,
          gap: s.gap,
          radius: s.radius,
          textElements: (s.textElements ?? []).map((t: TextElement) => ({ ...t, id: `text_${uid()}` })),
          slots: (s.slots ?? []).map((sl: Slot) => ({ ...sl, id: `slot_${uid()}` })),
        }));
      if (!next.length) throw new Error("no valid pages");
      commitSheets(() => next);
      setActiveSheetId(next[0].id);
      next.forEach((s) => s.slots.forEach((sl) => sl.image && trackDims(sl.image)));
      showToast(`Imported ${next.length} pages`);
    } catch {
      showToast("Could not read that album file");
    }
  };

  /* ── Comments ── */
  const postComment = () => {
    if (!commentDraft.trim()) return;
    setComments((c) => [
      ...c,
      { id: uid(), text: commentDraft.trim(), author: "You", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    setCommentDraft("");
  };
  const deleteComment = (id: string) => setComments((c) => c.filter((x) => x.id !== id));

  /* ── Command palette ── */
  const jumpToSheet = (id: string) => {
    setActiveSheetId(id);
    setHealthOpen(false);
  };

  const commands: Cmd[] = [
    { id: "add", group: "Page", label: "Add page", run: addSheet },
    { id: "dup", group: "Page", label: "Duplicate current page", hint: "Ctrl D", run: () => activeSheet && duplicateSheet(activeSheet.id) },
    { id: "del", group: "Page", label: "Delete current page", run: () => activeSheet && deleteSheet(activeSheet.id) },
    { id: "magic", group: "Page", label: "Magic layout — fit layout to this page's photos", run: magicLayout },
    { id: "smartlayout", group: "Page", label: "Smart layout — pick by photo orientation", run: smartLayoutThisPage },
    { id: "copystyle", group: "Page", label: "Copy page style", run: copyPageStyle },
    { id: "pastestyle", group: "Page", label: "Paste page style", run: () => pastePageStyle(false) },
    { id: "pasteall", group: "Page", label: "Paste page style to every inner page", run: () => pastePageStyle(true) },
    { id: "upload", group: "Photos", label: "Add photos to tray…", run: () => { setRightTab("photos"); trayFileRef.current?.click(); } },
    { id: "fill", group: "Photos", label: "Fill empty slots from tray", run: autoFillEmpty },
    { id: "build", group: "Photos", label: "Auto-build pages from unused photos", run: autoBuildPages },
    { id: "focusall", group: "Photos", label: "Smart focus — auto-crop every photo", run: smartFocusAll },
    { id: "remix", group: "Album", label: "Remix album layouts", run: remixAlbum },
    { id: "cover", group: "Album", label: "Design cover (title, subtitle, date)", run: designCover },
    { id: "themephoto", group: "Album", label: "Generate theme from this page's photo", run: themeFromPhoto },
    { id: "story", group: "Album", label: "Open storyboard overview", run: () => setStoryOpen(true) },
    { id: "rmempty", group: "Album", label: "Remove empty pages", run: removeEmptyPages },
    { id: "preview", group: "View", label: previewMode ? "Exit preview mode" : "Preview mode", hint: "P", run: () => setPreviewMode((v) => !v) },
    { id: "focus", group: "View", label: focusMode ? "Leave focus mode" : "Focus mode — hide panels", hint: "F", run: () => setFocusMode((v) => !v) },
    { id: "fit", group: "View", label: "Fit page to screen", run: fitZoom },
    { id: "guides", group: "View", label: "Toggle thirds guides", run: () => setSettings((s) => ({ ...s, showGuides: !s.showGuides })) },
    { id: "safe", group: "View", label: "Toggle print-safe margin", run: () => setSettings((s) => ({ ...s, showSafe: !s.showSafe })) },
    { id: "bleed", group: "View", label: "Toggle bleed zone", run: () => setSettings((s) => ({ ...s, showBleed: !s.showBleed })) },
    { id: "help", group: "View", label: "Keyboard shortcuts", hint: "?", run: () => setHelpOpen(true) },
    { id: "review", group: "Album", label: "Review album as flip-book", run: () => openReview() },
    { id: "health", group: "Album", label: "Open album health check", run: () => setHealthOpen(true) },
    { id: "save", group: "Album", label: "Save album", hint: "Ctrl S", run: handleSave },
    { id: "saveexit", group: "Album", label: "Save & open Album Library", run: handleSaveAndOpenLibrary },
    { id: "export", group: "Album", label: "Export album file (.json)", run: exportAlbumFile },
    { id: "exportpng", group: "Album", label: "Export current page as PNG", run: exportPagePng },
    { id: "import", group: "Album", label: "Import album file…", run: () => importRef.current?.click() },
    { id: "share", group: "Album", label: "Copy share link", run: handleShare },
    { id: "library", group: "Album", label: "Open Album Library", run: () => navigate("/albums/library") },
    ...THEMES.map((t) => ({ id: `theme_${t.id}`, group: "Themes", label: `Apply theme: ${t.label}`, run: () => applyTheme(t) })),
    ...sheets.map((s, i) => ({ id: `go_${s.id}`, group: "Go to page", label: `${i + 1}. ${s.name}`, run: () => setActiveSheetId(s.id) })),
  ];
  const cmdTokens = cmdQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const cmdResults = commands.filter((c) => {
    const hay = `${c.group} ${c.label}`.toLowerCase();
    return cmdTokens.every((t) => hay.includes(t));
  });
  const runCommand = (c: Cmd | undefined) => {
    if (!c) return;
    setCmdOpen(false);
    window.setTimeout(c.run, 0);
  };

  /* ── Global keyboard shortcuts (read live state through a ref) ── */
  const kb = useRef<Record<string, any>>({});
  kb.current = {
    handleUndo, handleRedo, handleSave, selectedTextId, editingTextId, selectedSlotId, selectedSlot,
    deleteTextElement, removeSlotImage, nudgeText, duplicateTextElement, duplicateSheet, goSheet,
    activeSheet, reviewOpen, cmdOpen,
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = kb.current;
      if (k.reviewOpen) return;
      const mod = e.ctrlKey || e.metaKey;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? "";
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!t?.isContentEditable;
      const isTextual =
        tag === "TEXTAREA" || !!t?.isContentEditable ||
        (tag === "INPUT" && ["text", "search", ""].includes((t as HTMLInputElement).type));
      const key = e.key.toLowerCase();

      if (mod && key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setSelectedTextId(null);
        setEditingTextId(null);
        setEmojiPickerOpen(false);
        setCmdOpen(false);
        setHealthOpen(false);
        setMoreOpen(false);
        setStoryOpen(false);
        setHelpOpen(false);
        setRepositionId(null);
        setSelectedSlotId(null);
        return;
      }
      if (k.cmdOpen) return;
      if (mod && key === "z" && !isTextual) {
        e.preventDefault();
        if (e.shiftKey) k.handleRedo();
        else k.handleUndo();
        return;
      }
      if (mod && key === "y" && !isTextual) {
        e.preventDefault();
        k.handleRedo();
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        k.handleSave();
        return;
      }
      if (isInput) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        if (k.selectedTextId) k.duplicateTextElement(k.selectedTextId);
        else if (k.activeSheet) k.duplicateSheet(k.activeSheet.id);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !k.editingTextId) {
        if (k.selectedTextId) {
          e.preventDefault();
          k.deleteTextElement(k.selectedTextId);
        } else if (k.selectedSlot?.image) {
          e.preventDefault();
          k.removeSlotImage(k.selectedSlot.id);
        }
        return;
      }
      if (k.selectedTextId && !k.editingTextId && e.key.startsWith("Arrow") && !e.altKey) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        k.nudgeText(k.selectedTextId, dx, dy);
        return;
      }
      if ((e.altKey && e.key === "ArrowLeft") || e.key === "PageUp") { e.preventDefault(); k.goSheet(-1); return; }
      if ((e.altKey && e.key === "ArrowRight") || e.key === "PageDown") { e.preventDefault(); k.goSheet(1); return; }
      if (!mod && !e.altKey && key === "f") setFocusMode((v) => !v);
      if (!mod && !e.altKey && key === "p") setPreviewMode((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ───────────── Review Album ───────────── */
  const clearTurnTimer = () => {
    if (flipTimerRef.current) {
      window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
  };

  const playFlipSound = () => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        audioCtxRef.current = new AC();
      }
      const actx = audioCtxRef.current;
      if (actx.state === "suspended") actx.resume().catch(() => {});
      const duration = 0.3;
      const bufferSize = Math.floor(actx.sampleRate * duration);
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.3);
      }
      const noise = actx.createBufferSource();
      noise.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2600, actx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(900, actx.currentTime + duration);
      filter.Q.value = 0.6;
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.001, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, actx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);
      noise.connect(filter).connect(gain).connect(actx.destination);
      noise.start();
      noise.stop(actx.currentTime + duration + 0.02);
    } catch {
      /* audio is optional */
    }
  };

  const openReview = () => {
    const sheetIdx = sheetsRef.current.findIndex((s) => s.id === activeSheetId);
    let spreadIdx = 0;
    if (sheetIdx > 0) spreadIdx = 1 + Math.floor((sheetIdx - 1) / 2);
    setReviewIndex(Math.min(Math.max(spreadIdx, 0), totalSpreads - 1));
    clearTurnTimer();
    setTurn(null);
    setAutoPlay(false);
    setReviewOpen(true);
  };

  const closeReview = () => {
    clearTurnTimer();
    setTurn(null);
    setAutoPlay(false);
    dragMeta.current = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setReviewOpen(false);
  };

  const toggleReviewFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else overlayRef.current?.requestFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    if (!reviewOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [reviewOpen]);

  useEffect(() => {
    if (!reviewOpen) return;
    const restored: { el: HTMLElement; visibility: string }[] = [];
    document.querySelectorAll("header, footer").forEach((node) => {
      const el = node as HTMLElement;
      restored.push({ el, visibility: el.style.visibility });
      el.style.visibility = "hidden";
    });
    return () => {
      restored.forEach(({ el, visibility }) => {
        el.style.visibility = visibility;
      });
    };
  }, [reviewOpen]);

  const setTurnVisual = (angleDeg: number, withTransition: boolean, durationMs: number = FLIP_MS) => {
    const el = turnRef.current;
    if (el) {
      el.style.transition = withTransition ? `transform ${durationMs}ms cubic-bezier(0.45,0,0.2,1)` : "none";
      el.style.transform = `rotateY(${angleDeg}deg)`;
    }
    const shadowEl = shadowRef.current;
    if (shadowEl) {
      const norm = Math.min(Math.abs(angleDeg) / 180, 1);
      const opacity = Math.sin(norm * Math.PI) * 0.6;
      shadowEl.style.transition = withTransition ? `opacity ${durationMs}ms ease` : "none";
      shadowEl.style.opacity = String(opacity);
    }
  };

  const startCommittedFlip = (nextIndex: number, dir: FlipDir, fromAngle = 0, duration = FLIP_MS) => {
    if (turn || nextIndex < 0 || nextIndex >= totalSpreads) return;
    clearTurnTimer();
    playFlipSound();
    setTurn({ from: reviewIndex, to: nextIndex, dir, committing: true });
    requestAnimationFrame(() => {
      setTurnVisual(fromAngle, false);
      requestAnimationFrame(() => {
        setTurnVisual(dir === "forward" ? -180 : 180, true, duration);
      });
    });
    flipTimerRef.current = window.setTimeout(() => {
      setReviewIndex(nextIndex);
      setTurn(null);
      flipTimerRef.current = null;
    }, duration);
  };

  const goToPage = (dir: FlipDir) => {
    if (turn) return;
    const nextIndex = dir === "forward" ? reviewIndex + 1 : reviewIndex - 1;
    startCommittedFlip(nextIndex, dir);
  };

  const jumpToPage = (index: number) => {
    if (turn || index === reviewIndex) return;
    startCommittedFlip(index, index > reviewIndex ? "forward" : "backward");
  };

  useEffect(() => {
    if (!reviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToPage("forward");
      else if (e.key === "ArrowLeft") goToPage("backward");
      else if (e.key === "Escape") closeReview();
      else if (e.key === " ") {
        e.preventDefault();
        setAutoPlay((a) => !a);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewOpen, reviewIndex, turn]);

  useEffect(() => {
    if (!autoPlay || !reviewOpen || turn) return;
    if (reviewIndex >= totalSpreads - 1) {
      setAutoPlay(false);
      return;
    }
    autoPlayTimerRef.current = window.setTimeout(() => {
      goToPage("forward");
    }, AUTOPLAY_GAP_MS);
    return () => {
      if (autoPlayTimerRef.current) {
        window.clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, reviewOpen, reviewIndex, turn, totalSpreads]);

  const onBookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (turn) return;
    setAutoPlay(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const dir: FlipDir = relX > rect.width / 2 ? "forward" : "backward";
    const targetIndex = dir === "forward" ? reviewIndex + 1 : reviewIndex - 1;
    if (targetIndex < 0 || targetIndex >= totalSpreads) return;
    dragMeta.current = { dir, startX: e.clientX, width: rect.width / 2, progress: 0 };
    setTurn({ from: reviewIndex, to: targetIndex, dir, committing: false });
    requestAnimationFrame(() => setTurnVisual(0, false));
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onBookPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const meta = dragMeta.current;
    if (!meta || !turn || turn.committing) return;
    const deltaX = e.clientX - meta.startX;
    const raw = meta.dir === "forward" ? -deltaX : deltaX;
    const progress = Math.min(Math.max(raw / (meta.width * 0.92), 0), 1);
    meta.progress = progress;
    const angle = meta.dir === "forward" ? -progress * 178 : progress * 178;
    setTurnVisual(angle, false);
  };

  const finishDrag = () => {
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
      flipTimerRef.current = window.setTimeout(() => {
        setReviewIndex(targetIndex);
        setTurn(null);
        flipTimerRef.current = null;
      }, duration);
    } else {
      const duration = Math.max(160, Math.round(FLIP_MS * meta.progress * 0.5 + 160));
      setTurn((t) => (t ? { ...t, committing: true } : t));
      clearTurnTimer();
      requestAnimationFrame(() => setTurnVisual(0, true, duration));
      flipTimerRef.current = window.setTimeout(() => {
        setTurn(null);
        flipTimerRef.current = null;
      }, duration);
    }
  };

  const renderAlbumPage = (sheet?: Sheet, pageNumber?: number) => {
    if (!sheet) return <div className="ab-blank-leaf" />;
    const meta = getLayout(sheet.layout);
    const sGap = sheet.gap ?? settings.gap;
    const sRadius = sheet.radius ?? settings.radius;
    return (
      <div className="ab-page-surface" style={{ background: sheet.bgImage ? `url(${sheet.bgImage}) center/cover` : sheet.bgColor }}>
        {meta.id === "magazine" && meta.textRect && (
          <div className="ab-magazine-text" style={rectStyle(meta.textRect, sGap, 0)}>
            <div className="ab-magazine-title">{sheet.title || "Your Story"}</div>
            <div className="ab-magazine-subtitle">{sheet.subtitle || "A moment worth remembering"}</div>
          </div>
        )}

        {meta.decorative === "vs" && <div className="ab-vs-badge">VS</div>}
        {meta.decorative === "spine" && <div className="ab-panoramic-spine" />}
        {meta.decorative === "timeline" && <div className="ab-timeline-line" />}

        {sheet.slots.map((slot, i) => {
          const rect = meta.rects[i] ?? meta.rects[meta.rects.length - 1];
          const rotate = (rect.rotate ?? 0) + (slot.rotateExtra ?? 0) + (slot.tilt ?? 0);
          const transform = `rotate(${rotate}deg) scaleX(${slot.flip ? -1 : 1}) scale(${slot.scale ?? 1})`;
          return (
            <div
              key={slot.id}
              className={`ab-slot frame-${slot.frame ?? "none"} ${meta.style === "polaroid" ? "ab-slot-polaroid" : ""} ${
                meta.style === "collage" ? "ab-slot-collage" : ""
              }`}
              style={{
                ...rectStyle(rect, sGap, meta.style === "polaroid" ? 2 : sRadius),
                transform,
                zIndex: slot.front ? 50 : rect.z ?? 1,
              }}
            >
              <div className={`ab-slot-media ${slot.vignette ? "vig" : ""}`}>
                {slot.image ? (
                  <SlotImage slot={slot} alt={slot.fileName ?? "photo"} />
                ) : (
                  <div className="ab-slot-empty">
                    <PictureOutlined />
                    <span>No photo</span>
                  </div>
                )}
              </div>
              {meta.decorative === "timeline" && <span className="ab-timeline-step">{i + 1}</span>}
              {meta.captions && <div className="ab-slot-caption">{slot.caption}</div>}
            </div>
          );
        })}

        {sheet.textElements.map((el) => (
          <TextLayerStatic key={el.id} el={el} className="ab-text-el" />
        ))}

        {typeof pageNumber === "number" && <span className="ab-leaf-page-num">{pageNumber}</span>}
      </div>
    );
  };

  const renderHardCover = () => {
    const cover = sheets[0];
    return (
      <div className="ab-hard-cover">
        <div className="ab-cover-board" />
        {renderAlbumPage(cover)}
        <div className="ab-cover-gloss" />
        <div className="ab-cover-spine" />
      </div>
    );
  };

  if (!activeSheet) {
    return (
      <main className="tp-page">
        <p style={{ color: "#cbd8e7", padding: 40 }}>No sheets available.</p>
      </main>
    );
  }

  const canvasPx = Math.round(BASE_CANVAS_PX * (zoom / 100));
  const pageGap = activeSheet.gap ?? settings.gap;
  const pageRadius = activeSheet.radius ?? settings.radius;

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
  const unusedInTray = pool.filter((p) => !usedUrls.has(p.url)).length;
  const RING_C = 2 * Math.PI * 11;

  return (
    <main className="tp-page">
      {toast && (
        <div className="tp-toast" role="status">
          <CheckOutlined /> {toast}
        </div>
      )}

      <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleImportFile} />
      <input
        ref={trayFileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={(e) => { if (e.target.files) addToTray(e.target.files); e.target.value = ""; }}
      />

      <section className="tp-stage">
        {/* ── Top bar ── */}
        <header className={`tp-topbar ${reviewOpen ? "tp-chrome-hidden" : ""}`}>
          <div className="tp-topbar-left">
            <button className="tp-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeftOutlined />
            </button>
            <input
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
              aria-label="Album name"
              title="Album name (shown in Album Library)"
              maxLength={60}
              style={{
                width: 190, padding: "7px 12px", borderRadius: 10, fontSize: 13, fontWeight: 800,
                border: "1px solid rgba(56,189,248,0.32)", background: "rgba(8,18,34,0.6)", color: "#edf8ff", outline: "none",
              }}
            />
            <div className="tp-breadcrumb">
              <span>{sheets.length} sheets</span>
              <span className="tp-dot">·</span>
              <span>{activeSheet.name}</span>
              <span className="tp-dot">·</span>
              <span>{layoutMeta.label}</span>
              {boot.resumed && !dirty && <span className="tp-dot" title="Loaded from Album Library">· Saved</span>}
              {dirty && <span className="tp-dirty" title="Unsaved changes">● Unsaved</span>}
            </div>
          </div>

          <div className="tp-topbar-right">
            <button className="tp-icon-btn ghost" aria-label="Undo" title="Undo (Ctrl Z)" disabled={!undoStack.length} onClick={handleUndo}>
              <UndoOutlined />
            </button>
            <button className="tp-icon-btn ghost" aria-label="Redo" title="Redo (Ctrl Shift Z)" disabled={!redoStack.length} onClick={handleRedo}>
              <RedoOutlined />
            </button>

            <label className="tp-toggle" title="Preview mode (P)">
              <input type="checkbox" checked={previewMode} onChange={(e) => setPreviewMode(e.target.checked)} />
              <span className="tp-toggle-track">
                <span className="tp-toggle-thumb" />
              </span>
            </label>

            <button className="tp-cmd-btn" onClick={() => setCmdOpen(true)} title="Command palette">
              <SearchOutlined /> Commands <kbd>Ctrl K</kbd>
            </button>

            <button
              className={`tp-health-btn ${healthIssues ? "warn" : "ok"}`}
              onClick={() => setHealthOpen(true)}
              title="Album health check"
            >
              <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
                <circle cx="14" cy="14" r="11" className="tp-ring-bg" />
                <circle
                  cx="14" cy="14" r="11" className="tp-ring-fg"
                  strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - health.pct / 100)}
                  transform="rotate(-90 14 14)"
                />
              </svg>
              <span>{health.pct}%</span>
            </button>

            <button className="tp-icon-btn ghost" onClick={() => setStoryOpen(true)} title="Storyboard overview" aria-label="Storyboard">
              <TableOutlined />
            </button>
            <button className="tp-icon-btn ghost" onClick={() => setHelpOpen(true)} title="Keyboard shortcuts (?)" aria-label="Shortcuts">
              <QuestionCircleOutlined />
            </button>
            <button className="tp-icon-btn ghost" onClick={() => setFocusMode((f) => !f)} title="Focus mode (F)" aria-label="Focus mode">
              {focusMode ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>
            <button className="tp-btn-ghost" onClick={() => setSettingsOpen(true)}>
              <SettingOutlined /> Preview setting
            </button>
            <button className="tp-btn-outline" onClick={() => navigate("/albums/library")}>
              <FolderOpenOutlined /> Album Library
            </button>
            <button className="tp-btn-outline" onClick={openReview}>
              <ReadOutlined /> Review Album
            </button>
            <button className="tp-btn-outline" onClick={handleSave} disabled={saving} title="Save (Ctrl S)">
              {saved ? <CheckOutlined /> : <SaveOutlined />} {saving ? "Saving…" : saved ? "Saved!" : "Save Album"}
            </button>
            <span className="tp-size-pill">{ctx.canvasSize}</span>

            <div className="tp-more-wrap">
              <button className="tp-icon-btn" onClick={() => setMoreOpen((o) => !o)} aria-label="More">
                <MoreOutlined />
              </button>
              {moreOpen && (
                <>
                  <div className="tp-slot-menu-backdrop" onClick={() => setMoreOpen(false)} />
                  <div className="tp-more-menu">
                    <button onClick={() => { setMoreOpen(false); handleSaveAndOpenLibrary(); }}>
                      <SaveOutlined /> Save &amp; open Album Library
                    </button>
                    <button onClick={() => { setMoreOpen(false); exportPagePng(); }}>
                      <FileImageOutlined /> Export page as PNG
                    </button>
                    <button onClick={() => { setMoreOpen(false); exportAlbumFile(); }}>
                      <DownloadOutlined /> Export album file
                    </button>
                    <button onClick={() => { setMoreOpen(false); importRef.current?.click(); }}>
                      <UploadOutlined /> Import album file
                    </button>
                    <button onClick={() => { setMoreOpen(false); handleShare(); }}>
                      <ShareAltOutlined /> Copy share link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className={`tp-body ${focusMode ? "is-focus" : ""}`}>
          {/* Left: Sheets panel */}
          <aside className="tp-sheets-panel">
            <div className="tp-panel-label">Sheets</div>
            <button className="tp-add-sheet" onClick={addSheet}>
              <PlusOutlined /> Add sheet
            </button>

            <div className="tp-sheets-list">
              {sheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className={`tp-sheet-item ${sheet.id === activeSheetId ? "active" : ""} ${dragSheetId === sheet.id ? "dragging" : ""}`}
                  draggable
                  onClick={() => setActiveSheetId(sheet.id)}
                  onDragStart={() => setDragSheetId(sheet.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const pid = e.dataTransfer.getData(PHOTO_DND);
                    if (pid) {
                      e.preventDefault();
                      dropPhotoOnSheet(pid, sheet.id);
                    } else handleSheetDrop(sheet.id);
                  }}
                  onDragEnd={() => setDragSheetId(null)}
                >
                  <span className="tp-sheet-thumb">
                    <SheetMini sheet={sheet} />
                  </span>

                  {renamingId === sheet.id ? (
                    <input
                      ref={renameInputRef}
                      className="tp-sheet-rename-input"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => e.key === "Enter" && commitRename()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="tp-sheet-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenameDraft(sheet.name);
                        setRenamingId(sheet.id);
                      }}
                    >
                      {sheet.name}
                      {sheet.textElements.length > 0 && (
                        <span className="tp-sheet-text-badge" title="Has text/stickers">
                          <FontSizeOutlined />
                        </span>
                      )}
                    </span>
                  )}

                  <button
                    className="tp-sheet-dup"
                    onClick={(e) => { e.stopPropagation(); duplicateSheet(sheet.id); }}
                    aria-label="Duplicate sheet" title="Duplicate sheet"
                  >
                    <CopyOutlined />
                  </button>

                  {sheets.length > 1 && (
                    <button
                      className="tp-sheet-delete"
                      onClick={(e) => { e.stopPropagation(); deleteSheet(sheet.id); }}
                      aria-label="Delete sheet" title="Delete sheet"
                    >
                      <DeleteOutlined />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="tp-panel-label" style={{ marginTop: 18 }}>
              Slots
            </div>
            <div className="tp-slots-list">
              {activeSheet.slots.map((slot, i) => (
                <div
                  key={slot.id}
                  className={`tp-slot-row ${selectedSlotId === slot.id ? "active" : ""}`}
                  draggable
                  onClick={() => slot.image && setSelectedSlotId(slot.id)}
                  onDragStart={() => handleSlotDragStart(slot.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleSlotDrop(slot.id, e)}
                >
                  <span className="tp-slot-handle">⋮⋮</span>
                  <span className="tp-slot-name">
                    {layoutMeta.captionStyle === "before-after" ? slot.caption ?? `Slot ${i + 1}` : `Slot ${i + 1}`}
                  </span>
                  {slot.image && <span className="tp-slot-dot" />}
                </div>
              ))}
            </div>
          </aside>

          {/* Center: Canvas */}
          <div className="tp-canvas-wrap" ref={wrapRef}>
            <input ref={slotFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSlotFileChosen} />

            <div className="tp-canvas-column">
              {/* ── Floating text formatting toolbar ── */}
              {selectedText && !previewMode && (
                <div className="tp-text-toolbar" onClick={(e) => e.stopPropagation()}>
                  {!selectedText.isSticker && (
                    <select
                      className="tp-toolbar-font"
                      value={selectedText.fontFamily}
                      onChange={(e) => updateTextField(selectedText.id, { fontFamily: e.target.value })}
                      title="Font"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f} value={f} style={{ fontFamily: f }}>
                          {f.split(",")[0].replace(/'/g, "")}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="tp-toolbar-size" title="Text size">
                    <FontSizeOutlined />
                    <input
                      type="range" min={1} max={selectedText.isSticker ? 40 : 16} step={0.5} value={selectedText.fontSize}
                      onChange={(e) => updateTextField(selectedText.id, { fontSize: Number(e.target.value) }, "size")}
                    />
                  </div>

                  {!selectedText.isSticker && (
                    <>
                      <input
                        type="color" className="tp-toolbar-color" value={selectedText.color}
                        onChange={(e) => updateTextField(selectedText.id, { color: e.target.value }, "color")} title="Text color"
                      />
                      <button className={selectedText.bold ? "active" : ""} onClick={() => updateTextField(selectedText.id, { bold: !selectedText.bold })} title="Bold">
                        <BoldOutlined />
                      </button>
                      <button className={selectedText.italic ? "active" : ""} onClick={() => updateTextField(selectedText.id, { italic: !selectedText.italic })} title="Italic">
                        <ItalicOutlined />
                      </button>
                      <button className={selectedText.underline ? "active" : ""} onClick={() => updateTextField(selectedText.id, { underline: !selectedText.underline })} title="Underline">
                        <UnderlineOutlined />
                      </button>
                      <button className={selectedText.align === "left" ? "active" : ""} onClick={() => updateTextField(selectedText.id, { align: "left" })} title="Align left">
                        <AlignLeftOutlined />
                      </button>
                      <button className={selectedText.align === "center" ? "active" : ""} onClick={() => updateTextField(selectedText.id, { align: "center" })} title="Align center">
                        <AlignCenterOutlined />
                      </button>
                      <button className={selectedText.align === "right" ? "active" : ""} onClick={() => updateTextField(selectedText.id, { align: "right" })} title="Align right">
                        <AlignRightOutlined />
                      </button>
                      <input
                        type="color" className="tp-toolbar-color"
                        value={selectedText.bg === "transparent" ? "#0b1f33" : selectedText.bg}
                        onChange={(e) => updateTextField(selectedText.id, { bg: e.target.value }, "bg")} title="Highlight background"
                      />
                      <button onClick={() => updateTextField(selectedText.id, { bg: "transparent" })} title="No background">
                        <BgColorsOutlined />
                      </button>
                      <button className={selectedText.shadow ? "active" : ""} onClick={() => updateTextField(selectedText.id, { shadow: !selectedText.shadow })} title="Text shadow">
                        <span className="tp-shadow-glyph">S</span>
                      </button>
                      <div className="tp-toolbar-size" title="Letter spacing">
                        <span className="tp-mini-label">Sp</span>
                        <input
                          type="range" min={0} max={0.5} step={0.01} value={selectedText.spacing ?? 0}
                          onChange={(e) => updateTextField(selectedText.id, { spacing: Number(e.target.value) }, "spacing")}
                        />
                      </div>
                      <div className="tp-toolbar-size" title="Outline width">
                        <span className="tp-mini-label">Ol</span>
                        <input
                          type="range" min={0} max={0.6} step={0.02} value={selectedText.stroke ?? 0}
                          onChange={(e) => updateTextField(selectedText.id, { stroke: Number(e.target.value) }, "stroke")}
                        />
                      </div>
                      <input
                        type="color" className="tp-toolbar-color" value={selectedText.strokeColor ?? "#000000"}
                        onChange={(e) => updateTextField(selectedText.id, { strokeColor: e.target.value }, "strokeColor")} title="Outline color"
                      />
                    </>
                  )}

                  <div className="tp-toolbar-size" title="Opacity">
                    <span className="tp-mini-label">Op</span>
                    <input
                      type="range" min={0.1} max={1} step={0.05} value={selectedText.opacity ?? 1}
                      onChange={(e) => updateTextField(selectedText.id, { opacity: Number(e.target.value) }, "opacity")}
                    />
                  </div>

                  <div className="tp-toolbar-emoji-wrap">
                    <button onClick={() => setEmojiPickerOpen((o) => !o)} title="Insert emoji">
                      <SmileOutlined />
                    </button>
                    {emojiPickerOpen && (
                      <div className="tp-emoji-popover">
                        {EMOJI_LIST.map((em) => (
                          <button key={em} onClick={() => insertEmojiIntoSelected(em)}>
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => updateTextField(selectedText.id, { xPct: 50 - selectedText.wPct / 2 })} title="Center horizontally">
                    <ColumnWidthOutlined />
                  </button>
                  <button onClick={() => updateTextField(selectedText.id, { yPct: 50 - selectedText.hPct / 2 })} title="Center vertically">
                    <VerticalAlignMiddleOutlined />
                  </button>
                  <button onClick={() => duplicateTextElement(selectedText.id)} title="Duplicate (Ctrl D)">
                    <CopyOutlined />
                  </button>
                  <button onClick={() => reorderTextElement(selectedText.id, "front")} title="Bring to front">
                    <VerticalAlignTopOutlined />
                  </button>
                  <button onClick={() => reorderTextElement(selectedText.id, "back")} title="Send to back">
                    <VerticalAlignBottomOutlined />
                  </button>
                  <button className="danger" onClick={() => deleteTextElement(selectedText.id)} title="Delete">
                    <DeleteOutlined />
                  </button>
                </div>
              )}

              <div
                ref={canvasRef}
                className={`tp-canvas ${previewMode ? "is-preview" : ""}`}
                style={{
                  width: `${canvasPx}px`,
                  aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                  background: activeSheet.bgImage ? `url(${activeSheet.bgImage}) center/cover` : activeSheet.bgColor,
                }}
                onClick={() => {
                  setSelectedTextId(null);
                  setEmojiPickerOpen(false);
                  setSelectedSlotId(null);
                  setRepositionId(null);
                }}
              >
                {settings.showGuides && !previewMode && (
                  <div className="tp-guides">
                    <span className="tp-guide-v" style={{ left: "33.33%" }} />
                    <span className="tp-guide-v" style={{ left: "66.66%" }} />
                    <span className="tp-guide-h" style={{ top: "33.33%" }} />
                    <span className="tp-guide-h" style={{ top: "66.66%" }} />
                  </div>
                )}

                {settings.showSafe && !previewMode && <div className="tp-safe" aria-hidden />}
                {settings.showBleed && !previewMode && <div className="tp-bleed" aria-hidden />}

                {(snap.v || snap.h) && (
                  <div className="tp-snap-layer" aria-hidden>
                    {snap.v && <span className="tp-snap-v" />}
                    {snap.h && <span className="tp-snap-h" />}
                  </div>
                )}

                {layoutMeta.id === "magazine" && layoutMeta.textRect && (
                  <div className="tp-magazine-text" style={rectStyle(layoutMeta.textRect, pageGap, 0)}>
                    <div
                      className="tp-magazine-title" contentEditable={!previewMode} suppressContentEditableWarning
                      onBlur={(e) => updateSheetText("title", e.currentTarget.textContent || "")}
                    >
                      {activeSheet.title || "Your Story"}
                    </div>
                    <div
                      className="tp-magazine-subtitle" contentEditable={!previewMode} suppressContentEditableWarning
                      onBlur={(e) => updateSheetText("subtitle", e.currentTarget.textContent || "")}
                    >
                      {activeSheet.subtitle || "A moment worth remembering"}
                    </div>
                  </div>
                )}

                {layoutMeta.decorative === "vs" && (
                  <div className="tp-vs-badge" style={{ zIndex: 20 }}>
                    VS
                  </div>
                )}
                {layoutMeta.decorative === "spine" && <div className="tp-panoramic-spine" />}
                {layoutMeta.decorative === "timeline" && <div className="tp-timeline-line" />}

                {activeSheet.slots.map((slot, i) => {
                  const rect = layoutMeta.rects[i] ?? layoutMeta.rects[layoutMeta.rects.length - 1];
                  const rotate = (rect.rotate ?? 0) + (slot.rotateExtra ?? 0) + (slot.tilt ?? 0);
                  const scale = slot.scale ?? 1;
                  const transform = `rotate(${rotate}deg) scaleX(${slot.flip ? -1 : 1}) scale(${scale})`;
                  const isRepo = repositionId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      className={`tp-slot frame-${slot.frame ?? "none"} ${layoutMeta.style === "polaroid" ? "tp-slot-polaroid" : ""} ${
                        layoutMeta.style === "collage" ? "tp-slot-collage" : ""
                      } ${dragOverSlotId === slot.id ? "drag-over" : ""} ${
                        selectedSlotId === slot.id && !previewMode ? "is-selected" : ""
                      } ${isRepo ? "is-reposition" : ""}`}
                      style={{
                        ...rectStyle(rect, pageGap, layoutMeta.style === "polaroid" ? 2 : pageRadius),
                        transform,
                        zIndex: menuSlotId === slot.id ? 900 : slot.front ? 50 : rect.z ?? 1,
                        ["--slot-menu-rotation" as any]: `${-rotate}deg`,
                        ["--slot-menu-flip" as any]: slot.flip ? -1 : 1,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!slot.image) openSlotUpload(slot.id);
                        else if (!previewMode) setSelectedSlotId(slot.id);
                      }}
                      onDoubleClick={(e) => {
                        if (!slot.image || previewMode) return;
                        e.stopPropagation();
                        setSelectedSlotId(slot.id);
                        setRepositionId((cur) => (cur === slot.id ? null : slot.id));
                      }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverSlotId(slot.id); }}
                      onDragLeave={() => setDragOverSlotId((cur) => (cur === slot.id ? null : cur))}
                      onDrop={(e) => handleSlotDrop(slot.id, e)}
                    >
                      <div className={`tp-slot-media ${slot.vignette ? "vig" : ""}`} onPointerDown={(e) => onRepoDown(e, slot)}>
                        {slot.image ? (
                          <SlotImage slot={slot} alt={slot.fileName ?? "slot"} />
                        ) : (
                          <div className="tp-slot-empty">
                            <UploadOutlined />
                            <span>{previewMode ? "" : "Click or drop a photo"}</span>
                          </div>
                        )}
                        {isRepo && (
                          <div className="tp-repo-hint">
                            <DragOutlined /> Drag to set focus
                          </div>
                        )}
                      </div>

                      {layoutMeta.decorative === "timeline" && <span className="tp-timeline-step">{i + 1}</span>}

                      {layoutMeta.captions && (
                        <div
                          className="tp-slot-caption" contentEditable={!previewMode} suppressContentEditableWarning
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => updateSlotCaption(slot.id, e.currentTarget.textContent || "")}
                        >
                          {slot.caption}
                        </div>
                      )}

                      {!previewMode && (
                        <>
                          <button
                            className="tp-slot-menu"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuSlotId((cur) => (cur === slot.id ? null : slot.id));
                            }}
                            aria-label="Slot options"
                          >
                            <MoreOutlined />
                          </button>

                          {menuSlotId === slot.id && (
                            <>
                              <div
                                className="tp-slot-menu-backdrop"
                                onClick={(e) => { e.stopPropagation(); setMenuSlotId(null); }}
                              />
                              <div className="tp-slot-dropdown" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { openSlotUpload(slot.id); setMenuSlotId(null); }}>
                                  <UploadOutlined /> {slot.image ? "Replace photo" : "Add photo"}
                                </button>
                                {slot.image && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedSlotId(slot.id);
                                        setRightTab("photos");
                                        setMenuSlotId(null);
                                      }}
                                    >
                                      <EditOutlined /> Edit photo…
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedSlotId(slot.id);
                                        setRepositionId(slot.id);
                                        setMenuSlotId(null);
                                      }}
                                    >
                                      <AimOutlined /> Reposition focus
                                    </button>
                                    <button onClick={() => { smartFocusSlot(slot.id); setMenuSlotId(null); }}>
                                      <ThunderboltOutlined /> Auto focus
                                    </button>
                                  </>
                                )}
                                <button onClick={() => { rotateSlot(slot.id); setMenuSlotId(null); }}>
                                  <RotateRightOutlined /> Rotate 90°
                                </button>
                                <button onClick={() => { flipSlot(slot.id); setMenuSlotId(null); }}>
                                  <SwapOutlined /> Flip horizontal
                                </button>
                                <div className="tp-slot-size-control">
                                  <div>
                                    <span>Photo size</span>
                                    <strong>{Math.round(scale * 100)}%</strong>
                                  </div>
                                  <input
                                    type="range" min={60} max={150} value={Math.round(scale * 100)}
                                    onChange={(e) => patchSlot(slot.id, { scale: Number(e.target.value) / 100 }, "scale")}
                                    aria-label="Photo size"
                                  />
                                </div>
                                {(layoutMeta.style === "collage" || layoutMeta.style === "polaroid") && (
                                  <button onClick={() => { bringToFront(slot.id); setMenuSlotId(null); }}>
                                    <VerticalAlignTopOutlined /> Bring to front
                                  </button>
                                )}
                                {slot.image && (
                                  <button className="danger" onClick={() => { removeSlotImage(slot.id); setMenuSlotId(null); }}>
                                    <CloseOutlined /> Remove photo
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* ── Free-floating text boxes & stickers ── */}
                {activeSheet.textElements.map((el, idx) => (
                  <div
                    key={el.id}
                    className={`tp-text-el ${selectedTextId === el.id ? "selected" : ""} ${el.isSticker ? "is-sticker" : ""} ${
                      previewMode ? "locked" : ""
                    }`}
                    style={{
                      top: `${el.yPct}%`, left: `${el.xPct}%`, width: `${el.wPct}%`, height: `${el.hPct}%`,
                      transform: `rotate(${el.rotate}deg)`, fontFamily: el.fontFamily, zIndex: 2000 + idx,
                    }}
                    onPointerDown={(e) => onTextPointerDown(e, el.id, "move")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      data-text-id={el.id}
                      className="tp-text-content"
                      style={{
                        textAlign: el.align, color: el.color, fontFamily: el.fontFamily,
                        fontWeight: el.bold ? 800 : 500, fontStyle: el.italic ? "italic" : "normal",
                        textDecoration: el.underline ? "underline" : "none", background: el.bg,
                        fontSize: `${el.fontSize}cqw`,
                        letterSpacing: el.spacing ? `${el.spacing}em` : undefined,
                        opacity: el.opacity ?? 1,
                        textShadow: el.shadow ? "0 2px 10px rgba(0,0,0,0.55)" : undefined,
                        WebkitTextStroke: el.stroke ? `${el.stroke}cqw ${el.strokeColor ?? "#000000"}` : undefined,
                        paintOrder: el.stroke ? "stroke fill" : undefined,
                        justifyContent: el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
                        cursor: editingTextId === el.id ? "text" : "inherit",
                      }}
                      contentEditable={!previewMode && editingTextId === el.id}
                      suppressContentEditableWarning
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (previewMode) return;
                        setSelectedTextId(el.id);
                        setEditingTextId(el.id);
                      }}
                      onPointerDown={(e) => {
                        if (editingTextId === el.id) e.stopPropagation();
                      }}
                      onBlur={(e) => {
                        commitTextContent(el.id, e.currentTarget.textContent || "");
                        setEditingTextId(null);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Escape") e.currentTarget.blur();
                      }}
                    >
                      {el.text}
                    </div>

                    {!previewMode && selectedTextId === el.id && editingTextId !== el.id && (
                      <>
                        <button
                          className="tp-text-del"
                          onClick={(e) => { e.stopPropagation(); deleteTextElement(el.id); }}
                          aria-label="Delete text"
                        >
                          <CloseOutlined />
                        </button>
                        <span className="tp-text-handle tp-text-handle-resize" onPointerDown={(e) => onTextPointerDown(e, el.id, "resize")} title="Resize" />
                        <span className="tp-text-handle tp-text-handle-rotate" onPointerDown={(e) => onTextPointerDown(e, el.id, "rotate")} title="Rotate (snaps every 15°)" />
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Page navigator ── */}
              <div className="tp-pagenav">
                <button className="tp-icon-btn ghost" onClick={() => goSheet(-1)} disabled={activeIndex === 0} aria-label="Previous page" title="Previous page (PageUp)">
                  <LeftOutlined />
                </button>
                <span>
                  Page {activeIndex + 1} <em>of</em> {sheets.length}
                </span>
                <button className="tp-icon-btn ghost" onClick={() => goSheet(1)} disabled={activeIndex >= sheets.length - 1} aria-label="Next page" title="Next page (PageDown)">
                  <RightOutlined />
                </button>
                <button className="tp-fit-btn" onClick={fitZoom} title="Fit page to screen">
                  Fit
                </button>
              </div>
            </div>
          </div>

          {/* Right: Properties panel */}
          <aside className="tp-props-panel">
            <div className="tp-tabs">
              <button className={`tp-tab ${rightTab === "layout" ? "active" : ""}`} onClick={() => setRightTab("layout")}>
                <AppstoreOutlined /> Layout
              </button>
              <button className={`tp-tab ${rightTab === "photos" ? "active" : ""}`} onClick={() => setRightTab("photos")}>
                <CameraOutlined /> Photos{unusedInTray ? ` (${unusedInTray})` : ""}
              </button>
              <button className={`tp-tab ${rightTab === "elements" ? "active" : ""}`} onClick={() => setRightTab("elements")}>
                <SmileOutlined /> Elements
              </button>
              <button className={`tp-tab ${rightTab === "design" ? "active" : ""}`} onClick={() => setRightTab("design")}>
                <ExperimentOutlined /> Design
              </button>
              <button className={`tp-tab ${rightTab === "comments" ? "active" : ""}`} onClick={() => setRightTab("comments")}>
                <MessageOutlined /> Comments{comments.length ? ` (${comments.length})` : ""}
              </button>
              <button className={`tp-tab ${rightTab === "history" ? "active" : ""}`} onClick={() => setRightTab("history")}>
                <HistoryOutlined /> History
              </button>
            </div>

            {rightTab === "layout" && (
              <div className="tp-props-body">
                <button className="tp-magic-btn" onClick={magicLayout} title="Cycle layouts that fit this page's photo count">
                  <ThunderboltOutlined /> Magic layout
                </button>

                <div className="tp-props-label">Choose a layout</div>
                <div className="tp-layout-grid">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      className={`tp-layout-card ${activeSheet.layout === l.id ? "active" : ""}`}
                      onClick={() => applyLayout(l.id)}
                      title={l.blurb}
                    >
                      <LayoutThumb rects={l.rects} images={activeSheet.slots.map((s) => s.image)} />
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>

                <div className="tp-props-label">Frames for this page</div>
                <div className="tp-chip-row">
                  {FRAMES.map((f) => (
                    <button
                      key={f.id}
                      className={`tp-chip ${activeSheet.slots.every((s) => (s.frame ?? "none") === f.id) ? "active" : ""}`}
                      onClick={() => setAllFrames(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="tp-props-label">Album themes</div>
                <div className="tp-theme-grid">
                  {THEMES.map((t) => (
                    <button key={t.id} className="tp-theme-card" onClick={() => applyTheme(t)} title={`Apply ${t.label} to every page`}>
                      <span className="tp-theme-swatch">
                        <i style={{ background: t.cover }} />
                        <i style={{ background: t.page }} />
                        <i style={{ background: t.text }} />
                      </span>
                      <span style={{ fontFamily: t.font }}>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="tp-props-label">Background Color</div>
                <div className="tp-color-row">
                  <input
                    type="color" className="tp-color-swatch" value={activeSheet.bgColor}
                    onChange={(e) => setSheetBg({ bgColor: e.target.value, bgImage: null })}
                  />
                  <span className="tp-color-hex">{activeSheet.bgColor}</span>
                </div>

                {palette.length > 0 && (
                  <>
                    <div className="tp-props-label">Colors from this page's photo</div>
                    <div className="tp-palette-row">
                      {palette.map((c) => (
                        <button key={c} className="tp-palette-swatch" style={{ background: c }} onClick={() => usePaletteColor(c)} title={`Use ${c}`} />
                      ))}
                    </div>
                    <label className="tp-check">
                      <input type="checkbox" checked={paletteAll} onChange={(e) => setPaletteAll(e.target.checked)} />
                      Apply to every inner page
                    </label>
                  </>
                )}

                <div className="tp-props-label">Background Image</div>
                <input ref={bgFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgImageChosen} />
                <button className="tp-add-grid-btn" onClick={() => bgFileRef.current?.click()}>
                  <PictureOutlined /> Add background image
                </button>
                {activeSheet.bgImage && (
                  <button className="tp-clear-bg" onClick={() => setSheetBg({ bgImage: null })}>
                    Remove background image
                  </button>
                )}

                <div className="tp-props-meta">
                  <div className="tp-meta-row"><span>Canvas</span><span>{CANVAS_W}×{CANVAS_H}</span></div>
                  <div className="tp-meta-row"><span>Layout</span><span>{layoutMeta.label}</span></div>
                  <div className="tp-meta-row"><span>Slots</span><span>{activeSheet.slots.length}</span></div>
                  <div className="tp-meta-row"><span>Version</span><span>v{ctx.versionNum}</span></div>
                  <div className="tp-meta-hint">Double-click a sheet name to rename it. Ctrl+scroll to zoom.</div>
                </div>
              </div>
            )}

            {rightTab === "photos" && (
              <div className="tp-props-body">
                {selectedSlot && selectedSlot.image ? (
                  <div className="tp-inspector">
                    <div className="tp-inspector-head">
                      <div>
                        <strong>Photo · Slot {selectedSlotIndex + 1}</strong>
                        <small>{selectedSlot.fileName ?? "photo"}</small>
                      </div>
                      <button className="tp-icon-btn ghost" onClick={() => { setSelectedSlotId(null); setRepositionId(null); }} aria-label="Close inspector">
                        <CloseOutlined />
                      </button>
                    </div>

                    <div className="tp-inspector-actions">
                      <button onClick={() => openSlotUpload(selectedSlot.id)}><UploadOutlined /> Replace</button>
                      <button onClick={() => rotateSlot(selectedSlot.id)}><RotateRightOutlined /> Rotate</button>
                      <button onClick={() => flipSlot(selectedSlot.id)}><SwapOutlined /> Flip</button>
                      <button
                        className={repositionId === selectedSlot.id ? "active" : ""}
                        onClick={() => setRepositionId((c) => (c === selectedSlot.id ? null : selectedSlot.id))}
                      >
                        <AimOutlined /> Focus
                      </button>
                    </div>
                    <div className="tp-inspector-actions two">
                      <button onClick={() => smartFocusSlot(selectedSlot.id)}><ThunderboltOutlined /> Auto focus</button>
                      <button
                        className={selectedSlot.vignette ? "active" : ""}
                        onClick={() => patchSlot(selectedSlot.id, (sl) => ({ vignette: !sl.vignette }))}
                      >
                        <EyeOutlined /> Vignette
                      </button>
                    </div>

                    <Field label="Zoom" value={`${Math.round((selectedSlot.zoom ?? 1) * 100)}%`}>
                      <input type="range" min={100} max={300} value={Math.round((selectedSlot.zoom ?? 1) * 100)}
                        onChange={(e) => patchSlot(selectedSlot.id, { zoom: Number(e.target.value) / 100 }, "zoom")} />
                    </Field>
                    <Field label="Tilt" value={`${selectedSlot.tilt ?? 0}°`}>
                      <input type="range" min={-20} max={20} step={0.5} value={selectedSlot.tilt ?? 0}
                        onChange={(e) => patchSlot(selectedSlot.id, { tilt: Number(e.target.value) }, "tilt")} />
                    </Field>
                    <Field label="Brightness" value={`${selectedSlot.adj?.b ?? 100}%`}>
                      <input type="range" min={50} max={150} value={selectedSlot.adj?.b ?? 100}
                        onChange={(e) => patchSlot(selectedSlot.id, (sl) => ({ adj: { ...adjOf(sl), b: Number(e.target.value) } }), "adj")} />
                    </Field>
                    <Field label="Contrast" value={`${selectedSlot.adj?.c ?? 100}%`}>
                      <input type="range" min={50} max={150} value={selectedSlot.adj?.c ?? 100}
                        onChange={(e) => patchSlot(selectedSlot.id, (sl) => ({ adj: { ...adjOf(sl), c: Number(e.target.value) } }), "adj")} />
                    </Field>
                    <Field label="Saturation" value={`${selectedSlot.adj?.s ?? 100}%`}>
                      <input type="range" min={0} max={200} value={selectedSlot.adj?.s ?? 100}
                        onChange={(e) => patchSlot(selectedSlot.id, (sl) => ({ adj: { ...adjOf(sl), s: Number(e.target.value) } }), "adj")} />
                    </Field>
                    <button
                      className="tp-link-btn"
                      onClick={() => patchSlot(selectedSlot.id, { adj: undefined, filter: "none", zoom: 1, fx: 50, fy: 50, tilt: 0, vignette: false })}
                    >
                      Reset photo edits
                    </button>

                    <div className="tp-props-label">Filters</div>
                    <div className="tp-chip-row">
                      {FILTER_PRESETS.map((f) => (
                        <button
                          key={f.id}
                          className={`tp-chip ${(selectedSlot.filter || "none") === f.css ? "active" : ""}`}
                          onClick={() => patchSlot(selectedSlot.id, { filter: f.css })}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="tp-props-label">Frame</div>
                    <div className="tp-chip-row">
                      {FRAMES.map((f) => (
                        <button
                          key={f.id}
                          className={`tp-chip ${(selectedSlot.frame ?? "none") === f.id ? "active" : ""}`}
                          onClick={() => patchSlot(selectedSlot.id, { frame: f.id })}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {layoutMeta.captions && (
                      <>
                        <div className="tp-props-label">Caption</div>
                        <input
                          className="tp-text-input" value={selectedSlot.caption ?? ""}
                          onChange={(e) => updateSlotCaption(selectedSlot.id, e.target.value)}
                        />
                      </>
                    )}

                    <button className="tp-danger-btn" onClick={() => removeSlotImage(selectedSlot.id)}>
                      <DeleteOutlined /> Remove photo
                    </button>
                  </div>
                ) : (
                  <div className="tp-inspector-empty">
                    <AimOutlined />
                    <span>Click a photo on the page to edit zoom, focus, colour and frame. Double-click a photo to reposition it.</span>
                  </div>
                )}

                <div className="tp-props-label">Photo tray</div>
                <div
                  className="tp-tray-drop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    if (e.dataTransfer.files?.length) {
                      e.preventDefault();
                      addToTray(e.dataTransfer.files);
                    }
                  }}
                >
                  <button className="tp-add-grid-btn" onClick={() => trayFileRef.current?.click()}>
                    <UploadOutlined /> Add photos
                  </button>
                  <small>Drop many photos here, then drag them onto slots or pages.</small>
                </div>

                {pool.length > 0 && (
                  <>
                    <div className="tp-tray-actions">
                      <button onClick={autoFillEmpty} disabled={!unusedInTray}>
                        <ThunderboltOutlined /> Fill empty slots
                      </button>
                      <button onClick={autoBuildPages} disabled={!unusedInTray}>
                        <PlusOutlined /> Auto-build pages
                      </button>
                    </div>
                    <div className="tp-tray-grid">
                      {pool.map((p) => {
                        const used = usedUrls.has(p.url);
                        return (
                          <div
                            key={p.id}
                            className={`tp-tray-item ${used ? "used" : ""}`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(PHOTO_DND, p.id);
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            onClick={() => placePhoto(p)}
                            title={`${p.name}${p.w ? ` · ${p.w}×${p.h}` : ""} — click to place`}
                          >
                            <img src={p.url} alt={p.name} draggable={false} />
                            {used && <span className="tp-tray-badge"><CheckOutlined /></span>}
                            {p.w > 0 && Math.max(p.w, p.h) < LOW_RES_EDGE && (
                              <span className="tp-tray-warn" title="Low resolution for print"><WarningOutlined /></span>
                            )}
                            <button
                              className="tp-tray-del"
                              onClick={(e) => { e.stopPropagation(); removeFromTray(p.id); }}
                              aria-label="Remove from tray"
                            >
                              <CloseOutlined />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {rightTab === "elements" && (
              <div className="tp-props-body">
                <div className="tp-props-label">Text</div>
                <button className="tp-add-grid-btn" onClick={() => addTextElement()}>
                  <FontSizeOutlined /> Add text box
                </button>
                <div className="tp-text-presets">
                  <button onClick={() => addTextElement("heading")}>Heading</button>
                  <button onClick={() => addTextElement("title")}>Title</button>
                  <button onClick={() => addTextElement("signature")}>Signature</button>
                  <button onClick={() => addTextElement("caption")}>Caption</button>
                  <button onClick={() => addTextElement("date")}>Date stamp</button>
                  <button onClick={() => addTextElement("quote")}>Quote</button>
                  <button onClick={() => addTextElement("monogram")}>Monogram</button>
                </div>
                <div className="tp-elements-hint">
                  Drag a box to move it — it snaps to the page centre and the safe margin. Drag the corner dot to resize and the
                  top dot to rotate. Arrow keys nudge the selection (Shift for bigger steps). Double-click to type.
                </div>

                <div className="tp-props-label">Stickers &amp; Emoji</div>
                <div className="tp-emoji-grid">
                  {EMOJI_LIST.map((em) => (
                    <button key={em} onClick={() => addEmojiSticker(em)}>
                      {em}
                    </button>
                  ))}
                </div>

                {activeSheet.textElements.length > 0 && (
                  <>
                    <div className="tp-props-label">On this page</div>
                    <div className="tp-elements-list">
                      {activeSheet.textElements.map((t) => (
                        <div key={t.id} className={`tp-element-row ${selectedTextId === t.id ? "active" : ""}`} onClick={() => setSelectedTextId(t.id)}>
                          <span className="tp-element-icon">{t.isSticker ? t.text : "Aa"}</span>
                          <span className="tp-element-label">{t.isSticker ? "Sticker" : t.text.trim().slice(0, 20) || "Text box"}</span>
                          <button onClick={(e) => { e.stopPropagation(); deleteTextElement(t.id); }} aria-label="Delete element">
                            <CloseOutlined />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {rightTab === "design" && (
              <div className="tp-props-body">
                <div className="tp-props-label">Smart tools</div>
                <div className="tp-tool-grid">
                  <button className="tp-tool-btn hot" onClick={smartLayoutThisPage} title="Choose a layout from photo orientation">
                    <ThunderboltOutlined /> Smart layout
                  </button>
                  <button className="tp-tool-btn hot" onClick={remixAlbum} title="Shuffle layouts on every inner page">
                    <SwapOutlined /> Remix album
                  </button>
                  <button className="tp-tool-btn" onClick={smartFocusAll} title="Detect the subject in every photo and crop around it">
                    <AimOutlined /> Smart focus all
                  </button>
                  <button className="tp-tool-btn" onClick={themeFromPhoto} title="Build a theme from this page's photo colours">
                    <BgColorsOutlined /> Theme from photo
                  </button>
                  <button className="tp-tool-btn" onClick={designCover}>
                    <BookOutlined /> Design cover
                  </button>
                  <button className="tp-tool-btn" onClick={() => setStoryOpen(true)}>
                    <TableOutlined /> Storyboard
                  </button>
                </div>

                <div className="tp-props-label">Page spacing</div>
                <Field label="Photo gap" value={`${pageGap}px${activeSheet.gap === undefined ? " · album" : ""}`}>
                  <input type="range" min={0} max={40} value={pageGap} onChange={(e) => setPageSpacing({ gap: Number(e.target.value) })} />
                </Field>
                <Field label="Corner rounding" value={`${pageRadius}px${activeSheet.radius === undefined ? " · album" : ""}`}>
                  <input type="range" min={0} max={50} value={pageRadius} onChange={(e) => setPageSpacing({ radius: Number(e.target.value) })} />
                </Field>
                {(activeSheet.gap !== undefined || activeSheet.radius !== undefined) && (
                  <button className="tp-link-btn" onClick={() => setPageSpacing({ gap: undefined, radius: undefined })}>
                    Use album defaults
                  </button>
                )}

                <div className="tp-props-label">Page style</div>
                <div className="tp-tool-grid">
                  <button className="tp-tool-btn" onClick={copyPageStyle}><CopyOutlined /> Copy style</button>
                  <button className="tp-tool-btn" onClick={() => pastePageStyle(false)} disabled={!styleClip}>
                    <CheckOutlined /> Paste here
                  </button>
                  <button className="tp-tool-btn wide" onClick={() => pastePageStyle(true)} disabled={!styleClip}>
                    <AppstoreOutlined /> Paste to every inner page
                  </button>
                </div>

                <div className="tp-props-label">Print guides</div>
                <label className="tp-check">
                  <input type="checkbox" checked={settings.showGuides} onChange={(e) => setSettings((s) => ({ ...s, showGuides: e.target.checked }))} />
                  Thirds grid
                </label>
                <label className="tp-check">
                  <input type="checkbox" checked={settings.showSafe} onChange={(e) => setSettings((s) => ({ ...s, showSafe: e.target.checked }))} />
                  Print-safe margin
                </label>
                <label className="tp-check">
                  <input type="checkbox" checked={settings.showBleed} onChange={(e) => setSettings((s) => ({ ...s, showBleed: e.target.checked }))} />
                  Bleed zone
                </label>

                <div className="tp-props-label">Export</div>
                <div className="tp-tool-grid">
                  <button className="tp-tool-btn" onClick={exportPagePng}><FileImageOutlined /> Page as PNG</button>
                  <button className="tp-tool-btn" onClick={exportAlbumFile}><DownloadOutlined /> Album file</button>
                </div>
              </div>
            )}

            {rightTab === "comments" && (
              <div className="tp-props-body">
                {comments.length === 0 ? (
                  <div className="tp-empty-tab">No comments yet on this version.</div>
                ) : (
                  <div className="tp-comment-list">
                    {comments.map((c) => (
                      <div key={c.id} className="tp-comment">
                        <div className="tp-comment-head">
                          <span className="tp-comment-author">{c.author}</span>
                          <span className="tp-comment-time">{c.time}</span>
                          <button className="tp-comment-del" onClick={() => deleteComment(c.id)}>
                            <CloseOutlined />
                          </button>
                        </div>
                        <div className="tp-comment-text">{c.text}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="tp-comment-composer">
                  <textarea
                    value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Leave a comment on this album…" rows={3}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postComment(); }}
                  />
                  <button className="tp-add-grid-btn" onClick={postComment}>
                    <SendOutlined /> Post comment
                  </button>
                </div>
              </div>
            )}

            {rightTab === "history" && (
              <div className="tp-props-body">
                {versions.length === 0 ? (
                  <div className="tp-empty-tab">Version history for “{albumName}” will appear here once you save.</div>
                ) : (
                  <div className="tp-version-list">
                    {[...versions].reverse().map((v) => (
                      <div key={v.id} className="tp-version">
                        <div className="tp-version-info">
                          <span className="tp-version-label">{v.label}</span>
                          <span className="tp-version-time">{v.time} · {v.sheetCount} sheets</span>
                        </div>
                        <button className="tp-version-restore" onClick={() => restoreVersion(v)}>
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* ── Bottom status bar ── */}
        <footer className={`tp-statusbar ${reviewOpen ? "tp-chrome-hidden" : ""}`}>
          <span>
            {CANVAS_W} × {CANVAS_H} px &nbsp;·&nbsp; {activeSheet.slots.length} slots &nbsp;·&nbsp; {layoutMeta.label}
            {activeSheet.textElements.length > 0 && (
              <>
                {" "}&nbsp;·&nbsp; {activeSheet.textElements.length} text/sticker{activeSheet.textElements.length > 1 ? "s" : ""}
              </>
            )}
            {" "}&nbsp;·&nbsp; {health.filled}/{health.total} photos placed
          </span>
          <div className="tp-zoom">
            <input type="range" min={20} max={150} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            <span>{zoom}%</span>
          </div>
        </footer>
      </section>

      {/* ── Settings modal ── */}
      {settingsOpen && (
        <div className="tp-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="tp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tp-modal-head">
              <h3>Preview settings</h3>
              <button className="tp-icon-btn ghost" onClick={() => setSettingsOpen(false)}>
                <CloseOutlined />
              </button>
            </div>

            <div className="tp-modal-body">
              <label className="tp-modal-field">
                <span>Photo spacing ({settings.gap}px)</span>
                <input type="range" min={0} max={24} value={settings.gap} onChange={(e) => setSettings((s) => ({ ...s, gap: Number(e.target.value) }))} />
              </label>

              <label className="tp-modal-field">
                <span>Corner rounding ({settings.radius}px)</span>
                <input type="range" min={0} max={40} value={settings.radius} onChange={(e) => setSettings((s) => ({ ...s, radius: Number(e.target.value) }))} />
              </label>

              <label className="tp-modal-toggle-row">
                <span>Show alignment guides</span>
                <span className="tp-toggle">
                  <input type="checkbox" checked={settings.showGuides} onChange={(e) => setSettings((s) => ({ ...s, showGuides: e.target.checked }))} />
                  <span className="tp-toggle-track"><span className="tp-toggle-thumb" /></span>
                </span>
              </label>

              <label className="tp-modal-toggle-row">
                <span>Show print-safe margin</span>
                <span className="tp-toggle">
                  <input type="checkbox" checked={settings.showSafe} onChange={(e) => setSettings((s) => ({ ...s, showSafe: e.target.checked }))} />
                  <span className="tp-toggle-track"><span className="tp-toggle-thumb" /></span>
                </span>
              </label>

              <label className="tp-modal-toggle-row">
                <span>Show bleed zone</span>
                <span className="tp-toggle">
                  <input type="checkbox" checked={settings.showBleed} onChange={(e) => setSettings((s) => ({ ...s, showBleed: e.target.checked }))} />
                  <span className="tp-toggle-track"><span className="tp-toggle-thumb" /></span>
                </span>
              </label>

              <label className="tp-modal-toggle-row">
                <span>Preview mode (hide edit controls)</span>
                <span className="tp-toggle">
                  <input type="checkbox" checked={previewMode} onChange={(e) => setPreviewMode(e.target.checked)} />
                  <span className="tp-toggle-track"><span className="tp-toggle-thumb" /></span>
                </span>
              </label>
            </div>

            <div className="tp-modal-foot">
              <button className="tp-btn-primary" onClick={() => setSettingsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Album health modal ── */}
      {healthOpen && (
        <div className="tp-modal-overlay" onClick={() => setHealthOpen(false)}>
          <div className="tp-modal-card tp-health-card" onClick={(e) => e.stopPropagation()}>
            <div className="tp-modal-head">
              <h3>Album health</h3>
              <button className="tp-icon-btn ghost" onClick={() => setHealthOpen(false)}>
                <CloseOutlined />
              </button>
            </div>
            <div className="tp-modal-body">
              <div className="tp-health-summary">
                <div className="tp-health-bar"><i style={{ width: `${health.pct}%` }} /></div>
                <span>{health.filled} of {health.total} slots filled ({health.pct}%)</span>
              </div>

              {(unusedInTray > 0 || emptyPages > 0 || health.filled > 0) && (
                <div className="tp-health-actions">
                  {unusedInTray > 0 && (
                    <button onClick={autoFillEmpty}><ThunderboltOutlined /> Fill from tray</button>
                  )}
                  {emptyPages > 0 && (
                    <button onClick={removeEmptyPages}><DeleteOutlined /> Remove {emptyPages} empty page{emptyPages > 1 ? "s" : ""}</button>
                  )}
                  {health.filled > 0 && (
                    <button onClick={smartFocusAll}><AimOutlined /> Smart focus all</button>
                  )}
                </div>
              )}

              {healthIssues === 0 && (
                <div className="tp-health-ok"><CheckCircleOutlined /> Every slot is filled and every photo looks print-ready.</div>
              )}

              {health.empty.length > 0 && (
                <div className="tp-health-group">
                  <h4>Empty slots</h4>
                  {health.empty.map((e) => (
                    <button key={e.sheetId} className="tp-health-row" onClick={() => jumpToSheet(e.sheetId)}>
                      <span>{e.name}</span>
                      <em>{e.count} empty</em>
                    </button>
                  ))}
                </div>
              )}

              {health.lowRes.length > 0 && (
                <div className="tp-health-group">
                  <h4>Low resolution (under {LOW_RES_EDGE}px)</h4>
                  {health.lowRes.map((l, i) => (
                    <button key={`${l.sheetId}_${i}`} className="tp-health-row warn" onClick={() => jumpToSheet(l.sheetId)}>
                      <span>{l.name} · {l.file}</span>
                      <em>{l.edge}px</em>
                    </button>
                  ))}
                </div>
              )}

              {health.dupes > 0 && (
                <div className="tp-health-group">
                  <h4>Repeated photos</h4>
                  <div className="tp-health-note">{health.dupes} photo{health.dupes > 1 ? "s are" : " is"} used on more than one slot.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Storyboard overview ── */}
      {storyOpen && (
        <div className="tp-modal-overlay" onClick={() => setStoryOpen(false)}>
          <div className="tp-modal-card tp-story-card" onClick={(e) => e.stopPropagation()}>
            <div className="tp-modal-head">
              <h3>Storyboard · {sheets.length} pages · {totalSpreads} spreads</h3>
              <button className="tp-icon-btn ghost" onClick={() => setStoryOpen(false)} aria-label="Close storyboard">
                <CloseOutlined />
              </button>
            </div>
            <div className="tp-story-hint">Drag a page onto another to reorder. Click a page to open it.</div>
            <div className="tp-story-grid">
              {Array.from({ length: totalSpreads }, (_, i) => {
                const l = spreadLeft(i);
                const r = spreadRight(i);
                const pages = i === 0 ? [r] : [l, r];
                return (
                  <div key={i} className={`tp-story-spread ${i === 0 ? "cover" : ""}`}>
                    <span className="tp-story-tag">{i === 0 ? "Cover" : `Spread ${i}`}</span>
                    <div className="tp-story-pages">
                      {pages.map((pg, j) =>
                        pg ? (
                          <div
                            key={pg.id}
                            className={`tp-story-page ${pg.id === activeSheetId ? "active" : ""} ${dragSheetId === pg.id ? "dragging" : ""}`}
                            draggable
                            onDragStart={() => setDragSheetId(pg.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); handleSheetDrop(pg.id); }}
                            onDragEnd={() => setDragSheetId(null)}
                            onClick={() => { setActiveSheetId(pg.id); setStoryOpen(false); }}
                            title={pg.name}
                          >
                            <SheetMini sheet={pg} />
                            <span className="tp-story-num">{sheets.indexOf(pg) + 1}</span>
                            <button
                              className="tp-story-dup"
                              onClick={(e) => { e.stopPropagation(); duplicateSheet(pg.id); }}
                              aria-label="Duplicate page"
                              title="Duplicate page"
                            >
                              <CopyOutlined />
                            </button>
                          </div>
                        ) : (
                          <div key={`blank_${j}`} className="tp-story-page blank" />
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Keyboard shortcuts ── */}
      {helpOpen && (
        <div className="tp-modal-overlay" onClick={() => setHelpOpen(false)}>
          <div className="tp-modal-card tp-help-card" onClick={(e) => e.stopPropagation()}>
            <div className="tp-modal-head">
              <h3>Keyboard shortcuts</h3>
              <button className="tp-icon-btn ghost" onClick={() => setHelpOpen(false)} aria-label="Close shortcuts">
                <CloseOutlined />
              </button>
            </div>
            <div className="tp-modal-body">
              <div className="tp-help-grid">
                {SHORTCUTS.map((s) => (
                  <div key={s.keys + s.label} className="tp-help-row">
                    <span>{s.label}</span>
                    <kbd>{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Command palette ── */}
      {cmdOpen && (
        <div className="tp-cmd-overlay" onClick={() => setCmdOpen(false)}>
          <div className="tp-cmd" onClick={(e) => e.stopPropagation()}>
            <div className="tp-cmd-input">
              <SearchOutlined />
              <input
                ref={cmdInputRef}
                value={cmdQuery}
                placeholder="Type a command, theme or page name…"
                onChange={(e) => { setCmdQuery(e.target.value); setCmdIndex(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setCmdIndex((i) => Math.min(i + 1, cmdResults.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setCmdIndex((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter") { e.preventDefault(); runCommand(cmdResults[cmdIndex]); }
                  else if (e.key === "Escape") setCmdOpen(false);
                }}
              />
            </div>
            <div className="tp-cmd-list">
              {cmdResults.length === 0 && <div className="tp-cmd-empty">No matching commands</div>}
              {cmdResults.map((c, i) => (
                <button
                  key={c.id}
                  className={`tp-cmd-item ${i === cmdIndex ? "active" : ""}`}
                  onMouseEnter={() => setCmdIndex(i)}
                  onClick={() => runCommand(c)}
                  ref={(el) => { if (el && i === cmdIndex) el.scrollIntoView({ block: "nearest" }); }}
                >
                  <span className="tp-cmd-group">{c.group}</span>
                  <span className="tp-cmd-label">{c.label}</span>
                  {c.hint && <kbd>{c.hint}</kbd>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review Album — cover page + real two-page-spread flip-book */}
      {reviewOpen &&
        createPortal(
          <div className="ab-overlay" ref={overlayRef} onClick={closeReview}>
            <div className="ab-shell" onClick={(e) => e.stopPropagation()}>
              <div className="ab-shell-head">
                <div className="ab-shell-title">
                  <BookOutlined /> {albumName}
                </div>
                <div className="ab-shell-actions">
                  <button
                    className={`ab-mini-btn ${autoPlay ? "active" : ""}`}
                    onClick={() => setAutoPlay((a) => !a)}
                    disabled={reviewIndex >= totalSpreads - 1 && !autoPlay}
                    title={autoPlay ? "Pause slideshow" : "Play as slideshow"}
                  >
                    {autoPlay ? <PauseCircleOutlined /> : <CaretRightOutlined />}
                    {autoPlay ? "Pause" : "Play"}
                  </button>
                  <button
                    className={`ab-mini-btn ${soundOn ? "active" : ""}`}
                    onClick={() => setSoundOn((s) => !s)}
                    title={soundOn ? "Mute page-turn sound" : "Enable page-turn sound"}
                  >
                    {soundOn ? <SoundOutlined /> : <AudioMutedOutlined />}
                  </button>
                  <button className="ab-mini-btn" onClick={toggleReviewFullscreen} title="Full screen">
                    <FullscreenOutlined />
                  </button>
                  <button className="tp-icon-btn ghost" onClick={closeReview} aria-label="Close review">
                    <CloseOutlined />
                  </button>
                </div>
              </div>

              <div className="ab-book-stage">
                <button
                  className="ab-nav ab-nav-left"
                  onClick={() => { setAutoPlay(false); goToPage("backward"); }}
                  disabled={reviewIndex === 0 || !!turn}
                  aria-label="Previous page"
                >
                  <LeftOutlined />
                </button>

                <div
                  className={`ab-book ${showingCover ? "ab-book-cover" : ""} ${turn && !turn.committing ? "is-dragging" : ""}`}
                  style={{ aspectRatio: showingCover ? `${CANVAS_W} / ${CANVAS_H}` : `${CANVAS_W * 2} / ${CANVAS_H}` }}
                  ref={bookRef}
                  onPointerDown={onBookPointerDown}
                  onPointerMove={onBookPointerMove}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  onPointerLeave={(e) => {
                    if (dragMeta.current && e.buttons === 0) finishDrag();
                  }}
                >
                  {!showingCover && (
                    <>
                      <div className="ab-stack ab-stack-left" style={{ ["--pages" as any]: turnedCount }} aria-hidden />
                      <div className="ab-stack ab-stack-right" style={{ ["--pages" as any]: remainingCount }} aria-hidden />
                    </>
                  )}

                  {showingCover ? (
                    renderHardCover()
                  ) : (
                    <div className="ab-spread ab-spread-base" style={{ pointerEvents: turn ? "none" : "auto" }}>
                      <div className="ab-leaf ab-leaf-left">{renderAlbumPage(visibleLeft, vFirstPageNum)}</div>
                      <div className="ab-leaf ab-leaf-right">{renderAlbumPage(visibleRight, visibleRight ? vLastPageNum : undefined)}</div>
                    </div>
                  )}

                  {!showingCover && <div className="ab-gutter" />}

                  {!showingCover && (
                    <div className="ab-bookmark" aria-hidden>
                      <span>{progressPct}%</span>
                    </div>
                  )}

                  {turn && (
                    <div
                      ref={turnRef}
                      className={`ab-turn ${turn.dir === "forward" ? "turn-from-right" : "turn-from-left"}`}
                      style={{ transformOrigin: turn.dir === "forward" ? "left center" : "right center" }}
                    >
                      <div className="ab-flip-face ab-flip-front">
                        {turn.from === 0
                          ? renderHardCover()
                          : turn.dir === "forward"
                          ? renderAlbumPage(spreadRight(turn.from))
                          : renderAlbumPage(spreadLeft(turn.from))}
                      </div>
                      <div className="ab-flip-face ab-flip-back">
                        {turn.to === 0
                          ? renderHardCover()
                          : turn.dir === "forward"
                          ? renderAlbumPage(spreadLeft(turn.to))
                          : renderAlbumPage(spreadRight(turn.to))}
                      </div>
                      <div ref={shadowRef} className="ab-flip-shadow" />
                    </div>
                  )}

                  <div className="ab-page-shine" />
                </div>

                <button
                  className="ab-nav ab-nav-right"
                  onClick={() => { setAutoPlay(false); goToPage("forward"); }}
                  disabled={reviewIndex === totalSpreads - 1 || !!turn}
                  aria-label="Next page"
                >
                  <RightOutlined />
                </button>
              </div>

              <div className="ab-shell-foot">
                <span className="ab-page-count">
                  {reviewIndex === 0
                    ? `Cover — Page 1 of ${sheets.length}`
                    : firstPageNum === lastPageNum
                    ? `Page ${firstPageNum} of ${sheets.length}`
                    : `Pages ${firstPageNum}–${lastPageNum} of ${sheets.length}`}
                  {" — "}
                  {reviewIndex === 0 ? currentRight?.name : currentLeft?.name}
                  {reviewIndex !== 0 && currentRight ? ` · ${currentRight.name}` : ""}
                </span>

                <div className="ab-filmstrip" role="tablist" aria-label="Jump to page">
                  {Array.from({ length: totalSpreads }, (_, i) => {
                    const left = spreadLeft(i);
                    const right = spreadRight(i);
                    return (
                      <button
                        key={i}
                        className={`ab-film-thumb ${i === reviewIndex ? "active" : ""}`}
                        onClick={() => { setAutoPlay(false); jumpToPage(i); }}
                        title={i === 0 ? right?.name ?? "Cover" : `${left?.name ?? ""}${right ? ` · ${right.name}` : ""}`}
                        aria-label={i === 0 ? "Go to cover" : `Go to spread ${i}`}
                      >
                        {i === 0 ? (
                          <span className="ab-film-mini ab-film-mini-cover" style={{ background: right?.bgImage ? undefined : right?.bgColor || "#4a2517" }} />
                        ) : (
                          <>
                            <span className="ab-film-mini" style={{ background: left?.bgImage ? `url(${left.bgImage}) center/cover` : left?.bgColor || "#eef1f5" }} />
                            <span className="ab-film-mini" style={{ background: right?.bgImage ? `url(${right.bgImage}) center/cover` : right?.bgColor || "#eef1f5" }} />
                          </>
                        )}
                        <span className="ab-film-label">{i === 0 ? "Cover" : i}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}

/* ───────────────────────────── Route entry ─────────────────────────────
 * 1. Waits for the IndexedDB-backed library cache, so `getAlbumById` can actually find the album.
 * 2. Remounts the editor on every navigation (key = location.key), so `boot` re-reads the hand-off
 *    each time you arrive from the event flow or the library.
 */
export default function TemplateEditorPage() {
  const location = useLocation();
  const [ready, setReady] = useState<boolean>(isLibraryReady());

  useEffect(() => {
    if (ready) return;
    let alive = true;
    whenLibraryReady().then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [ready]);

  if (!ready) {
    return (
      <main className="tp-page">
        <p style={{ color: "#cbd8e7", padding: 40 }}>Loading library…</p>
      </main>
    );
  }

  return <TemplateEditorInner key={location.key} />;
}