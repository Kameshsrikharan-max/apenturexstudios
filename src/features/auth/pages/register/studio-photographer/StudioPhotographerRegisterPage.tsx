import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleFilled, LockFilled } from "@ant-design/icons";
import "../studio-admin/StudioAdminRegisterPage.css";

export interface StudioPhotographerFormData {
  basicInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    agreedToTerms: boolean;
  };
  kyc: {
    documentType: string;
    consentGiven: boolean;
    skipped: boolean;
  };
  photographerDetails: {
    yearsExperience: string;
    specializations: string[];
    equipment: string;
  };
}

const STEPS = [
  { key: "basic", title: "Basic Info", subtitle: "Personal details" },
  { key: "kyc", title: "KYC Verification", subtitle: "Aadhaar" },
  { key: "details", title: "Photography Details", subtitle: "Your work" },
  { key: "review", title: "Review", subtitle: "Confirm & submit" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface StudioPhotographerRegisterPageProps {
  email: string;
  studioName?: string;
  onBack: () => void;
  onSubmitted: (data: StudioPhotographerFormData) => void;
}

const EMPTY_DATA: StudioPhotographerFormData = {
  basicInfo: {
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    agreedToTerms: false,
  },
  kyc: { documentType: "aadhaar", consentGiven: false, skipped: false },
  photographerDetails: { yearsExperience: "", specializations: [], equipment: "" },
};

const SPECIALIZATION_OPTIONS = [
  "Wedding Photography",
  "Portrait Photography",
  "Candid Photography",
  "Event Photography",
  "Product Photography",
];

export default function StudioPhotographerRegisterPage({
  email,
  studioName,
  onBack,
  onSubmitted,
}: StudioPhotographerRegisterPageProps) {
  const [activeStep, setActiveStep] = useState<StepKey>("basic");
  const [formData, setFormData] = useState<StudioPhotographerFormData>(EMPTY_DATA);
  const [submitting, setSubmitting] = useState(false);

  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);
  const overallProgress = useMemo(
    () => Math.round((activeIndex / (STEPS.length - 1)) * 100),
    [activeIndex]
  );

  const goToStep = (key: StepKey) => {
    const targetIndex = STEPS.findIndex((s) => s.key === key);
    if (targetIndex <= activeIndex) setActiveStep(key);
  };

  const goNext = () => {
    const nextIndex = Math.min(STEPS.length - 1, activeIndex + 1);
    setActiveStep(STEPS[nextIndex].key);
  };

  const goPrev = () => {
    const prevIndex = Math.max(0, activeIndex - 1);
    setActiveStep(STEPS[prevIndex].key);
  };

  const updateBasicInfo = (patch: Partial<StudioPhotographerFormData["basicInfo"]>) =>
    setFormData((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, ...patch } }));

  const updateKyc = (patch: Partial<StudioPhotographerFormData["kyc"]>) =>
    setFormData((prev) => ({ ...prev, kyc: { ...prev.kyc, ...patch } }));

  const updatePhotographerDetails = (patch: Partial<StudioPhotographerFormData["photographerDetails"]>) =>
    setFormData((prev) => ({ ...prev, photographerDetails: { ...prev.photographerDetails, ...patch } }));

  const toggleSpecialization = (spec: string) => {
    setFormData((prev) => {
      const current = prev.photographerDetails.specializations;
      const next = current.includes(spec) ? current.filter((s) => s !== spec) : [...current, spec];
      return { ...prev, photographerDetails: { ...prev.photographerDetails, specializations: next } };
    });
  };

  const isBasicInfoValid =
    formData.basicInfo.firstName.trim() &&
    formData.basicInfo.lastName.trim() &&
    formData.basicInfo.phone.trim() &&
    formData.basicInfo.address.trim() &&
    formData.basicInfo.city.trim() &&
    formData.basicInfo.state.trim() &&
    formData.basicInfo.country.trim() &&
    formData.basicInfo.postalCode.trim() &&
    formData.basicInfo.agreedToTerms;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitted(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="studio-register-root">
      <div className="studio-register-header">
        <h1 className="studio-register-title">Join as Studio Photographer</h1>
        <span className="studio-register-role-pill">
          Invited{studioName ? ` to ${studioName}` : ""}
        </span>
        <p className="studio-register-subtitle">
          Complete your details below — your registration will go to a super admin for approval.
        </p>
      </div>

      <div className="studio-register-stepper" role="list" aria-label="Registration progress">
        <div className="studio-stepper-rail">
          <div className="studio-stepper-rail-fill" style={{ width: `${overallProgress}%` }} />
        </div>
        {STEPS.map((step, i) => {
          const isActive = step.key === activeStep;
          const isDone = i < activeIndex;
          const isLocked = i > activeIndex;
          return (
            <div className="studio-step-wrap" key={step.key} role="listitem">
              <button
                type="button"
                className={`studio-step-dot-item ${isDone ? "studio-step-dot-item--clickable" : ""}`}
                onClick={() => (isDone ? goToStep(step.key) : undefined)}
                disabled={!isDone}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="studio-step-sprockets" aria-hidden="true">
                  <span /><span /><span />
                </span>
                <span
                  className={`studio-step-circle ${
                    isActive ? "studio-step-circle--active" : isDone ? "studio-step-circle--done" : ""
                  }`}
                >
                  {isDone ? <CheckCircleFilled /> : isLocked ? <LockFilled className="studio-step-lock" /> : i + 1}
                </span>
                <span className={`studio-step-labels ${isActive ? "studio-step-labels--active" : ""}`}>
                  <span className="studio-step-title">{step.title}</span>
                  <span className="studio-step-subtitle">{step.subtitle}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="studio-register-card">
        <span className="studio-reg-mark studio-reg-mark--tl" aria-hidden="true" />
        <span className="studio-reg-mark studio-reg-mark--tr" aria-hidden="true" />

        <AnimatePresence mode="wait">
          {activeStep === "basic" ? (
            <motion.div key="basic" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <div className="studio-form-section-header">
                <h2 className="studio-form-section-title">Basic Information</h2>
                <p className="studio-form-section-subtitle">Tell us about yourself</p>
              </div>
              <div className="studio-form-divider" />

              <div className="studio-form-grid">
                <div className="studio-form-field">
                  <label className="studio-field-label">First Name <span className="studio-required-star">*</span></label>
                  <input className="studio-input" value={formData.basicInfo.firstName} onChange={(e) => updateBasicInfo({ firstName: e.target.value })} placeholder="e.g. Arun" />
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">Last Name <span className="studio-required-star">*</span></label>
                  <input className="studio-input" value={formData.basicInfo.lastName} onChange={(e) => updateBasicInfo({ lastName: e.target.value })} placeholder="e.g. Kumar" />
                </div>
                <div className="studio-form-field studio-form-field--full">
                  <label className="studio-field-label">Email Address</label>
                  <input className="studio-input" value={email} disabled title="Locked to your invite" />
                  <span className="studio-field-hint">This is the email your invite was sent to and can't be changed.</span>
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">Phone Number <span className="studio-required-star">*</span></label>
                  <input className="studio-input" value={formData.basicInfo.phone} onChange={(e) => updateBasicInfo({ phone: e.target.value })} placeholder="98765 43210" />
                </div>
                <div className="studio-form-field studio-form-field--full">
                  <label className="studio-field-label">Address <span className="studio-required-star">*</span></label>
                  <input className="studio-input" value={formData.basicInfo.address} onChange={(e) => updateBasicInfo({ address: e.target.value })} placeholder="123 Main St" />
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">City <span className="studio-required-star">*</span></label>
                  <input className="studio-input" value={formData.basicInfo.city} onChange={(e) => updateBasicInfo({ city: e.target.value })} placeholder="Chennai" />
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">State <span className="studio-required-star">*</span></label>
                  <input className="studio-input" value={formData.basicInfo.state} onChange={(e) => updateBasicInfo({ state: e.target.value })} placeholder="Tamil Nadu" />
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">Country <span className="studio-required-star">*</span></label>
                  <input className="studio-input" value={formData.basicInfo.country} onChange={(e) => updateBasicInfo({ country: e.target.value })} placeholder="India" />
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">Postal Code <span className="studio-required-star">*</span></label>
                  <input className="studio-input" value={formData.basicInfo.postalCode} onChange={(e) => updateBasicInfo({ postalCode: e.target.value })} placeholder="600001" />
                </div>
              </div>

              <label className="studio-checkbox-option studio-terms-row">
                <input type="checkbox" checked={formData.basicInfo.agreedToTerms} onChange={(e) => updateBasicInfo({ agreedToTerms: e.target.checked })} />
                I agree to the Terms and Conditions
              </label>

              <div className="studio-form-actions">
                <button type="button" className="studio-btn-secondary" onClick={onBack}>Back</button>
                <div className="studio-form-actions-right">
                  <button type="button" className="studio-btn-primary" disabled={!isBasicInfoValid} onClick={goNext}>Continue</button>
                </div>
              </div>
            </motion.div>
          ) : activeStep === "kyc" ? (
            <motion.div key="kyc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <div className="studio-form-section-header">
                <h2 className="studio-form-section-title">KYC Verification</h2>
                <p className="studio-form-section-subtitle">Optional at this stage</p>
              </div>
              <div className="studio-form-divider" />

              <div className="studio-form-field" style={{ maxWidth: 320 }}>
                <label className="studio-field-label">Document Type</label>
                <select className="studio-select" value={formData.kyc.documentType} onChange={(e) => updateKyc({ documentType: e.target.value })}>
                  <option value="aadhaar">Aadhaar</option>
                  <option value="pan">PAN</option>
                  <option value="dl">Driving Licence</option>
                </select>
              </div>

              <label className="studio-checkbox-option studio-terms-row">
                <input type="checkbox" checked={formData.kyc.consentGiven} onChange={(e) => updateKyc({ consentGiven: e.target.checked, skipped: false })} />
                I consent to KYC verification
              </label>

              <div className="studio-form-actions">
                <button type="button" className="studio-btn-secondary" onClick={goPrev}>Back</button>
                <div className="studio-form-actions-right">
                  <button type="button" className="studio-btn-secondary" onClick={() => { updateKyc({ skipped: true, consentGiven: false }); goNext(); }}>Skip KYC</button>
                  <button type="button" className="studio-btn-primary" onClick={goNext}>Continue</button>
                </div>
              </div>
            </motion.div>
          ) : activeStep === "details" ? (
            <motion.div key="details" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <div className="studio-form-section-header">
                <h2 className="studio-form-section-title">Photography Details</h2>
                <p className="studio-form-section-subtitle">Share your photography background</p>
              </div>
              <div className="studio-form-divider" />

              <div className="studio-form-grid">
                <div className="studio-form-field">
                  <label className="studio-field-label">Years of Experience</label>
                  <input className="studio-input" value={formData.photographerDetails.yearsExperience} onChange={(e) => updatePhotographerDetails({ yearsExperience: e.target.value })} placeholder="e.g. 1–3 years" />
                </div>
                <div className="studio-form-field studio-form-field--full">
                  <label className="studio-field-label">Equipment</label>
                  <input className="studio-input" value={formData.photographerDetails.equipment} onChange={(e) => updatePhotographerDetails({ equipment: e.target.value })} placeholder="e.g. Sony A7 IV, 24-70mm f2.8" />
                </div>
                <div className="studio-form-field studio-form-field--full">
                  <label className="studio-field-label">Specializations</label>
                  <div className="studio-radio-row">
                    {SPECIALIZATION_OPTIONS.map((spec) => (
                      <label key={spec} className="studio-checkbox-option">
                        <input
                          type="checkbox"
                          checked={formData.photographerDetails.specializations.includes(spec)}
                          onChange={() => toggleSpecialization(spec)}
                        />
                        {spec}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="studio-form-actions">
                <button type="button" className="studio-btn-secondary" onClick={goPrev}>Back</button>
                <div className="studio-form-actions-right">
                  <button type="button" className="studio-btn-primary" onClick={goNext}>Continue</button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <div className="studio-form-section-header">
                <h2 className="studio-form-section-title">Review & Submit</h2>
                <p className="studio-form-section-subtitle">Confirm your details before submitting</p>
              </div>
              <div className="studio-form-divider" />

              <div className="studio-form-grid">
                <div className="studio-form-field">
                  <label className="studio-field-label">Name</label>
                  <span>{formData.basicInfo.firstName} {formData.basicInfo.lastName}</span>
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">Email</label>
                  <span>{email}</span>
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">Phone</label>
                  <span>{formData.basicInfo.phone}</span>
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">Location</label>
                  <span>{formData.basicInfo.city}, {formData.basicInfo.state}</span>
                </div>
                <div className="studio-form-field">
                  <label className="studio-field-label">KYC</label>
                  <span>{formData.kyc.skipped ? "Skipped" : formData.kyc.consentGiven ? `Consented (${formData.kyc.documentType})` : "Not consented"}</span>
                </div>
                <div className="studio-form-field studio-form-field--full">
                  <label className="studio-field-label">Specializations</label>
                  <span>{formData.photographerDetails.specializations.join(", ") || "None selected"}</span>
                </div>
              </div>

              <div className="studio-form-actions">
                <button type="button" className="studio-btn-secondary" onClick={goPrev} disabled={submitting}>Back</button>
                <div className="studio-form-actions-right">
                  <button type="button" className="studio-btn-primary" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}