import { useState } from "react";
import { CheckCircleFilled } from "@ant-design/icons";
import "./StudioPhotographerBasicInfoStep.css";

export interface StudioPhotographerBasicInfoData {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  agreedToTerms: boolean;
}

interface StudioPhotographerBasicInfoStepProps {
  initialData: StudioPhotographerBasicInfoData;
  email: string;
  onBack: () => void;
  onContinue: (data: StudioPhotographerBasicInfoData) => void;
}

type TextField = Exclude<keyof StudioPhotographerBasicInfoData, "agreedToTerms">;
type FieldErrors = Partial<Record<TextField, string>>;

const REQUIRED_FIELDS: TextField[] = [
  "firstName",
  "lastName",
  "phone",
  "address",
  "city",
  "state",
  "country",
  "postalCode",
];

const PHONE_PATTERN = /^\d{10}$/;
const POSTAL_CODE_PATTERN = /^\d{6}$/;
const MIN_NAME_LENGTH = 2;

function fieldError(field: TextField, rawValue: string): string | undefined {
  const value = rawValue.trim();

  if (!value) {
    return "This field is required.";
  }

  switch (field) {
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

export default function StudioPhotographerBasicInfoStep({
  initialData,
  email,
  onBack,
  onContinue,
}: StudioPhotographerBasicInfoStepProps) {
  const [data, setData] = useState<StudioPhotographerBasicInfoData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<TextField, boolean>>>({});

  const setField = <K extends keyof StudioPhotographerBasicInfoData>(
    field: K,
    value: StudioPhotographerBasicInfoData[K]
  ) => setData((prev) => ({ ...prev, [field]: value }));

  const setTextField = (field: TextField, value: string) => {
    setField(field, value);
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: fieldError(field, value) }));
    }
  };

  const handleBlur = (field: TextField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: fieldError(field, data[field]) }));
  };

  const isFieldValid = (field: TextField) => !fieldError(field, data[field]);

  const isValidLooking = REQUIRED_FIELDS.every((f) => isFieldValid(f)) && data.agreedToTerms;

  const handleContinue = () => {
    const nextErrors: FieldErrors = {};
    for (const field of REQUIRED_FIELDS) {
      const message = fieldError(field, data[field]);
      if (message) nextErrors[field] = message;
    }
    setErrors(nextErrors);
    setTouched(REQUIRED_FIELDS.reduce((acc, field) => ({ ...acc, [field]: true }), {} as Record<TextField, boolean>));

    if (Object.keys(nextErrors).length === 0 && data.agreedToTerms) {
      onContinue(data);
    }
  };

  return (
    <>
      <div className="studio-form-section-header">
        <h2 className="studio-form-section-title">Basic Information</h2>
        <p className="studio-form-section-subtitle">Tell us about yourself</p>
      </div>
      <div className="studio-form-divider" />

      <div className="studio-form-grid">
        <Field
          label="First Name"
          required
          error={touched.firstName ? errors.firstName : undefined}
          valid={isFieldValid("firstName")}
        >
          <input
            className={`studio-input ${touched.firstName && errors.firstName ? "studio-input--invalid" : ""}`}
            value={data.firstName}
            onChange={(e) => setTextField("firstName", e.target.value)}
            onBlur={() => handleBlur("firstName")}
            placeholder="e.g. Arun"
          />
        </Field>
        <Field
          label="Last Name"
          required
          error={touched.lastName ? errors.lastName : undefined}
          valid={isFieldValid("lastName")}
        >
          <input
            className={`studio-input ${touched.lastName && errors.lastName ? "studio-input--invalid" : ""}`}
            value={data.lastName}
            onChange={(e) => setTextField("lastName", e.target.value)}
            onBlur={() => handleBlur("lastName")}
            placeholder="e.g. Kumar"
          />
        </Field>

        <div className="studio-form-field studio-form-field--full">
          <label className="studio-field-label">Email Address</label>
          <input className="studio-input" value={email} disabled title="Locked to your invite" />
          <span className="studio-field-hint">This is the email your invite was sent to and can't be changed.</span>
        </div>

        <Field
          label="Phone Number"
          required
          error={touched.phone ? errors.phone : undefined}
          valid={isFieldValid("phone")}
        >
          <input
            className={`studio-input ${touched.phone && errors.phone ? "studio-input--invalid" : ""}`}
            value={data.phone}
            inputMode="numeric"
            onChange={(e) => setTextField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            onBlur={() => handleBlur("phone")}
            placeholder="9876543210"
          />
        </Field>

        <Field
          label="Address"
          required
          full
          error={touched.address ? errors.address : undefined}
          valid={isFieldValid("address")}
        >
          <input
            className={`studio-input ${touched.address && errors.address ? "studio-input--invalid" : ""}`}
            value={data.address}
            onChange={(e) => setTextField("address", e.target.value)}
            onBlur={() => handleBlur("address")}
            placeholder="123 Main St"
          />
        </Field>

        <Field
          label="City"
          required
          error={touched.city ? errors.city : undefined}
          valid={isFieldValid("city")}
        >
          <input
            className={`studio-input ${touched.city && errors.city ? "studio-input--invalid" : ""}`}
            value={data.city}
            onChange={(e) => setTextField("city", e.target.value)}
            onBlur={() => handleBlur("city")}
            placeholder="Chennai"
          />
        </Field>
        <Field
          label="State"
          required
          error={touched.state ? errors.state : undefined}
          valid={isFieldValid("state")}
        >
          <input
            className={`studio-input ${touched.state && errors.state ? "studio-input--invalid" : ""}`}
            value={data.state}
            onChange={(e) => setTextField("state", e.target.value)}
            onBlur={() => handleBlur("state")}
            placeholder="Tamil Nadu"
          />
        </Field>
        <Field
          label="Country"
          required
          error={touched.country ? errors.country : undefined}
          valid={isFieldValid("country")}
        >
          <input
            className={`studio-input ${touched.country && errors.country ? "studio-input--invalid" : ""}`}
            value={data.country}
            onChange={(e) => setTextField("country", e.target.value)}
            onBlur={() => handleBlur("country")}
            placeholder="India"
          />
        </Field>
        <Field
          label="Postal Code"
          required
          error={touched.postalCode ? errors.postalCode : undefined}
          valid={isFieldValid("postalCode")}
        >
          <input
            className={`studio-input ${touched.postalCode && errors.postalCode ? "studio-input--invalid" : ""}`}
            value={data.postalCode}
            inputMode="numeric"
            onChange={(e) => setTextField("postalCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            onBlur={() => handleBlur("postalCode")}
            placeholder="600001"
          />
        </Field>
      </div>

      <label className="studio-checkbox-option studio-terms-row">
        <input
          type="checkbox"
          checked={data.agreedToTerms}
          onChange={(e) => setField("agreedToTerms", e.target.checked)}
        />
        I agree to the Terms and Conditions
      </label>

      <div className="studio-form-actions">
        <button type="button" className="studio-btn-secondary" onClick={onBack}>
          Back
        </button>
        <div className="studio-form-actions-right">
          <button type="button" className="studio-btn-primary" disabled={!isValidLooking} onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    </>
  );
}

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
    <div className={`studio-form-field ${full ? "studio-form-field--full" : ""}`}>
      <label className="studio-field-label">
        {label} {required ? <span className="studio-required-star">*</span> : null}
      </label>
      <div className="studio-field-shell">
        {children}
        {valid ? <CheckCircleFilled className="studio-field-check" /> : null}
      </div>
      {error ? <span className="studio-field-error">{error}</span> : null}
    </div>
  );
}