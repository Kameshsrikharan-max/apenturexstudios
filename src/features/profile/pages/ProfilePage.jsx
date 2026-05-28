import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppstoreOutlined, CameraOutlined, CheckCircleOutlined, CloseOutlined,
  DeleteOutlined, EnvironmentOutlined, HeartFilled, HeartOutlined,
  MailOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PhoneOutlined,
  SafetyCertificateOutlined, StarFilled, StarOutlined,
  UploadOutlined, UserOutlined,
} from "@ant-design/icons";
import "./ProfilePage.css";

const DEFAULT_PROFILE = {
  firstName: "Kamesh", lastName: "Srikharan.T",
  email: "kameshsrikharan.t@gmail.com", phone: "8888888888",
  role: "Professional Photographer", address: "Arumbakkam",
  city: "Chennai", state: "Tamil Nadu", country: "India", postalCode: "600106",
  profilePhoto: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1200",
};

const photos = [
  { id:1,  title:"Royal Wedding Frame",  category:"Wedding",   image:"https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400" },
  { id:2,  title:"Golden Couple Walk",   category:"Wedding",   image:"https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1400" },
  { id:3,  title:"Classic Portrait",     category:"Portraits", image:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1400" },
  { id:4,  title:"Forest Light",         category:"Nature",    image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400" },
  { id:5,  title:"Camera Mood",          category:"Cinematic", image:"https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1400" },
  { id:6,  title:"Bride Detail",         category:"Wedding",   image:"https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1400" },
  { id:7,  title:"Wedding Rings",        category:"Wedding",   image:"https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1400" },
  { id:8,  title:"Outdoor Couple",       category:"Wedding",   image:"https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?q=80&w=1400" },
  { id:9,  title:"Soft Portrait",        category:"Portraits", image:"https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1400" },
  { id:10, title:"Golden Portrait",      category:"Portraits", image:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1400" },
  { id:11, title:"Street Portrait",      category:"Portraits", image:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1400" },
  { id:12, title:"Mountain Air",         category:"Nature",    image:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400" },
  { id:13, title:"Nature Story",         category:"Nature",    image:"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1400" },
  { id:14, title:"Wild Hills",           category:"Nature",    image:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1400" },
  { id:15, title:"Lake Mirror",          category:"Nature",    image:"https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1400" },
  { id:16, title:"Film Look",            category:"Cinematic", image:"https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1400" },
  { id:17, title:"Night Lens",           category:"Cinematic", image:"https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1400" },
  { id:18, title:"Studio Shadow",        category:"Cinematic", image:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1400" },
  { id:19, title:"Editorial Glow",       category:"Cinematic", image:"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400" },
  { id:20, title:"Fashion Frame",        category:"Portraits", image:"https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1400" },
];

const categories = ["All","Wedding","Portraits","Nature","Cinematic"];
const ABOUT_LINES = [
  "Passionate photographer with a strong eye for emotion, light, and storytelling.",
  "Specialized in wedding, portraits, nature, and cinematic photography.",
  "I create clean, premium frames that feel natural and memorable.",
  "Available for events, portraits, campaigns, and creative shoots.",
];

const DOC_LABELS = { aadhaar:"Aadhaar", pan:"PAN", dl:"Driving License", passport:"Passport" };

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const loadLS = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const saveLS = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function maskValue(str = "") {
  if (!str) return "";
  if (str.length <= 4) return str;
  return str.slice(0, 2) + "*".repeat(str.length - 4) + str.slice(-2);
}

const DOC_FIELDS = {
  aadhaar: [],
  pan:      [{ key:"panNumber",    label:"PAN Number",             required:true }],
  dl:       [{ key:"dlNumber",     label:"DL Number",              required:true },
             { key:"dob",          label:"Date of Birth",          required:true, placeholder:"DD-MM-YYYY" },
             { key:"dlName",       label:"Full Name (as on DL)",   required:false }],
  passport: [{ key:"passportNo",   label:"Passport Number",        required:true },
             { key:"dob",          label:"Date of Birth",          required:true, placeholder:"DD-MM-YYYY" },
             { key:"expiry",       label:"Expiry Date",            required:false, placeholder:"DD-MM-YYYY" },
             { key:"passportName", label:"Full Name (as on Passport)", required:false }],
};

function KycSection({ verified, kycData, onVerify, onReset }) {
  const [docType, setDocType] = useState("");
  const [vals,    setVals]    = useState({});
  const [consent, setConsent] = useState(false);
  const [editing, setEditing] = useState(false);
  const fields = DOC_FIELDS[docType] || [];

  const canSubmit = () => {
    if (!docType || !consent) return false;
    return fields.filter(f => f.required).every(f => (vals[f.key] || "").trim());
  };

  const handleVerify = () => {
    if (!canSubmit()) return;
    onVerify({ docType, vals });
    setEditing(false);
  };

  const handleReset = () => {
    setDocType(""); setVals({}); setConsent(false); setEditing(true); onReset();
  };

  if (verified && !editing) {
    const submittedFields = DOC_FIELDS[kycData?.docType] || [];
    return (
      <div className="kyc-section">
        <div className="kyc-hdr">
          <span className="kyc-hdr-icon"><SafetyCertificateOutlined /></span>
          <div className="kyc-hdr-content">
            <p className="kyc-hdr-label">KYC VERIFICATION</p>
            <span className="kyc-verified-inline">
              <CheckCircleOutlined className="kyc-ok-icon" /> Verified
              <button type="button" className="kyc-reverify" onClick={handleReset}>Re-verify</button>
            </span>
          </div>
        </div>
        {kycData && (
          <div className="kyc-submitted-data">
            <div className="kyc-submitted-row">
              <span className="kyc-sub-label">Document</span>
              <span className="kyc-sub-value">{DOC_LABELS[kycData.docType] || kycData.docType}</span>
            </div>
            {kycData.docType === "aadhaar" && (
              <div className="kyc-submitted-row">
                <span className="kyc-sub-label">Method</span>
                <span className="kyc-sub-value">Aadhaar Digilocker</span>
              </div>
            )}
            {submittedFields.map(f => kycData.vals?.[f.key] ? (
              <div key={f.key} className="kyc-submitted-row">
                <span className="kyc-sub-label">{f.label}</span>
                <span className="kyc-sub-value kyc-sub-masked">{maskValue(kycData.vals[f.key])}</span>
              </div>
            ) : null)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="kyc-section">
      <div className="kyc-hdr">
        <span className="kyc-hdr-icon"><SafetyCertificateOutlined /></span>
        <div className="kyc-hdr-content">
          <p className="kyc-hdr-label">KYC VERIFICATION</p>
          <span className="kyc-not-verified"><CloseOutlined /> Not Verified</span>
        </div>
      </div>
      <div className="kyc-body">
        <div className="kyc-info-banner">
          <span className="kyc-i-icon">i</span>
          Complete your KYC verification here
        </div>
        <div className="kyc-field-group">
          <label className="kyc-field-label"><span className="kyc-req">*</span> Document Type</label>
          <div className="kyc-select-wrap">
            <select className="kyc-select" value={docType} onChange={e => { setDocType(e.target.value); setVals({}); }}>
              <option value="">Select document type</option>
              <option value="aadhaar">Aadhaar</option>
              <option value="pan">PAN</option>
              <option value="dl">Driving License</option>
              <option value="passport">Passport</option>
            </select>
          </div>
        </div>
        {docType === "aadhaar" && (
          <div className="kyc-digilocker-box kyc-reveal">
            <strong>Aadhaar Digilocker</strong>
            <p>Aadhaar verification uses Digilocker - you will be redirected to complete the linking process.</p>
          </div>
        )}
        {fields.length > 0 && (
          <div className="kyc-fields-grid kyc-reveal">
            {fields.map((f, i) => (
              <div key={f.key} className={`kyc-input-cell${fields.length === 1 || (i === fields.length - 1 && fields.length % 2 !== 0) ? " kyc-full" : ""}`}>
                <label className="kyc-field-label">
                  {f.required && <span className="kyc-req">*</span>} {f.label}
                </label>
                <input
                  className="kyc-input"
                  placeholder={f.placeholder || f.label}
                  value={vals[f.key] || ""}
                  onChange={e => setVals(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}
        {docType && (
          <>
            <label className="kyc-consent kyc-reveal">
              <input type="checkbox" className="kyc-checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span>I consent to KYC verification via Truthscreen</span>
            </label>
            <button
              className={`kyc-submit kyc-reveal${canSubmit() ? " kyc-submit--active" : ""}`}
              disabled={!canSubmit()}
              onClick={handleVerify}
            >
              Verify &amp; Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DetailField({ icon, field, value, editable=true, editingField, onStartEdit, onSave, onCancel, pendingValue, onPendingChange, placeholder }) {
  const inputRef = useRef(null);
  const isEditing = editingField === field;
  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

  return (
    <div className={`det-field${isEditing ? " det-field--active" : ""}`}>
      <span className="det-icon">{icon}</span>
      <div className="det-body">
        {isEditing ? (
          <input
            ref={inputRef}
            className="det-input"
            value={pendingValue}
            placeholder={placeholder}
            onChange={e => onPendingChange(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter") onSave(); if (e.key==="Escape") onCancel(); }}
          />
        ) : (
          <span
            className={`det-value${editable ? " det-value--click" : ""}`}
            onClick={() => editable && onStartEdit(field, value)}
            title={editable ? `Edit` : undefined}
          >
            {value || <span className="det-placeholder">{placeholder || "-"}</span>}
          </span>
        )}
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
    const s = loadLS("axsProfile", null);
    return s ? { ...DEFAULT_PROFILE, ...s } : DEFAULT_PROFILE;
  });
  const [kycVerified,   setKycVerified]     = useState(() => loadLS("axsKycVerified", false));
  const [kycData,       setKycData]         = useState(() => loadLS("axsKycData", null));
  const [aboutExpanded, setAboutExpanded]   = useState(false);
  const [sidebarOpen,   setSidebarOpen]     = useState(true);
  const [editingField,  setEditingField]    = useState(null);
  const [pendingValue,  setPendingValue]    = useState("");
  const [hasUnsaved,    setHasUnsaved]      = useState(false);

  const fullName = useMemo(() =>
    (`${profile.firstName||""} ${profile.lastName||""}`).trim() || "Kamesh Srikharan.T",
  [profile]);

  const filteredPhotos = useMemo(
    () => activeCategory === "All" ? photos : photos.filter(p => p.category === activeCategory),
    [activeCategory]
  );

  const saveField = (field, value) => {
    const next = { ...profile, [field]: value };
    setProfile(next); saveLS("axsProfile", next);
  };

  const handleStartEdit = (field, value) => { setEditingField(field); setPendingValue(value); setHasUnsaved(true); };

  const handleSaveAll = () => {
    if (editingField === "fullName") {
      const p = pendingValue.trim().split(" ");
      const next = { ...profile, firstName: p[0]||"", lastName: p.slice(1).join(" ")||"" };
      setProfile(next); saveLS("axsProfile", next);
    } else if (editingField) saveField(editingField, pendingValue);
    setEditingField(null); setPendingValue(""); setHasUnsaved(false);
  };

  const handleCancelEdit = () => { setEditingField(null); setPendingValue(""); setHasUnsaved(false); };

  const handlePhotoUpload = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => saveField("profilePhoto", r.result);
    r.readAsDataURL(file); e.target.value = "";
  };

  const toggleFavorite = id => {
    setFavorites(c => { const n = c.includes(id) ? c.filter(x=>x!==id) : [...c,id]; saveLS("axsStarred",n); return n; });
  };
  const toggleStarred = id => {
    setStarred(c => { const n = c.includes(id) ? c.filter(x=>x!==id) : [...c,id]; saveLS("axsStarredPhotos",n); return n; });
  };

  const openLightbox = photo => {
    const idx = filteredPhotos.findIndex(p => p.id === photo.id);
    setPreviewPhoto(photo); setPreviewIndex(idx);
  };
  const lbPrev = () => { const i=(previewIndex-1+filteredPhotos.length)%filteredPhotos.length; setPreviewPhoto(filteredPhotos[i]); setPreviewIndex(i); };
  const lbNext = () => { const i=(previewIndex+1)%filteredPhotos.length; setPreviewPhoto(filteredPhotos[i]); setPreviewIndex(i); };

  useEffect(() => {
    if (!previewPhoto) return;
    const h = e => {
      if (e.key==="ArrowLeft") lbPrev();
      if (e.key==="ArrowRight") lbNext();
      if (e.key==="Escape") setPreviewPhoto(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [previewPhoto, previewIndex, filteredPhotos]);

  return (
    <div className={`profile-page${sidebarOpen ? " sidebar-open" : " sidebar-closed"}`}>


      <aside className={`pp-sidebar${sidebarOpen ? " pp-sidebar--open" : ""}`}>
        {/* Avatar */}
        <div className="sb-avatar-wrap">
          <div className={`profile-avatar-circle${kycVerified ? " avatar-verified" : " avatar-not-verified"}`}>
            {profile.profilePhoto
              ? <img src={profile.profilePhoto} alt={fullName} />
              : <UserOutlined />}
          </div>
          <span className={`avatar-kyc-badge ${kycVerified ? "avatar-kyc-badge--ok" : "avatar-kyc-badge--no"}`}>
            {kycVerified ? <CheckCircleOutlined /> : <CloseOutlined />}
          </span>
          <div className="sb-avatar-actions">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="avatar-action-btn" title="Upload photo"><UploadOutlined /></button>
            <button type="button" onClick={() => saveField("profilePhoto","")} disabled={!profile.profilePhoto} className="avatar-action-btn" title="Remove photo"><DeleteOutlined /></button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
        </div>

        
        <div className="sb-name-block">
          <p className="sb-role">{profile.role}</p>
          <h2 className="sb-fullname">{fullName}</h2>
          <p className="sb-subtitle">Capturing Moments, Creating Stories</p>
        </div>

      
        <div className="sb-details">
          <DetailField icon={<UserOutlined />}        field="fullName"  value={fullName}        editable placeholder="Full name"   editingField={editingField} onStartEdit={f => handleStartEdit(f, fullName)} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} />
          <DetailField icon={<MailOutlined />}        field="email"     value={profile.email}   editable placeholder="Email"       editingField={editingField} onStartEdit={handleStartEdit} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} />
          <DetailField icon={<PhoneOutlined />}       field="phone"     value={profile.phone}   editable placeholder="Phone"       editingField={editingField} onStartEdit={handleStartEdit} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} />
          <DetailField icon={<CameraOutlined />}      field="role"      value={profile.role}    editable={false} placeholder="Role" editingField={editingField} onStartEdit={handleStartEdit} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} />
          <DetailField icon={<EnvironmentOutlined />} field="address"   value={`${profile.address}, ${profile.city}, ${profile.state}`} editable placeholder="Address" editingField={editingField} onStartEdit={handleStartEdit} onSave={handleSaveAll} onCancel={handleCancelEdit} pendingValue={pendingValue} onPendingChange={setPendingValue} />
          {hasUnsaved && (
            <button type="button" className="floating-save-btn" onClick={handleSaveAll}>
              <CheckCircleOutlined /> Save
            </button>
          )}
        </div>

      
        <KycSection
          verified={kycVerified}
          kycData={kycData}
          onVerify={data => { setKycVerified(true); setKycData(data); saveLS("axsKycVerified",true); saveLS("axsKycData",data); }}
          onReset={() => { setKycVerified(false); setKycData(null); saveLS("axsKycVerified",false); saveLS("axsKycData",null); }}
        />

      
        <div className="sb-about-block">
          <p className="about-first-line">{ABOUT_LINES[0]}</p>
          {aboutExpanded && (
            <div className="about-rest">
              {ABOUT_LINES.slice(1).map((line, i) => <p key={i} className="about-extra-line">{line}</p>)}
            </div>
          )}
          <button type="button" className="about-toggle-btn" onClick={() => setAboutExpanded(v=>!v)}>
            {aboutExpanded ? "Show less" : "Read more..."}
          </button>
        </div>

        
        <div className="social-row">
          <span className="social-icon instagram"><InstagramIcon /></span>
          <span className="social-icon facebook"><FacebookIcon /></span>
          <span className="social-icon twitter"><TwitterIcon /></span>
          <span className="social-icon google"><GoogleIcon /></span>
        </div>
      </aside>

      
      <button
        type="button"
        className="sb-toggle-btn"
        onClick={() => setSidebarOpen(v => !v)}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
      </button>

      
      <main className="pp-main">
        <button type="button" className="pp-page-close" onClick={() => navigate("/dashboard")} aria-label="Close">
          <CloseOutlined />
        </button>

        <div className="profile-shell">
          <div className="section-title section-title--portfolio">
            <span className="section-title-kicker">Creator Space</span>
            <h1>Profile &amp; Portfolio</h1>
          </div>

          <section className="profile-panel gallery-panel animate-fade-up">
            <div className="gallery-head">
              <div>
                <h2><AppstoreOutlined /> Gallery</h2>
                <p>Wedding, portraits, nature, and cinematic work</p>
              </div>
              <div className="category-filter">
                {categories.map(cat => (
                  <button type="button" key={cat} className={activeCategory===cat?"active":""} onClick={() => setActiveCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="masonry-grid">
              {filteredPhotos.map((photo, i) => (
                <div className="masonry-item" key={photo.id} style={{animationDelay:`${i*0.04}s`}}>
                  <button type="button" className="masonry-btn" onClick={() => openLightbox(photo)}>
                    <img src={photo.image} alt={photo.title} loading="lazy" />
                    <div className="masonry-overlay">
                      <small>{photo.category}</small>
                      <h3>{photo.title}</h3>
                    </div>
                  </button>
                  <button type="button" className={`favorite-button${favorites.includes(photo.id)?" fav-active":""}`} onClick={() => toggleFavorite(photo.id)} aria-label="Like">
                    {favorites.includes(photo.id) ? <HeartFilled /> : <HeartOutlined />}
                  </button>
                  {starred.includes(photo.id) && <span className="card-star-badge"><StarFilled /></span>}
                </div>
              ))}
            </div>
          </section>

          <footer className="profile-footer">(c) axs</footer>
        </div>
      </main>

    
      {previewPhoto && (
        <div className="portfolio-lightbox" role="dialog" aria-modal="true">
          <button type="button" className="portfolio-lightbox-backdrop" onClick={() => setPreviewPhoto(null)} aria-label="Close" />
          <div className="portfolio-lightbox-card">
            <button type="button" className="portfolio-lightbox-close" onClick={() => setPreviewPhoto(null)}><CloseOutlined /></button>
            <button type="button" className={`lb-star-btn${starred.includes(previewPhoto.id)?" lb-star-active":""}`} onClick={() => toggleStarred(previewPhoto.id)}>
              {starred.includes(previewPhoto.id) ? <StarFilled /> : <StarOutlined />}
            </button>
            <button type="button" className="lb-arrow lb-prev" onClick={lbPrev}>&#8249;</button>
            <button type="button" className="lb-arrow lb-next" onClick={lbNext}>&#8250;</button>
            <img src={previewPhoto.image} alt={previewPhoto.title} />
            <div className="lb-meta">
              <span>{previewPhoto.category}</span>
              <h3>{previewPhoto.title}</h3>
              <small>{previewIndex+1} / {filteredPhotos.length}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;