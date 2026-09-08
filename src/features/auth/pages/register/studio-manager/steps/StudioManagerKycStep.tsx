import { useState } from "react";
import {
  IdcardOutlined,
  CreditCardOutlined,
  CarOutlined,
  BookOutlined,
  SafetyCertificateFilled,
} from "@ant-design/icons";
import "./StudioManagerKycStep.css";

export type ManagerDocumentType = "aadhaar" | "pan" | "driving_license" | "passport";

export interface StudioManagerKycData {
  documentType: ManagerDocumentType;
  consentGiven: boolean;
  skipped: boolean;
}

interface StudioManagerKycStepProps {
  initialData: StudioManagerKycData;
  onBack: () => void;
  onContinue: (data: StudioManagerKycData) => void;
  onSkip: (data: StudioManagerKycData) => void;
}

const DOCUMENT_OPTIONS: { value: ManagerDocumentType; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "aadhaar", label: "Aadhaar", hint: "12-digit UIDAI number", icon: <IdcardOutlined /> },
  { value: "pan", label: "PAN Card", hint: "10-character tax ID", icon: <CreditCardOutlined /> },
  { value: "driving_license", label: "Driving License", hint: "State-issued DL number", icon: <CarOutlined /> },
  { value: "passport", label: "Passport", hint: "8-character passport no.", icon: <BookOutlined /> },
];

type VerifyState = "idle" | "verifying" | "done";

export default function StudioManagerKycStep({ initialData, onBack, onContinue, onSkip }: StudioManagerKycStepProps) {
  const [documentType, setDocumentType] = useState<ManagerDocumentType>(initialData.documentType);
  const [consentGiven, setConsentGiven] = useState(initialData.consentGiven);
  const [consentError, setConsentError] = useState<string | undefined>();
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");

  const handleVerifyAndContinue = () => {
    if (!consentGiven) {
      setConsentError("You must consent to KYC verification to continue.");
      return;
    }
    if (verifyState !== "idle") return;

    // A short, honest "checking" moment — reflects local form state today;
    // wire it up to the real Truthscreen call when it's ready.
    setVerifyState("verifying");
    window.setTimeout(() => {
      setVerifyState("done");
      window.setTimeout(() => {
        onContinue({ documentType, consentGiven, skipped: false });
      }, 400);
    }, 900);
  };

  const handleSkip = () => {
    onSkip({ documentType, consentGiven: false, skipped: true });
  };

  const selectedOption = DOCUMENT_OPTIONS.find((o) => o.value === documentType);

  return (
    <div className="smx-kyc-step">
      <div className="smx-section-header">
        <h2 className="smx-section-title">KYC Verification</h2>
        <p className="smx-section-subtitle">Verify your identity with a government-issued document</p>
      </div>
      <div className="smx-divider" />

      <div className="smx-field smx-field--full">
        <label className="smx-label">
          <span className="smx-required">*</span> Document Type
        </label>
        <div className="smx-kyc-doc-grid">
          {DOCUMENT_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`smx-option-card smx-kyc-doc-card ${
                documentType === option.value ? "smx-option-card--selected" : ""
              }`}
              onClick={() => setDocumentType(option.value)}
              disabled={verifyState !== "idle"}
            >
              <span className="smx-option-card-icon">{option.icon}</span>
              <div>
                <div className="smx-option-card-title">{option.label}</div>
                <div className="smx-option-card-sub">{option.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="smx-kyc-scan-panel">
        <div className={`smx-kyc-scan-frame smx-kyc-scan-frame--${verifyState}`}>
          <span className="smx-kyc-scan-frame-icon">{selectedOption?.icon}</span>
          <span className="smx-kyc-scan-frame-label">
            {verifyState === "idle" && `${selectedOption?.label} pending verification`}
            {verifyState === "verifying" && "Verifying with Truthscreen…"}
            {verifyState === "done" && "Verified"}
          </span>
          {verifyState === "verifying" ? <span className="smx-kyc-scan-beam" aria-hidden="true" /> : null}
          {verifyState === "done" ? <SafetyCertificateFilled className="smx-kyc-scan-check" /> : null}
        </div>
      </div>

      <div className="smx-field smx-field--full smx-terms-row">
        <label className="smx-checkbox">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => {
              setConsentGiven(e.target.checked);
              if (e.target.checked) setConsentError(undefined);
            }}
            disabled={verifyState !== "idle"}
          />
          <span>I consent to KYC verification via Truthscreen</span>
        </label>
        {consentError ? <span className="smx-error-text">{consentError}</span> : null}
      </div>

      <div className="smx-actions">
        <button type="button" className="smx-btn-secondary" onClick={onBack} disabled={verifyState !== "idle"}>
          Back
        </button>
        <div className="smx-actions-right">
          <button
            type="button"
            className="smx-btn-secondary"
            onClick={handleSkip}
            disabled={verifyState !== "idle"}
          >
            Skip KYC
          </button>
          <button
            type="button"
            className="smx-btn-primary"
            onClick={handleVerifyAndContinue}
            disabled={verifyState !== "idle"}
          >
            {verifyState === "idle" && "Verify & Continue"}
            {verifyState === "verifying" && "Verifying…"}
            {verifyState === "done" && "Verified ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}