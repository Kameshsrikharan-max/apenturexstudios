import { useState } from "react";
import TermsAndConditionsModal from "../../../../../../components/Onboarding/TermsAndConditionModal";

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

type FieldErrors = Partial<Record<keyof BasicInfoData, string>>;

const REQUIRED_FIELDS: (keyof BasicInfoData)[] = [
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

export default function BasicInfoStep({ initialData, onBack, onContinue }: BasicInfoStepProps) {
  const [data, setData] = useState<BasicInfoData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showTerms, setShowTerms] = useState(false);

  const setField = <K extends keyof BasicInfoData>(field: K, value: BasicInfoData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    for (const field of REQUIRED_FIELDS) {
      if (!String(data[field] ?? "").trim()) {
        next[field] = "This field is required.";
      }
    }

    if (!next.email && !EMAIL_PATTERN.test(data.email)) {
      next.email = "Enter a valid email address.";
    }

    if (!next.phone && !PHONE_PATTERN.test(data.phone)) {
      next.phone = "Enter a valid 10-digit phone number.";
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
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onContinue(data);
    }
  };

  const handleAcceptTerms = () => {
    setField("agreedToTerms", true);
    setShowTerms(false);
  };

  const isValidLooking =
    REQUIRED_FIELDS.every((f) => String(data[f] ?? "").trim()) && data.referral !== null && data.agreedToTerms;

  return (
    <div className="basic-info-step">
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Basic Information</h2>
        <p className="studio-form-section-subtitle">Tell us about yourself</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-grid">
        <Field label="First Name" required error={errors.firstName}>
          <input
            className="studio-input"
            placeholder="John"
            value={data.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
          />
        </Field>
        <Field label="Last Name" required error={errors.lastName}>
          <input
            className="studio-input"
            placeholder="Doe"
            value={data.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
          />
        </Field>

        <Field label="Email Address" required error={errors.email}>
          <input
            className="studio-input"
            type="email"
            placeholder="john.doe@example.com"
            value={data.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </Field>
        <Field label="Phone Number" required error={errors.phone}>
          <input
            className="studio-input"
            placeholder="9874563210"
            value={data.phone}
            onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </Field>
      </div>

      <h3 className="studio-form-group-title">Address</h3>

      <div className="studio-form-grid">
        <Field label="Address" required error={errors.address} full>
          <input
            className="studio-input"
            placeholder="123 Main St"
            value={data.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        </Field>

        <Field label="City" required error={errors.city}>
          <input
            className="studio-input"
            placeholder="Chennai"
            value={data.city}
            onChange={(e) => setField("city", e.target.value)}
          />
        </Field>
        <Field label="State" required error={errors.state}>
          <input
            className="studio-input"
            placeholder="Tamilnadu"
            value={data.state}
            onChange={(e) => setField("state", e.target.value)}
          />
        </Field>

        <Field label="Country" required error={errors.country}>
          <input
            className="studio-input"
            placeholder="India"
            value={data.country}
            onChange={(e) => setField("country", e.target.value)}
          />
        </Field>
        <Field label="Postal Code" required error={errors.postalCode}>
          <input
            className="studio-input"
            placeholder="600001"
            value={data.postalCode}
            onChange={(e) => setField("postalCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </Field>
      </div>

      <div className="studio-form-field studio-form-field--full">
        <label className="studio-field-label">
          <span className="studio-required-star">*</span> Register
        </label>
        <div className="studio-radio-row">
          <label className="studio-radio-option">
            <input
              type="radio"
              name="referral"
              checked={data.referral === "with"}
              onChange={() => setField("referral", "with")}
            />
            <span>with Referral</span>
          </label>
          <label className="studio-radio-option">
            <input
              type="radio"
              name="referral"
              checked={data.referral === "without"}
              onChange={() => setField("referral", "without")}
            />
            <span>without Referral</span>
          </label>
        </div>
        {errors.referral ? <span className="studio-field-error">{errors.referral}</span> : null}
      </div>

      <div className="studio-form-field studio-form-field--full studio-terms-row">
        <label className="studio-checkbox-option">
          <input
            type="checkbox"
            checked={data.agreedToTerms}
            onChange={(e) => setField("agreedToTerms", e.target.checked)}
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

function Field({
  label,
  required,
  error,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`studio-form-field ${full ? "studio-form-field--full" : ""}`}>
      <label className="studio-field-label">
        {required ? <span className="studio-required-star">*</span> : null} {label}
      </label>
      {children}
      {error ? <span className="studio-field-error">{error}</span> : null}
    </div>
  );
}