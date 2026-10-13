import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined, UndoOutlined, RedoOutlined, QuestionCircleOutlined, VideoCameraOutlined, PictureOutlined,
  PlusOutlined, DeleteOutlined, CopyOutlined, CaretRightOutlined, PauseOutlined, StepBackwardOutlined,
  StepForwardOutlined, ScissorOutlined, SoundOutlined, AudioMutedOutlined, CustomerServiceOutlined,
  FontSizeOutlined, TagsOutlined, ThunderboltOutlined, SettingOutlined, DownloadOutlined, UploadOutlined,
  CloseOutlined, CheckOutlined, ZoomInOutlined, ZoomOutOutlined, ExportOutlined, CameraOutlined, AudioOutlined,
  SyncOutlined, FileImageOutlined, FileTextOutlined, YoutubeOutlined, RocketOutlined,
  RotateLeftOutlined, RotateRightOutlined, LeftOutlined, RightOutlined,
  SaveOutlined, FullscreenOutlined, FolderOpenOutlined, EyeOutlined, ReloadOutlined, CheckCircleOutlined,
  WarningOutlined, InfoCircleOutlined, SwapOutlined, RetweetOutlined,
} from "@ant-design/icons";
import { saveVideo, updateVideo } from "../../../utils/videoLibraryStore";
import "./VideoEditorPage.css";

/* ───────────────────────────── Types ───────────────────────────── */

type ClipKind = "image" | "video" | "card";
type Fit = "cover" | "contain" | "blur";
type Motion = "none" | "zoomIn" | "zoomOut" | "panLeft" | "panRight" | "panUp";
type TransitionId = "none" | "fade" | "slideLeft" | "slideUp" | "zoom" | "wipe" | "dip";
type AspectId = "16:9" | "9:16" | "1:1" | "4:5" | "21:9";
type TextAnim = "none" | "fade" | "pop" | "slideUp" | "type";
type RTab = "clip" | "text" | "audio" | "project" | "cover" | "details" | "export";

interface MediaItem { id: string; kind: "image" | "video"; url: string; name: string; w: number; h: number; duration: number; thumb: string; }
interface CardData { title: string; sub: string; c1: string; c2: string; color: string; font: string; }
interface Adjust { b: number; c: number; s: number; }

interface Tf { x: number; y: number; scale: number; rot: number; }
interface Clip {
  id: string; kind: ClipKind; url: string; name: string; thumb?: string;
  duration: number; trimStart: number; srcDuration: number; speed: number;
  muted: boolean; volume: number; fit: Fit; filter: string; adj: Adjust; motion: Motion;
  transition: TransitionId; transDur: number; flip: boolean; card?: CardData;
  srcW: number; srcH: number; tf: Tf;
}
interface TextOv {
  id: string; text: string; start: number; dur: number; x: number; y: number; w: number; h: number; rotate: number;
  color: string; font: string; size: number; bold: boolean; italic: boolean; align: "left" | "center" | "right";
  bg: string; shadow: boolean; stroke: number; strokeColor: string; opacity: number; anim: TextAnim;
}
interface AudioTrack {
  id: string; name: string; url: string; start: number; len: number; duration: number; trimStart: number;
  volume: number; fadeIn: number; fadeOut: number; loop: boolean; peaks: number[];
}
interface Watermark { url: string | null; pos: "tl" | "tr" | "bl" | "br"; size: number; opacity: number; }
interface Settings {
  aspect: AspectId; res: number; fps: number; bg: string; grade: string; vignette: boolean; letterbox: boolean;
  muteOriginal: boolean; origVol: number; musicVol: number; imageDur: number; defTransition: TransitionId; wm: Watermark;
  /** Whole-video fade from / to black (seconds, 0 = off). */
  fadeIn: number; fadeOut: number;
}
interface Proj { clips: Clip[]; texts: TextOv[]; tracks: AudioTrack[]; settings: Settings; }
interface Layout { starts: number[]; trans: number[]; total: number; }
interface Meta { title: string; desc: string; tags: string[]; category: string; visibility: string; }
interface Design {
  bg: "gradient" | "image" | "frame"; imageUrl: string | null; frameUrl: string | null; c1: string; c2: string;
  dim: number; blur: number; filter: string; vignette: boolean; title: string; sub: string; badge: string; font: string;
  color: string; accent: string; stroke: number; size: number; align: "left" | "center" | "right"; y: number; bar: boolean; showSafe: boolean;
}
type Sel = { t: "clip" | "text" | "audio"; id: string } | null;
/** A clip's on-screen box, in % of the frame (centre + size) plus rotation. */
interface ClipBox { cx: number; cy: number; w: number; h: number; rot: number; }
/** The last rendered video (kept in memory so it can be reviewed, downloaded or saved to the Video Album). */
interface ExportState {
  busy: boolean; url: string | null; blob: Blob | null; size: number; ext: string; err: string;
  rev: number; duration: number; w: number; h: number; savedId: string | null;
}
interface Issue { id: string; level: "warn" | "info"; text: string; fixLabel?: string; fix?: () => void; }

/* ───────────────────────────── Constants ───────────────────────────── */

/** Route of the Video Library ("video album") page — change if your route differs. */
const LIBRARY_PATH = "/video-library";
const GUT = 64;
const DEF_TF: Tf = { x: 0, y: 0, scale: 1, rot: 0 };
const EXP0: ExportState = { busy: false, url: null, blob: null, size: 0, ext: "webm", err: "", rev: 0, duration: 0, w: 0, h: 0, savedId: null };
const FONTS = [
  "'Poppins', 'Segoe UI', sans-serif",
  "'Playfair Display', Georgia, serif",
  "'Montserrat', 'Segoe UI', sans-serif",
  "'Caveat', 'Segoe Print', cursive",
  "'Bebas Neue', Impact, sans-serif",
  "'Cinzel', 'Times New Roman', serif",
  "'Great Vibes', 'Segoe Script', cursive",
  "Georgia, serif",
  "'Courier New', monospace",
];
const fontName = (f: string) => f.split(",")[0].replace(/'/g, "");

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Original", css: "none" },
  { id: "bw", label: "B & W", css: "grayscale(1) contrast(1.05)" },
  { id: "sepia", label: "Sepia", css: "sepia(0.65) contrast(1.02) saturate(1.1)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.55) contrast(1.1)" },
  { id: "fade", label: "Fade", css: "saturate(0.7) brightness(1.08) contrast(0.9)" },
  { id: "cool", label: "Cool", css: "hue-rotate(-10deg) saturate(1.1) brightness(1.02)" },
  { id: "warm", label: "Warm", css: "hue-rotate(8deg) saturate(1.2) brightness(1.04)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.35) brightness(0.92)" },
];
const MOTIONS: { id: Motion; label: string }[] = [
  { id: "none", label: "Still" }, { id: "zoomIn", label: "Zoom in" }, { id: "zoomOut", label: "Zoom out" },
  { id: "panLeft", label: "Pan left" }, { id: "panRight", label: "Pan right" }, { id: "panUp", label: "Pan up" },
];
const TRANSITIONS: { id: TransitionId; label: string }[] = [
  { id: "none", label: "Cut" }, { id: "fade", label: "Fade" }, { id: "slideLeft", label: "Slide" }, { id: "slideUp", label: "Rise" },
  { id: "zoom", label: "Zoom" }, { id: "wipe", label: "Wipe" }, { id: "dip", label: "Dip to black" },
];
const FITS: { id: Fit; label: string }[] = [{ id: "cover", label: "Fill" }, { id: "contain", label: "Fit" }, { id: "blur", label: "Blur bars" }];
const ASPECTS: { id: AspectId; label: string; w: number; h: number }[] = [
  { id: "16:9", label: "16:9 YouTube", w: 16, h: 9 }, { id: "9:16", label: "9:16 Reels/Shorts", w: 9, h: 16 },
  { id: "1:1", label: "1:1 Square", w: 1, h: 1 }, { id: "4:5", label: "4:5 Portrait", w: 4, h: 5 }, { id: "21:9", label: "21:9 Cinema", w: 21, h: 9 },
];
const ANIMS: { id: TextAnim; label: string }[] = [
  { id: "none", label: "None" }, { id: "fade", label: "Fade" }, { id: "pop", label: "Pop" }, { id: "slideUp", label: "Rise" }, { id: "type", label: "Typewriter" },
];
const EMOJI = ["❤️", "🔥", "✨", "⭐", "🎉", "😍", "😂", "👍", "🎬", "📸", "🎵", "💯", "🚀", "👑", "🌈", "💥", "⚡", "🎁", "🏆", "👀"];
const CATEGORIES = ["Film & Animation", "Music", "Travel & Events", "People & Blogs", "Education", "Entertainment", "Howto & Style", "Sports", "Gaming", "News & Politics"];
const MIMES: [string, string][] = [
  ["mp4", "video/mp4;codecs=avc1.42E01E,mp4a.40.2"], ["mp4", "video/mp4"],
  ["webm", "video/webm;codecs=vp9,opus"], ["webm", "video/webm;codecs=vp8,opus"], ["webm", "video/webm"],
];
const STOP = new Set("the a an and or of to in on for with from this that is are was were be it its at by as your our my we you i about into over how what why when".split(" "));
const SHORTCUTS: [string, string][] = [
  ["Space", "Play / pause"], ["← / →", "Step 1 frame (Shift = 1 sec)"], ["Home / End", "Jump to start / end"],
  ["[ / ]", "Jump to previous / next clip"], ["F", "Full-screen preview (plays from start)"],
  ["Ctrl S", "Save to Video Album (renders first if needed)"],
  ["S", "Split clip at playhead"], ["Ctrl D", "Duplicate selected"], ["Del", "Delete selected"],
  ["M", "Mute / unmute selected clip"], ["Ctrl Z / Ctrl Shift Z", "Undo / redo"], ["L", "Toggle loop"],
  ["Drag photo on preview", "Move the photo"], ["Corner dots", "Resize the selected photo"], ["Green dot", "Rotate the selected photo"],
  ["Drag on preview (text)", "Move a text layer"], ["Drag thumbnail in Order panel", "Rearrange photos"],
  ["Drag clip block", "Reorder clips on the timeline"], ["Drag block edge", "Change duration"], ["?", "This list"],
];

const DEFAULT_SETTINGS: Settings = {
  aspect: "16:9", res: 720, fps: 30, bg: "#000000", grade: "none", vignette: false, letterbox: false,
  muteOriginal: false, origVol: 100, musicVol: 80, imageDur: 3, defTransition: "fade",
  wm: { url: null, pos: "br", size: 14, opacity: 85 }, fadeIn: 0, fadeOut: 0,
};

/* ───────────────────────────── Helpers ───────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const r2 = (n: number) => Math.round(n * 100) / 100;
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeBack = (p: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const fmt = (t: number) => {
  const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t % 1) * 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
};
const fmtMB = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);
const safeFile = (s: string) => (s || "video").trim().replace(/[^\w\-]+/g, "_");

function dims(s: Settings) {
  const a = ASPECTS.find((x) => x.id === s.aspect) ?? ASPECTS[0];
  let W: number, H: number;
  if (a.w >= a.h) { H = s.res; W = Math.round((s.res * a.w) / a.h); } else { W = s.res; H = Math.round((s.res * a.h) / a.w); }
  return { W: W - (W % 2), H: H - (H % 2) };
}

function layoutOf(clips: Clip[]): Layout {
  const starts: number[] = [], trans: number[] = [];
  let end = 0;
  clips.forEach((c, i) => {
    const tr = i === 0 || c.transition === "none" ? 0 : Math.min(c.transDur, clips[i - 1].duration * 0.9, c.duration * 0.9);
    const s = i === 0 ? 0 : Math.max(0, end - tr);
    starts.push(s); trans.push(tr); end = s + c.duration;
  });
  return { starts, trans, total: end };
}

/** 0..1 factor for the whole-video fade in / out (used for picture and sound). */
function fadeFactor(t: number, total: number, s: Settings): number {
  let f = 1;
  if (s.fadeIn > 0) f = Math.min(f, clamp(t / s.fadeIn, 0, 1));
  if (s.fadeOut > 0) f = Math.min(f, clamp((total - t) / s.fadeOut, 0, 1));
  return f;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Small JPEG snapshot of a canvas (used as the album cover). */
function snapThumb(cv: HTMLCanvasElement, h = 360): string | null {
  try {
    const k = h / Math.max(1, cv.height);
    const o = document.createElement("canvas");
    o.width = Math.max(1, Math.round(cv.width * k)); o.height = h;
    o.getContext("2d")?.drawImage(cv, 0, 0, o.width, o.height);
    return o.toDataURL("image/jpeg", 0.78);
  } catch { return null; }
}

/** MediaRecorder files report an infinite length until they are seeked once; this makes the scrub bar work. */
function fixDuration(e: React.SyntheticEvent<HTMLVideoElement>) {
  const v = e.currentTarget;
  if (v.duration === Infinity) {
    v.currentTime = 1e101;
    v.ontimeupdate = () => { v.ontimeupdate = null; v.currentTime = 0; };
  }
}

function dragger(e: React.PointerEvent, onMove: (dx: number, dy: number, ev: PointerEvent) => void, onEnd?: () => void) {
  e.preventDefault(); e.stopPropagation();
  const sx = e.clientX, sy = e.clientY;
  const mv = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy, ev);
  const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); onEnd?.(); };
  window.addEventListener("pointermove", mv);
  window.addEventListener("pointerup", up);
}

/* ── media caches ── */
const imgCache = new Map<string, HTMLImageElement | "loading" | "error">();
function getImage(url: string): HTMLImageElement | null {
  const c = imgCache.get(url);
  if (c instanceof HTMLImageElement) return c;
  if (!c) {
    imgCache.set(url, "loading");
    const im = new Image();
    im.onload = () => imgCache.set(url, im);
    im.onerror = () => imgCache.set(url, "error");
    im.src = url;
  }
  return null;
}
function loadImg(url: string): Promise<HTMLImageElement> {
  const c = imgCache.get(url);
  if (c instanceof HTMLImageElement) return Promise.resolve(c);
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { imgCache.set(url, im); res(im); };
    im.onerror = rej;
    im.src = url;
  });
}
const videoEls = new Map<string, HTMLVideoElement>();
function getVideoEl(c: Clip): HTMLVideoElement {
  let v = videoEls.get(c.id);
  if (!v || v.dataset.src !== c.url) {
    v = document.createElement("video");
    v.dataset.src = c.url; v.src = c.url; v.preload = "auto"; v.playsInline = true; v.muted = false;
    v.load();
    videoEls.set(c.id, v);
  }
  return v;
}
const audioEls = new Map<string, HTMLAudioElement>();
function getAudioEl(t: AudioTrack): HTMLAudioElement {
  let a = audioEls.get(t.id);
  if (!a) { a = new Audio(); a.src = t.url; a.preload = "auto"; audioEls.set(t.id, a); }
  a.loop = t.loop;
  return a;
}

function probeVideo(url: string): Promise<{ w: number; h: number; duration: number; thumb: string }> {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    v.preload = "auto"; v.muted = true; v.playsInline = true; v.src = url;
    v.onloadedmetadata = () => { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); };
    v.onseeked = () => {
      const cv = document.createElement("canvas");
      const k = 160 / Math.max(1, v.videoHeight);
      cv.width = Math.max(1, Math.round(v.videoWidth * k)); cv.height = 160;
      cv.getContext("2d")?.drawImage(v, 0, 0, cv.width, cv.height);
      res({ w: v.videoWidth, h: v.videoHeight, duration: v.duration, thumb: cv.toDataURL("image/jpeg", 0.7) });
    };
    v.onerror = () => rej(new Error("video"));
  });
}

async function analyzeAudio(url: string): Promise<{ duration: number; peaks: number[] }> {
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AC();
    try {
      const ab = await ctx.decodeAudioData(buf);
      const ch = ab.getChannelData(0);
      const N = 240, step = Math.floor(ch.length / N) || 1;
      const peaks: number[] = [];
      for (let i = 0; i < N; i++) {
        let m = 0;
        for (let j = i * step; j < Math.min(ch.length, (i + 1) * step); j += Math.max(1, Math.floor(step / 40))) m = Math.max(m, Math.abs(ch[j]));
        peaks.push(m);
      }
      const mx = Math.max(...peaks, 0.001);
      return { duration: ab.duration, peaks: peaks.map((p) => r2(p / mx)) };
    } finally { ctx.close().catch(() => {}); }
  } catch {
    const duration = await new Promise<number>((res) => {
      const a = new Audio(url);
      a.onloadedmetadata = () => res(a.duration || 30);
      a.onerror = () => res(30);
    });
    return { duration, peaks: Array.from({ length: 120 }, (_, i) => 0.3 + 0.4 * Math.abs(Math.sin(i / 3))) };
  }
}

