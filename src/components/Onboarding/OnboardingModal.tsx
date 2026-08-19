import { useEffect, useMemo, useState } from "react";
import {ArrowLeftOutlined,BankOutlined,CameraOutlined,CheckCircleOutlined,CloseCircleOutlined,EnvironmentOutlined,FileTextOutlined,GlobalOutlined,HomeOutlined,IdcardOutlined,
  LockOutlined,MailOutlined,NumberOutlined,PhoneOutlined,SafetyCertificateOutlined,StarOutlined,ThunderboltFilled,ToolOutlined,UserOutlined,
} from "@ant-design/icons";
import "./OnboardingModal.css";

const ONBOARD_BG_URL =
  "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070";

type DocField = {
  key: string;
  label: string;
  required: boolean;
  placeholder?: string;
  hint?: string;
};

const DOC_FIELDS: Record<string, DocField[]> = {
  aadhaar: [],
  pan: [
    {
      key: "panNumber",
      label: "PAN Number",
      required: true,
      placeholder: "ABCDE1234F",
      hint: "Format: 5 letters, 4 digits, 1 letter",
    },
  ],
  dl: [
    {
      key: "dlNumber",
      label: "DL Number",
      required: true,
      placeholder: "TN0120210012345",
      hint: "As printed on your license",
    },
    {
      key: "dob",
      label: "Date of Birth",
      required: true,
      placeholder: "DD-MM-YYYY",
      hint: "Format: DD-MM-YYYY",
    },
    { key: "dlName", label: "Full Name (as on DL)", required: false },
  ],
  passport: [
    {
      key: "passportNo",
      label: "Passport Number",
      required: true,
      placeholder: "A1234567",
      hint: "Format: 1 letter + 7 digits",
    },
    {
      key: "dob",
      label: "Date of Birth",
      required: true,
      placeholder: "DD-MM-YYYY",
      hint: "Format: DD-MM-YYYY",
    },
    {
      key: "expiry",
      label: "Expiry Date",
      required: false,
      placeholder: "DD-MM-YYYY",
      hint: "Format: DD-MM-YYYY",
    },
    { key: "passportName", label: "Full Name (as on Passport)", required: false },
  ],
};

/* Validators */

const isValidCalendarDate = (dd: number, mm: number, yyyy: number) => {
  const d = new Date(yyyy, mm - 1, dd);
  return d.getDate() === dd && d.getMonth() === mm - 1 && d.getFullYear() === yyyy;
};

