/**
 * albumLibraryStore.ts  →  src/utils/albumLibraryStore.ts
 *
 * Single source of truth for saved albums, backed by IndexedDB.
 *
 *  - localStorage caps out near 5 MB (about 15–25 photos). IndexedDB holds hundreds of MB, enough for
 *    15 albums × 100 photos once images are compressed.
 *  - The public API stays SYNCHRONOUS: reads come from an in-memory cache and writes persist in the
 *    background. Use `whenLibraryReady()` / `isLibraryReady()` to know when the first load has finished.
 *  - Every write is announced to other tabs, so an editor open in one tab and the library open in
 *    another stay in sync.
 *  - The library page and the Template Editor talk through a tiny "editor session" in sessionStorage
 *    ({ mode, albumId }). The editor loads the real album with `getAlbumById()`, so "Edit" resumes
 *    exactly where you stopped and survives a page refresh.
 */

/* ════════════════════════════ config ════════════════════════════ */
export const LIBRARY_LIMITS = {
  maxAlbums: 15,
  maxPhotosPerAlbum: 100,
} as const;

/** Old localStorage keys to migrate from. */
const LEGACY_ALBUM_KEYS = ["axs.albumLibrary.v1", "axs_saved_albums", "axs.savedAlbums"];
const LEGACY_FAVORITE_KEYS = ["axs.albumLibrary.favorites.v1", "axs_album_favorites"];

const DB_NAME = "axs-album-library";
const DB_VERSION = 1;
const CHANNEL_NAME = "axs-album-library-sync";
const SESSION_KEY = "axs.albumEditor.session.v1";
const LEGACY_CONTEXT_KEY = "currentTemplateEditor";
const FALLBACK_QUOTA_BYTES = 500 * 1024 * 1024;
const LOW_SPACE_RATIO = 0.95;

/* ════════════════════════════ types ════════════════════════════ */
export interface LibraryTextSnapshot {
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
  align: "left" | "center" | "right";
  bg: string;
  isSticker?: boolean;
  shadow?: boolean;
  spacing?: number;
  opacity?: number;
  stroke?: number;
  strokeColor?: string;
}

export interface LibrarySlotSnapshot {
  id: string;
  image: string | null;
  fileName?: string;
  caption?: string;
  rotateExtra?: number;
  flip?: boolean;
  front?: boolean;
  filter?: string;
  scale?: number;
  zoom?: number;
  fx?: number;
  fy?: number;
  frame?: string;
  adj?: { b: number; c: number; s: number };
  tilt?: number;
  vignette?: boolean;
}

export interface LibrarySheetSnapshot {
  id: string;
  name: string;
  layout: string;
  bgColor: string;
  bgImage: string | null;
  title?: string;
  subtitle?: string;
  gap?: number;
  radius?: number;
  textElements: LibraryTextSnapshot[];
  slots: LibrarySlotSnapshot[];
}

export interface SavedAlbumEntry {
  id: string;
  templateId: number;
  templateName: string;
  serviceName: string;
  eventId: string | null;
  eventName: string;
  versionNum: number;
  canvasSize: string;
  sheetCount?: number;
  coverImage: string | null;
  savedAt: string;
  sheets: LibrarySheetSnapshot[];
  /** album-wide spacing chosen in the editor */
  settings?: { gap: number; radius: number };
}

export interface LibraryStats {
  totalAlbums: number;
  totalPages: number;
  totalServices: number;
  totalPhotos: number;
  favorites: number;
  storageKB: number;
  storagePct: number;
  quotaBytes: number;
  albumBytes: Record<string, number>;
  maxAlbums: number;
  maxPhotosPerAlbum: number;
}

export interface StorageEstimateInfo {
  usage: number;
  quota: number;
  persisted: boolean;
  supported: boolean;
}

export interface OptimizeOptions {
  maxDim: number;
  quality: number;
}
export interface OptimizeControl {
  /** Abort to stop early. Albums already optimized are kept. */
  signal?: AbortSignal;
  /** Limit the run to these albums. Omit to optimize the whole library. */
  albumIds?: string[];
}
export interface OptimizeResult {
  images: number;
  before: number;
  after: number;
  cancelled?: boolean;
}

