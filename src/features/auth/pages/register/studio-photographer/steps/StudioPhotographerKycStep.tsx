import { useState } from "react";
import {
  IdcardOutlined,
  CreditCardOutlined,
  CarOutlined,
  SafetyCertificateFilled,
} from "@ant-design/icons";
import "./StudioPhotographerKycStep.css";

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

const DOCUMENT_OPTIONS: { value: string; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "aadhaar", label: "Aadhaar", hint: "12-digit UIDAI number", icon: <IdcardOutlined /> },
  { value: "pan", label: "PAN", hint: "10-character tax ID", icon: <CreditCardOutlined /> },
  { value: "dl", label: "Driving Licence", hint: "State-issued DL number", icon: <CarOutlined /> },
];

type VerifyState = "idle" | "verifying" | "done";

export default function StudioPhotographerKycStep({
  initialData,
  onBack,
  onContinue,
  onSkip,
}: StudioPhotographerKycStepProps) {
  const [data, setData] = useState<StudioPhotographerKycData>(initialData);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");

  const updateKyc = (patch: Partial<StudioPhotographerKycData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const selectedOption = DOCUMENT_OPTIONS.find((o) => o.value === data.documentType);

  const handleContinue = () => {
    if (verifyState !== "idle") return;
    if (!data.consentGiven) {
      onContinue(data);
      return;
    }
    setVerifyState("verifying");
    window.setTimeout(() => {
      setVerifyState("done");
      window.setTimeout(() => onContinue(data), 400);
    }, 900);
  };

  const handleSkip = () => {
    const skippedData = { ...data, skipped: true, consentGiven: false };
    setData(skippedData);
    onSkip(skippedData);
  };

  return (
    <>
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">KYC Verification</h2>
        <p className="studio-form-section-subtitle">Optional at this stage</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-field studio-form-field--full">
        <label className="studio-field-label">Document Type</label>
        <div className="studio-kyc-doc-grid">
          {DOCUMENT_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`studio-option-card studio-kyc-doc-card ${
                data.documentType === option.value ? "studio-option-card--selected" : ""
              }`}
              onClick={() => updateKyc({ documentType: option.value })}
              disabled={verifyState !== "idle"}
            >
              <span className="studio-option-card-icon">{option.icon}</span>
              <div>
                <div className="studio-option-card-title">{option.label}</div>
                <div className="studio-option-card-sub">{option.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="studio-kyc-scan-panel">
        <div className={`studio-kyc-scan-frame studio-kyc-scan-frame--${verifyState}`}>
          <span className="studio-kyc-scan-frame-icon">{selectedOption?.icon}</span>
          <span className="studio-kyc-scan-frame-label">
            {verifyState === "idle" && `${selectedOption?.label ?? "Document"} — consent not yet given`}
            {verifyState === "verifying" && "Verifying with Truthscreen…"}
            {verifyState === "done" && "Verified"}
          </span>
          {verifyState === "verifying" ? <span className="studio-kyc-scan-beam" aria-hidden="true" /> : null}
          {verifyState === "done" ? <SafetyCertificateFilled className="studio-kyc-scan-check" /> : null}
        </div>
      </div>

      <label className="studio-checkbox-option studio-terms-row">
        <input
          type="checkbox"
          checked={data.consentGiven}
          onChange={(e) => updateKyc({ consentGiven: e.target.checked, skipped: false })}
          disabled={verifyState !== "idle"}
        />
        I consent to KYC verification
      </label>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack} disabled={verifyState !== "idle"}>
          Back
        </button>
        <div className="studio-form-actions-right">
          <button
            type="button"
            className="studio-btn-secondary"
            onClick={handleSkip}
            disabled={verifyState !== "idle"}
          >
            Skip KYC
          </button>
          <button type="button" className="studio-btn-primary" onClick={handleContinue} disabled={verifyState !== "idle"}>
            {verifyState === "idle" && "Continue"}
            {verifyState === "verifying" && "Verifying…"}
            {verifyState === "done" && "Verified ✓"}
          </button>
        </div>
      </div>
    </>
  );
}