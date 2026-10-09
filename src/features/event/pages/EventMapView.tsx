import { useEffect, useMemo, useRef, useState } from "react";
import {
  AimOutlined,
  BgColorsOutlined,
  BranchesOutlined,
  CalendarOutlined,
  CarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ExpandOutlined,
  FireOutlined,
  MinusOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import "./EventMapView.css";

type MapStyle = "dark" | "light" | "satellite";
type View = { lat: number; lng: number; zoom: number };
type Pt = { e: any; x: number; y: number };
type Hit = { x: number; y: number; r: number; pts: Pt[] };

interface Props {
  events: any[];
  starredIds: Set<string>;
  onOpenEvent: (event: any) => void;
  onPinVenue: (eventId: string) => void;
}

const TILE = 256;
const MIN_Z = 2;
const MAX_Z = 18;
const STYLE_ORDER: MapStyle[] = ["dark", "light", "satellite"];
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#cbd5e1",
  PLANNED: "#60a5fa",
  LIVE: "#22c55e",
  DONE: "#a78bfa",
};

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/* ---------------- projection (Web Mercator) ---------------- */
const worldSize = (z: number) => TILE * Math.pow(2, z);

const project = (lat: number, lng: number, z: number) => {
  const s = worldSize(z);
  const sin = clamp(Math.sin((lat * Math.PI) / 180), -0.9999, 0.9999);
  return {
    x: ((lng + 180) / 360) * s,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s,
  };
};

const unproject = (x: number, y: number, z: number) => {
  const s = worldSize(z);
  const n = Math.PI - (2 * Math.PI * y) / s;
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: (x / s) * 360 - 180,
  };
};

/* ---------------- event helpers ---------------- */
const parseDT = (e: any): Date | null => {
  if (!e?.date) return null;
  const d = new Date(`${e.date} ${e.time || ""}`.trim());
  return isNaN(d.getTime()) ? null : d;
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const dayDiff = (e: any): number | null => {
  const d = parseDT(e);
  return d ? Math.round((dayStart(d) - dayStart(new Date())) / 86400000) : null;
};

const hasPin = (e: any) =>
  e?.location && Number.isFinite(Number(e.location.lat)) && Number.isFinite(Number(e.location.lng));

const haversineKm = (a: any, b: any) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

/* ---------------- tiles (all keyless) ----------------
   dark      -> Esri World Dark Gray Base + Reference (labels overlay)
   light     -> OpenStreetMap standard
   satellite -> Esri World Imagery
   Each layer has its own max native zoom; beyond it we upscale the
   last available tile level instead of requesting blank tiles. */
type Layer = { url: (z: number, x: number, y: number) => string; max: number };

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

const LAYERS: Record<MapStyle, Layer[]> = {
  dark: [
    { url: (z, x, y) => `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`, max: 16 },
    { url: (z, x, y) => `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/${z}/${y}/${x}`, max: 16 },
  ],
  light: [
    { url: (z, x, y) => `https://${"abc"[(x + y) % 3]}.tile.openstreetmap.org/${z}/${x}/${y}.png`, max: 19 },
  ],
  satellite: [
    { url: (z, x, y) => `${ESRI}/World_Imagery/MapServer/tile/${z}/${y}/${x}`, max: 18 },
  ],
};

const BG: Record<MapStyle, string> = {
  dark: "#1f1f1f",
  light: "#e5e7eb",
  satellite: "#0b1220",
};

type Tile = { img: HTMLImageElement; ok: boolean };
const tileCache = new Map<string, Tile>();

const getTile = (url: string): Tile => {
  let tile = tileCache.get(url);
  if (!tile) {
    const img = new Image();
    const t: Tile = { img, ok: false };
    img.onload = () => {
      t.ok = true;
    };
    img.src = url;
    tileCache.set(url, t);
    if (tileCache.size > 900) {
      const first = tileCache.keys().next().value;
      if (first) tileCache.delete(first);
    }
    tile = t;
  }
  return tile;
};

const drawTiles = (
  ctx: CanvasRenderingContext2D,
  style: MapStyle,
  v: View,
  w: number,
  h: number
) => {
  LAYERS[style].forEach((layer) => {
    const tz = clamp(Math.floor(v.zoom), MIN_Z, Math.min(MAX_Z, layer.max));
    const scale = Math.pow(2, v.zoom - tz);
    const c = project(v.lat, v.lng, tz);
    const left = c.x - w / 2 / scale;
    const top = c.y - h / 2 / scale;
    const n = Math.pow(2, tz);
    const x0 = Math.floor(left / TILE);
    const x1 = Math.floor((left + w / scale) / TILE);
    const y0 = Math.max(0, Math.floor(top / TILE));
    const y1 = Math.min(n - 1, Math.floor((top + h / scale) / TILE));
    const ts = TILE * scale + 0.6;

    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const wx = ((x % n) + n) % n;
        const sx = (x * TILE - left) * scale;
        const sy = (y * TILE - top) * scale;
        const t = getTile(layer.url(tz, wx, y));
        if (t.ok) {
          ctx.drawImage(t.img, sx, sy, ts, ts);
        } else if (tz > MIN_Z) {
          // blurry parent tile while the sharp one loads
          const p = getTile(layer.url(tz - 1, wx >> 1, y >> 1));
          if (p.ok) {
            const half = TILE / 2;
            ctx.drawImage(p.img, (wx & 1) * half, (y & 1) * half, half, half, sx, sy, ts, ts);
          }
        }
      }
    }
  });
};

