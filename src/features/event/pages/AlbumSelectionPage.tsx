import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {CheckCircleOutlined,ClockCircleOutlined,DollarOutlined,DoubleLeftOutlined,CameraOutlined,PictureOutlined,PlusOutlined,TeamOutlined,ReloadOutlined,ArrowRightOutlined,ArrowLeftOutlined,UploadOutlined,CloseOutlined,FileImageOutlined,FolderOpenOutlined,SendOutlined,FlagOutlined,InfoCircleOutlined,CalendarOutlined,} from "@ant-design/icons";
import "./AlbumSelectionPage.css";

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

// Total number of version-card slots always rendered per album template.
const TOTAL_VERSION_SLOTS = 5;

/*  Types describing the shape saved by CreateEventPage */

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
  status: string; // "Archived" for history entries
}

interface TemplateCardData {
  id: number;
  name: string;
  status: string; // Draft | In Progress | In Review | Finalized
  sheets: number;
  size: string;
  photosRequired: number;
  curatedPhotos: CuratedPhoto[];
  note: string;
  deadline: string;
  currentVersion: number;
  versionHistory: AlbumVersion[]; // archived, oldest first
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

/* VERSION CARD
   `empty` renders a placeholder slot for a version that hasn't been created yet,
   so the grid always shows TOTAL_VERSION_SLOTS cards. */
function VersionCard({
  versionNum,
  isLatest,
  status,
  empty = false,
}: {
  versionNum: number;
  isLatest: boolean;
  status: string;
  empty?: boolean;
}) {
  if (empty) {
    return (
      <div className="as-version-card as-version-card-empty">
        <span className="as-version-badge as-version-badge-empty">v{versionNum}</span>
        <div className="as-version-thumb as-version-thumb-empty">
          <FileImageOutlined />
        </div>
        <div className="as-version-name as-version-name-empty">Version {versionNum}</div>
        <div className="as-version-sub">Not started yet</div>
      </div>
    );
  }

  return (
    <div className={`as-version-card ${isLatest ? "latest" : ""}`}>
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

/* STAGED FILE PREVIEW */
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
        <div className="as-staged-thumb" key={i}>
          {f.preview ? (
            <img src={f.preview} alt={f.name} />
          ) : (
            <FileImageOutlined className="as-staged-icon" />
          )}
          <div className="as-staged-size">{f.size}</div>
          <button className="as-staged-remove" onClick={() => onRemove(i)}>
            <CloseOutlined />
          </button>
        </div>
      ))}
    </div>
  );
}

