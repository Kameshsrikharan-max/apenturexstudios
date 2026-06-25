import { useState, useRef, useEffect } from "react";
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


const STEPS = [
  { label: "Event Details",   icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment",         icon: <DollarOutlined /> },
  { label: "Attendance",      icon: <ClockCircleOutlined /> },
  { label: "Media",           icon: <CameraOutlined /> },
  { label: "Album",           icon: <PictureOutlined /> },
  { label: "Closure",         icon: <CheckCircleOutlined /> },
];


const STORAGE_KEY = "mediaManagement__state";

function loadPersistedState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("MediaManagement: could not persist state", e);
  }
}


function buildServicesFromEvent(selectedServices) {
  return selectedServices.map((name, idx) => ({
    id: idx + 1,
    name,
    assigned: "Unassigned",
    status: "Not Uploaded",
    images: 0,
    videos: 0,
    thumbnail: null,
    lastUploaded: null,
  }));
}


function resolveInitialState() {
  const persisted = loadPersistedState();

  let eventServices = [];
  try {
    const raw = sessionStorage.getItem("currentEvent");
    if (raw) {
      const evt = JSON.parse(raw);
      if (Array.isArray(evt.selectedServices)) {
        eventServices = evt.selectedServices;
      }
    }
  } catch(error){
   console.error(error);
}
  if (persisted && persisted.services) {
    const persistedNames = persisted.services.map((s) => s.name).sort().join(",");
    const eventNames     = [...eventServices].sort().join(",");
    if (persistedNames === eventNames) {
      return persisted;
    }
  }

  const services =
    eventServices.length > 0
      ? buildServicesFromEvent(eventServices)
      : [
          { id: 1, name: "Candid Photography", assigned: "Unassigned", status: "Not Uploaded", images: 0, videos: 0, thumbnail: null, lastUploaded: null },
          { id: 2, name: "Candid Videography", assigned: "Unassigned", status: "Not Uploaded", images: 0, videos: 0, thumbnail: null, lastUploaded: null },
        ];

  return { services, uploadedFilesMap: {}, selectedFilesMap: {} };
}


function BadgeRibbon({ status }) {
  const cls =
    status === "Acknowledged" ? "acknowledged"
    : status === "Uploaded"   ? "uploaded"
    :                           "not-uploaded";
  return <div className={`mm-badge-ribbon ${cls}`}>{status}</div>;
}


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


function EmptyState({ message }) {
  return (
    <div className="mm-empty">
      <FolderOpenOutlined className="mm-empty-icon" />
      <p>{message}</p>
    </div>
  );
}


