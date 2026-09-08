import { useMemo, useState } from "react";
import { CheckOutlined } from "@ant-design/icons";
import StudioManagerBasicInfoStep, {
  StudioManagerBasicInfoData,
} from "./steps/StudioManagerBasicInfoStep";
import StudioManagerKycStep, { StudioManagerKycData } from "./steps/StudioManagerKycStep";
import StudioManagerPortfolioStep, {
  StudioManagerPortfolioData,
} from "./steps/StudioManagerPortfolioStep";
import StudioManagerReviewStep from "./steps/StudioManagerReviewStep";
import "./StudioManagerRegisterPage.css";

export type StepKey = "basic" | "kyc" | "portfolio" | "review";

export interface StudioManagerFormData {
  basicInfo: StudioManagerBasicInfoData;
  kyc: StudioManagerKycData;
  portfolio: StudioManagerPortfolioData;
}

const DEFAULT_BASIC_INFO: StudioManagerBasicInfoData = {
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
  referralEmail: "",
  agreedToTerms: false,
};

const DEFAULT_KYC: StudioManagerKycData = {
  documentType: "aadhaar",
  consentGiven: false,
  skipped: false,
};

const DEFAULT_PORTFOLIO: StudioManagerPortfolioData = {
  bio: "",
  media: [],
};

const STEPS: { key: StepKey; label: string; sublabel: string }[] = [
  { key: "basic", label: "Basic Info", sublabel: "Personal details" },
  { key: "kyc", label: "KYC Verification", sublabel: "PAN / Aadhaar / DL" },
  { key: "portfolio", label: "Portfolio", sublabel: "Your work" },
  { key: "review", label: "Review", sublabel: "Confirm & submit" },
];

interface StudioManagerRegisterPageProps {
  onBackToLogin: () => void;
  
  onSubmitApplication?: (data: StudioManagerFormData) => Promise<void> | void;
}

export default function StudioManagerRegisterPage({
  onBackToLogin,
  onSubmitApplication,
}: StudioManagerRegisterPageProps) {
  const [step, setStep] = useState<StepKey>("basic");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<StudioManagerFormData>({
    basicInfo: DEFAULT_BASIC_INFO,
    kyc: DEFAULT_KYC,
    portfolio: DEFAULT_PORTFOLIO,
  });

  const currentIndex = STEPS.findIndex((s) => s.key === step);
  const railProgress = useMemo(
    () => Math.round((currentIndex / (STEPS.length - 1)) * 100),
    [currentIndex]
  );

  const goTo = (key: StepKey) => setStep(key);

  const handleSubmit = async () => {
    if (typeof onSubmitApplication !== "function") {
      // eslint-disable-next-line no-console
      console.error(
        "StudioManagerRegisterPage: no onSubmitApplication handler was passed in — nothing was submitted. " +
          "Pass onSubmitApplication={(data) => ...} to the component to wire this up."
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitApplication(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="smx-register-page">
      <div className="smx-hero">
        <span className="smx-role-pill">Invitation-Only Registration</span>
        <h1 className="smx-hero-title">Invitation Required</h1>
        <p className="smx-hero-subtitle">Studio managers can only be invited by an admin</p>

        {/* Film-strip stepper: sprocket holes + a progress rail that
            develops left to right as the applicant moves through the roll. */}
        <div className="smx-stepper" role="list" aria-label="Registration progress">
          <div className="smx-stepper-rail">
            <div className="smx-stepper-rail-fill" style={{ width: `${railProgress}%` }} />
          </div>
          {STEPS.map((s, index) => {
            const status = index < currentIndex ? "done" : index === currentIndex ? "active" : "upcoming";
            return (
              <div key={s.key} className="smx-stepper-item" role="listitem">
                <div className="smx-stepper-node">
                  <span className="smx-stepper-sprockets" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className={`smx-stepper-circle smx-stepper-circle--${status}`}>
                    {status === "done" ? <CheckOutlined /> : index + 1}
                  </span>
                  <span className={`smx-stepper-label smx-stepper-label--${status}`}>{s.label}</span>
                  <span className="smx-stepper-sublabel">{s.sublabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="smx-card">
        {/* Registration marks — a recurring nod to contact-sheet printing,
            echoed again on the Review step's hero. */}
        <span className="smx-card-mark smx-card-mark--tl" aria-hidden="true" />
        <span className="smx-card-mark smx-card-mark--tr" aria-hidden="true" />

        <div key={step} className="smx-step-anim">
          {step === "basic" ? (
            <StudioManagerBasicInfoStep
              initialData={formData.basicInfo}
              onBack={onBackToLogin}
              onContinue={(basicInfo) => {
                setFormData((prev) => ({ ...prev, basicInfo }));
                goTo("kyc");
              }}
            />
          ) : null}

          {step === "kyc" ? (
            <StudioManagerKycStep
              initialData={formData.kyc}
              onBack={() => goTo("basic")}
              onContinue={(kyc) => {
                setFormData((prev) => ({ ...prev, kyc }));
                goTo("portfolio");
              }}
              onSkip={(kyc) => {
                setFormData((prev) => ({ ...prev, kyc }));
                goTo("portfolio");
              }}
            />
          ) : null}

          {step === "portfolio" ? (
            <StudioManagerPortfolioStep
              initialData={formData.portfolio}
              onBack={() => goTo("kyc")}
              onContinue={(portfolio) => {
                setFormData((prev) => ({ ...prev, portfolio }));
                goTo("review");
              }}
            />
          ) : null}

          {step === "review" ? (
            <StudioManagerReviewStep
              data={formData}
              onBack={() => goTo("portfolio")}
              onEditStep={(target) => goTo(target)}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}