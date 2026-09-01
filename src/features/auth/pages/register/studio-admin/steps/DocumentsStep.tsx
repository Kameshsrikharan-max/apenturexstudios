import { useEffect, useRef, useState } from "react";

export interface DocumentsData {
  mapsLink: string;
  documentType: string;
  documentFile: File | null;
}

interface DocumentsStepProps {
  initialData: DocumentsData;
  onBack: () => void;
  onContinue: (data: DocumentsData) => void;
}

type FieldErrors = Partial<Record<keyof DocumentsData, string>>;

const MAPS_LINK_PATTERN = /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i;

const DOCUMENT_TYPE_OPTIONS = [
  "GST registration",
  "MSME/Udyam certificate",
  "Shop & Establishment licence",
  "Certificate of Incorporation",
];

const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const ACCEPTED_DOCUMENT_ATTR = "application/pdf,image/jpeg,image/png";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsStep({ initialData, onBack, onContinue }: DocumentsStepProps) {
  const [data, setData] = useState<DocumentsData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setIsTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setField = <K extends keyof DocumentsData>(field: K, value: DocumentsData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const selectDocumentType = (option: string) => {
    const isSame = data.documentType === option;
    setField("documentType", isSame ? "" : option);
    if (isSame) {
      // Clearing the type also clears any file already attached to it.
      setField("documentFile", null);
    }
    setIsTypeOpen(false);
  };

  const handleFileSelect = (fileList: FileList | null) => {
    const file = fileList?.[0] ?? null;
    setField("documentFile", file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = () => {
    setField("documentFile", null);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!data.mapsLink.trim()) {
      next.mapsLink = "This field is required.";
    } else if (!MAPS_LINK_PATTERN.test(data.mapsLink.trim())) {
      next.mapsLink = "Enter a valid Google Maps link.";
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

  const isValidLooking = data.mapsLink.trim() && MAPS_LINK_PATTERN.test(data.mapsLink.trim());

  return (
    <div className="documents-step">
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Document upload or Location</h2>
        <p className="studio-form-section-subtitle">Upload required documents for verification</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-grid">
        <Field label="Studio Google Maps Link" required error={errors.mapsLink} full>
          <input
            className="studio-input"
            placeholder="https://maps.google.com/..."
            value={data.mapsLink}
            onChange={(e) => setField("mapsLink", e.target.value)}
          />
          <span className="studio-field-hint">Paste the Google Maps link to your studio location</span>
        </Field>

        <Field label="Document Type (Optional)" full>
          <div className="studio-multiselect" ref={typeRef}>
            <button
              type="button"
              className="studio-multiselect-trigger"
              onClick={() => setIsTypeOpen((open) => !open)}
            >
              {data.documentType ? (
                <span>{data.documentType}</span>
              ) : (
                <span className="studio-multiselect-placeholder">Select document type</span>
              )}
              <span className={`studio-multiselect-chevron ${isTypeOpen ? "studio-multiselect-chevron--open" : ""}`}>
                ⌄
              </span>
            </button>

            {isTypeOpen ? (
              <div className="studio-multiselect-dropdown">
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`studio-dropdown-option ${
                      data.documentType === option ? "studio-dropdown-option--selected" : ""
                    }`}
                    onClick={() => selectDocumentType(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
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
          <button
            type="button"
            className="studio-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={!data.documentType}
          >
            <span className="studio-upload-icon" aria-hidden="true">
              ⭱
            </span>
            Upload Document
          </button>
          <span className="studio-field-hint">
            {data.documentType
              ? `Accepted formats: ${ACCEPTED_DOCUMENT_EXTENSIONS.map((ext) => ext.replace(".", "").toUpperCase()).join(", ")}`
              : "Please select document type first"}
          </span>

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