export interface ImportResult {
  /** albums added */
  count: number;
  /** albums valid but left out because the library is full */
  skipped: number;
  /** entries that were not albums at all */
  invalid: number;
  /** original id → id it was saved under */
  idMap: Record<string, string>;
  /** anything the exporter attached (the Library page stores its labels/tags here) */
  extra?: any;
}

export interface EditorSession {
  mode: "new" | "edit";
  albumId: string;
}

export interface DuplicateGroup {
  copies: number;
  albumIds: string[];
  wastedBytes: number;
}
export interface DuplicateReport {
  totalPhotos: number;
  uniquePhotos: number;
  duplicatePhotos: number;
  wastedBytes: number;
  groups: DuplicateGroup[];
}

export type AuditKind = "empty-album" | "missing-cover" | "sheet-count" | "over-photo-limit" | "orphan-favorite";
export interface AuditIssue {
  kind: AuditKind;
  albumId?: string;
  message: string;
  fixable: boolean;
}

/* ════════════════════════════ IndexedDB plumbing ════════════════════════════ */
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("albums")) d.createObjectStore("albums", { keyPath: "id" });
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
      };
      r.onsuccess = () => {
        const db = r.result;
        // another tab upgrading the schema should not be blocked by this one
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      r.onerror = () => { dbPromise = null; reject(r.error); };
    });
  }
  return dbPromise;
}

async function run<T = unknown>(
  store: "albums" | "meta",
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest | void,
): Promise<T | undefined> {
  const d = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? (req.result as T) : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* ════════════════════════════ state ════════════════════════════ */
let cache: SavedAlbumEntry[] = [];
let favorites = new Set<string>();
const bytes = new Map<string, number>();
let ready = false;
let cachedEstimate: StorageEstimateInfo | null = null;
let channel: BroadcastChannel | null = null;

const listeners = new Set<() => void>();
const noticeListeners = new Set<(msg: string) => void>();
let readyResolve: () => void = () => {};
const readyPromise = new Promise<void>((r) => { readyResolve = r; });

const emit = () => listeners.forEach((l) => { try { l(); } catch { /* listener error */ } });

export function subscribeToAlbumLibrary(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
/** Errors AND gentle warnings (low space, over the photo guideline) arrive here as plain sentences. */
export function subscribeToStorageErrors(cb: (msg: string) => void): () => void {
  noticeListeners.add(cb);
  return () => { noticeListeners.delete(cb); };
}
export const isLibraryReady = () => ready;
export const whenLibraryReady = () => readyPromise;

const notify = (msg: string) => noticeListeners.forEach((l) => { try { l(msg); } catch { /* ignore */ } });

function reportError(e: unknown) {
  const name = (e as any)?.name;
  const msg = name === "QuotaExceededError"
    ? "Browser storage is full. Optimize photos, or export and remove an album, then try again."
    : "Couldn't save to library storage. Your changes may not persist.";
  console.error("[albumLibraryStore]", e);
  notify(msg);
}

/** Writes run one at a time, in order. A failed write reports itself and never blocks the next one. */
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>, announce = true): Promise<T | undefined> {
  const p = chain
    .then(async () => {
      const result = await fn();
      if (announce) announceChange();
      return result;
    })
    .catch((e) => { reportError(e); return undefined; });
  chain = p;
  return p as Promise<T | undefined>;
}

/* ════════════════════════════ cross-tab sync ════════════════════════════ */
function announceChange() {
  try { channel?.postMessage(Date.now()); } catch { /* channel closed */ }
}

async function reloadFromDb() {
  const list = (await run<SavedAlbumEntry[]>("albums", "readonly", (s) => s.getAll())) ?? [];
  const favs = await run<string[]>("meta", "readonly", (s) => s.get("favorites"));
  cache = list;
  favorites = new Set((favs ?? []).filter((id) => list.some((a) => a.id === id)));
  bytes.clear();
  cache.forEach((a) => bytes.set(a.id, estimateAlbumBytes(a)));
  emit();
  void refreshEstimate().then(emit);
}

function openChannel() {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    // Queue behind our own pending writes so we never reload over unsaved local changes.
    channel.onmessage = () => { if (ready) void enqueue(reloadFromDb, false); };
  } catch { channel = null; }
}

