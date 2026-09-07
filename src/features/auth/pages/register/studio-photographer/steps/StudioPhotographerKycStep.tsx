import { useState } from "react";

export interface StudioPhotographerKycData {
  documentType: string;
  consentGiven: boolean;
  skipped: boolean;
}

interface StudioPhotographerKycStepProps {
  initialData: StudioPhotographerKycData;
  onBack: () => void;
  onContinue: (data: StudioPhotographerKycData) => void;
  onSkip: (data: StudioPhotographerKycData) => void;
}

export default function StudioPhotographerKycStep({
  initialData,
  onBack,
  onContinue,
  onSkip,
}: StudioPhotographerKycStepProps) {
  const [data, setData] = useState<StudioPhotographerKycData>(initialData);

  const updateKyc = (patch: Partial<StudioPhotographerKycData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  return (
    <>
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">KYC Verification</h2>
        <p className="studio-form-section-subtitle">Optional at this stage</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-field" style={{ maxWidth: 320 }}>
        <label className="studio-field-label">Document Type</label>
        <select
          className="studio-select"
          value={data.documentType}
          onChange={(e) => updateKyc({ documentType: e.target.value })}
        >
          <option value="aadhaar">Aadhaar</option>
          <option value="pan">PAN</option>
          <option value="dl">Driving Licence</option>
        </select>
      </div>

      <label className="studio-checkbox-option studio-terms-row">
        <input
          type="checkbox"
          checked={data.consentGiven}
          onChange={(e) => updateKyc({ consentGiven: e.target.checked, skipped: false })}
        />
        I consent to KYC verification
      </label>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack}>
          Back
        </button>
        <div className="studio-form-actions-right">
          <button
            type="button"
            className="studio-btn-secondary"
            onClick={() => {
              const skippedData = { ...data, skipped: true, consentGiven: false };
              setData(skippedData);
              onSkip(skippedData);
            }}
          >
            Skip KYC
          </button>
          <button type="button" className="studio-btn-primary" onClick={() => onContinue(data)}>
            Continue
          </button>
        </div>
      </div>
    </>
  );
}