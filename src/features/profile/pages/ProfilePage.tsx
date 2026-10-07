import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AppstoreOutlined, BarsOutlined, BgColorsOutlined, CameraOutlined, CheckCircleOutlined, CloseOutlined,
  DeleteOutlined, DownloadOutlined, EnvironmentOutlined, ExclamationCircleOutlined, EyeOutlined,
  FolderOutlined, HeartFilled, HeartOutlined, InfoCircleOutlined, MailOutlined, MenuFoldOutlined,
  PauseCircleOutlined, PhoneOutlined, PlayCircleOutlined, PlusOutlined, QuestionCircleOutlined,
  SafetyCertificateOutlined, SearchOutlined, ShareAltOutlined, SortAscendingOutlined, StarFilled,
  StarOutlined, TableOutlined, ThunderboltOutlined, UploadOutlined, UserOutlined,
  ZoomInOutlined, ZoomOutOutlined,
} from "@ant-design/icons";
import "./ProfilePage.css";
import { notifyPhotoLiked } from "../../../components/UI/notificationTriggers"; // adjust path to your project structure
import { requestAccountDeleteRequest } from "../../../redux/actions/deleteRequestActions"; // adjust path to match your redux folder depth

type Photo = { id: number | string; title: string; category: string; image: string; mine?: boolean };

const DEFAULT_PROFILE = {
  firstName: "Kamesh", lastName: "Srikharan.T",
  email: "kameshsrikharan.t@gmail.com", phone: "8888888888",
  role: "Professional Photographer", address: "Arumbakkam",
  city: "Chennai", state: "Tamil Nadu", country: "India", postalCode: "600106",
  profilePhoto: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1200",
};

