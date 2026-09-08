import { useMemo, useState } from "react";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  FileTextOutlined,
  SolutionOutlined,
  EditOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import type { StudioManagerFormData } from "../StudioManagerRegisterPage";
import "./StudioManagerReviewStep.css";

type StepKey = "basic" | "kyc" | "portfolio" | "review";

interface StudioManagerReviewStepProps {
  data: StudioManagerFormData;
  onBack: () => void;
  onEditStep: (step: StepKey) => void;
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aadhaar: "AADHAAR",
  pan: "PAN CARD",
  driving_license: "DRIVING LICENSE",
  passport: "PASSPORT",
};

function formatAddress(parts: {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}) {
  // Build the state/country/postal fragment only from pieces that are
  // actually present, so a blank field doesn't leave a stray ", -" behind.
  const regionParts = [parts.state, parts.country].filter(Boolean).join(", ");
  const region = [regionParts, parts.postalCode].filter(Boolean).join(" - ");
  return [parts.address, parts.city, region].filter(Boolean).join(", ");
}

export default function StudioManagerReviewStep({
  data,
  onBack,
  onEditStep,
  onSubmit,
  submitting,
}: StudioManagerReviewStepProps) {
  const { basicInfo, kyc, portfolio } = data;
  const [justSubmitted, setJustSubmitted] = useState(false);

  const fullName = `${basicInfo.firstName} ${basicInfo.lastName}`.trim();

  const termsAcceptedDate = useMemo(
    () => new Date().toLocaleDateString("en-IN", { year: "numeric", month: "numeric", day: "numeric" }),
    []
  );

  const registrationMode =
    basicInfo.referral === "with" ? `Referral (${basicInfo.referralEmail})` : "Direct Sign Up";
  const kycDocLabel = DOCUMENT_TYPE_LABELS[kyc.documentType] ?? kyc.documentType.toUpperCase();
  const kycStatus = kyc.skipped ? "SKIPPED / PENDING" : kyc.consentGiven ? "VERIFIED" : "PENDING";
  const kycStatusTone = kyc.skipped ? "pending" : kyc.consentGiven ? "verified" : "pending";

  const residentialAddress = formatAddress(basicInfo);

  const handleSubmit = async () => {
    await onSubmit();
    setJustSubmitted(true);
  };

  return (
    <div className="smx-review-step">
      <div className="smx-section-header">
        <h2 className="smx-section-title">Review Your Application</h2>
        <p className="smx-section-subtitle">Confirm everything looks right before you submit</p>
      </div>
      <div className="smx-divider" />

      {/* Hero — printed like a contact sheet's title strip */}
      <div className="smx-review-hero">
        <span className="smx-review-hero-mark smx-review-hero-mark--tl" aria-hidden="true" />
        <span className="smx-review-hero-mark smx-review-hero-mark--tr" aria-hidden="true" />
        <span className="smx-review-hero-mark smx-review-hero-mark--bl" aria-hidden="true" />
        <span className="smx-review-hero-mark smx-review-hero-mark--br" aria-hidden="true" />

        <div className="smx-review-hero-top">
          <span className="smx-review-hero-pill">
            <span className="smx-review-hero-pill-dot" />
            Review Your Information
          </span>
        </div>
        <h1 className="smx-review-hero-name">{fullName || "—"}</h1>
        <span className="smx-review-hero-role">STUDIOMANAGER</span>

        <div className="smx-review-hero-meta">
          <span className="smx-review-badge smx-review-badge--verified">
            <CheckCircleFilled /> OTP Verified
          </span>
          {basicInfo.agreedToTerms ? (
            <span className="smx-review-hero-terms">✓ Terms accepted on {termsAcceptedDate}</span>
          ) : (
            <span className="smx-review-hero-terms smx-review-hero-terms--warn">Terms not accepted</span>
          )}
        </div>
      </div>

      {/* Personal & Account Identification */}
      <section className="smx-review-section">
        <div className="smx-review-section-heading">
          <h3 className="smx-review-section-title">
            <UserOutlined /> Personal &amp; Account Identification
          </h3>
          <EditLink onClick={() => onEditStep("basic")} />
        </div>
        <div className="smx-review-card">
          <div className="smx-review-grid">
            <ReviewField label="Contact Name" value={fullName} />
            <ReviewField label="Email Address" value={basicInfo.email} icon={<MailOutlined />} />
            <ReviewField label="Phone Contact" value={basicInfo.phone} icon={<PhoneOutlined />} />
            <ReviewField
              label="Residential Address"
              value={residentialAddress}
              icon={<EnvironmentOutlined />}
              full
            />
            <ReviewField label="Registration Mode" value={<span className="smx-review-tag">{registrationMode}</span>} />
          </div>
        </div>
      </section>

      {/* Government Identity & KYC Status */}
      <section className="smx-review-section">
        <div className="smx-review-section-heading">
          <h3 className="smx-review-section-title">
            <FileTextOutlined /> Government Identity &amp; KYC Status
          </h3>
          <EditLink onClick={() => onEditStep("kyc")} />
        </div>
        <div className="smx-review-card smx-review-card--centered">
          <div className="smx-review-kyc-row">
            <span className={`smx-review-kyc-icon smx-review-kyc-icon--${kycStatusTone}`}>
              {kycStatusTone === "verified" ? <CheckCircleFilled /> : <ExclamationCircleFilled />}
            </span>
            <div>
              <div className="smx-review-kyc-status-line">
                KYC verification:{" "}
                <span className={`smx-review-status-pill smx-review-status-pill--${kycStatusTone}`}>{kycStatus}</span>
              </div>
              <p className="smx-review-kyc-subtext">Authorized integration verification powered by Truthscreen.</p>
            </div>
          </div>

          {!kyc.skipped ? (
            <div className="smx-review-doc-chip">
              Document: <strong>{kycDocLabel}</strong>
            </div>
          ) : null}
        </div>
      </section>

      {/* Professional Qualifications */}
      <section className="smx-review-section">
        <div className="smx-review-section-heading">
          <h3 className="smx-review-section-title">
            <SolutionOutlined /> Professional Qualifications
          </h3>
          <EditLink onClick={() => onEditStep("portfolio")} />
        </div>
        <div className="smx-review-card">
          <div className="smx-review-field-block smx-review-field-block--full">
            <span className="smx-review-field-label">Biography &amp; Experience Overview</span>
            <div className="smx-review-bio-box">{portfolio.bio || "No bio provided."}</div>
          </div>

          <div className="smx-review-divider-thin" />

          <div className="smx-review-doc-row">
            <div className="smx-review-doc-row-icon">
              <FileTextOutlined />
            </div>
            <div className="smx-review-doc-row-body">
              <span className="smx-review-doc-row-title">Portfolio Sample Media</span>
              <span className="smx-review-doc-row-sub">
                {portfolio.media.length > 0
                  ? `${portfolio.media.length} file(s) attached`
                  : "No file attachments selected"}
              </span>
            </div>
            <span className="smx-review-optional-badge">OPTIONAL</span>
          </div>
        </div>
      </section>

      <div className="smx-actions">
        <button type="button" className="smx-btn-secondary" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <button
          type="button"
          className={`smx-btn-primary smx-review-submit-btn ${justSubmitted ? "smx-review-submit-btn--done" : ""}`}
          onClick={handleSubmit}
          disabled={submitting || justSubmitted}
        >
          {submitting ? (
            <>
              <LoadingOutlined /> Submitting…
            </>
          ) : justSubmitted ? (
            <>
              <CheckCircleFilled /> Submitted
            </>
          ) : (
            "Submit Application"
          )}
        </button>
      </div>
    </div>
  );
}

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="smx-review-edit-link" onClick={onClick}>
      <EditOutlined /> Edit
    </button>
  );
}

function ReviewField({
  label,
  value,
  icon,
  full,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`smx-review-field-block ${full ? "smx-review-field-block--full" : ""}`}>
      <span className="smx-review-field-label">{label}</span>
      <span className="smx-review-field-value">
        {icon ? <span className="smx-review-field-icon">{icon}</span> : null}
        {value || "—"}
      </span>
    </div>
  );
}