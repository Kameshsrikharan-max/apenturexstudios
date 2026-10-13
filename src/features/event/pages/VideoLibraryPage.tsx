import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined, SearchOutlined, DeleteOutlined, VideoCameraOutlined, PlusOutlined, StarOutlined, StarFilled,
  DownloadOutlined, EditOutlined, CloseOutlined, CaretRightOutlined, AppstoreOutlined, UnorderedListOutlined,
  CheckSquareOutlined, UploadOutlined, CopyOutlined, HddOutlined, ClockCircleOutlined, TagOutlined, CheckOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  getAllVideos, getVideoBlob, saveVideo, updateVideo, deleteVideos, subscribeToVideoLibrary, getStorageEstimate,
  requestPersistentStorage, probeVideoFile, type VideoEntry,
} from "../../../utils/videoLibraryStore";
import "./VideoLibraryPage.css";

const EDITOR_PATH = "/video-editor";
const PREFS_KEY = "axs.videoLibrary.prefs.v1";
const CATEGORIES = ["Film & Animation", "Music", "Travel & Events", "People & Blogs", "Education", "Entertainment", "Howto & Style", "Sports", "Gaming", "News & Politics"];

type SortMode = "newest" | "oldest" | "name" | "longest" | "largest" | "played";
type ViewMode = "grid" | "list";
type Collection = "all" | "favorites" | "public" | "unlisted" | "private";

