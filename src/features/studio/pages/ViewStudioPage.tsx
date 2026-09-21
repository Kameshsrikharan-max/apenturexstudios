import { useMemo, useRef, useState } from "react";
import {
  CameraOutlined,
  EditOutlined,
  PictureOutlined,
  ReloadOutlined,
  SaveOutlined,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Select, Tooltip } from "antd";
import "./ViewStudioPage.css";

const { TextArea } = Input;

const DEFAULT_STUDIO_DATA = {
  studioName: "Wave Studios",
  phoneNumber: "8888888888",
  address: "3rd street",
  city: "Chennai",
  state: "Tamil Nadu",
  country: "India",
  postalCode: "600106",
  about:
    "Learn photography by practicing daily, studying light, and building a strong portfolio.\nExperiment with genres: portrait, landscape, street, wedding, commercial, wildlife, or documentary.\nKey lesson: Technical skills matter, but vision and storytelling are what separate good photos from great ones.",
  services: ["69b7ade8b5ffe89ff5lef187"],
  specializations: ["Portrait Photography"],
};

const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
];

const REQUIRED_FIELDS = [
  "studioName",
  "phoneNumber",
  "address",
  "city",
  "state",
  "country",
  "postalCode",
];

const loadLS = (k, fb) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const saveLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // storage unavailable — silently skip persistence
  }
};

const serviceOptions = [
  { value: "69b7ade8b5ffe89ff5lef187", label: "69b7ade8b5ffe89ff5lef187" },
  { value: "editing-only", label: "Editing-only" },
  { value: "corporate-photography", label: "Corporate Photography" },
  { value: "drone-videography", label: "Drone/Videography" },
  { value: "wedding-photography", label: "Wedding Photography" },
  { value: "album-post-production", label: "Album/Post-production" },
  { value: "maternity-photography", label: "Maternity Photography" },
];

const specializationOptions = [
  { value: "Portrait Photography", label: "Portrait Photography" },
  { value: "Baby Photography", label: "Baby Photography" },
  { value: "Baby & Kids Photography", label: "Baby & Kids Photography" },
  { value: "Fashion & Model Photography", label: "Fashion & Model Photography" },
  { value: "Wedding & Event Photography", label: "Wedding & Event Photography" },
  { value: "Pre-Wedding Photography", label: "Pre-Wedding Photography" },
  { value: "Product Photography", label: "Product Photography" },
  { value: "Food Photography", label: "Food Photography" },
];

