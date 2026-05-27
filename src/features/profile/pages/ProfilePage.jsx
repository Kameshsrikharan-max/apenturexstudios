import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CameraOutlined,
  CloseOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  HeartFilled,
  HeartOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  StarOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "./ProfilePage.css";

const DEFAULT_PROFILE = {
  Name: "Kamesh Srikharan.T",
  email: "kameshsrikharan.t@gmail.com",
  phone: "8888888888",
  role: "Professional Photographer",
  address: "Arumbakkam",
  city: "Chennai",
  state: "Tamil Nadu",
  country: "India",
  postalCode: "600106",
  profilePhoto:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1200",
};

const photos = [
  { id: 1,  title: "Royal Wedding Frame",  category: "Wedding",   image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400" },
  { id: 2,  title: "Golden Couple Walk",   category: "Wedding",   image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1400" },
  { id: 3,  title: "Classic Portrait",     category: "Portraits", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1400" },
  { id: 4,  title: "Forest Light",         category: "Nature",    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400" },
  { id: 5,  title: "Camera Mood",          category: "Cinematic", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1400" },
  { id: 6,  title: "Bride Detail",         category: "Wedding",   image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1400" },
  { id: 7,  title: "Wedding Rings",        category: "Wedding",   image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1400" },
  { id: 8,  title: "Outdoor Couple",       category: "Wedding",   image: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?q=80&w=1400" },
  { id: 9,  title: "Soft Portrait",        category: "Portraits", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1400" },
  { id: 10, title: "Golden Portrait",      category: "Portraits", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1400" },
  { id: 11, title: "Street Portrait",      category: "Portraits", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1400" },
  { id: 12, title: "Mountain Air",         category: "Nature",    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400" },
  { id: 13, title: "Nature Story",         category: "Nature",    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1400" },
  { id: 14, title: "Wild Hills",           category: "Nature",    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1400" },
  { id: 15, title: "Lake Mirror",          category: "Nature",    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1400" },
  { id: 16, title: "Film Look",            category: "Cinematic", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1400" },
  { id: 17, title: "Night Lens",           category: "Cinematic", image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1400" },
  { id: 18, title: "Studio Shadow",        category: "Cinematic", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1400" },
  { id: 19, title: "Editorial Glow",       category: "Cinematic", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400" },
  { id: 20, title: "Fashion Frame",        category: "Portraits", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1400" },
];

const categories = ["All", "Wedding", "Portraits", "Nature", "Cinematic"];

const ABOUT_LINES = [
  "Passionate photographer with a strong eye for emotion, light, and storytelling.",
  "Specialized in wedding, portraits, nature, and cinematic photography.",
  "I create clean, premium frames that feel natural and memorable.",
  "Available for events, portraits, campaigns, and creative shoots.",
];


const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);


const loadLS = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const saveLS = (key, val)      => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };


function DetailField({ icon, label, field, value, editable = true, editingField, onStartEdit, onSave, onCancel, pendingValue, onPendingChange }) {
  const inputRef = useRef(null);
  const isEditing = editingField === field;
  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

  return (
    <div className={`detail-field${isEditing ? " detail-field--editing" : ""}`}>
      <span className="detail-field-icon">{icon}</span>
      <div className="detail-field-body">
        <small className="detail-field-label">{label}</small>
        {isEditing ? (
          <input
            ref={inputRef}
            className="detail-edit-input"
            value={pendingValue}
            onChange={(e) => onPendingChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
          />
        ) : (
          <span
            className={`detail-field-value${editable ? " detail-field-value--clickable" : ""}`}
            onClick={() => editable && onStartEdit(field, value)}
            title={editable ? "Click to edit" : undefined}
          >
            {value || "—"}
          </span>
        )}
      </div>
    </div>
  );
}


function KycSection({ verified, onVerify, onReset }) {
  const [docType, setDocType] = useState("");
  const [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleStartEdit = () => {
    setDocType("");
    setConsent(false);
    setEditing(true);
    onReset();
  };

  if (verified && !editing) {
    return (
      <div className="kyc-section">
        <div className="kyc-section-header">
          <span className="detail-field-icon"><SafetyCertificateOutlined /></span>
          <div className="detail-field-body">
            <small className="detail-field-label">KYC Verification</small>
            <span className="kyc-verified-inline">
              <CheckCircleOutlined className="kyc-check-icon" /> Verified
              <button type="button" className="kyc-re-verify-btn" onClick={handleStartEdit}>Re-verify</button>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kyc-section">
      <div className="kyc-section-header">
        <span className="detail-field-icon"><SafetyCertificateOutlined /></span>
        <div className="detail-field-body">
          <small className="detail-field-label">KYC Verification</small>
          <span className="kyc-badge-inline kyc-badge-inline--no"><CloseOutlined /> Not Verified</span>
        </div>
      </div>

      <div className="kyc-form-inline">
        <div className="kyc-info-bar">
          <span className="kyc-info-icon">ℹ</span>
          Complete your KYC verification here
        </div>

        <div className="kyc-row">
          <label className="kyc-field-label"><span className="kyc-required">*</span> Document Type</label>
          <div className="kyc-select-wrap">
            <select className="kyc-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="">Select document type</option>
              <option value="aadhaar">Aadhaar Card</option>
              <option value="passport">Passport</option>
              <option value="pan">PAN Card</option>
              <option value="dl">Driving Licence</option>
            </select>
          </div>
        </div>

        <label className="kyc-consent-row">
          <input
            type="checkbox"
            className="kyc-checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>I consent to KYC verification via Truthscreen</span>
        </label>

        <button
          className={`kyc-verify-btn${docType && consent ? " kyc-verify-btn--active" : ""}`}
          disabled={!docType || !consent}
          onClick={() => { if (docType && consent) { onVerify(); setEditing(false); } }}
        >
          Verify &amp; Continue
        </button>
      </div>
    </div>
  );
}


function ProfilePage() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [previewPhoto,   setPreviewPhoto]   = useState(null);
  const [previewIndex,   setPreviewIndex]   = useState(null);
  const [favorites,      setFavorites]      = useState(() => loadLS("axsStarred", []));
  const [starred,        setStarred]        = useState(() => loadLS("axsStarredPhotos", []));
  const [profile,        setProfile]        = useState(() => {
    const saved = loadLS("axsProfile", null);
    return saved ? { ...DEFAULT_PROFILE, ...saved } : DEFAULT_PROFILE;
  });
  const [kycVerified,    setKycVerified]    = useState(() => loadLS("axsKycVerified", false));
  const [aboutExpanded,  setAboutExpanded]  = useState(false);

  /* single-field inline edit */
  const [editingField, setEditingField] = useState(null);
  const [pendingValue, setPendingValue] = useState("");
  const [hasUnsaved,   setHasUnsaved]   = useState(false);

  const fullName = useMemo(() => `${profile.firstName} ${profile.lastName}`.trim(), [profile.firstName, profile.lastName]);

  const filteredPhotos = useMemo(
    () => activeCategory === "All" ? photos : photos.filter((p) => p.category === activeCategory),
    [activeCategory]
  );

  const saveField = (field, value) => {
    const next = { ...profile, [field]: value };
    setProfile(next);
    saveLS("axsProfile", next);
  };

  const handleStartEdit = (field, value) => {
    setEditingField(field);
    setPendingValue(value);
    setHasUnsaved(true);
  };

  const handleSaveAll = () => {
    if (editingField === "fullName") {
      const parts = pendingValue.trim().split(" ");
      const fn = parts[0] || "";
      const ln = parts.slice(1).join(" ") || "";
      const next = { ...profile, firstName: fn, lastName: ln };
      setProfile(next);
      saveLS("axsProfile", next);
    } else if (editingField) {
      saveField(editingField, pendingValue);
    }
    setEditingField(null);
    setPendingValue("");
    setHasUnsaved(false);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setPendingValue("");
    setHasUnsaved(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveField("profilePhoto", reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = () => saveField("profilePhoto", "");

  const toggleFavorite = (id) => {
    setFavorites((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      saveLS("axsStarred", next);
      return next;
    });
  };

  const toggleStarred = (id) => {
    setStarred((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      saveLS("axsStarredPhotos", next);
      return next;
    });
  };

  const handleKycVerify = () => {
    setKycVerified(true);
    saveLS("axsKycVerified", true);
  };

  const handleKycReset = () => {
    setKycVerified(false);
    saveLS("axsKycVerified", false);
  };

  const openLightbox = (photo) => {
    const idx = filteredPhotos.findIndex((p) => p.id === photo.id);
    setPreviewPhoto(photo);
    setPreviewIndex(idx);
  };

  const lightboxPrev = () => {
    const idx = (previewIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
    setPreviewPhoto(filteredPhotos[idx]);
    setPreviewIndex(idx);
  };

  const lightboxNext = () => {
    const idx = (previewIndex + 1) % filteredPhotos.length;
    setPreviewPhoto(filteredPhotos[idx]);
    setPreviewIndex(idx);
  };

  useEffect(() => {
    if (!previewPhoto) return;
    const handler = (e) => {
      if (e.key === "ArrowLeft")  lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "Escape")     setPreviewPhoto(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewPhoto, previewIndex, filteredPhotos]);

  return (
    <main className="profile-page">
      <div className="profile-shell">

        <div className="profile-page-heading animate-fade-down">
          <h1>Profile and Portfolio</h1>
        </div>

        <button type="button" className="profile-close-button" onClick={() => navigate("/dashboard")} aria-label="Close profile page">
          <CloseOutlined />
        </button>

      
        <section className="profile-hero animate-fade-up">

        
          <div className="hero-left-col">

          
            <div className={`profile-avatar-wrap${kycVerified ? " avatar-verified" : " avatar-not-verified"}`}>
              <div className="profile-avatar-circle">
                {profile.profilePhoto
                  ? <img src={profile.profilePhoto} alt={fullName} />
                  : <UserOutlined />}
              </div>
              {kycVerified
                ? <span className="avatar-kyc-badge avatar-kyc-badge--ok" title="KYC Verified"><CheckCircleOutlined /></span>
                : <span className="avatar-kyc-badge avatar-kyc-badge--no" title="Not Verified"><CloseOutlined /></span>
              }
              <div className="avatar-actions">
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Upload photo" className="avatar-action-btn">
                  <UploadOutlined />
                </button>
                <button type="button" onClick={handleRemovePhoto} title="Remove photo" disabled={!profile.profilePhoto} className="avatar-action-btn">
                  <DeleteOutlined />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
            </div>

          
            <div className="avatar-name-block">
              <p className="profile-kicker">Professional Photographer</p>
              <h2 className="avatar-fullname">{fullName}</h2>
              <p className="hero-subtitle">Capturing Moments, Creating Stories</p>
            </div>

          
            <div className="about-block">
              <p className="about-first-line">{ABOUT_LINES[0]}</p>
              {aboutExpanded && (
                <div className="about-rest">
                  {ABOUT_LINES.slice(1).map((line, i) => (
                    <p key={i} className="about-extra-line">{line}</p>
                  ))}
                </div>
              )}
              <button type="button" className="about-toggle-btn" onClick={() => setAboutExpanded((v) => !v)}>
                {aboutExpanded ? "Show less ▲" : "Read more..."}
              </button>
            </div>

          
            <div className="social-row">
              <span className="social-icon instagram" title="Instagram"><InstagramIcon /></span>
              <span className="social-icon facebook"  title="Facebook"><FacebookIcon /></span>
              <span className="social-icon twitter"   title="Twitter / X"><TwitterIcon /></span>
              <span className="social-icon google"    title="Google"><GoogleIcon /></span>
            </div>
          </div>

      
          <div className="hero-right-col">

            <div className="details-section">
              

              
              <DetailField
                icon={<UserOutlined />}
                label="Full Name"
                field="fullName"
                value={fullName}
                editable={true}
                editingField={editingField}
                onStartEdit={(field) => handleStartEdit(field, fullName)}
                onSave={handleSaveAll}
                onCancel={handleCancelEdit}
                pendingValue={pendingValue}
                onPendingChange={setPendingValue}
              />
              <DetailField
                icon={<MailOutlined />}
                label="Email"
                field="email"
                value={profile.email}
                editable={true}
                editingField={editingField}
                onStartEdit={handleStartEdit}
                onSave={handleSaveAll}
                onCancel={handleCancelEdit}
                pendingValue={pendingValue}
                onPendingChange={setPendingValue}
              />
              <DetailField
                icon={<PhoneOutlined />}
                label="Phone Number"
                field="phone"
                value={profile.phone}
                editable={true}
                editingField={editingField}
                onStartEdit={handleStartEdit}
                onSave={handleSaveAll}
                onCancel={handleCancelEdit}
                pendingValue={pendingValue}
                onPendingChange={setPendingValue}
              />
              <DetailField
                icon={<CameraOutlined />}
                label="Role"
                field="role"
                value={profile.role}
                editable={false}
                editingField={editingField}
                onStartEdit={handleStartEdit}
                onSave={handleSaveAll}
                onCancel={handleCancelEdit}
                pendingValue={pendingValue}
                onPendingChange={setPendingValue}
              />
              <DetailField
                icon={<EnvironmentOutlined />}
                label="Address"
                field="address"
                value={profile.address}
                editable={true}
                editingField={editingField}
                onStartEdit={handleStartEdit}
                onSave={handleSaveAll}
                onCancel={handleCancelEdit}
                pendingValue={pendingValue}
                onPendingChange={setPendingValue}
              />

              
              <KycSection verified={kycVerified} onVerify={handleKycVerify} onReset={handleKycReset} />

          
              {hasUnsaved && (
                <button type="button" className="floating-save-btn" onClick={handleSaveAll}>
                  <CheckCircleOutlined /> Save
                </button>
              )}
            </div>
          </div>
        </section>

        
        <section className="profile-panel gallery-panel animate-fade-up" style={{ animationDelay: "0.18s" }}>
          <div className="gallery-head">
            <div>
              <h2><AppstoreOutlined /> Gallery</h2>
              <p>Wedding, portraits, nature, and cinematic work</p>
            </div>
            <div className="category-filter">
              {categories.map((cat) => (
                <button type="button" key={cat} className={activeCategory === cat ? "active" : ""} onClick={() => setActiveCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="masonry-grid">
            {filteredPhotos.map((photo, i) => (
              <div className="masonry-item" key={photo.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <button type="button" className="masonry-btn" onClick={() => openLightbox(photo)}>
                  <img src={photo.image} alt={photo.title} loading="lazy" />
                  <div className="masonry-overlay">
                    <small>{photo.category}</small>
                    <h3>{photo.title}</h3>
                  </div>
                </button>
                <button
                  type="button"
                  className={`favorite-button${favorites.includes(photo.id) ? " fav-active" : ""}`}
                  onClick={() => toggleFavorite(photo.id)}
                  aria-label="Like photo"
                >
                  {favorites.includes(photo.id) ? <HeartFilled /> : <HeartOutlined />}
                </button>
                {starred.includes(photo.id) && (
                  <span className="card-star-badge" title="Starred"><StarFilled /></span>
                )}
              </div>
            ))}
          </div>
        </section>

        <footer className="profile-footer">© axs</footer>
      </div>

    
      {previewPhoto && (
        <div className="portfolio-lightbox" role="dialog" aria-modal="true">
          <button type="button" className="portfolio-lightbox-backdrop" onClick={() => setPreviewPhoto(null)} aria-label="Close preview" />
          <div className="portfolio-lightbox-card">
            <button type="button" className="portfolio-lightbox-close" onClick={() => setPreviewPhoto(null)} aria-label="Close">
              <CloseOutlined />
            </button>
            <button
              type="button"
              className={`lb-star-btn${starred.includes(previewPhoto.id) ? " lb-star-active" : ""}`}
              onClick={() => toggleStarred(previewPhoto.id)}
              title={starred.includes(previewPhoto.id) ? "Remove star" : "Mark as best"}
            >
              {starred.includes(previewPhoto.id) ? <StarFilled /> : <StarOutlined />}
            </button>
            <button type="button" className="lb-arrow lb-prev" onClick={lightboxPrev} aria-label="Previous">&#8249;</button>
            <button type="button" className="lb-arrow lb-next" onClick={lightboxNext} aria-label="Next">&#8250;</button>
            <img src={previewPhoto.image} alt={previewPhoto.title} />
            <div className="lb-meta">
              <span>{previewPhoto.category}</span>
              <h3>{previewPhoto.title}</h3>
              <small>{previewIndex + 1} / {filteredPhotos.length}</small>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ProfilePage;