const fmtDur = (s: number) => {
  if (!s || !Number.isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};
const fmtBytes = (n: number) => {
  if (!n || n < 0) return "0 KB";
  if (n < 1048576) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
};
const relTime = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};
const safeName = (s: string) => (s || "video").replace(/[^\w\-]+/g, "_");
const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export default function VideoLibraryPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<{ view: ViewMode; sort: SortMode }>(() => {
    try { return { view: "grid", sort: "newest", ...(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")) }; } catch { return { view: "grid", sort: "newest" }; }
  });
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState<Collection>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState<{ entry: VideoEntry; url: string } | null>(null);
  const [editing, setEditing] = useState<VideoEntry | null>(null);
  const [draft, setDraft] = useState({ title: "", desc: "", tags: "", category: CATEGORIES[0], visibility: "public" });
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [est, setEst] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const showToast = (m: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(m);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const refresh = useCallback(async () => {
    try { setVideos(await getAllVideos()); } catch { showToast("Could not open the video library"); }
    setReady(true);
    getStorageEstimate().then(setEst).catch(() => {});
  }, []);

  useEffect(() => { void refresh(); return subscribeToVideoLibrary(() => void refresh()); }, [refresh]);
  useEffect(() => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } }, [prefs]);
  useEffect(() => () => { if (playingRef.current) URL.revokeObjectURL(playingRef.current.url); if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  /* ── derived ── */
  const totals = useMemo(() => ({
    count: videos.length,
    duration: videos.reduce((a, v) => a + v.duration, 0),
    size: videos.reduce((a, v) => a + v.size, 0),
    favorites: videos.filter((v) => v.favorite).length,
  }), [videos]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    videos.forEach((v) => v.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [videos]);

  const counts: Record<Collection, number> = useMemo(() => ({
    all: videos.length,
    favorites: videos.filter((v) => v.favorite).length,
    public: videos.filter((v) => v.visibility === "public").length,
    unlisted: videos.filter((v) => v.visibility === "unlisted").length,
    private: videos.filter((v) => v.visibility === "private").length,
  }), [videos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = videos.filter((v) => {
      if (collection === "favorites" && !v.favorite) return false;
      if ((collection === "public" || collection === "unlisted" || collection === "private") && v.visibility !== collection) return false;
      if (tagFilter && !v.tags.includes(tagFilter)) return false;
      if (q && !`${v.title} ${v.desc} ${v.category} ${v.tags.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const t = (s: string) => new Date(s).getTime();
    return [...list].sort((a, b) => {
      switch (prefs.sort) {
        case "oldest": return t(a.createdAt) - t(b.createdAt);
        case "name": return a.title.localeCompare(b.title);
        case "longest": return b.duration - a.duration;
        case "largest": return b.size - a.size;
        case "played": return b.plays - a.plays || t(b.createdAt) - t(a.createdAt);
        default: return t(b.createdAt) - t(a.createdAt);
      }
    });
  }, [videos, search, collection, tagFilter, prefs.sort]);

  const isFiltering = !!search.trim() || collection !== "all" || !!tagFilter;
  const storagePct = est && est.quota ? Math.min(100, Math.round((est.usage / est.quota) * 100)) : 0;

  /* ── actions ── */
  const openPlayer = async (v: VideoEntry) => {
    const blob = await getVideoBlob(v.id);
    if (!blob) { showToast("Video file is missing"); return; }
    if (playingRef.current) URL.revokeObjectURL(playingRef.current.url);
    setPlaying({ entry: v, url: URL.createObjectURL(blob) });
    void updateVideo(v.id, { plays: v.plays + 1 });
  };
  const closePlayer = () => {
    if (playing) URL.revokeObjectURL(playing.url);
    setPlaying(null);
  };
  const download = async (v: VideoEntry) => {
    const blob = await getVideoBlob(v.id);
    if (!blob) { showToast("Video file is missing"); return; }
    downloadBlob(blob, `${safeName(v.title)}.${v.ext}`);
    showToast("Download started");
  };
  const remove = async (list: VideoEntry[]) => {
    if (!list.length) return;
    const msg = list.length === 1 ? `Delete “${list[0].title}”? This cannot be undone.` : `Delete ${list.length} videos? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    if (playing && list.some((v) => v.id === playing.entry.id)) closePlayer();
    await deleteVideos(list.map((v) => v.id));
    setSelected(new Set());
    showToast(list.length === 1 ? "Video deleted" : `${list.length} videos deleted`);
  };
  const toggleFav = (v: VideoEntry) => {
    void updateVideo(v.id, { favorite: !v.favorite });
    if (playing && playing.entry.id === v.id) setPlaying({ ...playing, entry: { ...playing.entry, favorite: !v.favorite } });
  };
  const startEdit = (v: VideoEntry) => {
    setEditing(v);
    setDraft({ title: v.title, desc: v.desc, tags: v.tags.join(", "), category: v.category || CATEGORIES[0], visibility: v.visibility });
  };
  const saveEdit = async () => {
    if (!editing) return;
    const tags = Array.from(new Set(draft.tags.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean)));
    await updateVideo(editing.id, { title: draft.title.trim() || "Untitled video", desc: draft.desc, tags, category: draft.category, visibility: draft.visibility });
    if (playing && playing.entry.id === editing.id) {
      setPlaying({ ...playing, entry: { ...playing.entry, title: draft.title.trim() || "Untitled video", desc: draft.desc, tags, category: draft.category, visibility: draft.visibility } });
    }
    setEditing(null);
    showToast("Details saved");
  };
  const copyDetails = (v: VideoEntry) => {
    const text = `${v.title}\n\n${v.desc}\n\nTags: ${v.tags.join(", ")}\nCategory: ${v.category}\nVisibility: ${v.visibility}\n`;
    navigator.clipboard?.writeText(text).then(() => showToast("Details copied")).catch(() => showToast("Could not copy"));
  };
  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let n = 0;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("video/")) continue;
      try {
        const info = await probeVideoFile(f);
        const ext = (f.name.split(".").pop() || "mp4").toLowerCase();
        await saveVideo(f, { title: f.name.replace(/\.[^.]+$/, ""), duration: info.duration, width: info.width, height: info.height, thumb: info.thumb, ext });
        n++;
      } catch { showToast(`Could not import ${f.name}`); }
    }
    setBusy(false);
    if (n) showToast(`Imported ${n} video${n > 1 ? "s" : ""}`);
  };
  const toggleSelect = (id: string) =>
    setSelected((p) => { const s = new Set(p); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  const toggleSelectMode = () => { setSelectMode((m) => !m); setSelected(new Set()); };
  const clearFilters = () => { setSearch(""); setCollection("all"); setTagFilter(null); };
  const persist = async () => {
    const ok = await requestPersistentStorage();
    getStorageEstimate().then(setEst).catch(() => {});
    showToast(ok ? "Library protected from browser cleanup" : "Browser declined the request");
  };
  const onCardClick = (v: VideoEntry, e: React.MouseEvent) => {
    if (selectMode || e.shiftKey || e.ctrlKey || e.metaKey) {
      if (!selectMode) setSelectMode(true);
      toggleSelect(v.id);
      return;
    }
    void openPlayer(v);
  };

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = /^(input|textarea|select)$/i.test(t.tagName);
      if (e.key === "Escape") {
        if (editing) setEditing(null);
        else if (playing) closePlayer();
        else if (selectMode) toggleSelectMode();
        return;
      }
      if (typing || playing || editing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key.toLowerCase() === "n") navigate(EDITOR_PATH);
      else if (e.key.toLowerCase() === "s") toggleSelectMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, playing, selectMode]);

  const COLLECTIONS: { id: Collection; label: string }[] = [
    { id: "all", label: "All" }, { id: "favorites", label: "Favorites" }, { id: "public", label: "Public" },
    { id: "unlisted", label: "Unlisted" }, { id: "private", label: "Private" },
  ];

  const renderCard = (v: VideoEntry) => {
    const sel = selected.has(v.id);
    return (
      <article
        key={v.id}
        className={`vl-card ${prefs.view === "list" ? "vl-card-list" : ""} ${sel ? "selected" : ""}`}
        onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; onCardClick(v, e); }}
      >
        <div className="vl-card-cover">
          {v.thumb ? <img src={v.thumb} alt="" loading="lazy" /> : <div className="vl-card-empty"><VideoCameraOutlined /></div>}
          <span className="vl-play"><CaretRightOutlined /></span>
          <span className="vl-dur">{fmtDur(v.duration)}</span>
          {v.visibility !== "public" && <span className="vl-vis">{v.visibility}</span>}
          {selectMode ? (
            <button className={`vl-select ${sel ? "checked" : ""}`} onClick={() => toggleSelect(v.id)} aria-pressed={sel} aria-label={`Select ${v.title}`}>{sel ? <CheckOutlined /> : null}</button>
          ) : (
            <>
              <button className={`vl-fav ${v.favorite ? "active" : ""}`} onClick={() => toggleFav(v)} aria-pressed={v.favorite} aria-label="Favorite">{v.favorite ? <StarFilled /> : <StarOutlined />}</button>
              <button className="vl-del" onClick={() => void remove([v])} aria-label={`Delete ${v.title}`}><DeleteOutlined /></button>
            </>
          )}
        </div>
        <div className="vl-card-body">
          <button className="vl-card-name" onClick={() => void openPlayer(v)} title={v.title}>{v.title}</button>
          <div className="vl-card-meta">
            <span><ClockCircleOutlined /> {relTime(v.createdAt)}</span>
            <span>{v.width && v.height ? `${v.width}×${v.height}` : "—"}</span>
            <span>{fmtBytes(v.size)} · {v.ext.toUpperCase()}</span>
          </div>
          {v.tags.length > 0 && (
            <ul className="vl-card-tags">
              {v.tags.slice(0, 3).map((t) => <li key={t}>#{t}</li>)}
              {v.tags.length > 3 && <li className="more">+{v.tags.length - 3}</li>}
            </ul>
          )}
          {!selectMode && (
            <div className="vl-card-actions">
              <button onClick={() => startEdit(v)}><EditOutlined /> Details</button>
              <button onClick={() => void download(v)}><DownloadOutlined /> Download</button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="vl-page">
      {toast && <div className="vl-toast" role="status"><CheckOutlined /> {toast}</div>}
      <input ref={importRef} type="file" accept="video/*" multiple hidden onChange={(e) => { void importFiles(e.target.files); e.target.value = ""; }} />

      <section className="vl-stage">
        <header className="vl-topbar">
          <button className="vl-back" onClick={() => navigate(-1)}><ArrowLeftOutlined /> Back</button>
          <div className="vl-title-wrap">
            <span className="vl-title-icon"><VideoCameraOutlined /></span>
            <div>
              <p className="vl-subtitle">Video Library</p>
              <h1 className="vl-heading">Saved Videos</h1>
            </div>
          </div>
          <button className="vl-tool-btn push" onClick={() => importRef.current?.click()} disabled={busy}><UploadOutlined /> {busy ? "Importing…" : "Import video"}</button>
          <button className="vl-new-btn" onClick={() => navigate(EDITOR_PATH)}><PlusOutlined /> New Video</button>
        </header>

        <div className="vl-body">
          <section className="vl-stats" aria-label="Library statistics">
            <div className="vl-stat"><span className="vl-stat-val">{totals.count}</span><span className="vl-stat-label">Videos</span></div>
            <div className="vl-stat"><span className="vl-stat-val">{fmtDur(totals.duration)}</span><span className="vl-stat-label">Total length</span></div>
            <div className="vl-stat"><span className="vl-stat-val">{fmtBytes(totals.size)}</span><span className="vl-stat-label">Library size</span></div>
            <div className="vl-stat"><span className="vl-stat-val">{totals.favorites}</span><span className="vl-stat-label">Favorites</span></div>
            <div className="vl-stat vl-stat-storage">
              <div className="vl-storage-head"><HddOutlined /><span>{est ? `${fmtBytes(est.usage)} of ${fmtBytes(est.quota)}` : fmtBytes(totals.size)}</span></div>
              <div className="vl-track"><div className={`vl-fill ${storagePct > 80 ? "warn" : ""}`} style={{ width: `${Math.max(storagePct, totals.size ? 1 : 0)}%` }} /></div>
              {est && !est.persisted && (
                <button className="vl-link" onClick={() => void persist()}><SafetyCertificateOutlined /> Protect my videos from browser cleanup</button>
              )}
            </div>
          </section>

          <div className="vl-toolbar">
            <div className="vl-search">
              <SearchOutlined />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, tags, description…  ( / )" aria-label="Search videos" />
              {search && <button className="vl-search-clear" onClick={() => setSearch("")} aria-label="Clear search"><CloseOutlined /></button>}
            </div>
            <div className="vl-toolbar-right">
              <select className="vl-select-box" value={prefs.sort} onChange={(e) => setPrefs((p) => ({ ...p, sort: e.target.value as SortMode }))} aria-label="Sort videos">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A–Z)</option>
                <option value="longest">Longest</option>
                <option value="largest">Largest file</option>
                <option value="played">Most played</option>
              </select>
              <div className="vl-view-toggle" role="group" aria-label="View mode">
                <button className={prefs.view === "grid" ? "active" : ""} onClick={() => setPrefs((p) => ({ ...p, view: "grid" }))} aria-label="Grid view" title="Grid view"><AppstoreOutlined /></button>
                <button className={prefs.view === "list" ? "active" : ""} onClick={() => setPrefs((p) => ({ ...p, view: "list" }))} aria-label="List view" title="List view"><UnorderedListOutlined /></button>
              </div>
              <button className={`vl-tool-btn ${selectMode ? "active" : ""}`} onClick={toggleSelectMode} aria-pressed={selectMode}><CheckSquareOutlined /> Select</button>
            </div>
          </div>

          <div className="vl-tabs" role="tablist" aria-label="Collections">
            {COLLECTIONS.map((c) => (
              <button key={c.id} role="tab" aria-selected={collection === c.id} className={`vl-tab ${collection === c.id ? "active" : ""}`} onClick={() => setCollection(c.id)}>
                {c.label}<span className="vl-count">{counts[c.id]}</span>
              </button>
            ))}
          </div>

          {allTags.length > 0 && (
            <div className="vl-chips" aria-label="Tags">
              {allTags.map(([t, c]) => (
                <button key={t} className={`vl-chip ${tagFilter === t ? "active" : ""}`} aria-pressed={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? null : t)}>
                  <TagOutlined /> #{t}<span className="vl-count">{c}</span>
                </button>
              ))}
            </div>
          )}

          {selectMode && (
            <div className="vl-bulk" role="region" aria-label="Bulk actions">
              <span aria-live="polite">{selected.size} selected</span>
              <div className="vl-bulk-actions">
                <button className="vl-tool-btn" onClick={() => setSelected(new Set(filtered.map((v) => v.id)))}>Select all ({filtered.length})</button>
                <button className="vl-tool-btn" disabled={!selected.size} onClick={() => { selected.forEach((id) => { const v = videos.find((x) => x.id === id); if (v && !v.favorite) void updateVideo(id, { favorite: true }); }); showToast("Added to favorites"); }}><StarOutlined /> Favorite</button>
                <button className="vl-tool-btn danger" disabled={!selected.size} onClick={() => void remove(videos.filter((v) => selected.has(v.id)))}><DeleteOutlined /> Delete</button>
              </div>
            </div>
          )}

          {!ready ? (
            <div className="vl-empty" role="status"><span className="vl-spinner" aria-hidden /><strong>Opening your library…</strong></div>
          ) : filtered.length === 0 ? (
            <div className="vl-empty">
              <VideoCameraOutlined className="vl-empty-icon" />
              <strong>{videos.length === 0 ? "No videos saved yet" : "No videos match"}</strong>
              <p>{videos.length === 0 ? "Export a video from the Video Editor and it is saved here automatically. You can also import an existing video." : "Loosen the search or clear the filters."}</p>
              {videos.length === 0 ? (
                <button className="vl-new-btn" onClick={() => navigate(EDITOR_PATH)}><PlusOutlined /> Open Video Editor</button>
              ) : isFiltering ? (
                <button className="vl-tool-btn" onClick={clearFilters}>Clear filters</button>
              ) : null}
            </div>
          ) : (
            <div className={prefs.view === "grid" ? "vl-grid" : "vl-list"}>{filtered.map(renderCard)}</div>
          )}
        </div>
      </section>

      {playing && (
        <div className="vl-modal" role="dialog" aria-modal="true" aria-label={`Player: ${playing.entry.title}`} onClick={closePlayer}>
          <div className="vl-player" onClick={(e) => e.stopPropagation()}>
            <div className="vl-player-head">
              <strong>{playing.entry.title}</strong>
              <button className="vl-icon-btn" onClick={closePlayer} aria-label="Close player"><CloseOutlined /></button>
            </div>
            <video className="vl-video" src={playing.url} controls autoPlay playsInline />
            <div className="vl-player-info">
              <div className="vl-player-meta">
                <span>{fmtDur(playing.entry.duration)}</span>
                <span>{playing.entry.width && playing.entry.height ? `${playing.entry.width}×${playing.entry.height}` : "—"}</span>
                <span>{fmtBytes(playing.entry.size)} · {playing.entry.ext.toUpperCase()}</span>
                <span>{playing.entry.visibility}</span>
                <span>Saved {relTime(playing.entry.createdAt)}</span>
              </div>
              {playing.entry.desc && <p className="vl-player-desc">{playing.entry.desc}</p>}
              {playing.entry.tags.length > 0 && (
                <ul className="vl-card-tags">{playing.entry.tags.map((t) => <li key={t}>#{t}</li>)}</ul>
              )}
              <div className="vl-player-actions">
                <button className="vl-tool-btn active" onClick={() => void download(playing.entry)}><DownloadOutlined /> Download</button>
                <button className="vl-tool-btn" onClick={() => startEdit(playing.entry)}><EditOutlined /> Edit details</button>
                <button className="vl-tool-btn" onClick={() => copyDetails(playing.entry)}><CopyOutlined /> Copy details</button>
                <button className="vl-tool-btn" onClick={() => toggleFav(playing.entry)}>{playing.entry.favorite ? <StarFilled /> : <StarOutlined />} {playing.entry.favorite ? "Favorited" : "Favorite"}</button>
                <button className="vl-tool-btn danger" onClick={() => void remove([playing.entry])}><DeleteOutlined /> Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="vl-modal vl-modal-top" role="dialog" aria-modal="true" aria-label="Edit video details" onClick={() => setEditing(null)}>
          <div className="vl-edit" onClick={(e) => e.stopPropagation()}>
            <div className="vl-player-head">
              <strong>Edit details</strong>
              <button className="vl-icon-btn" onClick={() => setEditing(null)} aria-label="Close"><CloseOutlined /></button>
            </div>
            <div className="vl-edit-body">
              <label>Title<input className="vl-input" maxLength={100} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus /></label>
              <label>Description<textarea className="vl-input" rows={5} maxLength={5000} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} /></label>
              <label>Tags (comma separated)<input className="vl-input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} /></label>
              <label>Category
                <select className="vl-input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <div className="vl-vis-row" role="radiogroup" aria-label="Visibility">
                {["public", "unlisted", "private"].map((v) => (
                  <button key={v} role="radio" aria-checked={draft.visibility === v} className={`vl-chip ${draft.visibility === v ? "active" : ""}`} onClick={() => setDraft({ ...draft, visibility: v })}>{v}</button>
                ))}
              </div>
            </div>
            <div className="vl-edit-foot">
              <button className="vl-tool-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="vl-new-btn" onClick={() => void saveEdit()}><CheckOutlined /> Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}