import { useMemo, useState } from "react";
import { CheckCircleFilled } from "@ant-design/icons";
import TermsAndConditionsModal from "../../../../../../components/Onboarding/TermsAndConditionModal";
import "./BasicInfoStep.css";

export interface BasicInfoData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  referral: "with" | "without" | null;
  agreedToTerms: boolean;
}

interface BasicInfoStepProps {
  initialData: BasicInfoData;
  onBack: () => void;
  onContinue: (data: BasicInfoData) => void;
}

type TextField = Exclude<keyof BasicInfoData, "referral" | "agreedToTerms">;
type FieldErrors = Partial<Record<keyof BasicInfoData, string>>;

const REQUIRED_FIELDS: TextField[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "country",
  "postalCode",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{10}$/;
const POSTAL_CODE_PATTERN = /^\d{6}$/;
// A couple of letters is enough to call a name field "looking valid" —
// this only drives the live green tick, not the hard required check.
const MIN_NAME_LENGTH = 2;

// Single source of truth for what makes each field valid, used for both
// the on-type/on-blur error message and the live green-tick indicator.
function fieldError(field: TextField, rawValue: string): string | undefined {
  const value = rawValue.trim();

  if (!value) {
    return "This field is required.";
  }

  switch (field) {
    case "email":
      return EMAIL_PATTERN.test(value) ? undefined : "Enter a valid email address.";
    case "phone":
      return PHONE_PATTERN.test(value) ? undefined : "Enter a valid 10-digit phone number.";
    case "postalCode":
      return POSTAL_CODE_PATTERN.test(value) ? undefined : "Enter a valid 6-digit postal code.";
    case "firstName":
    case "lastName":
      return value.length >= MIN_NAME_LENGTH ? undefined : "Enter at least 2 characters.";
    default:
      return undefined;
  }
}

export default function BasicInfoStep({ initialData, onBack, onContinue }: BasicInfoStepProps) {
  const [data, setData] = useState<BasicInfoData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Only show a field's error state once the person has actually left it —
  // this is what "proper validation" means here: real-time feedback that
  // doesn't shout "required" at an empty field before they've typed a key.
  const [touched, setTouched] = useState<Partial<Record<TextField, boolean>>>({});
  const [showTerms, setShowTerms] = useState(false);

  const setField = <K extends keyof BasicInfoData>(field: K, value: BasicInfoData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const setTextField = (field: TextField, value: string) => {
    setField(field, value);
    // If the field is already touched (i.e. already showing an error),
    // re-validate as they type so the error clears the moment it's fixed
    // instead of waiting for the next blur.
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: fieldError(field, value) }));
    }
  };

  const handleBlur = (field: TextField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: fieldError(field, data[field]) }));
  };

  const validateAll = (): FieldErrors => {
    const next: FieldErrors = {};

    for (const field of REQUIRED_FIELDS) {
      const message = fieldError(field, data[field]);
      if (message) next[field] = message;
    }

    if (!data.referral) {
      next.referral = "Choose one option.";
    }

    if (!data.agreedToTerms) {
      next.agreedToTerms = "You must agree to the Terms and Conditions to continue.";
    }

    return next;
  };

  const handleContinue = () => {
    const validationErrors = validateAll();
    setErrors(validationErrors);
    setTouched(
      REQUIRED_FIELDS.reduce((acc, field) => ({ ...acc, [field]: true }), {} as Record<TextField, boolean>)
    );
    if (Object.keys(validationErrors).length === 0) {
      onContinue(data);
    }
  };

  const handleAcceptTerms = () => {
    setField("agreedToTerms", true);
    setErrors((prev) => ({ ...prev, agreedToTerms: undefined }));
    setShowTerms(false);
  };

  // A field shows its green tick as soon as it looks valid — regardless of
  // touched state, since a positive signal is safe to show early. Errors,
  // on the other hand, only appear once the field has been touched (see
  // handleBlur / handleContinue).
  const isFieldValid = (field: TextField): boolean => !fieldError(field, data[field]);

  const isValidLooking =
    REQUIRED_FIELDS.every((f) => isFieldValid(f)) && data.referral !== null && data.agreedToTerms;

  // Lightweight "how far along am I" meter — an honest, calm alternative to
  // a password-strength-style bar, scoped to what's actually required here.
  const completion = useMemo(() => {
    const filled =
      REQUIRED_FIELDS.filter((f) => isFieldValid(f)).length +
      (data.referral ? 1 : 0) +
      (data.agreedToTerms ? 1 : 0);
    const total = REQUIRED_FIELDS.length + 2;
    return Math.round((filled / total) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="basic-info-step">
      <div className="studio-form-section-header basic-info-header">
        <div>
          <h2 className="studio-form-section-title">Basic Information</h2>
          <p className="studio-form-section-subtitle">Tell us about yourself</p>
        </div>
        <div className="basic-info-meter" role="img" aria-label={`${completion}% complete`}>
          <svg viewBox="0 0 40 40" className="basic-info-meter-ring">
            <circle cx="20" cy="20" r="17" className="basic-info-meter-track" />
            <circle
              cx="20"
              cy="20"
              r="17"
              className="basic-info-meter-progress"
              style={{ strokeDasharray: `${(completion / 100) * 106.8} 106.8` }}
            />
          </svg>
          <span className="basic-info-meter-label">{completion}%</span>
        </div>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-grid">
        <FieldShell
          label="First Name"
          required
          error={touched.firstName ? errors.firstName : undefined}
          valid={isFieldValid("firstName")}
        >
          <input
            className={`studio-input ${touched.firstName && errors.firstName ? "studio-input--invalid" : ""}`}
            placeholder="John"
            autoComplete="given-name"
            value={data.firstName}
            onChange={(e) => setTextField("firstName", e.target.value)}
            onBlur={() => handleBlur("firstName")}
          />
        </FieldShell>
        <FieldShell
          label="Last Name"
          required
          error={touched.lastName ? errors.lastName : undefined}
          valid={isFieldValid("lastName")}
        >
          <input
            className={`studio-input ${touched.lastName && errors.lastName ? "studio-input--invalid" : ""}`}
            placeholder="Doe"
            autoComplete="family-name"
            value={data.lastName}
            onChange={(e) => setTextField("lastName", e.target.value)}
            onBlur={() => handleBlur("lastName")}
          />
        </FieldShell>

        <FieldShell
          label="Email Address"
          required
          error={touched.email ? errors.email : undefined}
          valid={isFieldValid("email")}
        >
          <input
            className={`studio-input ${touched.email && errors.email ? "studio-input--invalid" : ""}`}
            type="email"
            placeholder="john.doe@example.com"
            autoComplete="email"
            value={data.email}
            onChange={(e) => setTextField("email", e.target.value)}
            onBlur={() => handleBlur("email")}
          />
        </FieldShell>
        <FieldShell
          label="Phone Number"
          required
          error={touched.phone ? errors.phone : undefined}
          valid={isFieldValid("phone")}
        >
          <div className="basic-info-phone-row">
            <span className="basic-info-phone-code">+91</span>
            <input
              className={`studio-input basic-info-phone-input ${
                touched.phone && errors.phone ? "studio-input--invalid" : ""
              }`}
              placeholder="9874563210"
              inputMode="numeric"
              autoComplete="tel-national"
              value={data.phone}
              onChange={(e) => setTextField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => handleBlur("phone")}
            />
          </div>
        </FieldShell>
      </div>

      <h3 className="studio-form-group-title">Address</h3>

      <div className="studio-form-grid">
        <FieldShell
          label="Address"
          required
          error={touched.address ? errors.address : undefined}
          valid={isFieldValid("address")}
          full
        >
          <input
            className={`studio-input ${touched.address && errors.address ? "studio-input--invalid" : ""}`}
            placeholder="123 Main St"
            autoComplete="street-address"
            value={data.address}
            onChange={(e) => setTextField("address", e.target.value)}
            onBlur={() => handleBlur("address")}
          />
        </FieldShell>

        <FieldShell
          label="City"
          required
          error={touched.city ? errors.city : undefined}
          valid={isFieldValid("city")}
        >
          <input
            className={`studio-input ${touched.city && errors.city ? "studio-input--invalid" : ""}`}
            placeholder="Chennai"
            autoComplete="address-level2"
            value={data.city}
            onChange={(e) => setTextField("city", e.target.value)}
            onBlur={() => handleBlur("city")}
          />
        </FieldShell>
        <FieldShell
          label="State"
          required
          error={touched.state ? errors.state : undefined}
          valid={isFieldValid("state")}
        >
          <input
            className={`studio-input ${touched.state && errors.state ? "studio-input--invalid" : ""}`}
            placeholder="Tamil Nadu"
            autoComplete="address-level1"
            value={data.state}
            onChange={(e) => setTextField("state", e.target.value)}
            onBlur={() => handleBlur("state")}
          />
        </FieldShell>

        <FieldShell
          label="Country"
          required
          error={touched.country ? errors.country : undefined}
          valid={isFieldValid("country")}
        >
          <input
            className={`studio-input ${touched.country && errors.country ? "studio-input--invalid" : ""}`}
            placeholder="India"
            autoComplete="country-name"
            value={data.country}
            onChange={(e) => setTextField("country", e.target.value)}
            onBlur={() => handleBlur("country")}
          />
        </FieldShell>
        <FieldShell
          label="Postal Code"
          required
          error={touched.postalCode ? errors.postalCode : undefined}
          valid={isFieldValid("postalCode")}
        >
          <input
            className={`studio-input ${touched.postalCode && errors.postalCode ? "studio-input--invalid" : ""}`}
            placeholder="600001"
            inputMode="numeric"
            autoComplete="postal-code"
            value={data.postalCode}
            onChange={(e) => setTextField("postalCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            onBlur={() => handleBlur("postalCode")}
          />
        </FieldShell>
      </div>

      <div className="studio-form-field studio-form-field--full">
        <label className="studio-field-label">
          <span className="studio-required-star">*</span> Register
        </label>
        <div className="basic-info-referral-row">
          <button
            type="button"
            className={`studio-option-card basic-info-referral-card ${
              data.referral === "with" ? "studio-option-card--selected" : ""
            }`}
            onClick={() => {
              setField("referral", "with");
              setErrors((prev) => ({ ...prev, referral: undefined }));
            }}
          >
            <div>
              <div className="studio-option-card-title">With referral</div>
              <div className="studio-option-card-sub">I have a referral code from an existing member</div>
            </div>
          </button>
          <button
            type="button"
            className={`studio-option-card basic-info-referral-card ${
              data.referral === "without" ? "studio-option-card--selected" : ""
            }`}
            onClick={() => {
              setField("referral", "without");
              setErrors((prev) => ({ ...prev, referral: undefined }));
            }}
          >
            <div>
              <div className="studio-option-card-title">Without referral</div>
              <div className="studio-option-card-sub">Signing up directly, no referral code</div>
            </div>
          </button>
        </div>
        {errors.referral ? <span className="studio-field-error">{errors.referral}</span> : null}
      </div>

      <div className="studio-form-field studio-form-field--full studio-terms-row">
        <label className="studio-checkbox-option">
          <input
            type="checkbox"
            checked={data.agreedToTerms}
            onChange={(e) => {
              setField("agreedToTerms", e.target.checked);
              setErrors((prev) => ({ ...prev, agreedToTerms: e.target.checked ? undefined : prev.agreedToTerms }));
            }}
          />
          <span>
            I agree to the{" "}
            <button
              type="button"
              className="studio-terms-link"
              onClick={(e) => {
                e.preventDefault();
                setShowTerms(true);
              }}
            >
              Terms and Conditions
            </button>
          </span>
        </label>
        {errors.agreedToTerms ? <span className="studio-field-error">{errors.agreedToTerms}</span> : null}
      </div>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack}>
          Back to Login
        </button>
        <button type="button" className="studio-btn-primary" disabled={!isValidLooking} onClick={handleContinue}>
          Continue
        </button>
      </div>

      {showTerms ? (
        <TermsAndConditionsModal onAccept={handleAcceptTerms} onClose={() => setShowTerms(false)} />
      ) : null}
    </div>
  );
}

/** Field wrapper that can show a live validity tick and/or an error,
 * without every field needing to know about that plumbing itself. */
function FieldShell({
  label,
  required,
  error,
  valid,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  valid?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`studio-form-field ${full ? "studio-form-field--full" : ""}`}>
      <label className="studio-field-label">
        {required ? <span className="studio-required-star">*</span> : null} {label}
      </label>
      <div className="studio-field-shell">
        {children}
        {valid ? <CheckCircleFilled className="studio-field-check" /> : null}
      </div>
      {error ? <span className="studio-field-error">{error}</span> : null}
    </div>
  );
}