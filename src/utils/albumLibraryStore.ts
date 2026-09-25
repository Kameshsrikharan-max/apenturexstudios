// Shared localStorage-backed "Album Library" — every album version explicitly
// saved from the Template Editor gets an entry here, so it can be browsed,
// edited, duplicated, favorited, exported and re-imported later, regardless
// of which event/service it came from. Mirrors the axsTransactions /
// notificationStore localStorage pattern used elsewhere.

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
}

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
}

export interface LibrarySheetSnapshot {
  id: string;
  name: string;
  layout: string;
  slots: LibrarySlotSnapshot[];
  bgColor: string;
  bgImage: string | null;
  title?: string;
  subtitle?: string;
  textElements: LibraryTextSnapshot[];
}

export interface SavedAlbumEntry {
  id: string; // `${eventId}_${templateId}_v${versionNum}` — unique per saved version
  templateId: number;
  templateName: string;
  serviceName: string;
  eventId: string | null;
  eventName: string;
  versionNum: number;
  canvasSize: string;
  sheetCount: number;
  coverImage: string | null;
  savedAt: string;
  sheets: LibrarySheetSnapshot[];
}

export interface LibraryStats {
  totalAlbums: number;
  totalPages: number;
  totalServices: number;
  favorites: number;
  storageKB: number;
  storagePct: number; // rough gauge against an assumed 5MB localStorage budget
}

const STORAGE_KEY = "axsSavedAlbums";
const FAVORITES_KEY = "axsAlbumFavorites";
const EVENT_NAME = "axs:album-library-updated";
const ESTIMATED_STORAGE_LIMIT_KB = 5000; // typical browser localStorage quota is ~5MB

/* ---------- core read/write ---------- */

function readAll(): SavedAlbumEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: SavedAlbumEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch (e) {
    console.warn("albumLibraryStore: could not persist", e);
  }
}

export function getSavedAlbums(): SavedAlbumEntry[] {
  return readAll().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function upsertSavedAlbum(entry: SavedAlbumEntry) {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === entry.id);
  if (idx === -1) all.push(entry);
  else all[idx] = entry;
  writeAll(all);
}

export function deleteSavedAlbum(id: string) {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function deleteSavedAlbums(ids: string[]) {
  const idSet = new Set(ids);
  writeAll(readAll().filter((e) => !idSet.has(e.id)));
}

/** Call cb() whenever the library OR favorites change — in this tab or another. Returns an unsubscribe fn. */
export function subscribeToAlbumLibrary(cb: () => void) {
  window.addEventListener(EVENT_NAME, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT_NAME, cb);
    window.removeEventListener("storage", cb);
  };
}

/* ---------- favorites ---------- */

function readFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch (e) {
    console.warn("albumLibraryStore: could not persist favorites", e);
  }
}

export function getFavoriteIds(): string[] {
  return readFavoriteIds();
}

export function isFavorite(id: string): boolean {
  return readFavoriteIds().includes(id);
}

export function toggleFavorite(id: string) {
  const ids = readFavoriteIds();
  const idx = ids.indexOf(id);
  if (idx === -1) ids.push(id);
  else ids.splice(idx, 1);
  writeFavoriteIds(ids);
}

/* ---------- rename / duplicate ---------- */

export function renameSavedAlbum(id: string, newName: string) {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const trimmed = newName.trim();
  if (!trimmed) return;
  all[idx] = { ...all[idx], templateName: trimmed };
  writeAll(all);
}

export function duplicateSavedAlbum(id: string): SavedAlbumEntry | null {
  const all = readAll();
  const source = all.find((e) => e.id === id);
  if (!source) return null;
  const copy: SavedAlbumEntry = {
    ...source,
    id: `${source.id}_copy${Date.now().toString(36)}`,
    templateName: `${source.templateName} (Copy)`,
    savedAt: new Date().toISOString(),
    sheets: JSON.parse(JSON.stringify(source.sheets)),
  };
  all.push(copy);
  writeAll(all);
  return copy;
}

