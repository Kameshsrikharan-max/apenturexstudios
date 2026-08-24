import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {CheckCircleOutlined,ClockCircleOutlined,DollarOutlined,DoubleLeftOutlined,CameraOutlined,PictureOutlined,PlusOutlined,TeamOutlined,ReloadOutlined,ArrowRightOutlined,ArrowLeftOutlined,UploadOutlined,CloseOutlined,FileImageOutlined,FolderOpenOutlined,SendOutlined,FlagOutlined,InfoCircleOutlined,CalendarOutlined,DeleteOutlined,LeftOutlined,RightOutlined,InboxOutlined,} from "@ant-design/icons";
import "./AlbumSelectionPage.css";
import { notifyAlbumCreated } from "../../../components/UI/notificationTriggers"; // adjust path to your project structure

const STEPS = [
  { label: "Event Details", icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment", icon: <DollarOutlined /> },
  { label: "Attendance", icon: <ClockCircleOutlined /> },
  { label: "Media", icon: <CameraOutlined /> },
  { label: "Album", icon: <PictureOutlined /> },
  { label: "Closure", icon: <CheckCircleOutlined /> },
];

const TEMPLATE_BASED_SERVICES = ["Traditional Photography", "Candid Photography"];

const TOTAL_VERSION_SLOTS = 5;

const STATUS_STAGES = ["Draft", "In Progress", "In Review", "Finalized"];

interface SavedAlbumTemplate {
  name: string;
  sheets: number;
  photos: number;
  size: string;
}

interface SavedAlbumEntry {
  template?: SavedAlbumTemplate;
}

interface SavedAlbumServiceData {
  numAlbums?: number;
  albums?: SavedAlbumEntry[];
  droneCount?: number;
}

interface SavedEventForm {
  eventName?: string;
  selectedServices?: string[];
  albumData?: Record<string, SavedAlbumServiceData>;
}

interface CuratedPhoto {
  name: string;
  size: string;
  preview: string;
}

interface AlbumVersion {
  version: number;
  status: string; 
}

interface TemplateCardData {
  id: number;
  name: string;
  status: string;
  sheets: number;
  size: string;
  photosRequired: number;
  curatedPhotos: CuratedPhoto[];
  note: string;
  deadline: string;
  currentVersion: number;
  versionHistory: AlbumVersion[]; 
}

interface ServiceAlbumGroup {
  id: string;
  serviceName: string;
  hasTemplates: boolean;
  templates: TemplateCardData[];
}

function buildAlbumsFromSavedEvent(): ServiceAlbumGroup[] {
  let saved: SavedEventForm | null = null;
  try {
    const raw = sessionStorage.getItem("currentEvent");
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }

  const selectedServices = saved?.selectedServices ?? [];
  const albumData = saved?.albumData ?? {};

  let nextTemplateId = 1;

  return selectedServices.map((service) => {
    const isTemplateBased = TEMPLATE_BASED_SERVICES.includes(service);
    const data = albumData[service] || {};

    if (!isTemplateBased) {
      return {
        id: service,
        serviceName: service,
        hasTemplates: false,
        templates: [],
      };
    }

    const entries = data.albums && data.albums.length ? data.albums : [];

    const templates: TemplateCardData[] = entries
      .filter((entry) => !!entry.template)
      .map((entry) => {
        const tpl = entry.template as SavedAlbumTemplate;
        return {
          id: nextTemplateId++,
          name: tpl.name,
          status: "Draft",
          sheets: tpl.sheets,
          size: tpl.size,
          photosRequired: tpl.photos,
          curatedPhotos: [],
          note: "",
          deadline: "",
          currentVersion: 1,
          versionHistory: [],
        };
      });

    return {
      id: service,
      serviceName: service,
      hasTemplates: true,
      templates,
    };
  });
}

/* STAT CARD */
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="as-stat-card">
      <div className="as-stat-label">{label}</div>
      <div className={`as-stat-val as-val-${color}`}>{value}</div>
    </div>
  );
}

/* STATUS PILL */
function StatusPill({ status }: { status: string }) {
  return (
    <span className={`as-status-pill as-badge-${status.toLowerCase().replace(/\s/g, "-")}`}>
      <CheckCircleOutlined /> {status}
    </span>
  );
}