function wrapLines(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  text.split("\n").forEach((par) => {
    let line = "";
    par.split(" ").forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    });
    lines.push(line);
  });
  return lines;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath();
}

const clipFilter = (c: Clip, grade: string) => {
  const parts: string[] = [];
  if (c.filter && c.filter !== "none") parts.push(c.filter);
  if (c.adj.b !== 100 || c.adj.c !== 100 || c.adj.s !== 100) parts.push(`brightness(${c.adj.b}%) contrast(${c.adj.c}%) saturate(${c.adj.s}%)`);
  if (grade && grade !== "none") parts.push(grade);
  return parts.length ? parts.join(" ") : "none";
};

/** Camera-motion zoom/pan at progress p (0..1). */
function motionOf(c: Clip, p: number) {
  let s = 1, ox = 0, oy = 0;
  switch (c.motion) {
    case "zoomIn": s = 1 + 0.18 * p; break;
    case "zoomOut": s = 1.18 - 0.18 * p; break;
    case "panLeft": s = 1.15; ox = 0.04 - 0.08 * p; break;
    case "panRight": s = 1.15; ox = -0.04 + 0.08 * p; break;
    case "panUp": s = 1.15; oy = 0.04 - 0.08 * p; break;
  }
  return { s, ox, oy };
}

/** Where a photo/video clip sits on the frame right now (used for the on-canvas handles and hit testing). */
function clipBox(c: Clip, t: number, W: number, H: number, lay: Layout, i: number): ClipBox | null {
  if (c.kind === "card") return null;
  const ar = c.srcW > 0 && c.srcH > 0 ? c.srcW / c.srcH : 16 / 9;
  const cr = W / H;
  const cover: [number, number] = ar > cr ? [H * ar, H] : [W, W / ar];
  const contain: [number, number] = ar > cr ? [W, W / ar] : [H * ar, H];
  const [bw, bh] = c.fit === "cover" ? cover : contain;
  const p = clamp((t - lay.starts[i]) / Math.max(0.01, c.duration), 0, 1);
  const m = motionOf(c, p);
  const tf = c.tf ?? DEF_TF;
  const k = m.s * tf.scale;
  return { cx: 50 + m.ox * 100 + tf.x, cy: 50 + m.oy * 100 + tf.y, w: ((bw * k) / W) * 100, h: ((bh * k) / H) * 100, rot: tf.rot };
}

/** Is the point (px, py in % of frame) inside the (rotated) box? rw/rh are the frame's on-screen pixel size. */
function hitBox(b: ClipBox, px: number, py: number, rw: number, rh: number) {
  const dx = ((px - b.cx) / 100) * rw, dy = ((py - b.cy) / 100) * rh;
  const a = (-b.rot * Math.PI) / 180;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= ((b.w / 100) * rw) / 2 && Math.abs(ly) <= ((b.h / 100) * rh) / 2;
}

/* ───────────────────────────── Render engine ───────────────────────────── */

interface Fx { alpha: number; dx: number; dy: number; scale: number; wipe: number; }

function fxFor(i: number, t: number, lay: Layout, clips: Clip[], W: number, H: number): Fx {
  const c = clips[i];
  const fx: Fx = { alpha: 1, dx: 0, dy: 0, scale: 1, wipe: 1 };
  const tr = lay.trans[i], s = lay.starts[i];
  if (tr > 0 && t < s + tr) {
    const p = ease(clamp((t - s) / tr, 0, 1));
    switch (c.transition) {
      case "fade": fx.alpha = p; break;
      case "slideLeft": fx.dx = (1 - p) * W; break;
      case "slideUp": fx.dy = (1 - p) * H; break;
      case "zoom": fx.scale = 1.35 - 0.35 * p; fx.alpha = p; break;
      case "wipe": fx.wipe = p; break;
      case "dip": fx.alpha = p < 0.5 ? 0 : (p - 0.5) * 2; break;
    }
  }
  const n = clips[i + 1];
  const nt = lay.trans[i + 1] ?? 0;
  if (n && nt > 0) {
    const ns = lay.starts[i + 1];
    if (t >= ns && t < ns + nt) {
      const p = ease(clamp((t - ns) / nt, 0, 1));
      if (n.transition === "slideLeft") fx.dx = -p * W * 0.35;
      else if (n.transition === "slideUp") fx.dy = -p * H * 0.35;
      else if (n.transition === "dip") fx.alpha = p < 0.5 ? 1 - p * 2 : 0;
    }
  }
  return fx;
}

/** 0..1 audio factor for a clip (cross-fades its sound during transitions). */
function audioFactor(i: number, t: number, lay: Layout, clips: Clip[]): number {
  let f = 1;
  const tr = lay.trans[i], s = lay.starts[i];
  if (tr > 0 && t < s + tr) f *= clamp((t - s) / tr, 0, 1);
  const nt = lay.trans[i + 1] ?? 0;
  if (clips[i + 1] && nt > 0) {
    const ns = lay.starts[i + 1];
    if (t >= ns && t < ns + nt) f *= 1 - clamp((t - ns) / nt, 0, 1);
  }
  return f;
}

function drawCard(g: CanvasRenderingContext2D, cd: CardData, W: number, H: number) {
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, cd.c1); gr.addColorStop(1, cd.c2);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = cd.color; g.textAlign = "center"; g.textBaseline = "middle";
  const px = Math.min(W, H * 1.4) * 0.09;
  g.font = `800 ${px}px ${cd.font}`;
  const lines = wrapLines(g, cd.title, W * 0.82);
  const lh = px * 1.15;
  const y0 = H * 0.46 - ((lines.length - 1) * lh) / 2;
  g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = px * 0.25;
  lines.forEach((ln, i) => g.fillText(ln, W / 2, y0 + i * lh));
  if (cd.sub) {
    g.shadowBlur = 0;
    g.globalAlpha = 0.85;
    g.font = `500 ${px * 0.42}px ${cd.font}`;
    g.fillText(cd.sub, W / 2, y0 + (lines.length - 1) * lh + px * 1.1);
  }
  g.shadowColor = "transparent"; g.globalAlpha = 1;
}

function drawClip(g: CanvasRenderingContext2D, c: Clip, i: number, t: number, W: number, H: number, clips: Clip[], lay: Layout, grade: string) {
  const fx = fxFor(i, t, lay, clips, W, H);
  if (fx.alpha <= 0.001) return;
  const p = clamp((t - lay.starts[i]) / Math.max(0.01, c.duration), 0, 1);
  g.save();
  if (fx.wipe < 1) { g.beginPath(); g.rect(0, 0, W * fx.wipe, H); g.clip(); }
  g.globalAlpha = fx.alpha;
  g.translate(fx.dx, fx.dy);
  if (fx.scale !== 1) { g.translate(W / 2, H / 2); g.scale(fx.scale, fx.scale); g.translate(-W / 2, -H / 2); }

  if (c.kind === "card" && c.card) drawCard(g, c.card, W, H);
  else {
    let src: CanvasImageSource | null = null, sw = 0, sh = 0;
    if (c.kind === "image") {
      const im = getImage(c.url);
      if (im) { src = im; sw = im.naturalWidth; sh = im.naturalHeight; }
    } else {
      const v = getVideoEl(c);
      if (v.readyState >= 2 && v.videoWidth) { src = v; sw = v.videoWidth; sh = v.videoHeight; }
    }
    if (src && sw && sh) {
      const ar = sw / sh, cr = W / H;
      const cover = (): [number, number] => (ar > cr ? [H * ar, H] : [W, W / ar]);
      const contain = (): [number, number] => (ar > cr ? [W, W / ar] : [H * ar, H]);
      const filt = clipFilter(c, grade);
      if (c.fit === "blur") {
        const [bw, bh] = cover();
        g.save();
        g.filter = `blur(${Math.round(W * 0.03)}px) brightness(0.65)`;
        g.drawImage(src, (W - bw * 1.2) / 2, (H - bh * 1.2) / 2, bw * 1.2, bh * 1.2);
        g.restore();
      }
      const [dw, dh] = c.fit === "cover" ? cover() : contain();
      const m = motionOf(c, p);
      const tf = c.tf ?? DEF_TF;
      g.save();
      g.translate(W / 2 + m.ox * W + (tf.x / 100) * W, H / 2 + m.oy * H + (tf.y / 100) * H);
      g.rotate((tf.rot * Math.PI) / 180);
      g.scale((c.flip ? -1 : 1) * m.s * tf.scale, m.s * tf.scale);
      g.filter = filt;
      g.drawImage(src, -dw / 2, -dh / 2, dw, dh);
      g.restore();
    }
  }
  g.restore();
}

function drawText(g: CanvasRenderingContext2D, el: TextOv, t: number, W: number, H: number) {
  if (t < el.start || t > el.start + el.dur) return;
  const local = t - el.start;
  const inP = clamp(local / 0.5, 0, 1), outP = clamp((el.dur - local) / 0.4, 0, 1);
  let alpha = el.opacity, sc = 1, dy = 0, txt = el.text;
  switch (el.anim) {
    case "fade": alpha *= Math.min(inP, outP); break;
    case "pop": sc = 0.6 + 0.4 * easeBack(inP); alpha *= Math.min(1, inP * 2) * outP; break;
    case "slideUp": dy = (1 - ease(inP)) * H * 0.08; alpha *= Math.min(inP, outP); break;
    case "type": {
      const n = Math.ceil(el.text.length * clamp(local / Math.max(0.6, Math.min(el.dur * 0.6, el.text.length * 0.07)), 0, 1));
      txt = el.text.slice(0, n); alpha *= outP; break;
    }
  }
  const bw = (el.w / 100) * W, bh = (el.h / 100) * H, bx = (el.x / 100) * W, by = (el.y / 100) * H + dy;
  const px = (el.size / 100) * W;
  g.save();
  g.globalAlpha = alpha;
  g.translate(bx + bw / 2, by + bh / 2);
  g.rotate((el.rotate * Math.PI) / 180);
  g.scale(sc, sc);
  if (el.bg && el.bg !== "transparent") { g.fillStyle = el.bg; roundRect(g, -bw / 2, -bh / 2, bw, bh, px * 0.2); g.fill(); }
  g.font = `${el.italic ? "italic " : ""}${el.bold ? 800 : 500} ${px}px ${el.font}`;
  g.textBaseline = "middle";
  g.textAlign = el.align;
  const pad = px * 0.4;
  const lines = wrapLines(g, txt, bw - pad * 2);
  const lh = px * 1.2;
  const y0 = (-(lines.length - 1) * lh) / 2;
  const tx = el.align === "left" ? -bw / 2 + pad : el.align === "right" ? bw / 2 - pad : 0;
  if (el.shadow) { g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = px * 0.25; g.shadowOffsetY = px * 0.05; }
  lines.forEach((ln, i) => {
    if (el.stroke > 0) { g.lineJoin = "round"; g.lineWidth = el.stroke * px * 0.12; g.strokeStyle = el.strokeColor; g.strokeText(ln, tx, y0 + i * lh); }
    g.fillStyle = el.color;
    g.fillText(ln, tx, y0 + i * lh);
  });
  g.restore();
}

function renderFrame(g: CanvasRenderingContext2D, W: number, H: number, t: number, p: Proj, lay: Layout, hint: boolean) {
  const s = p.settings;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.filter = "none"; g.shadowColor = "transparent";
  g.fillStyle = s.bg; g.fillRect(0, 0, W, H);
  const grade = FILTERS.find((f) => f.id === s.grade)?.css ?? "none";
  p.clips.forEach((c, i) => {
    const st = lay.starts[i];
    if (t < st || t > st + c.duration + 0.0001) return;
    drawClip(g, c, i, t, W, H, p.clips, lay, grade);
  });
  if (!p.clips.length && hint) {
    g.fillStyle = "rgba(160,190,220,0.7)"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `600 ${W * 0.03}px Poppins, sans-serif`;
    g.fillText("Add photos or videos to start", W / 2, H / 2);
  }
  if (s.vignette) {
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.6)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  p.texts.forEach((el) => drawText(g, el, t, W, H));
  if (s.wm.url) {
    const im = getImage(s.wm.url);
    if (im) {
      const w = (s.wm.size / 100) * W, h = (w * im.naturalHeight) / im.naturalWidth, m = W * 0.025;
      const x = s.wm.pos.endsWith("l") ? m : W - w - m, y = s.wm.pos.startsWith("t") ? m : H - h - m;
      g.globalAlpha = s.wm.opacity / 100; g.drawImage(im, x, y, w, h); g.globalAlpha = 1;
    }
  }
  if (s.letterbox) { g.fillStyle = "#000"; g.fillRect(0, 0, W, H * 0.11); g.fillRect(0, H * 0.89, W, H * 0.11); }
  if (p.clips.length && (s.fadeIn > 0 || s.fadeOut > 0)) {
    const ff = fadeFactor(t, lay.total, s);
    if (ff < 1) { g.globalAlpha = 1 - ff; g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
}

/* ── Cover designer (thumbnail / banner) ── */
const mkDesign = (kind: "thumb" | "banner"): Design => ({
  bg: "gradient", imageUrl: null, frameUrl: null, c1: "#0b1424", c2: kind === "thumb" ? "#7c3aed" : "#0ea5e9",
  dim: 35, blur: 0, filter: "none", vignette: true,
  title: kind === "thumb" ? "YOUR TITLE HERE" : "MY CHANNEL", sub: kind === "thumb" ? "Watch till the end" : "New videos every week",
  badge: kind === "thumb" ? "NEW" : "", font: FONTS[4], color: "#ffffff", accent: "#facc15", stroke: 0.8,
  size: kind === "thumb" ? 11 : 8, align: "center", y: 50, bar: true, showSafe: true,
});

async function paintDesign(cv: HTMLCanvasElement, cfg: Design, W: number, H: number) {
  const src = cfg.bg === "image" ? cfg.imageUrl : cfg.bg === "frame" ? cfg.frameUrl : null;
  let img: HTMLImageElement | null = null;
  if (src) { try { img = await loadImg(src); } catch { img = null; } }
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  if (!g) return;
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, cfg.c1); gr.addColorStop(1, cfg.c2);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (img) {
    const ar = img.naturalWidth / img.naturalHeight, cr = W / H;
    let [dw, dh] = ar > cr ? [H * ar, H] : [W, W / ar];
    if (cfg.blur > 0) { dw *= 1.08; dh *= 1.08; }
    g.save();
    g.filter = `${cfg.filter === "none" ? "" : cfg.filter + " "}blur(${(cfg.blur / 100) * W * 0.02}px)`;
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    g.restore();
  }
  g.fillStyle = `rgba(0,0,0,${cfg.dim / 100})`; g.fillRect(0, 0, W, H);
  if (cfg.vignette) {
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  const px = (cfg.size / 100) * W;
  g.font = `900 ${px}px ${cfg.font}`;
  g.textBaseline = "middle"; g.textAlign = cfg.align;
  const lines = wrapLines(g, cfg.title, W * 0.84);
  const lh = px * 1.08, subPx = px * 0.36;
  const totalH = lines.length * lh + (cfg.bar ? px * 0.3 : 0) + (cfg.sub ? subPx * 1.8 : 0);
  let y = (cfg.y / 100) * H - totalH / 2 + lh / 2;
  const x = cfg.align === "left" ? W * 0.08 : cfg.align === "right" ? W * 0.92 : W / 2;
  g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = px * 0.22; g.shadowOffsetY = px * 0.05;
  lines.forEach((ln) => {
    if (cfg.stroke > 0) { g.lineJoin = "round"; g.lineWidth = cfg.stroke * px * 0.12; g.strokeStyle = "#000"; g.strokeText(ln, x, y); }
    g.fillStyle = cfg.color; g.fillText(ln, x, y); y += lh;
  });
  g.shadowColor = "transparent";
  y -= lh / 2;
  if (cfg.bar) {
    const bw = px * 1.6, bx = cfg.align === "left" ? x : cfg.align === "right" ? x - bw : x - bw / 2;
    g.fillStyle = cfg.accent; g.fillRect(bx, y + px * 0.08, bw, px * 0.1); y += px * 0.3;
  }
  if (cfg.sub) {
    g.font = `700 ${subPx}px ${cfg.font}`; g.fillStyle = cfg.accent; g.textAlign = cfg.align;
    g.fillText(cfg.sub, x, y + subPx * 0.9);
  }
  if (cfg.badge) {
    const bp = px * 0.3;
    g.font = `800 ${bp}px ${FONTS[0]}`; g.textAlign = "left";
    const bwid = g.measureText(cfg.badge).width + bp * 1.2, bh = bp * 1.8;
    g.fillStyle = cfg.accent; roundRect(g, W * 0.05, H * 0.07, bwid, bh, bh / 2); g.fill();
    g.fillStyle = "#111"; g.fillText(cfg.badge, W * 0.05 + bp * 0.6, H * 0.07 + bh / 2);
  }
}

/* ───────────────────────────── Small UI bits ───────────────────────────── */

function Rng(p: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="ve-field">
      <div><span>{p.label}</span><strong>{r2(p.value)}{p.unit ?? ""}</strong></div>
      <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} />
    </label>
  );
}
function ChipRow<T extends string | number>(p: { items: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="ve-chip-row">
      {p.items.map((it) => (
        <button key={String(it.id)} className={`ve-chip ${p.value === it.id ? "active" : ""}`} onClick={() => p.onPick(it.id)}>{it.label}</button>
      ))}
    </div>
  );
}
function Toggle(p: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="ve-check"><input type="checkbox" checked={p.checked} onChange={(e) => p.onChange(e.target.checked)} />{p.label}</label>
  );
}
function ColorRow(p: { label: string; value: string; onChange: (v: string) => void }) {
  const v = /^#[0-9a-f]{6}$/i.test(p.value) ? p.value : "#000000";
  return (
    <label className="ve-colorrow"><span>{p.label}</span><input type="color" value={v} onChange={(e) => p.onChange(e.target.value)} /></label>
  );
}