/* CURATED PHOTO GALLERY */
function CuratedGallery({ photos, required }: { photos: CuratedPhoto[]; required: number }) {
  if (!photos.length) {
    return (
      <div className="as-no-curated">
        <FileImageOutlined className="as-no-curated-icon" />
        <div>
          <strong>{required ? "Curated photos are required" : "No curated photos yet"}</strong>
          <p>Stage photos above and click Upload to populate the gallery.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="as-curated-grid">
      {photos.map((p, i) => (
        <div className="as-curated-thumb" key={i}>
          {p.preview ? <img src={p.preview} alt={p.name} /> : <FileImageOutlined className="as-curated-ph" />}
        </div>
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
  const [stagedFiles, setStagedFiles] = useState<{ name: string; size: string; preview: string }[]>([]);
  const imgRef = useRef<HTMLInputElement>(null);
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

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).map((f: File) => ({
      name: f.name,
      size: formatBytes(f.size),
      preview: URL.createObjectURL(f),
    }));
    setStagedFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };

  const handleRemoveStaged = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = () => {
    if (!stagedFiles.length) return;
    const merged = [...template.curatedPhotos, ...stagedFiles];
    bumpVersion({ curatedPhotos: merged, status: "In Progress" });
    setStagedFiles([]);
  };

  const handleClear = () => setStagedFiles([]);

  const handleSendForReview = () => {
    if (!template.curatedPhotos.length) return;
    bumpVersion({ status: "In Review" });
  };

  const handleSelfSelect = () => {
    if (!template.curatedPhotos.length) return;
    bumpVersion({ status: "Finalized" });
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onUpdate(template.id, { note: e.target.value });
  const handleDeadline = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate(template.id, { deadline: e.target.value });

  // Open the native date picker when the custom calendar icon is clicked
  // (the browser's own indicator is visually hidden — see CSS).
  const handleCalendarIconClick = () => {
    const el = dateRef.current;
    if (!el) return;
    if (typeof (el as any).showPicker === "function") {
      (el as any).showPicker();
    } else {
      el.focus();
    }
  };

  const canSend = template.curatedPhotos.length > 0;
  const selectedCount = template.curatedPhotos.length;

  // Always render TOTAL_VERSION_SLOTS version cards: real archived versions +
  // the current version, padded with empty placeholder slots.
  const realVersionCount = template.versionHistory.length + 1; // +1 for current version
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

        <div className="as-tpl-status-row">
          <StatusPill status={template.status} />
          <span className="as-tpl-selected-count">
            {selectedCount} / {template.photosRequired} photos selected
          </span>
        </div>
      </div>

      {/* Album versions grid — always shows TOTAL_VERSION_SLOTS cards */}
      <div className="as-versions-section">
        <div className="as-versions-label">Album Versions</div>
        <div className="as-versions-grid">
          {template.versionHistory.map((v) => (
            <VersionCard key={v.version} versionNum={v.version} isLatest={false} status={v.status} />
          ))}
          <VersionCard versionNum={template.currentVersion} isLatest status={template.status} />
          {placeholderVersionNums.map((vNum) => (
            <VersionCard key={`empty-${vNum}`} versionNum={vNum} isLatest={false} status="" empty />
          ))}
        </div>
      </div>

      {/* Add Photos / Folder buttons */}
      <div className="as-tpl-actions-row">
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleAddPhotos}
        />
        <button className="as-btn-outline-sm" onClick={() => imgRef.current?.click()}>
          <UploadOutlined /> Add Photos
        </button>
        <button className="as-btn-outline-sm" onClick={() => imgRef.current?.click()}>
          <FolderOpenOutlined /> Add Folder
        </button>
        {stagedFiles.length > 0 && (
          <>
            <button className="as-btn-primary-sm" onClick={handleUpload}>
              <UploadOutlined /> Upload {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""}
            </button>
            <button className="as-btn-danger-sm" onClick={handleClear}>
              Clear
            </button>
          </>
        )}
      </div>

      {/* Staged preview */}
      {stagedFiles.length > 0 && <StagedPreview files={stagedFiles} onRemove={handleRemoveStaged} />}

      {/* Curated photos section */}
      <div className="as-curated-section">
        <div className="as-curated-head">
          <span className="as-curated-title">Curated Photos</span>
          <span className="as-curated-count">
            {template.curatedPhotos.length} / {template.photosRequired} required
          </span>
        </div>
        <CuratedGallery photos={template.curatedPhotos} required={template.photosRequired} />
      </div>

      {/* Send for customer review */}
      <div className="as-review-section">
        <div className="as-review-head">
          <SendOutlined className="as-review-head-icon" />
          <span>Send for Customer Review</span>
        </div>

        {!canSend && (
          <div className="as-info-banner">
            <InfoCircleOutlined />
            Upload curated photos first before sending for customer review.
          </div>
        )}

        <div className="as-review-fields">
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
        </div>

        <div className="as-review-btns">
          <button className={`as-btn-action ${!canSend ? "disabled" : ""}`} disabled={!canSend} onClick={handleSendForReview}>
            <SendOutlined /> Send for Review
          </button>
          <button className={`as-btn-action ${!canSend ? "disabled" : ""}`} disabled={!canSend} onClick={handleSelfSelect}>
            <FlagOutlined /> Self Select &amp; Finalize
          </button>
        </div>
      </div>
    </div>
  );
}

/* MAIN PAGE */
export default function AlbumSelectionPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(5); // step index 5 = Album
  const [albums, setAlbums] = useState<ServiceAlbumGroup[]>(() => buildAlbumsFromSavedEvent());
  const [activeService, setActiveService] = useState(0); // tab index

  // Re-sync from sessionStorage in case Create Event saved after first mount
  // (e.g. navigating back and forth between steps).
  useEffect(() => {
    setAlbums(buildAlbumsFromSavedEvent());
    setActiveService(0);
  }, []);

  const activeGroup = albums[activeService];

  /* Compute summary stats (template-based services only) */
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