/* ════════════════════════════ size + id helpers ════════════════════════════ */
const strBytes = (s?: string | null) => {
  if (!s) return 0;
  return s.startsWith("data:") ? Math.round(s.length * 0.75) : s.length;
};

export function estimateAlbumBytes(a: SavedAlbumEntry): number {
  let n = strBytes(a.coverImage);
  a.sheets.forEach((s) => {
    n += strBytes(s.bgImage);
    s.slots.forEach((sl) => { n += strBytes(sl.image); });
  });
  return n;
}

export function countAlbumPhotos(a: SavedAlbumEntry): number {
  let n = 0;
  a.sheets.forEach((s) => s.slots.forEach((sl) => { if (sl.image) n++; }));
  return n;
}

export function newAlbumId(): string {
  return `album_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
const clone = <T,>(v: T): T => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

function deriveCover(sheets: LibrarySheetSnapshot[]): string | null {
  const firstPhoto = sheets.flatMap((s) => s.slots ?? []).find((sl) => sl?.image)?.image ?? null;
  return sheets[0]?.bgImage ?? firstPhoto;
}

/* ════════════════════════════ normalisation ════════════════════════════
 * Used for legacy data and imports, so older or hand-edited files can never put a malformed
 * album into the library.
 */
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

function normalizeText(t: any, i: number): LibraryTextSnapshot {
  return {
    ...t,
    id: typeof t?.id === "string" && t.id ? t.id : `text-${i}`,
    text: String(t?.text ?? ""),
    xPct: num(t?.xPct, 0), yPct: num(t?.yPct, 0), wPct: num(t?.wPct, 30), hPct: num(t?.hPct, 10),
    rotate: num(t?.rotate, 0),
    color: t?.color || "#111111",
    fontFamily: t?.fontFamily || "inherit",
    fontSize: num(t?.fontSize, 4),
    bold: !!t?.bold, italic: !!t?.italic, underline: !!t?.underline,
    align: t?.align === "left" || t?.align === "right" ? t.align : "center",
    bg: t?.bg || "transparent",
  };
}

function normalizeSlot(sl: any, si: number, i: number): LibrarySlotSnapshot {
  return {
    ...sl,
    id: typeof sl?.id === "string" && sl.id ? sl.id : `slot-${si}-${i}`,
    image: typeof sl?.image === "string" && sl.image ? sl.image : null,
  };
}

function normalizeSheet(s: any, i: number): LibrarySheetSnapshot {
  return {
    ...s,
    id: typeof s?.id === "string" && s.id ? s.id : `sheet-${i}`,
    name: s?.name || `Page ${i + 1}`,
    layout: String(s?.layout ?? ""),
    bgColor: s?.bgColor || "#ffffff",
    bgImage: typeof s?.bgImage === "string" && s.bgImage ? s.bgImage : null,
    slots: (Array.isArray(s?.slots) ? s.slots : []).map((sl: any, j: number) => normalizeSlot(sl, i, j)),
    textElements: (Array.isArray(s?.textElements) ? s.textElements : []).map(normalizeText),
  };
}

function normalizeAlbum(raw: any): SavedAlbumEntry | null {
  if (!raw || !Array.isArray(raw.sheets) || !raw.sheets.length) return null;
  const sheets = raw.sheets.map(normalizeSheet) as LibrarySheetSnapshot[];
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : newAlbumId(),
    templateId: Number(raw.templateId) || 0,
    templateName: raw.templateName || "Imported Album",
    serviceName: raw.serviceName || "Album",
    eventId: raw.eventId ?? null,
    eventName: raw.eventName || "Imported",
    versionNum: Number(raw.versionNum) || 1,
    canvasSize: raw.canvasSize || "10x8",
    sheetCount: sheets.length,
    coverImage: raw.coverImage ?? deriveCover(sheets),
    savedAt: raw.savedAt || new Date().toISOString(),
    sheets,
    settings: raw.settings,
  };
}

/* ════════════════════════════ init + migration ════════════════════════════ */
async function migrateLegacy() {
  for (const key of LEGACY_ALBUM_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const list: unknown[] = Array.isArray(parsed) ? parsed : parsed?.albums ?? [];
      if (!list.length) continue;
      let allSaved = true;
      for (const item of list) {
        const a = normalizeAlbum(item);
        if (!a) continue;
        try {
          await run("albums", "readwrite", (s) => s.put(a));
          cache.push(a);
        } catch { allSaved = false; }
      }
      // only clear the old copy once every album is safely in IndexedDB
      if (allSaved) localStorage.removeItem(key);
    } catch { /* skip broken legacy blob */ }
  }
  for (const key of LEGACY_FAVORITE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) ids.forEach((id) => favorites.add(String(id)));
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  }
  if (favorites.size) await run("meta", "readwrite", (s) => s.put([...favorites], "favorites"));
}

async function init() {
  try {
    cache = (await run<SavedAlbumEntry[]>("albums", "readonly", (s) => s.getAll())) ?? [];
    const favs = await run<string[]>("meta", "readonly", (s) => s.get("favorites"));
    favorites = new Set(favs ?? []);
    if (!cache.length) await migrateLegacy();
    cache.forEach((a) => bytes.set(a.id, estimateAlbumBytes(a)));
    favorites = new Set([...favorites].filter((id) => cache.some((a) => a.id === id)));
  } catch (e) {
    console.error("[albumLibraryStore] init failed", e);
    notify("Couldn't open library storage. Albums saved this session may not persist.");
  } finally {
    ready = true;
    openChannel();
    readyResolve();
    emit();
    void refreshEstimate().then(emit);
  }
}
if (typeof window !== "undefined") void init();

/* ════════════════════════════ storage estimate ════════════════════════════ */
async function refreshEstimate(): Promise<StorageEstimateInfo> {
  const supported = typeof navigator !== "undefined" && !!navigator.storage?.estimate;
  if (!supported) {
    cachedEstimate = { usage: 0, quota: 0, persisted: false, supported: false };
    return cachedEstimate;
  }
  try {
    const est = await navigator.storage.estimate();
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    cachedEstimate = { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted, supported: true };
  } catch {
    cachedEstimate = { usage: 0, quota: 0, persisted: false, supported: false };
  }
  return cachedEstimate;
}
export const getStorageEstimate = refreshEstimate;

/** Ask the browser not to evict the library under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const ok = (await navigator.storage?.persist?.()) ?? false;
    await refreshEstimate();
    emit();
    return ok;
  } catch {
    return false;
  }
}

/** True when `extraBytes` more would still leave the browser some headroom. Unknown quota counts as yes. */
export function canFit(extraBytes: number): boolean {
  const e = cachedEstimate;
  if (!e?.supported || !e.quota) return true;
  return e.usage + extraBytes < e.quota * LOW_SPACE_RATIO;
}

/* ════════════════════════════ reads ════════════════════════════ */
export const getSavedAlbums = (): SavedAlbumEntry[] => cache.slice();
export const getAlbumById = (id: string): SavedAlbumEntry | null => cache.find((a) => a.id === id) ?? null;
export const getFavoriteIds = (): string[] => [...favorites];

export function getLibraryStats(): LibraryStats {
  const totalBytes = [...bytes.values()].reduce((a, b) => a + b, 0);
  const quotaBytes = cachedEstimate?.quota || FALLBACK_QUOTA_BYTES;
  return {
    totalAlbums: cache.length,
    totalPages: cache.reduce((n, a) => n + (a.sheetCount ?? a.sheets.length), 0),
    totalServices: new Set(cache.map((a) => a.serviceName)).size,
    totalPhotos: cache.reduce((n, a) => n + countAlbumPhotos(a), 0),
    favorites: favorites.size,
    storageKB: Math.round(totalBytes / 1024),
    storagePct: Math.min(100, Math.round((totalBytes / quotaBytes) * 100)),
    quotaBytes,
    albumBytes: Object.fromEntries(bytes),
    maxAlbums: LIBRARY_LIMITS.maxAlbums,
    maxPhotosPerAlbum: LIBRARY_LIMITS.maxPhotosPerAlbum,
  };
}

/* ════════════════════════════ writes ════════════════════════════ */
function commit(a: SavedAlbumEntry) {
  const i = cache.findIndex((x) => x.id === a.id);
  if (i === -1) cache = [...cache, a]; else cache = cache.map((x) => (x.id === a.id ? a : x));
  bytes.set(a.id, estimateAlbumBytes(a));
  return enqueue(() => run("albums", "readwrite", (s) => s.put(a)));
}

/**
 * Create or replace an album (matched by id). Call this from the Template Editor's "Save".
 * Saving never blocks: if the album is heavy or space is low you get a gentle notice through
 * `subscribeToStorageErrors`, and any failure is reported the same way.
 */
export function upsertSavedAlbum(entry: SavedAlbumEntry): SavedAlbumEntry {
  const sheets = entry.sheets ?? [];
  const a: SavedAlbumEntry = {
    ...entry,
    id: entry.id || newAlbumId(),
    savedAt: entry.savedAt || new Date().toISOString(),
    sheetCount: sheets.length,
    coverImage: entry.coverImage ?? deriveCover(sheets),
  };

  const photos = countAlbumPhotos(a);
  if (photos > LIBRARY_LIMITS.maxPhotosPerAlbum) {
    notify(`“${a.templateName}” has ${photos} photos. Albums work best under ${LIBRARY_LIMITS.maxPhotosPerAlbum}.`);
  }
  const previous = bytes.get(a.id) ?? 0;
  const growth = estimateAlbumBytes(a) - previous;
  if (growth > 0 && !canFit(growth)) {
    notify("Storage is nearly full. Optimize photos or export a backup soon.");
  }

  void commit(a).then(() => refreshEstimate().then(emit));
  emit();
  return a;
}
export const saveAlbum = upsertSavedAlbum;

export function deleteSavedAlbum(id: string) { deleteSavedAlbums([id]); }
export function deleteSavedAlbums(ids: string[]) {
  const set = new Set(ids);
  cache = cache.filter((a) => !set.has(a.id));
  ids.forEach((id) => { bytes.delete(id); favorites.delete(id); });
  emit();
  void enqueue(async () => {
    for (const id of ids) await run("albums", "readwrite", (s) => s.delete(id));
    await run("meta", "readwrite", (s) => s.put([...favorites], "favorites"));
    await refreshEstimate();
    emit();
  });
}

export function toggleFavorite(id: string) {
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  emit();
  void enqueue(() => run("meta", "readwrite", (s) => s.put([...favorites], "favorites")));
}

export function renameSavedAlbum(id: string, name: string) {
  const a = cache.find((x) => x.id === id);
  const t = name.trim();
  if (!a || !t) return;
  void commit({ ...a, templateName: t });
  emit();
}

export function duplicateSavedAlbum(id: string): SavedAlbumEntry | null {
  const a = cache.find((x) => x.id === id);
  if (!a || cache.length >= LIBRARY_LIMITS.maxAlbums) return null;
  const copy: SavedAlbumEntry = {
    ...clone(a),
    id: newAlbumId(),
    templateName: `${a.templateName} (copy)`,
    versionNum: 1,
    savedAt: new Date().toISOString(),
  };
  void commit(copy).then(() => refreshEstimate().then(emit));
  emit();
  return copy;
}

/* ════════════════════════════ health: duplicates + audit ════════════════════════════ */

/** Finds identical photos used more than once across the library, and how much space they waste. */
export function getDuplicateReport(): DuplicateReport {
  const seen = new Map<string, { copies: number; size: number; albums: Set<string> }>();
  let total = 0;
  cache.forEach((a) => a.sheets.forEach((s) => s.slots.forEach((sl) => {
    const img = sl.image;
    if (!img || img.length < 200) return;
    total++;
    const hit = seen.get(img);
    if (hit) { hit.copies++; hit.albums.add(a.id); } else seen.set(img, { copies: 1, size: strBytes(img), albums: new Set([a.id]) });
  })));

  const groups: DuplicateGroup[] = [];
  let dupes = 0;
  let wasted = 0;
  seen.forEach((v) => {
    if (v.copies < 2) return;
    dupes += v.copies - 1;
    const w = v.size * (v.copies - 1);
    wasted += w;
    groups.push({ copies: v.copies, albumIds: [...v.albums], wastedBytes: w });
  });
  groups.sort((x, y) => y.wastedBytes - x.wastedBytes);
  return { totalPhotos: total, uniquePhotos: seen.size, duplicatePhotos: dupes, wastedBytes: wasted, groups: groups.slice(0, 20) };
}

/** Looks for problems that would confuse the library page or the editor. Nothing is changed. */
export function auditLibrary(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const alive = new Set(cache.map((a) => a.id));
  cache.forEach((a) => {
    if (!a.sheets.length) issues.push({ kind: "empty-album", albumId: a.id, message: `“${a.templateName}” has no pages.`, fixable: false });
    if (!a.coverImage && deriveCover(a.sheets)) issues.push({ kind: "missing-cover", albumId: a.id, message: `“${a.templateName}” has no cover image.`, fixable: true });
    if (a.sheetCount !== a.sheets.length) issues.push({ kind: "sheet-count", albumId: a.id, message: `“${a.templateName}” lists the wrong page count.`, fixable: true });
    const photos = countAlbumPhotos(a);
    if (photos > LIBRARY_LIMITS.maxPhotosPerAlbum) issues.push({ kind: "over-photo-limit", albumId: a.id, message: `“${a.templateName}” has ${photos} photos (guideline ${LIBRARY_LIMITS.maxPhotosPerAlbum}).`, fixable: false });
  });
  favorites.forEach((id) => {
    if (!alive.has(id)) issues.push({ kind: "orphan-favorite", message: "A favorite points to an album that no longer exists.", fixable: true });
  });
  return issues;
}

/** Fixes what `auditLibrary` marks as fixable. Returns how many fixes were made. */
export function repairLibrary(): number {
  let fixed = 0;
  cache.forEach((a) => {
    const cover = a.coverImage ?? deriveCover(a.sheets);
    if (cover !== a.coverImage || a.sheetCount !== a.sheets.length) {
      void commit({ ...a, coverImage: cover, sheetCount: a.sheets.length });
      fixed++;
    }
  });
  const alive = new Set(cache.map((a) => a.id));
  const stale = [...favorites].filter((id) => !alive.has(id));
  if (stale.length) {
    stale.forEach((id) => favorites.delete(id));
    fixed += stale.length;
    void enqueue(() => run("meta", "readwrite", (s) => s.put([...favorites], "favorites")));
  }
  if (fixed) emit();
  return fixed;
}

/* ════════════════════════════ export / import ════════════════════════════ */
export function exportAlbumsAsJson(list: SavedAlbumEntry[], filename?: string, extra?: unknown) {
  const payload = { app: "axs-album-library", version: 2, exportedAt: new Date().toISOString(), albums: list, extra };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `axs-album-library-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Accepts a library backup, a bare array, or a single album file from the editor.
 * Albums whose id already exists are added as new albums, so importing never overwrites your work.
 */
export function importAlbumsFromJsonText(text: string): ImportResult {
  const out: ImportResult = { count: 0, skipped: 0, invalid: 0, idMap: {} };
  try {
    const data = JSON.parse(text);
    const list: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.albums)
      ? data.albums
      : Array.isArray(data?.sheets)
      ? [data]
      : [];
    out.extra = Array.isArray(data) ? undefined : data?.extra;

    const toWrite: SavedAlbumEntry[] = [];
    for (const raw of list) {
      const entry = normalizeAlbum(raw);
      if (!entry) { out.invalid++; continue; }
      if (cache.length + toWrite.length >= LIBRARY_LIMITS.maxAlbums) { out.skipped++; continue; }
      const originalId = (raw as any)?.id ?? entry.id;
      const taken = cache.some((a) => a.id === entry.id) || toWrite.some((a) => a.id === entry.id);
      const id = taken ? newAlbumId() : entry.id;
      out.idMap[String(originalId)] = id;
      toWrite.push({ ...entry, id });
    }
    toWrite.forEach((a) => { void commit(a); });
    out.count = toWrite.length;
    if (toWrite.length) { emit(); void refreshEstimate().then(emit); }
  } catch { /* invalid JSON */ }
  return out;
}

