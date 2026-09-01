import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleFilled } from "@ant-design/icons";
import BasicInfoStep, { BasicInfoData } from "./steps/BasicInfoStep";
import KycVerificationStep, { KycData } from "./steps/KycVerificationStep";
import StudioDetailsStep, { StudioDetailsData } from "./steps/StudioDetailsStep";
import DocumentsStep, { DocumentsData } from "./steps/DocumentsStep";
import "./StudioAdminRegisterPage.css";

export interface StudioAdminFormData {
  basicInfo: BasicInfoData;
  kyc: KycData;
  studioDetails: StudioDetailsData;
  documents: DocumentsData;
  // Filled in by later steps as they're built:
  // review: ReviewData;
}

const STEPS = [
  { key: "basic", title: "Basic Info", subtitle: "Personal details" },
  { key: "kyc", title: "KYC Verification", subtitle: "Aadhaar" },
  { key: "studio", title: "Studio Details", subtitle: "Business info" },
  { key: "documents", title: "Documents", subtitle: "Verification" },
  { key: "review", title: "Review", subtitle: "Confirm & submit" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface StudioAdminRegisterPageProps {
  onBackToLogin: () => void;
  onSubmitted: (data: StudioAdminFormData) => void;
}

const EMPTY_BASIC_INFO: BasicInfoData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  referral: null,
  agreedToTerms: false,
};

const EMPTY_KYC: KycData = {
  documentType: "aadhaar",
  consentGiven: false,
  skipped: false,
};

const EMPTY_STUDIO_DETAILS: StudioDetailsData = {
  studioName: "",
  phone: "",
  bio: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  media: [],
  service: "",
  specializations: [],
};

const EMPTY_DOCUMENTS: DocumentsData = {
  mapsLink: "",
  documentType: "",
  documentFile: null,
};

export default function StudioAdminRegisterPage({ onBackToLogin, onSubmitted }: StudioAdminRegisterPageProps) {
  const [activeStep, setActiveStep] = useState<StepKey>("basic");
  const [formData, setFormData] = useState<StudioAdminFormData>({
    basicInfo: EMPTY_BASIC_INFO,
    kyc: EMPTY_KYC,
    studioDetails: EMPTY_STUDIO_DETAILS,
    documents: EMPTY_DOCUMENTS,
  });

  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);

  const goToStep = (key: StepKey) => {
    const targetIndex = STEPS.findIndex((s) => s.key === key);
    // Only allow jumping backward to an already-completed step via the
    // stepper dots — forward navigation happens through each step's own
    // Continue button once its validation passes.
    if (targetIndex <= activeIndex) {
      setActiveStep(key);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = Math.max(0, activeIndex - 1);
    setActiveStep(STEPS[prevIndex].key);
  };

  const handleBasicInfoContinue = (data: BasicInfoData) => {
    setFormData((prev) => ({ ...prev, basicInfo: data }));
    setActiveStep("kyc");
  };

  const handleKycContinue = (data: KycData) => {
    setFormData((prev) => ({ ...prev, kyc: data }));
    setActiveStep("studio");
  };

  const handleKycSkip = (data: KycData) => {
    setFormData((prev) => ({ ...prev, kyc: data }));
    setActiveStep("studio");
  };

  const handleStudioDetailsContinue = (data: StudioDetailsData) => {
    setFormData((prev) => ({ ...prev, studioDetails: data }));
    setActiveStep("documents");
  };

  const handleDocumentsContinue = (data: DocumentsData) => {
    setFormData((prev) => ({ ...prev, documents: data }));
    setActiveStep("review");
  };

  return (
    <div className="studio-register-root">
      <div className="studio-register-header">
        <h1 className="studio-register-title">Register Your Studio</h1>
        <span className="studio-register-role-pill">Registering as Studio Admin</span>
        <p className="studio-register-subtitle">
          Join the Photography Service Platform and connect with talented photographers
        </p>
      </div>

      <div className="studio-register-stepper">
        {STEPS.map((step, i) => {
          const isActive = step.key === activeStep;
          const isDone = i < activeIndex;
          return (
            <div className="studio-step-wrap" key={step.key}>
              <div
                className={`studio-step-dot-item ${isDone ? "studio-step-dot-item--clickable" : ""}`}
                onClick={() => (isDone ? goToStep(step.key) : undefined)}
              >
                <div
                  className={`studio-step-circle ${
                    isActive ? "studio-step-circle--active" : isDone ? "studio-step-circle--done" : ""
                  }`}
                >
                  {isDone ? <CheckCircleFilled /> : i + 1}
                </div>
                <div className={`studio-step-labels ${isActive ? "studio-step-labels--active" : ""}`}>
                  <span className="studio-step-title">{step.title}</span>
                  <span className="studio-step-subtitle">{step.subtitle}</span>
                </div>
              </div>
              {i < STEPS.length - 1 ? (
                <div className={`studio-step-connector ${i < activeIndex ? "studio-step-connector--active" : ""}`} />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="studio-register-card">
        <AnimatePresence mode="wait">
          {activeStep === "basic" ? (
            <motion.div
              key="basic"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <BasicInfoStep
                initialData={formData.basicInfo}
                onBack={onBackToLogin}
                onContinue={handleBasicInfoContinue}
              />
            </motion.div>
          ) : activeStep === "kyc" ? (
            <motion.div
              key="kyc"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <KycVerificationStep
                initialData={formData.kyc}
                onBack={goToPreviousStep}
                onContinue={handleKycContinue}
                onSkip={handleKycSkip}
              />
            </motion.div>
          ) : activeStep === "studio" ? (
            <motion.div
              key="studio"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StudioDetailsStep
                initialData={formData.studioDetails}
                onBack={goToPreviousStep}
                onContinue={handleStudioDetailsContinue}
              />
            </motion.div>
          ) : activeStep === "documents" ? (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <DocumentsStep
                initialData={formData.documents}
                onBack={goToPreviousStep}
                onContinue={handleDocumentsContinue}
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="studio-step-placeholder"
            >
              <p>The "{STEPS[activeIndex].title}" step isn't built yet.</p>
              {/* TEMPORARY: lets you click through to Review before
                  Documents/Review are actually built. Remove once built. */}
              <button
                type="button"
                className="studio-btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => setActiveStep(STEPS[Math.min(STEPS.length - 1, activeIndex + 1)].key)}
              >
                Continue (temporary)
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}