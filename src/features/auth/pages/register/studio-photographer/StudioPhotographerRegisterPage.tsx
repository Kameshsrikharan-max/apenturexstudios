import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleFilled, LockFilled } from "@ant-design/icons";
import StudioPhotographerBasicInfoStep, {
  StudioPhotographerBasicInfoData,
} from "./steps/StudioPhotographerBasicInfoStep";
import StudioPhotographerKycStep, {
  StudioPhotographerKycData,
} from "./steps/StudioPhotographerKycStep";
import StudioPhotographerDetailsStep, {
  StudioPhotographerDetailsData,
} from "./steps/StudioPhotographerDetailsStep";
import StudioPhotographerReviewStep from "./steps/StudioPhotographerReviewStep";
import "./StudioPhotographerRegisterPage.css";

export interface StudioPhotographerFormData {
  basicInfo: StudioPhotographerBasicInfoData;
  kyc: StudioPhotographerKycData;
  photographerDetails: StudioPhotographerDetailsData;
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
  onSubmitted: (data: StudioPhotographerFormData) => void | Promise<void>;
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

  const handleSubmit = async () => {
    if (typeof onSubmitted !== "function") {
      // This means the parent rendering StudioPhotographerRegisterPage isn't
      // passing a valid onSubmitted prop (missing, wrong prop name, or not a function).
      // Check wherever <StudioPhotographerRegisterPage ... /> is rendered.
      console.error(
        "StudioPhotographerRegisterPage: `onSubmitted` prop is missing or not a function. " +
          "Check the parent component that renders this page.",
        onSubmitted
      );
      return;
    }

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
                  <span />
                  <span />
                  <span />
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
            <motion.div
              key="basic"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StudioPhotographerBasicInfoStep
                initialData={formData.basicInfo}
                email={email}
                onBack={onBack}
                onContinue={(basicInfo) => {
                  setFormData((prev) => ({ ...prev, basicInfo }));
                  goNext();
                }}
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
              <StudioPhotographerKycStep
                initialData={formData.kyc}
                onBack={goPrev}
                onContinue={(kyc) => {
                  setFormData((prev) => ({ ...prev, kyc }));
                  goNext();
                }}
                onSkip={(kyc) => {
                  setFormData((prev) => ({ ...prev, kyc }));
                  goNext();
                }}
              />
            </motion.div>
          ) : activeStep === "details" ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StudioPhotographerDetailsStep
                initialData={formData.photographerDetails}
                onBack={goPrev}
                onContinue={(photographerDetails) => {
                  setFormData((prev) => ({ ...prev, photographerDetails }));
                  goNext();
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StudioPhotographerReviewStep
                data={formData}
                email={email}
                onBack={goPrev}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}