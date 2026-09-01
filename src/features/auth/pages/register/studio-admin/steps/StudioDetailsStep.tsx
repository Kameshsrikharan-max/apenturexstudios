import { useState } from "react";

export interface StudioDetailsData {
  studioName: string;
  phone: string;
  bio: string;
}

interface StudioDetailsStepProps {
  initialData: StudioDetailsData;
  onBack: () => void;
  onContinue: (data: StudioDetailsData) => void;
}

type FieldErrors = Partial<Record<keyof StudioDetailsData, string>>;

const PHONE_PATTERN = /^\d{10}$/;
const BIO_MIN_LENGTH = 20;

export default function StudioDetailsStep({ initialData, onBack, onContinue }: StudioDetailsStepProps) {
  const [data, setData] = useState<StudioDetailsData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});

  const setField = <K extends keyof StudioDetailsData>(field: K, value: StudioDetailsData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!data.studioName.trim()) {
      next.studioName = "This field is required.";
    }

    if (!data.phone.trim()) {
      next.phone = "This field is required.";
    } else if (!PHONE_PATTERN.test(data.phone)) {
      next.phone = "Enter a valid 10-digit phone number.";
    }

    if (!data.bio.trim()) {
      next.bio = "This field is required.";
    } else if (data.bio.trim().length < BIO_MIN_LENGTH) {
      next.bio = `Tell us a bit more — at least ${BIO_MIN_LENGTH} characters.`;
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
    data.studioName.trim() && PHONE_PATTERN.test(data.phone) && data.bio.trim().length >= BIO_MIN_LENGTH;

  return (
    <div className="studio-details-step">
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Portfolio Information</h2>
        <p className="studio-form-section-subtitle">Tell us about your studio</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-grid">
        <div className="studio-form-field studio-form-field--full">
          <label className="studio-field-label">
            <span className="studio-required-star">*</span> Studio Name
          </label>
          <input
            className="studio-input"
            placeholder="e.g., Artisan Photography Studio"
            value={data.studioName}
            onChange={(e) => setField("studioName", e.target.value)}
          />
          {errors.studioName ? <span className="studio-field-error">{errors.studioName}</span> : null}
        </div>

        <div className="studio-form-field studio-form-field--full">
          <label className="studio-field-label">
            <span className="studio-required-star">*</span> Phone Number
          </label>
          <input
            className="studio-input"
            placeholder="9874563210"
            value={data.phone}
            onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
          {errors.phone ? <span className="studio-field-error">{errors.phone}</span> : null}
        </div>

        <div className="studio-form-field studio-form-field--full">
          <label className="studio-field-label">
            <span className="studio-required-star">*</span> Professional Bio
          </label>
          <textarea
            className="studio-textarea"
            placeholder="Tell us about your photography journey, style, achievements, and what makes you unique..."
            value={data.bio}
            onChange={(e) => setField("bio", e.target.value)}
            rows={6}
          />
          {errors.bio ? <span className="studio-field-error">{errors.bio}</span> : null}
        </div>
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