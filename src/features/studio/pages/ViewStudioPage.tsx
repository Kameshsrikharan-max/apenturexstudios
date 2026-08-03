import { useMemo, useState } from "react";
import {CameraOutlined,EditOutlined,PictureOutlined,ReloadOutlined,SaveOutlined,StopOutlined,} from "@ant-design/icons";
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
    {
      pattern: /^[0-9]{10}$/,
      message: "Enter a valid 10-digit phone number",
    },
  ],
  address: [
    { required: true, message: "Address is required" },
    { whitespace: true, message: "Address cannot be just spaces" },
    { max: 200, message: "Address must be under 200 characters" },
  ],
  city: [
    { required: true, message: "City is required" },
    {
      pattern: /^[A-Za-z\s.'-]+$/,
      message: "City can only contain letters",
    },
  ],
  state: [
    { required: true, message: "State is required" },
    {
      pattern: /^[A-Za-z\s.'-]+$/,
      message: "State can only contain letters",
    },
  ],
  country: [
    { required: true, message: "Country is required" },
    {
      pattern: /^[A-Za-z\s.'-]+$/,
      message: "Country can only contain letters",
    },
  ],
  postalCode: [
    { required: true, message: "Postal code is required" },
    {
      pattern: /^[0-9]{6}$/,
      message: "Enter a valid 6-digit postal code",
    },
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
          return Promise.reject(
            new Error("You can select up to 10 specializations")
          );
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

type FanAction = {
  key: string;
  tooltip: string;
  icon: React.ReactNode;
  className: string;
  angle: number; 
  onClick?: () => void;
  disabled?: boolean;
  htmlType?: "submit" | "button";
  form?: string;
};

function FanSlot({ action, open, radius, index }: { action: FanAction; open: boolean; radius: number; index: number }) {
  const rad = (action.angle * Math.PI) / 180;
  const x = open ? radius * Math.cos(rad) : 0;
  const y = open ? radius * Math.sin(rad) : 0;
  const scale = open ? 1 : 0.5;

  return (
    <div
      className={`studio-fan-slot ${open ? "studio-fan-slot-open" : ""}`}
      style={{
        transform: `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(${scale})`,
        transitionDelay: open ? `${index * 55}ms` : "0ms",
      }}
    >
      <Tooltip title={action.tooltip} placement="left" mouseEnterDelay={0.08}>
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
      </Tooltip>
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

  const initialValues = useMemo(() => loadLS("axsStudio", DEFAULT_STUDIO_DATA), []);

  
  const handleFieldsChange = () => {
    const hasErrors = form
      .getFieldsError()
      .some(({ errors }) => errors.length > 0);
    const values = form.getFieldsValue();
    const filled = areRequiredFieldsFilled(values);
    setIsFormValid(!hasErrors && filled);
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

  const actions: FanAction[] = [
    {
      key: "edit",
      tooltip: "Edit",
      icon: <EditOutlined />,
      className: "studio-rail-btn-edit",
      angle: 250,
      onClick: handleEdit,
    },
    {
      key: "save",
      tooltip:
        isEditing && !isFormValid
          ? "Fill all required fields correctly to save"
          : "Submit",
      icon: <SaveOutlined />,
      className: "studio-rail-btn-save",
      angle: 210,
      htmlType: "submit",
      form: "studio-form",
      disabled: !isEditing || !hasChanges || !isFormValid,
    },
    {
      key: "reset",
      tooltip: "Reset",
      icon: <ReloadOutlined />,
      className: "studio-rail-btn-reset",
      angle: 170,
      onClick: handleReset,
      disabled: !isEditing || !hasChanges,
    },
    {
      key: "cancel",
      tooltip: "Cancel",
      icon: <StopOutlined />,
      className: "studio-rail-btn-cancel",
      angle: 130,
      onClick: handleCancel,
      disabled: !isEditing,
    },
  ];

  return (
    <main className="studio-page">
      <div
        className={`studio-shutter-flash ${justSaved ? "studio-shutter-flash-active" : ""}`}
        aria-hidden="true"
      />

      <div className="studio-light-beam studio-light-beam-one" />
      <div className="studio-light-beam studio-light-beam-two" />

      <div className="studio-fan-layer" aria-label="Studio actions">
        <Tooltip
          title={isRailOpen ? "Close actions" : "Open actions"}
          placement="left"
          mouseEnterDelay={0.08}
        >
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

       {actions.map((action, index) => (
  <FanSlot key={action.key} action={action} open={isRailOpen} radius={90} index={index} />
))}
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
          </div>

          <div className="studio-photo-stage">
            <div className="studio-focus-reticle" aria-hidden="true" />
            <div className="studio-photo-card studio-photo-card-one" />
            <div className="studio-photo-card studio-photo-card-two" />
            <div className="studio-photo-card studio-photo-card-three" />
            <button
              className="studio-lens-mark"
              type="button"
              aria-label="Go to profile gallery"
              onClick={goToProfile}
            >
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

              <Field name="country" label="County" required>
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
                <TextArea rows={3} placeholder="About studio" />
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