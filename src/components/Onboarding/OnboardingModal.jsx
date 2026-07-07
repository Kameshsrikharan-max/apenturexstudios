import { useMemo, useState } from "react";
import {BankOutlined,CameraOutlined,CheckCircleOutlined,EnvironmentOutlined,FileTextOutlined,GlobalOutlined,HomeOutlined,IdcardOutlined,MailOutlined,NumberOutlined,PhoneOutlined,SafetyCertificateOutlined,StarOutlined,ThunderboltFilled,ToolOutlined,UserOutlined,} from "@ant-design/icons";
import "./OnboardingModal.css";

const DOC_FIELDS = {
  aadhaar: [],
  pan: [{ key: "panNumber", label: "PAN Number", required: true }],
  dl: [
    { key: "dlNumber", label: "DL Number", required: true },
    { key: "dob", label: "Date of Birth", required: true, placeholder: "DD-MM-YYYY" },
    { key: "dlName", label: "Full Name (as on DL)", required: false },
  ],
  passport: [
    { key: "passportNo", label: "Passport Number", required: true },
    { key: "dob", label: "Date of Birth", required: true, placeholder: "DD-MM-YYYY" },
    { key: "expiry", label: "Expiry Date", required: false, placeholder: "DD-MM-YYYY" },
    { key: "passportName", label: "Full Name (as on Passport)", required: false },
  ],
};


function Field({ icon, label, required, children }) {
  return (
    <div className="ob-field">
      <label className="ob-field-label">
        {required && <span className="ob-req">*</span>} {label}
      </label>
      <div className="ob-field-control">
        {icon && <span className="ob-field-icon">{icon}</span>}
        {children}
      </div>
    </div>
  );
}