const validators: Record<string, (value: string) => string> = {
  name: (v) => {
    if (!v.trim()) return "Name is required";
    if (v.trim().length < 2) return "Name must be at least 2 characters";
    if (!/^[a-zA-Z\s.'-]+$/.test(v.trim())) return "Only letters and spaces allowed";
    return "";
  },
  email: (v) => {
    if (!v.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return "Enter a valid email address";
    return "";
  },
  phone: (v) => {
    if (!v.trim()) return "Phone number is required";
    const digits = v.trim().replace(/^\+?91/, "").replace(/[\s-]/g, "");
    if (!/^[6-9]\d{9}$/.test(digits)) return "Enter a valid 10-digit mobile number";
    return "";
  },
  studioName: (v) => {
    if (!v.trim()) return "Studio name is required";
    if (v.trim().length < 2) return "Too short";
    return "";
  },
  address: (v) => {
    if (!v.trim()) return "Address is required";
    if (v.trim().length < 10) return "Please enter a complete address";
    return "";
  },
  city: (v) => (!v.trim() ? "City is required" : ""),
  state: (v) => (!v.trim() ? "State is required" : ""),
  country: (v) => (!v.trim() ? "Country is required" : ""),
  postalCode: (v) => {
    if (!v.trim()) return "Postal code is required";
    if (!/^\d{6}$/.test(v.trim())) return "Enter a valid 6-digit PIN code";
    return "";
  },
  about: (v) => {
    if (!v.trim()) return "This field is required";
    if (v.trim().length < 20) return "Please write at least 20 characters";
    return "";
  },
  specialization: (v) => (!v.trim() ? "Specialization is required" : ""),
  services: (v) => (!v.trim() ? "Services are required" : ""),
  panNumber: (v) => {
    if (!v.trim()) return "PAN number is required";
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.trim().toUpperCase())) return "Format: ABCDE1234F";
    return "";
  },
  dlNumber: (v) => {
    if (!v.trim()) return "DL number is required";
    if (v.trim().replace(/[\s-]/g, "").length < 8) return "Enter a valid DL number";
    return "";
  },
  dob: (v) => {
    if (!v.trim()) return "Date of birth is required";
    const m = v.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return "Use format DD-MM-YYYY";
    const dd = +m[1], mm = +m[2], yyyy = +m[3];
    if (!isValidCalendarDate(dd, mm, yyyy)) return "That date doesn't exist";
    const dob = new Date(yyyy, mm - 1, dd);
    if (dob > new Date()) return "Date cannot be in the future";
    const age = new Date().getFullYear() - yyyy;
    if (age < 18) return "Must be at least 18 years old";
    if (age > 100) return "Please check the year";
    return "";
  },
  expiry: (v) => {
    if (!v.trim()) return "";
    const m = v.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return "Use format DD-MM-YYYY";
    const dd = +m[1], mm = +m[2], yyyy = +m[3];
    if (!isValidCalendarDate(dd, mm, yyyy)) return "That date doesn't exist";
    return "";
  },
  passportNo: (v) => {
    if (!v.trim()) return "Passport number is required";
    if (!/^[A-Za-z][0-9]{7}$/.test(v.trim())) return "Format: A1234567";
    return "";
  },
  dlName: () => "",
  passportName: () => "",
};

const validate = (key: string, value: string) => (validators[key] ? validators[key](value) : "");

/*  Decorative HUD primitives */

function ScanFrame() {
  return (
    <>
      <span className="ob-corner ob-corner--tl" />
      <span className="ob-corner ob-corner--tr" />
      <span className="ob-corner ob-corner--bl" />
      <span className="ob-corner ob-corner--br" />
      <span className="ob-scanline" />
    </>
  );
}

function DriftParticles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        delay: (Math.random() * 10).toFixed(2),
        dur: (14 + Math.random() * 10).toFixed(2),
        size: (1.5 + Math.random() * 2).toFixed(1),
      })),
    []
  );
  return (
    <div className="ob-particles" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.id}
          className="ob-particle"
          style={{
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

/* Field primitives */

type FieldStatus = "idle" | "error" | "success";

type FieldProps = {
  icon?: React.ReactNode;
  label: string;
  required?: boolean;
  status?: FieldStatus;
  errorText?: string;
  hint?: string;
  children?: React.ReactNode;
};

function Field({ icon, label, required, status = "idle", errorText, hint, children }: FieldProps) {
  return (
    <div className={`ob-field${status === "error" ? " ob-field--shake" : ""}`}>
      <label className="ob-field-label">
        {required && <span className="ob-req">*</span>} {label}
      </label>
      <div className={`ob-field-control ob-field-control--${status}`}>
        {icon && <span className="ob-field-icon">{icon}</span>}
        {children}
        {status === "success" && <CheckCircleOutlined className="ob-field-status ob-field-status--ok" />}
        {status === "error" && <CloseCircleOutlined className="ob-field-status ob-field-status--bad" />}
      </div>
      {status === "error" && errorText ? (
        <span className="ob-field-msg ob-field-msg--error">{errorText}</span>
      ) : hint ? (
        <span className="ob-field-msg ob-field-msg--hint">{hint}</span>
      ) : null}
    </div>
  );
}

type TextInputProps = {
  icon?: React.ReactNode;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  error?: string;
  touched?: boolean;
  hint?: string;
};

function TextInput({
  icon,
  label,
  required,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  error,
  touched,
  hint,
}: TextInputProps) {
  const status: FieldStatus = touched ? (error ? "error" : value.trim() ? "success" : "idle") : "idle";
  return (
    <Field icon={icon} label={label} required={required} status={status} errorText={error} hint={hint}>
      <input
        type={type}
        className="ob-input"
        value={value}
        placeholder={placeholder || label}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </Field>
  );
}

type TextAreaProps = {
  icon?: React.ReactNode;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  touched?: boolean;
  hint?: string;
};

function TextArea({
  icon,
  label,
  required,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 4,
  error,
  touched,
  hint,
}: TextAreaProps) {
  const status: FieldStatus = touched ? (error ? "error" : value.trim() ? "success" : "idle") : "idle";
  return (
    <Field icon={icon} label={label} required={required} status={status} errorText={error} hint={hint}>
      <textarea
        className="ob-textarea"
        rows={rows}
        value={value}
        placeholder={placeholder || label}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </Field>
  );
}

type OnboardingModalProps = {
  prefill?: { name?: string; email?: string; phone?: string };
  onComplete: (data: any) => void;
  onBack?: () => void;
};

function OnboardingModal({ prefill, onComplete, onBack }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [mounted, setMounted] = useState(false);
  const [cardShake, setCardShake] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const triggerShake = () => {
    setCardShake(true);
    window.setTimeout(() => setCardShake(false), 420);
  };

  /* ---------------- Step 1 state ---------------- */
  const [basic, setBasic] = useState({
    name: prefill?.name || "",
    email: prefill?.email || "",
    phone: prefill?.phone || "",
    studioName: "",
    address: "",
  });
  const [basicTouched, setBasicTouched] = useState<Record<string, boolean>>({});

  const [kyc, setKyc] = useState<{
    docType: string;
    vals: Record<string, string>;
    consent: boolean;
  }>({ docType: "", vals: {}, consent: false });
  const [kycTouched, setKycTouched] = useState<{
    docType: boolean;
    consent: boolean;
    vals: Record<string, boolean>;
  }>({ docType: false, consent: false, vals: {} });

  /* ---------------- Step 2 state ---------------- */
  const [studio, setStudio] = useState({
    studioName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });
  const [studioTouched, setStudioTouched] = useState<Record<string, boolean>>({});

  const [portfolio, setPortfolio] = useState({
    about: "",
    specialization: "",
    services: "",
  });
  const [portfolioTouched, setPortfolioTouched] = useState<Record<string, boolean>>({});

  const setBasicField = (field: keyof typeof basic) => (value: string) =>
    setBasic((p) => ({ ...p, [field]: value }));
  const touchBasicField = (field: keyof typeof basic) => () =>
    setBasicTouched((p) => ({ ...p, [field]: true }));

  const setStudioField = (field: keyof typeof studio) => (value: string) =>
    setStudio((p) => ({ ...p, [field]: value }));
  const touchStudioField = (field: keyof typeof studio) => () =>
    setStudioTouched((p) => ({ ...p, [field]: true }));

  const setPortfolioField = (field: keyof typeof portfolio) => (value: string) =>
    setPortfolio((p) => ({ ...p, [field]: value }));
  const touchPortfolioField = (field: keyof typeof portfolio) => () =>
    setPortfolioTouched((p) => ({ ...p, [field]: true }));

  const basicErrors = useMemo(() => {
    const e: Record<string, string> = {};
    (Object.keys(basic) as (keyof typeof basic)[]).forEach((k) => {
      e[k] = validate(k, basic[k]);
    });
    return e;
  }, [basic]);

  const studioErrors = useMemo(() => {
    const e: Record<string, string> = {};
    (Object.keys(studio) as (keyof typeof studio)[]).forEach((k) => {
      e[k] = validate(k, studio[k]);
    });
    return e;
  }, [studio]);

  const portfolioErrors = useMemo(() => {
    const e: Record<string, string> = {};
    (Object.keys(portfolio) as (keyof typeof portfolio)[]).forEach((k) => {
      e[k] = validate(k, portfolio[k]);
    });
    return e;
  }, [portfolio]);

  const kycFields = DOC_FIELDS[kyc.docType] || [];

  const kycFieldErrors = useMemo(() => {
    const e: Record<string, string> = {};
    kycFields.forEach((f) => {
      e[f.key] = validate(f.key, kyc.vals[f.key] || "");
    });
    return e;
  }, [kyc.vals, kycFields]);

  const kycComplete = useMemo(() => {
    if (!kyc.docType || !kyc.consent) return false;
    return kycFields.every((f) => !f.required || ((kyc.vals[f.key] || "").trim() && !kycFieldErrors[f.key]));
  }, [kyc, kycFields, kycFieldErrors]);

  const step1FieldsValid =
    !basicErrors.name &&
    !basicErrors.email &&
    !basicErrors.phone &&
    !basicErrors.studioName &&
    !basicErrors.address &&
    basic.name.trim() &&
    basic.email.trim() &&
    basic.phone.trim() &&
    basic.studioName.trim() &&
    basic.address.trim();

  const step1Valid = Boolean(step1FieldsValid) && kycComplete;

  const step2Valid = useMemo(() => {
    const studioOk = (Object.keys(studio) as (keyof typeof studio)[]).every(
      (k) => studio[k].trim() && !studioErrors[k]
    );
    const portfolioOk = (Object.keys(portfolio) as (keyof typeof portfolio)[]).every(
      (k) => portfolio[k].trim() && !portfolioErrors[k]
    );
    return studioOk && portfolioOk;
  }, [studio, studioErrors, portfolio, portfolioErrors]);


  const progress = useMemo(() => {
    if (step === 1) {
      const fields = [basic.name, basic.email, basic.phone, basic.studioName, basic.address];
      const filled = fields.filter((f) => f.trim()).length + (kycComplete ? 1 : 0);
      return Math.min(50, Math.round((filled / (fields.length + 1)) * 50));
    }
    const fields = [
      studio.studioName,
      studio.phone,
      studio.address,
      studio.city,
      studio.state,
      studio.country,
      studio.postalCode,
      portfolio.about,
      portfolio.specialization,
      portfolio.services,
    ];
    const filled = fields.filter((f) => f.trim()).length;
    return 50 + Math.min(50, Math.round((filled / fields.length) * 50));
  }, [step, basic, kycComplete, studio, portfolio]);

  const markStep1Touched = () => {
    setBasicTouched({ name: true, email: true, phone: true, studioName: true, address: true });
    setKycTouched({
      docType: true,
      consent: true,
      vals: Object.fromEntries(kycFields.map((f) => [f.key, true])),
    });
  };

  const markStep2Touched = () => {
    setStudioTouched({
      studioName: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
    });
    setPortfolioTouched({ about: true, specialization: true, services: true });
  };

  const goToStep2 = () => {
    if (!step1Valid) {
      markStep1Touched();
      triggerShake();
      setError("Please fix the highlighted fields and complete KYC verification before continuing.");
      return;
    }
    setError("");
    setDirection("fwd");
    setStep(2);
  };

  const goBackToStep1 = () => {
    setError("");
    setDirection("back");
    setStep(1);
  };

  const handleSubmit = () => {
    if (!step2Valid) {
      markStep2Touched();
      triggerShake();
      setError("Please fix the highlighted fields in Studio and Portfolio details to finish.");
      return;
    }
    setError("");
    onComplete({
      basic,
      kyc,
      studio,
      portfolio,
      completedAt: new Date().toISOString(),
    });
  };

  const handleKycValChange = (key: string) => (v: string) => {
    const normalized = key === "panNumber" || key === "passportNo" ? v.toUpperCase() : v;
    setKyc((p) => ({ ...p, vals: { ...p.vals, [key]: normalized } }));
  };
  const touchKycVal = (key: string) => () =>
    setKycTouched((p) => ({ ...p, vals: { ...p.vals, [key]: true } }));

  return (
    <div
      className={`ob-overlay${mounted ? " ob-overlay--mounted" : ""}`}
      role="dialog"
      aria-modal="true"
      style={{
        backgroundImage: `linear-gradient(rgba(2,6,23,0.82), rgba(2,6,23,0.94)), url('${ONBOARD_BG_URL}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="ob-backdrop-glow" />
      <DriftParticles />

      <div className={`ob-card${cardShake ? " ob-card--shake" : ""}`}>
        <ScanFrame />

        {step === 1 && onBack && (
          <button type="button" className="ob-back-btn" onClick={onBack}>
            <ArrowLeftOutlined /> <span>Back to login</span>
          </button>
        )}

        {/* live progress rail */}
        <div className="ob-progress-rail" aria-hidden="true">
          <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="ob-progress-label">{progress}% complete</div>

        {step === 1 && (
          <h1 className="ob-welcome-title">
            <ThunderboltFilled className="ob-welcome-bolt" />
            Welcome to <span className="ob-welcome-highlight">Apenture X Studios</span>
          </h1>
        )}

        <div className="ob-steps-bar">
          <div className={`ob-step-pill${step === 1 ? " ob-step-pill--active" : " ob-step-pill--done"}`}>
            <span className="ob-step-num">{step > 1 ? <CheckCircleOutlined /> : "1"}</span>
            <span>Your Details &amp; KYC</span>
          </div>
          <div className="ob-step-line">
            <span className="ob-step-line-pulse" style={{ opacity: step > 1 ? 1 : 0 }} />
          </div>
          <div className={`ob-step-pill${step === 2 ? " ob-step-pill--active" : ""}`}>
            <span className="ob-step-num">2</span>
            <span>My Studio &amp; Portfolio</span>
          </div>
        </div>

        <div className="ob-step-viewport">
          <div key={step} className={`ob-step-body ob-step-body--${direction}`}>
            {step === 1 && (
              <>
                <p className="ob-step-subtitle">
                  Let's get your account set up. This only takes a minute.
                </p>

                <div className="ob-section" style={{ ["--ob-delay" as any]: "0.02s" }}>
                  <h3 className="ob-section-title">
                    <span className="ob-section-icon"><UserOutlined /></span> Your Details
                  </h3>
                  <div className="ob-grid-2">
                    <TextInput
                      icon={<UserOutlined />}
                      label="Name"
                      required
                      value={basic.name}
                      onChange={setBasicField("name")}
                      onBlur={touchBasicField("name")}
                      error={basicErrors.name}
                      touched={basicTouched.name}
                    />
                    <TextInput
                      icon={<MailOutlined />}
                      label="Email ID"
                      required
                      value={basic.email}
                      onChange={setBasicField("email")}
                      onBlur={touchBasicField("email")}
                      type="email"
                      error={basicErrors.email}
                      touched={basicTouched.email}
                    />
                    <TextInput
                      icon={<PhoneOutlined />}
                      label="Phone Number"
                      required
                      value={basic.phone}
                      onChange={setBasicField("phone")}
                      onBlur={touchBasicField("phone")}
                      error={basicErrors.phone}
                      touched={basicTouched.phone}
                      hint="10-digit mobile number"
                    />
                    <TextInput
                      icon={<BankOutlined />}
                      label="Studio Name"
                      required
                      value={basic.studioName}
                      onChange={setBasicField("studioName")}
                      onBlur={touchBasicField("studioName")}
                      error={basicErrors.studioName}
                      touched={basicTouched.studioName}
                    />
                  </div>
                  <TextInput
                    icon={<EnvironmentOutlined />}
                    label="Address"
                    required
                    value={basic.address}
                    onChange={setBasicField("address")}
                    onBlur={touchBasicField("address")}
                    error={basicErrors.address}
                    touched={basicTouched.address}
                  />
                </div>

                <div className="ob-section" style={{ ["--ob-delay" as any]: "0.1s" }}>
                  <h3 className="ob-section-title">
                    <span className="ob-section-icon"><SafetyCertificateOutlined /></span> KYC Verification
                    {kycComplete && (
                      <span className="ob-verified-chip">
                        <CheckCircleOutlined /> Verified
                      </span>
                    )}
                  </h3>

                  <Field
                    icon={<IdcardOutlined />}
                    label="Document Type"
                    required
                    status={
                      kycTouched.docType ? (kyc.docType ? "success" : "error") : "idle"
                    }
                    errorText="Please select a document type"
                  >
                    <select
                      className="ob-select"
                      value={kyc.docType}
                      onChange={(e) =>
                        setKyc({ docType: e.target.value, vals: {}, consent: false })
                      }
                      onBlur={() => setKycTouched((p) => ({ ...p, docType: true }))}
                    >
                      <option value="">Select document type</option>
                      <option value="aadhaar">Aadhaar</option>
                      <option value="pan">PAN</option>
                      <option value="dl">Driving License</option>
                      <option value="passport">Passport</option>
                    </select>
                  </Field>

                  {kyc.docType === "aadhaar" && (
                    <div className="ob-info-banner">
                      Aadhaar verification uses Digilocker. You'll be redirected to complete linking after submitting.
                    </div>
                  )}

                  {kycFields.length > 0 && (
                    <div className="ob-grid-2">
                      {kycFields.map((f) => (
                        <TextInput
                          key={f.key}
                          label={f.label}
                          required={f.required}
                          placeholder={f.placeholder}
                          value={kyc.vals[f.key] || ""}
                          onChange={handleKycValChange(f.key)}
                          onBlur={touchKycVal(f.key)}
                          error={kycFieldErrors[f.key]}
                          touched={kycTouched.vals[f.key]}
                          hint={f.hint}
                        />
                      ))}
                    </div>
                  )}

                  {kyc.docType && (
                    <label className={`ob-consent${kycTouched.consent && !kyc.consent ? " ob-consent--error" : ""}`}>
                      <input
                        type="checkbox"
                        checked={kyc.consent}
                        onChange={(e) => setKyc((p) => ({ ...p, consent: e.target.checked }))}
                        onBlur={() => setKycTouched((p) => ({ ...p, consent: true }))}
                      />
                      <span>I consent to KYC verification via Truthscreen</span>
                    </label>
                  )}
                  {kyc.docType && kycTouched.consent && !kyc.consent && (
                    <span className="ob-field-msg ob-field-msg--error">Consent is required to proceed</span>
                  )}
                </div>

                {error && <div className="ob-error">{error}</div>}

                <div className="ob-actions ob-actions--single">
                  <button type="button" className="ob-btn-primary" onClick={goToStep2}>
                    <span>Continue</span> <ThunderboltFilled />
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="ob-step-subtitle">Almost done — tell us about your studio and your work.</p>

                <div className="ob-section" style={{ ["--ob-delay" as any]: "0.02s" }}>
                  <h3 className="ob-section-title">
                    <span className="ob-section-icon"><HomeOutlined /></span> My Studio
                  </h3>
                  <div className="ob-grid-2">
                    <TextInput
                      icon={<BankOutlined />}
                      label="Studio Name"
                      required
                      value={studio.studioName}
                      onChange={setStudioField("studioName")}
                      onBlur={touchStudioField("studioName")}
                      error={studioErrors.studioName}
                      touched={studioTouched.studioName}
                    />
                    <TextInput
                      icon={<PhoneOutlined />}
                      label="Phone Number"
                      required
                      value={studio.phone}
                      onChange={setStudioField("phone")}
                      onBlur={touchStudioField("phone")}
                      error={studioErrors.phone}
                      touched={studioTouched.phone}
                      hint="10-digit mobile number"
                    />
                    <TextInput
                      icon={<EnvironmentOutlined />}
                      label="Address"
                      required
                      value={studio.address}
                      onChange={setStudioField("address")}
                      onBlur={touchStudioField("address")}
                      error={studioErrors.address}
                      touched={studioTouched.address}
                    />
                    <TextInput
                      icon={<EnvironmentOutlined />}
                      label="City"
                      required
                      value={studio.city}
                      onChange={setStudioField("city")}
                      onBlur={touchStudioField("city")}
                      error={studioErrors.city}
                      touched={studioTouched.city}
                    />
                    <TextInput
                      icon={<EnvironmentOutlined />}
                      label="State"
                      required
                      value={studio.state}
                      onChange={setStudioField("state")}
                      onBlur={touchStudioField("state")}
                      error={studioErrors.state}
                      touched={studioTouched.state}
                    />
                    <TextInput
                      icon={<GlobalOutlined />}
                      label="Country"
                      required
                      value={studio.country}
                      onChange={setStudioField("country")}
                      onBlur={touchStudioField("country")}
                      error={studioErrors.country}
                      touched={studioTouched.country}
                    />
                    <TextInput
                      icon={<NumberOutlined />}
                      label="Postal Code"
                      required
                      value={studio.postalCode}
                      onChange={setStudioField("postalCode")}
                      onBlur={touchStudioField("postalCode")}
                      error={studioErrors.postalCode}
                      touched={studioTouched.postalCode}
                      hint="6-digit PIN code"
                    />
                  </div>
                </div>

                <div className="ob-section" style={{ ["--ob-delay" as any]: "0.1s" }}>
                  <h3 className="ob-section-title">
                    <span className="ob-section-icon"><CameraOutlined /></span> Portfolio Details
                  </h3>
                  <TextArea
                    icon={<FileTextOutlined />}
                    label="About"
                    required
                    value={portfolio.about}
                    onChange={setPortfolioField("about")}
                    onBlur={touchPortfolioField("about")}
                    placeholder="Tell clients about yourself and your studio"
                    error={portfolioErrors.about}
                    touched={portfolioTouched.about}
                    hint="At least 20 characters"
                  />
                  <div className="ob-grid-2">
                    <TextInput
                      icon={<StarOutlined />}
                      label="Specialization"
                      required
                      value={portfolio.specialization}
                      onChange={setPortfolioField("specialization")}
                      onBlur={touchPortfolioField("specialization")}
                      placeholder="e.g. Wedding, Portraits, Cinematic"
                      error={portfolioErrors.specialization}
                      touched={portfolioTouched.specialization}
                    />
                    <TextInput
                      icon={<ToolOutlined />}
                      label="Services"
                      required
                      value={portfolio.services}
                      onChange={setPortfolioField("services")}
                      onBlur={touchPortfolioField("services")}
                      placeholder="e.g. Photography, Videography, Editing"
                      error={portfolioErrors.services}
                      touched={portfolioTouched.services}
                    />
                  </div>
                </div>

                {error && <div className="ob-error">{error}</div>}

                <div className="ob-actions">
                  <button type="button" className="ob-btn-secondary" onClick={goBackToStep1}>
                    Back
                  </button>
                  <button type="button" className="ob-btn-primary" onClick={handleSubmit}>
                    <span>Submit &amp; Enter Dashboard</span> <CheckCircleOutlined />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ob-trust-footer">
          <LockOutlined /> Your data is encrypted and securely stored
        </div>
      </div>
    </div>
  );
}

export default OnboardingModal;