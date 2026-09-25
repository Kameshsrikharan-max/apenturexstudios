import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  DeleteOutlined,
  BookOutlined,
  PictureOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  CaretRightOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  AudioMutedOutlined,
  CalendarOutlined,
  TagOutlined,
  StarOutlined,
  StarFilled,
  EditOutlined,
  CopyOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import {
  getSavedAlbums,
  deleteSavedAlbum,
  deleteSavedAlbums,
  subscribeToAlbumLibrary,
  getFavoriteIds,
  toggleFavorite,
  renameSavedAlbum,
  duplicateSavedAlbum,
  getLibraryStats,
  exportAlbumsAsJson,
  importAlbumsFromJsonText,
  beginEditAlbum,
  beginBlankAlbum,
  type SavedAlbumEntry,
  type LibrarySheetSnapshot,
  type LibraryTextSnapshot,
  type LibraryStats,
} from "../../../utils/albumLibraryStore"; // adjust path to your project structure
import { getLayout, rectStyle } from "./TemplateEditorPage"; // adjust path if this page lives elsewhere
import "./AlbumLibraryPage.css";

const CANVAS_W = 2540;
const CANVAS_H = 2032;
const FLIP_MS = 640;
const AUTOPLAY_GAP_MS = 2600;
const MAX_STACK_PAGES = 16;

type FlipDir = "forward" | "backward";
interface TurnState {
  from: number;
  to: number;
  dir: FlipDir;
  committing: boolean;
}
type ViewMode = "grid" | "list";
type SortMode = "newest" | "oldest" | "name" | "pages";

/* ---------- read-only page renderer ---------- */
function LibraryTextLayer({ el }: { el: LibraryTextSnapshot }) {
  return (
    <div
      className="alv-text-el"
      style={{
        top: `${el.yPct}%`,
        left: `${el.xPct}%`,
        width: `${el.wPct}%`,
        height: `${el.hPct}%`,
        transform: `rotate(${el.rotate}deg)`,
        color: el.color,
        fontFamily: el.fontFamily,
        fontWeight: el.bold ? 800 : 500,
        fontStyle: el.italic ? "italic" : "normal",
        textDecoration: el.underline ? "underline" : "none",
        textAlign: el.align,
        background: el.bg,
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
    <div
      className="alv-page-surface"
      style={{ background: sheet.bgImage ? `url(${sheet.bgImage}) center/cover` : sheet.bgColor }}
    >
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
            className={`alv-slot ${meta.style === "polaroid" ? "alv-slot-polaroid" : ""} ${
              meta.style === "collage" ? "alv-slot-collage" : ""
            }`}
            style={{
              ...rectStyle(rect, 6, meta.style === "polaroid" ? 2 : 10),
              transform,
              zIndex: slot.front ? 50 : rect.z ?? 1,
            }}
          >
            <div className="alv-slot-media">
              {slot.image ? (
                <img src={slot.image} alt={slot.fileName ?? "photo"} style={{ filter: slot.filter || "none" }} />
              ) : (
                <div className="alv-slot-empty">
                  <PictureOutlined />
                  <span>No photo</span>
                </div>
              )}
            </div>
            {meta.decorative === "timeline" ? <span className="alv-timeline-step">{i + 1}</span> : null}
            {meta.captions ? <div className="alv-slot-caption">{slot.caption}</div> : null}
          </div>
        );
      })}

      {sheet.textElements.map((el) => (
        <LibraryTextLayer key={el.id} el={el} />
      ))}

      {typeof pageNumber === "number" ? <span className="alv-leaf-page-num">{pageNumber}</span> : null}
    </div>
  );
}