/* ---------- stats ---------- */

export function getLibraryStats(): LibraryStats {
  const all = readAll();
  const totalPages = all.reduce((sum, a) => sum + (a.sheetCount || a.sheets.length || 0), 0);
  const services = new Set(all.map((a) => a.serviceName));
  const favIds = readFavoriteIds();

  let storageKB = 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "";
    // Rough UTF-16 byte estimate — good enough for a usage gauge, not billing.
    storageKB = Math.round((raw.length * 2) / 1024);
  } catch {
    storageKB = 0;
  }

  return {
    totalAlbums: all.length,
    totalPages,
    totalServices: services.size,
    favorites: favIds.length,
    storageKB,
    storagePct: Math.min(100, Math.round((storageKB / ESTIMATED_STORAGE_LIMIT_KB) * 100)),
  };
}

/* ---------- export / import (backup & restore) ---------- */

export function exportAlbumsAsJson(
  entries: SavedAlbumEntry[],
  filename = `axs-album-library-${new Date().toISOString().slice(0, 10)}.json`
) {
  try {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.warn("albumLibraryStore: could not export albums", e);
  }
}

/** Returns the number of albums actually imported. Ids that already exist
 *  in this library are imported as a fresh copy instead of silently
 *  overwriting whatever's already saved locally. */
export function importAlbumsFromJsonText(jsonText: string): number {
  try {
    const parsed = JSON.parse(jsonText);
    const list: SavedAlbumEntry[] = Array.isArray(parsed) ? parsed : [parsed];
    const all = readAll();
    const existingIds = new Set(all.map((e) => e.id));
    let importedCount = 0;

    list.forEach((entry) => {
      if (!entry || !entry.id || !Array.isArray(entry.sheets)) return;
      const safeEntry: SavedAlbumEntry = existingIds.has(entry.id)
        ? { ...entry, id: `${entry.id}_import${Date.now().toString(36)}${importedCount}` }
        : entry;
      all.push(safeEntry);
      existingIds.add(safeEntry.id);
      importedCount++;
    });

    if (importedCount) writeAll(all);
    return importedCount;
  } catch (e) {
    console.warn("albumLibraryStore: could not import albums", e);
    return 0;
  }
}

/* ---------- hand-off to the Template Editor for real editing ---------- */

/** Loads a saved album's actual sheets back into the Template Editor so the
 *  user can keep working on it, instead of only viewing it read-only.
 *  TemplateEditorPage checks for `currentTemplateEditorSheets` on mount and
 *  consumes it once. */
export function beginEditAlbum(entry: SavedAlbumEntry) {
  try {
    const ctx = {
      templateId: entry.templateId,
      templateName: entry.templateName,
      sheetsCount: entry.sheets.length || entry.sheetCount || 1,
      canvasSize: entry.canvasSize,
      photosRequired: 0,
      versionNum: entry.versionNum,
      isLatest: true,
      status: "Draft",
      eventId: entry.eventId,
      serviceName: entry.serviceName,
      eventName: entry.eventName,
    };
    sessionStorage.setItem("currentTemplateEditor", JSON.stringify(ctx));
    sessionStorage.setItem("currentTemplateEditorSheets", JSON.stringify(entry.sheets));
  } catch (e) {
    console.warn("albumLibraryStore: could not begin edit session", e);
  }
}

/** Starts a brand-new album directly from the library — no event required. */
export function beginBlankAlbum() {
  try {
    sessionStorage.removeItem("currentTemplateEditorSheets");
    sessionStorage.setItem(
      "currentTemplateEditor",
      JSON.stringify({
        templateId: Date.now(),
        templateName: "Untitled Album",
        sheetsCount: 14,
        canvasSize: "10x8",
        photosRequired: 0,
        versionNum: 1,
        isLatest: true,
        status: "Draft",
        eventId: null,
        serviceName: "Custom",
        eventName: "Untitled Album",
      })
    );
  } catch (e) {
    console.warn("albumLibraryStore: could not start blank album", e);
  }
}