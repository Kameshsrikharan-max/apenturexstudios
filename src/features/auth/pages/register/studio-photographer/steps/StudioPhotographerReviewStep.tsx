import type { StudioPhotographerFormData } from "../StudioPhotographerRegisterPage";

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

  return (
    <>
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Review &amp; Submit</h2>
        <p className="studio-form-section-subtitle">Confirm your details before submitting</p>
      </div>
      <div className="studio-form-divider" />

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
          <label className="studio-field-label">Phone</label>
          <span>{basicInfo.phone}</span>
        </div>
        <div className="studio-form-field studio-form-field--full">
          <label className="studio-field-label">Address</label>
          <span>
            {basicInfo.address}, {basicInfo.city}, {basicInfo.state}, {basicInfo.country} -{" "}
            {basicInfo.postalCode}
          </span>
        </div>
        <div className="studio-form-field">
          <label className="studio-field-label">KYC</label>
          <span>
            {kyc.skipped ? "Skipped" : kyc.consentGiven ? `Consented (${kyc.documentType})` : "Not consented"}
          </span>
        </div>
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
          <span>{photographerDetails.specializations.join(", ") || "None selected"}</span>
        </div>
      </div>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <div className="studio-form-actions-right">
          <button type="button" className="studio-btn-primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </div>
    </>
  );
}