/* ════════════════════════════ editor hand-off ════════════════════════════
 * Library → editor: only { mode, albumId } travels. The editor should:
 *   await whenLibraryReady();
 *   const s = readEditorSession();
 *   const album = s?.mode === "edit" ? getAlbumById(s.albumId) : null;
 * Saving with upsertSavedAlbum({ id: s.albumId, ... }) then replaces that same album.
 */
function writeSession(session: EditorSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.removeItem(LEGACY_CONTEXT_KEY);
  } catch { /* storage blocked */ }
}

/** Open an existing album in the editor and CONTINUE editing it. */
export function beginEditAlbum(album: SavedAlbumEntry) { writeSession({ mode: "edit", albumId: album.id }); }

/** Start a brand-new blank album with its own id. */
export function beginBlankAlbum() { writeSession({ mode: "new", albumId: newAlbumId() }); }

/** The editor reads (does not clear) the hand-off, so a page refresh keeps working. */
export function readEditorSession(): EditorSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.albumId && (s.mode === "new" || s.mode === "edit") ? (s as EditorSession) : null;
  } catch {
    return null;
  }
}

export function clearEditorSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

/**
 * @deprecated Kept for editors written against the earlier in-memory hand-off.
 * Returns the session once and clears it. Prefer `readEditorSession()` + `getAlbumById()`.
 */