const rules = {
  studioName: [
    { required: true, message: "Studio name is required" },
    { min: 2, message: "Studio name must be at least 2 characters" },
    { max: 80, message: "Studio name must be under 80 characters" },
    { whitespace: true, message: "Studio name cannot be just spaces" },
  ],
  phoneNumber: [
    { required: true, message: "Phone number is required" },
    { pattern: /^[0-9]{10}$/, message: "Enter a valid 10-digit phone number" },
  ],
  address: [
    { required: true, message: "Address is required" },
    { whitespace: true, message: "Address cannot be just spaces" },
    { max: 200, message: "Address must be under 200 characters" },
  ],
  city: [
    { required: true, message: "City is required" },
    { pattern: /^[A-Za-z\s.'-]+$/, message: "City can only contain letters" },
  ],
  state: [
    { required: true, message: "State is required" },
    { pattern: /^[A-Za-z\s.'-]+$/, message: "State can only contain letters" },
  ],
  country: [
    { required: true, message: "Country is required" },
    { pattern: /^[A-Za-z\s.'-]+$/, message: "Country can only contain letters" },
  ],
  postalCode: [
    { required: true, message: "Postal code is required" },
    { pattern: /^[0-9]{6}$/, message: "Enter a valid 6-digit postal code" },
  ],
  about: [{ max: 1000, message: "About must be under 1000 characters" }],
  services: [
    {
      validator: (_rule, value) => {
        if (!value || value.length === 0) return Promise.resolve();
        if (value.length > 10) {
          return Promise.reject(new Error("You can select up to 10 services"));
        }
        return Promise.resolve();
      },
    },
  ],
  specializations: [
    {
      validator: (_rule, value) => {
        if (!value || value.length === 0) return Promise.resolve();
        if (value.length > 10) {
          return Promise.reject(new Error("You can select up to 10 specializations"));
        }
        return Promise.resolve();
      },
    },
  ],
};

function areRequiredFieldsFilled(values) {
  return REQUIRED_FIELDS.every((key) => {
    const v = values?.[key];
    return v !== undefined && v !== null && String(v).trim() !== "";
  });
}

function Field({ name, label, required, children }: { name: any; label: any; required?: any; children: any }) {
  return (
    <Form.Item
      name={name}
      label={
        <span>
          {required && <span className="studio-required">*</span>} {label}
        </span>
      }
      rules={rules[name] || []}
      required={false}
      validateTrigger={["onChange", "onBlur"]}
    >
      {children}
    </Form.Item>
  );
}

function ApertureIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 60 60" className="studio-aperture-icon" aria-hidden="true" focusable="false">
      <circle className="studio-aperture-ring" cx="30" cy="30" r="26" />
      <g className={`studio-aperture-blades ${open ? "studio-aperture-blades-open" : ""}`}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <polygon
            key={i}
            className="studio-blade"
            style={{ ["--angle" as any]: `${i * 60}deg` }}
            points="30,30 30,3 49,13"
          />
        ))}
      </g>
      <circle className="studio-aperture-hole" cx="30" cy="30" r={open ? 9 : 3.4} />
    </svg>
  );
}

/** Camera-style exposure meter: reframes form validity as an exposure reading
 *  instead of a plain disabled-button state, so editors get a legible signal
 *  of how close the profile is to "correctly exposed" (ready to save). */
function ExposureMeter({ percent, state }: { percent: number; state: "empty" | "under" | "balanced" | "error" }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const labels = {
    empty: "No changes yet",
    under: "Underexposed — required fields missing",
    balanced: "Balanced — ready to save",
    error: "Overexposed — fix the highlighted fields",
  };
  return (
    <div className={`studio-exposure studio-exposure-${state}`} role="status">
      <div className="studio-exposure-scale">
        {["-2", "-1", "0", "+1", "+2"].map((tick) => (
          <span key={tick} className="studio-exposure-tick">{tick}</span>
        ))}
      </div>
      <div className="studio-exposure-track">
        <div className="studio-exposure-fill" style={{ width: `${clamped}%` }} />
        <div className="studio-exposure-needle" style={{ left: `${clamped}%` }} />
      </div>
      <span className="studio-exposure-label">{labels[state]}</span>
    </div>
  );
}

type FanAction = {
  key: string;
  tooltip: string;
  icon: React.ReactNode;
  className: string;
  onClick?: () => void;
  disabled?: boolean;
  htmlType?: "submit" | "button";
  form?: string;
};

function FanSlot({ action, open, index }: { action: FanAction; open: boolean; index: number }) {
  return (
    <div
      className={`studio-fan-slot ${open ? "studio-fan-slot-open" : ""}`}
      style={{ transitionDelay: open ? `${index * 55}ms` : `${(3 - index) * 35}ms` }}
    >
      <span className="studio-fan-label">{action.tooltip}</span>
      <Button
        className={`studio-rail-btn ${action.className}`}
        aria-label={action.tooltip}
        type="primary"
        htmlType={action.htmlType}
        form={action.form}
        disabled={action.disabled}
        onClick={action.onClick}
        tabIndex={open ? 0 : -1}
      >
        {action.icon}
      </Button>
    </div>
  );
}

export default function ViewStudioPage() {
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);
  const [justSaved, setJustSaved] = useState(false);
  const [exposure, setExposure] = useState({ percent: 0, state: "empty" as "empty" | "under" | "balanced" | "error" });
  const [photos, setPhotos] = useState<string[]>(() => loadLS("axsStudioPhotos", DEFAULT_PHOTOS));
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const initialValues = useMemo(() => loadLS("axsStudio", DEFAULT_STUDIO_DATA), []);

  const computeExposure = () => {
    const values = form.getFieldsValue();
    const hasErrors = form.getFieldsError().some(({ errors }) => errors.length > 0);
    const filledCount = REQUIRED_FIELDS.filter((key) => {
      const v = values?.[key];
      return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const percent = Math.round((filledCount / REQUIRED_FIELDS.length) * 100);

    let state: "empty" | "under" | "balanced" | "error" = "empty";
    if (hasErrors) state = "error";
    else if (filledCount === 0) state = "empty";
    else if (filledCount < REQUIRED_FIELDS.length) state = "under";
    else state = "balanced";

    setExposure({ percent, state });
    return { hasErrors, filledCount, percent };
  };

  const handleFieldsChange = () => {
    const { hasErrors, filledCount } = computeExposure();
    setIsFormValid(!hasErrors && filledCount === REQUIRED_FIELDS.length);
  };

  const handleValuesChange = () => {
    if (!isEditing) return;
    setHasChanges(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setHasChanges(false);
    handleFieldsChange();
  };

  const handleReset = () => {
    form.resetFields();
    setHasChanges(false);
    handleFieldsChange();
  };

  const handleCancel = () => {
    form.setFieldsValue(initialValues);
    form.resetFields();
    form.setFieldsValue(initialValues);
    setIsEditing(false);
    setHasChanges(false);
    setIsFormValid(true);
    handleFieldsChange();
  };

  const handleSubmit = (values) => {
    if (!areRequiredFieldsFilled(values)) return;
    saveLS("axsStudio", values);
    setIsEditing(false);
    setHasChanges(false);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 520);
  };

  const handleSubmitFailed = () => {
    setIsFormValid(false);
  };

  const goToProfile = () => {
    window.location.href = "/profile";
  };

  const handlePhotoPick = (slot: number) => {
    fileInputRefs[slot].current?.click();
  };

  const handlePhotoChange = (slot: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos((prev) => {
        const next = [...prev];
        next[slot] = String(reader.result);
        saveLS("axsStudioPhotos", next);
        return next;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const actions: FanAction[] = [
    {
      key: "edit",
      tooltip: "Edit",
      icon: <EditOutlined />,
      className: "studio-rail-btn-edit",
      onClick: handleEdit,
    },
    {
      key: "save",
      tooltip: isEditing && !isFormValid ? "Fill all required fields correctly" : "Submit",
      icon: <SaveOutlined />,
      className: "studio-rail-btn-save",
      htmlType: "submit",
      form: "studio-form",
      disabled: !isEditing || !hasChanges || !isFormValid,
    },
    {
      key: "reset",
      tooltip: "Reset",
      icon: <ReloadOutlined />,
      className: "studio-rail-btn-reset",
      onClick: handleReset,
      disabled: !isEditing || !hasChanges,
    },
    {
      key: "cancel",
      tooltip: "Cancel",
      icon: <StopOutlined />,
      className: "studio-rail-btn-cancel",
      onClick: handleCancel,
      disabled: !isEditing,
    },
  ];

  return (
    <main className="studio-page">
      <div className="studio-grain" aria-hidden="true" />
      <div className={`studio-shutter-flash ${justSaved ? "studio-shutter-flash-active" : ""}`} aria-hidden="true" />

      <div className="studio-light-beam studio-light-beam-one" />
      <div className="studio-light-beam studio-light-beam-two" />

      {/* Vertical lens-dock: fixed to the viewport edge, fully on-screen at every breakpoint */}
      <div className="studio-fan-layer" aria-label="Studio actions">
        {actions.map((action, index) => (
          <FanSlot key={action.key} action={action} open={isRailOpen} index={index} />
        ))}
        <Tooltip title={isRailOpen ? "Close actions" : "Open actions"} placement="left" mouseEnterDelay={0.08}>
          <button
            type="button"
            className="studio-dock-toggle"
            aria-label={isRailOpen ? "Close actions" : "Open actions"}
            aria-expanded={isRailOpen}
            onClick={() => setIsRailOpen((current) => !current)}
          >
            <ApertureIcon open={isRailOpen} />
          </button>
        </Tooltip>
      </div>

      <div className="studio-shell">
        <section className="studio-hero studio-viewfinder">
          <span className="studio-vf-bracket studio-vf-bracket-tl" />
          <span className="studio-vf-bracket studio-vf-bracket-tr" />
          <span className="studio-vf-bracket studio-vf-bracket-bl" />
          <span className="studio-vf-bracket studio-vf-bracket-br" />

          <div className="studio-hero-copy">
            <div className="studio-kicker">
              <CameraOutlined />
              <span> Studio Profile</span>
            </div>
            <h1 className="studio-title">My Studio</h1>
            <p className="studio-subtitle">Tap a frame to swap in your own shots.</p>
          </div>

          <div className="studio-photo-stage">
            <div className="studio-focus-reticle" aria-hidden="true" />
            {photos.map((src, i) => (
              <button
                key={i}
                type="button"
                className={`studio-photo-card studio-photo-card-${["one", "two", "three"][i]}`}
                style={{ backgroundImage: `url(${src})` }}
                onClick={() => handlePhotoPick(i)}
                aria-label={`Replace studio photo ${i + 1}`}
              >
                <span className="studio-photo-swap"><UploadOutlined /></span>
                <input
                  ref={fileInputRefs[i]}
                  type="file"
                  accept="image/*"
                  className="studio-photo-input"
                  onChange={(e) => handlePhotoChange(i, e)}
                />
              </button>
            ))}
            <button className="studio-lens-mark" type="button" aria-label="Go to profile gallery" onClick={goToProfile}>
              <PictureOutlined />
            </button>
          </div>
        </section>

        <Form
          id="studio-form"
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSubmit}
          onFinishFailed={handleSubmitFailed}
          onValuesChange={handleValuesChange}
          onFieldsChange={handleFieldsChange}
          disabled={!isEditing}
          className="studio-form"
          scrollToFirstError={{ behavior: "smooth", block: "center" }}
        >
          <section className="studio-glass-card">
            <header className="studio-card-header">
              <h2>Studio Details</h2>
              {isEditing && <ExposureMeter percent={exposure.percent} state={exposure.state} />}
            </header>

            <div className="studio-grid">
              <Field name="studioName" label="Studio Name" required>
                <Input placeholder="Studio name" />
              </Field>

              <Field name="phoneNumber" label="Phone Number" required>
                <Input placeholder="Phone number" maxLength={10} />
              </Field>

              <Field name="address" label="Address" required>
                <Input placeholder="Address" />
              </Field>

              <Field name="city" label="City" required>
                <Input placeholder="City" />
              </Field>

              <Field name="state" label="State" required>
                <Input placeholder="State" />
              </Field>

              <Field name="country" label="Country" required>
                <Input placeholder="Country" />
              </Field>

              <Field name="postalCode" label="Postal code" required>
                <Input placeholder="Postal code" maxLength={6} />
              </Field>
            </div>
          </section>

          <section className="studio-glass-card">
            <header className="studio-card-header">
              <h2>Portfolio Details</h2>
            </header>

            <div className="studio-grid studio-grid-portfolio">
              <Field name="about" label="About">
                <TextArea rows={3} placeholder="About studio" maxLength={1000} showCount />
              </Field>

              <Field name="services" label="Services">
                <Select
                  mode="tags"
                  options={serviceOptions}
                  placeholder="Select or type services"
                  maxTagCount="responsive"
                  showSearch
                  tokenSeparators={[","]}
                />
              </Field>

              <Field name="specializations" label="Specializations">
                <Select
                  mode="tags"
                  options={specializationOptions}
                  placeholder="Select or type specializations"
                  maxTagCount="responsive"
                  showSearch
                  tokenSeparators={[","]}
                />
              </Field>
            </div>
          </section>
        </Form>
      </div>
    </main>
  );
}