/* RADIAL PROGRESS — replaces the flat "x / y required" text counter */
function RadialProgress({
  value,
  max,
  size = 56,
  stroke = 5,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const complete = max > 0 && value >= max;

  return (
    <div
      className={`as-radial ${complete ? "complete" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="as-radial-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
        />
        <circle
          className="as-radial-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="as-radial-label">
        <strong>{value}</strong>
        <span>/{max}</span>
      </div>
    </div>
  );
}

/* STATUS TIMELINE — replaces the plain status pill with a lifecycle strip */
function StatusTimeline({ status }: { status: string }) {
  const idx = Math.max(0, STATUS_STAGES.indexOf(status));
  return (
    <div className="as-timeline">
      {STATUS_STAGES.map((stage, i) => (
        <div
          className={`as-timeline-step ${i <= idx ? "done" : ""} ${i === idx ? "current" : ""}`}
          key={stage}
        >
          <span className="as-timeline-dot" />
          <span className="as-timeline-label">{stage}</span>
          {i < STATUS_STAGES.length - 1 && <span className="as-timeline-line" />}
        </div>
      ))}
    </div>
  );
}

/* VERSION CARD
   `empty` renders a placeholder slot for a version that hasn't been created yet,
   so the grid always shows TOTAL_VERSION_SLOTS cards.
   Clicking any card (real or empty) navigates to the Template Editor page. */
function VersionCard({
  versionNum,
  isLatest,
  status,
  empty = false,
  onClick,
}: {
  versionNum: number;
  isLatest: boolean;
  status: string;
  empty?: boolean;
  onClick?: () => void;
}) {
  if (empty) {
    return (
      <div
        className="as-version-card as-version-card-empty"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      >
        <span className="as-version-badge as-version-badge-empty">v{versionNum}</span>
        <div className="as-version-thumb as-version-thumb-empty">
          <FileImageOutlined />
        </div>
        <div className="as-version-name as-version-name-empty">Version {versionNum}</div>
        <div className="as-version-sub">Not started yet — click to create</div>
      </div>
    );
  }

  return (
    <div
      className={`as-version-card ${isLatest ? "latest" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
    >
      <span className={`as-version-badge ${isLatest ? "latest" : ""}`}>
        {isLatest ? "Latest" : `v${versionNum}`}
      </span>
      <div className="as-version-thumb">
        <FileImageOutlined />
      </div>
      <div className="as-version-name">Version {versionNum}</div>
      <div className="as-version-sub">{isLatest ? "Current version" : "Older version"}</div>
      <div className="as-version-fields">
        <div className="as-version-field">
          <span className="as-version-field-label">Album</span>
          <span className="as-version-field-val">v{versionNum}</span>
        </div>
        <div className="as-version-field">
          <span className="as-version-field-label">Status</span>
          <span className="as-version-field-val">{status}</span>
        </div>
      </div>
    </div>
  );
}

/* LIGHTBOX — full-screen photo preview with prev/next */
function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: CuratedPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onNavigate((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onNavigate]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div className="as-lightbox" onClick={onClose}>
      <button className="as-lightbox-close" onClick={onClose} aria-label="Close preview">
        <CloseOutlined />
      </button>
      {photos.length > 1 && (
        <button
          className="as-lightbox-nav prev"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index - 1 + photos.length) % photos.length);
          }}
          aria-label="Previous photo"
        >
          <LeftOutlined />
        </button>
      )}
      <div className="as-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img src={photo.preview} alt={photo.name} />
        <div className="as-lightbox-caption">
          {photo.name} · {photo.size} · {index + 1}/{photos.length}
        </div>
      </div>
      {photos.length > 1 && (
        <button
          className="as-lightbox-nav next"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index + 1) % photos.length);
          }}
          aria-label="Next photo"
        >
          <RightOutlined />
        </button>
      )}
    </div>
  );
}

