import {
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SolutionOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  LoadingOutlined,
} from "@ant-design/icons";
import type { StudioPhotographerFormData } from "../StudioPhotographerRegisterPage";
import "./StudioPhotographerReviewStep.css";

interface StudioPhotographerReviewStepProps {
  data: StudioPhotographerFormData;
  email: string;
  onBack: () => void;
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
}

export default function StudioPhotographerReviewStep({
  data,
  email,
  onBack,
  onSubmit,
  submitting,
}: StudioPhotographerReviewStepProps) {
  const { basicInfo, kyc, photographerDetails } = data;

  const kycTone = kyc.skipped ? "pending" : kyc.consentGiven ? "verified" : "pending";
  const kycLabel = kyc.skipped ? "Skipped" : kyc.consentGiven ? `Consented (${kyc.documentType})` : "Not consented";
  const address = [
    basicInfo.address,
    basicInfo.city,
    [basicInfo.state, basicInfo.country].filter(Boolean).join(", "),
    basicInfo.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Review &amp; Submit</h2>
        <p className="studio-form-section-subtitle">Confirm your details before submitting</p>
      </div>
      <div className="studio-form-divider" />

      <section className="studio-review-section">
        <h3 className="studio-review-section-title">
          <UserOutlined /> Personal Details
        </h3>
        <div className="studio-review-card">
          <div className="studio-form-grid">
            <div className="studio-form-field">
              <label className="studio-field-label">Name</label>
              <span>
                {basicInfo.firstName} {basicInfo.lastName}
              </span>
            </div>
            <div className="studio-form-field">
              <label className="studio-field-label">Email</label>
              <span>{email}</span>
            </div>
            <div className="studio-form-field">
              <label className="studio-field-label">
                <PhoneOutlined /> Phone
              </label>
              <span>{basicInfo.phone}</span>
            </div>
            <div className="studio-form-field studio-form-field--full">
              <label className="studio-field-label">
                <EnvironmentOutlined /> Address
              </label>
              <span>{address || "—"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="studio-review-section">
        <h3 className="studio-review-section-title">
          <FileTextOutlined /> KYC Status
        </h3>
        <div className="studio-review-card studio-review-card--row">
          <span className={`studio-review-kyc-icon studio-review-kyc-icon--${kycTone}`}>
            {kycTone === "verified" ? <CheckCircleFilled /> : <ExclamationCircleFilled />}
          </span>
          <span className={`studio-review-status-pill studio-review-status-pill--${kycTone}`}>{kycLabel}</span>
        </div>
      </section>

      <section className="studio-review-section">
        <h3 className="studio-review-section-title">
          <SolutionOutlined /> Photography Details
        </h3>
        <div className="studio-review-card">
          <div className="studio-form-grid">
            <div className="studio-form-field">
              <label className="studio-field-label">Years of Experience</label>
              <span>{photographerDetails.yearsExperience || "—"}</span>
            </div>
            <div className="studio-form-field studio-form-field--full">
              <label className="studio-field-label">Equipment</label>
              <span>{photographerDetails.equipment || "—"}</span>
            </div>
            <div className="studio-form-field studio-form-field--full">
              <label className="studio-field-label">Specializations</label>
              {photographerDetails.specializations.length > 0 ? (
                <div className="studio-review-chip-row">
                  {photographerDetails.specializations.map((spec) => (
                    <span key={spec} className="studio-review-chip">
                      {spec}
                    </span>
                  ))}
                </div>
              ) : (
                <span>None selected</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <div className="studio-form-actions-right">
          <button type="button" className="studio-btn-primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <LoadingOutlined /> Submitting…
              </>
            ) : (
              "Submit Application"
            )}
          </button>
        </div>
      </div>
    </>
  );
}