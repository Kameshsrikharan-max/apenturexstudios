import { useEffect, useMemo, useRef, useState } from "react";
import { InboxOutlined, VideoCameraOutlined } from "@ant-design/icons";
import "./StudioManagerPortfolioStep.css";

export interface StudioManagerPortfolioData {
  bio: string;
  media: File[];
}

interface StudioManagerPortfolioStepProps {
  initialData: StudioManagerPortfolioData;
  onBack: () => void;
  onContinue: (data: StudioManagerPortfolioData) => void;
}

const BIO_MIN_LENGTH = 20;
const BIO_MAX_LENGTH = 1000;
const MAX_MEDIA_FILES = 10;
const ACCEPTED_MEDIA_EXTENSIONS = [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".avi", ".webm"];
const ACCEPTED_MEDIA_ATTR = "image/jpeg,image/png,video/mp4,video/quicktime,video/x-msvideo,video/webm";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export default function StudioManagerPortfolioStep({
  initialData,
  onBack,
  onContinue,
}: StudioManagerPortfolioStepProps) {
  const [data, setData] = useState<StudioManagerPortfolioData>(initialData);
  const [bioError, setBioError] = useState<string | undefined>();
  const [mediaError, setMediaError] = useState<string | undefined>();
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

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

  const setBio = (value: string) => {
    setData((prev) => ({ ...prev, bio: value.slice(0, BIO_MAX_LENGTH) }));
    if (bioError) setBioError(undefined);
  };

  const addMediaFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const combined = [...data.media, ...incoming];

    if (combined.length > MAX_MEDIA_FILES) {
      setMediaError(`You can upload up to ${MAX_MEDIA_FILES} files.`);
      setData((prev) => ({ ...prev, media: combined.slice(0, MAX_MEDIA_FILES) }));
    } else {
      setMediaError(undefined);
      setData((prev) => ({ ...prev, media: combined }));
    }
  };

  const handleMediaSelect = (fileList: FileList | null) => {
    if (!fileList) return;
    addMediaFiles(Array.from(fileList));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMediaFile = (index: number) => {
    setData((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
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

  const bioTrimmedLength = data.bio.trim().length;
  const isBioValid = bioTrimmedLength >= BIO_MIN_LENGTH;
  const isValidLooking = isBioValid;

  const handleContinue = () => {
    if (!data.bio.trim()) {
      setBioError("This field is required.");
      return;
    }
    if (!isBioValid) {
      setBioError(`Tell us a bit more — at least ${BIO_MIN_LENGTH} characters.`);
      return;
    }
    onContinue(data);
  };

  return (
    <div className="smx-portfolio-step">
      <div className="smx-section-header">
        <h2 className="smx-section-title">Portfolio Information</h2>
        <p className="smx-section-subtitle">Share your photography background</p>
      </div>
      <div className="smx-divider" />

      <div className="smx-field smx-field--full">
        <label className="smx-label">
          <span className="smx-required">*</span> Professional Bio
        </label>
        <textarea
          className={`smx-textarea ${bioError ? "smx-input--invalid" : ""}`}
          placeholder="Tell us about your photography journey, style, achievements, and what makes you unique..."
          value={data.bio}
          onChange={(e) => setBio(e.target.value)}
          rows={8}
        />
        <div className="smx-portfolio-bio-footer">
          <span className="smx-char-count">
            {data.bio.length} / {BIO_MAX_LENGTH}
          </span>
        </div>
        {bioError ? <span className="smx-error-text">{bioError}</span> : null}
      </div>

      <div className="smx-field smx-field--full">
        <label className="smx-label">Portfolio Sample Media (Optional)</label>
        <input
          ref={fileInputRef}
          type="file"
          className="smx-file-hidden"
          accept={ACCEPTED_MEDIA_ATTR}
          multiple
          onChange={(e) => handleMediaSelect(e.target.files)}
        />

        <div
          className={`smx-dropzone ${isDraggingMedia ? "smx-dropzone--active" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => data.media.length < MAX_MEDIA_FILES && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <InboxOutlined className="smx-dropzone-icon" />
          <p className="smx-dropzone-title">Drag &amp; drop images or videos here</p>
          <p className="smx-dropzone-sub">
            or click to browse — up to {MAX_MEDIA_FILES} files (
            {ACCEPTED_MEDIA_EXTENSIONS.map((ext) => ext.replace(".", "").toUpperCase()).join(", ")})
          </p>
        </div>
        {mediaError ? <span className="smx-error-text">{mediaError}</span> : null}

        {mediaPreviews.length > 0 ? (
          <div className="smx-media-grid">
            {mediaPreviews.map(({ file, url }, index) => (
              <div key={`${file.name}-${index}`} className="smx-media-tile">
                {url ? (
                  <img src={url} alt={file.name} className="smx-media-thumb" />
                ) : (
                  <div className="smx-media-thumb smx-media-thumb--video">
                    <VideoCameraOutlined />
                  </div>
                )}
                <div className="smx-media-meta">
                  <span className="smx-media-name">{file.name}</span>
                  <span className="smx-media-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="smx-media-remove"
                  onClick={() => removeMediaFile(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="smx-actions">
        <button type="button" className="smx-btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="smx-btn-primary" disabled={!isValidLooking} onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}