/* STAGED FILE PREVIEW STRIP */
function StagedPreview({
  files,
  onRemove,
}: {
  files: { name: string; size: string; preview: string }[];
  onRemove: (idx: number) => void;
}) {
  if (!files.length) return null;
  return (
    <div className="as-staged-area">
      {files.map((f, i) => (
        <div className="as-staged-thumb" key={i} style={{ animationDelay: `${i * 30}ms` }}>
          {f.preview ? (
            <img src={f.preview} alt={f.name} />
          ) : (
            <FileImageOutlined className="as-staged-icon" />
          )}
          <div className="as-staged-size">{f.size}</div>
          <button className="as-staged-remove" onClick={() => onRemove(i)} aria-label="Remove">
            <CloseOutlined />
          </button>
        </div>
      ))}
    </div>
  );
}

/* CURATED PHOTO WALL — masonry-style grid with hover-remove + click-to-preview */
function CuratedGallery({
  photos,
  required,
  onOpen,
  onRemove,
}: {
  photos: CuratedPhoto[];
  required: number;
  onOpen: (idx: number) => void;
  onRemove: (idx: number) => void;
}) {
  if (!photos.length) {
    return (
      <div className="as-no-curated">
        <InboxOutlined className="as-no-curated-icon" />
        <div>
          <strong>{required ? "Curated photos are required" : "No curated photos yet"}</strong>
          <p>Drag photos into the upload zone above to populate the gallery.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="as-curated-wall">
      {photos.map((p, i) => (
        <button
          className="as-curated-thumb"
          key={`${p.name}-${i}`}
          style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
          onClick={() => onOpen(i)}
        >
          {p.preview ? <img src={p.preview} alt={p.name} /> : <FileImageOutlined className="as-curated-ph" />}
          <span
            className="as-curated-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(i);
            }}
            role="button"
            aria-label="Remove from curated"
          >
            <DeleteOutlined />
          </span>
        </button>
      ))}
    </div>
  );
}

