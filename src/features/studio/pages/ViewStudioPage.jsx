import { useMemo, useState } from "react";
import {CameraOutlined,DownOutlined,EditOutlined,PictureOutlined,ReloadOutlined,
SaveOutlined,StopOutlined,UpOutlined,} from "@ant-design/icons";
import { Button, Form, Input, Select, Tooltip } from "antd";
import "./ViewStudioPage.css";

const { TextArea } = Input;

const studioData = {
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

function Field({ name, label, required, children }) {
  return (
    <Form.Item
      name={name}
      label={
        <span>
          {required && <span className="studio-required">*</span>} {label}
        </span>
      }
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

  const initialValues = useMemo(() => studioData, []);

  const handleReset = () => {
    form.resetFields();
  };

  const handleCancel = () => {
    form.setFieldsValue(initialValues);
    setIsEditing(false);
  };

  const handleSubmit = (values) => {
    console.log("Studio form values:", values);
    setIsEditing(false);
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
            onClick={() => setIsEditing(true)}
          >
            <EditOutlined />
          </ActionIcon>

          <ActionIcon
            tooltip="Submit"
            type="primary"
            className="studio-rail-btn-save"
            htmlType="submit"
            form="studio-form"
            disabled={!isEditing}
            tabIndex={isRailOpen ? 0 : -1}
          >
            <SaveOutlined />
          </ActionIcon>

          <ActionIcon
            tooltip="Reset"
            className="studio-rail-btn-reset"
            onClick={handleReset}
            disabled={!isEditing}
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
          disabled={!isEditing}
          className="studio-form"
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
                <Input placeholder="Phone number" />
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
                <Input placeholder="Postal code" />
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
                  mode="multiple"
                  options={serviceOptions}
                  placeholder="Select services"
                  maxTagCount="responsive"
                  showSearch
                />
              </Field>

              <Field name="specializations" label="Specializations">
                <Select
                  mode="multiple"
                  options={specializationOptions}
                  placeholder="Select specializations"
                  maxTagCount="responsive"
                  showSearch
                />
              </Field>
            </div>
          </section>
        </Form>
      </div>
    </main>
  );
}