/** Automatic "quality check" list with one-click fixes. */
function IssueList(p: { issues: Issue[] }) {
  if (!p.issues.length) {
    return <div className="ve-issue ok"><CheckCircleOutlined /><span>Everything looks good — ready to save.</span></div>;
  }
  return (
    <div className="ve-issues">
      {p.issues.map((is) => (
        <div key={is.id} className={`ve-issue ${is.level}`}>
          {is.level === "warn" ? <WarningOutlined /> : <InfoCircleOutlined />}
          <span>{is.text}</span>
          {is.fix && <button onClick={is.fix}>{is.fixLabel ?? "Fix"}</button>}
        </div>
      ))}
    </div>
  );
}

function DesignEditor(p: {
  label: string; W: number; H: number; cfg: Design; onChange: (patch: Partial<Design>) => void;
  pool: MediaItem[]; getFrame: () => string | null; videoTitle: string; filename: string; toast: (m: string) => void; safe?: { w: number; h: number };
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => { (document as any).fonts?.ready?.then(() => setFontTick((n) => n + 1)); }, []);
  useEffect(() => {
    let alive = true;
    const cv = ref.current;
    if (cv) paintDesign(cv, p.cfg, p.W, p.H).catch(() => { if (!alive) return; });
    return () => { alive = false; };
  }, [p.cfg, p.W, p.H, fontTick]);
  const { cfg, onChange } = p;
  const download = () => {
    const cv = ref.current;
    if (!cv) return;
    cv.toBlob((b) => { if (b) { downloadBlob(b, `${p.filename}.png`); p.toast(`✓ ${p.label} downloaded`); } }, "image/png");
  };
  const uploadRef = useRef<HTMLInputElement>(null);
  return (
    <div className="ve-design">
      <div className="ve-design-prev" style={{ aspectRatio: `${p.W} / ${p.H}` }}>
        <canvas ref={ref} />
        {p.safe && cfg.showSafe && (
          <span className="ve-safe" style={{ width: `${(p.safe.w / p.W) * 100}%`, height: `${(p.safe.h / p.H) * 100}%` }} title="Visible on every device" />
        )}
      </div>
      <div className="ve-actions">
        <button onClick={download}><DownloadOutlined /> Download PNG</button>
        <button onClick={() => onChange({ title: p.videoTitle })}><FileTextOutlined /> Use video title</button>
      </div>
      <div className="ve-label">Background</div>
      <ChipRow items={[{ id: "gradient", label: "Gradient" }, { id: "image", label: "Photo" }, { id: "frame", label: "Video frame" }] as { id: Design["bg"]; label: string }[]} value={cfg.bg} onPick={(v) => onChange({ bg: v })} />
      {cfg.bg === "gradient" && (<><ColorRow label="Color 1" value={cfg.c1} onChange={(v) => onChange({ c1: v })} /><ColorRow label="Color 2" value={cfg.c2} onChange={(v) => onChange({ c2: v })} /></>)}
      {cfg.bg === "image" && (
        <>
          <button className="ve-btn" onClick={() => uploadRef.current?.click()}><UploadOutlined /> Upload picture</button>
          <input ref={uploadRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange({ imageUrl: URL.createObjectURL(f) }); e.target.value = ""; }} />
          {p.pool.filter((m) => m.kind === "image").length > 0 && (
            <div className="ve-pick-grid">
              {p.pool.filter((m) => m.kind === "image").map((m) => (
                <button key={m.id} className={cfg.imageUrl === m.url ? "active" : ""} style={{ backgroundImage: `url(${m.thumb})` }} onClick={() => onChange({ imageUrl: m.url })} title={m.name} />
              ))}
            </div>
          )}
        </>
      )}
      {cfg.bg === "frame" && (
        <button className="ve-btn" onClick={() => { const f = p.getFrame(); if (f) { onChange({ frameUrl: f }); p.toast("Frame captured from playhead"); } }}>
          <CameraOutlined /> Capture frame at playhead
        </button>
      )}
      {cfg.bg !== "gradient" && (
        <>
          <ChipRow items={FILTERS.map((f) => ({ id: f.css, label: f.label }))} value={cfg.filter} onPick={(v) => onChange({ filter: v })} />
          <Rng label="Blur" value={cfg.blur} min={0} max={100} onChange={(v) => onChange({ blur: v })} />
        </>
      )}
      <Rng label="Darken" value={cfg.dim} min={0} max={85} unit="%" onChange={(v) => onChange({ dim: v })} />
      <Toggle label="Vignette" checked={cfg.vignette} onChange={(v) => onChange({ vignette: v })} />
      <div className="ve-label">Text</div>
      <textarea className="ve-input" rows={2} value={cfg.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Title" />
      <input className="ve-input" value={cfg.sub} onChange={(e) => onChange({ sub: e.target.value })} placeholder="Subtitle" />
      <input className="ve-input" value={cfg.badge} onChange={(e) => onChange({ badge: e.target.value })} placeholder="Badge (NEW, PART 2…)" />
      <select className="ve-input" value={cfg.font} onChange={(e) => onChange({ font: e.target.value })}>
        {FONTS.map((f) => <option key={f} value={f}>{fontName(f)}</option>)}
      </select>
      <ChipRow items={[{ id: "left", label: "Left" }, { id: "center", label: "Center" }, { id: "right", label: "Right" }] as { id: Design["align"]; label: string }[]} value={cfg.align} onPick={(v) => onChange({ align: v })} />
      <Rng label="Size" value={cfg.size} min={3} max={20} step={0.5} onChange={(v) => onChange({ size: v })} />
      <Rng label="Vertical position" value={cfg.y} min={10} max={90} unit="%" onChange={(v) => onChange({ y: v })} />
      <Rng label="Outline" value={cfg.stroke} min={0} max={2} step={0.1} onChange={(v) => onChange({ stroke: v })} />
      <ColorRow label="Text color" value={cfg.color} onChange={(v) => onChange({ color: v })} />
      <ColorRow label="Accent color" value={cfg.accent} onChange={(v) => onChange({ accent: v })} />
      <Toggle label="Accent bar under title" checked={cfg.bar} onChange={(v) => onChange({ bar: v })} />
      {p.safe && <Toggle label="Show safe area guide" checked={cfg.showSafe} onChange={(v) => onChange({ showSafe: v })} />}
    </div>
  );
}

/* ───────────────────────────── Editor ───────────────────────────── */

