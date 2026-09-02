import { useRef, useState } from "react";
import {
  EnvironmentOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  TrophyOutlined,
  InboxOutlined,
  CheckCircleFilled,
  ExportOutlined,
  CompassOutlined,
} from "@ant-design/icons";
import "./WorkAreaDocumentsStep.css";

export interface WorkAreaDocumentsData {
  mapsLink: string;
  travelRadius: string;
  documentType: string;
  documentFile: File | null;
}

interface WorkAreaDocumentsStepProps {
  initialData: WorkAreaDocumentsData;
  onBack: () => void;
  onContinue: (data: WorkAreaDocumentsData) => void;
}

type FieldErrors = Partial<Record<keyof WorkAreaDocumentsData, string>>;

const MAPS_LINK_PATTERN = /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i;

const TRAVEL_RADIUS_OPTIONS: { label: string; hint: string; icon: React.ReactNode }[] = [
  { label: "Within my city", hint: "Local shoots only", icon: <CompassOutlined /> },
  { label: "Within my state", hint: "Will travel state-wide", icon: <CompassOutlined /> },
  { label: "Pan-India", hint: "Open to travel anywhere in India", icon: <CompassOutlined /> },
  { label: "International", hint: "Open to destination shoots abroad", icon: <CompassOutlined /> },
];

const DOCUMENT_TYPE_OPTIONS: { label: string; icon: React.ReactNode }[] = [
  { label: "PAN Card", icon: <IdcardOutlined /> },
  { label: "GST Registration (if any)", icon: <FileTextOutlined /> },
  { label: "Professional Certification", icon: <SafetyCertificateOutlined /> },
  { label: "Award / Recognition", icon: <TrophyOutlined /> },
];

const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const ACCEPTED_DOCUMENT_ATTR = "application/pdf,image/jpeg,image/png";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WorkAreaDocumentsStep({ initialData, onBack, onContinue }: WorkAreaDocumentsStepProps) {
  const [data, setData] = useState<WorkAreaDocumentsData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const setField = <K extends keyof WorkAreaDocumentsData>(field: K, value: WorkAreaDocumentsData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const selectDocumentType = (option: string) => {
    const isSame = data.documentType === option;
    setField("documentType", isSame ? "" : option);
    if (isSame) setField("documentFile", null);
  };

  const handleFileSelect = (fileList: FileList | null) => {
    const file = fileList?.[0] ?? null;
    setField("documentFile", file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => setField("documentFile", null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!data.documentType) return;
    dragCounter.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingFile(false);
    if (!data.documentType) return;
    handleFileSelect(e.dataTransfer.files);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!data.mapsLink.trim()) {
      next.mapsLink = "This field is required.";
    } else if (!MAPS_LINK_PATTERN.test(data.mapsLink.trim())) {
      next.mapsLink = "Enter a valid Google Maps link.";
    }

    if (!data.travelRadius) {
      next.travelRadius = "Please select how far you're willing to travel.";
    }

    return next;
  };

  const handleContinue = () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onContinue(data);
    }
  };

  const mapsLinkValid = data.mapsLink.trim() && MAPS_LINK_PATTERN.test(data.mapsLink.trim());
  const isValidLooking = mapsLinkValid && data.travelRadius;

  return (
    <div className="work-area-step">
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Work Area &amp; Documents</h2>
        <p className="studio-form-section-subtitle">Where you're based and how far you'll travel for a shoot</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-grid">
        <Field label="Base Location — Google Maps Link" required error={errors.mapsLink} full>
          <div className="studio-field-shell">
            <input
              className={`studio-input ${errors.mapsLink ? "studio-input--invalid" : ""}`}
              placeholder="https://maps.google.com/..."
              value={data.mapsLink}
              onChange={(e) => setField("mapsLink", e.target.value)}
            />
            {mapsLinkValid ? <CheckCircleFilled className="studio-field-check" /> : null}
          </div>
          <span className="studio-field-hint">Paste the Google Maps link to where you're usually based</span>

          {mapsLinkValid ? (
            <div className="work-area-map-preview">
              <div className="work-area-map-preview-visual">
                <EnvironmentOutlined />
              </div>
              <div className="work-area-map-preview-body">
                <span className="work-area-map-preview-label">Base location saved</span>
                <a
                  className="work-area-map-preview-link"
                  href={data.mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Maps <ExportOutlined />
                </a>
              </div>
            </div>
          ) : null}
        </Field>

        <Field label="Travel Radius" required error={errors.travelRadius} full>
          <div className="work-area-radius-grid">
            {TRAVEL_RADIUS_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.label}
                className={`studio-option-card work-area-radius-card ${
                  data.travelRadius === option.label ? "studio-option-card--selected" : ""
                }`}
                onClick={() => setField("travelRadius", option.label)}
              >
                <span className="studio-option-card-icon">{option.icon}</span>
                <div>
                  <div className="studio-option-card-title">{option.label}</div>
                  <div className="studio-option-card-sub">{option.hint}</div>
                </div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Document Type (Optional)" full>
          <div className="work-area-doc-grid">
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.label}
                className={`studio-option-card work-area-doc-card ${
                  data.documentType === option.label ? "studio-option-card--selected" : ""
                }`}
                onClick={() => selectDocumentType(option.label)}
              >
                <span className="studio-option-card-icon">{option.icon}</span>
                <span className="studio-option-card-title">{option.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Upload Document (Optional)" full>
          <input
            ref={fileInputRef}
            type="file"
            className="studio-file-input-hidden"
            accept={ACCEPTED_DOCUMENT_ATTR}
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={!data.documentType}
          />

          <div
            className={`work-area-dropzone ${isDraggingFile ? "work-area-dropzone--active" : ""} ${
              !data.documentType ? "work-area-dropzone--disabled" : ""
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => data.documentType && fileInputRef.current?.click()}
            role="button"
            tabIndex={data.documentType ? 0 : -1}
          >
            <InboxOutlined className="work-area-dropzone-icon" />
            <p className="work-area-dropzone-title">
              {data.documentType ? "Drag & drop your document here" : "Select a document type first"}
            </p>
            {data.documentType ? (
              <p className="work-area-dropzone-sub">
                or click to browse — {ACCEPTED_DOCUMENT_EXTENSIONS.map((e) => e.replace(".", "").toUpperCase()).join(
                  ", "
                )}
              </p>
            ) : null}
          </div>

          {data.documentFile ? (
            <ul className="studio-media-list">
              <li className="studio-media-item">
                <span className="studio-media-name">{data.documentFile.name}</span>
                <span className="studio-media-size">{formatFileSize(data.documentFile.size)}</span>
                <button
                  type="button"
                  className="studio-media-remove"
                  onClick={removeFile}
                  aria-label={`Remove ${data.documentFile.name}`}
                >
                  ×
                </button>
              </li>
            </ul>
          ) : null}
        </Field>
      </div>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="studio-btn-primary" disabled={!isValidLooking} onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`studio-form-field ${full ? "studio-form-field--full" : ""}`}>
      <label className="studio-field-label">
        {required ? <span className="studio-required-star">*</span> : null} {label}
      </label>
      {children}
      {error ? <span className="studio-field-error">{error}</span> : null}
    </div>
  );
}