/* ---------------- canvas drawing helpers ---------------- */
const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawPin = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  o: { sel: boolean; hov: boolean; live: boolean; today: boolean; star: boolean; letter: string },
  t: number
) => {
  const k = o.sel ? 1.25 : o.hov ? 1.12 : 1;
  const r = 11 * k;
  const cy = y - 16 * k;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y, 7 * k, 3 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  if (o.live || o.sel) {
    const ph = (t * 0.9) % 1;
    ctx.strokeStyle = o.live
      ? `rgba(34,197,94,${1 - ph})`
      : `rgba(56,189,248,${1 - ph})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6 + ph * 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - r * 0.2, cy + r * 0.9, x - r, cy + r * 0.5, x - r, cy);
  ctx.arc(x, cy, r, Math.PI, 0);
  ctx.bezierCurveTo(x + r, cy + r * 0.5, x + r * 0.2, cy + r * 0.9, x, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = o.sel || o.hov ? 16 : 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = o.today ? 3 : 2;
  ctx.strokeStyle = o.today ? "#fbbf24" : "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = `800 ${Math.round(11 * k)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(o.letter, x, cy + 0.5);

  if (o.star) {
    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.font = "800 13px system-ui";
    ctx.strokeText("★", x + r * 0.9, cy - r * 0.9);
    ctx.fillText("★", x + r * 0.9, cy - r * 0.9);
  }
};

const drawLabel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  bottom: number,
  title: string,
  sub: string
) => {
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  const tw = ctx.measureText(title).width;
  ctx.font = "600 10px Inter, system-ui, sans-serif";
  const sw = ctx.measureText(sub).width;
  const w = Math.max(tw, sw) + 20;
  const h = sub ? 38 : 24;
  const lx = x - w / 2;
  const ly = bottom - h;
  rr(ctx, lx, ly, w, h, 9);
  ctx.fillStyle = "rgba(2,6,23,0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(125,211,252,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  ctx.fillText(title, x, ly + (sub ? 13 : h / 2));
  if (sub) {
    ctx.fillStyle = "#93c5fd";
    ctx.font = "600 10px Inter, system-ui, sans-serif";
    ctx.fillText(sub, x, ly + 27);
  }
};

const drawCluster = (ctx: CanvasRenderingContext2D, x: number, y: number, pts: Pt[], t: number) => {
  const n = pts.length;
  const r = 15 + Math.min(n, 40) * 0.35;
  const pulse = 1 + Math.sin(t * 2.2) * 0.04;

  const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.1 * pulse);
  glow.addColorStop(0, "rgba(56,189,248,0.35)");
  glow.addColorStop(1, "rgba(56,189,248,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.1 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.stroke();

  const counts: Record<string, number> = {};
  pts.forEach((p) => (counts[p.e.status] = (counts[p.e.status] || 0) + 1));
  let a = -Math.PI / 2;
  Object.entries(counts).forEach(([status, c]) => {
    const len = (c / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, a + 0.05, a + len - 0.05);
    ctx.strokeStyle = STATUS_COLOR[status] || "#93c5fd";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    a += len;
  });

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 13px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), x, y + 0.5);
};

/* ============================================================
   COMPONENT
   ============================================================ */
