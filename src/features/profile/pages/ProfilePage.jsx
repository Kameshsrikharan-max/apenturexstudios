import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleOutlined,
  CloseOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FolderOpenOutlined,
  HomeOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "./ProfilePage.css";

const DEFAULT_PROFILE = {
  firstName: "Kamesh",
  lastName: "srikharan.T",
  email: "kameshsrikharan.t@gmail.com",
  phone: "8888888888",
  role: "studioadmin",
  address: "Arumbakkam",
  city: "Chennai",
  state: "Tamil Nadu",
  country: "India",
  postalCode: "600106",
  documentType: "",
  kycConsent: false,
  isActive: true,
};

function ProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [draftProfile, setDraftProfile] = useState(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem("axsProfile");

    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        const nextProfile = {
          ...DEFAULT_PROFILE,
          ...parsedProfile,
          profileImage: undefined,
          profileImageZoom: undefined,
        };

        setProfile(nextProfile);
        setDraftProfile(nextProfile);
      } catch {
        setProfile(DEFAULT_PROFILE);
        setDraftProfile(DEFAULT_PROFILE);
      }
    }
  }, []);

  const fullName = useMemo(() => {
    return `${profile.firstName} ${profile.lastName}`.trim();
  }, [profile.firstName, profile.lastName]);

  const isKycVerified = Boolean(profile.documentType);

  const completion = useMemo(() => {
    const fields = [
      profile.firstName,
      profile.lastName,
      profile.email,
      profile.phone,
      profile.role,
      profile.address,
      profile.city,
      profile.state,
      profile.country,
      profile.postalCode,
      profile.documentType,
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [profile]);

  const canEdit = profile.isActive && isEditing;

  const saveProfile = (updatedProfile) => {
    setProfile(updatedProfile);
    setDraftProfile(updatedProfile);
    localStorage.setItem("axsProfile", JSON.stringify(updatedProfile));
  };

  const handleChange = (field, value) => {
    setDraftProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleDocumentTypeChange = (value) => {
    const updatedProfile = {
      ...profile,
      documentType: value,
      kycConsent: Boolean(value),
    };

    saveProfile(updatedProfile);
  };

  const handleKycConsentChange = (checked) => {
    const updatedProfile = {
      ...profile,
      kycConsent: checked,
    };

    saveProfile(updatedProfile);
  };

  const handleEdit = () => {
    if (!profile.isActive) return;

    setDraftProfile(profile);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftProfile(profile);
    setIsEditing(false);
  };

  const handleSave = () => {
    const updatedProfile = {
      ...draftProfile,
      documentType: profile.documentType,
      kycConsent: profile.kycConsent,
      isActive: profile.isActive,
    };

    saveProfile(updatedProfile);
    setIsEditing(false);
  };

  const handleReset = () => {
    saveProfile(DEFAULT_PROFILE);
    setIsEditing(false);
  };

  const handleToggleAccountStatus = () => {
    const updatedProfile = {
      ...profile,
      isActive: !profile.isActive,
    };

    saveProfile(updatedProfile);
    setIsEditing(false);
  };

  const renderField = (label, field, icon, type = "text") => (
    <label className="profile-field" title={label}>
      <span>
        <span className="field-icon">{icon}</span>
        {label}
      </span>

      {canEdit ? (
        <input
          type={type}
          value={draftProfile[field]}
          onChange={(event) => handleChange(field, event.target.value)}
        />
      ) : (
        <strong>{profile[field] || "-"}</strong>
      )}
    </label>
  );

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <button
          type="button"
          className="profile-close-button"
          onClick={() => navigate("/dashboard")}
          aria-label="Close profile page"
          title="Close"
        >
          <CloseOutlined />
        </button>

        <div className="profile-switch">
          <button type="button" className="active">
            <UserOutlined />
            Profile
          </button>

          <button type="button" onClick={() => navigate("/portfolio")}>
            <FolderOpenOutlined />
            Portfolio
          </button>
        </div>

        <section className="profile-hero">
          <div className="profile-photo-block">
            <div className="profile-avatar-orbit" title="Profile">
              <div className="profile-avatar">
                <UserOutlined />
              </div>
            </div>
          </div>

          <div className="profile-hero-content">
            <p className="profile-kicker">My Profile</p>
            <h1 title={fullName}>{fullName}</h1>
            <p title={profile.email}>
              <MailOutlined /> {profile.email}
            </p>

            <div className="profile-completion" title="Profile completion">
              <div>
                <span>Profile Completion</span>
                <strong>{completion}%</strong>
              </div>
              <progress value={completion} max="100" />
            </div>
          </div>

          <div className="profile-hero-tools">
            <span className={`account-status ${profile.isActive ? "active" : "inactive"}`}>
              {profile.isActive ? <CheckCircleOutlined /> : <StopOutlined />}
              {profile.isActive ? "Active" : "Inactive"}
            </span>

            <button
              type="button"
              className="profile-reset-button"
              onClick={handleReset}
              title="Reset saved profile data"
            >
              <ReloadOutlined />
            </button>
          </div>
        </section>

        <section className="profile-panel">
          <div className="profile-section-head">
            <div>
              <h2>Personal Information</h2>
              <p>Manage your identity and studio admin details.</p>
            </div>

            <div className="profile-actions">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="profile-save-button"
                    onClick={handleSave}
                  >
                    <SaveOutlined />
                    Save
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="profile-edit-button"
                  onClick={handleEdit}
                  disabled={!profile.isActive}
                >
                  <EditOutlined />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="profile-grid">
            {renderField("First Name", "firstName", <UserOutlined />)}
            {renderField("Last Name", "lastName", <UserOutlined />)}
            {renderField("Email", "email", <MailOutlined />, "email")}
            {renderField("Phone Number", "phone", <PhoneOutlined />, "tel")}
            {renderField("Role", "role", <SafetyCertificateOutlined />)}
          </div>
        </section>

        <section className="profile-panel">
          <div className="profile-section-head">
            <div>
              <h2>Address Details</h2>
              <p>Your current communication address.</p>
            </div>
          </div>

          <div className="profile-grid">
            {renderField("Address", "address", <HomeOutlined />)}
            {renderField("City", "city", <EnvironmentOutlined />)}
            {renderField("State", "state", <EnvironmentOutlined />)}
            {renderField("Country", "country", <EnvironmentOutlined />)}
            {renderField("Postal Code", "postalCode", <IdcardOutlined />)}
          </div>
        </section>

        <section className="profile-panel">
          <div className="profile-section-head">
            <div>
              <h2>KYC Verification</h2>
              <p>Select a document type to verify your KYC.</p>
            </div>

            <span className={`kyc-badge ${isKycVerified ? "verified" : "not-verified"}`}>
              {isKycVerified ? <CheckCircleOutlined /> : <IdcardOutlined />}
              {isKycVerified ? "Verified" : "Not Verified"}
            </span>
          </div>

          <div className="kyc-box">
            <label>
              <span>
                <span className="field-icon">
                  <IdcardOutlined />
                </span>
                Document Type
              </span>

              <select
                value={profile.documentType}
                disabled={!profile.isActive}
                onChange={(event) => handleDocumentTypeChange(event.target.value)}
              >
                <option value="">Select document type</option>
                <option value="aadhaar">Aadhaar Card</option>
                <option value="pan">PAN Card</option>
                <option value="passport">Passport</option>
                <option value="driving-license">Driving License</option>
              </select>
            </label>

            <label className="kyc-consent" title="KYC consent">
              <input
                type="checkbox"
                disabled={!profile.isActive}
                checked={profile.kycConsent}
                onChange={(event) => handleKycConsentChange(event.target.checked)}
              />
              <span>I consent to KYC verification via Truthscreen</span>
            </label>
          </div>
        </section>

        <section className="profile-danger-panel">
          <div>
            <h2>{profile.isActive ? "Deactivate Account" : "Activate Account"}</h2>
            <p>
              {profile.isActive
                ? "Click deactivate to lock profile editing."
                : "Click activate to restore profile editing."}
            </p>
          </div>

          <button
            type="button"
            className={`deactivate-button ${profile.isActive ? "" : "active-again"}`}
            onClick={handleToggleAccountStatus}
          >
            {profile.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
            {profile.isActive ? "Deactivate Account" : "Activate Account"}
          </button>
        </section>

        <footer className="profile-footer">© axs</footer>
      </div>
    </main>
  );
}

export default ProfilePage;