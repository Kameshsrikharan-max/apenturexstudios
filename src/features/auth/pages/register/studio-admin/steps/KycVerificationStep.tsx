import { useState } from "react";

export type DocumentType = "aadhaar" | "pan" | "driving_license" | "passport";

export interface KycData {
  documentType: DocumentType;
  consentGiven: boolean;
  skipped: boolean;
}

interface KycVerificationStepProps {
  initialData: KycData;
  onBack: () => void;
  onContinue: (data: KycData) => void;
  onSkip: (data: KycData) => void;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN Card",
  driving_license: "Driving License",
  passport: "Passport",
};

export default function KycVerificationStep({ initialData, onBack, onContinue, onSkip }: KycVerificationStepProps) {
  const [documentType, setDocumentType] = useState<DocumentType>(initialData.documentType);
  const [consentGiven, setConsentGiven] = useState(initialData.consentGiven);
  const [consentError, setConsentError] = useState<string | undefined>();

  const handleVerifyAndContinue = () => {
    if (!consentGiven) {
      setConsentError("You must consent to KYC verification to continue.");
      return;
    }
    onContinue({ documentType, consentGiven, skipped: false });
  };

  const handleSkip = () => {
    onSkip({ documentType, consentGiven: false, skipped: true });
  };

  return (
    <div className="kyc-verification-step">
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">KYC Verification</h2>
        <p className="studio-form-section-subtitle">Aadhaar</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-field studio-form-field--full">
        <label className="studio-field-label">
          <span className="studio-required-star">*</span> Document Type
        </label>
        <select
          className="studio-select"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
        >
          {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => (
            <option key={type} value={type}>
              {DOCUMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="studio-form-field studio-form-field--full studio-terms-row">
        <label className="studio-checkbox-option">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => {
              setConsentGiven(e.target.checked);
              if (e.target.checked) setConsentError(undefined);
            }}
          />
          <span>I consent to KYC verification via Truthscreen</span>
        </label>
        {consentError ? <span className="studio-field-error">{consentError}</span> : null}
      </div>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack}>
          Back
        </button>
        <div className="studio-form-actions-right">
          <button type="button" className="studio-btn-secondary" onClick={handleSkip}>
            Skip KYC
          </button>
          <button type="button" className="studio-btn-primary" onClick={handleVerifyAndContinue}>
            Verify &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}