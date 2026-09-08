import { useMemo, useState } from "react";
import { CheckCircleFilled } from "@ant-design/icons";
import TermsAndConditionsModal from "../../../../../../components/Onboarding/TermsAndConditionModal";
import "./StudioManagerBasicInfoStep.css";

export interface StudioManagerBasicInfoData {
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
  referralEmail: string;
  agreedToTerms: boolean;
}

interface StudioManagerBasicInfoStepProps {
  initialData: StudioManagerBasicInfoData;
  onBack: () => void;
  onContinue: (data: StudioManagerBasicInfoData) => void;
}

type TextField = Exclude<keyof StudioManagerBasicInfoData, "referral" | "agreedToTerms">;
type FieldErrors = Partial<Record<keyof StudioManagerBasicInfoData, string>>;

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
const MIN_NAME_LENGTH = 2;

// Single source of truth for what makes a text field valid — used for both
// the on-type/on-blur error message and the live green-tick indicator.
function fieldError(field: TextField, rawValue: string, referral: "with" | "without" | null): string | undefined {
  const value = rawValue.trim();

  if (field === "referralEmail") {
    if (referral !== "with") return undefined;
    if (!value) return "This field is required.";
    return EMAIL_PATTERN.test(value) ? undefined : "Enter a valid email address.";
  }

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

export default function StudioManagerBasicInfoStep({
  initialData,
  onBack,
  onContinue,
}: StudioManagerBasicInfoStepProps) {
  const [data, setData] = useState<StudioManagerBasicInfoData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Only show a field's error state once the person has actually left it —
  // real-time feedback that doesn't shout "required" before they've typed a key.
  const [touched, setTouched] = useState<Partial<Record<TextField, boolean>>>({});
  const [showTerms, setShowTerms] = useState(false);

  const setField = <K extends keyof StudioManagerBasicInfoData>(field: K, value: StudioManagerBasicInfoData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const setTextField = (field: TextField, value: string) => {
    setField(field, value);
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: fieldError(field, value, data.referral) }));
    }
  };

  const handleBlur = (field: TextField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: fieldError(field, data[field], data.referral) }));
  };

  const selectReferral = (value: "with" | "without") => {
    setField("referral", value);
    setErrors((prev) => ({
      ...prev,
      referral: undefined,
      referralEmail: value === "with" ? prev.referralEmail : undefined,
    }));
    if (value === "without") {
      setField("referralEmail", "");
    }
  };

  const validateAll = (): FieldErrors => {
    const next: FieldErrors = {};

    for (const field of REQUIRED_FIELDS) {
      const message = fieldError(field, data[field], data.referral);
      if (message) next[field] = message;
    }

    if (!data.referral) {
      next.referral = "Choose one option.";
    } else {
      const referralEmailError = fieldError("referralEmail", data.referralEmail, data.referral);
      if (referralEmailError) next.referralEmail = referralEmailError;
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

  const isFieldValid = (field: TextField): boolean => !fieldError(field, data[field], data.referral);

  const isValidLooking =
    REQUIRED_FIELDS.every((f) => isFieldValid(f)) &&
    data.referral !== null &&
    (data.referral === "without" || isFieldValid("referralEmail")) &&
    data.agreedToTerms;

  const completion = useMemo(() => {
    const filled =
      REQUIRED_FIELDS.filter((f) => isFieldValid(f)).length +
      (data.referral ? 1 : 0) +
      (data.referral !== "with" || isFieldValid("referralEmail") ? 1 : 0) +
      (data.agreedToTerms ? 1 : 0);
    const total = REQUIRED_FIELDS.length + 3;
    return Math.round((filled / total) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="smx-basic-info-step">
      <div className="smx-section-header">
        <div>
          <h2 className="smx-section-title">Basic Information</h2>
          <p className="smx-section-subtitle">Tell us about yourself</p>
        </div>
        <div className="smx-meter" role="img" aria-label={`${completion}% complete`}>
          <svg viewBox="0 0 40 40" className="smx-meter-ring">
            <circle cx="20" cy="20" r="17" className="smx-meter-track" />
            <circle
              cx="20"
              cy="20"
              r="17"
              className="smx-meter-progress"
              style={{ strokeDasharray: `${(completion / 100) * 106.8} 106.8` }}
            />
          </svg>
          <span className="smx-meter-label">{completion}%</span>
        </div>
      </div>
      <div className="smx-divider" />

      <div className="smx-grid">
        <Field
          label="First Name"
          required
          error={touched.firstName ? errors.firstName : undefined}
          valid={isFieldValid("firstName")}
        >
          <input
            className={`smx-input ${touched.firstName && errors.firstName ? "smx-input--invalid" : ""}`}
            placeholder="Srikharan"
            autoComplete="given-name"
            value={data.firstName}
            onChange={(e) => setTextField("firstName", e.target.value)}
            onBlur={() => handleBlur("firstName")}
          />
        </Field>
        <Field
          label="Last Name"
          required
          error={touched.lastName ? errors.lastName : undefined}
          valid={isFieldValid("lastName")}
        >
          <input
            className={`smx-input ${touched.lastName && errors.lastName ? "smx-input--invalid" : ""}`}
            placeholder="Kamesh"
            autoComplete="family-name"
            value={data.lastName}
            onChange={(e) => setTextField("lastName", e.target.value)}
            onBlur={() => handleBlur("lastName")}
          />
        </Field>

        <Field
          label="Email Address"
          required
          error={touched.email ? errors.email : undefined}
          valid={isFieldValid("email")}
        >
          <input
            className={`smx-input ${touched.email && errors.email ? "smx-input--invalid" : ""}`}
            type="email"
            placeholder="srikharankamesh@gmail.com"
            autoComplete="email"
            value={data.email}
            onChange={(e) => setTextField("email", e.target.value)}
            onBlur={() => handleBlur("email")}
          />
        </Field>
        <Field
          label="Phone Number"
          required
          error={touched.phone ? errors.phone : undefined}
          valid={isFieldValid("phone")}
        >
          <div className="smx-phone-row">
            <span className="smx-phone-code">+91</span>
            <input
              className={`smx-input smx-phone-input ${
                touched.phone && errors.phone ? "smx-input--invalid" : ""
              }`}
              placeholder="8838346238"
              inputMode="numeric"
              autoComplete="tel-national"
              value={data.phone}
              onChange={(e) => setTextField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => handleBlur("phone")}
            />
          </div>
        </Field>
      </div>

      <h3 className="smx-group-title">Address</h3>

      <div className="smx-grid">
        <Field
          label="Address"
          required
          error={touched.address ? errors.address : undefined}
          valid={isFieldValid("address")}
          full
        >
          <input
            className={`smx-input ${touched.address && errors.address ? "smx-input--invalid" : ""}`}
            placeholder="123 Main St"
            autoComplete="street-address"
            value={data.address}
            onChange={(e) => setTextField("address", e.target.value)}
            onBlur={() => handleBlur("address")}
          />
        </Field>

        <Field
          label="City"
          required
          error={touched.city ? errors.city : undefined}
          valid={isFieldValid("city")}
        >
          <input
            className={`smx-input ${touched.city && errors.city ? "smx-input--invalid" : ""}`}
            placeholder="Chennai"
            autoComplete="address-level2"
            value={data.city}
            onChange={(e) => setTextField("city", e.target.value)}
            onBlur={() => handleBlur("city")}
          />
        </Field>
        <Field
          label="State"
          required
          error={touched.state ? errors.state : undefined}
          valid={isFieldValid("state")}
        >
          <input
            className={`smx-input ${touched.state && errors.state ? "smx-input--invalid" : ""}`}
            placeholder="Tamil Nadu"
            autoComplete="address-level1"
            value={data.state}
            onChange={(e) => setTextField("state", e.target.value)}
            onBlur={() => handleBlur("state")}
          />
        </Field>

        <Field
          label="Country"
          required
          error={touched.country ? errors.country : undefined}
          valid={isFieldValid("country")}
        >
          <input
            className={`smx-input ${touched.country && errors.country ? "smx-input--invalid" : ""}`}
            placeholder="India"
            autoComplete="country-name"
            value={data.country}
            onChange={(e) => setTextField("country", e.target.value)}
            onBlur={() => handleBlur("country")}
          />
        </Field>
        <Field
          label="Postal Code"
          required
          error={touched.postalCode ? errors.postalCode : undefined}
          valid={isFieldValid("postalCode")}
        >
          <input
            className={`smx-input ${touched.postalCode && errors.postalCode ? "smx-input--invalid" : ""}`}
            placeholder="600001"
            inputMode="numeric"
            autoComplete="postal-code"
            value={data.postalCode}
            onChange={(e) => setTextField("postalCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            onBlur={() => handleBlur("postalCode")}
          />
        </Field>
      </div>

      <div className="smx-field smx-field--full">
        <label className="smx-label">
          <span className="smx-required">*</span> Register
        </label>
        <div className="smx-referral-row">
          <button
            type="button"
            className={`smx-option-card smx-referral-card ${
              data.referral === "with" ? "smx-option-card--selected" : ""
            }`}
            onClick={() => selectReferral("with")}
          >
            <div>
              <div className="smx-option-card-title">With Referral</div>
              <div className="smx-option-card-sub">I was referred by an existing studio manager</div>
            </div>
          </button>
          <button
            type="button"
            className={`smx-option-card smx-referral-card ${
              data.referral === "without" ? "smx-option-card--selected" : ""
            }`}
            onClick={() => selectReferral("without")}
          >
            <div>
              <div className="smx-option-card-title">Without Referral</div>
              <div className="smx-option-card-sub">Signing up directly, no referral</div>
            </div>
          </button>
        </div>
        {errors.referral ? <span className="smx-error-text">{errors.referral}</span> : null}
      </div>

      {data.referral === "with" ? (
        <div className="smx-grid">
          <Field
            label="Referral Email"
            required
            error={errors.referralEmail}
            valid={isFieldValid("referralEmail")}
          >
            <input
              className={`smx-input ${errors.referralEmail ? "smx-input--invalid" : ""}`}
              type="email"
              placeholder="referrer@example.com"
              value={data.referralEmail}
              onChange={(e) => setTextField("referralEmail", e.target.value)}
              onBlur={() =>
                setErrors((prev) => ({
                  ...prev,
                  referralEmail: fieldError("referralEmail", data.referralEmail, data.referral),
                }))
              }
            />
          </Field>
        </div>
      ) : null}

      <div className="smx-field smx-field--full smx-terms-row">
        <label className="smx-checkbox">
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
              className="smx-terms-link"
              onClick={(e) => {
                e.preventDefault();
                setShowTerms(true);
              }}
            >
              Terms and Conditions
            </button>
          </span>
        </label>
        {errors.agreedToTerms ? <span className="smx-error-text">{errors.agreedToTerms}</span> : null}
      </div>

      <div className="smx-actions">
        <button type="button" className="smx-btn-secondary" onClick={onBack}>
          Back to Login
        </button>
        <button type="button" className="smx-btn-primary" disabled={!isValidLooking} onClick={handleContinue}>
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
function Field({
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
    <div className={`smx-field ${full ? "smx-field--full" : ""}`}>
      <label className="smx-label">
        {required ? <span className="smx-required">*</span> : null} {label}
      </label>
      <div className="smx-shell">
        {children}
        {valid ? <CheckCircleFilled className="smx-check" /> : null}
      </div>
      {error ? <span className="smx-error-text">{error}</span> : null}
    </div>
  );
}