export function takePendingEditorSession(): ({ mode: "edit"; album: SavedAlbumEntry } | { mode: "blank" }) | null {
  const s = readEditorSession();
  if (!s) return null;
  clearEditorSession();
  if (s.mode === "new") return { mode: "blank" };
  const album = getAlbumById(s.albumId);
  return album ? { mode: "edit", album: clone(album) } : null;
}

/* ════════════════════════════ image optimizer ════════════════════════════ */
export function compressDataUrl(src: string, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    if (!src.startsWith("data:image/") || src.startsWith("data:image/svg") || src.startsWith("data:image/gif")) { resolve(src); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
        const scale = Math.min(1, maxDim / longest);
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const cx = cv.getContext("2d");
        if (!cx) { resolve(src); return; }
        cx.fillStyle = "#fff";
        cx.fillRect(0, 0, w, h);
        cx.drawImage(img, 0, 0, w, h);
        const out = cv.toDataURL("image/jpeg", quality);
        resolve(out.length < src.length ? out : src);
      } catch { resolve(src); }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

const breathe = () => new Promise<void>((r) => window.setTimeout(r, 0));

/**
 * Re-compress photos in the library. Identical images are compressed once and reused.
 * Runs in small slices so the page stays responsive, can be cancelled, and each finished album is
 * saved as it completes. An album edited while the run is in progress is left untouched.
 */
export async function optimizeLibrary(
  opts: OptimizeOptions,
  onProgress?: (done: number, total: number) => void,
  control: OptimizeControl = {},
): Promise<OptimizeResult> {
  const only = control.albumIds ? new Set(control.albumIds) : null;
  const list = cache.filter((a) => !only || only.has(a.id));
  const total = list.reduce((n, a) => n + a.sheets.reduce((m, s) => m + s.slots.length, 0), 0);
  const memo = new Map<string, string>();
  const shrink = async (src?: string | null) => {
    if (!src) return src ?? null;
    let out = memo.get(src);
    if (out === undefined) { out = await compressDataUrl(src, opts.maxDim, opts.quality); memo.set(src, out); }
    return out;
  };

  let done = 0, before = 0, after = 0, cancelled = false;
  for (const a of list) {
    if (control.signal?.aborted) { cancelled = true; break; }
    const b = bytes.get(a.id) ?? estimateAlbumBytes(a);
    before += b;

    const next: SavedAlbumEntry = { ...a, coverImage: await shrink(a.coverImage), sheets: [] };
    let stopped = false;
    for (const s of a.sheets) {
      const slots: LibrarySlotSnapshot[] = [];
      for (const sl of s.slots) {
        if (control.signal?.aborted) { stopped = true; break; }
        slots.push({ ...sl, image: await shrink(sl.image) });
        done++;
        onProgress?.(done, total);
        if (done % 4 === 0) await breathe();
      }
      if (stopped) break;
      next.sheets.push({ ...s, bgImage: await shrink(s.bgImage), slots });
    }
    if (stopped) { cancelled = true; after += b; break; }

    const current = cache.find((x) => x.id === a.id);
    const untouched = current && current.savedAt === a.savedAt && current.sheets === a.sheets;
    const nb = estimateAlbumBytes(next);
    if (untouched && nb < b) { await commit(next); after += nb; } else after += b;
  }

  await refreshEstimate();
  emit();
  return { images: total, before, after, cancelled: cancelled || undefined };
}