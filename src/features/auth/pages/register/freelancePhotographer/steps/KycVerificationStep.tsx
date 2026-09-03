import { useState } from "react";
import {IdcardOutlined,CreditCardOutlined,CarOutlined,BookOutlined,QuestionCircleOutlined,SafetyCertificateFilled,} from "@ant-design/icons";
import "./KycVerificationStep.css";

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

const DOCUMENT_OPTIONS: { type: DocumentType; label: string; hint: string; icon: React.ReactNode }[] = [
  { type: "aadhaar", label: "Aadhaar", hint: "12-digit UIDAI number", icon: <IdcardOutlined /> },
  { type: "pan", label: "PAN Card", hint: "10-character tax ID", icon: <CreditCardOutlined /> },
  { type: "driving_license", label: "Driving License", hint: "State-issued DL number", icon: <CarOutlined /> },
  { type: "passport", label: "Passport", hint: "8-character passport no.", icon: <BookOutlined /> },
];

type VerifyState = "idle" | "scanning" | "done";

export default function KycVerificationStep({ initialData, onBack, onContinue, onSkip }: KycVerificationStepProps) {
  const [documentType, setDocumentType] = useState<DocumentType>(initialData.documentType);
  const [consentGiven, setConsentGiven] = useState(initialData.consentGiven);
  const [consentError, setConsentError] = useState<string | undefined>();
  const [whyOpen, setWhyOpen] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");

  const handleVerifyAndContinue = () => {
    if (!consentGiven) {
      setConsentError("You must consent to KYC verification to continue.");
      return;
    }
    if (verifyState !== "idle") return;

    // A short, honest "checking" moment — this only reflects local form
    // state today; wire it up to the real Truthscreen call when it's ready.
    setVerifyState("scanning");
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

  const selectedOption = DOCUMENT_OPTIONS.find((o) => o.type === documentType);

  return (
    <div className="kyc-verification-step">
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">KYC Verification</h2>
        <p className="studio-form-section-subtitle">Verify your identity with a government-issued document</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-field studio-form-field--full">
        <label className="studio-field-label">
          <span className="studio-required-star">*</span> Document Type
        </label>
        <div className="kyc-doc-grid">
          {DOCUMENT_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.type}
              className={`studio-option-card kyc-doc-card ${
                documentType === option.type ? "studio-option-card--selected" : ""
              }`}
              onClick={() => setDocumentType(option.type)}
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

      <div className="kyc-scan-panel">
        <div className={`kyc-scan-frame kyc-scan-frame--${verifyState}`}>
          <span className="kyc-scan-frame-icon">{selectedOption?.icon}</span>
          <span className="kyc-scan-frame-label">
            {verifyState === "idle" && `${selectedOption?.label} pending verification`}
            {verifyState === "scanning" && "Verifying with Truthscreen…"}
            {verifyState === "done" && "Verified"}
          </span>
          {verifyState === "scanning" ? <span className="kyc-scan-beam" aria-hidden="true" /> : null}
          {verifyState === "done" ? <SafetyCertificateFilled className="kyc-scan-check" /> : null}
        </div>
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

        <button type="button" className="kyc-why-toggle" onClick={() => setWhyOpen((o) => !o)}>
          <QuestionCircleOutlined /> Why do we need this?
        </button>
        {whyOpen ? (
          <div className="kyc-why-panel">
            <p>
              We verify studio admins so photographers and clients can trust who they're booking with. Your{" "}
              {selectedOption?.label.toLowerCase()} number is sent securely to Truthscreen for a one-time check —
              we don't store the raw document, only the verification result.
            </p>
          </div>
        ) : null}
      </div>

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
          <button type="button" className="studio-btn-primary" onClick={handleVerifyAndContinue}>
            {verifyState === "idle" && "Verify & Continue"}
            {verifyState === "scanning" && "Verifying…"}
            {verifyState === "done" && "Verified ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}