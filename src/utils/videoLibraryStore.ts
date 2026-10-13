/* Video Library store: metadata + video blobs in IndexedDB (survives refresh). */

export interface VideoEntry {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  category: string;
  visibility: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  ext: string;
  createdAt: string;
  thumb: string | null;
  favorite: boolean;
  plays: number;
}

export type NewVideoMeta = Partial<Omit<VideoEntry, "id" | "size" | "createdAt" | "favorite" | "plays">>;

const DB_NAME = "axs-video-library";
const META = "meta";
const BLOBS = "blobs";
const EVENT = "axs:video-library-changed";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains(META)) d.createObjectStore(META, { keyPath: "id" });
        if (!d.objectStoreNames.contains(BLOBS)) d.createObjectStore(BLOBS);
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  return dbPromise;
}

const wrap = <T,>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const txDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

const notify = () => window.dispatchEvent(new Event(EVENT));

export function subscribeToVideoLibrary(fn: () => void) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export async function getAllVideos(): Promise<VideoEntry[]> {
  const d = await openDb();
  const list = await wrap(d.transaction(META, "readonly").objectStore(META).getAll());
  return (list as VideoEntry[]).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
  const d = await openDb();
  const b = await wrap(d.transaction(BLOBS, "readonly").objectStore(BLOBS).get(id));
  return (b as Blob) ?? null;
}

export async function saveVideo(blob: Blob, meta: NewVideoMeta): Promise<VideoEntry> {
  const d = await openDb();
  const entry: VideoEntry = {
    id: `vid_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    title: meta.title?.trim() || "Untitled video",
    desc: meta.desc ?? "",
    tags: meta.tags ?? [],
    category: meta.category ?? "",
    visibility: meta.visibility ?? "public",
    duration: meta.duration ?? 0,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    size: blob.size,
    ext: meta.ext ?? "webm",
    createdAt: new Date().toISOString(),
    thumb: meta.thumb ?? null,
    favorite: false,
    plays: 0,
  };
  const tx = d.transaction([META, BLOBS], "readwrite");
  tx.objectStore(BLOBS).put(blob, entry.id);
  tx.objectStore(META).put(entry);
  await txDone(tx);
  notify();
  return entry;
}

export async function updateVideo(id: string, patch: Partial<VideoEntry>): Promise<void> {
  const d = await openDb();
  const store = d.transaction(META, "readwrite");
  const cur = (await wrap(store.objectStore(META).get(id))) as VideoEntry | undefined;
  if (!cur) return;
  store.objectStore(META).put({ ...cur, ...patch, id: cur.id });
  await txDone(store);
  notify();
}

export async function deleteVideos(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const d = await openDb();
  const tx = d.transaction([META, BLOBS], "readwrite");
  ids.forEach((id) => {
    tx.objectStore(META).delete(id);
    tx.objectStore(BLOBS).delete(id);
  });
  await txDone(tx);
  notify();
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    return { usage: e.usage ?? 0, quota: e.quota ?? 0, persisted };
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Reads duration, size and a thumbnail from a video file (used for imports). */
export function probeVideoFile(blob: Blob): Promise<{ width: number; height: number; duration: number; thumb: string | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    const finish = (thumb: string | null) => {
      const out = { width: v.videoWidth || 0, height: v.videoHeight || 0, duration: Number.isFinite(v.duration) ? v.duration : 0, thumb };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    v.onloadedmetadata = () => {
      if (!Number.isFinite(v.duration)) { v.currentTime = 1e6; return; }
      v.currentTime = Math.min(0.5, v.duration / 2);
    };
    v.onseeked = () => {
      try {
        const cv = document.createElement("canvas");
        const k = 360 / Math.max(1, v.videoHeight);
        cv.width = Math.max(1, Math.round(v.videoWidth * k));
        cv.height = 360;
        cv.getContext("2d")?.drawImage(v, 0, 0, cv.width, cv.height);
        finish(cv.toDataURL("image/jpeg", 0.75));
      } catch { finish(null); }
    };
    v.onerror = () => finish(null);
    v.src = url;
  });
}