function FileDisplay({ files, viewMode, onRemove }) {
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
            {onRemove && (
              <button className="mm-file-remove" type="button" title="Remove" onClick={() => onRemove(i)}>
                <CloseOutlined />
              </button>
            )}
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
          {onRemove && (
            <button className="mm-file-thumb-remove" type="button" title="Remove" onClick={() => onRemove(i)}>
              <CloseOutlined />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}


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
          <button className="mm-modal-close" type="button" onClick={onCancel}>
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
                Choose to finish uploading first, continue without uploading pending
                files, or cancel.
              </div>
            </div>
            <div className="mm-modal-actions">
              <button className="mm-btn-secondary" type="button" onClick={onCancel}>Cancel</button>
              <button className="mm-btn-danger-outline" type="button" onClick={onSkip}>
                Skip upload and acknowledge
              </button>
              <button className="mm-btn-primary" type="button" onClick={onContinue}>
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
              <button className="mm-btn-secondary" type="button" onClick={onCancel}>Cancel</button>
              <button className="mm-btn-primary" type="button" onClick={onAcknowledge}>Acknowledge</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


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
        {services.length === 0 ? (
          <EmptyState message="No services selected for this event. Go back to Event Details and select at least one service." />
        ) : (
          <div className="mm-folder-grid">
            {services.map((svc) => (
              <FolderCard key={svc.id} service={svc} onClick={() => onOpen(svc)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function UploadView({
  service,
  onBack,
  onServicesUpdate,
  uploadedFiles,
  selectedFiles,
  onUploadedFilesChange,
  onSelectedFilesChange,
}) {
  const [activeTab,  setActiveTab]  = useState("selected");
  const [subTab,     setSubTab]     = useState("images");
  const [viewMode,   setViewMode]   = useState("grid");
  const [showModal,  setShowModal]  = useState(false);
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef();
  const vidRef = useRef();
  const imgFolderRef = useRef();
  const vidFolderRef = useRef();

  const formatBytes = (b) => {
    if (b < 1024)    return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const pickFiles = async (e, type) => {
    const raw = Array.from(e.target.files);
    if (!raw.length) return;
    setProcessing(true);
    try {
      const picked = await Promise.all(
        raw.map(async (f) => ({
          name:    f.name,
          size:    formatBytes(f.size),
          type,
          preview: type === "image" ? await fileToBase64(f) : null,
        }))
      );
      onSelectedFilesChange([...selectedFiles, ...picked]);
    } finally {
      setProcessing(false);
    }
    e.target.value = "";
  };

  const doUpload = () => {
    if (!selectedFiles.length) return;
    const merged = [...uploadedFiles, ...selectedFiles];
    onUploadedFilesChange(merged);
    onSelectedFilesChange([]);

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

  const removeSelected = (idx) => {
    onSelectedFilesChange(selectedFiles.filter((_, i) => i !== idx));
  };

  const removeUploaded = (idx) => {
    const updated = uploadedFiles.filter((_, i) => i !== idx);
    onUploadedFilesChange(updated);
    const imgs  = updated.filter((f) => f.type === "image").length;
    const vids  = updated.filter((f) => f.type === "video").length;
    const thumb = updated.find((f) => f.type === "image")?.preview || null;
    onServicesUpdate(service.id, {
      images:    imgs,
      videos:    vids,
      thumbnail: thumb,
      status:    updated.length > 0 ? "Uploaded" : "Not Uploaded",
    });
  };

  const filteredUploaded = uploadedFiles.filter((f) =>
    subTab === "images" ? f.type === "image" : f.type === "video"
  );

  const badgeCls =
    service.status === "Acknowledged" ? "acknowledged"
    : service.status === "Uploaded"   ? "uploaded"
    :                                   "not-uploaded";

  return (
    <div className="mm-view">
      <div className="mm-hero-card">
        <div className="mm-hero-left">
          <CameraOutlined className="mm-hero-icon" />
          <div>
            <h2>
              {service.name}&nbsp;
              <span className={`mm-inline-badge ${badgeCls}`}>{service.status}</span>
            </h2>
            <p>Upload and organize event photos and videos.</p>
          </div>
        </div>
        <button className="mm-btn-outline" type="button" onClick={onBack}>
          <ArrowLeftOutlined /> Back to Service Folders
        </button>
      </div>

      <div className="mm-panel">
        <div className="mm-upload-topbar">
          <div className="mm-upload-actions">
            <button
              className="mm-btn-primary-sm"
              type="button"
              onClick={doUpload}
              disabled={!selectedFiles.length || processing}
            >
              <UploadOutlined /> Upload Selected Files
              {selectedFiles.length > 0 && (
                <span style={{ marginLeft: 4, opacity: 0.8 }}>({selectedFiles.length})</span>
              )}
            </button>
            <button className="mm-btn-outline" type="button" onClick={() => setShowModal(true)}>
              Acknowledge Media
            </button>
          </div>
          <div className="mm-view-toggle">
            <button
              className={`mm-btn-toggle ${viewMode === "grid" ? "active" : ""}`}
              type="button"
              onClick={() => setViewMode("grid")}
            >
              <AppstoreOutlined /> Grid
            </button>
            <button
              className={`mm-btn-toggle ${viewMode === "list" ? "active" : ""}`}
              type="button"
              onClick={() => setViewMode("list")}
            >
              <BarsOutlined /> List
            </button>
          </div>
        </div>

        <div className="mm-tabs">
          <button
            className={`mm-tab ${activeTab === "selected" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("selected")}
          >
            <FileImageOutlined /> Selected Files
            <span className="mm-tab-badge">{selectedFiles.length}</span>
          </button>
          <button
            className={`mm-tab ${activeTab === "uploaded" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("uploaded")}
          >
            <UploadOutlined /> Uploaded Files
            <span className="mm-tab-badge">{uploadedFiles.length}</span>
          </button>
        </div>

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
              <input
                ref={imgFolderRef}
                type="file"
                accept="image/*"
                multiple
                webkitdirectory=""
                directory=""
                style={{ display: "none" }}
                onChange={(e) => pickFiles(e, "image")}
              />
              <input
                ref={vidFolderRef}
                type="file"
                accept="video/*"
                multiple
                webkitdirectory=""
                directory=""
                style={{ display: "none" }}
                onChange={(e) => pickFiles(e, "video")}
              />
              <div className="mm-picker-row">
                <button className="mm-picker-pill" type="button" onClick={() => imgRef.current?.click()}>
                  <FileImageOutlined /> Select Images
                </button>
                <button className="mm-picker-pill" type="button" onClick={() => imgFolderRef.current?.click()}>
                  <FolderOpenOutlined /> Image Folder
                </button>
                <button className="mm-picker-pill" type="button" onClick={() => vidRef.current?.click()}>
                  <VideoCameraOutlined /> Select Videos
                </button>
                <button className="mm-picker-pill" type="button" onClick={() => vidFolderRef.current?.click()}>
                  <FolderOpenOutlined /> Video Folder
                </button>
              </div>

              {processing && (
                <div className="mm-processing-bar">
                  <span>Processing files...</span>
                  <div className="mm-processing-fill" />
                </div>
              )}

              {selectedFiles.length === 0 && !processing ? (
                <EmptyState message="No files selected yet. Choose images or videos above to begin uploading." />
              ) : (
                <FileDisplay files={selectedFiles} viewMode={viewMode} onRemove={removeSelected} />
              )}
            </>
          )}

          {activeTab === "uploaded" && (
            <>
              <div className="mm-sub-tabs">
                <button
                  className={`mm-sub-tab ${subTab === "images" ? "active" : ""}`}
                  type="button"
                  onClick={() => setSubTab("images")}
                >
                  Images ({uploadedFiles.filter((f) => f.type === "image").length})
                </button>
                <button
                  className={`mm-sub-tab ${subTab === "videos" ? "active" : ""}`}
                  type="button"
                  onClick={() => setSubTab("videos")}
                >
                  Videos ({uploadedFiles.filter((f) => f.type === "video").length})
                </button>
              </div>
              {filteredUploaded.length === 0 ? (
                <EmptyState message={`No ${subTab} uploaded yet. Uploaded media will appear here.`} />
              ) : (
                <FileDisplay
                  files={filteredUploaded}
                  viewMode={viewMode}
                  onRemove={(idx) => {
                    const target  = filteredUploaded[idx];
                    const fullIdx = uploadedFiles.findIndex((f) => f === target);
                    if (fullIdx !== -1) removeUploaded(fullIdx);
                  }}
                />
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
          onContinue={() => { doUpload(); setTimeout(doAcknowledge, 200); }}
          onAcknowledge={doAcknowledge}
        />
      )}
    </div>
  );
}


export default function MediaManagement() {
  const navigate = useNavigate();

  const initialState = resolveInitialState();

  const [activeStep,       setActiveStep]       = useState(4);
  const [services,         setServices]         = useState(initialState.services);
  const [openServiceId,    setOpenServiceId]    = useState(null); // store ID only, not object
  const [uploadedFilesMap, setUploadedFilesMap] = useState(initialState.uploadedFilesMap || {});
  const [selectedFilesMap, setSelectedFilesMap] = useState(initialState.selectedFilesMap || {});

  
  const openService = openServiceId != null
    ? services.find((s) => s.id === openServiceId) ?? null
    : null;


  useEffect(() => {
    saveState({ services, uploadedFilesMap, selectedFilesMap });
  }, [services, uploadedFilesMap, selectedFilesMap]);

  const handleServicesUpdate = (id, patch) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleUploadedFilesChange = (serviceId, files) => {
    setUploadedFilesMap((prev) => ({ ...prev, [serviceId]: files }));
  };

  const handleSelectedFilesChange = (serviceId, files) => {
    setSelectedFilesMap((prev) => ({ ...prev, [serviceId]: files }));
  };

  
  const uploadedCount     = services.filter((s) => s.status === "Uploaded").length;
  const acknowledgedCount = services.filter((s) => s.status === "Acknowledged").length;
  const pct = services.length
    ? Math.round(((uploadedCount + acknowledgedCount) / services.length) * 100)
    : 0;

  return (
    <main className="mm-page">
      <section className="mm-stage">

        <header className="mm-topbar">
          <button className="mm-back" type="button" onClick={() => navigate(-1)}>
            <DoubleLeftOutlined /> Back
          </button>
          <div className="mm-title-wrap">
            <span className="mm-title-icon"><CameraOutlined /></span>
            <div>
              <p className="mm-subtitle">Step 5 of 7 / Media</p>
              <h1 className="mm-heading">Media Management</h1>
            </div>
          </div>
          <div className="mm-progress" aria-label="Event progress">
            {[1, 2, 3, 4, 5].map((s) => (
              <span className={s <= 5 ? "done" : ""} key={s}>
                {s <= 5 ? <CheckCircleOutlined /> : s}
              </span>
            ))}
            <button type="button" aria-label="Refresh"><ReloadOutlined /></button>
          </div>
        </header>

        <div className="mm-body">
          <aside className="mm-rail">
            {STEPS.map((step, i) => (
              <div className="mm-step-wrap" key={step.label}>
                <button
                  className={`mm-step ${i === activeStep ? "active" : ""} ${i < activeStep ? "done" : ""}`}
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

          <div className="mm-content">
            <div className="mm-progress-bar">
              <div className="mm-progress-fill" style={{ width: `${pct}%` }} />
              <span className="mm-progress-pct">{pct}%</span>
            </div>

            {openService === null ? (
              <FolderSelectionView
                services={services}
                onOpen={(svc) => setOpenServiceId(svc.id)}
              />
            ) : (
              <UploadView
                service={openService}
                onBack={() => setOpenServiceId(null)}
                onServicesUpdate={handleServicesUpdate}
                uploadedFiles={uploadedFilesMap[openService.id] ?? []}
                selectedFiles={selectedFilesMap[openService.id] ?? []}
                onUploadedFilesChange={(files) => handleUploadedFilesChange(openService.id, files)}
                onSelectedFilesChange={(files) => handleSelectedFilesChange(openService.id, files)}
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
