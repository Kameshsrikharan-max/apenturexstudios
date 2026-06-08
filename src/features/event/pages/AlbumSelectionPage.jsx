import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DoubleLeftOutlined,
  CameraOutlined,
  PictureOutlined,
  PlusOutlined,
  TeamOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  CloseOutlined,
  FileImageOutlined,
  FolderOpenOutlined,
  SendOutlined,
  FlagOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import "./AlbumSelectionPage.css";

/* ─── Wizard steps ─── */
const STEPS = [
  { label: "Event Details",   icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment",         icon: <DollarOutlined /> },
  { label: "Attendance",      icon: <ClockCircleOutlined /> },
  { label: "Media",           icon: <CameraOutlined /> },
  { label: "Album",           icon: <PictureOutlined /> },
  { label: "Closure",         icon: <CheckCircleOutlined /> },
];

/* ─── Initial album data (mirrors screenshots) ─── */
const INITIAL_ALBUMS = [
  {
    id: 1,
    serviceName: "Candid Photography",
    templates: [
      {
        id: 1,
        name: "Album Template",
        status: "Not Started",
        sheets: 5,
        size: "16x12",
        photosRequired: 40,
        curatedPhotos: [],
        reviewStage: 1, // 1=Draft, 2=In Review, 3=Submitted, 4=Finalized
        note: "",
        deadline: "",
      },
      {
        id: 2,
        name: "New template - 3",
        status: "Not Started",
        sheets: 5,
        size: "A4",
        photosRequired: 20,
        curatedPhotos: [],
        reviewStage: 1,
        note: "",
        deadline: "",
      },
    ],
  },
];

const STAGE_LABELS = ["Draft", "In Review", "Submitted", "Finalized"];

/* ══════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════ */
function StatCard({ label, value, color }) {
  return (
    <div className="as-stat-card">
      <div className="as-stat-label">{label}</div>
      <div className={`as-stat-val as-val-${color}`}>{value}</div>
    </div>
  );
}

/* ══════════════════════════════════════════
   REVIEW STAGE STEPPER
══════════════════════════════════════════ */
function ReviewStepper({ stage }) {
  return (
    <div className="as-stepper">
      {STAGE_LABELS.map((lbl, i) => {
        const stepNum = i + 1;
        const isDone    = stepNum < stage;
        const isActive  = stepNum === stage;
        return (
          <React.Fragment key={lbl}>
            <div className="as-stepper-item">
              <div className={`as-stepper-circle ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
                {isDone ? <CheckCircleOutlined /> : stepNum}
              </div>
              <span className={`as-stepper-lbl ${isActive ? "active" : ""}`}>{lbl}</span>
            </div>
            {i < STAGE_LABELS.length - 1 && (
              <div className={`as-stepper-line ${isDone ? "done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   STAGED FILE PREVIEW
══════════════════════════════════════════ */
function StagedPreview({ files, onRemove }) {
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

/* ══════════════════════════════════════════
   CURATED PHOTO GALLERY
══════════════════════════════════════════ */
function CuratedGallery({ photos, required }) {
  if (!photos.length) {
    return (
      <div className="as-no-curated">
        <FileImageOutlined className="as-no-curated-icon" />
        <div>
          <strong>No curated photos yet</strong>
          <p>Stage photos above and click Upload to populate the gallery.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="as-curated-grid">
      {photos.map((p, i) => (
        <div className="as-curated-thumb" key={i}>
          {p.preview ? (
            <img src={p.preview} alt={p.name} />
          ) : (
            <FileImageOutlined className="as-curated-ph" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   TEMPLATE CARD
══════════════════════════════════════════ */
function TemplateCard({ template, onUpdate }) {
  const [stagedFiles, setStagedFiles] = useState([]);
  const imgRef = useRef();

  const formatBytes = (b) => {
    if (b < 1024)    return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  const handleAddPhotos = (e) => {
    const picked = Array.from(e.target.files).map((f) => ({
      name:    f.name,
      size:    formatBytes(f.size),
      preview: URL.createObjectURL(f),
    }));
    setStagedFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  };

  const handleRemoveStaged = (idx) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = () => {
    if (!stagedFiles.length) return;
    const merged = [...template.curatedPhotos, ...stagedFiles];
    onUpdate(template.id, { curatedPhotos: merged, status: "In Progress" });
    setStagedFiles([]);
  };

  const handleClear = () => setStagedFiles([]);

  const handleSendForReview = () => {
    if (!template.curatedPhotos.length) return;
    onUpdate(template.id, { reviewStage: 2, status: "In Review" });
  };

  const handleSelfSelect = () => {
    if (!template.curatedPhotos.length) return;
    onUpdate(template.id, { reviewStage: 4, status: "Finalized" });
  };

  const handleNoteChange  = (e) => onUpdate(template.id, { note: e.target.value });
  const handleDeadline    = (e) => onUpdate(template.id, { deadline: e.target.value });

  const canSend = template.curatedPhotos.length > 0;

  return (
    <div className="as-template-card">
      {/* Template header */}
      <div className="as-tpl-header">
        <div className="as-tpl-title-row">
          <span className="as-tpl-name">{template.name}</span>
          <span className={`as-tpl-badge as-badge-${template.status.toLowerCase().replace(/\s/g, "-")}`}>
            {template.status}
          </span>
        </div>
        <div className="as-tpl-meta">
          {template.sheets} Sheets &nbsp;·&nbsp; {template.size} &nbsp;·&nbsp; {template.photosRequired} Photos Required
        </div>
      </div>

      {/* Review stepper */}
      <ReviewStepper stage={template.reviewStage} />

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
      {stagedFiles.length > 0 && (
        <StagedPreview files={stagedFiles} onRemove={handleRemoveStaged} />
      )}

      {/* Curated photos section */}
      <div className="as-curated-section">
        <div className="as-curated-head">
          <span className="as-curated-title">Curated Photos</span>
          <span className="as-curated-count">
            {template.curatedPhotos.length} / {template.photosRequired} required
          </span>
        </div>
        <CuratedGallery
          photos={template.curatedPhotos}
          required={template.photosRequired}
        />
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
                type="date"
                className="as-input"
                value={template.deadline}
                onChange={handleDeadline}
                placeholder="Set a deadline"
              />
              <CalendarOutlined className="as-input-icon" />
            </div>
            <span className="as-field-hint">Customer notified via email with access code.</span>
          </div>
        </div>

        <div className="as-review-btns">
          <button
            className={`as-btn-action ${!canSend ? "disabled" : ""}`}
            disabled={!canSend}
            onClick={handleSendForReview}
          >
            <SendOutlined /> Send for Review
          </button>
          <button
            className={`as-btn-action ${!canSend ? "disabled" : ""}`}
            disabled={!canSend}
            onClick={handleSelfSelect}
          >
            <FlagOutlined /> Self Select &amp; Finalize
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function AlbumSelectionPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(5); // step index 5 = Album
  const [albums, setAlbums]         = useState(INITIAL_ALBUMS);
  const [activeService, setActiveService] = useState(0); // tab index

  /* Compute summary stats */
  const allTemplates = albums.flatMap((a) => a.templates);
  const totalAlbums  = allTemplates.length;
  const photosRequired = allTemplates.reduce((s, t) => s + t.photosRequired, 0);
  const customerSelected = allTemplates.reduce((s, t) => s + (t.reviewStage >= 3 ? t.curatedPhotos.length : 0), 0);
  const pendingSelection = photosRequired - customerSelected;

  const handleTemplateUpdate = (serviceIdx, templateId, patch) => {
    setAlbums((prev) =>
      prev.map((album, ai) =>
        ai !== serviceIdx
          ? album
          : {
              ...album,
              templates: album.templates.map((tpl) =>
                tpl.id === templateId ? { ...tpl, ...patch } : tpl
              ),
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

          <div className="as-progress" aria-label="Event progress">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <span className={s <= 6 ? "done" : ""} key={s}>
                {s <= 6 ? <CheckCircleOutlined /> : s}
              </span>
            ))}
            <button type="button" aria-label="Refresh">
              <ReloadOutlined />
            </button>
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
                <AppstoreOutlined className="as-page-header-icon" />
                <div>
                  <h2>Album Selection</h2>
                  <p>Curate photos by service, send the selection for customer review, and prepare the final album.</p>
                </div>
              </div>
              <button className="as-btn-outline" onClick={() => window.location.reload()}>
                <ReloadOutlined /> Refresh
              </button>
            </div>

            {/* Summary stats */}
            <div className="as-stats-row">
              <StatCard label="Total Albums"      value={totalAlbums}       color="blue" />
              <StatCard label="Photos Required"   value={photosRequired}    color="cyan" />
              <StatCard label="Customer Selected" value={customerSelected}  color="amber" />
              <StatCard label="Pending Selection" value={pendingSelection}  color="amber" />
            </div>

            {/* Service tabs */}
            <div className="as-service-tabs">
              {albums.map((album, idx) => {
                const doneCount = album.templates.filter((t) => t.reviewStage >= 3).length;
                return (
                  <button
                    key={album.id}
                    className={`as-service-tab ${activeService === idx ? "active" : ""}`}
                    onClick={() => setActiveService(idx)}
                  >
                    <InfoCircleOutlined />
                    {album.serviceName}
                    <span className="as-service-badge">
                      {doneCount}/{album.templates.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Templates for active service */}
            <div className="as-templates-list">
              {albums[activeService]?.templates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onUpdate={(templateId, patch) =>
                    handleTemplateUpdate(activeService, templateId, patch)
                  }
                />
              ))}
            </div>

            {/* Footer nav */}
            <footer className="as-actions">
              <button
                className="as-btn-secondary"
                type="button"
                onClick={() => navigate("/events/create/media")}
              >
                <ArrowLeftOutlined /> Previous Step
              </button>
              <button
                className="as-btn-primary"
                type="button"
                onClick={() => navigate("/events/create/closure")}
              >
                Next Step <ArrowRightOutlined />
              </button>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}