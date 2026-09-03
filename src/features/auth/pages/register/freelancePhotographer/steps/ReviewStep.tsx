import { useMemo, useState } from "react";
import {UserOutlined,MailOutlined,PhoneOutlined,EnvironmentOutlined,CheckCircleFilled,ExclamationCircleFilled,SolutionOutlined,CompassOutlined,ExportOutlined,FileTextOutlined,EditOutlined,LoadingOutlined,InstagramOutlined,LinkOutlined,} from "@ant-design/icons";
import type { FreelancePhotographerFormData } from "../FreelancePhotographerRegisterPage";
import "./ReviewStep.css";

type StepKey = "basic" | "kyc" | "profile" | "workarea" | "review";

interface ReviewStepProps {
  data: FreelancePhotographerFormData;
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
  return [parts.address, parts.city, `${parts.state}, ${parts.country} - ${parts.postalCode}`]
    .filter(Boolean)
    .join(", ");
}

export default function ReviewStep({ data, onBack, onEditStep, onSubmit, submitting }: ReviewStepProps) {
  const { basicInfo, kyc, photographerDetails, workArea } = data;
  const [justSubmitted, setJustSubmitted] = useState(false);

  const fullName = `${basicInfo.firstName} ${basicInfo.lastName}`.trim();

  const termsAcceptedDate = useMemo(
    () => new Date().toLocaleDateString("en-IN", { year: "numeric", month: "numeric", day: "numeric" }),
    []
  );

  const registrationMode = basicInfo.referral === "with" ? "Referral Sign Up" : "Direct Sign Up";
  const kycDocLabel = DOCUMENT_TYPE_LABELS[kyc.documentType] ?? kyc.documentType.toUpperCase();
  const kycStatus = kyc.skipped ? "SKIPPED / PENDING" : kyc.consentGiven ? "VERIFIED" : "PENDING";
  const kycStatusTone = kyc.skipped ? "pending" : kyc.consentGiven ? "verified" : "pending";

  const residentialAddress = formatAddress(basicInfo);
  const baseAddress = formatAddress(photographerDetails);

  const handleSubmit = async () => {
    await onSubmit();
    setJustSubmitted(true);
  };

  return (
    <div className="review-step">
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Review Your Application</h2>
        <p className="studio-form-section-subtitle">Confirm everything looks right before you submit</p>
      </div>
      <div className="studio-form-divider" />

      {/* Hero */}
      <div className="review-hero">
        <span className="review-hero-mark review-hero-mark--tl" aria-hidden="true" />
        <span className="review-hero-mark review-hero-mark--tr" aria-hidden="true" />
        <span className="review-hero-mark review-hero-mark--bl" aria-hidden="true" />
        <span className="review-hero-mark review-hero-mark--br" aria-hidden="true" />

        <div className="review-hero-top">
          <span className="review-hero-pill">
            <span className="review-hero-pill-dot" />
            Review Your Information
          </span>
        </div>
        <h1 className="review-hero-name">{photographerDetails.displayName || fullName || "—"}</h1>
        <span className="review-hero-role">FREELANCE PHOTOGRAPHER</span>

        <div className="review-hero-meta">
          <span className="review-badge review-badge--verified">
            <CheckCircleFilled /> OTP Verified
          </span>
          {basicInfo.agreedToTerms ? (
            <span className="review-hero-terms">✓ Terms accepted on {termsAcceptedDate}</span>
          ) : (
            <span className="review-hero-terms review-hero-terms--warn">Terms not accepted</span>
          )}
        </div>
      </div>

      {/* Personal & Account Identification */}
      <section className="review-section">
        <div className="review-section-heading">
          <h3 className="review-section-title">
            <UserOutlined /> Personal &amp; Account Identification
          </h3>
          <EditLink onClick={() => onEditStep("basic")} />
        </div>
        <div className="review-card">
          <div className="review-grid">
            <ReviewField label="Contact Name" value={fullName} />
            <ReviewField label="Email Address" value={basicInfo.email} icon={<MailOutlined />} />
            <ReviewField label="Phone Contact" value={basicInfo.phone} icon={<PhoneOutlined />} />
            <ReviewField
              label="Residential Address"
              value={residentialAddress}
              icon={<EnvironmentOutlined />}
              full
            />
            <ReviewField label="Registration Mode" value={<span className="review-tag">{registrationMode}</span>} />
          </div>
        </div>
      </section>

      {/* Government Identity & KYC Status */}
      <section className="review-section">
        <div className="review-section-heading">
          <h3 className="review-section-title">
            <FileTextOutlined /> Government Identity &amp; KYC Status
          </h3>
          <EditLink onClick={() => onEditStep("kyc")} />
        </div>
        <div className="review-card review-card--centered">
          <div className="review-kyc-row">
            <span className={`review-kyc-icon review-kyc-icon--${kycStatusTone}`}>
              {kycStatusTone === "verified" ? <CheckCircleFilled /> : <ExclamationCircleFilled />}
            </span>
            <div>
              <div className="review-kyc-status-line">
                KYC verification:{" "}
                <span className={`review-status-pill review-status-pill--${kycStatusTone}`}>{kycStatus}</span>
              </div>
              <p className="review-kyc-subtext">Authorized integration verification powered by Truthscreen.</p>
            </div>
          </div>

          {!kyc.skipped ? (
            <div className="review-doc-chip">
              Document: <strong>{kycDocLabel}</strong>
            </div>
          ) : null}

          {workArea.documentType && workArea.documentFile ? (
            <div className="review-doc-chip review-doc-chip--secondary">
              {workArea.documentType}: <strong>{workArea.documentFile.name}</strong>
            </div>
          ) : null}
        </div>
      </section>

      {/* Professional Profile */}
      <section className="review-section">
        <div className="review-section-heading">
          <h3 className="review-section-title">
            <SolutionOutlined /> Professional Profile
          </h3>
          <EditLink onClick={() => onEditStep("profile")} />
        </div>
        <div className="review-card">
          <div className="review-grid-2">
            <div className="review-field-block">
              <span className="review-field-label">Display Name</span>
              <span className="review-field-value review-field-value--hero">
                {photographerDetails.displayName || "—"}
              </span>
            </div>
            <div className="review-field-block">
              <span className="review-field-label">Phone</span>
              <span className="review-field-value">{photographerDetails.phone || "—"}</span>
            </div>
          </div>

          <div className="review-grid-2">
            <div className="review-field-block">
              <span className="review-field-label">Years of Experience</span>
              <span className="review-tag">{photographerDetails.yearsExperience || "—"}</span>
            </div>
            {photographerDetails.equipment ? (
              <div className="review-field-block">
                <span className="review-field-label">Camera &amp; Gear</span>
                <span className="review-field-value">{photographerDetails.equipment}</span>
              </div>
            ) : null}
          </div>

          <div className="review-divider-thin" />

          <div className="review-field-block review-field-block--full">
            <span className="review-field-label">Biography &amp; Experience Overview</span>
            <div className="review-bio-box">{photographerDetails.bio || "No bio provided."}</div>
          </div>

          {photographerDetails.service ? (
            <div className="review-field-block review-field-block--full">
              <span className="review-field-label">Primary Service</span>
              <span className="review-tag">{photographerDetails.service}</span>
            </div>
          ) : null}

          {photographerDetails.specializations.length > 0 ? (
            <div className="review-field-block review-field-block--full">
              <span className="review-field-label">Specializations</span>
              <div className="review-spec-list">
                {photographerDetails.specializations.map((s) => (
                  <span key={s} className="review-spec-item">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {photographerDetails.instagramLink || photographerDetails.portfolioLink ? (
            <div className="review-field-block review-field-block--full">
              <span className="review-field-label">Portfolio Links</span>
              <div className="review-link-list">
                {photographerDetails.instagramLink ? (
                  <a
                    className="review-link-item"
                    href={photographerDetails.instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <InstagramOutlined /> Instagram <ExportOutlined className="review-link-item-icon" />
                  </a>
                ) : null}
                {photographerDetails.portfolioLink ? (
                  <a
                    className="review-link-item"
                    href={photographerDetails.portfolioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkOutlined /> Website <ExportOutlined className="review-link-item-icon" />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {photographerDetails.media.length > 0 ? (
            <div className="review-field-block review-field-block--full">
              <span className="review-field-label">Portfolio Media</span>
              <span className="review-field-value">{photographerDetails.media.length} file(s) attached</span>
            </div>
          ) : null}
        </div>
      </section>

      {/* Work Area */}
      <section className="review-section">
        <div className="review-section-heading">
          <h3 className="review-section-title">
            <CompassOutlined /> Work Area
          </h3>
          <EditLink onClick={() => onEditStep("workarea")} />
        </div>
        <div className="review-card review-card--map">
          <div className="review-map-visual">
            <div className="review-map-pin-wrap">
              <div className="review-map-pin">
                <EnvironmentOutlined />
              </div>
              <span className="review-map-label">{photographerDetails.displayName || "Base Location"}</span>
            </div>
          </div>

          <div className="review-map-footer">
            <div className="review-map-name">{photographerDetails.displayName || "—"}</div>
            <div className="review-map-address">{baseAddress || "No address provided"}</div>

            {workArea.travelRadius ? (
              <span className="review-tag review-travel-tag">
                <CompassOutlined /> {workArea.travelRadius}
              </span>
            ) : null}

            {workArea.mapsLink ? (
              <a
                className="review-map-url-row"
                href={workArea.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
              >
                <span className="review-map-url">{workArea.mapsLink}</span>
                <ExportOutlined className="review-map-url-icon" />
              </a>
            ) : (
              <div className="review-map-url-row review-map-url-row--empty">No maps link provided</div>
            )}
          </div>
        </div>
      </section>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <button
          type="button"
          className={`studio-btn-primary review-submit-btn ${justSubmitted ? "review-submit-btn--done" : ""}`}
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
    <button type="button" className="review-edit-link" onClick={onClick}>
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
    <div className={`review-field-block ${full ? "review-field-block--full" : ""}`}>
      <span className="review-field-label">{label}</span>
      <span className="review-field-value">
        {icon ? <span className="review-field-icon">{icon}</span> : null}
        {value || "—"}
      </span>
    </div>
  );
}