/* ---------- the "go through the album" viewer ---------- */
function AlbumViewer({
  album,
  onClose,
  onEdit,
}: {
  album: SavedAlbumEntry;
  onClose: () => void;
  onEdit: (album: SavedAlbumEntry) => void;
}) {
  const sheets = album.sheets;
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

  const totalSpreads = sheets.length <= 1 ? 1 : 1 + Math.ceil((sheets.length - 1) / 2);
  const spreadLeft = (i: number): LibrarySheetSnapshot | undefined => (i === 0 ? undefined : sheets[1 + (i - 1) * 2]);
  const spreadRight = (i: number): LibrarySheetSnapshot | undefined =>
    i === 0 ? sheets[0] : sheets[1 + (i - 1) * 2 + 1];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      if (autoPlayTimerRef.current) window.clearTimeout(autoPlayTimerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

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
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const duration = 0.3;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.3);
      }
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
    } catch {
    }
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToPage("forward");
      else if (e.key === "ArrowLeft") goToPage("backward");
      else if (e.key === "Escape") onClose();
      else if (e.key === " ") {
        e.preventDefault();
        setAutoPlay((a) => !a);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewIndex, turn]);

  useEffect(() => {
    if (!autoPlay || turn) return;
    if (reviewIndex >= totalSpreads - 1) {
      setAutoPlay(false);
      return;
    }
    autoPlayTimerRef.current = window.setTimeout(() => goToPage("forward"), AUTOPLAY_GAP_MS);
    return () => {
      if (autoPlayTimerRef.current) {
        window.clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, reviewIndex, turn, totalSpreads]);

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

  const renderHardCover = () => {
    const cover = sheets[0];
    return (
      <div className="alv-hard-cover">
        <div className="alv-cover-board" />
        {renderLibraryPage(cover)}
        <div className="alv-cover-gloss" />
        <div className="alv-cover-spine" />
      </div>
    );
  };

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
    <div className="alv-overlay" onClick={onClose}>
      <div className="alv-shell" onClick={(e) => e.stopPropagation()}>
        <div className="alv-shell-head">
          <div className="alv-shell-title">
            <BookOutlined /> {album.templateName}
            <span className="alv-shell-subtitle">
              {album.eventName} · {album.serviceName} · v{album.versionNum}
            </span>
          </div>
          <div className="alv-shell-actions">
            <button className="alv-mini-btn" onClick={() => onEdit(album)} title="Edit this album">
              <EditOutlined /> Edit
            </button>
            <button
              className={`alv-mini-btn ${autoPlay ? "active" : ""}`}
              onClick={() => setAutoPlay((a) => !a)}
              disabled={reviewIndex >= totalSpreads - 1 && !autoPlay}
              title={autoPlay ? "Pause slideshow" : "Play as slideshow"}
            >
              {autoPlay ? <PauseCircleOutlined /> : <CaretRightOutlined />}
              {autoPlay ? "Pause" : "Play"}
            </button>
            <button
              className={`alv-mini-btn ${soundOn ? "active" : ""}`}
              onClick={() => setSoundOn((s) => !s)}
              title={soundOn ? "Mute page-turn sound" : "Enable page-turn sound"}
            >
              {soundOn ? <SoundOutlined /> : <AudioMutedOutlined />}
            </button>
            <button className="alv-icon-btn" onClick={onClose} aria-label="Close viewer">
              <CloseOutlined />
            </button>
          </div>
        </div>

        <div className="alv-book-stage">
          <button
            className="alv-nav alv-nav-left"
            onClick={() => {
              setAutoPlay(false);
              goToPage("backward");
            }}
            disabled={reviewIndex === 0 || !!turn}
            aria-label="Previous page"
          >
            <LeftOutlined />
          </button>

          <div
            className={`alv-book ${showingCover ? "alv-book-cover" : ""} ${
              turn && !turn.committing ? "is-dragging" : ""
            }`}
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
            {!showingCover ? (
              <>
                <div className="alv-stack alv-stack-left" style={{ ["--pages" as any]: turnedCount }} aria-hidden />
                <div className="alv-stack alv-stack-right" style={{ ["--pages" as any]: remainingCount }} aria-hidden />
              </>
            ) : null}

            {showingCover ? (
              renderHardCover()
            ) : (
              <div className="alv-spread" style={{ pointerEvents: turn ? "none" : "auto" }}>
                <div className="alv-leaf alv-leaf-left">{renderLibraryPage(visibleLeft, vFirstPageNum)}</div>
                <div className="alv-leaf alv-leaf-right">
                  {renderLibraryPage(visibleRight, visibleRight ? vLastPageNum : undefined)}
                </div>
              </div>
            )}

            {!showingCover ? <div className="alv-gutter" /> : null}
            {!showingCover ? (
              <div className="alv-bookmark" aria-hidden>
                <span>{progressPct}%</span>
              </div>
            ) : null}

            {turn ? (
              <div
                ref={turnRef}
                className={`alv-turn ${turn.dir === "forward" ? "turn-from-right" : "turn-from-left"}`}
                style={{ transformOrigin: turn.dir === "forward" ? "left center" : "right center" }}
              >
                <div className="alv-flip-face alv-flip-front">
                  {turn.from === 0
                    ? renderHardCover()
                    : turn.dir === "forward"
                    ? renderLibraryPage(spreadRight(turn.from))
                    : renderLibraryPage(spreadLeft(turn.from))}
                </div>
                <div className="alv-flip-face alv-flip-back">
                  {turn.to === 0
                    ? renderHardCover()
                    : turn.dir === "forward"
                    ? renderLibraryPage(spreadLeft(turn.to))
                    : renderLibraryPage(spreadRight(turn.to))}
                </div>
                <div ref={shadowRef} className="alv-flip-shadow" />
              </div>
            ) : null}

            <div className="alv-page-shine" />
          </div>

          <button
            className="alv-nav alv-nav-right"
            onClick={() => {
              setAutoPlay(false);
              goToPage("forward");
            }}
            disabled={reviewIndex === totalSpreads - 1 || !!turn}
            aria-label="Next page"
          >
            <RightOutlined />
          </button>
        </div>

        <div className="alv-shell-foot">
          <span className="alv-page-count">
            {reviewIndex === 0
              ? `Cover — Page 1 of ${sheets.length}`
              : firstPageNum === lastPageNum
              ? `Page ${firstPageNum} of ${sheets.length}`
              : `Pages ${firstPageNum}–${lastPageNum} of ${sheets.length}`}
            {" — "}
            {reviewIndex === 0 ? currentRight?.name : currentLeft?.name}
            {reviewIndex !== 0 && currentRight ? ` · ${currentRight.name}` : ""}
          </span>

          <div className="alv-filmstrip" role="tablist" aria-label="Jump to page">
            {Array.from({ length: totalSpreads }, (_, i) => {
              const left = spreadLeft(i);
              const right = spreadRight(i);
              return (
                <button
                  key={i}
                  className={`alv-film-thumb ${i === reviewIndex ? "active" : ""}`}
                  onClick={() => {
                    setAutoPlay(false);
                    jumpToPage(i);
                  }}
                  aria-label={i === 0 ? "Go to cover" : `Go to spread ${i}`}
                >
                  {i === 0 ? (
                    <span
                      className="alv-film-mini alv-film-mini-cover"
                      style={{ background: right?.bgImage ? `url(${right.bgImage}) center/cover` : right?.bgColor || "#4a2517" }}
                    />
                  ) : (
                    <>
                      <span
                        className="alv-film-mini"
                        style={{ background: left?.bgImage ? `url(${left.bgImage}) center/cover` : left?.bgColor || "#eef1f5" }}
                      />
                      <span
                        className="alv-film-mini"
                        style={{ background: right?.bgImage ? `url(${right.bgImage}) center/cover` : right?.bgColor || "#eef1f5" }}
                      />
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

/* ---------- main page ---------- */
export default function AlbumLibraryPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<SavedAlbumEntry[]>(() => getSavedAlbums());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set(getFavoriteIds()));
  const [stats, setStats] = useState<LibraryStats>(() => getLibraryStats());

  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [viewingAlbum, setViewingAlbum] = useState<SavedAlbumEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setAlbums(getSavedAlbums());
    setFavoriteIds(new Set(getFavoriteIds()));
    setStats(getLibraryStats());
  };

  useEffect(() => {
    return subscribeToAlbumLibrary(refresh);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const services = useMemo(() => {
    const set = new Set<string>();
    albums.forEach((a) => set.add(a.serviceName));
    return Array.from(set);
  }, [albums]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = albums.filter((a) => {
      const matchesService = serviceFilter === "all" || a.serviceName === serviceFilter;
      const matchesFav = !favoritesOnly || favoriteIds.has(a.id);
      const matchesSearch =
        !q ||
        a.templateName.toLowerCase().includes(q) ||
        a.eventName.toLowerCase().includes(q) ||
        a.serviceName.toLowerCase().includes(q);
      return matchesService && matchesFav && matchesSearch;
    });

    list = [...list].sort((a, b) => {
      switch (sortMode) {
        case "oldest":
          return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
        case "name":
          return a.templateName.localeCompare(b.templateName);
        case "pages":
          return (b.sheetCount || 0) - (a.sheetCount || 0);
        case "newest":
        default:
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      }
    });

    return list;
  }, [albums, search, serviceFilter, favoritesOnly, favoriteIds, sortMode]);

  /* ── single-item actions ── */
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Remove this saved album from the library? This can't be undone.")) return;
    deleteSavedAlbum(id);
    showToast("Album removed");
  };

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleFavorite(id);
  };

  const handleEdit = (album: SavedAlbumEntry) => {
    beginEditAlbum(album);
    navigate("/events/create/album/template-editor");
  };

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const copy = duplicateSavedAlbum(id);
    if (copy) showToast(`Duplicated as "${copy.templateName}"`);
  };

  const startRename = (e: React.MouseEvent, album: SavedAlbumEntry) => {
    e.stopPropagation();
    setRenamingId(album.id);
    setRenameDraft(album.templateName);
  };

  const commitRename = () => {
    if (renamingId) {
      renameSavedAlbum(renamingId, renameDraft);
    }
    setRenamingId(null);
  };

  const handleNewBlank = () => {
    beginBlankAlbum();
    navigate("/events/create/album/template-editor");
  };

  /* ── selection mode ── */
  const toggleSelectMode = () => {
    setSelectMode((m) => !m);
    setSelectedIds(new Set());
  };

  const toggleSelected = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCardClick = (album: SavedAlbumEntry) => {
    if (selectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(album.id)) next.delete(album.id);
        else next.add(album.id);
        return next;
      });
      return;
    }
    setViewingAlbum(album);
  };

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Remove ${selectedIds.size} selected album(s)? This can't be undone.`)) return;
    deleteSavedAlbums(Array.from(selectedIds));
    setSelectedIds(new Set());
    showToast("Selected albums removed");
  };

  const handleBulkExport = () => {
    if (!selectedIds.size) return;
    const selected = albums.filter((a) => selectedIds.has(a.id));
    exportAlbumsAsJson(selected, `axs-selected-albums-${Date.now()}.json`);
    showToast(`Exported ${selected.length} album(s)`);
  };

  /* ── export all / import ── */
  const handleExportAll = () => {
    if (!albums.length) return;
    exportAlbumsAsJson(albums);
    showToast(`Exported ${albums.length} album(s)`);
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const count = importAlbumsFromJsonText(String(reader.result || ""));
      showToast(count ? `Imported ${count} album(s)` : "Nothing to import — check the file");
    };
    reader.onerror = () => showToast("Could not read that file");
    reader.readAsText(file);
  };

  return (
    <main className="al-page">
      {toast && <div className="al-toast">{toast}</div>}

      <section className="al-stage">
        <header className="al-topbar">
          <button className="al-back" type="button" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> Back
          </button>
          <div className="al-title-wrap">
            <span className="al-title-icon">
              <BookOutlined />
            </span>
            <div>
              <p className="al-subtitle">Album Library</p>
              <h1 className="al-heading">Saved Albums</h1>
            </div>
          </div>
          <button className="al-new-btn" onClick={handleNewBlank} title="Start a brand new album">
            <PlusOutlined /> New Album
          </button>
        </header>

        <div className="al-body">
          {/* ── Stats bar ── */}
          <div className="al-stats-bar">
            <div className="al-stat">
              <span className="al-stat-val">{stats.totalAlbums}</span>
              <span className="al-stat-label">Albums</span>
            </div>
            <div className="al-stat">
              <span className="al-stat-val">{stats.totalPages}</span>
              <span className="al-stat-label">Total Pages</span>
            </div>
            <div className="al-stat">
              <span className="al-stat-val">{stats.totalServices}</span>
              <span className="al-stat-label">Services</span>
            </div>
            <div className="al-stat">
              <span className="al-stat-val">{stats.favorites}</span>
              <span className="al-stat-label">Favorites</span>
            </div>
            <div className="al-stat al-stat-storage">
              <div className="al-storage-head">
                <DatabaseOutlined />
                <span>{stats.storageKB} KB used</span>
              </div>
              <div className="al-storage-track">
                <div
                  className={`al-storage-fill ${stats.storagePct > 80 ? "warn" : ""}`}
                  style={{ width: `${stats.storagePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="al-toolbar">
            <div className="al-toolbar-left">
              <div className="al-search">
                <SearchOutlined />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by album, event, or service…"
                />
              </div>
              <div className="al-filter-chips">
                <button className={`al-chip ${serviceFilter === "all" ? "active" : ""}`} onClick={() => setServiceFilter("all")}>
                  All
                </button>
                {services.map((s) => (
                  <button key={s} className={`al-chip ${serviceFilter === s ? "active" : ""}`} onClick={() => setServiceFilter(s)}>
                    {s}
                  </button>
                ))}
                <button
                  className={`al-chip al-chip-fav ${favoritesOnly ? "active" : ""}`}
                  onClick={() => setFavoritesOnly((f) => !f)}
                >
                  <StarFilled /> Favorites
                </button>
              </div>
            </div>

            <div className="al-toolbar-right">
              <select className="al-sort-select" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A–Z)</option>
                <option value="pages">Most pages</option>
              </select>

              <div className="al-view-toggle">
                <button
                  className={viewMode === "grid" ? "active" : ""}
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                >
                  <AppstoreOutlined />
                </button>
                <button
                  className={viewMode === "list" ? "active" : ""}
                  onClick={() => setViewMode("list")}
                  title="List view"
                >
                  <UnorderedListOutlined />
                </button>
              </div>

              <button className={`al-tool-btn ${selectMode ? "active" : ""}`} onClick={toggleSelectMode} title="Select multiple">
                <CheckSquareOutlined /> Select
              </button>

              <button className="al-tool-btn" onClick={handleImportClick} title="Import a library backup">
                <ImportOutlined /> Import
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />

              <button className="al-tool-btn" onClick={handleExportAll} disabled={!albums.length} title="Export entire library">
                <ExportOutlined /> Export All
              </button>
            </div>
          </div>

          {/* ── Bulk action bar ── */}
          {selectMode && (
            <div className="al-bulk-bar">
              <span>{selectedIds.size} selected</span>
              <div className="al-bulk-actions">
                <button className="al-tool-btn" onClick={handleBulkExport} disabled={!selectedIds.size}>
                  <ExportOutlined /> Export Selected
                </button>
                <button className="al-tool-btn danger" onClick={handleBulkDelete} disabled={!selectedIds.size}>
                  <DeleteOutlined /> Delete Selected
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="al-empty">
              <BookOutlined className="al-empty-icon" />
              <strong>{albums.length === 0 ? "No albums saved yet" : "No albums match your filters"}</strong>
              <p>
                {albums.length === 0
                  ? "Save an album from the Template Editor, or start a new one right here."
                  : "Try a different search term, filter, or clear Favorites-only."}
              </p>
              {albums.length === 0 && (
                <button className="al-new-btn" onClick={handleNewBlank}>
                  <PlusOutlined /> Start a New Album
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === "grid" ? "al-grid" : "al-list"}>
              {filtered.map((a) => {
                const fav = favoriteIds.has(a.id);
                const selected = selectedIds.has(a.id);
                const isRenaming = renamingId === a.id;

                return (
                  <div
                    key={a.id}
                    className={`al-card ${viewMode === "list" ? "al-card-list" : ""} ${selected ? "selected" : ""}`}
                    onClick={() => handleCardClick(a)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="al-card-cover">
                      {a.coverImage ? (
                        <img src={a.coverImage} alt={a.templateName} />
                      ) : (
                        <div className="al-card-cover-empty">
                          <PictureOutlined />
                        </div>
                      )}
                      <span className="al-card-version">v{a.versionNum}</span>

                      {selectMode ? (
                        <button
                          className={`al-card-select ${selected ? "checked" : ""}`}
                          onClick={(e) => toggleSelected(e, a.id)}
                          aria-label="Select album"
                        >
                          {selected ? <CheckSquareOutlined /> : null}
                        </button>
                      ) : (
                        <>
                          <button
                            className={`al-card-fav ${fav ? "active" : ""}`}
                            onClick={(e) => handleToggleFavorite(e, a.id)}
                            aria-label="Toggle favorite"
                          >
                            {fav ? <StarFilled /> : <StarOutlined />}
                          </button>
                          <button className="al-card-delete" onClick={(e) => handleDelete(e, a.id)} aria-label="Delete saved album">
                            <DeleteOutlined />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="al-card-body">
                      {isRenaming ? (
                        <input
                          className="al-card-rename-input"
                          value={renameDraft}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                        />
                      ) : (
                        <div
                          className="al-card-name"
                          onDoubleClick={(e) => startRename(e, a)}
                          title="Double-click to rename"
                        >
                          {a.templateName}
                        </div>
                      )}

                      <div className="al-card-meta">
                        <span>
                          <TagOutlined /> {a.serviceName}
                        </span>
                        <span>
                          <CalendarOutlined /> {new Date(a.savedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="al-card-event">{a.eventName}</div>
                      <div className="al-card-sheets">{a.sheetCount} pages</div>

                      {!selectMode && (
                        <div className="al-card-actions">
                          <button
                            className="al-card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(a);
                            }}
                          >
                            <EditOutlined /> Edit
                          </button>
                          <button className="al-card-action-btn" onClick={(e) => handleDuplicate(e, a.id)}>
                            <CopyOutlined /> Duplicate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {viewingAlbum ? (
        <AlbumViewer
          album={viewingAlbum}
          onClose={() => setViewingAlbum(null)}
          onEdit={(album) => {
            setViewingAlbum(null);
            handleEdit(album);
          }}
        />
      ) : null}
    </main>
  );
}