/* TEMPLATE CARD (album, shown as version history + curation panel) */
function TemplateCard({
  template,
  onUpdate,
}: {
  template: TemplateCardData;
  onUpdate: (templateId: number, patch: Partial<TemplateCardData>) => void;
}) {
  const navigate = useNavigate();
  const [stagedFiles, setStagedFiles] = useState<{ name: string; size: string; preview: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [reviewPath, setReviewPath] = useState<"send" | "self" | null>(null);

  const imgRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const formatBytes = (b: number) => {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  const bumpVersion = (patch: Partial<TemplateCardData>) => {
    const archivedEntry: AlbumVersion = { version: template.currentVersion, status: "Archived" };
    onUpdate(template.id, {
      ...patch,
      versionHistory: [...template.versionHistory, archivedEntry],
      currentVersion: template.currentVersion + 1,
    });
  };

  const addFiles = (fileList: FileList | File[]) => {
    const picked = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((f: File) => ({
        name: f.name,
        size: formatBytes(f.size),
        preview: URL.createObjectURL(f),
      }));
    if (picked.length) setStagedFiles((prev) => [...prev, ...picked]);
  };

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleRemoveStaged = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleUpload = () => {
    if (!stagedFiles.length) return;
    const merged = [...template.curatedPhotos, ...stagedFiles];

    if (template.curatedPhotos.length === 0) {
      notifyAlbumCreated({
        albumName: template.name,
        createdBy: "AXS System", 
        mediaCount: merged.length,
      });
    }

    bumpVersion({ curatedPhotos: merged, status: "In Progress" });
    setStagedFiles([]);
  };

  const handleClear = () => setStagedFiles([]);

  const handleRemoveCurated = (idx: number) => {
    const filtered = template.curatedPhotos.filter((_, i) => i !== idx);
    onUpdate(template.id, { curatedPhotos: filtered });
    setLightboxIdx(null);
  };

  const handleSendForReview = () => {
    if (!template.curatedPhotos.length) return;
    bumpVersion({ status: "In Review" });
    setReviewPath(null);
  };

  const handleSelfSelect = () => {
    if (!template.curatedPhotos.length) return;
    bumpVersion({ status: "Finalized" });
    setReviewPath(null);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onUpdate(template.id, { note: e.target.value });
  const handleDeadline = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate(template.id, { deadline: e.target.value });

  const handleCalendarIconClick = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof (el as any).showPicker === "function") {
      (el as any).showPicker();
    } else {
      el.focus();
    }
  };

  const openTemplateEditor = (versionNum: number, isLatest: boolean, status: string) => {
    const payload = {
      templateId: template.id,
      templateName: template.name,
      sheetsCount: template.sheets,
      canvasSize: template.size,
      photosRequired: template.photosRequired,
      versionNum,
      isLatest,
      status: status || "Draft",
    };
    sessionStorage.setItem("currentTemplateEditor", JSON.stringify(payload));
    navigate("/events/create/album/template-editor");
  };

  const canSend = template.curatedPhotos.length > 0;
  const selectedCount = template.curatedPhotos.length;

  const realVersionCount = template.versionHistory.length + 1;
  const placeholdersNeeded = Math.max(0, TOTAL_VERSION_SLOTS - realVersionCount);
  const placeholderVersionNums = Array.from(
    { length: placeholdersNeeded },
    (_, i) => template.currentVersion + 1 + i
  );

  return (
    <div className="as-template-card">
      {/* Template header */}
      <div className="as-tpl-header">
        <div className="as-tpl-title-row">
          <span className="as-tpl-name">{template.name}</span>
          <span className="as-tpl-meta-inline">
            {template.sheets} Sheets &nbsp;·&nbsp; {template.size}
          </span>
        </div>

        <StatusTimeline status={template.status} />
      </div>

      {/* Album versions grid — always shows TOTAL_VERSION_SLOTS cards */}
      <div className="as-versions-section">
        <div className="as-versions-label">Album Versions</div>
        <div className="as-versions-grid">
          {template.versionHistory.map((v) => (
            <VersionCard
              key={v.version}
              versionNum={v.version}
              isLatest={false}
              status={v.status}
              onClick={() => openTemplateEditor(v.version, false, v.status)}
            />
          ))}
          <VersionCard
            versionNum={template.currentVersion}
            isLatest
            status={template.status}
            onClick={() => openTemplateEditor(template.currentVersion, true, template.status)}
          />
          {placeholderVersionNums.map((vNum) => (
            <VersionCard
              key={`empty-${vNum}`}
              versionNum={vNum}
              isLatest={false}
              status=""
              empty
              onClick={() => openTemplateEditor(vNum, false, "Draft")}
            />
          ))}
        </div>
      </div>

      {/* Upload dropzone */}
      <div className="as-upload-section">
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleAddPhotos}
        />
        <input
          ref={folderRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          // @ts-expect-error non-standard directory-picker attributes
          webkitdirectory=""
          directory=""
          onChange={handleAddPhotos}
        />

        <div
          className={`as-dropzone ${isDragOver ? "dragover" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => imgRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="as-dropzone-icon">
            <UploadOutlined />
          </div>
          <div className="as-dropzone-text">
            <strong>Drag &amp; drop photos here</strong>
            <span>or use the buttons below to browse files or a whole folder</span>
          </div>

          <div className="as-dropzone-actions" onClick={(e) => e.stopPropagation()}>
            <button className="as-btn-outline-sm" onClick={() => imgRef.current?.click()}>
              <UploadOutlined /> Browse Photos
            </button>
            <button className="as-btn-outline-sm" onClick={() => folderRef.current?.click()}>
              <FolderOpenOutlined /> Add Folder
            </button>
          </div>
        </div>

        {stagedFiles.length > 0 && (
          <>
            <StagedPreview files={stagedFiles} onRemove={handleRemoveStaged} />
            <div className="as-staged-actions">
              <span className="as-staged-count">
                {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""} staged
              </span>
              <div className="as-staged-actions-btns">
                <button className="as-btn-danger-sm" onClick={handleClear}>
                  Clear
                </button>
                <button className="as-btn-primary-sm" onClick={handleUpload}>
                  <UploadOutlined /> Upload {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Curated photo wall */}
      <div className="as-curated-section">
        <div className="as-curated-head">
          <RadialProgress value={selectedCount} max={template.photosRequired || 1} />
          <div className="as-curated-head-copy">
            <span className="as-curated-title">Curated Photos</span>
            <span className="as-curated-sub">
              {selectedCount} of {template.photosRequired} required photos curated
            </span>
          </div>
        </div>
        <CuratedGallery
          photos={template.curatedPhotos}
          required={template.photosRequired}
          onOpen={(idx) => setLightboxIdx(idx)}
          onRemove={handleRemoveCurated}
        />
      </div>

      {/* Send for customer review */}
      <div className="as-review-section">
        <div className="as-review-head">
          <SendOutlined className="as-review-head-icon" />
          <span>Finish This Version</span>
        </div>

        {!canSend && (
          <div className="as-info-banner">
            <InfoCircleOutlined />
            Upload curated photos first before sending for customer review.
          </div>
        )}

        <div className="as-review-path-grid">
          <button
            className={`as-review-path-card ${reviewPath === "send" ? "selected" : ""} ${!canSend ? "disabled" : ""}`}
            disabled={!canSend}
            onClick={() => setReviewPath("send")}
          >
            <span className="as-review-path-icon"><SendOutlined /></span>
            <span className="as-review-path-title">Send for Review</span>
            <span className="as-review-path-sub">Customer gets an email + access code to approve photos</span>
          </button>
          <button
            className={`as-review-path-card ${reviewPath === "self" ? "selected" : ""} ${!canSend ? "disabled" : ""}`}
            disabled={!canSend}
            onClick={() => setReviewPath("self")}
          >
            <span className="as-review-path-icon"><FlagOutlined /></span>
            <span className="as-review-path-title">Self Select &amp; Finalize</span>
            <span className="as-review-path-sub">Skip the customer step and finalize this version yourself</span>
          </button>
        </div>

        {reviewPath && (
          <div className="as-review-fields as-review-fields-open">
            <div className="as-field-group">
              <label className="as-field-label">
                Note to customer <span className="as-optional">(optional)</span>
              </label>
              <textarea
                className="as-textarea"
                placeholder="Describe which photos were curated, any special instructions for the customer..."
                value={template.note}
                onChange={handleNoteChange}
                rows={3}
              />
            </div>
            {reviewPath === "send" && (
              <div className="as-field-group">
                <label className="as-field-label">
                  Review deadline <span className="as-optional">(optional)</span>
                </label>
                <div className="as-input-wrap">
                  <input
                    ref={dateRef}
                    type="date"
                    className="as-input"
                    value={template.deadline}
                    onChange={handleDeadline}
                  />
                  <CalendarOutlined className="as-input-icon" onClick={handleCalendarIconClick} />
                </div>
                <span className="as-field-hint">Customer notified via email with access code.</span>
              </div>
            )}

            <div className="as-review-confirm-row">
              <button className="as-btn-secondary" onClick={() => setReviewPath(null)}>
                Cancel
              </button>
              <button
                className="as-btn-primary"
                onClick={reviewPath === "send" ? handleSendForReview : handleSelfSelect}
              >
                {reviewPath === "send" ? (
                  <>
                    <SendOutlined /> Confirm &amp; Send
                  </>
                ) : (
                  <>
                    <FlagOutlined /> Confirm &amp; Finalize
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          photos={template.curatedPhotos}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={(next) => setLightboxIdx(next)}
        />
      )}
    </div>
  );
}

/* MAIN PAGE */
export default function AlbumSelectionPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(5);
  const [albums, setAlbums] = useState<ServiceAlbumGroup[]>(() => buildAlbumsFromSavedEvent());
  const [activeService, setActiveService] = useState(0);

  useEffect(() => {
    setAlbums(buildAlbumsFromSavedEvent());
    setActiveService(0);
  }, []);

  const activeGroup = albums[activeService];

  const allTemplates = albums.flatMap((a) => a.templates);
  const totalAlbums = allTemplates.length;
  const photosRequired = allTemplates.reduce((s, t) => s + t.photosRequired, 0);
  const customerSelected = allTemplates.reduce(
    (s, t) => s + (t.status === "Finalized" || t.status === "In Review" ? t.curatedPhotos.length : 0),
    0
  );
  const pendingSelection = photosRequired - customerSelected;

  const handleTemplateUpdate = (serviceIdx: number, templateId: number, patch: Partial<TemplateCardData>) => {
    setAlbums((prev) =>
      prev.map((group, gi) =>
        gi !== serviceIdx
          ? group
          : {
              ...group,
              templates: group.templates.map((tpl) => (tpl.id === templateId ? { ...tpl, ...patch } : tpl)),
            }
      )
    );
  };

  return (
    <main className="as-page">
      <section className="as-stage">
        {/* ── Top bar ── */}
        <header className="as-topbar">
          <button className="as-back" type="button" onClick={() => navigate(-1)}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="as-title-wrap">
            <span className="as-title-icon">
              <PictureOutlined />
            </span>
            <div>
              <p className="as-subtitle">Step 6 of 7 · Album</p>
              <h1 className="as-heading">Album Selection</h1>
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="as-body">
          {/* Side rail */}
          <aside className="as-rail">
            {STEPS.map((step, i) => (
              <div className="as-step-wrap" key={step.label}>
                <button
                  className={`as-step ${i === activeStep ? "active" : ""} ${i < activeStep ? "done" : ""}`}
                  type="button"
                  onClick={() => setActiveStep(i)}
                  aria-label={step.label}
                >
                  {i < activeStep ? <CheckCircleOutlined /> : step.icon}
                  {i === activeStep && <span className="as-step-dot" />}
                </button>
                <span className="as-tooltip">{step.label}</span>
              </div>
            ))}
          </aside>

          {/* Content */}
          <div className="as-content">
            {/* Progress bar */}
            <div className="as-progress-bar">
              <div className="as-progress-fill" style={{ width: "71%" }} />
              <span className="as-progress-pct">71%</span>
            </div>

            {/* Page header */}
            <div className="as-page-header">
              <div className="as-page-header-left">
                <div>
                  <h2>Album Selection</h2>
                  <p>Curate photos by service, send the selection for customer review, and prepare the final album.</p>
                </div>
              </div>
              <button className="as-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh">
                <ReloadOutlined />
              </button>
            </div>

            {albums.length === 0 ? (
              <div className="as-info-banner">
                <InfoCircleOutlined />
                No services were selected in Event Details, so there's nothing to curate here yet. Go back and select
                at least one service.
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="as-stats-row">
                  <StatCard label="Total Albums" value={totalAlbums} color="blue" />
                  <StatCard label="Photos Required" value={photosRequired} color="cyan" />
                  <StatCard label="Customer Selected" value={customerSelected} color="amber" />
                  <StatCard label="Pending Selection" value={pendingSelection} color="amber" />
                </div>

                {/* Service tabs — only the services chosen in Create Event */}
                <div className="as-service-tabs">
                  {albums.map((group, idx) => {
                    const doneCount = group.templates.filter((t) => t.status === "Finalized").length;
                    return (
                      <button
                        key={group.id}
                        className={`as-service-tab ${activeService === idx ? "active" : ""}`}
                        onClick={() => setActiveService(idx)}
                      >
                        <InfoCircleOutlined />
                        {group.serviceName}
                        {group.hasTemplates && (
                          <span className="as-service-badge">
                            {doneCount}/{group.templates.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Templates for active service */}
                <div className="as-templates-list">
                  {!activeGroup?.hasTemplates ? (
                    <div className="as-info-banner">
                      <InfoCircleOutlined />
                      {activeGroup?.serviceName} doesn't use album templates — there's nothing to curate for this
                      service.
                    </div>
                  ) : activeGroup.templates.length === 0 ? (
                    <div className="as-info-banner">
                      <InfoCircleOutlined />
                      No album template was selected for {activeGroup.serviceName} in Event Details.
                    </div>
                  ) : (
                    activeGroup.templates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        onUpdate={(templateId, patch) => handleTemplateUpdate(activeService, templateId, patch)}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {/* Footer nav */}
            <footer className="as-actions">
              <button className="as-btn-secondary" type="button" onClick={() => navigate("/events/create/media")}>
                <ArrowLeftOutlined /> Previous Step
              </button>
              <button className="as-btn-primary" type="button" onClick={() => navigate("/events/create/closure")}>
                Next Step <ArrowRightOutlined />
              </button>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}