export default function VideoEditorPage() {
  const navigate = useNavigate();

  /* project state with undo / redo */
  const [proj, setProj] = useState<Proj>({ clips: [], texts: [], tracks: [], settings: DEFAULT_SETTINGS });
  const projRef = useRef<Proj>(proj);
  const [undoStack, setUndoStack] = useState<Proj[]>([]);
  const [redoStack, setRedoStack] = useState<Proj[]>([]);
  const lastCommit = useRef<{ key: string; time: number } | null>(null);
  /** Counts every edit, so we know when the rendered video is out of date. */
  const [rev, setRev] = useState(0);
  const revRef = useRef(0);
  const bump = () => { revRef.current += 1; setRev(revRef.current); };

  const [meta, setMeta] = useState<Meta>({ title: "Untitled video", desc: "", tags: [], category: CATEGORIES[0], visibility: "public" });
  const [tagDraft, setTagDraft] = useState("");
  const [pool, setPool] = useState<MediaItem[]>([]);
  const [autoAdd, setAutoAdd] = useState(true);
  const [sel, setSel] = useState<Sel>(null);
  const [tab, setTab] = useState<RTab>("clip");
  const [coverTab, setCoverTab] = useState<"thumb" | "banner">("thumb");
  const [thumb, setThumb] = useState<Design>(() => mkDesign("thumb"));
  const [banner, setBanner] = useState<Design>(() => mkDesign("banner"));
  const [pps, setPps] = useState(60);
  const [playing, setPlaying] = useState(false);
  const [uiTime, setUiTime] = useState(0);
  const [loop, setLoop] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [bulkDur, setBulkDur] = useState(3);
  const [exp, setExp] = useState<ExportState>(EXP0);
  const [fmtPref, setFmtPref] = useState<"webm" | "mp4">("webm");
  const [muteWhileExport, setMuteWhileExport] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [coverAsAlbum, setCoverAsAlbum] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [avail, setAvail] = useState({ w: 0, h: 0 });
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [overClipId, setOverClipId] = useState<string | null>(null);

  const P = useRef({ playing: false, time: 0, last: 0, uiAt: 0, exporting: false });
  const engineRef = useRef<(now: number) => void>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | null>(null);
  const exportDone = useRef<(() => void) | null>(null);
  const exportThumb = useRef<string | null>(null);
  const thumbGot = useRef(false);
  const expUrlRef = useRef<string | null>(null);
  expUrlRef.current = exp.url;
  const loopRef = useRef(false);
  loopRef.current = loop;
  const recRef = useRef<{ rec: MediaRecorder } | null>(null);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const musicFileRef = useRef<HTMLInputElement>(null);
  const wmFileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode; monitor: GainNode; dest: MediaStreamAudioDestinationNode; nodes: Map<HTMLMediaElement, GainNode> } | null>(null);

  const lay = useMemo(() => layoutOf(proj.clips), [proj.clips]);
  const total = lay.total;
  const { W, H } = dims(proj.settings);
  const selClip = sel?.t === "clip" ? proj.clips.find((c) => c.id === sel.id) ?? null : null;
  const selText = sel?.t === "text" ? proj.texts.find((c) => c.id === sel.id) ?? null : null;
  const selTrack = sel?.t === "audio" ? proj.tracks.find((c) => c.id === sel.id) ?? null : null;

  /* album / render status */
  const stale = !!exp.blob && exp.rev !== rev;
  const savedNow = !!exp.savedId && !stale;
  const unsaved = proj.clips.length > 0 && !savedNow;
  const progress = total ? clamp(Math.round((uiTime / total) * 100), 0, 100) : 0;

  /* ── history ── */
  const commit = (updater: (p: Proj) => Proj, key?: string) => {
    const prev = projRef.current;
    const next = updater(prev);
    if (next === prev) return;
    const now = Date.now();
    const last = lastCommit.current;
    const coalesce = !!key && !!last && last.key === key && now - last.time < 700;
    lastCommit.current = key ? { key, time: now } : null;
    projRef.current = next;
    setProj(next);
    bump();
    if (!coalesce) setUndoStack((u) => [...u.slice(-59), prev]);
    setRedoStack([]);
  };
  const undo = () => {
    const prev = undoStack[undoStack.length - 1];
    if (!prev) return;
    lastCommit.current = null;
    setUndoStack((u) => u.slice(0, -1)); setRedoStack((r) => [...r, projRef.current]);
    projRef.current = prev; setProj(prev); bump();
  };
  const redo = () => {
    const nx = redoStack[redoStack.length - 1];
    if (!nx) return;
    lastCommit.current = null;
    setRedoStack((r) => r.slice(0, -1)); setUndoStack((u) => [...u, projRef.current]);
    projRef.current = nx; setProj(nx); bump();
  };
  const showToast = (m: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(m);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const patchClip = (id: string, patch: Partial<Clip> | ((c: Clip) => Partial<Clip>), key?: string) =>
    commit((p) => ({ ...p, clips: p.clips.map((c) => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)) }), key ? `c_${id}_${key}` : undefined);
  const patchTf = (id: string, patch: Partial<Tf>, key?: string) =>
    patchClip(id, (c) => ({ tf: { ...(c.tf ?? DEF_TF), ...patch } }), key ?? "tf");
  const patchText = (id: string, patch: Partial<TextOv>, key?: string) =>
    commit((p) => ({ ...p, texts: p.texts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }), key ? `t_${id}_${key}` : undefined);
  const patchTrack = (id: string, patch: Partial<AudioTrack>, key?: string) =>
    commit((p) => ({ ...p, tracks: p.tracks.map((c) => (c.id === id ? { ...c, ...patch } : c)) }), key ? `a_${id}_${key}` : undefined);
  const patchSettings = (patch: Partial<Settings>, key?: string) =>
    commit((p) => ({ ...p, settings: { ...p.settings, ...patch } }), key ? `s_${key}` : undefined);

  /* ── audio graph ── */
  const ensureAudio = () => {
    if (!audioRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      const master = ctx.createGain(), monitor = ctx.createGain(), dest = ctx.createMediaStreamDestination();
      master.connect(monitor); monitor.connect(ctx.destination); master.connect(dest);
      audioRef.current = { ctx, master, monitor, dest, nodes: new Map() };
    }
    return audioRef.current;
  };
  const gainFor = (el: HTMLMediaElement) => {
    const a = ensureAudio();
    let n = a.nodes.get(el);
    if (!n) {
      const src = a.ctx.createMediaElementSource(el);
      n = a.ctx.createGain(); src.connect(n); n.connect(a.master); a.nodes.set(el, n);
    }
    return n;
  };

  /** Keeps every <video>/<audio> element in step with the timeline clock. */
  const syncMedia = (t: number, playingNow: boolean, p: Proj, l: Layout) => {
    const s = p.settings;
    const haveAudio = !!audioRef.current;
    const vf = fadeFactor(t, l.total, s);
    p.clips.forEach((c, i) => {
      if (c.kind !== "video") return;
      const el = getVideoEl(c);
      const st = l.starts[i];
      const active = t >= st && t <= st + c.duration;
      if (active) {
        const target = c.trimStart + (t - st) * c.speed;
        if (playingNow) {
          el.playbackRate = c.speed;
          if (el.paused) { el.currentTime = target; el.play().catch(() => {}); }
          else if (Math.abs(el.currentTime - target) > 0.35) el.currentTime = target;
        } else {
          if (!el.paused) el.pause();
          if (Math.abs(el.currentTime - target) > 0.04) el.currentTime = target;
        }
      } else if (!el.paused) el.pause();
      if (haveAudio) gainFor(el).gain.value = active && !c.muted && !s.muteOriginal ? c.volume * (s.origVol / 100) * audioFactor(i, t, l, p.clips) * vf : 0;
    });
    p.tracks.forEach((tr) => {
      const el = getAudioEl(tr);
      const active = t >= tr.start && t < tr.start + tr.len;
      if (active) {
        const span = Math.max(0.1, tr.duration - tr.trimStart);
        const rel = t - tr.start;
        const target = tr.loop ? tr.trimStart + (rel % span) : tr.trimStart + rel;
        let drift = Math.abs(el.currentTime - target);
        if (tr.loop) drift = Math.min(drift, span - drift);
        if (playingNow) {
          if (el.paused) { el.currentTime = target; el.play().catch(() => {}); }
          else if (drift > 0.4) el.currentTime = target;
        } else if (!el.paused) el.pause();
      } else if (!el.paused) el.pause();
      if (haveAudio) {
        const rel = t - tr.start;
        const fade = Math.min(tr.fadeIn > 0 ? clamp(rel / tr.fadeIn, 0, 1) : 1, tr.fadeOut > 0 ? clamp((tr.len - rel) / tr.fadeOut, 0, 1) : 1);
        gainFor(el).gain.value = active ? tr.volume * (s.musicVol / 100) * fade * vf : 0;
      }
    });
  };

  /* ── frame loop (always latest closure through engineRef) ── */
  engineRef.current = (now: number) => {
    const st = P.current;
    const p = projRef.current;
    const l = layoutOf(p.clips);
    if (st.playing) {
      const dt = Math.min(0.25, (now - st.last) / 1000);
      st.last = now; st.time += dt;
      if (st.time >= l.total) {
        if (st.exporting) { st.time = l.total; st.playing = false; exportDone.current?.(); }
        else if (loopRef.current && l.total > 0) st.time = 0;
        else { st.time = l.total; st.playing = false; setPlaying(false); }
      }
    }
    syncMedia(st.time, st.playing, p, l);
    const cv = canvasRef.current;
    if (cv) {
      const d = dims(p.settings);
      if (cv.width !== d.W || cv.height !== d.H) { cv.width = d.W; cv.height = d.H; }
      const g = cv.getContext("2d");
      if (g) renderFrame(g, d.W, d.H, st.time, p, l, !st.exporting);
      /* grab a cover frame while rendering (used as the album thumbnail) */
      if (st.exporting && !thumbGot.current && st.time >= Math.min(1, l.total * 0.3)) {
        thumbGot.current = true;
        exportThumb.current = snapThumb(cv);
      }
    }
    if (now - st.uiAt > 50 || !st.playing) { st.uiAt = now; setUiTime(st.time); }
  };
  useEffect(() => {
    let raf = 0;
    const loopFn = (now: number) => { engineRef.current?.(now); raf = requestAnimationFrame(loopFn); };
    raf = requestAnimationFrame(loopFn);
    FONTS.forEach((f) => (document as any).fonts?.load?.(`700 32px ${f}`));
    return () => {
      cancelAnimationFrame(raf);
      videoEls.forEach((v) => v.pause()); audioEls.forEach((a) => a.pause());
      audioRef.current?.ctx.close().catch(() => {});
      audioRef.current = null;
    };
  }, []);

  /* free the rendered preview file when leaving the page */
  useEffect(() => () => { if (expUrlRef.current) URL.revokeObjectURL(expUrlRef.current); }, []);

  /* leaving full-screen preview stops playback */
  useEffect(() => {
    const on = () => { if (!document.fullscreenElement && !P.current.exporting) { P.current.playing = false; setPlaying(false); } };
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  /* drop media elements of removed clips / tracks */
  useEffect(() => {
    const ids = new Set(proj.clips.map((c) => c.id));
    videoEls.forEach((v, id) => { if (!ids.has(id)) { v.pause(); videoEls.delete(id); } });
    const tids = new Set(proj.tracks.map((c) => c.id));
    audioEls.forEach((a, id) => { if (!tids.has(id)) { a.pause(); audioEls.delete(id); } });
  }, [proj.clips, proj.tracks]);

  useEffect(() => {
    if (proj.settings.wm.url) getImage(proj.settings.wm.url);
  }, [proj.settings.wm.url]);

  /* warn before closing the tab while the video is not saved */
  useEffect(() => {
    if (!unsaved) return;
    const on = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", on);
    return () => window.removeEventListener("beforeunload", on);
  }, [unsaved]);

  /* stage size */
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setAvail({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ar = W / H;
  let dw = Math.max(80, avail.w - 28), dh = Math.max(60, avail.h - 28);
  if (dw / dh > ar) dw = dh * ar; else dh = dw / ar;

  /* ── transport ── */
  const seek = (t: number) => { P.current.time = clamp(t, 0, Math.max(total, 0)); setUiTime(P.current.time); };
  const play = async () => {
    if (!total) { showToast("Add a clip first"); return; }
    const a = ensureAudio();
    await a.ctx.resume().catch(() => {});
    if (P.current.time >= total - 0.02) P.current.time = 0;
    P.current.last = performance.now(); P.current.playing = true; setPlaying(true);
  };
  const pause = () => { P.current.playing = false; setPlaying(false); };
  const togglePlay = () => (P.current.playing ? pause() : void play());
  const jumpClip = (dir: 1 | -1) => {
    const l = layoutOf(projRef.current.clips), t = P.current.time;
    const pts = [...l.starts, l.total];
    if (dir > 0) seek(pts.find((x) => x > t + 0.05) ?? l.total);
    else seek([...pts].reverse().find((x) => x < t - 0.05) ?? 0);
  };
  /** Plays the whole video full screen (live preview, no rendering needed). */
  const previewFull = async () => {
    if (!total) { showToast("Add a clip first"); return; }
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    try { await stageRef.current?.requestFullscreen(); } catch { /* preview still plays in the page */ }
    seek(0); void play();
  };

  /* ── adding media ── */
  const makeClip = (m: MediaItem, idx: number): Clip => ({
    id: `clip_${uid()}`, kind: m.kind, url: m.url, name: m.name, thumb: m.thumb,
    duration: m.kind === "video" ? r2(Math.max(0.5, m.duration)) : projRef.current.settings.imageDur,
    trimStart: 0, srcDuration: m.duration || 0, speed: 1, muted: false, volume: 1, fit: "cover", filter: "none",
    adj: { b: 100, c: 100, s: 100 }, motion: m.kind === "image" ? (["zoomIn", "panLeft", "zoomOut", "panRight"] as Motion[])[idx % 4] : "none",
    transition: projRef.current.settings.defTransition, transDur: 0.6, flip: false,
    srcW: m.w, srcH: m.h, tf: { ...DEF_TF },
  });
  const clipIndexAt = (t: number) => {
    const cur = projRef.current.clips, l = layoutOf(cur);
    return cur.filter((c, i) => l.starts[i] + c.duration / 2 < t).length;
  };
  const addToTimeline = (items: MediaItem[], index?: number) => {
    if (!items.length) return;
    commit((p) => {
      const at = index ?? p.clips.length;
      const made = items.map((m, i) => makeClip(m, at + i));
      const clips = [...p.clips]; clips.splice(at, 0, ...made);
      return { ...p, clips };
    });
  };
  const addMusic = async (src: { url: string; name: string; start?: number }) => {
    try {
      showToast("Reading audio…");
      const info = await analyzeAudio(src.url);
      const start = src.start ?? 0;
      const tr: AudioTrack = {
        id: `aud_${uid()}`, name: src.name, url: src.url, start, duration: info.duration, trimStart: 0,
        len: r2(total > 0 ? Math.min(info.duration, Math.max(1, total - start)) : info.duration),
        volume: 1, fadeIn: 1, fadeOut: 2, loop: false, peaks: info.peaks,
      };
      commit((p) => ({ ...p, tracks: [...p.tracks, tr] }));
      setSel({ t: "audio", id: tr.id }); setTab("audio");
      showToast(`Added “${src.name}”`);
    } catch { showToast("Could not read that audio file"); }
  };
  const addFiles = async (files: FileList | File[]) => {
    const items: MediaItem[] = [];
    for (const f of Array.from(files)) {
      const url = URL.createObjectURL(f);
      try {
        if (f.type.startsWith("image/")) {
          const d = await loadImg(url);
          items.push({ id: `m_${uid()}`, kind: "image", url, name: f.name, w: d.naturalWidth, h: d.naturalHeight, duration: 0, thumb: url });
        } else if (f.type.startsWith("video/")) {
          const v = await probeVideo(url);
          items.push({ id: `m_${uid()}`, kind: "video", url, name: f.name, w: v.w, h: v.h, duration: v.duration, thumb: v.thumb });
        } else if (f.type.startsWith("audio/")) await addMusic({ url, name: f.name });
      } catch { showToast(`Could not read ${f.name}`); }
    }
    if (items.length) {
      setPool((pl) => [...pl, ...items]);
      if (autoAdd) addToTimeline(items);
      showToast(`${items.length} file${items.length > 1 ? "s" : ""} added`);
    }
  };
  const addCard = () => {
    const c: Clip = {
      id: `clip_${uid()}`, kind: "card", url: "", name: "Title card", duration: 3, trimStart: 0, srcDuration: 0, speed: 1, muted: true, volume: 1,
      fit: "cover", filter: "none", adj: { b: 100, c: 100, s: 100 }, motion: "none", transition: proj.settings.defTransition, transDur: 0.6, flip: false,
      srcW: 0, srcH: 0, tf: { ...DEF_TF },
      card: { title: meta.title || "My Video", sub: "A story in motion", c1: "#0b1424", c2: "#7c3aed", color: "#ffffff", font: FONTS[1] },
    };
    commit((p) => ({ ...p, clips: [c, ...p.clips] }));
    setSel({ t: "clip", id: c.id }); setTab("clip");
  };
  const deleteClip = (id: string) => { commit((p) => ({ ...p, clips: p.clips.filter((c) => c.id !== id) })); setSel(null); };
  const duplicateClip = (id: string) => {
    commit((p) => {
      const i = p.clips.findIndex((c) => c.id === id);
      if (i < 0) return p;
      const clips = [...p.clips]; clips.splice(i + 1, 0, { ...p.clips[i], id: `clip_${uid()}` });
      return { ...p, clips };
    });
  };
  const splitAtPlayhead = () => {
    const t = P.current.time, p = projRef.current, l = layoutOf(p.clips);
    const i = p.clips.findIndex((c, k) => t > l.starts[k] + 0.15 && t < l.starts[k] + c.duration - 0.15);
    if (i < 0) { showToast("Move the playhead inside a clip to split"); return; }
    const c = p.clips[i], local = r2(t - l.starts[i]);
    const a: Clip = { ...c, duration: local };
    const b: Clip = { ...c, id: `clip_${uid()}`, duration: r2(c.duration - local), trimStart: r2(c.trimStart + local * c.speed), transition: "none", motion: c.kind === "image" ? "none" : c.motion };
    commit((pr) => { const clips = [...pr.clips]; clips.splice(i, 1, a, b); return { ...pr, clips }; });
    setSel({ t: "clip", id: b.id });
    showToast("Clip split");
  };
  const maxDur = (c: Clip) => (c.kind === "video" ? Math.max(0.5, (c.srcDuration - c.trimStart) / c.speed) : 60);
  const clearProject = () => {
    if (!proj.clips.length && !proj.texts.length && !proj.tracks.length) return;
    if (!window.confirm("Clear every clip, text and audio track from this project? You can still undo.")) return;
    commit((p) => ({ ...p, clips: [], texts: [], tracks: [] }));
    setSel(null); seek(0); showToast("Project cleared");
  };

  /* ── rearranging clips (storyboard drag & drop + arrows) ── */
  const moveClipTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    commit((p) => {
      const from = p.clips.findIndex((x) => x.id === fromId), to = p.clips.findIndex((x) => x.id === toId);
      if (from < 0 || to < 0) return p;
      const arr = [...p.clips]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m);
      return { ...p, clips: arr };
    });
  };
  const moveClipBy = (id: string, d: number) => {
    commit((p) => {
      const i = p.clips.findIndex((x) => x.id === id), j = i + d;
      if (i < 0 || j < 0 || j >= p.clips.length) return p;
      const arr = [...p.clips]; const [m] = arr.splice(i, 1); arr.splice(j, 0, m);
      return { ...p, clips: arr };
    });
  };
  const reverseClips = () => { commit((p) => ({ ...p, clips: [...p.clips].reverse() })); showToast("Order reversed"); };
  const shuffleClips = () => {
    commit((p) => {
      const a = [...p.clips];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return { ...p, clips: a };
    });
    showToast("Clips shuffled");
  };

  /* ── text ── */
  const makeText = (kind: string): TextOv => {
    const base: TextOv = {
      id: `txt_${uid()}`, text: "Your text", start: r2(P.current.time), dur: 3, x: 20, y: 42, w: 60, h: 16, rotate: 0,
      color: "#ffffff", font: FONTS[0], size: 6, bold: true, italic: false, align: "center", bg: "transparent",
      shadow: true, stroke: 0, strokeColor: "#000000", opacity: 1, anim: "fade",
    };
    switch (kind) {
      case "title": return { ...base, text: "MY VIDEO", font: FONTS[4], size: 12, y: 36, h: 24, anim: "pop", stroke: 0.4 };
      case "subtitle": return { ...base, text: "Add a subtitle", size: 4.2, y: 58, h: 12, bold: false, anim: "slideUp" };
      case "lower": return { ...base, text: "Name · Location", x: 5, y: 78, w: 46, h: 13, size: 3.4, align: "left", bg: "#000000", anim: "slideUp", shadow: false };
      case "caption": return { ...base, text: "Add a caption…", x: 10, y: 82, w: 80, h: 11, size: 3.6, bg: "#000000", anim: "fade", shadow: false };
      case "quote": return { ...base, text: "“Every picture tells a story.”", font: FONTS[1], italic: true, size: 5, x: 12, w: 76, h: 22, anim: "type" };
      default: return base;
    }
  };
  const addText = (kind: string) => {
    const el = makeText(kind);
    commit((p) => ({ ...p, texts: [...p.texts, el] }));
    setSel({ t: "text", id: el.id }); setTab("text");
  };
  const addSticker = (em: string) => {
    const el: TextOv = { ...makeText("sticker"), text: em, x: 40, y: 38, w: 20, h: 24, size: 14, anim: "pop", shadow: false };
    commit((p) => ({ ...p, texts: [...p.texts, el] }));
    setSel({ t: "text", id: el.id });
  };
  const deleteText = (id: string) => { commit((p) => ({ ...p, texts: p.texts.filter((t) => t.id !== id) })); setSel(null); };
  const deleteTrack = (id: string) => { commit((p) => ({ ...p, tracks: p.tracks.filter((t) => t.id !== id) })); setSel(null); };

  const textDrag = (e: React.PointerEvent, id: string, mode: "move" | "resize" | "rotate") => {
    const box = boxRef.current;
    const el = projRef.current.texts.find((t) => t.id === id);
    if (!box || !el) return;
    const rect = box.getBoundingClientRect();
    const s0 = { ...el };
    setSel({ t: "text", id }); setTab("text");
    dragger(e, (dx, dy, ev) => {
      const px = (dx / rect.width) * 100, py = (dy / rect.height) * 100;
      if (mode === "move") patchText(id, { x: r2(clamp(s0.x + px, -20, 100)), y: r2(clamp(s0.y + py, -20, 100)) }, "drag");
      else if (mode === "resize") patchText(id, { w: r2(clamp(s0.w + px, 5, 100)), h: r2(clamp(s0.h + py, 4, 100)) }, "drag");
      else {
        const cx = rect.left + rect.width * ((s0.x + s0.w / 2) / 100), cy = rect.top + rect.height * ((s0.y + s0.h / 2) / 100);
        const ang = Math.round((Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90);
        patchText(id, { rotate: Math.abs(ang % 15) < 4 ? Math.round(ang / 15) * 15 : ang }, "drag");
      }
    });
  };

  /** Drag, scale or rotate a photo/video directly on the preview. */
  const clipDrag = (e: React.PointerEvent, id: string, mode: "move" | "scale" | "rotate") => {
    const boxEl = boxRef.current;
    const p0 = projRef.current;
    const i = p0.clips.findIndex((x) => x.id === id);
    if (!boxEl || i < 0) return;
    const c = p0.clips[i];
    const b = clipBox(c, P.current.time, W, H, layoutOf(p0.clips), i);
    if (!b) return;
    const rect = boxEl.getBoundingClientRect();
    const tf0: Tf = { ...(c.tf ?? DEF_TF) };
    const cxs = rect.left + (rect.width * b.cx) / 100, cys = rect.top + (rect.height * b.cy) / 100;
    const d0 = Math.max(10, Math.hypot(e.clientX - cxs, e.clientY - cys));
    setSel({ t: "clip", id }); setTab("clip");
    dragger(e, (dx, dy, ev) => {
      if (mode === "move") {
        patchTf(id, { x: r2(tf0.x + (dx / rect.width) * 100), y: r2(tf0.y + (dy / rect.height) * 100) });
      } else if (mode === "scale") {
        const ratio = Math.hypot(ev.clientX - cxs, ev.clientY - cys) / d0;
        patchTf(id, { scale: r2(clamp(tf0.scale * ratio, 0.1, 8)) });
      } else {
        let ang = Math.round((Math.atan2(ev.clientY - cys, ev.clientX - cxs) * 180) / Math.PI + 90);
        if (ang > 180) ang -= 360;
        patchTf(id, { rot: Math.abs(ang % 15) < 4 ? Math.round(ang / 15) * 15 : ang });
      }
    });
  };

  const onCanvasDown = (e: React.PointerEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100, py = ((e.clientY - rect.top) / rect.height) * 100;
    const t = P.current.time;
    const hit = [...projRef.current.texts].reverse().find((el) => t >= el.start && t <= el.start + el.dur && px >= el.x && px <= el.x + el.w && py >= el.y && py <= el.y + el.h);
    if (hit) { textDrag(e, hit.id, "move"); return; }
    const p = projRef.current, l = layoutOf(p.clips);
    for (let i = p.clips.length - 1; i >= 0; i--) {
      const c = p.clips[i];
      if (t < l.starts[i] || t > l.starts[i] + c.duration) continue;
      const b = clipBox(c, t, W, H, l, i);
      if (b && hitBox(b, px, py, rect.width, rect.height)) { clipDrag(e, c.id, "move"); return; }
    }
    setSel(null);
  };

  /* ── voice-over ── */
  const toggleRecord = async () => {
    if (recRef.current) { recRef.current.rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const start = P.current.time;
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        recRef.current = null; setRecording(false); pause();
        const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        await addMusic({ url, name: `Voice-over ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, start });
      };
      recRef.current = { rec }; rec.start(); setRecording(true); void play();
    } catch { showToast("Microphone permission was blocked"); }
  };

  /* ── export / save to album ── */
  const pickMime = (): [string, string] | null => {
    if (typeof MediaRecorder === "undefined") return null;
    const ok = MIMES.filter(([, m]) => MediaRecorder.isTypeSupported(m));
    return ok.find(([e]) => e === fmtPref) ?? ok[0] ?? null;
  };

  /** Saves a rendered video into the Video Album (Video Library page). Updates the entry if it was already saved. */
  const saveToAlbum = async (src: ExportState = exp, quiet = false) => {
    if (!src.blob) { showToast("Render the video first"); return; }
    setSaving(true);
    try {
      let thumbUrl: string | null = exportThumb.current;
      if (coverAsAlbum) {
        const cv = document.createElement("canvas");
        await paintDesign(cv, thumb, 640, 360);
        thumbUrl = cv.toDataURL("image/jpeg", 0.82);
      }
      if (!thumbUrl && canvasRef.current) thumbUrl = snapThumb(canvasRef.current);
      const m = {
        title: meta.title.trim() || "Untitled video", desc: meta.desc, tags: meta.tags,
        category: meta.category, visibility: meta.visibility,
      };
      if (src.savedId) {
        await updateVideo(src.savedId, { ...m, ...(coverAsAlbum ? { thumb: thumbUrl } : {}) });
        if (!quiet) showToast("Album details updated ✓");
      } else {
        const entry = await saveVideo(src.blob, { ...m, duration: src.duration, width: src.w, height: src.h, ext: src.ext, thumb: thumbUrl });
        setExp((x) => (x.blob === src.blob ? { ...x, savedId: entry.id } : x));
        if (!quiet) showToast("Saved to Video Album ✓");
      }
    } catch {
      showToast("Could not save to the album — browser storage may be full");
    } finally { setSaving(false); }
  };

  const exportVideo = async (andSave = false) => {
    if (!total) { showToast("Nothing to export yet"); return; }
    const mime = pickMime();
    const cv = canvasRef.current;
    if (!mime || !cv) { setExp((x) => ({ ...x, err: "This browser can't record video. Use Chrome, Edge or Firefox." })); return; }
    pause();
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    if (exp.url) URL.revokeObjectURL(exp.url);
    const startRev = revRef.current, vw = W, vh = H, vlen = total;
    setReviewOpen(false);
    setExp({ ...EXP0, busy: true, ext: mime[0] });
    thumbGot.current = false; exportThumb.current = null;
    try {
      const a = ensureAudio();
      await a.ctx.resume().catch(() => {});
      a.monitor.gain.value = muteWhileExport ? 0 : 1;
      const stream = new MediaStream([...cv.captureStream(proj.settings.fps).getVideoTracks(), ...a.dest.stream.getAudioTracks()]);
      const bitrate = proj.settings.res >= 1080 ? 10_000_000 : proj.settings.res >= 720 ? 5_000_000 : 2_500_000;
      const rec = new MediaRecorder(stream, { mimeType: mime[1], videoBitsPerSecond: bitrate });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>((res) => { rec.onstop = () => res(); });
      P.current.exporting = true; P.current.time = 0;
      const finished = new Promise<void>((res) => { exportDone.current = res; });
      rec.start(250);
      P.current.last = performance.now(); P.current.playing = true; setPlaying(true);
      await finished;
      await new Promise((r) => setTimeout(r, 400));
      rec.stop(); await stopped;
      const blob = new Blob(chunks, { type: mime[1].split(";")[0] });
      const next: ExportState = {
        busy: false, url: URL.createObjectURL(blob), blob, size: blob.size, ext: mime[0], err: "",
        rev: startRev, duration: vlen, w: vw, h: vh, savedId: null,
      };
      setExp(next);
      P.current.exporting = false; exportDone.current = null; setPlaying(false);
      if (andSave || autoSave) {
        await saveToAlbum(next, true);
        showToast("✓ Rendered & saved to Video Album");
      } else showToast("✓ Render finished — review it before saving");
      setReviewOpen(true);
    } catch {
      setExp({ ...EXP0, ext: mime[0], err: "Export failed. Try a lower resolution." });
    } finally {
      P.current.exporting = false; exportDone.current = null; setPlaying(false);
      if (audioRef.current) audioRef.current.monitor.gain.value = 1;
    }
  };
  const cancelExport = () => { P.current.playing = false; P.current.time = total; exportDone.current?.(); };

  /** The big "Save to Album" button: saves the current render, or renders first if the video changed. */
  const saveClick = async () => {
    if (!total) { showToast("Add a clip first"); return; }
    if (exp.busy || saving) return;
    if (exp.blob && !stale) await saveToAlbum();
    else await exportVideo(true);
  };

  const downloadRender = () => {
    if (!exp.blob) return;
    downloadBlob(exp.blob, `${safeFile(meta.title)}.${exp.ext}`);
    showToast("Download started");
  };

  const getFrame = () => canvasRef.current?.toDataURL("image/jpeg", 0.92) ?? null;
  const downloadDesign = async (cfg: Design, w: number, h: number, name: string) => {
    const cv = document.createElement("canvas");
    await paintDesign(cv, cfg, w, h);
    cv.toBlob((b) => b && downloadBlob(b, `${name}.png`), "image/png");
  };
  const metaText = () => `${meta.title}\n\n${meta.desc}\n\nTags: ${meta.tags.join(", ")}\nCategory: ${meta.category}\nVisibility: ${meta.visibility}\n`;
  const goBack = () => {
    if (unsaved && !window.confirm("This video is not saved to your Video Album yet. Leave anyway?")) return;
    navigate(-1);
  };

  /* ── tags ── */
  const addTags = (raw: string) => {
    const list = raw.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean);
    if (!list.length) return;
    setMeta((m) => ({ ...m, tags: [...m.tags, ...list.filter((t) => !m.tags.some((x) => x.toLowerCase() === t.toLowerCase()))] }));
    setTagDraft("");
  };
  const suggestTags = () => {
    const words = `${meta.title} ${meta.desc}`.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
    const uniq = [...new Set(words)].slice(0, 8);
    addTags([...uniq, "video", "edit", "shorts"].join(","));
  };
  const tagChars = meta.tags.join(",").length;

  /* ── quality check (shown in the Export tab and in the review window) ── */
  const issues: Issue[] = [];
  if (proj.clips.length) {
    if (!meta.title.trim() || /^untitled/i.test(meta.title.trim())) {
      issues.push({ id: "title", level: "warn", text: "Give your video a proper title so you can find it in the album.", fixLabel: "Edit", fix: () => setTab("details") });
    }
    const shortClips = proj.clips.filter((c) => c.duration < 0.8).length;
    if (shortClips) {
      issues.push({
        id: "short", level: "warn", text: `${shortClips} clip${shortClips > 1 ? "s are" : " is"} under 0.8s and may flash by too fast.`, fixLabel: "Make 1s",
        fix: () => commit((p) => ({ ...p, clips: p.clips.map((c) => (c.duration < 0.8 ? { ...c, duration: Math.min(maxDur(c), 1) } : c)) })),
      });
    }
    const lateText = proj.texts.filter((t) => t.start + t.dur > total + 0.05).length;
    if (lateText) {
      issues.push({
        id: "text", level: "warn", text: `${lateText} text layer${lateText > 1 ? "s run" : " runs"} past the end of the video.`, fixLabel: "Trim to end",
        fix: () => commit((p) => ({
          ...p,
          texts: p.texts.map((t) => {
            if (t.start + t.dur <= total + 0.05) return t;
            const st = Math.min(t.start, Math.max(0, total - 0.5));
            return { ...t, start: r2(st), dur: r2(Math.max(0.3, total - st)) };
          }),
        })),
      });
    }
    const longMusic = proj.tracks.filter((t) => t.start < total && t.start + t.len > total + 0.2).length;
    if (longMusic) {
      issues.push({
        id: "music", level: "warn", text: `${longMusic} audio track${longMusic > 1 ? "s play" : " plays"} longer than the video.`, fixLabel: "Trim to video",
        fix: () => commit((p) => ({
          ...p,
          tracks: p.tracks.map((t) => (t.start < total && t.start + t.len > total + 0.2
            ? { ...t, len: r2(clamp(total - t.start, 0.5, t.loop ? 3600 : t.duration - t.trimStart)) } : t)),
        })),
      });
    }
    const hasVideoSound = proj.clips.some((c) => c.kind === "video" && !c.muted) && !proj.settings.muteOriginal;
    if (!hasVideoSound && !proj.tracks.length) {
      issues.push({ id: "sound", level: "info", text: "The video has no sound. Add music or a voice-over?", fixLabel: "Add audio", fix: () => setTab("audio") });
    }
    if (total < 3) issues.push({ id: "len", level: "info", text: "The video is very short (under 3 seconds)." });
    if (proj.settings.res === 480) {
      issues.push({ id: "res", level: "info", text: "Rendering at 480p. 720p or 1080p will look sharper.", fixLabel: "Use 720p", fix: () => patchSettings({ res: 720 }) });
    }
    if (!meta.desc.trim()) issues.push({ id: "desc", level: "info", text: "No description yet — it helps when searching the album.", fixLabel: "Add", fix: () => setTab("details") });
    if (!meta.tags.length) issues.push({ id: "tags", level: "info", text: "No tags yet.", fixLabel: "Suggest tags", fix: suggestTags });
  }

  /* ── timeline interactions ── */
  const timeFromX = (clientX: number) => {
    const r = innerRef.current?.getBoundingClientRect();
    return r ? (clientX - r.left - GUT) / pps : 0;
  };
  const onRulerDown = (e: React.PointerEvent) => {
    pause();
    seek(timeFromX(e.clientX));
    dragger(e, (_dx, _dy, ev) => seek(timeFromX(ev.clientX)));
  };
  const clipDown = (e: React.PointerEvent, c: Clip) => {
    setSel({ t: "clip", id: c.id }); setTab("clip");
    const l0 = layoutOf(projRef.current.clips);
    const idx0 = projRef.current.clips.findIndex((x) => x.id === c.id);
    const centre0 = l0.starts[idx0] + c.duration / 2;
    /* make sure the playhead is inside the clip so its handles show on the preview */
    const tNow = P.current.time;
    if (tNow < l0.starts[idx0] || tNow > l0.starts[idx0] + c.duration) seek(l0.starts[idx0] + Math.min(0.05, c.duration / 2));
    let moved = false;
    dragger(e, (dx) => {
      if (!moved && Math.abs(dx) < 5) return;
      moved = true;
      const cur = projRef.current.clips, l = layoutOf(cur);
      const target = clamp(cur.filter((x, i) => x.id !== c.id && l.starts[i] + x.duration / 2 < centre0 + dx / pps).length, 0, cur.length - 1);
      const from = cur.findIndex((x) => x.id === c.id);
      if (target !== from) commit((p) => { const arr = [...p.clips]; const [m] = arr.splice(from, 1); arr.splice(target, 0, m); return { ...p, clips: arr }; }, "reorder");
    });
  };
  const clipResize = (e: React.PointerEvent, c: Clip) => {
    const d0 = c.duration;
    dragger(e, (dx) => patchClip(c.id, { duration: r2(clamp(d0 + dx / pps, 0.3, maxDur(c))) }, "dur"));
  };
  const textBlockDown = (e: React.PointerEvent, t: TextOv, mode: "move" | "resize") => {
    setSel({ t: "text", id: t.id }); setTab("text");
    const s0 = t.start, d0 = t.dur;
    dragger(e, (dx) => {
      if (mode === "move") patchText(t.id, { start: r2(Math.max(0, s0 + dx / pps)) }, "tl");
      else patchText(t.id, { dur: r2(Math.max(0.3, d0 + dx / pps)) }, "tl");
    });
  };
  const trackDown = (e: React.PointerEvent, t: AudioTrack, mode: "move" | "resize") => {
    setSel({ t: "audio", id: t.id }); setTab("audio");
    const s0 = t.start, l0 = t.len;
    dragger(e, (dx) => {
      if (mode === "move") patchTrack(t.id, { start: r2(Math.max(0, s0 + dx / pps)) }, "tl");
      else patchTrack(t.id, { len: r2(clamp(l0 + dx / pps, 0.5, t.loop ? 3600 : t.duration - t.trimStart)) }, "tl");
    });
  };
  const fitTimeline = () => {
    const w = (tlRef.current?.clientWidth ?? 800) - GUT - 40;
    setPps(clamp(Math.floor(w / Math.max(total, 5)), 20, 240));
  };
  const onTimelineDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/ve-media");
    const m = pool.find((x) => x.id === id);
    if (m) addToTimeline([m], clipIndexAt(timeFromX(e.clientX)));
    else if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  };

  const textLanes = useMemo(() => {
    const sorted = [...proj.texts].sort((a, b) => a.start - b.start);
    const ends: number[] = [], map = new Map<string, number>();
    sorted.forEach((t) => {
      let lane = ends.findIndex((e) => e <= t.start + 0.001);
      if (lane < 0) { lane = ends.length; ends.push(0); }
      ends[lane] = t.start + t.dur; map.set(t.id, lane);
    });
    return { map, count: Math.max(1, ends.length) };
  }, [proj.texts]);

  const visSec = Math.max(total + 6, 15);
  const innerW = GUT + visSec * pps + 40;
  const tickStep = pps < 35 ? 5 : pps < 70 ? 2 : pps < 140 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let s = 0; s <= visSec; s += tickStep) ticks.push(s);

  const peaksFor = (tr: AudioTrack, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const tt = tr.trimStart + (i / n) * tr.len;
      const u = tr.loop ? (tt % tr.duration) / tr.duration : Math.min(1, tt / tr.duration);
      return tr.peaks[Math.floor(u * (tr.peaks.length - 1))] ?? 0;
    });

  /* the selected photo's box on the preview (only while the playhead is inside it) */
  const selIdx = selClip ? proj.clips.findIndex((c) => c.id === selClip.id) : -1;
  const clipBoxNow: ClipBox | null =
    selClip && selIdx >= 0 && !exp.busy && uiTime >= lay.starts[selIdx] && uiTime <= lay.starts[selIdx] + selClip.duration
      ? clipBox(selClip, uiTime, W, H, lay, selIdx)
      : null;

  /* ── keyboard ── */
  const kb = useRef<Record<string, any>>({});
  kb.current = { togglePlay, undo, redo, seek, splitAtPlayhead, sel, selClip, deleteClip, deleteText, deleteTrack, duplicateClip, patchClip, total, fps: proj.settings.fps, saveClick, previewFull, jumpClip, reviewOpen };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = kb.current;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? "";
      const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
      if (mod && key === "s") { e.preventDefault(); void k.saveClick(); return; }
      if (e.key === "Escape") { setSel(null); setHelpOpen(false); setReviewOpen(false); return; }
      if (tag === "TEXTAREA" || tag === "SELECT" || (tag === "INPUT" && ["text", "search", "url", ""].includes((t as HTMLInputElement).type))) return;
      if (k.reviewOpen) return;
      if (mod && key === "z") { e.preventDefault(); if (e.shiftKey) k.redo(); else k.undo(); return; }
      if (mod && key === "y") { e.preventDefault(); k.redo(); return; }
      if (mod && key === "d" && k.sel?.t === "clip") { e.preventDefault(); k.duplicateClip(k.sel.id); return; }
      if (e.key === " ") { e.preventDefault(); k.togglePlay(); return; }
      if (e.key === "?") { setHelpOpen((o) => !o); return; }
      if (e.key === "Home") { k.seek(0); return; }
      if (e.key === "End") { k.seek(k.total); return; }
      if (e.key === "[") { k.jumpClip(-1); return; }
      if (e.key === "]") { k.jumpClip(1); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); k.seek(P.current.time - (e.shiftKey ? 1 : 1 / k.fps)); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); k.seek(P.current.time + (e.shiftKey ? 1 : 1 / k.fps)); return; }
      if (!mod && key === "s") { k.splitAtPlayhead(); return; }
      if (!mod && key === "f") { void k.previewFull(); return; }
      if (!mod && key === "l") { setLoop((v) => !v); return; }
      if (!mod && key === "m" && k.selClip) { k.patchClip(k.selClip.id, { muted: !k.selClip.muted }); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && k.sel) {
        e.preventDefault();
        if (k.sel.t === "clip") k.deleteClip(k.sel.id); else if (k.sel.t === "text") k.deleteText(k.sel.id); else k.deleteTrack(k.sel.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ───────────── Panels ───────────── */

  const renderClipTab = () => {
    const tf = selClip?.tf ?? DEF_TF;
    return (
      <div className="ve-props-body">
        {selClip ? (
          <>
            <div className="ve-insp-head"><strong>{selClip.name}</strong><small>{selClip.kind} · {fmt(selClip.duration)}</small></div>
            <div className="ve-actions">
              <button onClick={splitAtPlayhead}><ScissorOutlined /> Split</button>
              <button onClick={() => duplicateClip(selClip.id)}><CopyOutlined /> Duplicate</button>
              <button className="danger" onClick={() => deleteClip(selClip.id)}><DeleteOutlined /> Delete</button>
            </div>
            <Rng label="Duration" value={selClip.duration} min={0.5} max={Math.min(maxDur(selClip), 30)} step={0.1} unit="s" onChange={(v) => patchClip(selClip.id, { duration: v }, "dur")} />
            {selClip.kind !== "card" && (
              <>
                <div className="ve-label">Move, resize &amp; rotate</div>
                <div className="ve-hint">Drag the photo on the preview to move it. Drag a corner dot to resize and the green dot to rotate.</div>
                <Rng label="Size" value={Math.round(tf.scale * 100)} min={10} max={400} unit="%" onChange={(v) => patchTf(selClip.id, { scale: v / 100 }, "tfs")} />
                <Rng label="Rotation" value={tf.rot} min={-180} max={180} unit="°" onChange={(v) => patchTf(selClip.id, { rot: v }, "tfr")} />
                <Rng label="Position left / right" value={tf.x} min={-100} max={100} unit="%" onChange={(v) => patchTf(selClip.id, { x: v }, "tfx")} />
                <Rng label="Position up / down" value={tf.y} min={-100} max={100} unit="%" onChange={(v) => patchTf(selClip.id, { y: v }, "tfy")} />
                <div className="ve-actions">
                  <button onClick={() => patchTf(selClip.id, { rot: ((Math.round(tf.rot) - 90 + 540) % 360) - 180 }, "tfq")}><RotateLeftOutlined /> 90°</button>
                  <button onClick={() => patchTf(selClip.id, { rot: ((Math.round(tf.rot) + 90 + 540) % 360) - 180 }, "tfq")}><RotateRightOutlined /> 90°</button>
                  <button onClick={() => patchTf(selClip.id, { ...DEF_TF }, "tfq")}><UndoOutlined /> Reset</button>
                </div>
              </>
            )}
            {selClip.kind === "video" && (
              <>
                <Rng label="Trim start" value={selClip.trimStart} min={0} max={Math.max(0.5, selClip.srcDuration - 0.5)} step={0.1} unit="s"
                  onChange={(v) => patchClip(selClip.id, (c) => ({ trimStart: v, duration: Math.min(c.duration, Math.max(0.5, (c.srcDuration - v) / c.speed)) }), "trim")} />
                <div className="ve-label">Speed</div>
                <ChipRow items={[0.25, 0.5, 1, 1.5, 2, 4].map((s) => ({ id: s, label: `${s}×` }))} value={selClip.speed}
                  onPick={(s) => patchClip(selClip.id, (c) => ({ speed: s, duration: r2(Math.min(c.duration, Math.max(0.5, (c.srcDuration - c.trimStart) / s))) }))} />
                <div className="ve-label">Original sound</div>
                <button className={`ve-btn ${selClip.muted ? "on" : ""}`} onClick={() => patchClip(selClip.id, { muted: !selClip.muted })}>
                  {selClip.muted ? <AudioMutedOutlined /> : <SoundOutlined />} {selClip.muted ? "Muted — click to unmute" : "Mute original voice"}
                </button>
                <Rng label="Clip volume" value={Math.round(selClip.volume * 100)} min={0} max={200} unit="%" onChange={(v) => patchClip(selClip.id, { volume: v / 100 }, "vol")} />
              </>
            )}
            {selClip.kind === "card" && selClip.card && (
              <>
                <div className="ve-label">Title card</div>
                <textarea className="ve-input" rows={2} value={selClip.card.title} onChange={(e) => patchClip(selClip.id, (c) => ({ card: { ...c.card!, title: e.target.value } }), "card")} />
                <input className="ve-input" value={selClip.card.sub} onChange={(e) => patchClip(selClip.id, (c) => ({ card: { ...c.card!, sub: e.target.value } }), "card")} />
                <select className="ve-input" value={selClip.card.font} onChange={(e) => patchClip(selClip.id, (c) => ({ card: { ...c.card!, font: e.target.value } }))}>
                  {FONTS.map((f) => <option key={f} value={f}>{fontName(f)}</option>)}
                </select>
                <ColorRow label="Color 1" value={selClip.card.c1} onChange={(v) => patchClip(selClip.id, (c) => ({ card: { ...c.card!, c1: v } }), "card")} />
                <ColorRow label="Color 2" value={selClip.card.c2} onChange={(v) => patchClip(selClip.id, (c) => ({ card: { ...c.card!, c2: v } }), "card")} />
                <ColorRow label="Text" value={selClip.card.color} onChange={(v) => patchClip(selClip.id, (c) => ({ card: { ...c.card!, color: v } }), "card")} />
              </>
            )}
            {selClip.kind !== "card" && (
              <>
                <div className="ve-label">Framing</div>
                <ChipRow items={FITS} value={selClip.fit} onPick={(v) => patchClip(selClip.id, { fit: v })} />
                <div className="ve-label">Camera motion</div>
                <ChipRow items={MOTIONS} value={selClip.motion} onPick={(v) => patchClip(selClip.id, { motion: v })} />
                <Toggle label="Flip horizontally" checked={selClip.flip} onChange={(v) => patchClip(selClip.id, { flip: v })} />
                <div className="ve-label">Filter</div>
                <ChipRow items={FILTERS.map((f) => ({ id: f.css, label: f.label }))} value={selClip.filter || "none"} onPick={(v) => patchClip(selClip.id, { filter: v })} />
                <Rng label="Brightness" value={selClip.adj.b} min={50} max={150} unit="%" onChange={(v) => patchClip(selClip.id, (c) => ({ adj: { ...c.adj, b: v } }), "adj")} />
                <Rng label="Contrast" value={selClip.adj.c} min={50} max={150} unit="%" onChange={(v) => patchClip(selClip.id, (c) => ({ adj: { ...c.adj, c: v } }), "adj")} />
                <Rng label="Saturation" value={selClip.adj.s} min={0} max={200} unit="%" onChange={(v) => patchClip(selClip.id, (c) => ({ adj: { ...c.adj, s: v } }), "adj")} />
              </>
            )}
            <div className="ve-label">Transition into this clip</div>
            <ChipRow items={TRANSITIONS} value={selClip.transition} onPick={(v) => patchClip(selClip.id, { transition: v })} />
            <Rng label="Transition length" value={selClip.transDur} min={0.2} max={2} step={0.1} unit="s" onChange={(v) => patchClip(selClip.id, { transDur: v }, "td")} />
          </>
        ) : (
          <div className="ve-empty"><VideoCameraOutlined /><span>Select a clip on the timeline, the Order panel or the preview to edit it. Space plays, S splits at the playhead.</span></div>
        )}

        <div className="ve-label">Apply to every clip</div>
        <Rng label="Photo duration" value={bulkDur} min={1} max={10} step={0.5} unit="s" onChange={setBulkDur} />
        <div className="ve-actions two">
          <button onClick={() => { commit((p) => ({ ...p, settings: { ...p.settings, imageDur: bulkDur }, clips: p.clips.map((c) => (c.kind === "video" ? c : { ...c, duration: bulkDur })) })); showToast("Photo duration applied"); }}>Set photo length</button>
          <button onClick={() => { commit((p) => ({ ...p, clips: p.clips.map((c, i) => (c.kind === "image" ? { ...c, motion: (["zoomIn", "panLeft", "zoomOut", "panRight", "panUp"] as Motion[])[i % 5] } : c)) })); showToast("Camera motion mixed"); }}><ThunderboltOutlined /> Mix motion</button>
        </div>
        <button className="ve-btn" onClick={() => { commit((p) => ({ ...p, clips: p.clips.map((c) => ({ ...c, tf: { ...DEF_TF } })) })); showToast("All photos reset to default size & position"); }}><UndoOutlined /> Reset size / rotation on all</button>
        <div className="ve-label">Transition for all</div>
        <ChipRow items={TRANSITIONS} value={"__none__" as TransitionId} onPick={(v) => { commit((p) => ({ ...p, settings: { ...p.settings, defTransition: v }, clips: p.clips.map((c) => ({ ...c, transition: v })) })); showToast("Transition applied to all"); }} />
        <div className="ve-label">Filter for all</div>
        <ChipRow items={FILTERS.map((f) => ({ id: f.css, label: f.label }))} value={"__none__"} onPick={(v) => commit((p) => ({ ...p, clips: p.clips.map((c) => ({ ...c, filter: v })) }))} />
      </div>
    );
  };

  const renderTextTab = () => (
    <div className="ve-props-body">
      <div className="ve-label">Add text</div>
      <div className="ve-presets">
        {[["title", "Title"], ["subtitle", "Subtitle"], ["lower", "Lower third"], ["caption", "Caption"], ["quote", "Quote"], ["plain", "Text box"]].map(([k, l]) => (
          <button key={k} onClick={() => addText(k)}>{l}</button>
        ))}
      </div>
      <div className="ve-label">Stickers</div>
      <div className="ve-emoji">{EMOJI.map((em) => <button key={em} onClick={() => addSticker(em)}>{em}</button>)}</div>
      {selText ? (
        <>
          <div className="ve-label">Selected text</div>
          <textarea className="ve-input" rows={3} value={selText.text} onChange={(e) => patchText(selText.id, { text: e.target.value }, "txt")} />
          <Rng label="Starts at" value={selText.start} min={0} max={Math.max(total, 10)} step={0.1} unit="s" onChange={(v) => patchText(selText.id, { start: v }, "st")} />
          <Rng label="Shown for" value={selText.dur} min={0.3} max={Math.max(total, 10)} step={0.1} unit="s" onChange={(v) => patchText(selText.id, { dur: v }, "du")} />
          <div className="ve-actions two">
            <button onClick={() => { const i = proj.clips.findIndex((c) => c.id === selClip?.id); const idx = i >= 0 ? i : -1; if (idx >= 0) patchText(selText.id, { start: r2(lay.starts[idx]), dur: r2(proj.clips[idx].duration) }); else patchText(selText.id, { start: 0, dur: r2(total || 3) }); }}>Match clip / whole video</button>
            <button onClick={() => { const c = { ...selText, id: `txt_${uid()}`, x: clamp(selText.x + 3, 0, 90), y: clamp(selText.y + 3, 0, 90) }; commit((p) => ({ ...p, texts: [...p.texts, c] })); setSel({ t: "text", id: c.id }); }}><CopyOutlined /> Duplicate</button>
          </div>
          <select className="ve-input" value={selText.font} onChange={(e) => patchText(selText.id, { font: e.target.value })}>
            {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{fontName(f)}</option>)}
          </select>
          <Rng label="Size" value={selText.size} min={1} max={30} step={0.5} onChange={(v) => patchText(selText.id, { size: v }, "sz")} />
          <ChipRow items={[{ id: "left", label: "Left" }, { id: "center", label: "Center" }, { id: "right", label: "Right" }] as { id: TextOv["align"]; label: string }[]} value={selText.align} onPick={(v) => patchText(selText.id, { align: v })} />
          <div className="ve-chip-row">
            <button className={`ve-chip ${selText.bold ? "active" : ""}`} onClick={() => patchText(selText.id, { bold: !selText.bold })}>Bold</button>
            <button className={`ve-chip ${selText.italic ? "active" : ""}`} onClick={() => patchText(selText.id, { italic: !selText.italic })}>Italic</button>
            <button className={`ve-chip ${selText.shadow ? "active" : ""}`} onClick={() => patchText(selText.id, { shadow: !selText.shadow })}>Shadow</button>
          </div>
          <ColorRow label="Color" value={selText.color} onChange={(v) => patchText(selText.id, { color: v }, "col")} />
          <ColorRow label="Background" value={selText.bg} onChange={(v) => patchText(selText.id, { bg: v }, "bg")} />
          <button className="ve-link" onClick={() => patchText(selText.id, { bg: "transparent" })}>No background</button>
          <Rng label="Outline" value={selText.stroke} min={0} max={2} step={0.1} onChange={(v) => patchText(selText.id, { stroke: v }, "ol")} />
          <ColorRow label="Outline color" value={selText.strokeColor} onChange={(v) => patchText(selText.id, { strokeColor: v }, "olc")} />
          <Rng label="Opacity" value={Math.round(selText.opacity * 100)} min={10} max={100} unit="%" onChange={(v) => patchText(selText.id, { opacity: v / 100 }, "op")} />
          <Rng label="Rotation" value={selText.rotate} min={-180} max={180} unit="°" onChange={(v) => patchText(selText.id, { rotate: v }, "rot")} />
          <div className="ve-label">Animation</div>
          <ChipRow items={ANIMS} value={selText.anim} onPick={(v) => patchText(selText.id, { anim: v })} />
          <button className="ve-btn danger" onClick={() => deleteText(selText.id)}><DeleteOutlined /> Delete text</button>
        </>
      ) : (
        <div className="ve-empty"><FontSizeOutlined /><span>Add text, then drag it on the preview. Resize with the corner dot, rotate with the green dot.</span></div>
      )}
    </div>
  );

  const renderAudioTab = () => (
    <div className="ve-props-body">
      <div className="ve-label">Original video sound</div>
      <Toggle label="Mute original sound in every video" checked={proj.settings.muteOriginal} onChange={(v) => patchSettings({ muteOriginal: v })} />
      <Rng label="Original volume" value={proj.settings.origVol} min={0} max={200} unit="%" onChange={(v) => patchSettings({ origVol: v }, "ov")} />
      <Rng label="Music volume" value={proj.settings.musicVol} min={0} max={150} unit="%" onChange={(v) => patchSettings({ musicVol: v }, "mv")} />
      <div className="ve-label">Background music & voice</div>
      <button className="ve-btn primary" onClick={() => musicFileRef.current?.click()}><CustomerServiceOutlined /> Add your song / music</button>
      <button className={`ve-btn ${recording ? "rec" : ""}`} onClick={toggleRecord}>
        <AudioOutlined /> {recording ? "Stop recording" : "Record voice-over (plays video)"}
      </button>
      {proj.tracks.length > 0 && (
        <div className="ve-list">
          {proj.tracks.map((t) => (
            <div key={t.id} className={`ve-row ${sel?.id === t.id ? "active" : ""}`} onClick={() => setSel({ t: "audio", id: t.id })}>
              <CustomerServiceOutlined /><span>{t.name}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteTrack(t.id); }} aria-label="Remove track"><CloseOutlined /></button>
            </div>
          ))}
        </div>
      )}
      {selTrack && (
        <>
          <div className="ve-label">Selected track</div>
          <Rng label="Starts at" value={selTrack.start} min={0} max={Math.max(total, 10)} step={0.1} unit="s" onChange={(v) => patchTrack(selTrack.id, { start: v }, "st")} />
          <Rng label="Plays for" value={selTrack.len} min={0.5} max={selTrack.loop ? Math.max(total, selTrack.duration) : selTrack.duration - selTrack.trimStart} step={0.1} unit="s" onChange={(v) => patchTrack(selTrack.id, { len: v }, "ln")} />
          <Rng label="Skip first" value={selTrack.trimStart} min={0} max={Math.max(0, selTrack.duration - 1)} step={0.1} unit="s" onChange={(v) => patchTrack(selTrack.id, { trimStart: v, len: Math.min(selTrack.len, Math.max(0.5, selTrack.duration - v)) }, "tr")} />
          <Rng label="Volume" value={Math.round(selTrack.volume * 100)} min={0} max={150} unit="%" onChange={(v) => patchTrack(selTrack.id, { volume: v / 100 }, "vo")} />
          <Rng label="Fade in" value={selTrack.fadeIn} min={0} max={10} step={0.5} unit="s" onChange={(v) => patchTrack(selTrack.id, { fadeIn: v }, "fi")} />
          <Rng label="Fade out" value={selTrack.fadeOut} min={0} max={10} step={0.5} unit="s" onChange={(v) => patchTrack(selTrack.id, { fadeOut: v }, "fo")} />
          <Toggle label="Loop until it ends" checked={selTrack.loop} onChange={(v) => patchTrack(selTrack.id, { loop: v })} />
          <button className="ve-btn" onClick={() => patchTrack(selTrack.id, { start: 0, loop: true, len: r2(Math.max(0.5, total)) })}><SyncOutlined /> Loop to fit whole video</button>
          <button className="ve-btn" onClick={() => patchTrack(selTrack.id, { len: r2(clamp(total - selTrack.start, 0.5, selTrack.loop ? 3600 : selTrack.duration - selTrack.trimStart)) })}><ScissorOutlined /> Trim to video length</button>
        </>
      )}
    </div>
  );

  const renderProjectTab = () => {
    const s = proj.settings;
    return (
      <div className="ve-props-body">
        <div className="ve-label">Format</div>
        <ChipRow items={ASPECTS.map((a) => ({ id: a.id, label: a.label }))} value={s.aspect} onPick={(v) => patchSettings({ aspect: v })} />
        <div className="ve-label">Quality</div>
        <ChipRow items={[{ id: 480, label: "480p" }, { id: 720, label: "720p" }, { id: 1080, label: "1080p" }]} value={s.res} onPick={(v) => patchSettings({ res: v })} />
        <ChipRow items={[{ id: 24, label: "24 fps" }, { id: 30, label: "30 fps" }, { id: 60, label: "60 fps" }]} value={s.fps} onPick={(v) => patchSettings({ fps: v })} />
        <div className="ve-label">Look</div>
        <ColorRow label="Background" value={s.bg} onChange={(v) => patchSettings({ bg: v }, "bg")} />
        <div className="ve-label">Colour grade (whole video)</div>
        <ChipRow items={FILTERS.map((f) => ({ id: f.id, label: f.label }))} value={s.grade} onPick={(v) => patchSettings({ grade: v })} />
        <Toggle label="Vignette" checked={s.vignette} onChange={(v) => patchSettings({ vignette: v })} />
        <Toggle label="Cinema bars" checked={s.letterbox} onChange={(v) => patchSettings({ letterbox: v })} />
        <div className="ve-label">Fade in / out (picture &amp; sound)</div>
        <Rng label="Fade in from black" value={s.fadeIn} min={0} max={3} step={0.1} unit="s" onChange={(v) => patchSettings({ fadeIn: v }, "fin")} />
        <Rng label="Fade out to black" value={s.fadeOut} min={0} max={3} step={0.1} unit="s" onChange={(v) => patchSettings({ fadeOut: v }, "fout")} />
        <div className="ve-label">Logo / watermark</div>
        <button className="ve-btn" onClick={() => wmFileRef.current?.click()}><PictureOutlined /> {s.wm.url ? "Replace logo" : "Add logo"}</button>
        {s.wm.url && (
          <>
            <ChipRow items={[{ id: "tl", label: "Top left" }, { id: "tr", label: "Top right" }, { id: "bl", label: "Bottom left" }, { id: "br", label: "Bottom right" }] as { id: Watermark["pos"]; label: string }[]} value={s.wm.pos} onPick={(v) => patchSettings({ wm: { ...s.wm, pos: v } })} />
            <Rng label="Size" value={s.wm.size} min={4} max={40} unit="%" onChange={(v) => patchSettings({ wm: { ...s.wm, size: v } }, "wms")} />
            <Rng label="Opacity" value={s.wm.opacity} min={10} max={100} unit="%" onChange={(v) => patchSettings({ wm: { ...s.wm, opacity: v } }, "wmo")} />
            <button className="ve-link" onClick={() => patchSettings({ wm: { ...s.wm, url: null } })}>Remove logo</button>
          </>
        )}
        <div className="ve-label">Project</div>
        <button className="ve-btn danger" onClick={clearProject}><DeleteOutlined /> Clear whole project</button>
      </div>
    );
  };

  const renderCoverTab = () => (
    <div className="ve-props-body">
      <ChipRow items={[{ id: "thumb", label: "Thumbnail 1280×720" }, { id: "banner", label: "Channel banner 2560×1440" }] as { id: "thumb" | "banner"; label: string }[]} value={coverTab} onPick={setCoverTab} />
      <Toggle label="Use my thumbnail design as the Video Album cover" checked={coverAsAlbum} onChange={setCoverAsAlbum} />
      {coverTab === "thumb" ? (
        <DesignEditor key="thumb" label="Thumbnail" W={1280} H={720} cfg={thumb} onChange={(pt) => setThumb((c) => ({ ...c, ...pt }))} pool={pool} getFrame={getFrame} videoTitle={meta.title} filename={`${safeFile(meta.title)}_thumbnail`} toast={showToast} />
      ) : (
        <DesignEditor key="banner" label="Banner" W={2560} H={1440} cfg={banner} onChange={(pt) => setBanner((c) => ({ ...c, ...pt }))} pool={pool} getFrame={getFrame} videoTitle={meta.title} filename={`${safeFile(meta.title)}_banner`} toast={showToast} safe={{ w: 1546, h: 423 }} />
      )}
    </div>
  );

  const renderDetailsTab = () => (
    <div className="ve-props-body">
      <div className="ve-hint">These details are saved together with the video in your Video Album.</div>
      <div className="ve-label">Title <em>{meta.title.length}/100</em></div>
      <input className="ve-input" maxLength={100} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
      <div className="ve-label">Description <em>{meta.desc.length}/5000</em></div>
      <textarea className="ve-input" rows={6} maxLength={5000} value={meta.desc} onChange={(e) => setMeta({ ...meta, desc: e.target.value })} placeholder="Tell viewers about this video…" />
      <div className="ve-label">Tags <em>{tagChars}/500</em></div>
      <div className="ve-tags">
        {meta.tags.map((t) => (
          <span key={t} className="ve-tag">#{t}<button onClick={() => setMeta({ ...meta, tags: meta.tags.filter((x) => x !== t) })} aria-label={`Remove ${t}`}><CloseOutlined /></button></span>
        ))}
      </div>
      <input
        className="ve-input" value={tagDraft} placeholder="Type a tag, press Enter or comma"
        onChange={(e) => { if (e.target.value.includes(",")) addTags(e.target.value); else setTagDraft(e.target.value); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTags(tagDraft); } }}
      />
      <div className="ve-actions two">
        <button onClick={suggestTags}><ThunderboltOutlined /> Suggest tags</button>
        <button onClick={() => { navigator.clipboard?.writeText(meta.tags.join(", ")); showToast("Tags copied"); }}><CopyOutlined /> Copy tags</button>
      </div>
      <div className="ve-label">Category</div>
      <select className="ve-input" value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <div className="ve-label">Visibility</div>
      <ChipRow items={[{ id: "public", label: "Public" }, { id: "unlisted", label: "Unlisted" }, { id: "private", label: "Private" }]} value={meta.visibility} onPick={(v) => setMeta({ ...meta, visibility: v })} />
      <button className="ve-btn" onClick={() => { navigator.clipboard?.writeText(metaText()); showToast("Details copied"); }}><CopyOutlined /> Copy all details</button>
      {exp.savedId && (
        <button className="ve-btn" onClick={() => void saveToAlbum()} disabled={saving}><SaveOutlined /> Update details in Video Album</button>
      )}
    </div>
  );

  const renderExportTab = () => {
    const mime = pickMime();
    return (
      <div className="ve-props-body">
        <div className="ve-summary">
          <div><span>Length</span><strong>{fmt(total)}</strong></div>
          <div><span>Size</span><strong>{W}×{H}</strong></div>
          <div><span>Clips</span><strong>{proj.clips.length}</strong></div>
          <div><span>Audio tracks</span><strong>{proj.tracks.length}</strong></div>
        </div>

        <div className="ve-label">Quality check <em>{issues.length ? `${issues.length} to look at` : "all good"}</em></div>
        <IssueList issues={issues} />

        <div className="ve-label">File format</div>
        <ChipRow items={[{ id: "webm", label: "WebM (best support)" }, { id: "mp4", label: "MP4 (if supported)" }]} value={fmtPref} onPick={setFmtPref} />
        {mime && mime[0] !== fmtPref && <div className="ve-hint">This browser can't record {fmtPref.toUpperCase()}, so it will save {mime[0].toUpperCase()}.</div>}
        <Toggle label="Mute speakers while rendering" checked={muteWhileExport} onChange={setMuteWhileExport} />

        <div className="ve-label">Video Album</div>
        <Toggle label="Save to Video Album automatically after rendering" checked={autoSave} onChange={setAutoSave} />
        <Toggle label="Use my Thumbnail design as the album cover" checked={coverAsAlbum} onChange={setCoverAsAlbum} />

        {exp.busy ? (
          <>
            <div className="ve-progress"><i style={{ width: `${progress}%` }} /></div>
            <div className="ve-hint">Recording in real time — {progress}%. Keep this tab open and visible.</div>
            <button className="ve-btn danger" onClick={cancelExport}><CloseOutlined /> Stop &amp; keep what's recorded</button>
          </>
        ) : (
          <>
            <button className="ve-btn primary big" onClick={() => void exportVideo(false)} disabled={!total}><RocketOutlined /> Render &amp; review</button>
            <button className="ve-btn save" onClick={() => void saveClick()} disabled={!total || saving}>
              <SaveOutlined /> {exp.blob && !stale ? (exp.savedId ? "Update Video Album entry" : "Save to Video Album") : "Render & save to Video Album"}
            </button>
          </>
        )}
        {exp.err && <div className="ve-hint err">{exp.err}</div>}
        {exp.url && !exp.busy && (
          <>
            {stale && <div className="ve-hint warn">You changed the video after this render. Render again to include your changes.</div>}
            <video className="ve-result" src={exp.url} controls onLoadedMetadata={fixDuration} />
            <div className="ve-actions two">
              <button onClick={() => setReviewOpen(true)}><EyeOutlined /> Review</button>
              <button onClick={downloadRender}><DownloadOutlined /> Download</button>
            </div>
            <div className="ve-hint">
              {fmtMB(exp.size)} · {exp.ext.toUpperCase()} · {exp.savedId ? <strong className="ve-ok">Saved in Video Album</strong> : "Not saved to the album yet"}
            </div>
            {exp.savedId && <button className="ve-btn" onClick={() => navigate(LIBRARY_PATH)}><FolderOpenOutlined /> Open Video Album</button>}
          </>
        )}

        <div className="ve-label">Publishing pack</div>
        <div className="ve-actions two">
          <button onClick={() => void downloadDesign(thumb, 1280, 720, `${safeFile(meta.title)}_thumbnail`)}><FileImageOutlined /> Thumbnail</button>
          <button onClick={() => void downloadDesign(banner, 2560, 1440, `${safeFile(meta.title)}_banner`)}><FileImageOutlined /> Banner</button>
          <button onClick={() => downloadBlob(new Blob([metaText()], { type: "text/plain" }), `${safeFile(meta.title)}_details.txt`)}><FileTextOutlined /> Title, tags &amp; description</button>
          <button onClick={() => setTab("cover")}><YoutubeOutlined /> Edit cover art</button>
        </div>
      </div>
    );
  };

  /* ───────────── Render ───────────── */
  const TABS: { id: RTab; icon: React.ReactNode; label: string }[] = [
    { id: "clip", icon: <VideoCameraOutlined />, label: "Clip" },
    { id: "text", icon: <FontSizeOutlined />, label: "Text" },
    { id: "audio", icon: <CustomerServiceOutlined />, label: "Audio" },
    { id: "project", icon: <SettingOutlined />, label: "Project" },
    { id: "cover", icon: <PictureOutlined />, label: "Cover" },
    { id: "details", icon: <TagsOutlined />, label: "Details" },
    { id: "export", icon: <ExportOutlined />, label: "Export" },
  ];
  const trackLaneH = 34;
  const rowText = textLanes.count * 24 + 10;
  const rowAudio = Math.max(1, proj.tracks.length) * trackLaneH + 8;
  const saveLabel = exp.busy ? `Rendering ${progress}%` : saving ? "Saving…" : savedNow ? "Saved ✓" : "Save to Album";

  return (
    <main className="ve-page">
      {toast && <div className="ve-toast" role="status"><CheckOutlined /> {toast}</div>}

      <input ref={mediaFileRef} type="file" accept="image/*,video/*,audio/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={musicFileRef} type="file" accept="audio/*,video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void addMusic({ url: URL.createObjectURL(f), name: f.name, start: 0 }); e.target.value = ""; }} />
      <input ref={wmFileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) patchSettings({ wm: { ...proj.settings.wm, url: URL.createObjectURL(f) } }); e.target.value = ""; }} />

      <section className="ve-stage-card">
        <header className="ve-topbar">
          <div className="ve-top-left">
            <button className="ve-icon-btn" onClick={goBack} aria-label="Back"><ArrowLeftOutlined /></button>
            <VideoCameraOutlined className="ve-logo" />
            <input className="ve-title-input" value={meta.title} maxLength={100} onChange={(e) => setMeta({ ...meta, title: e.target.value })} aria-label="Video title" />
            <span className="ve-crumb">{proj.clips.length} clips · {fmt(total)} · {proj.settings.aspect}</span>
            {proj.clips.length > 0 && (
              <span className={`ve-status ${savedNow ? "saved" : stale ? "stale" : "unsaved"}`}>
                {savedNow ? <><CheckCircleOutlined /> Saved in album</> : stale ? <><WarningOutlined /> Changed since render</> : <><InfoCircleOutlined /> Not saved</>}
              </span>
            )}
          </div>
          <div className="ve-top-right">
            <button className="ve-icon-btn ghost" onClick={undo} disabled={!undoStack.length} aria-label="Undo" title="Undo (Ctrl Z)"><UndoOutlined /></button>
            <button className="ve-icon-btn ghost" onClick={redo} disabled={!redoStack.length} aria-label="Redo" title="Redo"><RedoOutlined /></button>
            <button className="ve-icon-btn ghost" onClick={() => setHelpOpen(true)} aria-label="Shortcuts" title="Shortcuts (?)"><QuestionCircleOutlined /></button>
            <button className="ve-btn-outline" onClick={() => void previewFull()} disabled={!total} title="Play the whole video full screen (F)"><FullscreenOutlined /><span className="ve-lbl"> Preview</span></button>
            <button className="ve-btn-outline" onClick={() => navigate(LIBRARY_PATH)} title="Open the Video Album"><FolderOpenOutlined /><span className="ve-lbl"> Album</span></button>
            <button className="ve-btn-outline" onClick={() => setTab("cover")}><PictureOutlined /><span className="ve-lbl"> Thumbnail &amp; banner</span></button>
            <button className="ve-btn-outline" onClick={() => setTab("export")}><ExportOutlined /><span className="ve-lbl"> Export</span></button>
            <button className="ve-btn-primary" onClick={() => void saveClick()} disabled={!total || exp.busy || saving} title="Save to Video Album (Ctrl S)"><SaveOutlined /> {saveLabel}</button>
          </div>
        </header>

        <div className="ve-body">
          {/* Media bin */}
          <aside
            className="ve-media"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { if (e.dataTransfer.files?.length) { e.preventDefault(); void addFiles(e.dataTransfer.files); } }}
          >
            <div className="ve-label first">Media</div>
            <button className="ve-btn primary" onClick={() => mediaFileRef.current?.click()}><UploadOutlined /> Add photos &amp; videos</button>
            <Toggle label="Add to timeline when uploaded" checked={autoAdd} onChange={setAutoAdd} />
            <div className="ve-actions two">
              <button onClick={addCard}><PlusOutlined /> Title card</button>
              <button disabled={!pool.length} onClick={() => addToTimeline(pool)}>Add all</button>
            </div>
            <div className="ve-media-grid">
              {pool.length === 0 && <div className="ve-empty small"><PictureOutlined /><span>Drop images and videos here, or use the button above.</span></div>}
              {pool.map((m) => (
                <div
                  key={m.id} className="ve-media-item" draggable title={`${m.name} — drag to the timeline`}
                  onDragStart={(e) => { e.dataTransfer.setData("text/ve-media", m.id); e.dataTransfer.effectAllowed = "copy"; }}
                  onDoubleClick={() => addToTimeline([m])}
                >
                  <img src={m.thumb} alt={m.name} draggable={false} />
                  {m.kind === "video" && <span className="ve-badge">{fmt(m.duration).slice(0, 5)}</span>}
                  <button className="ve-add" onClick={() => addToTimeline([m])} aria-label="Add to timeline"><PlusOutlined /></button>
                  <button className="ve-del" onClick={() => setPool((pl) => pl.filter((x) => x.id !== m.id))} aria-label="Remove from bin"><CloseOutlined /></button>
                </div>
              ))}
            </div>

            <div className="ve-label">Order in video <em>drag to rearrange</em></div>
            {proj.clips.length === 0 ? (
              <div className="ve-hint">Photos and clips you add will appear here. Drag them to change the order.</div>
            ) : (
              <>
                <div className="ve-actions two">
                  <button onClick={reverseClips} disabled={proj.clips.length < 2}><SwapOutlined /> Reverse</button>
                  <button onClick={shuffleClips} disabled={proj.clips.length < 2}><RetweetOutlined /> Shuffle</button>
                </div>
                <div className="ve-story">
                  {proj.clips.map((c, i) => (
                    <div
                      key={c.id}
                      className={`ve-story-item ${sel?.id === c.id ? "selected" : ""} ${dragClipId === c.id ? "dragging" : ""} ${overClipId === c.id && dragClipId !== c.id ? "over" : ""}`}
                      draggable
                      title={`${c.name} — drag to rearrange`}
                      onDragStart={(e) => { e.dataTransfer.setData("text/ve-clip", c.id); e.dataTransfer.effectAllowed = "move"; setDragClipId(c.id); }}
                      onDragOver={(e) => { if (dragClipId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverClipId(c.id); } }}
                      onDragLeave={() => setOverClipId((o) => (o === c.id ? null : o))}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragClipId) moveClipTo(dragClipId, c.id); setDragClipId(null); setOverClipId(null); }}
                      onDragEnd={() => { setDragClipId(null); setOverClipId(null); }}
                      onClick={() => { setSel({ t: "clip", id: c.id }); setTab("clip"); seek(lay.starts[i] + Math.min(0.05, c.duration / 2)); }}
                    >
                      <span
                        className="ve-story-thumb"
                        style={{ backgroundImage: c.kind === "card" ? `linear-gradient(135deg, ${c.card?.c1}, ${c.card?.c2})` : c.thumb ? `url(${c.thumb})` : undefined }}
                      />
                      <span className="ve-story-num">{i + 1}</span>
                      <span className="ve-story-move">
                        <button disabled={i === 0} onClick={(e) => { e.stopPropagation(); moveClipBy(c.id, -1); }} aria-label="Move earlier"><LeftOutlined /></button>
                        <button disabled={i === proj.clips.length - 1} onClick={(e) => { e.stopPropagation(); moveClipBy(c.id, 1); }} aria-label="Move later"><RightOutlined /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>

          {/* Center */}
          <div className="ve-center">
            <div className="ve-preview" ref={stageRef}>
              <div className={`ve-canvas-box ${clipBoxNow ? "has-clip-box" : ""}`} ref={boxRef} style={{ width: dw, height: dh }} onPointerDown={onCanvasDown}>
                <canvas ref={canvasRef} width={W} height={H} />
                {selText && (
                  <div className="ve-selbox" style={{ left: `${selText.x}%`, top: `${selText.y}%`, width: `${selText.w}%`, height: `${selText.h}%`, transform: `rotate(${selText.rotate}deg)` }}>
                    <span className="ve-handle resize" onPointerDown={(e) => textDrag(e, selText.id, "resize")} title="Resize" />
                    <span className="ve-handle rotate" onPointerDown={(e) => textDrag(e, selText.id, "rotate")} title="Rotate" />
                  </div>
                )}
                {clipBoxNow && selClip && (
                  <div
                    className="ve-selbox clip"
                    style={{
                      left: `${clipBoxNow.cx - clipBoxNow.w / 2}%`, top: `${clipBoxNow.cy - clipBoxNow.h / 2}%`,
                      width: `${clipBoxNow.w}%`, height: `${clipBoxNow.h}%`, transform: `rotate(${clipBoxNow.rot}deg)`,
                    }}
                  >
                    <span className="ve-handle scale tl" onPointerDown={(e) => clipDrag(e, selClip.id, "scale")} title="Resize" />
                    <span className="ve-handle scale tr" onPointerDown={(e) => clipDrag(e, selClip.id, "scale")} title="Resize" />
                    <span className="ve-handle scale bl" onPointerDown={(e) => clipDrag(e, selClip.id, "scale")} title="Resize" />
                    <span className="ve-handle scale br" onPointerDown={(e) => clipDrag(e, selClip.id, "scale")} title="Resize" />
                    <span className="ve-handle rotate" onPointerDown={(e) => clipDrag(e, selClip.id, "rotate")} title="Rotate" />
                  </div>
                )}
                {exp.busy && (
                  <div className="ve-rendering" role="status">
                    <span className="ve-spin" />
                    <strong>Rendering… {progress}%</strong>
                    <small>Keep this tab open</small>
                    <div className="ve-progress"><i style={{ width: `${progress}%` }} /></div>
                  </div>
                )}
              </div>
            </div>

            <div className="ve-transport">
              <button className="ve-icon-btn ghost" onClick={() => jumpClip(-1)} title="Previous clip ( [ )" aria-label="Previous clip"><StepBackwardOutlined /></button>
              <button className="ve-play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <PauseOutlined /> : <CaretRightOutlined />}</button>
              <button className="ve-icon-btn ghost" onClick={() => jumpClip(1)} title="Next clip ( ] )" aria-label="Next clip"><StepForwardOutlined /></button>
              <span className="ve-time">{fmt(uiTime)} <em>/ {fmt(total)}</em></span>
              <button className={`ve-icon-btn ghost ${loop ? "on" : ""}`} onClick={() => setLoop((v) => !v)} title="Loop (L)" aria-label="Loop"><SyncOutlined /></button>
              <button className="ve-icon-btn ghost" onClick={splitAtPlayhead} title="Split at playhead (S)" aria-label="Split"><ScissorOutlined /></button>
              <button className="ve-icon-btn ghost" onClick={() => void previewFull()} title="Full-screen preview (F)" aria-label="Full screen preview"><FullscreenOutlined /></button>
              <button className={`ve-icon-btn ghost ${proj.settings.muteOriginal ? "on" : ""}`} onClick={() => patchSettings({ muteOriginal: !proj.settings.muteOriginal })} title="Mute original video sound" aria-label="Mute original">
                {proj.settings.muteOriginal ? <AudioMutedOutlined /> : <SoundOutlined />}
              </button>
              <div className="ve-grow" />
              <button className="ve-icon-btn ghost" onClick={() => setPps((z) => clamp(z - 15, 20, 240))} aria-label="Zoom out"><ZoomOutOutlined /></button>
              <input className="ve-zoom" type="range" min={20} max={240} value={pps} onChange={(e) => setPps(Number(e.target.value))} aria-label="Timeline zoom" />
              <button className="ve-icon-btn ghost" onClick={() => setPps((z) => clamp(z + 15, 20, 240))} aria-label="Zoom in"><ZoomInOutlined /></button>
              <button className="ve-fit" onClick={fitTimeline}>Fit</button>
            </div>

            <div className="ve-timeline" ref={tlRef}>
              <div className="ve-tl-inner" ref={innerRef} style={{ width: innerW }} onDragOver={(e) => e.preventDefault()} onDrop={onTimelineDrop}>
                <div className="ve-ruler" onPointerDown={onRulerDown}>
                  <span className="ve-label-cell" />
                  {ticks.map((s) => (
                    <span key={s} className={`ve-tick ${Number.isInteger(s) ? "major" : ""}`} style={{ left: GUT + s * pps }}>{Number.isInteger(s) ? fmt(s).slice(0, 5) : ""}</span>
                  ))}
                </div>

                <div className="ve-row-track video">
                  <span className="ve-label-cell"><VideoCameraOutlined /> Video</span>
                  {proj.clips.length === 0 && <span className="ve-row-hint">Drop photos or videos here</span>}
                  {proj.clips.map((c, i) => (
                    <div
                      key={c.id}
                      className={`ve-clip ${c.kind} ${sel?.id === c.id ? "selected" : ""}`}
                      style={{
                        left: GUT + lay.starts[i] * pps, width: Math.max(14, c.duration * pps),
                        backgroundImage: c.kind === "card" ? `linear-gradient(135deg, ${c.card?.c1}, ${c.card?.c2})` : c.thumb ? `url(${c.thumb})` : undefined,
                      }}
                      onPointerDown={(e) => clipDown(e, c)}
                      title={c.name}
                    >
                      {lay.trans[i] > 0 && <span className="ve-trans" style={{ width: lay.trans[i] * pps }} title={`Transition: ${c.transition}`} />}
                      <span className="ve-clip-label">
                        {c.kind === "video" && (c.muted || proj.settings.muteOriginal ? <AudioMutedOutlined /> : <SoundOutlined />)} {c.name}
                      </span>
                      <span className="ve-clip-dur">{c.duration.toFixed(1)}s</span>
                      <span className="ve-resize" onPointerDown={(e) => clipResize(e, c)} />
                    </div>
                  ))}
                </div>

                <div className="ve-row-track" style={{ height: rowText }}>
                  <span className="ve-label-cell"><FontSizeOutlined /> Text</span>
                  {proj.texts.map((t) => (
                    <div
                      key={t.id} className={`ve-block text ${sel?.id === t.id ? "selected" : ""}`}
                      style={{ left: GUT + t.start * pps, width: Math.max(18, t.dur * pps), top: 5 + (textLanes.map.get(t.id) ?? 0) * 24 }}
                      onPointerDown={(e) => textBlockDown(e, t, "move")}
                    >
                      <span>{t.text}</span>
                      <span className="ve-resize" onPointerDown={(e) => textBlockDown(e, t, "resize")} />
                    </div>
                  ))}
                </div>

                <div className="ve-row-track" style={{ height: rowAudio }}>
                  <span className="ve-label-cell"><CustomerServiceOutlined /> Music</span>
                  {proj.tracks.length === 0 && <span className="ve-row-hint">Add a song or record a voice-over in the Audio tab</span>}
                  {proj.tracks.map((tr, i) => {
                    const wpx = Math.max(24, tr.len * pps);
                    const n = Math.min(240, Math.max(8, Math.floor(wpx / 3)));
                    return (
                      <div
                        key={tr.id} className={`ve-block audio ${sel?.id === tr.id ? "selected" : ""}`}
                        style={{ left: GUT + tr.start * pps, width: wpx, top: 4 + i * trackLaneH, height: trackLaneH - 4 }}
                        onPointerDown={(e) => trackDown(e, tr, "move")}
                      >
                        <span className="ve-wave">{peaksFor(tr, n).map((h, k) => <i key={k} style={{ height: `${Math.max(8, h * 100)}%` }} />)}</span>
                        <span className="ve-audio-name">{tr.name}</span>
                        <span className="ve-resize" onPointerDown={(e) => trackDown(e, tr, "resize")} />
                      </div>
                    );
                  })}
                </div>

                <div className="ve-playhead" style={{ left: GUT + uiTime * pps }}><span /></div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <aside className="ve-props">
            <div className="ve-tabs">
              {TABS.map((t) => (
                <button key={t.id} className={`ve-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.icon}<span>{t.label}</span></button>
              ))}
            </div>
            {tab === "clip" && renderClipTab()}
            {tab === "text" && renderTextTab()}
            {tab === "audio" && renderAudioTab()}
            {tab === "project" && renderProjectTab()}
            {tab === "cover" && renderCoverTab()}
            {tab === "details" && renderDetailsTab()}
            {tab === "export" && renderExportTab()}
          </aside>
        </div>
      </section>

      {/* Review window: play the rendered video, check it, fix things, then save */}
      {reviewOpen && exp.url && (
        <div className="ve-modal" role="dialog" aria-modal="true" aria-label="Review your video" onClick={() => setReviewOpen(false)}>
          <div className="ve-modal-card ve-review" onClick={(e) => e.stopPropagation()}>
            <div className="ve-modal-head">
              <h3><EyeOutlined /> Review your video</h3>
              {exp.savedId && !stale && <span className="ve-saved-pill"><CheckCircleOutlined /> Saved in Video Album</span>}
              <button className="ve-icon-btn ghost" onClick={() => setReviewOpen(false)} aria-label="Close"><CloseOutlined /></button>
            </div>
            <video className="ve-review-video" src={exp.url} controls autoPlay playsInline onLoadedMetadata={fixDuration} />
            <div className="ve-review-body">
              <div className="ve-review-meta">
                <span>{fmt(exp.duration)}</span><span>{exp.w}×{exp.h}</span><span>{fmtMB(exp.size)} · {exp.ext.toUpperCase()}</span>
              </div>
              {stale && <div className="ve-issue warn"><WarningOutlined /><span>You changed the video after this render. Render again to include your changes.</span><button onClick={() => void exportVideo(false)}>Re-render</button></div>}

              <div className="ve-review-fields">
                <label>Title<input className="ve-input" maxLength={100} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></label>
                <label>Category
                  <select className="ve-input" value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label className="ve-review-desc">Description
                <textarea className="ve-input" rows={2} maxLength={5000} value={meta.desc} onChange={(e) => setMeta({ ...meta, desc: e.target.value })} placeholder="Tell viewers about this video…" />
              </label>
              <ChipRow items={[{ id: "public", label: "Public" }, { id: "unlisted", label: "Unlisted" }, { id: "private", label: "Private" }]} value={meta.visibility} onPick={(v) => setMeta({ ...meta, visibility: v })} />

              <div className="ve-label">Things you can correct</div>
              <IssueList issues={issues} />
              {issues.length > 0 && <div className="ve-hint">Fixes change the project — render again afterwards, then save.</div>}

              <div className="ve-review-actions">
                <button className="ve-btn-primary" onClick={() => void saveToAlbum()} disabled={saving || stale}>
                  <SaveOutlined /> {saving ? "Saving…" : exp.savedId ? "Update album entry" : "Save to Video Album"}
                </button>
                <button className="ve-btn-outline" onClick={downloadRender}><DownloadOutlined /> Download</button>
                <button className="ve-btn-outline" onClick={() => setReviewOpen(false)}><ReloadOutlined /> Keep editing</button>
                <button className="ve-btn-outline" onClick={() => void exportVideo(false)}><RocketOutlined /> Render again</button>
                {exp.savedId && <button className="ve-btn-outline" onClick={() => navigate(LIBRARY_PATH)}><FolderOpenOutlined /> Open album</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="ve-modal" onClick={() => setHelpOpen(false)}>
          <div className="ve-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ve-modal-head"><h3>Keyboard shortcuts</h3><button className="ve-icon-btn ghost" onClick={() => setHelpOpen(false)} aria-label="Close"><CloseOutlined /></button></div>
            <div className="ve-modal-body">
              {SHORTCUTS.map(([k, l]) => <div key={k} className="ve-help-row"><span>{l}</span><kbd>{k}</kbd></div>)}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}