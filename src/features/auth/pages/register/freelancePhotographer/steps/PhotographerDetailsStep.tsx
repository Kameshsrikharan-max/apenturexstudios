import { useEffect, useMemo, useRef, useState } from "react";
import {
  VideoCameraOutlined,
  InboxOutlined,
  CameraOutlined,
  ThunderboltOutlined,
  PlaySquareOutlined,
  RocketOutlined,
  InstagramOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import "./PhotographerDetailsStep.css";

export interface PhotographerDetailsData {
  displayName: string;
  phone: string;
  bio: string;
  yearsExperience: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  media: File[];
  service: string;
  specializations: string[];
  equipment: string;
  instagramLink: string;
  portfolioLink: string;
}

interface PhotographerDetailsStepProps {
  initialData: PhotographerDetailsData;
  onBack: () => void;
  onContinue: (data: PhotographerDetailsData) => void;
}

type FieldErrors = Partial<Record<keyof PhotographerDetailsData, string>>;

const PHONE_PATTERN = /^\d{10}$/;
const POSTAL_CODE_PATTERN = /^\d{6}$/;
const URL_PATTERN = /^https?:\/\/.+/i;
const BIO_MIN_LENGTH = 20;
const BIO_MAX_LENGTH = 1000;
const MAX_MEDIA_FILES = 10;

const ACCEPTED_MEDIA_EXTENSIONS = [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".avi", ".webm"];
const ACCEPTED_MEDIA_ATTR = "image/jpeg,image/png,video/mp4,video/quicktime,video/x-msvideo,video/webm";

const EXPERIENCE_OPTIONS = ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

const SERVICE_OPTIONS: { label: string; icon: React.ReactNode }[] = [
  { label: "Traditional Photography", icon: <CameraOutlined /> },
  { label: "Candid Photography", icon: <ThunderboltOutlined /> },
  { label: "Candid Videography", icon: <PlaySquareOutlined /> },
  { label: "Drone Photography", icon: <RocketOutlined /> },
];

// Same taxonomy as the studio admin flow, so clients see one consistent
// set of specialization tags across every kind of provider on the platform.
const SPECIALIZATION_OPTIONS = [
  "Portrait Photography",
  "Wedding & Event Photography",
  "Baby & Kids Photography",
  "Fashion & Model Photography",
  "Baby Photography",
  "Wedding Photography",
  "Maternity Photography",
  "Pre-Wedding Photography",
  "Fashion Photography",
  "Corporate Photography",
  "Event Photography",
  "Album/Post-production",
  "Drone/Videography",
  "Editing-only",
];

const BIO_TONE_HINTS: { min: number; message: string }[] = [
  { min: 0, message: "A couple of sentences about your journey and style is a great start." },
  { min: 60, message: "Good — mention a signature style or a notable shoot." },
  { min: 200, message: "Solid bio. Clients will get a real feel for your work." },
  { min: 500, message: "Detailed and thorough — consider trimming to the strongest points." },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

const DEFAULT_DETAILS: PhotographerDetailsData = {
  displayName: "",
  phone: "",
  bio: "",
  yearsExperience: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  media: [],
  service: "",
  specializations: [],
  equipment: "",
  instagramLink: "",
  portfolioLink: "",
};

export default function PhotographerDetailsStep({ initialData, onBack, onContinue }: PhotographerDetailsStepProps) {
  const [data, setData] = useState<PhotographerDetailsData>({ ...DEFAULT_DETAILS, ...initialData });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [specSearch, setSpecSearch] = useState("");
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const specRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specRef.current && !specRef.current.contains(event.target as Node)) {
        setIsSpecOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mediaPreviews = useMemo(
    () =>
      data.media.map((file) => ({
        file,
        url: isImageFile(file) ? URL.createObjectURL(file) : null,
      })),
    [data.media]
  );

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    };
  }, [mediaPreviews]);

  const setField = <K extends keyof PhotographerDetailsData>(field: K, value: PhotographerDetailsData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const addMediaFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const combined = [...data.media, ...incoming];

    if (combined.length > MAX_MEDIA_FILES) {
      setErrors((prev) => ({ ...prev, media: `You can upload up to ${MAX_MEDIA_FILES} files.` }));
      setField("media", combined.slice(0, MAX_MEDIA_FILES));
    } else {
      setErrors((prev) => ({ ...prev, media: undefined }));
      setField("media", combined);
    }
  };

  const handleMediaSelect = (fileList: FileList | null) => {
    if (!fileList) return;
    addMediaFiles(Array.from(fileList));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMediaFile = (index: number) => {
    setField(
      "media",
      data.media.filter((_, i) => i !== index)
    );
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDraggingMedia(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingMedia(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingMedia(false);
    if (data.media.length >= MAX_MEDIA_FILES) return;
    addMediaFiles(Array.from(e.dataTransfer.files));
  };

  const toggleSpecialization = (option: string) => {
    const next = data.specializations.includes(option)
      ? data.specializations.filter((item) => item !== option)
      : [...data.specializations, option];
    setField("specializations", next);
  };

  const removeSpecialization = (option: string) => {
    setField(
      "specializations",
      data.specializations.filter((item) => item !== option)
    );
  };

  const filteredSpecOptions = SPECIALIZATION_OPTIONS.filter((o) =>
    o.toLowerCase().includes(specSearch.trim().toLowerCase())
  );

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!data.displayName.trim()) next.displayName = "This field is required.";

    if (!data.phone.trim()) {
      next.phone = "This field is required.";
    } else if (!PHONE_PATTERN.test(data.phone)) {
      next.phone = "Enter a valid 10-digit phone number.";
    }

    if (!data.yearsExperience) next.yearsExperience = "Please select your experience level.";

    if (!data.bio.trim()) {
      next.bio = "This field is required.";
    } else if (data.bio.trim().length < BIO_MIN_LENGTH) {
      next.bio = `Tell us a bit more — at least ${BIO_MIN_LENGTH} characters.`;
    }

    if (!data.address.trim()) next.address = "This field is required.";
    if (!data.city.trim()) next.city = "This field is required.";
    if (!data.state.trim()) next.state = "This field is required.";
    if (!data.country.trim()) next.country = "This field is required.";

    if (!data.postalCode.trim()) {
      next.postalCode = "This field is required.";
    } else if (!POSTAL_CODE_PATTERN.test(data.postalCode)) {
      next.postalCode = "Enter a valid 6-digit postal code.";
    }

    if (!data.service.trim()) next.service = "Please select a primary service.";
    if (data.specializations.length === 0) next.specializations = "Please select at least one specialization.";

    if (data.instagramLink.trim() && !URL_PATTERN.test(data.instagramLink.trim())) {
      next.instagramLink = "Enter a full link starting with https://";
    }
    if (data.portfolioLink.trim() && !URL_PATTERN.test(data.portfolioLink.trim())) {
      next.portfolioLink = "Enter a full link starting with https://";
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

  const isValidLooking =
    data.displayName.trim() &&
    PHONE_PATTERN.test(data.phone) &&
    data.yearsExperience &&
    data.bio.trim().length >= BIO_MIN_LENGTH &&
    data.address.trim() &&
    data.city.trim() &&
    data.state.trim() &&
    data.country.trim() &&
    POSTAL_CODE_PATTERN.test(data.postalCode) &&
    data.service.trim() &&
    data.specializations.length > 0 &&
    (!data.instagramLink.trim() || URL_PATTERN.test(data.instagramLink.trim())) &&
    (!data.portfolioLink.trim() || URL_PATTERN.test(data.portfolioLink.trim()));

  const bioToneHint = [...BIO_TONE_HINTS].reverse().find((h) => data.bio.trim().length >= h.min)?.message;

  return (
    <div className="photographer-details-step">
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Professional Profile</h2>
        <p className="studio-form-section-subtitle">Tell clients who you are and what you shoot</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-grid">
        <Field label="Display Name" required error={errors.displayName} full>
          <input
            className="studio-input"
            placeholder="e.g., Kamesh Photography, or your own name"
            value={data.displayName}
            onChange={(e) => setField("displayName", e.target.value)}
          />
          <span className="studio-field-hint">Shown on your public profile — a name or a brand, your call.</span>
        </Field>

        <Field label="Phone Number" required error={errors.phone}>
          <input
            className="studio-input"
            placeholder="9874563210"
            value={data.phone}
            onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </Field>

        <Field label="Years of Experience" required error={errors.yearsExperience}>
          <select
            className="studio-select"
            value={data.yearsExperience}
            onChange={(e) => setField("yearsExperience", e.target.value)}
          >
            <option value="" disabled>
              Select experience
            </option>
            {EXPERIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Professional Bio" required error={errors.bio} full>
          <textarea
            className="studio-textarea"
            placeholder="Tell us about your photography journey, style, achievements, and what makes you unique..."
            value={data.bio}
            onChange={(e) => setField("bio", e.target.value.slice(0, BIO_MAX_LENGTH))}
            rows={6}
          />
          <div className="photographer-bio-footer">
            {bioToneHint ? <span className="photographer-bio-hint">{bioToneHint}</span> : <span />}
            <span className="studio-char-count">
              {data.bio.length} / {BIO_MAX_LENGTH}
            </span>
          </div>
        </Field>

        <Field label="Camera & Gear (Optional)" error={errors.equipment} full>
          <textarea
            className="studio-textarea"
            placeholder="e.g., Sony A7 IV, 24-70mm f/2.8, DJI Mini 4 Pro, studio strobes..."
            value={data.equipment}
            onChange={(e) => setField("equipment", e.target.value)}
            rows={3}
          />
          <span className="studio-field-hint">Helps clients gauge what kind of shoots you're equipped for.</span>
        </Field>
      </div>

      <h3 className="studio-form-group-title">Base Address</h3>

      <div className="studio-form-grid">
        <Field label="Address" required error={errors.address} full>
          <input
            className="studio-input"
            placeholder="123 Main St"
            value={data.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        </Field>

        <Field label="City" required error={errors.city}>
          <input
            className="studio-input"
            placeholder="Chennai"
            value={data.city}
            onChange={(e) => setField("city", e.target.value)}
          />
        </Field>
        <Field label="State" required error={errors.state}>
          <input
            className="studio-input"
            placeholder="Tamil Nadu"
            value={data.state}
            onChange={(e) => setField("state", e.target.value)}
          />
        </Field>

        <Field label="Country" required error={errors.country}>
          <input
            className="studio-input"
            placeholder="India"
            value={data.country}
            onChange={(e) => setField("country", e.target.value)}
          />
        </Field>
        <Field label="Postal Code" required error={errors.postalCode}>
          <input
            className="studio-input"
            placeholder="600001"
            value={data.postalCode}
            onChange={(e) => setField("postalCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </Field>
      </div>

      <h3 className="studio-form-group-title">Portfolio Links</h3>

      <div className="studio-form-grid">
        <Field label="Instagram (Optional)" error={errors.instagramLink}>
          <div className="studio-field-shell photographer-link-shell">
            <InstagramOutlined className="photographer-link-icon" />
            <input
              className="studio-input photographer-link-input"
              placeholder="https://instagram.com/yourhandle"
              value={data.instagramLink}
              onChange={(e) => setField("instagramLink", e.target.value)}
            />
          </div>
        </Field>
        <Field label="Website / Portfolio (Optional)" error={errors.portfolioLink}>
          <div className="studio-field-shell photographer-link-shell">
            <LinkOutlined className="photographer-link-icon" />
            <input
              className="studio-input photographer-link-input"
              placeholder="https://yourportfolio.com"
              value={data.portfolioLink}
              onChange={(e) => setField("portfolioLink", e.target.value)}
            />
          </div>
        </Field>
      </div>

      <h3 className="studio-form-group-title">Portfolio Media</h3>

      <div className="studio-form-grid">
        <Field label="Sample Work — Images / Videos (Optional)" full>
          <input
            ref={fileInputRef}
            type="file"
            className="studio-file-input-hidden"
            accept={ACCEPTED_MEDIA_ATTR}
            multiple
            onChange={(e) => handleMediaSelect(e.target.files)}
          />

          <div
            className={`studio-details-dropzone ${isDraggingMedia ? "studio-details-dropzone--active" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => data.media.length < MAX_MEDIA_FILES && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <InboxOutlined className="studio-details-dropzone-icon" />
            <p className="studio-details-dropzone-title">Drag & drop images or videos here</p>
            <p className="studio-details-dropzone-sub">
              or click to browse — up to {MAX_MEDIA_FILES} files (
              {ACCEPTED_MEDIA_EXTENSIONS.map((ext) => ext.replace(".", "").toUpperCase()).join(", ")})
            </p>
          </div>
          {errors.media ? <span className="studio-field-error">{errors.media}</span> : null}

          {mediaPreviews.length > 0 ? (
            <div className="studio-details-media-grid">
              {mediaPreviews.map(({ file, url }, index) => (
                <div key={`${file.name}-${index}`} className="studio-details-media-tile">
                  {url ? (
                    <img src={url} alt={file.name} className="studio-details-media-thumb" />
                  ) : (
                    <div className="studio-details-media-thumb studio-details-media-thumb--video">
                      <VideoCameraOutlined />
                    </div>
                  )}
                  <div className="studio-details-media-meta">
                    <span className="studio-details-media-name">{file.name}</span>
                    <span className="studio-details-media-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="studio-details-media-remove"
                    onClick={() => removeMediaFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </Field>
      </div>

      <div className="studio-form-grid">
        <Field label="Service" required error={errors.service} full>
          <div className="studio-details-service-grid">
            {SERVICE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.label}
                className={`studio-option-card studio-details-service-card ${
                  data.service === option.label ? "studio-option-card--selected" : ""
                }`}
                onClick={() => setField("service", option.label)}
              >
                <span className="studio-option-card-icon">{option.icon}</span>
                <span className="studio-option-card-title">{option.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Specializations" required error={errors.specializations} full>
          <div className="studio-multiselect" ref={specRef}>
            <button
              type="button"
              className="studio-multiselect-trigger"
              onClick={() => setIsSpecOpen((open) => !open)}
            >
              {data.specializations.length === 0 ? (
                <span className="studio-multiselect-placeholder">Select specializations</span>
              ) : (
                <div className="studio-chip-list">
                  {data.specializations.map((item) => (
                    <span key={item} className="studio-chip">
                      {item}
                      <span
                        className="studio-chip-remove"
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSpecialization(item);
                        }}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <span className={`studio-multiselect-chevron ${isSpecOpen ? "studio-multiselect-chevron--open" : ""}`}>
                ⌄
              </span>
            </button>

            {isSpecOpen ? (
              <div className="studio-multiselect-dropdown">
                <input
                  className="studio-details-spec-search"
                  placeholder="Search specializations…"
                  value={specSearch}
                  onChange={(e) => setSpecSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                {filteredSpecOptions.length === 0 ? (
                  <p className="studio-details-spec-empty">No matches.</p>
                ) : (
                  filteredSpecOptions.map((option) => {
                    const checked = data.specializations.includes(option);
                    return (
                      <label key={option} className="studio-multiselect-option">
                        <input type="checkbox" checked={checked} onChange={() => toggleSpecialization(option)} />
                        {option}
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>
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