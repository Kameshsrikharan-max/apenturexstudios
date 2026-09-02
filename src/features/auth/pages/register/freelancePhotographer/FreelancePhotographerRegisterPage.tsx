import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleFilled, LockFilled } from "@ant-design/icons";
import BasicInfoStep, { BasicInfoData } from "./steps/BasicInfoStep";
import KycVerificationStep, { KycData } from "./steps/KycVerificationStep";
import PhotographerDetailsStep, { PhotographerDetailsData } from "./steps/PhotographerDetailsStep";
import WorkAreaDocumentsStep, { WorkAreaDocumentsData } from "./steps/WorkAreaDocumentsStep";
import ReviewStep from "./steps/ReviewStep";
import "./FreelancePhotographerRegisterPage.css";

export interface FreelancePhotographerFormData {
  basicInfo: BasicInfoData;
  kyc: KycData;
  photographerDetails: PhotographerDetailsData;
  workArea: WorkAreaDocumentsData;
}

const STEPS = [
  { key: "basic", title: "Basic Info", subtitle: "Personal details" },
  { key: "kyc", title: "KYC Verification", subtitle: "Aadhaar" },
  { key: "profile", title: "Professional Profile", subtitle: "Your work" },
  { key: "workarea", title: "Work Area", subtitle: "Coverage & docs" },
  { key: "review", title: "Review", subtitle: "Confirm & submit" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface FreelancePhotographerRegisterPageProps {
  onBackToLogin: () => void;
  onSubmitted: (data: FreelancePhotographerFormData) => void;
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

const EMPTY_PHOTOGRAPHER_DETAILS: PhotographerDetailsData = {
  displayName: "",
  phone: "",
  bio: "",
  yearsExperience: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  media: [],
  service: "",
  specializations: [],
  equipment: "",
  instagramLink: "",
  portfolioLink: "",
};

const EMPTY_WORK_AREA: WorkAreaDocumentsData = {
  mapsLink: "",
  travelRadius: "",
  documentType: "",
  documentFile: null,
};

const DRAFT_KEY = "axs.freelancePhotographerRegister.draft.v1";

// File objects can't survive JSON.stringify, so the autosaved draft only
// carries the text-shaped fields — media / document uploads are left out
// and simply have to be re-attached if a draft is restored.
type SerializableDraft = {
  basicInfo: BasicInfoData;
  kyc: KycData;
  photographerDetails: Omit<PhotographerDetailsData, "media">;
  workArea: Omit<WorkAreaDocumentsData, "documentFile">;
  activeStep: StepKey;
  savedAt: string;
};

function readDraft(): SerializableDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as SerializableDraft) : null;
  } catch {
    return null;
  }
}

export default function FreelancePhotographerRegisterPage({
  onBackToLogin,
  onSubmitted,
}: FreelancePhotographerRegisterPageProps) {
  const [activeStep, setActiveStep] = useState<StepKey>("basic");
  const [formData, setFormData] = useState<FreelancePhotographerFormData>({
    basicInfo: EMPTY_BASIC_INFO,
    kyc: EMPTY_KYC,
    photographerDetails: EMPTY_PHOTOGRAPHER_DETAILS,
    workArea: EMPTY_WORK_AREA,
  });
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<SerializableDraft | null>(null);
  const [draftDismissed, setDraftDismissed] = useState(false);

  const activeIndex = STEPS.findIndex((s) => s.key === activeStep);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  useEffect(() => {
    const { media: _media, ...photographerDetailsRest } = formData.photographerDetails;
    const { documentFile: _file, ...workAreaRest } = formData.workArea;
    const payload: SerializableDraft = {
      basicInfo: formData.basicInfo,
      kyc: formData.kyc,
      photographerDetails: photographerDetailsRest,
      workArea: workAreaRest,
      activeStep,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // Storage can fail (quota, private mode) — autosave is best-effort.
    }
  }, [formData, activeStep]);

  const restoreDraft = () => {
    if (!draft) return;
    setFormData((prev) => ({
      basicInfo: draft.basicInfo,
      kyc: draft.kyc,
      photographerDetails: { ...prev.photographerDetails, ...draft.photographerDetails },
      workArea: { ...prev.workArea, ...draft.workArea },
    }));
    setActiveStep(draft.activeStep);
    setDraftDismissed(true);
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* noop */
    }
    setDraftDismissed(true);
  };

  const goToStep = (key: StepKey) => {
    const targetIndex = STEPS.findIndex((s) => s.key === key);
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
    setActiveStep("profile");
  };

  const handleKycSkip = (data: KycData) => {
    setFormData((prev) => ({ ...prev, kyc: data }));
    setActiveStep("profile");
  };

  const handleProfileContinue = (data: PhotographerDetailsData) => {
    setFormData((prev) => ({ ...prev, photographerDetails: data }));
    setActiveStep("workarea");
  };

  const handleWorkAreaContinue = (data: WorkAreaDocumentsData) => {
    setFormData((prev) => ({ ...prev, workArea: data }));
    setActiveStep("review");
  };

  const handleReviewSubmit = async () => {
    setSubmitting(true);
    try {
      // TODO: replace with the real submission call.
      await new Promise((resolve) => setTimeout(resolve, 900));
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* noop */
      }
      onSubmitted(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const overallProgress = useMemo(() => Math.round((activeIndex / (STEPS.length - 1)) * 100), [activeIndex]);
  const showDraftBanner = draft && !draftDismissed && activeStep === "basic";

  return (
    <div className="studio-register-root">
      <div className="studio-register-header">
        <h1 className="studio-register-title">Register as a Freelance Photographer</h1>
        <span className="studio-register-role-pill">Registering as Freelance Photographer</span>
        <p className="studio-register-subtitle">
          Join the Photography Service Platform and get discovered by clients near you
        </p>
      </div>

      <AnimatePresence>
        {showDraftBanner ? (
          <motion.div
            className="studio-draft-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <span>
              We found a saved draft from{" "}
              {new Date(draft!.savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.
              Continue where you left off?
            </span>
            <div className="studio-draft-banner-actions">
              <button type="button" className="studio-draft-btn studio-draft-btn--ghost" onClick={discardDraft}>
                Discard
              </button>
              <button type="button" className="studio-draft-btn" onClick={restoreDraft}>
                Restore draft
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
          ) : activeStep === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <PhotographerDetailsStep
                initialData={formData.photographerDetails}
                onBack={goToPreviousStep}
                onContinue={handleProfileContinue}
              />
            </motion.div>
          ) : activeStep === "workarea" ? (
            <motion.div
              key="workarea"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <WorkAreaDocumentsStep
                initialData={formData.workArea}
                onBack={goToPreviousStep}
                onContinue={handleWorkAreaContinue}
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
              <ReviewStep
                data={formData}
                onBack={goToPreviousStep}
                onEditStep={goToStep}
                onSubmit={handleReviewSubmit}
                submitting={submitting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}