function TextInput({ icon, label, required, value, onChange, placeholder, type = "text" }) {
  return (
    <Field icon={icon} label={label} required={required}>
      <input
        type={type}
        className="ob-input"
        value={value}
        placeholder={placeholder || label}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function TextArea({ icon, label, required, value, onChange, placeholder, rows = 4 }) {
  return (
    <Field icon={icon} label={label} required={required}>
      <textarea
        className="ob-textarea"
        rows={rows}
        value={value}
        placeholder={placeholder || label}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function OnboardingModal({ prefill, onComplete }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  /* ---------------- Step 1 state ---------------- */
  const [basic, setBasic] = useState({
    name: prefill?.name || "",
    email: prefill?.email || "",
    phone: prefill?.phone || "",
    studioName: "",
    address: "",
  });
  const [kyc, setKyc] = useState({ docType: "", vals: {}, consent: false });

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
  const [portfolio, setPortfolio] = useState({
    about: "",
    specialization: "",
    services: "",
  });

  const setBasicField = (field) => (value) => setBasic((p) => ({ ...p, [field]: value }));
  const setStudioField = (field) => (value) => setStudio((p) => ({ ...p, [field]: value }));
  const setPortfolioField = (field) => (value) => setPortfolio((p) => ({ ...p, [field]: value }));

  const kycFields = DOC_FIELDS[kyc.docType] || [];

  const kycComplete = useMemo(() => {
    if (!kyc.docType || !kyc.consent) return false;
    return kycFields.filter((f) => f.required).every((f) => (kyc.vals[f.key] || "").trim());
  }, [kyc, kycFields]);

  const step1Valid =
    basic.name.trim() &&
    basic.email.trim() &&
    basic.phone.trim() &&
    basic.studioName.trim() &&
    basic.address.trim() &&
    kycComplete;

  const step2Valid =
    studio.studioName.trim() &&
    studio.phone.trim() &&
    studio.address.trim() &&
    studio.city.trim() &&
    studio.state.trim() &&
    studio.country.trim() &&
    studio.postalCode.trim() &&
    portfolio.about.trim() &&
    portfolio.specialization.trim() &&
    portfolio.services.trim();

  const goToStep2 = () => {
    if (!step1Valid) {
      setError("Please fill every field and complete KYC verification before continuing.");
      return;
    }
    setError("");
    setStep(2);
  };

  const goBackToStep1 = () => {
    setError("");
    setStep(1);
  };

  const handleSubmit = () => {
    if (!step2Valid) {
      setError("Please fill every field in Studio details and Portfolio details to finish.");
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

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true">
      <div className="ob-backdrop-glow" />
      <div className="ob-card">
        {step === 1 && (
          <h1 className="ob-welcome-title">
            Welcome to <span className="ob-welcome-highlight">Apenture X Studios</span>
          </h1>
        )}

        <div className="ob-steps-bar">
          <div className={`ob-step-pill${step === 1 ? " ob-step-pill--active" : " ob-step-pill--done"}`}>
            <span className="ob-step-num">{step > 1 ? <CheckCircleOutlined /> : "1"}</span>
            <span>Your Details &amp; KYC</span>
          </div>
          <div className="ob-step-line" />
          <div className={`ob-step-pill${step === 2 ? " ob-step-pill--active" : ""}`}>
            <span className="ob-step-num">2</span>
            <span>My Studio &amp; Portfolio</span>
          </div>
        </div>

        {step === 1 && (
          <div className="ob-step-body">
            <p className="ob-step-subtitle">
              Let's get your account set up. This only takes a minute.
            </p>

            <div className="ob-section">
              <h3 className="ob-section-title">
                <UserOutlined /> Your Details
              </h3>
              <div className="ob-grid-2">
                <TextInput icon={<UserOutlined />} label="Name" required value={basic.name} onChange={setBasicField("name")} />
                <TextInput icon={<MailOutlined />} label="Email ID" required value={basic.email} onChange={setBasicField("email")} type="email" />
                <TextInput icon={<PhoneOutlined />} label="Phone Number" required value={basic.phone} onChange={setBasicField("phone")} />
                <TextInput icon={<BankOutlined />} label="Studio Name" required value={basic.studioName} onChange={setBasicField("studioName")} />
              </div>
              <TextInput icon={<EnvironmentOutlined />} label="Address" required value={basic.address} onChange={setBasicField("address")} />
            </div>

            <div className="ob-section">
              <h3 className="ob-section-title">
                <SafetyCertificateOutlined /> KYC Verification
              </h3>

              <Field icon={<IdcardOutlined />} label="Document Type" required>
                <select
                  className="ob-select"
                  value={kyc.docType}
                  onChange={(e) => setKyc({ docType: e.target.value, vals: {}, consent: false })}
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
                      onChange={(v) => setKyc((p) => ({ ...p, vals: { ...p.vals, [f.key]: v } }))}
                    />
                  ))}
                </div>
              )}

              {kyc.docType && (
                <label className="ob-consent">
                  <input
                    type="checkbox"
                    checked={kyc.consent}
                    onChange={(e) => setKyc((p) => ({ ...p, consent: e.target.checked }))}
                  />
                  <span>I consent to KYC verification via Truthscreen</span>
                </label>
              )}
            </div>

            {error && <div className="ob-error">{error}</div>}

            <div className="ob-actions ob-actions--single">
              <button type="button" className="ob-btn-primary" onClick={goToStep2}>
                Continue <ThunderboltFilled />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step-body">
            <p className="ob-step-subtitle">Almost done — tell us about your studio and your work.</p>

            <div className="ob-section">
              <h3 className="ob-section-title">
                <HomeOutlined /> My Studio
              </h3>
              <div className="ob-grid-2">
                <TextInput icon={<BankOutlined />} label="Studio Name" required value={studio.studioName} onChange={setStudioField("studioName")} />
                <TextInput icon={<PhoneOutlined />} label="Phone Number" required value={studio.phone} onChange={setStudioField("phone")} />
                <TextInput icon={<EnvironmentOutlined />} label="Address" required value={studio.address} onChange={setStudioField("address")} />
                <TextInput icon={<EnvironmentOutlined />} label="City" required value={studio.city} onChange={setStudioField("city")} />
                <TextInput icon={<EnvironmentOutlined />} label="State" required value={studio.state} onChange={setStudioField("state")} />
                <TextInput icon={<GlobalOutlined />} label="Country" required value={studio.country} onChange={setStudioField("country")} />
                <TextInput icon={<NumberOutlined />} label="Postal Code" required value={studio.postalCode} onChange={setStudioField("postalCode")} />
              </div>
            </div>

            <div className="ob-section">
              <h3 className="ob-section-title">
                <CameraOutlined /> Portfolio Details
              </h3>
              <TextArea icon={<FileTextOutlined />} label="About" required value={portfolio.about} onChange={setPortfolioField("about")} placeholder="Tell clients about yourself and your studio" />
              <div className="ob-grid-2">
                <TextInput icon={<StarOutlined />} label="Specialization" required value={portfolio.specialization} onChange={setPortfolioField("specialization")} placeholder="e.g. Wedding, Portraits, Cinematic" />
                <TextInput icon={<ToolOutlined />} label="Services" required value={portfolio.services} onChange={setPortfolioField("services")} placeholder="e.g. Photography, Videography, Editing" />
              </div>
            </div>

            {error && <div className="ob-error">{error}</div>}

            <div className="ob-actions">
              <button type="button" className="ob-btn-secondary" onClick={goBackToStep1}>
                Back
              </button>
              <button type="button" className="ob-btn-primary" onClick={handleSubmit}>
                Submit &amp; Enter Dashboard <CheckCircleOutlined />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingModal;