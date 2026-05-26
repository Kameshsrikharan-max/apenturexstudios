import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {AppstoreOutlined,CameraOutlined,CheckCircleOutlined,CloseOutlined,DeleteOutlined,EditOutlined,EnvironmentOutlined,HeartFilled,HeartOutlined,LeftOutlined,MailOutlined,PhoneOutlined,RightOutlined,SaveOutlined,StarFilled,UploadOutlined,UserOutlined,} from "@ant-design/icons";
import "./ProfilePage.css";

const DEFAULT_PROFILE = {
  firstName: "Kamesh",
  lastName: "Srikharan.T",
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
  { id: 1, title: "Royal Wedding Frame", category: "Wedding", image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400" },
  { id: 2, title: "Golden Couple Walk", category: "Wedding", image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1400" },
  { id: 3, title: "Classic Portrait", category: "Portraits", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1400" },
  { id: 4, title: "Forest Light", category: "Nature", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400" },
  { id: 5, title: "Camera Mood", category: "Cinematic", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1400" },
  { id: 6, title: "Bride Detail", category: "Wedding", image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1400" },
  { id: 7, title: "Wedding Rings", category: "Wedding", image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1400" },
  { id: 8, title: "Outdoor Couple", category: "Wedding", image: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?q=80&w=1400" },
  { id: 9, title: "Soft Portrait", category: "Portraits", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1400" },
  { id: 10, title: "Golden Portrait", category: "Portraits", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1400" },
  { id: 11, title: "Street Portrait", category: "Portraits", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1400" },
  { id: 12, title: "Mountain Air", category: "Nature", image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400" },
  { id: 13, title: "Nature Story", category: "Nature", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1400" },
  { id: 14, title: "Wild Hills", category: "Nature", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1400" },
  { id: 15, title: "Lake Mirror", category: "Nature", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1400" },
  { id: 16, title: "Film Look", category: "Cinematic", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1400" },
  { id: 17, title: "Night Lens", category: "Cinematic", image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1400" },
  { id: 18, title: "Studio Shadow", category: "Cinematic", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1400" },
  { id: 19, title: "Editorial Glow", category: "Cinematic", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400" },
  { id: 20, title: "Fashion Frame", category: "Portraits", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1400" },
];

const topPhotoIds = [1, 2, 3, 4, 5];
const topPhotos = photos.filter((photo) => topPhotoIds.includes(photo.id));
const categories = ["All", "Wedding", "Portraits", "Nature", "Cinematic"];

function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

 
  const [editOpen, setEditOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [favorites, setFavorites] = useState([]);

 const getInitialProfile = () => {
  try {
    const savedProfile = localStorage.getItem("axsProfile");

    if (savedProfile) {
      return {
        ...DEFAULT_PROFILE,
        ...JSON.parse(savedProfile),
      };
    }
  } catch (error) {
    console.error(error);
  }

  return DEFAULT_PROFILE;
};

const [profile, setProfile] = useState(getInitialProfile);
const [draftProfile, setDraftProfile] = useState(getInitialProfile);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % photos.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  const fullName = useMemo(() => {
    return `${profile.firstName} ${profile.lastName}`.trim();
  }, [profile.firstName, profile.lastName]);

  const fullAddress = useMemo(() => {
    return `${profile.address}, ${profile.city}, ${profile.state}, ${profile.country} ${profile.postalCode}`;
  }, [profile]);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === "All") return photos;
    return photos.filter((photo) => photo.category === activeCategory);
  }, [activeCategory]);

  const currentPhoto = photos[carouselIndex];

  const saveProfile = (nextProfile) => {
    setProfile(nextProfile);
    setDraftProfile(nextProfile);
    localStorage.setItem("axsProfile", JSON.stringify(nextProfile));
  };

  const handleEditOpen = () => {
    setDraftProfile(profile);
    setEditOpen(true);
  };

  const handleChange = (field, value) => {
    setDraftProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = () => {
    saveProfile(draftProfile);
    setEditOpen(false);
  };

  const handleCancel = () => {
    setDraftProfile(profile);
    setEditOpen(false);
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      saveProfile({
        ...profile,
        profilePhoto: reader.result,
      });
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    saveProfile({
      ...profile,
      profilePhoto: "",
    });
  };

  const handlePrevious = () => {
    setCarouselIndex((current) => (current === 0 ? photos.length - 1 : current - 1));
  };

  const handleNext = () => {
    setCarouselIndex((current) => (current + 1) % photos.length);
  };

  const toggleFavorite = (photoId) => {
    setFavorites((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId]
    );
  };

  const renderInfo = (icon, label, value) => (
    <div className="profile-info-row">
      <span className="profile-info-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value || "-"}</strong>
      </div>
    </div>
  );

  const renderStar = (photo) =>
    topPhotoIds.includes(photo.id) ? (
      <span className="star-badge" title="Top picture">
        <StarFilled />
      </span>
    ) : null;

  return (
   <main className="profile-page">
  <div className="profile-shell">
    <div className="profile-page-heading">
      <h1>Profile and Portfolio</h1>
    </div>

    <button
          type="button"
          className="profile-close-button"
          onClick={() => navigate("/dashboard")}
          aria-label="Close profile page"
        >
          <CloseOutlined />
        </button>

        <section className="profile-hero">
          <button
            type="button"
            className="edit-icon-button"
            onClick={handleEditOpen}
            aria-label="Edit profile"
            title="Edit"
          >
            <EditOutlined />
          </button>

          <div className="hero-photo-column">
            <div className="profile-photo-widget">
              <div className="profile-photo-core">
                {profile.profilePhoto ? (
                  <img src={profile.profilePhoto} alt={fullName} />
                ) : (
                  <UserOutlined />
                )}
              </div>

              <div className="profile-photo-tooltip">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload profile photo"
                  title="Upload photo"
                >
                  <UploadOutlined />
                </button>

                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  aria-label="Remove profile photo"
                  title="Remove photo"
                  disabled={!profile.profilePhoto}
                >
                  <DeleteOutlined />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                hidden
              />
            </div>

            <div className="social-row">
               <button type="button">IN</button>
              <button type="button">FB</button>
              <button type="button">X</button>
              <button type="button">G</button>
            </div>
          </div>

          <div className="hero-main-copy">
            <p className="profile-kicker">Professional Photographer</p>
            <h1>{fullName}</h1>
            <p className="hero-subtitle">Capturing Moments, Creating Stories</p>

            <div className="hero-details-card">
              {renderInfo(<MailOutlined />, "Email", profile.email)}
              {renderInfo(<PhoneOutlined />, "Phone Number", profile.phone)}
              {renderInfo(<CameraOutlined />, "Role", profile.role)}
              {renderInfo(<EnvironmentOutlined />, "Address", fullAddress)}
            </div>
          </div>

          <div className="about-card">
            <h2>
              <UserOutlined /> About Me
            </h2>
            <p>Passionate photographer with a strong eye for emotion, light, and storytelling.</p>
            <p>Specialized in wedding, portraits, nature, and cinematic photography.</p>
            <p>I create clean, premium frames that feel natural and memorable.</p>
            <p>Available for events, portraits, campaigns, and creative shoots.</p>

            <div className="status-pill">
              <CheckCircleOutlined /> Available For Shoots
            </div>
          </div>
        </section>

        <section className="profile-panel top-pictures-panel">
          <div className="center-heading">
            <h2>
              <StarFilled /> Top 5 Best Pictures
            </h2>
            <p>A collection of my finest work</p>
          </div>

          <div className="top-picture-grid">
            {topPhotos.map((photo) => (
              <button type="button" key={photo.id} onClick={() => setPreviewPhoto(photo)}>
                <img src={photo.image} alt={photo.title} />
                {renderStar(photo)}
                <span>{photo.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="profile-panel carousel-panel">
          <div className="center-heading">
            <h2>
              <AppstoreOutlined /> Gallery
            </h2>
            <p>Top 5 pictures appear first and are marked with a star</p>
          </div>

          <div className="carousel-stage">
            <button type="button" className="carousel-arrow left" onClick={handlePrevious}>
              <LeftOutlined />
            </button>

            <div className="side-preview side-left">
              <img src={photos[(carouselIndex + photos.length - 1) % photos.length].image} alt="" />
            </div>

            <button
              type="button"
              className="main-carousel-image"
              onClick={() => setPreviewPhoto(currentPhoto)}
            >
              <img src={currentPhoto.image} alt={currentPhoto.title} />
              {renderStar(currentPhoto)}
              <div>
                <span>{currentPhoto.category}</span>
                <h3>{currentPhoto.title}</h3>
              </div>
            </button>

            <div className="side-preview side-right">
              <img src={photos[(carouselIndex + 1) % photos.length].image} alt="" />
            </div>

            <button type="button" className="carousel-arrow right" onClick={handleNext}>
              <RightOutlined />
            </button>
          </div>

          <div className="carousel-dots">
            {photos.map((photo, index) => (
              <button
                type="button"
                key={photo.id}
                className={carouselIndex === index ? "active" : ""}
                onClick={() => setCarouselIndex(index)}
                aria-label={photo.title}
              />
            ))}
          </div>
        </section>

        <section className="profile-panel gallery-panel">
          <div className="gallery-head">
            <div>
              <h2>
                <AppstoreOutlined /> Gallery
              </h2>
              <p>Wedding, portraits, nature, and cinematic work</p>
            </div>

            <div className="category-filter">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={activeCategory === category ? "active" : ""}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="gallery-grid">
            {filteredPhotos.map((photo) => (
              <div className="gallery-card" key={photo.id}>
                <button type="button" onClick={() => setPreviewPhoto(photo)}>
                  <img src={photo.image} alt={photo.title} />
                  {renderStar(photo)}
                  <div>
                    <small>{photo.category}</small>
                    <h3>{photo.title}</h3>
                  </div>
                </button>

                <button
                  type="button"
                  className="favorite-button"
                  onClick={() => toggleFavorite(photo.id)}
                  aria-label="Favorite photo"
                >
                  {favorites.includes(photo.id) ? <HeartFilled /> : <HeartOutlined />}
                </button>
              </div>
            ))}
          </div>
        </section>

        <footer className="profile-footer">© axs</footer>
      </div>

      {editOpen && (
        <div className="edit-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="edit-modal-backdrop"
            onClick={handleCancel}
            aria-label="Close edit modal"
          />

          <div className="edit-modal-card">
            <button
              type="button"
              className="edit-modal-close"
              onClick={handleCancel}
              aria-label="Close"
            >
              <CloseOutlined />
            </button>

            <div className="edit-modal-head">
              <span>
                <EditOutlined />
              </span>
              <div>
                <h2>Edit Profile</h2>
                <p>Update details and save changes to refresh the page.</p>
              </div>
            </div>

            <div className="edit-grid">
              {[
                ["First Name", "firstName"],
                ["Last Name", "lastName"],
                ["Email", "email"],
                ["Phone Number", "phone"],
                ["Role", "role"],
                ["Address", "address"],
                ["City", "city"],
                ["State", "state"],
                ["Country", "country"],
                ["Postal Code", "postalCode"],
              ].map(([label, field]) => (
                <label key={field} className="edit-field">
                  <span>{label}</span>
                  <input
                    value={draftProfile[field]}
                    onChange={(event) => handleChange(field, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="edit-modal-actions">
              <button type="button" className="secondary-button" onClick={handleCancel}>
                Cancel
              </button>
              <button type="button" className="save-button" onClick={handleSave}>
                <SaveOutlined /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div className="portfolio-lightbox" role="dialog" aria-modal="true">
          <button
            type="button"
            className="portfolio-lightbox-backdrop"
            onClick={() => setPreviewPhoto(null)}
            aria-label="Close preview"
          />

          <div className="portfolio-lightbox-card">
            <button
              type="button"
              className="portfolio-lightbox-close"
              onClick={() => setPreviewPhoto(null)}
              aria-label="Close"
            >
              <CloseOutlined />
            </button>

            <img src={previewPhoto.image} alt={previewPhoto.title} />
            {renderStar(previewPhoto)}
            <div>
              <span>{previewPhoto.category}</span>
              <h3>{previewPhoto.title}</h3>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ProfilePage;