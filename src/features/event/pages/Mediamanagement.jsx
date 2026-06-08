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
  FolderOpenOutlined,
  UploadOutlined,
  AppstoreOutlined,
  BarsOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import "./MediaManagement.css";

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

const INITIAL_SERVICES = [
  {
    id: 1,
    name: "Candid Photography",
    assigned: "Kamesh srikharan.T",
    status: "Not Uploaded",
    images: 0,
    videos: 0,
    thumbnail: null,
    lastUploaded: null,
  },
  {
    id: 2,
    name: "Candid Videography",
    assigned: "Unassigned",
    status: "Not Uploaded",
    images: 0,
    videos: 0,
    thumbnail: null,
    lastUploaded: null,
  },
];

/* ══════════════════════════════════════════
   BADGE RIBBON
══════════════════════════════════════════ */
function BadgeRibbon({ status }) {
  const cls =
    status === "Acknowledged"
      ? "acknowledged"
      : status === "Uploaded"
      ? "uploaded"
      : "not-uploaded";
  return <div className={`mm-badge-ribbon ${cls}`}>{status}</div>;
}

/* ══════════════════════════════════════════
   FOLDER CARD
══════════════════════════════════════════ */
function FolderCard({ service, onClick }) {
  return (
    <div className="mm-folder-card" onClick={onClick}>
      <BadgeRibbon status={service.status} />
      <div className="mm-folder-thumb">
        {service.thumbnail ? (
          <img src={service.thumbnail} alt={service.name} />
        ) : (
          <FolderOpenOutlined className="mm-folder-thumb-icon" />
        )}
      </div>
      <div className="mm-folder-info">
        <div className="mm-folder-name">{service.name}</div>
        <div className="mm-folder-assigned">Assigned: {service.assigned}</div>
        <div className="mm-folder-stats">
          <div className="mm-stat-box">
            <div className="mm-stat-label">Images</div>
            <div className="mm-stat-val">{service.images}</div>
          </div>
          <div className="mm-stat-box">
            <div className="mm-stat-label">Videos</div>
            <div className="mm-stat-val">{service.videos}</div>
          </div>
        </div>
        {service.lastUploaded && (
          <div className="mm-folder-last">Last uploaded: {service.lastUploaded}</div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════ */
function EmptyState({ message }) {
  return (
    <div className="mm-empty">
      <FolderOpenOutlined className="mm-empty-icon" />
      <p>{message}</p>
    </div>
  );
}

/* ══════════════════════════════════════════
   FILE DISPLAY (grid or list)
══════════════════════════════════════════ */
function FileDisplay({ files, viewMode }) {
  if (!files.length) return null;

  if (viewMode === "list") {
    return (
      <div className="mm-file-list">
        {files.map((f, i) => (
          <div className="mm-file-row" key={i}>
            {f.type === "video" ? (
              <VideoCameraOutlined className="mm-file-row-icon" />
            ) : (
              <FileImageOutlined className="mm-file-row-icon" />
            )}
            <span className="mm-file-row-name">{f.name}</span>
            <span className="mm-file-row-size">{f.size}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mm-file-grid">
      {files.map((f, i) => (
        <div className="mm-file-thumb" key={i}>
          {f.preview ? (
            <img src={f.preview} alt={f.name} />
          ) : (
            <VideoCameraOutlined className="mm-file-thumb-icon" />
          )}
          <div className="mm-file-thumb-label">{f.name}</div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════ */
function ConfirmModal({ pendingCount, onCancel, onSkip, onContinue, onAcknowledge }) {
  const hasPending = pendingCount > 0;
  return (
    <div
      className="mm-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="mm-modal">
        <div className="mm-modal-header">
          <div className="mm-modal-title">
            <ExclamationCircleOutlined />
            Confirm media acknowledgment
          </div>
          <button className="mm-modal-close" onClick={onCancel}>
            <CloseOutlined />
          </button>
        </div>

        {hasPending ? (
          <>
            <div className="mm-modal-warn">
              <div className="mm-modal-warn-title">
                Pending uploads: {pendingCount} file{pendingCount > 1 ? "s" : ""}
              </div>
              <div className="mm-modal-warn-body">
                Choose to finish uploading first, continue without uploading pending files, or cancel.
              </div>
            </div>
            <div className="mm-modal-actions">
              <button className="mm-btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button className="mm-btn-danger-outline" onClick={onSkip}>
                Skip upload and acknowledge
              </button>
              <button className="mm-btn-primary" onClick={onContinue}>
                <UploadOutlined /> Continue uploading and then acknowledge
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mm-modal-body">
              Are you sure you want to acknowledge this media?
            </div>
            <div className="mm-modal-actions" style={{ justifyContent: "flex-end" }}>
              <button className="mm-btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button className="mm-btn-primary" onClick={onAcknowledge}>
                Acknowledge
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   FOLDER SELECTION VIEW
══════════════════════════════════════════ */
function FolderSelectionView({ services, onOpen }) {
  return (
    <div className="mm-view">
      <div className="mm-hero-card">
        <div className="mm-hero-left">
          <CameraOutlined className="mm-hero-icon" />
          <div>
            <h2>Media Management</h2>
            <p>Choose a service folder to upload, review, or download event media.</p>
          </div>
        </div>
      </div>

      <div className="mm-panel">
        <div className="mm-section-head">
          <span className="mm-section-title">Choose a service folder</span>
          <span className="mm-section-sub">
            Uploads and listings will be scoped to the selected service.
          </span>
        </div>
        <div className="mm-folder-grid">
          {services.map((svc) => (
            <FolderCard key={svc.id} service={svc} onClick={() => onOpen(svc)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   UPLOAD VIEW
   — uploadedFiles and selectedFiles are now
     received from / saved to the parent so
     they survive back-navigation.
══════════════════════════════════════════ */
function UploadView({
  service,
  onBack,
  onServicesUpdate,
  /* ↓ NEW — lifted state from parent */
  uploadedFiles,
  selectedFiles,
  onUploadedFilesChange,
  onSelectedFilesChange,
}) {
  const [activeTab, setActiveTab] = useState("selected");
  const [subTab,    setSubTab]    = useState("images");
  const [viewMode,  setViewMode]  = useState("grid");
  const [showModal, setShowModal] = useState(false);

  const imgRef = useRef();
  const vidRef = useRef();

  const formatBytes = (b) => {
    if (b < 1024)    return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  /* Pick files → save to parent selected-files map */
  const pickFiles = (e, type) => {
    const picked = Array.from(e.target.files).map((f) => ({
      name:    f.name,
      size:    formatBytes(f.size),
      type,
      preview: type === "image" ? URL.createObjectURL(f) : null,
    }));
    onSelectedFilesChange([...selectedFiles, ...picked]);
    e.target.value = "";
  };

  /* Move selected → uploaded; persist both in parent */
  const doUpload = () => {
    if (!selectedFiles.length) return;
    const merged = [...uploadedFiles, ...selectedFiles];
    onUploadedFilesChange(merged);          // ← save uploaded list to parent
    onSelectedFilesChange([]);              // ← clear selected list in parent

    const imgs  = merged.filter((f) => f.type === "image").length;
    const vids  = merged.filter((f) => f.type === "video").length;
    const thumb = merged.find((f) => f.type === "image")?.preview || null;

    onServicesUpdate(service.id, {
      images:       imgs,
      videos:       vids,
      thumbnail:    thumb,
      status:       "Uploaded",
      lastUploaded: new Date().toLocaleString(),
    });

    setActiveTab("uploaded");
  };

  const doAcknowledge = () => {
    onServicesUpdate(service.id, { status: "Acknowledged" });
    setShowModal(false);
    onBack();
  };

  const filteredUploaded = uploadedFiles.filter((f) =>
    subTab === "images" ? f.type === "image" : f.type === "video"
  );

  return (
    <div className="mm-view">
      {/* header */}
      <div className="mm-hero-card">
        <div className="mm-hero-left">
          <CameraOutlined className="mm-hero-icon" />
          <div>
            <h2>Media Management</h2>
            <p>Upload and organize event photos and videos.</p>
          </div>
        </div>
        <button className="mm-btn-outline" onClick={onBack}>
          <ArrowLeftOutlined /> Back to Service Folders
        </button>
      </div>

      <div className="mm-panel">
        {/* action bar */}
        <div className="mm-upload-topbar">
          <div className="mm-upload-actions">
            <button
              className="mm-btn-outline"
              onClick={doUpload}
              disabled={!selectedFiles.length}
              style={!selectedFiles.length ? { opacity: 0.45, cursor: "not-allowed" } : {}}
            >
              <UploadOutlined /> Upload Selected Files
            </button>
            <button className="mm-btn-outline" onClick={() => setShowModal(true)}>
              Acknowledge Media
            </button>
          </div>
          <div className="mm-view-toggle">
            <button
              className={`mm-btn-toggle ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <AppstoreOutlined /> Grid
            </button>
            <button
              className={`mm-btn-toggle ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <BarsOutlined /> List
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="mm-tabs">
          <button
            className={`mm-tab ${activeTab === "selected" ? "active" : ""}`}
            onClick={() => setActiveTab("selected")}
          >
            <FileImageOutlined /> Selected Files
            <span className="mm-tab-badge">{selectedFiles.length}</span>
          </button>
          <button
            className={`mm-tab ${activeTab === "uploaded" ? "active" : ""}`}
            onClick={() => setActiveTab("uploaded")}
          >
            <UploadOutlined /> Uploaded Files
            <span className="mm-tab-badge">{uploadedFiles.length}</span>
          </button>
        </div>

        {/* tab content */}
        <div className="mm-tab-body">
          {activeTab === "selected" && (
            <>
              <input
                ref={imgRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => pickFiles(e, "image")}
              />
              <input
                ref={vidRef}
                type="file"
                accept="video/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => pickFiles(e, "video")}
              />
              <div className="mm-picker-row">
                <button className="mm-picker-pill" onClick={() => imgRef.current?.click()}>
                  <FileImageOutlined /> Select Images
                </button>
                <button className="mm-picker-pill" onClick={() => imgRef.current?.click()}>
                  <FolderOpenOutlined /> Image Folder
                </button>
                <button className="mm-picker-pill" onClick={() => vidRef.current?.click()}>
                  <VideoCameraOutlined /> Select Videos
                </button>
                <button className="mm-picker-pill" onClick={() => vidRef.current?.click()}>
                  <FolderOpenOutlined /> Video Folder
                </button>
              </div>

              {selectedFiles.length === 0 ? (
                <EmptyState message="No files selected yet. Choose images or videos above to begin uploading." />
              ) : (
                <FileDisplay files={selectedFiles} viewMode={viewMode} />
              )}
            </>
          )}

          {activeTab === "uploaded" && (
            <>
              <div className="mm-sub-tabs">
                <button
                  className={`mm-sub-tab ${subTab === "images" ? "active" : ""}`}
                  onClick={() => setSubTab("images")}
                >
                  Images ({uploadedFiles.filter((f) => f.type === "image").length})
                </button>
                <button
                  className={`mm-sub-tab ${subTab === "videos" ? "active" : ""}`}
                  onClick={() => setSubTab("videos")}
                >
                  Videos ({uploadedFiles.filter((f) => f.type === "video").length})
                </button>
              </div>
              {filteredUploaded.length === 0 ? (
                <EmptyState
                  message={`No ${subTab} uploaded yet. Uploaded media will appear here.`}
                />
              ) : (
                <FileDisplay files={filteredUploaded} viewMode={viewMode} />
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <ConfirmModal
          pendingCount={selectedFiles.length}
          onCancel={() => setShowModal(false)}
          onSkip={doAcknowledge}
          onContinue={() => {
            doUpload();
            setTimeout(doAcknowledge, 200);
          }}
          onAcknowledge={doAcknowledge}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
   All state that must survive back-navigation
   is kept here (services, uploadedFilesMap,
   selectedFilesMap, activeStep, openService).
══════════════════════════════════════════ */
export default function MediaManagement() {
  const navigate = useNavigate();

  /* ── Wizard step (persists across renders) ── */
  const [activeStep, setActiveStep] = useState(4);

  /* ── Service metadata (status, counts, thumbnail) ── */
  const [services, setServices] = useState(INITIAL_SERVICES);

  /* ── Which folder is open (null = folder list view) ── */
  const [openService, setOpenService] = useState(null);

  /* ── Per-service uploaded files map: { [serviceId]: File[] } ──
       Lifted from UploadView so files survive back-navigation.   */
  const [uploadedFilesMap, setUploadedFilesMap] = useState({});

  /* ── Per-service selected (pending) files map: { [serviceId]: File[] } ──
       Lifted so pending selections are not lost on tab switch.   */
  const [selectedFilesMap, setSelectedFilesMap] = useState({});

  /* ─── Helpers ─── */
  const handleServicesUpdate = (id, patch) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const handleOpenService = (svc) => {
    // Always read fresh service object from state so status is current
    setOpenService(services.find((s) => s.id === svc.id) ?? svc);
  };

  /* Update uploaded files for the open service */
  const handleUploadedFilesChange = (serviceId, files) => {
    setUploadedFilesMap((prev) => ({ ...prev, [serviceId]: files }));
  };

  /* Update selected (pending) files for the open service */
  const handleSelectedFilesChange = (serviceId, files) => {
    setSelectedFilesMap((prev) => ({ ...prev, [serviceId]: files }));
  };

  /* When going back, re-sync openService object from latest services state */
  const handleBack = () => {
    setOpenService(null);
  };

  return (
    <main className="mm-page">
      <section className="mm-stage">

        {/* ── Top bar ── */}
        <header className="mm-topbar">
          <button className="mm-back" type="button" onClick={() => navigate(-1)}>
            <DoubleLeftOutlined /> Back
          </button>

          <div className="mm-title-wrap">
            <span className="mm-title-icon">
              <CameraOutlined />
            </span>
            <div>
              <p className="mm-subtitle">Step 5 of 7 · Media</p>
              <h1 className="mm-heading">Media Management</h1>
            </div>
          </div>

          <div className="mm-progress" aria-label="Event progress">
            {[1, 2, 3, 4, 5].map((s) => (
              <span className={s <= 5 ? "done" : ""} key={s}>
                {s <= 5 ? <CheckCircleOutlined /> : s}
              </span>
            ))}
            <button type="button" aria-label="Refresh">
              <ReloadOutlined />
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="mm-body">

          {/* Side rail */}
          <aside className="mm-rail">
            {STEPS.map((step, i) => (
              <div className="mm-step-wrap" key={step.label}>
                <button
                  className={`mm-step ${i === activeStep ? "active" : ""} ${
                    i < activeStep ? "done" : ""
                  }`}
                  type="button"
                  onClick={() => setActiveStep(i)}
                  aria-label={step.label}
                >
                  {i < activeStep ? <CheckCircleOutlined /> : step.icon}
                  {i === activeStep && <span className="mm-step-dot" />}
                </button>
                <span className="mm-tooltip">{step.label}</span>
              </div>
            ))}
          </aside>

          {/* Content */}
          <div className="mm-content">
            <div className="mm-progress-bar">
              <div className="mm-progress-fill" style={{ width: "57%" }} />
              <span className="mm-progress-pct">57%</span>
            </div>

            {openService === null ? (
              <FolderSelectionView
                services={services}
                onOpen={handleOpenService}
              />
            ) : (
              <UploadView
                service={openService}
                onBack={handleBack}
                onServicesUpdate={handleServicesUpdate}
                /* ↓ Lifted state — files survive back-navigation */
                uploadedFiles={uploadedFilesMap[openService.id] ?? []}
                selectedFiles={selectedFilesMap[openService.id] ?? []}
                onUploadedFilesChange={(files) =>
                  handleUploadedFilesChange(openService.id, files)
                }
                onSelectedFilesChange={(files) =>
                  handleSelectedFilesChange(openService.id, files)
                }
              />
            )}

            <footer className="mm-actions">
              <button
                className="mm-btn-secondary"
                type="button"
                onClick={() => navigate("/events/create/attendance")}
              >
                <ArrowLeftOutlined /> Previous Step
              </button>
              <button
                className="mm-btn-primary"
                type="button"
                onClick={() => navigate("/events/create/album")}
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