export default function EventMapView({ events, starredIds, onOpenEvent, onPinVenue }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const viewRef = useRef<View>({ lat: 11.0, lng: 77.0, zoom: 6 });
  const targetRef = useRef<View | null>(null);
  const hoverRef = useRef<string | null>(null);
  const hitsRef = useRef<Hit[]>([]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef({ moved: 0, pinch: 0 });
  const meRef = useRef<{ lat: number; lng: number } | null>(null);
  const fitDone = useRef(false);
  const visKey = useRef("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heat, setHeat] = useState(false);
  const [routeOn, setRouteOn] = useState(false);
  const [style, setStyle] = useState<MapStyle>("dark");
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [located, setLocated] = useState(false);

  const pinned = useMemo(() => events.filter(hasPin), [events]);
  const unpinned = useMemo(() => events.filter((e) => !hasPin(e)), [events]);
  const selected = useMemo(() => events.find((e) => e.id === selectedId) || null, [events, selectedId]);

  // Route = every pinned event on the selected event's date (or the next upcoming date), in time order.
  const route = useMemo(() => {
    let date: string | null = selected?.date || null;
    if (!date) {
      const upcoming = pinned
        .filter((e) => (dayDiff(e) ?? -1) >= 0)
        .sort((a, b) => (parseDT(a)?.getTime() ?? 0) - (parseDT(b)?.getTime() ?? 0))[0];
      date = upcoming?.date || null;
    }
    if (!date) return { date: null as string | null, stops: [] as any[], km: 0 };
    const stops = pinned
      .filter((e) => e.date === date)
      .sort((a, b) => (parseDT(a)?.getTime() ?? 0) - (parseDT(b)?.getTime() ?? 0));
    let km = 0;
    for (let i = 1; i < stops.length; i++) km += haversineKm(stops[i - 1].location, stops[i].location);
    return { date, stops, km };
  }, [pinned, selected]);

  // Live snapshot read by the animation loop (so the loop never needs to restart).
  const S = useRef({ pinned, route, selectedId, heat, routeOn, style, starredIds });
  S.current = { pinned, route, selectedId, heat, routeOn, style, starredIds };

  /* ---------- camera ---------- */
  const flyTo = (lat: number, lng: number, zoom: number) => {
    targetRef.current = { lat, lng, zoom: clamp(zoom, MIN_Z, MAX_Z) };
  };

  const fitTo = (pts: { lat: number; lng: number }[]) => {
    const { w, h } = sizeRef.current;
    if (!pts.length || !w || !h) return;
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    let z = 17;
    for (; z >= MIN_Z; z -= 0.25) {
      const a = project(maxLat, minLng, z);
      const b = project(minLat, maxLng, z);
      if (Math.abs(b.x - a.x) <= w - 140 && Math.abs(b.y - a.y) <= h - 180) break;
    }
    const a = project(maxLat, minLng, z);
    const b = project(minLat, maxLng, z);
    const c = unproject((a.x + b.x) / 2, (a.y + b.y) / 2, z);
    flyTo(c.lat, c.lng, z);
  };

  const fitAll = () => fitTo(S.current.pinned.map((e) => ({ lat: Number(e.location.lat), lng: Number(e.location.lng) })));

  const tryInitialFit = () => {
    if (fitDone.current || !sizeRef.current.w || !S.current.pinned.length) return;
    fitDone.current = true;
    fitAll();
  };

  const zoomAt = (sx: number, sy: number, nextZoom: number) => {
    const v = viewRef.current;
    const { w, h } = sizeRef.current;
    const z2 = clamp(nextZoom, MIN_Z, MAX_Z);
    const c = project(v.lat, v.lng, v.zoom);
    const geo = unproject(c.x + (sx - w / 2), c.y + (sy - h / 2), v.zoom);
    const p = project(geo.lat, geo.lng, z2);
    const n = unproject(p.x - (sx - w / 2), p.y - (sy - h / 2), z2);
    v.lat = n.lat;
    v.lng = n.lng;
    v.zoom = z2;
    targetRef.current = null;
  };

  const zoomBy = (d: number) => {
    const v = viewRef.current;
    flyTo(v.lat, v.lng, (targetRef.current?.zoom ?? v.zoom) + d);
  };

  const selectEvent = (e: any) => {
    setSelectedId(e.id);
    flyTo(Number(e.location.lat), Number(e.location.lng), Math.max(viewRef.current.zoom, 14));
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        meRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocated(true);
        flyTo(pos.coords.latitude, pos.coords.longitude, 14);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  /* ---------- size observer ---------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      sizeRef.current = { w: el.clientWidth, h: el.clientHeight };
      tryInitialFit();
    });
    ro.observe(el);
    sizeRef.current = { w: el.clientWidth, h: el.clientHeight };
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    tryInitialFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned.length]);

  /* ---------- wheel (needs a non-passive listener) ---------- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, viewRef.current.zoom - e.deltaY * 0.0022);
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    return () => cv.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- render loop ---------- */
  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let raf = 0;

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      const { w, h } = sizeRef.current;
      if (!w || !h) return;
      const t = ts / 1000;
      const s = S.current;
      const v = viewRef.current;

      // camera easing
      const g = targetRef.current;
      if (g) {
        v.zoom += (g.zoom - v.zoom) * 0.13;
        v.lat += (g.lat - v.lat) * 0.13;
        v.lng += (g.lng - v.lng) * 0.13;
        if (Math.abs(g.zoom - v.zoom) < 0.003 && Math.abs(g.lat - v.lat) < 1e-6 && Math.abs(g.lng - v.lng) < 1e-6) {
          v.lat = g.lat; v.lng = g.lng; v.zoom = g.zoom;
          targetRef.current = null;
        }
      }

      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG[s.style];
      ctx.fillRect(0, 0, w, h);
      drawTiles(ctx, s.style, v, w, h);

      const c = project(v.lat, v.lng, v.zoom);
      const toScreen = (lat: number, lng: number) => {
        const p = project(lat, lng, v.zoom);
        return { x: w / 2 + p.x - c.x, y: h / 2 + p.y - c.y };
      };

      // heatmap
      if (s.heat) {
        ctx.globalCompositeOperation = s.style === "light" ? "source-over" : "lighter";
        const r = 36 + v.zoom * 5;
        s.pinned.forEach((e) => {
          const p = toScreen(Number(e.location.lat), Number(e.location.lng));
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          gr.addColorStop(0, "rgba(251,146,60,0.6)");
          gr.addColorStop(0.5, "rgba(244,63,94,0.22)");
          gr.addColorStop(1, "rgba(244,63,94,0)");
          ctx.fillStyle = gr;
          ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        });
        ctx.globalCompositeOperation = "source-over";
      }

      // animated route
      if (s.routeOn && s.route.stops.length > 1) {
        const rp = s.route.stops.map((e) => toScreen(Number(e.location.lat), Number(e.location.lng)));
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(56,189,248,0.22)";
        ctx.lineWidth = 9;
        ctx.beginPath();
        rp.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        ctx.setLineDash([9, 9]);
        ctx.lineDashOffset = -t * 36;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        rp.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
          ctx.fillStyle = "#0f172a";
          ctx.fill();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "#e0f2fe";
          ctx.font = "900 11px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(i + 1), p.x, p.y + 0.5);
        });
      }

      // my location
      if (meRef.current) {
        const p = toScreen(meRef.current.lat, meRef.current.lng);
        const ph = (t * 0.8) % 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 + ph * 22, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59,130,246,${0.7 - ph * 0.7})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // project + cluster
      const pts: Pt[] = s.pinned
        .map((e) => ({ e, ...toScreen(Number(e.location.lat), Number(e.location.lng)) }))
        .filter((p) => p.x > -90 && p.x < w + 90 && p.y > -90 && p.y < h + 140);

      const cell = v.zoom >= 15 ? 0 : 64;
      const groups = new Map<string, Pt[]>();
      pts.forEach((p) => {
        const k = cell === 0 || p.e.id === s.selectedId ? `e:${p.e.id}` : `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`;
        const arr = groups.get(k);
        if (arr) arr.push(p);
        else groups.set(k, [p]);
      });

      const hits: Hit[] = [];
      const singles: Pt[] = [];
      groups.forEach((items) => {
        if (items.length === 1) {
          singles.push(items[0]);
          return;
        }
        const x = items.reduce((a, p) => a + p.x, 0) / items.length;
        const y = items.reduce((a, p) => a + p.y, 0) / items.length;
        drawCluster(ctx, x, y, items, t);
        hits.push({ x, y, r: 18 + Math.min(items.length, 40) * 0.35, pts: items });
      });

      singles.sort((a, b) => (a.e.id === s.selectedId ? 1 : b.e.id === s.selectedId ? -1 : a.y - b.y));
      singles.forEach((p) => {
        const e = p.e;
        const sel = e.id === s.selectedId;
        const hov = e.id === hoverRef.current;
        drawPin(
          ctx,
          p.x,
          p.y,
          STATUS_COLOR[e.status] || "#93c5fd",
          {
            sel,
            hov,
            live: e.status === "LIVE",
            today: dayDiff(e) === 0,
            star: s.starredIds.has(e.id),
            letter: String(e.name || "?").charAt(0).toUpperCase(),
          },
          t
        );
        hits.push({ x: p.x, y: p.y - 16, r: 14, pts: [p] });
      });

      // labels on top of everything
      singles.forEach((p) => {
        const sel = p.e.id === s.selectedId;
        if (sel || p.e.id === hoverRef.current || v.zoom >= 14.5) {
          drawLabel(ctx, p.x, p.y - 40, String(p.e.name), `${p.e.date || ""} · ${p.e.time || ""}`);
        }
      });

      hitsRef.current = hits;

      // visible ids → sidebar
      const ids = pts
        .filter((p) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h)
        .map((p) => p.e.id)
        .join(",");
      if (ids !== visKey.current) {
        visKey.current = ids;
        setVisibleIds(ids ? ids.split(",") : []);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------- pointer interaction ---------- */
  const rel = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const hitTest = (x: number, y: number): Hit | null => {
    const hits = hitsRef.current;
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (Math.hypot(x - h.x, y - h.y) <= h.r + 3) return h;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, rel(e));
    dragRef.current.moved = 0;
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      dragRef.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = rel(e);
    const prev = pointers.current.get(e.pointerId);

    if (!prev) {
      const hit = hitTest(p.x, p.y);
      hoverRef.current = hit && hit.pts.length === 1 ? hit.pts[0].e.id : null;
      canvasRef.current!.style.cursor = hit ? "pointer" : "grab";
      return;
    }

    pointers.current.set(e.pointerId, p);

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (dragRef.current.pinch > 0) {
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, viewRef.current.zoom + Math.log2(d / dragRef.current.pinch));
      }
      dragRef.current.pinch = d;
      dragRef.current.moved = 99;
      return;
    }

    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    dragRef.current.moved += Math.abs(dx) + Math.abs(dy);
    const v = viewRef.current;
    const c = project(v.lat, v.lng, v.zoom);
    const n = unproject(c.x - dx, c.y - dy, v.zoom);
    v.lat = clamp(n.lat, -80, 80);
    v.lng = n.lng;
    targetRef.current = null;
    canvasRef.current!.style.cursor = "grabbing";
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = rel(e);
    pointers.current.delete(e.pointerId);
    dragRef.current.pinch = 0;
    canvasRef.current!.style.cursor = "grab";
    if (dragRef.current.moved > 6) return;

    const hit = hitTest(p.x, p.y);
    if (!hit) {
      setSelectedId(null);
      return;
    }
    if (hit.pts.length === 1) {
      selectEvent(hit.pts[0].e);
    } else {
      const pts = hit.pts.map((q) => ({ lat: Number(q.e.location.lat), lng: Number(q.e.location.lng) }));
      fitTo(pts);
      if (targetRef.current && targetRef.current.zoom < viewRef.current.zoom + 1) {
        targetRef.current.zoom = Math.min(MAX_Z, viewRef.current.zoom + 1.5);
      }
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, viewRef.current.zoom + 1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "+" || e.key === "=") zoomBy(1);
    else if (e.key === "-") zoomBy(-1);
    else if (e.key.toLowerCase() === "f") fitAll();
    else if (e.key === "Escape") setSelectedId(null);
  };

  /* ---------- derived UI data ---------- */
  const visibleList = useMemo(() => {
    const set = new Set(visibleIds);
    return pinned
      .filter((e) => set.has(e.id))
      .sort((a, b) => (parseDT(a)?.getTime() ?? 0) - (parseDT(b)?.getTime() ?? 0));
  }, [pinned, visibleIds]);

  const cities = useMemo(() => new Set(pinned.map((e) => String(e.city || "").toLowerCase()).filter(Boolean)).size, [pinned]);
  const driveMin = Math.round((route.km / 35) * 60);

  return (
    <div className="evmap" tabIndex={0} onKeyDown={onKeyDown}>
      <div className="evmap-stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="evmap-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => (hoverRef.current = null)}
          onDoubleClick={onDoubleClick}
        />

        {/* HUD */}
        <div className="evmap-hud">
          <span className="evmap-chip"><EnvironmentOutlined /> <b>{pinned.length}</b> on map</span>
          <span className="evmap-chip"><b>{cities}</b> {cities === 1 ? "city" : "cities"}</span>
          {unpinned.length ? <span className="evmap-chip warn"><b>{unpinned.length}</b> not pinned</span> : null}
          {routeOn && route.stops.length > 1 ? (
            <span className="evmap-chip route">
              <BranchesOutlined /> {route.date} · {route.stops.length} stops · <b>{route.km.toFixed(1)} km</b> · ~{driveMin} min
            </span>
          ) : null}
        </div>

        {/* controls */}
        <div className="evmap-controls">
          <button type="button" title="Zoom in (+)" onClick={() => zoomBy(1)}><PlusOutlined /></button>
          <button type="button" title="Zoom out (-)" onClick={() => zoomBy(-1)}><MinusOutlined /></button>
          <button type="button" title="Fit all events (F)" onClick={fitAll}><ExpandOutlined /></button>
          <button type="button" title="My location" className={located ? "on" : ""} onClick={locateMe}><AimOutlined /></button>
          <span className="evmap-ctl-sep" />
          <button type="button" title="Heatmap" className={heat ? "on" : ""} onClick={() => setHeat((v) => !v)}><FireOutlined /></button>
          <button
            type="button"
            title="Day route"
            className={routeOn ? "on" : ""}
            disabled={route.stops.length < 2}
            onClick={() => setRouteOn((v) => !v)}
          >
            <BranchesOutlined />
          </button>
          <button
            type="button"
            title={`Map style: ${style}`}
            onClick={() => setStyle((s) => STYLE_ORDER[(STYLE_ORDER.indexOf(s) + 1) % STYLE_ORDER.length])}
          >
            <BgColorsOutlined />
          </button>
        </div>

        {/* legend */}
        <div className="evmap-legend">
          {Object.entries(STATUS_COLOR).map(([k, c]) => (
            <span key={k}><i style={{ background: c }} />{k}</span>
          ))}
        </div>

        {/* empty state */}
        {pinned.length === 0 ? (
          <div className="evmap-empty">
            <EnvironmentOutlined />
            <strong>No events are pinned yet</strong>
            <span>Pin a venue on any event and it appears here instantly.</span>
          </div>
        ) : null}

        {/* selected card */}
        {selected && hasPin(selected) ? (
          <div className="evmap-card">
            <div className="evmap-card-head">
              <i style={{ background: STATUS_COLOR[selected.status] || "#93c5fd" }} />
              <div>
                <strong>{selected.name}</strong>
                <small>{selected.type} · {selected.status}</small>
              </div>
              <button type="button" className="evmap-x" onClick={() => setSelectedId(null)}>×</button>
            </div>
            <p><CalendarOutlined /> {selected.date} <ClockCircleOutlined /> {selected.time}</p>
            <p><EnvironmentOutlined /> {[selected.address, selected.city].filter(Boolean).join(", ")}</p>
            <div className="evmap-card-actions">
              <button type="button" className="primary" onClick={() => onOpenEvent(selected)}>Open details</button>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.location.lat},${selected.location.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                <CarOutlined /> Directions
              </a>
              <button type="button" onClick={() => flyTo(Number(selected.location.lat), Number(selected.location.lng), 17)}>Zoom in</button>
            </div>
          </div>
        ) : null}

        <span className="evmap-attr">© OpenStreetMap · Esri</span>
      </div>

      {/* sidebar */}
      <aside className="evmap-side">
        <header>
          <strong>In view</strong>
          <small>{visibleList.length} event{visibleList.length === 1 ? "" : "s"}</small>
        </header>

        <div className="evmap-list">
          {visibleList.length === 0 && pinned.length > 0 ? (
            <button type="button" className="evmap-fit" onClick={fitAll}>Nothing here — fit all events</button>
          ) : null}
          {visibleList.map((e) => (
            <button
              type="button"
              key={e.id}
              className={`evmap-item ${e.id === selectedId ? "active" : ""}`}
              onMouseEnter={() => (hoverRef.current = e.id)}
              onMouseLeave={() => (hoverRef.current = null)}
              onClick={() => selectEvent(e)}
            >
              <i style={{ background: STATUS_COLOR[e.status] || "#93c5fd" }} />
              <span>
                <strong>{e.name}</strong>
                <small>{e.date} · {e.time} · {e.city}</small>
              </span>
              {dayDiff(e) === 0 ? <em>Today</em> : null}
            </button>
          ))}
        </div>

        {unpinned.length ? (
          <div className="evmap-unpinned">
            <header><strong>Not on map</strong><small>{unpinned.length}</small></header>
            {unpinned.slice(0, 8).map((e) => (
              <div className="evmap-unpin-row" key={e.id}>
                <span>{e.name}</span>
                <button type="button" onClick={() => onPinVenue(e.id)}>Pin</button>
              </div>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