const photos: Photo[] = [
  { id:1,  title:"Royal Wedding Frame",  category:"Wedding",   image:"https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400" },
  { id:2,  title:"Golden Couple Walk",   category:"Wedding",   image:"https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1400" },
  { id:3,  title:"Classic Portrait",     category:"Portraits", image:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1400" },
  { id:4,  title:"Forest Light",         category:"Nature",    image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400" },
  { id:5,  title:"Camera Mood",          category:"Cinematic", image:"https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1400" },
  { id:6,  title:"Bride Detail",         category:"Wedding",   image:"https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1400" },
  { id:7,  title:"Wedding Rings",        category:"Wedding",   image:"https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1400" },
  { id:8,  title:"Outdoor Couple",       category:"Wedding",   image:"https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?q=80&w=1400" },
  { id:9,  title:"Soft Portrait",        category:"Portraits", image:"https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1400" },
  { id:10, title:"Golden Portrait",      category:"Portraits", image:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1400" },
  { id:11, title:"Street Portrait",      category:"Portraits", image:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1400" },
  { id:12, title:"Mountain Air",         category:"Nature",    image:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400" },
  { id:13, title:"Nature Story",         category:"Nature",    image:"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1400" },
  { id:14, title:"Wild Hills",           category:"Nature",    image:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1400" },
  { id:15, title:"Lake Mirror",          category:"Nature",    image:"https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1400" },
  { id:16, title:"Film Look",            category:"Cinematic", image:"https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1400" },
  { id:17, title:"Night Lens",           category:"Cinematic", image:"https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1400" },
  { id:18, title:"Studio Shadow",        category:"Cinematic", image:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1400" },
  { id:19, title:"Editorial Glow",       category:"Cinematic", image:"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400" },
  { id:20, title:"Fashion Frame",        category:"Portraits", image:"https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1400" },
  { id:21, title:"Ceremony Lights",      category:"Wedding",   image:"https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=1400" },
  { id:22, title:"Vow Detail",           category:"Wedding",   image:"https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1400" },
  { id:23, title:"Reception Spark",      category:"Wedding",   image:"https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=1400" },
  { id:24, title:"Monochrome Look",      category:"Portraits", image:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1400" },
  { id:25, title:"Editorial Face",       category:"Portraits", image:"https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1400" },
  { id:26, title:"Studio Calm",          category:"Portraits", image:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1400" },
  { id:27, title:"Waterfall Mist",       category:"Nature",    image:"https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=1400" },
  { id:28, title:"Desert Dawn",          category:"Nature",    image:"https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=1400" },
  { id:29, title:"City Noir",            category:"Cinematic", image:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=1400" },
  { id:30, title:"Neon Scene",           category:"Cinematic", image:"https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=1400" },
];

const BASE_CATEGORIES = ["All","Wedding","Portraits","Nature","Cinematic"];
const CATEGORY_META: Record<string, { label: string; icon: JSX.Element }> = {
  All: { label:"All", icon:<AppstoreOutlined/> },
  Wedding: { label:"Wedding", icon:<HeartOutlined/> },
  Portraits: { label:"Portraits", icon:<UserOutlined/> },
  Nature: { label:"Nature", icon:<EnvironmentOutlined/> },
  Cinematic: { label:"Cinematic", icon:<CameraOutlined/> },
  Mine: { label:"My uploads", icon:<FolderOutlined/> },
};
const CAT_COLORS: Record<string, string> = { Wedding:"#f472b6", Portraits:"#38bdf8", Nature:"#22c55e", Cinematic:"#facc15", Mine:"#a78bfa" };
const ACCENTS = ["#38bdf8","#f472b6","#facc15","#22c55e","#a78bfa","#fb923c"];
const SORTS = [
  { id:"curated", label:"Curated" }, { id:"az", label:"A to Z" },
  { id:"liked", label:"Liked first" }, { id:"views", label:"Most viewed" },
];
const VIEWS = [
  { id:"masonry", label:"Masonry", icon:<AppstoreOutlined/> },
  { id:"grid", label:"Grid", icon:<TableOutlined/> },
  { id:"contact", label:"Contact sheet", icon:<BarsOutlined/> },
];
const SHORTCUTS = [
  ["Ctrl / Cmd + K", "Command palette"], ["/", "Search photos"], ["B", "Toggle profile panel"],
  ["V", "Cycle layout"], ["F", "Show liked only"], ["?", "This help"],
  ["Left / Right", "Previous / next photo"], ["Space", "Play / pause slideshow"],
  ["+ / - / 0", "Zoom in / out / reset"], ["I", "Photo details"], ["L", "Like photo"], ["S", "Pin photo"],
];
const PAGE_SIZE = 10;
const SLIDE_MS = 3600;
const ABOUT_LINES = [
  "Passionate photographer with a strong eye for emotion, light, and storytelling.",
  "Specialized in wedding, portraits, nature, and cinematic photography.",
  "I create clean, premium frames that feel natural and memorable.",
  "Available for events, portraits, campaigns, and creative shoots.",
];

const DOC_LABELS = { aadhaar:"Aadhaar", pan:"PAN", dl:"Driving License", passport:"Passport" };
const DOC_FIELDS = {
  aadhaar: [],
  pan:      [{ key:"panNumber",    label:"PAN Number",                required:true,  placeholder:"ABCDE1234F" }],
  dl:       [{ key:"dlNumber",     label:"DL Number",                 required:true,  placeholder:"TN01 20230012345" },
             { key:"dob",          label:"Date of Birth",             required:true,  placeholder:"DD-MM-YYYY" },
             { key:"dlName",       label:"Full Name (as on DL)",      required:false, placeholder:"Full name" }],
  passport: [{ key:"passportNo",   label:"Passport Number",           required:true,  placeholder:"A1234567" },
             { key:"dob",          label:"Date of Birth",             required:true,  placeholder:"DD-MM-YYYY" },
             { key:"expiry",       label:"Expiry Date",               required:false, placeholder:"DD-MM-YYYY" },
             { key:"passportName", label:"Full Name (as on Passport)",required:false, placeholder:"Full name" }],
};

// ---------- Validation ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const NAME_RE  = /^[A-Za-z][A-Za-z.\s]{1,59}$/;
const PAN_RE   = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const DL_RE    = /^[A-Z]{2}\d{2}\s?\d{6,13}$/;
const PASSPORT_RE = /^[A-PR-WYa-pr-wy][0-9]{7}$/;
const DOB_RE   = /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
const ADDRESS_RE = /^.{5,120}$/;

const isValidDate = (str: string) => {
  if (!DOB_RE.test(str)) return false;
  const [d, m, y] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && y > 1900 && y <= new Date().getFullYear();
};

const PROFILE_VALIDATORS: Record<string, (v: string) => string | null> = {
  fullName: (v) => {
    const t = (v || "").trim();
    if (!t) return "Name is required";
    if (!NAME_RE.test(t)) return "Enter a valid name (letters only, min 2 characters)";
    return null;
  },
  email: (v) => {
    const t = (v || "").trim();
    if (!t) return "Email is required";
    if (!EMAIL_RE.test(t)) return "Enter a valid email address";
    return null;
  },
  phone: (v) => {
    const t = (v || "").trim();
    if (!t) return "Phone number is required";
    if (!PHONE_RE.test(t)) return "Enter a valid 10-digit mobile number";
    return null;
  },
  address: (v) => {
    const t = (v || "").trim();
    if (!t) return "Address is required";
    if (!ADDRESS_RE.test(t)) return "Address must be between 5 and 120 characters";
    return null;
  },
};

const KYC_VALIDATORS: Record<string, (v: string) => string | null> = {
  panNumber: (v) => {
    const t = (v || "").trim().toUpperCase();
    if (!t) return "PAN number is required";
    if (!PAN_RE.test(t)) return "Enter a valid PAN (e.g. ABCDE1234F)";
    return null;
  },
  dlNumber: (v) => {
    const t = (v || "").trim().toUpperCase();
    if (!t) return "DL number is required";
    if (!DL_RE.test(t)) return "Enter a valid driving license number (e.g. TN0120230012345)";
    return null;
  },
  passportNo: (v) => {
    const t = (v || "").trim().toUpperCase();
    if (!t) return "Passport number is required";
    if (!PASSPORT_RE.test(t)) return "Enter a valid passport number (e.g. A1234567)";
    return null;
  },
  dob: (v) => {
    const t = (v || "").trim();
    if (!t) return "Date of birth is required";
    if (!isValidDate(t)) return "Use a valid DD-MM-YYYY date";
    return null;
  },
  expiry: (v) => {
    const t = (v || "").trim();
    if (!t) return null;
    if (!isValidDate(t)) return "Use a valid DD-MM-YYYY date";
    return null;
  },
  dlName: (v) => {
    const t = (v || "").trim();
    if (t && !NAME_RE.test(t)) return "Enter a valid name";
    return null;
  },
  passportName: (v) => {
    const t = (v || "").trim();
    if (t && !NAME_RE.test(t)) return "Enter a valid name";
    return null;
  },
};

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const loadLS = (k: string, fb: any) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
const saveLS = (k: string, v: any)  => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const hexToRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `${(n>>16)&255},${(n>>8)&255},${n&255}`; };

function maskValue(str="") {
  if (!str) return "";
  if (str.length<=4) return str;
  return str.slice(0,2)+"*".repeat(str.length-4)+str.slice(-2);
}

// ---------- Canvas 2D: dominant colour palette ----------
const paletteCache = new Map<string, string[]>();
function extractPalette(src: string): Promise<string[]> {
  if (paletteCache.has(src)) return Promise.resolve(paletteCache.get(src)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const S = 40;
        const c = document.createElement("canvas"); c.width = S; c.height = S;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, S, S);
        const d = ctx.getImageData(0, 0, S, S).data;
        const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i+1], b = d[i+2];
          const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
          if (mx < 28 || mn > 232) continue; // skip near-black / near-white
          const key = ((r>>5)<<6) | ((g>>5)<<3) | (b>>5);
          const e = buckets.get(key) || { n:0, r:0, g:0, b:0 };
          e.n++; e.r += r; e.g += g; e.b += b; buckets.set(key, e);
        }
        const sorted = [...buckets.values()].sort((a,b) => b.n - a.n);
        const picked: number[][] = [];
        for (const e of sorted) {
          const rgb = [Math.round(e.r/e.n), Math.round(e.g/e.n), Math.round(e.b/e.n)];
          const far = picked.every(p => Math.hypot(p[0]-rgb[0], p[1]-rgb[1], p[2]-rgb[2]) > 64);
          if (far) picked.push(rgb);
          if (picked.length === 4) break;
        }
        const hex = picked.map(([r,g,b]) => "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join(""));
        paletteCache.set(src, hex);
        resolve(hex);
      } catch { resolve([]); }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}

function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(target); from.current = target; return; }
    let raf = 0; const s = performance.now(); const a = from.current;
    const tick = (t: number) => {
      const p = Math.min(1, (t - s) / ms);
      const val = Math.round(a + (target - a) * (1 - Math.pow(1 - p, 3)));
      setV(val); from.current = val;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Stat({ label, value }: { label: string; value: number }) {
  const v = useCountUp(value);
  return <div className="sb-stat"><strong>{v}</strong><span>{label}</span></div>;
}

function CompletenessRing({ pct }: { pct: number }) {
  const R = 26, C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 64 64" className="ring" role="img" aria-label={`Profile ${pct}% complete`}>
      <circle className="ring-bg" cx="32" cy="32" r={R} />
      <circle className="ring-fg" cx="32" cy="32" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle">{pct}%</text>
    </svg>
  );
}

// ---------- Command palette ----------
type CmdItem = { id: string; label: string; hint?: string; icon: JSX.Element; run: () => void };
function CommandPalette({ items, photoList, onClose, onOpenPhoto }: {
  items: CmdItem[]; photoList: Photo[]; onClose: () => void; onOpenPhoto: (p: Photo) => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const needle = q.trim().toLowerCase();
  const list = useMemo<CmdItem[]>(() => {
    const actions = items.filter(i => !needle || i.label.toLowerCase().includes(needle));
    const found: CmdItem[] = needle.length > 1
      ? photoList.filter(p => p.title.toLowerCase().includes(needle)).slice(0, 5)
          .map(p => ({ id:`p${p.id}`, label:p.title, hint:p.category, icon:<CameraOutlined/>, run:() => onOpenPhoto(p) }))
      : [];
    return [...actions, ...found];
  }, [items, photoList, needle, onOpenPhoto]);
  useEffect(() => { setIdx(0); }, [needle]);
  const exec = (it?: CmdItem) => { if (!it) return; onClose(); it.run(); };
  const onKey = (e: any) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => (i + 1) % Math.max(1, list.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => (i - 1 + list.length) % Math.max(1, list.length)); }
    else if (e.key === "Enter") { e.preventDefault(); exec(list[idx]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };
  return (
    <div className="cmdk-layer" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" className="cmdk-backdrop" onClick={onClose} aria-label="Close command palette" tabIndex={-1} />
      <div className="cmdk">
        <div className="cmdk-input-row">
          <SearchOutlined />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Type a command or search a photo"
            role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={list[idx] ? `cmdk-${list[idx].id}` : undefined} />
          <kbd>Esc</kbd>
        </div>
        <ul id="cmdk-list" className="cmdk-list" role="listbox">
          {list.length === 0 && <li className="cmdk-empty">No matches. Try another word.</li>}
          {list.map((it, i) => (
            <li key={it.id} id={`cmdk-${it.id}`} role="option" aria-selected={i === idx}
              className={i === idx ? "active" : ""} onMouseMove={() => setIdx(i)} onClick={() => exec(it)}>
              <span className="cmdk-ico">{it.icon}</span>
              <span className="cmdk-label">{it.label}</span>
              {it.hint && <kbd>{it.hint}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="cmdk-layer" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <button type="button" className="cmdk-backdrop" onClick={onClose} aria-label="Close shortcuts" tabIndex={-1} />
      <div className="help-card">
        <div className="help-hdr"><h3>Keyboard shortcuts</h3>
          <button ref={ref} type="button" className="help-close" onClick={onClose} aria-label="Close"><CloseOutlined/></button>
        </div>
        <dl className="help-grid">
          {SHORTCUTS.map(([k, d]) => (<div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>))}
        </dl>
      </div>
    </div>
  );
}

function KycSection({ verified, kycData, onVerify, onReset }: any) {
  const [docType,setDocType]=useState("");
  const [vals,setVals]=useState<Record<string,string>>({});
  const [touched,setTouched]=useState<Record<string,boolean>>({});
  const [consent,setConsent]=useState(false);
  const [editing,setEditing]=useState(false);
  const fields: any[] = (DOC_FIELDS as any)[docType]||[];

  const errorFor=(f:any)=>{
    const validator=KYC_VALIDATORS[f.key];
    if(!validator)return null;
    return validator(vals[f.key]||"");
  };

  const hasBlockingErrors=()=>fields.some(f=>f.required&&errorFor(f));

  const canSubmit=()=>{
    if(!docType||!consent)return false;
    if(hasBlockingErrors())return false;
    return fields.filter(f=>f.required).every(f=>(vals[f.key]||"").trim());
  };

  const handleChange=(key:string,value:string)=>{ setVals(p=>({...p,[key]:value})); };
  const handleBlur=(key:string)=>{ setTouched(p=>({...p,[key]:true})); };

  const handleVerify=()=>{
    setTouched(fields.reduce((acc,f)=>({...acc,[f.key]:true}),{}));
    if(!canSubmit())return;
    onVerify({docType,vals});
    setEditing(false);
  };
  const handleReset=()=>{ setDocType("");setVals({});setTouched({});setConsent(false);setEditing(true);onReset(); };

  if(verified&&!editing){
    const sf: any[]=(DOC_FIELDS as any)[kycData?.docType]||[];
    return (
      <div className="kyc-section">
        <div className="kyc-hdr">
          <span className="kyc-hdr-icon"><SafetyCertificateOutlined /></span>
          <div className="kyc-hdr-content">
            <p className="kyc-hdr-label">KYC VERIFICATION</p>
            <span className="kyc-verified-inline">
              <CheckCircleOutlined className="kyc-ok-icon"/> Verified
              <button type="button" className="kyc-reverify" onClick={handleReset}>Re-verify</button>
            </span>
          </div>
        </div>
        {kycData&&(
          <div className="kyc-submitted-data">
            <div className="kyc-submitted-row"><span className="kyc-sub-label">Document</span><span className="kyc-sub-value">{(DOC_LABELS as any)[kycData.docType]||kycData.docType}</span></div>
            {kycData.docType==="aadhaar"&&<div className="kyc-submitted-row"><span className="kyc-sub-label">Method</span><span className="kyc-sub-value">Aadhaar Digilocker</span></div>}
            {sf.map(f=>kycData.vals?.[f.key]?(
              <div key={f.key} className="kyc-submitted-row">
                <span className="kyc-sub-label">{f.label}</span>
                <span className="kyc-sub-value kyc-sub-masked">{maskValue(kycData.vals[f.key])}</span>
              </div>
            ):null)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="kyc-section">
      <div className="kyc-hdr">
        <span className="kyc-hdr-icon"><SafetyCertificateOutlined /></span>
        <div className="kyc-hdr-content">
          <p className="kyc-hdr-label">KYC VERIFICATION</p>
          <span className="kyc-not-verified"><CloseOutlined /> Not Verified</span>
        </div>
      </div>
      <div className="kyc-body">
        <div className="kyc-info-banner"><span className="kyc-i-icon">i</span>Complete your KYC verification here</div>
        <div className="kyc-field-group">
          <label className="kyc-field-label" htmlFor="kyc-doc-type"><span className="kyc-req">*</span> Document Type</label>
          <div className="kyc-select-wrap">
            <select id="kyc-doc-type" className="kyc-select" value={docType} onChange={e=>{setDocType(e.target.value);setVals({});setTouched({});}}>
              <option value="">Select document type</option>
              <option value="aadhaar">Aadhaar</option>
              <option value="pan">PAN</option>
              <option value="dl">Driving License</option>
              <option value="passport">Passport</option>
            </select>
          </div>
        </div>
        {docType==="aadhaar"&&(
          <div className="kyc-digilocker-box kyc-reveal">
            <strong>Aadhaar Digilocker</strong>
            <p>Aadhaar verification uses Digilocker. You will be redirected to complete the linking process.</p>
          </div>
        )}
        {fields.length>0&&(
          <div className="kyc-fields-grid kyc-reveal">
            {fields.map((f,i)=>{
              const err=touched[f.key]?errorFor(f):null;
              return (
                <div key={f.key} className={`kyc-input-cell${fields.length===1||(i===fields.length-1&&fields.length%2!==0)?" kyc-full":""}`}>
                  <label className="kyc-field-label" htmlFor={`kyc-${f.key}`}>{f.required&&<span className="kyc-req">*</span>} {f.label}</label>
                  <input
                    id={`kyc-${f.key}`}
                    className={`kyc-input${err?" kyc-input--error":""}`}
                    placeholder={f.placeholder||f.label}
                    value={vals[f.key]||""}
                    aria-invalid={!!err}
                    onChange={e=>handleChange(f.key,e.target.value)}
                    onBlur={()=>handleBlur(f.key)}
                  />
                  {err&&<span className="kyc-field-error" role="alert">{err}</span>}
                </div>
              );
            })}
          </div>
        )}
        {docType&&(
          <>
            <label className="kyc-consent kyc-reveal">
              <input type="checkbox" className="kyc-checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
              <span>I consent to KYC verification via Truthscreen</span>
            </label>
            <button className={`kyc-submit kyc-reveal${canSubmit()?" kyc-submit--active":""}`}
              disabled={!canSubmit()} onClick={handleVerify}>Verify &amp; Continue</button>
          </>
        )}
      </div>
    </div>
  );
}

function DetailField({ icon, field, value, editable=true, editingField, onStartEdit, onSave, onCancel, pendingValue, onPendingChange, placeholder, error, canSave }: any) {
  const inputRef=useRef<HTMLInputElement>(null);
  const isEditing=editingField===field;
  useEffect(()=>{ if(isEditing)inputRef.current?.focus(); },[isEditing]);
  return (
    <div className={`det-field${isEditing?" det-field--active":""}${isEditing&&error?" det-field--error":""}`}>
      <span className="det-icon">{icon}</span>
      <div className="det-body">
        {isEditing?(
          <>
            <input ref={inputRef} className="det-input" value={pendingValue} placeholder={placeholder}
              aria-label={placeholder} aria-invalid={!!error}
              onChange={e=>onPendingChange(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&canSave)onSave(); if(e.key==="Escape")onCancel(); }}/>
            {error&&<span className="det-field-error" role="alert">{error}</span>}
          </>
        ):(
          editable?(
            <button type="button" className="det-value det-value--click" onClick={()=>onStartEdit(field,value)} title="Click to edit">
              {value||<span className="det-placeholder">{placeholder||"-"}</span>}
            </button>
          ):(
            <span className="det-value">{value||<span className="det-placeholder">{placeholder||"-"}</span>}</span>
          )
        )}
      </div>
    </div>
  );
}

function ProfilePage() {
  const dispatch = useDispatch();
  const fileInputRef=useRef<HTMLInputElement>(null);
  const galleryUploadRef=useRef<HTMLInputElement>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  const kycRef=useRef<HTMLDivElement>(null);
  const stageRef=useRef<HTMLDivElement>(null);
  const lbCardRef=useRef<HTMLDivElement>(null);
  const lbCloseRef=useRef<HTMLButtonElement>(null);
  const lastFocus=useRef<HTMLElement|null>(null);
  const urlsRef=useRef<string[]>([]);
  const dragRef=useRef<any>(null);
  const toastId=useRef(0);
  const keyHandler=useRef<(e:KeyboardEvent)=>void>(()=>{});

  const [activeCategory,setActiveCategory]=useState("All");
  const [favorites,setFavorites]=useState<(number|string)[]>(()=>loadLS("axsStarred",[]));
  const [starred,setStarred]=useState<(number|string)[]>(()=>loadLS("axsStarredPhotos",[]));
  const [profile,setProfile]=useState<any>(()=>{ const s=loadLS("axsProfile",null); return s?{...DEFAULT_PROFILE,...s}:DEFAULT_PROFILE; });
  const [kycVerified,setKycVerified]=useState<boolean>(()=>loadLS("axsKycVerified",false));
  const [kycData,setKycData]=useState<any>(()=>loadLS("axsKycData",null));
  const [aboutExpanded,setAboutExpanded]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [galleryPage,setGalleryPage]=useState(0);
  const [pageFlipping,setPageFlipping]=useState(false);

  // gallery tools
  const [query,setQuery]=useState("");
  const dq=useDeferredValue(query);
  const [sort,setSort]=useState<string>(()=>loadLS("axsSort","curated"));
  const [viewMode,setViewMode]=useState<string>(()=>loadLS("axsView","masonry"));
  const [onlyFavs,setOnlyFavs]=useState(false);
  const [uploaded,setUploaded]=useState<Photo[]>([]);
  const [views,setViews]=useState<Record<string,number>>(()=>loadLS("axsViews",{}));
  const [accent,setAccent]=useState<string>(()=>loadLS("axsAccent",ACCENTS[0]));
  const [toasts,setToasts]=useState<{id:number;msg:string}[]>([]);
  const [paletteOpen,setPaletteOpen]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false);

  // lightbox
  const [lbList,setLbList]=useState<Photo[]|null>(null);
  const [lbIndex,setLbIndex]=useState<number|null>(null);
  const [playing,setPlaying]=useState(false);
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});
  const [dragging,setDragging]=useState(false);
  const [infoOpen,setInfoOpen]=useState(false);
  const [lbPalette,setLbPalette]=useState<string[]>([]);
  const [dims,setDims]=useState<{w:number;h:number}|null>(null);

  // ---- Delete-account (danger zone) state ----
  // NOTE: relies on the "deleteRequest" slice key being registered in your root reducer/saga.
  const { ownStatus, requesting, requestError } = useSelector(
    (state: any) => state.deleteRequest || { ownStatus: "none", requesting: false, requestError: null }
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    if (ownStatus === "pending") setConfirmingDelete(false);
  }, [ownStatus]);

  const handleConfirmDelete = () => { dispatch(requestAccountDeleteRequest(deleteReason.trim()) as any); };

  // ---- Editable field state ----
  const [editingField,setEditingField]=useState<string|null>(null);
  const [editingOriginal,setEditingOriginal]=useState("");
  const [pendingValue,setPendingValue]=useState("");

  const toast=(msg:string)=>{
    const id=++toastId.current;
    setToasts(t=>[...t.slice(-2),{id,msg}]);
    window.setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2600);
  };

  const fullName=useMemo(()=>(`${profile.firstName||""} ${profile.lastName||""}`).trim()||"Kamesh Srikharan.T",[profile]);
  const allPhotos=useMemo<Photo[]>(()=>[...uploaded,...photos],[uploaded]);
  const cats=useMemo(()=>uploaded.length?[...BASE_CATEGORIES,"Mine"]:BASE_CATEGORIES,[uploaded.length]);

  const filteredPhotos=useMemo(()=>{
    const needle=dq.trim().toLowerCase();
    const list=allPhotos.filter(p=>
      (activeCategory==="All"||p.category===activeCategory)&&
      (!onlyFavs||favorites.includes(p.id))&&
      (!needle||p.title.toLowerCase().includes(needle)||p.category.toLowerCase().includes(needle)));
    if(sort==="az")list.sort((a,b)=>a.title.localeCompare(b.title));
    else if(sort==="liked")list.sort((a,b)=>Number(favorites.includes(b.id))-Number(favorites.includes(a.id)));
    else if(sort==="views")list.sort((a,b)=>(views[b.id]||0)-(views[a.id]||0));
    return list;
  },[allPhotos,activeCategory,dq,onlyFavs,sort,favorites,views]);

  const totalPages=Math.max(1,Math.ceil(filteredPhotos.length/PAGE_SIZE));
  const visiblePhotos=useMemo(()=>{
    const start=galleryPage*PAGE_SIZE;
    return filteredPhotos.slice(start,start+PAGE_SIZE);
  },[filteredPhotos,galleryPage]);

  const totalViews=useMemo(()=>Object.values(views).reduce((a,b)=>a+b,0),[views]);
  const mix=useMemo(()=>cats.filter(c=>c!=="All").map(cat=>({cat,n:allPhotos.filter(p=>p.category===cat).length})).filter(m=>m.n>0),[cats,allPhotos]);

  // ---- profile completeness ----
  const steps=[
    {ok:!PROFILE_VALIDATORS.fullName(fullName),label:"Add your name",act:()=>handleStartEdit("fullName",fullName)},
    {ok:!PROFILE_VALIDATORS.email(profile.email),label:"Add a valid email",act:()=>handleStartEdit("email",profile.email||"")},
    {ok:!PROFILE_VALIDATORS.phone(profile.phone),label:"Add a valid phone number",act:()=>handleStartEdit("phone",profile.phone||"")},
    {ok:!PROFILE_VALIDATORS.address(profile.address),label:"Add your address",act:()=>handleStartEdit("address",profile.address||"")},
    {ok:!!profile.profilePhoto,label:"Upload a profile photo",act:()=>fileInputRef.current?.click()},
    {ok:kycVerified,label:"Verify your KYC",act:()=>kycRef.current?.scrollIntoView({behavior:"smooth",block:"center"})},
  ];
  const pct=Math.round(steps.filter(s=>s.ok).length/steps.length*100);
  const nextStep=steps.find(s=>!s.ok);

  const fieldError=useMemo(()=>{
    if(!editingField)return null;
    const validator=PROFILE_VALIDATORS[editingField];
    if(!validator)return null;
    return validator(pendingValue);
  },[editingField,pendingValue]);

  const hasChanged = editingField!=null && pendingValue.trim() !== (editingOriginal||"").trim();
  const canSaveField = hasChanged && !fieldError;

  const saveField=(field:string,value:string)=>{ const n={...profile,[field]:value}; setProfile(n); saveLS("axsProfile",n); };

  function handleStartEdit(field:string,value:string){
    setEditingField(field); setPendingValue(value); setEditingOriginal(value);
  }

  const handleSaveAll=()=>{
    if(!canSaveField)return;
    if(editingField==="fullName"){
      const p=pendingValue.trim().split(" ");
      const n={...profile,firstName:p[0]||"",lastName:p.slice(1).join(" ")||""};
      setProfile(n); saveLS("axsProfile",n);
    } else if(editingField) {
      saveField(editingField,pendingValue.trim());
    }
    setEditingField(null); setPendingValue(""); setEditingOriginal("");
    toast("Profile updated");
  };

  const handleCancelEdit=()=>{ setEditingField(null); setPendingValue(""); setEditingOriginal(""); };

  const handlePhotoUpload=(e:any)=>{
    const f=e.target.files?.[0]; if(!f)return;
    const r=new FileReader(); r.onload=()=>{saveField("profilePhoto",r.result as string);toast("Profile photo updated");}; r.readAsDataURL(f); e.target.value="";
  };

  const handleGalleryUpload=(e:any)=>{
    const files:File[]=Array.from(e.target.files||[]);
    const imgs=files.filter(f=>f.type.startsWith("image/"));
    if(!imgs.length)return;
    const added:Photo[]=imgs.map((f,i)=>{
      const url=URL.createObjectURL(f); urlsRef.current.push(url);
      return {id:`u${Date.now()}${i}`,title:f.name.replace(/\.[^.]+$/,"")||"Untitled",category:"Mine",image:url,mine:true};
    });
    setUploaded(u=>[...added,...u]);
    setActiveCategory("Mine");
    toast(`${added.length} photo${added.length>1?"s":""} added for this session`);
    e.target.value="";
  };
  useEffect(()=>()=>{ urlsRef.current.forEach(u=>URL.revokeObjectURL(u)); },[]);

  const toggleFavorite=(id:number|string)=>{
    const liking=!favorites.includes(id);
    const n=liking?[...favorites,id]:favorites.filter(x=>x!==id);
    setFavorites(n); saveLS("axsStarred",n);
    if(liking){
      const photo=allPhotos.find(p=>p.id===id);
      if(photo){ notifyPhotoLiked({ photoTitle:photo.title, albumName:photo.category, likedBy:fullName }); }
    }
  };
  const toggleStarred=(id:number|string)=>{
    const pin=!starred.includes(id);
    const n=pin?[...starred,id]:starred.filter(x=>x!==id);
    setStarred(n); saveLS("axsStarredPhotos",n);
    toast(pin?"Pinned to your highlights":"Unpinned");
  };

  // ---- paging ----
  const goToPage=(i:number)=>{
    if(i===galleryPage)return;
    setPageFlipping(true); setGalleryPage(i);
    scrollRef.current?.scrollTo({top:0,behavior:"smooth"});
    window.setTimeout(()=>setPageFlipping(false),560);
  };
  const goNextGalleryPage=()=>goToPage((galleryPage+1)%totalPages);
  const goPrevGalleryPage=()=>goToPage((galleryPage-1+totalPages)%totalPages);

  useEffect(()=>{ setGalleryPage(0); },[activeCategory,dq,onlyFavs,sort]);
  useEffect(()=>{ if(galleryPage>=totalPages)setGalleryPage(0); },[galleryPage,totalPages]);
  useEffect(()=>{ if(activeCategory==="Mine"&&!uploaded.length)setActiveCategory("All"); },[uploaded.length,activeCategory]);
  useEffect(()=>{ saveLS("axsView",viewMode); },[viewMode]);
  useEffect(()=>{ saveLS("axsSort",sort); },[sort]);
  useEffect(()=>{ saveLS("axsAccent",accent); },[accent]);

  // ---- lightbox ----
  const lbPhoto=lbList&&lbIndex!=null?lbList[lbIndex]:null;
  const resetZoom=()=>{ setZoom(1); setPan({x:0,y:0}); };
  const openLightbox=(photo:Photo,list:Photo[]=filteredPhotos)=>{
    const i=list.findIndex(p=>p.id===photo.id); if(i<0)return;
    lastFocus.current=document.activeElement as HTMLElement;
    setLbList(list); setLbIndex(i); resetZoom(); setInfoOpen(false);
  };
  const closeLightbox=()=>{
    setLbIndex(null); setLbList(null); setPlaying(false); resetZoom();
    window.setTimeout(()=>lastFocus.current?.focus?.(),0);
  };
  const step=(d:number)=>{
    if(!lbList)return;
    setLbIndex(i=>i==null?i:(i+d+lbList.length)%lbList.length);
    resetZoom();
  };
  const jumpTo=(i:number)=>{ setLbIndex(i); resetZoom(); };
  const startSlideshow=()=>{
    if(!filteredPhotos.length){toast("Nothing to play. Clear your filters first.");return;}
    openLightbox(filteredPhotos[0]); setPlaying(true);
  };
  const clampPan=(x:number,y:number,z:number)=>{
    const r=stageRef.current?.getBoundingClientRect(); if(!r)return {x,y};
    const mx=(r.width*(z-1))/2, my=(r.height*(z-1))/2;
    return {x:clamp(x,-mx,mx),y:clamp(y,-my,my)};
  };
  const zoomBy=(delta:number)=>{
    const n=clamp(+(zoom+delta).toFixed(2),1,4);
    setZoom(n); setPan(n===1?{x:0,y:0}:clampPan(pan.x,pan.y,n));
  };
  const onStageDown=(e:any)=>{
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current={sx:e.clientX,sy:e.clientY,px:pan.x,py:pan.y};
    if(zoom>1)setDragging(true);
  };
  const onStageMove=(e:any)=>{
    const d=dragRef.current; if(!d||zoom<=1)return;
    setPan(clampPan(d.px+e.clientX-d.sx,d.py+e.clientY-d.sy,zoom));
  };
  const onStageUp=(e:any)=>{
    const d=dragRef.current; dragRef.current=null; setDragging(false);
    if(!d||zoom>1)return;
    const dx=e.clientX-d.sx, dy=e.clientY-d.sy;
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.4)step(dx<0?1:-1);
  };
  const onStageWheel=(e:any)=>{ zoomBy(-e.deltaY*0.002); };
  const onStageDouble=()=>{ if(zoom>1)resetZoom(); else setZoom(2.5); };
  const trapTab=(e:any)=>{
    if(e.key!=="Tab")return;
    const f=lbCardRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]):not([inert] *),a[href]");
    if(!f||!f.length)return;
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  const copyText=async(t:string)=>{ try{await navigator.clipboard.writeText(t);toast(`Copied ${t}`);}catch{toast("Copy failed");} };
  const downloadPhoto=async(p:Photo)=>{
    try{
      const r=await fetch(p.image); const b=await r.blob();
      const a=document.createElement("a"); a.href=URL.createObjectURL(b);
      a.download=`${p.title.replace(/\s+/g,"-").toLowerCase()}.jpg`; a.click();
      window.setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast("Download started");
    }catch{ window.open(p.image,"_blank","noopener"); }
  };
  const sharePhoto=async(p:Photo)=>{
    try{
      if((navigator as any).share){await (navigator as any).share({title:p.title,url:p.image});}
      else{await navigator.clipboard.writeText(p.image);toast("Link copied");}
    }catch{}
  };

  useEffect(()=>{ if(lbPhoto)lbCloseRef.current?.focus(); },[!!lbPhoto]);

  // palette + dimensions + views + preload when photo changes
  useEffect(()=>{
    if(!lbPhoto)return;
    let alive=true;
    setLbPalette([]); setDims(null);
    extractPalette(lbPhoto.image).then(p=>{ if(alive)setLbPalette(p); });
    setViews(v=>{ const n={...v,[lbPhoto.id]:(v[lbPhoto.id]||0)+1}; saveLS("axsViews",n); return n; });
    if(lbList){ const nx=lbList[(lbIndex!+1)%lbList.length]; if(nx){const im=new Image();im.src=nx.image;} }
    return ()=>{alive=false;};
  },[lbPhoto?.id]);

  useEffect(()=>{
    lbCardRef.current?.querySelector<HTMLElement>(".lb-filmstrip button.active")?.scrollIntoView({inline:"center",block:"nearest"});
  },[lbIndex]);

  // slideshow
  useEffect(()=>{
    if(!playing||lbIndex==null)return;
    const t=window.setTimeout(()=>step(1),SLIDE_MS);
    return ()=>window.clearTimeout(t);
  },[playing,lbIndex]);

  // ---- keyboard ----
  keyHandler.current=(e:KeyboardEvent)=>{
    const t=e.target as HTMLElement;
    const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setPaletteOpen(v=>!v);return;}
    if(paletteOpen)return;
    if(helpOpen){ if(e.key==="Escape")setHelpOpen(false); return; }
    if(lbPhoto){
      const k=e.key.toLowerCase();
      if(e.key==="Escape")closeLightbox();
      else if(e.key==="ArrowLeft")step(-1);
      else if(e.key==="ArrowRight")step(1);
      else if(e.key===" "&&t.tagName!=="BUTTON"){e.preventDefault();setPlaying(p=>!p);}
      else if(e.key==="+"||e.key==="=")zoomBy(.5);
      else if(e.key==="-")zoomBy(-.5);
      else if(e.key==="0")resetZoom();
      else if(k==="i")setInfoOpen(v=>!v);
      else if(k==="l")toggleFavorite(lbPhoto.id);
      else if(k==="s")toggleStarred(lbPhoto.id);
      return;
    }
    if(e.key==="Escape"){
      if(typing){ if(t===searchRef.current){setQuery("");searchRef.current?.blur();} return; }
      setSidebarOpen(false); return;
    }
    if(typing||e.ctrlKey||e.metaKey||e.altKey)return;
    switch(e.key){
      case "/": e.preventDefault(); searchRef.current?.focus(); break;
      case "?": setHelpOpen(true); break;
      case "b": case "B": setSidebarOpen(v=>!v); break;
      case "v": case "V": { const i=VIEWS.findIndex(v=>v.id===viewMode); setViewMode(VIEWS[(i+1)%VIEWS.length].id); break; }
      case "f": case "F": setOnlyFavs(v=>!v); break;
    }
  };
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>keyHandler.current(e);
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  // ---- card spotlight + tilt ----
  const onGridMove=(e:any)=>{
    if(e.pointerType!=="mouse")return;
    const el=(e.target as HTMLElement).closest(".masonry-item") as HTMLElement|null; if(!el)return;
    const r=el.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    el.style.setProperty("--mx",`${x*100}%`); el.style.setProperty("--my",`${y*100}%`);
    el.style.setProperty("--rx",`${((0.5-y)*7).toFixed(2)}deg`); el.style.setProperty("--ry",`${((x-0.5)*9).toFixed(2)}deg`);
  };
  const onItemLeave=(e:any)=>{ e.currentTarget.style.setProperty("--rx","0deg"); e.currentTarget.style.setProperty("--ry","0deg"); };

  const cycleAccent=()=>{ const i=ACCENTS.indexOf(accent); setAccent(ACCENTS[(i+1)%ACCENTS.length]); };
  const resetFilters=()=>{ setQuery(""); setActiveCategory("All"); setOnlyFavs(false); };

  const paletteItems:CmdItem[]=[
    {id:"sb",label:sidebarOpen?"Close profile panel":"Open profile panel",hint:"B",icon:<UserOutlined/>,run:()=>setSidebarOpen(v=>!v)},
    ...cats.map(c=>({id:`cat-${c}`,label:`Show ${CATEGORY_META[c].label}`,hint:"Filter",icon:CATEGORY_META[c].icon,run:()=>setActiveCategory(c)})),
    ...VIEWS.map(v=>({id:`v-${v.id}`,label:`${v.label} layout`,hint:"Layout",icon:v.icon,run:()=>setViewMode(v.id)})),
    {id:"favs",label:onlyFavs?"Show all photos":"Show liked photos only",hint:"F",icon:<HeartOutlined/>,run:()=>setOnlyFavs(v=>!v)},
    {id:"show",label:"Start slideshow",hint:"Play",icon:<PlayCircleOutlined/>,run:startSlideshow},
    {id:"up",label:"Add photos to gallery",hint:"Upload",icon:<PlusOutlined/>,run:()=>galleryUploadRef.current?.click()},
    {id:"acc",label:"Cycle accent color",hint:"Theme",icon:<BgColorsOutlined/>,run:cycleAccent},
    {id:"reset",label:"Clear search and filters",hint:"Reset",icon:<CloseOutlined/>,run:resetFilters},
    {id:"help",label:"Keyboard shortcuts",hint:"?",icon:<QuestionCircleOutlined/>,run:()=>setHelpOpen(true)},
  ];

  const rootStyle={"--accent":accent,"--accent-rgb":hexToRgb(accent)} as CSSProperties;
  const glow=lbPalette[0]||accent;
  const lbLiked=lbPhoto?favorites.includes(lbPhoto.id):false;
  const lbPinned=lbPhoto?starred.includes(lbPhoto.id):false;

  return (
    <div className={`profile-page${sidebarOpen?" sidebar-open":" sidebar-closed"}`} style={rootStyle}>
      <button type="button" className="sb-toggle-btn"
        onClick={()=>setSidebarOpen(v=>!v)}
        aria-label={sidebarOpen?"Close profile sidebar":"Open profile sidebar"}
        aria-expanded={sidebarOpen}
        title={sidebarOpen?"Close profile sidebar (B)":"Open profile sidebar (B)"}>
        <span className="toggle-divider" />
        <span className="toggle-glyph">{sidebarOpen?"‹":"›"}</span>
      </button>

      {sidebarOpen&&(
        <button type="button" className="sidebar-scrim" onClick={()=>setSidebarOpen(false)} aria-label="Close profile sidebar" tabIndex={-1} />
      )}

      <aside className={`pp-sidebar${sidebarOpen?" pp-sidebar--open":""}`} aria-label="Profile" {...(!sidebarOpen?({inert:""} as any):{})}>
        <div className="sidebar-aurora" />
        <div className="side-particle side-particle-1" />
        <div className="side-particle side-particle-2" />
        <div className="side-particle side-particle-3" />

        <div className="sidebar-topline">
          <span><ThunderboltOutlined /> Creator Mode</span>
          <button type="button" className="mini-close-btn" onClick={()=>setSidebarOpen(false)} aria-label="Close sidebar">
            <MenuFoldOutlined/>
          </button>
        </div>

        <div className="sb-avatar-wrap">
          <div className="avatar-orbit" />
          <div className={`profile-avatar-circle${kycVerified?" avatar-verified":" avatar-not-verified"}`}>
            {profile.profilePhoto
              ? <img src={profile.profilePhoto} alt={fullName}/>
              : <UserOutlined/>}
          </div>
          <span className={`avatar-kyc-badge${kycVerified?" avatar-kyc-badge--ok":" avatar-kyc-badge--no"}`} role="img" aria-label={kycVerified?"KYC verified":"KYC not verified"}>
            {kycVerified?<CheckCircleOutlined/>:<CloseOutlined/>}
          </span>
          <div className="sb-avatar-actions">
            <button type="button" onClick={()=>fileInputRef.current?.click()} className="avatar-action-btn" title="Upload" aria-label="Upload profile photo"><UploadOutlined/></button>
            <button type="button" onClick={()=>saveField("profilePhoto","")} disabled={!profile.profilePhoto} className="avatar-action-btn" title="Remove" aria-label="Remove profile photo"><DeleteOutlined/></button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} hidden/>
        </div>

        <div className="sb-name-block">
          <p className="sb-role">{profile.role}</p>
          <h2 className="sb-fullname">{fullName}</h2>
          <p className="sb-subtitle">Capturing Moments, Creating Stories</p>
        </div>

        <div className="sb-progress">
          <CompletenessRing pct={pct}/>
          <div className="sb-progress-body">
            <strong>{pct===100?"Profile complete":"Finish your profile"}</strong>
            {nextStep
              ? <button type="button" className="sb-next" onClick={nextStep.act}>{nextStep.label}</button>
              : <span>Everything is in place.</span>}
          </div>
        </div>

        <div className="sb-details">
          <DetailField icon={<UserOutlined/>}        field="fullName" value={fullName}        editable placeholder="Full name"   editingField={editingField} onStartEdit={(f:string)=>handleStartEdit(f,fullName)} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} error={editingField==="fullName"?fieldError:null} canSave={canSaveField}/>
          <DetailField icon={<MailOutlined/>}        field="email"    value={profile.email}   editable placeholder="Email"       editingField={editingField} onStartEdit={handleStartEdit} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} error={editingField==="email"?fieldError:null} canSave={canSaveField}/>
          <DetailField icon={<PhoneOutlined/>}       field="phone"    value={profile.phone}   editable placeholder="Phone"       editingField={editingField} onStartEdit={handleStartEdit} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} error={editingField==="phone"?fieldError:null} canSave={canSaveField}/>
          <DetailField icon={<CameraOutlined/>}      field="role"     value={profile.role}    editable={false} placeholder="Role" editingField={editingField} onStartEdit={handleStartEdit} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} error={null} canSave={canSaveField}/>
          <DetailField icon={<EnvironmentOutlined/>} field="address"  value={`${profile.address}, ${profile.city}, ${profile.state}`} editable placeholder="Address" editingField={editingField} onStartEdit={(f:string)=>handleStartEdit(f,profile.address||"")} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} error={editingField==="address"?fieldError:null} canSave={canSaveField}/>
          {canSaveField&&(
            <button type="button" className="floating-save-btn" onClick={handleSaveAll}>
              <CheckCircleOutlined/> Save
            </button>
          )}
        </div>

        <div ref={kycRef}>
          <KycSection
            verified={kycVerified} kycData={kycData}
            onVerify={(data:any)=>{ setKycVerified(true); setKycData(data); saveLS("axsKycVerified",true); saveLS("axsKycData",data); toast("KYC verified"); }}
            onReset={()=>{ setKycVerified(false); setKycData(null); saveLS("axsKycVerified",false); saveLS("axsKycData",null); }}
          />
        </div>

        <div className="sb-insights">
          <div className="sb-stats">
            <Stat label="Photos" value={allPhotos.length}/>
            <Stat label="Liked" value={favorites.length}/>
            <Stat label="Pinned" value={starred.length}/>
            <Stat label="Views" value={totalViews}/>
          </div>
          <p className="sb-mix-title">Portfolio mix</p>
          <div className="mix-bar">
            {mix.map(m=>(
              <button key={m.cat} type="button" style={{flexGrow:m.n,background:CAT_COLORS[m.cat]}}
                title={`${CATEGORY_META[m.cat].label}: ${m.n}`} aria-label={`Show ${CATEGORY_META[m.cat].label}, ${m.n} photos`}
                onClick={()=>setActiveCategory(m.cat)} />
            ))}
          </div>
          <div className="mix-legend">
            {mix.map(m=>(<span key={m.cat}><i style={{background:CAT_COLORS[m.cat]}}/>{CATEGORY_META[m.cat].label} {m.n}</span>))}
          </div>
        </div>

        <div className="sb-about-block">
          <p className="about-first-line">{ABOUT_LINES[0]}</p>
          {aboutExpanded&&(
            <div className="about-rest">
              {ABOUT_LINES.slice(1).map((l,i)=><p key={i} className="about-extra-line">{l}</p>)}
            </div>
          )}
          <button type="button" className="about-toggle-btn" aria-expanded={aboutExpanded} onClick={()=>setAboutExpanded(v=>!v)}>
            {aboutExpanded?"Show less":"Read more..."}
          </button>
        </div>

        <div className="social-row">
          <span className="social-icon instagram" title="Instagram"><InstagramIcon/></span>
          <span className="social-icon facebook"  title="Facebook"><FacebookIcon/></span>
          <span className="social-icon twitter"   title="Twitter"><TwitterIcon/></span>
          <span className="social-icon google"    title="Google"><GoogleIcon/></span>
        </div>

        <div className="sb-theme">
          <span className="sb-theme-label"><BgColorsOutlined/> Accent</span>
          <div className="swatches" role="radiogroup" aria-label="Accent color">
            {ACCENTS.map(c=>(
              <button key={c} type="button" role="radio" aria-checked={accent===c} aria-label={`Accent ${c}`}
                className={accent===c?"on":""} style={{background:c}} onClick={()=>setAccent(c)} />
            ))}
          </div>
        </div>

        <div className="sb-danger-zone">
          <div className="danger-zone-hdr">
            <span className="danger-zone-icon"><ExclamationCircleOutlined /></span>
            <div className="danger-zone-content">
              <p className="danger-zone-label">Danger Zone</p>
              <span className="danger-zone-sub">Permanently delete your account</span>
            </div>
          </div>

          {ownStatus === "pending" ? (
            <div className="danger-pending-banner">
              <ExclamationCircleOutlined /> Delete request pending super admin approval.
            </div>
          ) : !confirmingDelete ? (
            <button type="button" className="danger-trigger-btn" onClick={() => setConfirmingDelete(true)}>
              <DeleteOutlined /> Delete My Account
            </button>
          ) : (
            <div className="danger-confirm-box">
              <p className="danger-confirm-text">
                This can't be undone once a super admin approves it. You'll be signed out and will need to sign up again from scratch.
              </p>
              <textarea
                className="danger-reason-input"
                placeholder="Optional: tell us why (helps the super admin review faster)"
                aria-label="Reason for deleting your account"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
              />
              {requestError && <span className="danger-error-text" role="alert">{requestError}</span>}
              <div className="danger-confirm-actions">
                <button type="button" className="danger-btn-cancel"
                  onClick={() => { setConfirmingDelete(false); setDeleteReason(""); }} disabled={requesting}>
                  Cancel
                </button>
                <button type="button" className="danger-btn-confirm" onClick={handleConfirmDelete} disabled={requesting}>
                  {requesting ? "Submitting..." : "Confirm Delete Request"}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="pp-main">
        <div className="pp-topbar">
          <div className="pp-topbar-left">
            <div>
              <h1 className="pp-topbar-title">Profile &amp; Portfolio</h1>
              <p className="pp-topbar-sub">Your creative identity and gallery</p>
            </div>
          </div>
          <div className="pp-topbar-right">
            <label className="pp-search">
              <SearchOutlined/>
              <input ref={searchRef} type="text" value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Search photos" aria-label="Search photos" />
              {query?<button type="button" className="pp-search-clear" onClick={()=>setQuery("")} aria-label="Clear search"><CloseOutlined/></button>:<kbd>/</kbd>}
            </label>
            <button type="button" className="pp-cmd-btn" onClick={()=>setPaletteOpen(true)} aria-label="Open command palette" title="Command palette (Ctrl K)">
              <ThunderboltOutlined/><kbd>Ctrl K</kbd>
            </button>
          </div>
        </div>

        <div className="pp-gallery-scroll" ref={scrollRef}>
          <div className="gallery-head">
            <div>
              <h2><AppstoreOutlined/> Gallery</h2>
              <p>Wedding, portraits, nature, and cinematic work</p>
            </div>
            <div className="category-filter" role="group" aria-label="Categories">
              {cats.map(cat=>(
                <button type="button" key={cat}
                  className={activeCategory===cat?"active":""}
                  aria-pressed={activeCategory===cat}
                  aria-label={CATEGORY_META[cat].label}
                  onClick={()=>setActiveCategory(cat)}>
                  <span className="cat-icon">{CATEGORY_META[cat].icon}</span>
                  <span className="cat-tooltip" aria-hidden="true">{CATEGORY_META[cat].label}</span>
                </button>
              ))}
              {totalPages>1&&(
                <>
                  <button type="button" className="gallery-next-btn gallery-prev-btn" onClick={goPrevGalleryPage}
                    aria-label="Previous gallery page" title="Previous page"><span>‹</span></button>
                  <button type="button" className="gallery-next-btn" onClick={goNextGalleryPage}
                    aria-label="Next gallery page" title={`Page ${galleryPage+1} of ${totalPages}`}><span>›</span></button>
                </>
              )}
            </div>
          </div>

          <div className="gallery-tools">
            <div className="seg" role="group" aria-label="Layout">
              {VIEWS.map(v=>(
                <button key={v.id} type="button" className={viewMode===v.id?"on":""} aria-pressed={viewMode===v.id}
                  onClick={()=>setViewMode(v.id)} title={v.label}>{v.icon}<span>{v.label}</span></button>
              ))}
            </div>
            <label className="tool-select">
              <SortAscendingOutlined/>
              <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort photos">
                {SORTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <button type="button" className={`tool-chip${onlyFavs?" on":""}`} aria-pressed={onlyFavs} onClick={()=>setOnlyFavs(v=>!v)}>
              <HeartFilled/> Liked <b>{favorites.length}</b>
            </button>
            <button type="button" className="tool-chip" onClick={()=>galleryUploadRef.current?.click()}>
              <PlusOutlined/> Add photos
            </button>
            <button type="button" className="tool-chip" onClick={startSlideshow}>
              <PlayCircleOutlined/> Slideshow
            </button>
            <span className="tool-count" aria-live="polite">{filteredPhotos.length} of {allPhotos.length} photos</span>
            <input ref={galleryUploadRef} type="file" accept="image/*" multiple hidden onChange={handleGalleryUpload}/>
          </div>

          {filteredPhotos.length===0?(
            <div className="empty-gallery">
              <SearchOutlined/>
              <strong>No photos match</strong>
              <span>Try a different word, or clear the filters to see everything.</span>
              <button type="button" className="tool-chip on" onClick={resetFilters}>Clear filters</button>
            </div>
          ):(
            <div className={`gallery-page-shell${pageFlipping?" gallery-page-shell--flip":""}`}>
              <div className={`masonry-grid view-${viewMode}`} style={{counterReset:`frame ${galleryPage*PAGE_SIZE}`}} onPointerMove={onGridMove}>
                {visiblePhotos.map((photo,index)=>(
                  <div className="masonry-item" key={photo.id} style={{"--card-delay": `${index * 28}ms`} as CSSProperties} onPointerLeave={onItemLeave}>
                    <button type="button" className="masonry-btn" onClick={()=>openLightbox(photo)} aria-label={`Open ${photo.title}, ${photo.category}`}>
                      <img src={photo.image} alt={photo.title} loading="lazy" decoding="async"/>
                      <div className="masonry-overlay">
                        <small>{photo.category}</small>
                        <h3>{photo.title}</h3>
                        {views[photo.id]?<span className="ov-views"><EyeOutlined/> {views[photo.id]}</span>:null}
                      </div>
                    </button>
                    <button type="button"
                      className={`favorite-button${favorites.includes(photo.id)?" fav-active":""}`}
                      onClick={()=>toggleFavorite(photo.id)}
                      aria-pressed={favorites.includes(photo.id)}
                      aria-label={`Like ${photo.title}`}>
                      {favorites.includes(photo.id)?<HeartFilled/>:<HeartOutlined/>}
                    </button>
                    {starred.includes(photo.id)&&<span className="card-star-badge" role="img" aria-label="Pinned"><StarFilled/></span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalPages>1&&(
            <nav className="gallery-pager" aria-label="Gallery pages">
              {Array.from({length:totalPages},(_,i)=>(
                <button key={i} type="button" className={i===galleryPage?"on":""}
                  aria-current={i===galleryPage?"page":undefined} aria-label={`Page ${i+1}`} onClick={()=>goToPage(i)} />
              ))}
            </nav>
          )}
        </div>
      </main>

      {lbPhoto&&lbList&&lbIndex!=null&&(
        <div className="portfolio-lightbox" role="dialog" aria-modal="true" aria-label={`${lbPhoto.title}, photo ${lbIndex+1} of ${lbList.length}`}
          style={{"--glow":glow} as CSSProperties}>
          <button type="button" className="portfolio-lightbox-backdrop" onClick={closeLightbox} aria-label="Close" tabIndex={-1}/>
          <div className="portfolio-lightbox-card" ref={lbCardRef} onKeyDown={trapTab}>
            <button type="button" ref={lbCloseRef} className="portfolio-lightbox-close" onClick={closeLightbox} aria-label="Close preview"><CloseOutlined/></button>
            <button type="button"
              className={`lb-star-btn${lbPinned?" lb-star-active":""}`}
              aria-pressed={lbPinned} aria-label="Pin photo"
              onClick={()=>toggleStarred(lbPhoto.id)}>
              {lbPinned?<StarFilled/>:<StarOutlined/>}
            </button>
            <button type="button" className="lb-arrow lb-prev" onClick={()=>step(-1)} aria-label="Previous photo">&#8249;</button>
            <button type="button" className="lb-arrow lb-next" onClick={()=>step(1)} aria-label="Next photo">&#8250;</button>

            <div className="lb-toolbar" role="toolbar" aria-label="Photo tools">
              <button type="button" onClick={()=>zoomBy(-.5)} disabled={zoom<=1} aria-label="Zoom out"><ZoomOutOutlined/></button>
              <button type="button" className="lb-zoom-pct" onClick={resetZoom} aria-label="Reset zoom">{Math.round(zoom*100)}%</button>
              <button type="button" onClick={()=>zoomBy(.5)} disabled={zoom>=4} aria-label="Zoom in"><ZoomInOutlined/></button>
              <span className="lb-tb-sep" />
              <button type="button" className={playing?"on":""} onClick={()=>setPlaying(p=>!p)} aria-pressed={playing} aria-label={playing?"Pause slideshow":"Play slideshow"}>
                {playing?<PauseCircleOutlined/>:<PlayCircleOutlined/>}
              </button>
              <button type="button" className={infoOpen?"on":""} onClick={()=>setInfoOpen(v=>!v)} aria-pressed={infoOpen} aria-label="Photo details"><InfoCircleOutlined/></button>
              <button type="button" onClick={()=>downloadPhoto(lbPhoto)} aria-label="Download photo"><DownloadOutlined/></button>
              <button type="button" onClick={()=>sharePhoto(lbPhoto)} aria-label="Share photo"><ShareAltOutlined/></button>
            </div>

            <div ref={stageRef} className={`lb-stage${zoom>1?" zoomed":""}${dragging?" dragging":""}`}
              onWheel={onStageWheel} onPointerDown={onStageDown} onPointerMove={onStageMove}
              onPointerUp={onStageUp} onPointerCancel={onStageUp} onDoubleClick={onStageDouble}>
              <img src={lbPhoto.image} alt={lbPhoto.title} draggable={false}
                style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}
                onLoad={e=>setDims({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})}/>
              {playing&&<span key={lbIndex} className="lb-progress" style={{animationDuration:`${SLIDE_MS}ms`}} />}
              <aside className={`lb-info${infoOpen?" open":""}`} {...(!infoOpen?({inert:""} as any):{})} onPointerDown={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()}>
                <h4>Details</h4>
                <dl>
                  <dt>Collection</dt><dd>{CATEGORY_META[lbPhoto.category]?.label||lbPhoto.category}</dd>
                  <dt>Size</dt><dd>{dims?`${dims.w} × ${dims.h}`:"Loading"}</dd>
                  <dt>Views</dt><dd>{views[lbPhoto.id]||0}</dd>
                  <dt>Status</dt><dd>{lbLiked?"Liked":"Not liked"}{lbPinned?", pinned":""}</dd>
                </dl>
                <h4>Palette</h4>
                <div className="lb-palette">
                  {lbPalette.length
                    ? lbPalette.map(c=>(<button key={c} type="button" style={{background:c}} title={`Copy ${c}`} aria-label={`Copy color ${c}`} onClick={()=>copyText(c)}><span>{c}</span></button>))
                    : <small>Palette unavailable</small>}
                </div>
              </aside>
            </div>

            <div className="lb-meta">
              <span>{lbPhoto.category}</span>
              <h3>{lbPhoto.title}</h3>
              <button type="button" className={`lb-like${lbLiked?" on":""}`} aria-pressed={lbLiked} aria-label="Like photo" onClick={()=>toggleFavorite(lbPhoto.id)}>
                {lbLiked?<HeartFilled/>:<HeartOutlined/>}
              </button>
              <small>{lbIndex+1} / {lbList.length}</small>
            </div>
            <div className="lb-filmstrip">
              {lbList.map((photo,i)=>(
                <button type="button" key={photo.id}
                  className={i===lbIndex?"active":""}
                  aria-current={i===lbIndex}
                  onClick={()=>jumpTo(i)}
                  aria-label={`Preview ${photo.title}`}>
                  <img src={photo.image} alt="" loading="lazy"/>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {paletteOpen&&(
        <CommandPalette items={paletteItems} photoList={allPhotos} onClose={()=>setPaletteOpen(false)} onOpenPhoto={p=>openLightbox(p,allPhotos)} />
      )}
      {helpOpen&&<ShortcutsHelp onClose={()=>setHelpOpen(false)} />}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t=><div key={t.id} className="toast">{t.msg}</div>)}
      </div>
    </div>
  );
}

export default ProfilePage;