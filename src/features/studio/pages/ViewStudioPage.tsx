import { useMemo, useState } from "react";
import {
  CameraOutlined,
  DownOutlined,
  EditOutlined,
  PictureOutlined,
  ReloadOutlined,
  SaveOutlined,
  StopOutlined,
  UpOutlined,
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

// Fields that MUST be filled before the form can be saved
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
    /* no-op */
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

// ---- validation rule sets (applies to every field, required or not) ----
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

// Checks whether every required field currently holds a non-empty value
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
      // Disable antd's own auto-generated asterisk so only our custom
      // studio-required span renders — prevents the double "* *" bug.
      required={false}
      validateTrigger={["onChange", "onBlur"]}
    >
      {children}
    </Form.Item>
  );
}

function ActionIcon({ tooltip, children, className = "", ...buttonProps }) {
  return (
    <Tooltip title={tooltip} placement="left" mouseEnterDelay={0.08}>
      <Button
        className={`studio-rail-btn ${className}`}
        aria-label={tooltip}
        {...buttonProps}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

export default function ViewStudioPage() {
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);

  const initialValues = useMemo(() => loadLS("axsStudio", DEFAULT_STUDIO_DATA), []);

  // Re-evaluate validity (errors + required-field completeness) on every field change
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
    // Reset validity state to reflect current field contents
    handleFieldsChange();
  };

  const handleReset = () => {
    form.resetFields();
    setHasChanges(false);
    handleFieldsChange();
  };

  const handleCancel = () => {
    form.setFieldsValue(initialValues);
    form.resetFields(); // clears any lingering error/touched state
    form.setFieldsValue(initialValues);
    setIsEditing(false);
    setHasChanges(false);
    setIsFormValid(true);
  };

  const handleSubmit = (values) => {
    // Belt-and-braces: block save if somehow triggered while invalid/incomplete
    if (!areRequiredFieldsFilled(values)) return;
    saveLS("axsStudio", values);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleSubmitFailed = () => {
    // antd auto-scrolls to & highlights the first invalid field;
    // keep the Save button disabled until it's fixed
    setIsFormValid(false);
  };

  const goToProfile = () => {
    window.location.href = "/profile";
  };

  return (
    <main className="studio-page">
      <div className="studio-light-beam studio-light-beam-one" />
      <div className="studio-light-beam studio-light-beam-two" />

      <aside
        className={`studio-action-dock ${isRailOpen ? "studio-action-dock-open" : ""}`}
        aria-label="Studio actions"
      >
        <Tooltip
          title={isRailOpen ? "Close actions" : "Open actions"}
          placement="left"
          mouseEnterDelay={0.08}
        >
          <Button
            className="studio-dock-toggle"
            aria-label={isRailOpen ? "Close actions" : "Open actions"}
            aria-expanded={isRailOpen}
            onClick={() => setIsRailOpen((current) => !current)}
          >
            {isRailOpen ? <DownOutlined /> : <UpOutlined />}
          </Button>
        </Tooltip>

        <div className="studio-action-rail" aria-hidden={!isRailOpen}>
          <ActionIcon
            tooltip="Edit"
            type="primary"
            className="studio-rail-btn-edit"
            tabIndex={isRailOpen ? 0 : -1}
            onClick={handleEdit}
          >
            <EditOutlined />
          </ActionIcon>

          <ActionIcon
            tooltip={
              isEditing && !isFormValid
                ? "Fill all required fields correctly to save"
                : "Submit"
            }
            type="primary"
            className="studio-rail-btn-save"
            htmlType="submit"
            form="studio-form"
            disabled={!isEditing || !hasChanges || !isFormValid}
            tabIndex={isRailOpen ? 0 : -1}
          >
            <SaveOutlined />
          </ActionIcon>

          <ActionIcon
            tooltip="Reset"
            className="studio-rail-btn-reset"
            onClick={handleReset}
            disabled={!isEditing || !hasChanges}
            tabIndex={isRailOpen ? 0 : -1}
          >
            <ReloadOutlined />
          </ActionIcon>

          <ActionIcon
            tooltip="Cancel"
            className="studio-rail-btn-cancel"
            onClick={handleCancel}
            disabled={!isEditing}
            tabIndex={isRailOpen ? 0 : -1}
          >
            <StopOutlined />
          </ActionIcon>
        </div>
      </aside>

      <div className="studio-shell">
        <section className="studio-hero">
          <div className="studio-hero-copy">
            <div className="studio-kicker">
              <CameraOutlined />
              <span> Studio Profile</span>
            </div>
            <h1 className="studio-title">My Studio</h1>
          </div>

          <div className="studio-photo-stage">
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
