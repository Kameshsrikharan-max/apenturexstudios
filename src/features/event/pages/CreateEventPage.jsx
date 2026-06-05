import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseOutlined, DollarOutlined, DoubleLeftOutlined,EnvironmentOutlined, MailOutlined, PhoneOutlined, PlusOutlined, TeamOutlined, CameraOutlined,PictureOutlined,ThunderboltOutlined, UserOutlined,ReloadOutlined,} from "@ant-design/icons";
import "./CreateEventPage.css";

const steps = [
  { label: "Event Details", icon: <PlusOutlined /> },
  { label: "Team Assignment", icon: <TeamOutlined /> },
  { label: "Payment", icon: <DollarOutlined /> },
  { label: "Attendance", icon: <ClockCircleOutlined /> },
  { label: "Media", icon: <CameraOutlined /> },
  { label: "Album", icon: <PictureOutlined /> },
  { label: "Closure", icon: <CheckCircleOutlined /> },
];

const services = [
  "Traditional Photography",
  "Candid Photography",
  "Candid Videography",
  "Drone",
];

export default function CreateEventPage({ user }) {
  const navigate = useNavigate();
  const [selectedServices, setSelectedServices] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  const toggleService = (service) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service]
    );
  };

  const goBack = () => navigate("/events");
  const handleSubmit = () => navigate("/events/create/team-assignment");

  return (
    <main className="cep-page">
      <section className="cep-stage">

      
        <header className="cep-topbar">
          <button className="cep-back" type="button" onClick={goBack}>
            <DoubleLeftOutlined />
            Back
          </button>

          <div className="cep-title-wrap">
            <span className="cep-title-icon">
              <CalendarOutlined />
            </span>
            <div>
              <p className="cep-subtitle">Step 1 of 7 · Event Details</p>
              <h1 className="cep-heading">Create New Event</h1>
            </div>
          </div>

          <div className="cep-progress" aria-label="Event progress">
            {[1, 2, 3, 4, 5].map((step) => (
              <span className={step === 1 ? "active" : ""} key={step}>
                {step === 1 ? <CheckCircleOutlined /> : step}
              </span>
            ))}
            <button type="button" aria-label="Refresh page">
              <ReloadOutlined />
            </button>
          </div>
        </header>

    
        <div className="cep-body">

          
          <aside className="cep-rail" aria-label="Create event steps">
            {steps.map((step, index) => (
              <div className="cep-step-wrap" key={step.label}>
                <button
                  className={`cep-step ${index === activeStep ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  aria-label={step.label}
                >
                  {step.icon}
                  {index === activeStep && (
                    <span className="cep-step-indicator" />
                  )}
                </button>
                <span className="cep-tooltip">{step.label}</span>
              </div>
            ))}
          </aside>

          
          <form className="cep-form">
            <div className="cep-grid">

          
              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2>
                    <ThunderboltOutlined />
                    Event Information
                  </h2>
                  <small>Primary booking details</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Event Name <b>*</b></span>
                    <input placeholder="e.g., Ram's Birthday" />
                  </label>
                  <label className="cep-field">
                    <span>Event Date <b>*</b></span>
                    <div className="cep-input-icon">
                      <input placeholder="Select date" />
                      <CalendarOutlined />
                    </div>
                  </label>
                  <label className="cep-field">
                    <span>Start Time</span>
                    <div className="cep-input-icon">
                      <input placeholder="Select time" />
                      <ClockCircleOutlined />
                    </div>
                  </label>
                </div>
              </section>

            
              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2>
                    <UserOutlined />
                    Customer Information
                  </h2>
                  <small>Client and payment snapshot</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Customer Name <b>*</b></span>
                    <input placeholder="Enter customer name" />
                  </label>
                  <label className="cep-field">
                    <span>Phone <b>*</b></span>
                    <div className="cep-input-icon">
                      <input placeholder="0000000000" />
                      <PhoneOutlined />
                    </div>
                  </label>
                  <label className="cep-field">
                    <span>Email <b>*</b></span>
                    <div className="cep-input-icon">
                      <input placeholder="customer@example.com" />
                      <MailOutlined />
                    </div>
                  </label>
                  <label className="cep-field wide">
                    <span>Event Amount</span>
                    <div className="cep-input-icon">
                      <input placeholder="₹ 0" />
                      <DollarOutlined />
                    </div>
                  </label>
                </div>
              </section>

              
              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2>
                    <EnvironmentOutlined />
                    Venue Details
                  </h2>
                  <small>Where the event happens</small>
                </div>
                <div className="cep-fields">
                  <label className="cep-field wide">
                    <span>Address <b>*</b></span>
                    <textarea placeholder="Enter complete venue address" />
                  </label>
                  <label className="cep-field">
                    <span>City <b>*</b></span>
                    <input placeholder="Enter city" />
                  </label>
                  <label className="cep-field">
                    <span>State</span>
                    <input placeholder="Enter state" />
                  </label>
                </div>
              </section>

            
              <section className="cep-panel">
                <div className="cep-panel-head">
                  <h2>
                    <CameraOutlined />
                    Select Services
                  </h2>
                  <span className="cep-count">
                    {selectedServices.length} selected
                  </span>
                </div>
                <p className="cep-help">
                  Choose the production services required for this event.
                </p>
                <div className="cep-services">
                  {services.map((service) => (
                    <label className="cep-service" key={service}>
                      <input
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleService(service)}
                        type="checkbox"
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </section>

            </div>

            <footer className="cep-actions">
              <button className="cep-secondary" type="button" onClick={goBack}>
                <CloseOutlined />
                Cancel
              </button>
              <button className="cep-primary" type="button" onClick={handleSubmit}>
                <PlusOutlined />
                Create New Event
              </button>
            </footer>
          </form>
        </div>

      </section>
    </main>
  );
}