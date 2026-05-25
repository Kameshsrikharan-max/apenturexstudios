import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppstoreOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  EyeOutlined,
  FolderOpenOutlined,
  HeartFilled,
  HeartOutlined,
  LeftOutlined,
  MailOutlined,
  PhoneOutlined,
  PictureOutlined,
  RightOutlined,
  StarOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import "./MyPortfolioPage.css";

const photographer = {
  name: "Kamesh Srikharan.T",
  role: "Wedding Photographer",
  email: "kameshsrikharan.t@gmail.com",
  phone: "8888888888",
  address: "Arumbakkam",
  city: "Chennai",
  state: "Tamil Nadu",
  country: "India",
  postalCode: "600106",
};

const aboutLines = [
  "A passionate and creative photographer with experience capturing meaningful moments and stunning visuals.",
  "Specialized in portrait, wedding, fashion, and outdoor photography with a strong eye for detail and storytelling.",
  "Skilled in modern editing techniques, lighting setups, and cinematic composition.",
  "Dedicated to delivering high-quality professional photographs that create lasting memories.",
  "Always exploring new creative styles to make every photoshoot unique and visually impactful.",
];

const photos = [
  { id: 1, title: "Royal Wedding Frame", category: "Wedding", image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400" },
  { id: 2, title: "Golden Couple Walk", category: "Wedding", image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1400" },
  { id: 3, title: "Classic Portrait", category: "Portrait", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1400" },
  { id: 4, title: "Forest Light", category: "Nature", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400" },
  { id: 5, title: "Camera Mood", category: "Cinematic", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1400" },
  { id: 6, title: "Fashion Editorial", category: "Fashion", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1400" },
  { id: 7, title: "Outdoor Couple", category: "Wedding", image: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?q=80&w=1400" },
  { id: 8, title: "Golden Portrait", category: "Portrait", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1400" },
  { id: 9, title: "Nature Story", category: "Nature", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1400" },
  { id: 10, title: "Studio Shadow", category: "Cinematic", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1400" },
  { id: 11, title: "Bride Detail", category: "Wedding", image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1400" },
  { id: 12, title: "Street Portrait", category: "Portrait", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1400" },
  { id: 13, title: "Wild Hills", category: "Nature", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1400" },
  { id: 14, title: "Runway Glow", category: "Fashion", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1400" },
  { id: 15, title: "Film Look", category: "Cinematic", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1400" },
  { id: 16, title: "Wedding Rings", category: "Wedding", image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1400" },
  { id: 17, title: "Soft Portrait", category: "Portrait", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1400" },
  { id: 18, title: "Mountain Air", category: "Nature", image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1400" },
  { id: 19, title: "Editorial Pose", category: "Fashion", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400" },
  { id: 20, title: "Night Lens", category: "Cinematic", image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1400" },
];

const topPhotos = photos.slice(0, 5);
const categories = ["All", "Wedding", "Portrait", "Nature", "Cinematic", "Fashion"];

const services = [
  "Wedding Shoots",
  "Portrait Sessions",
  "Fashion Editorials",
  "Outdoor Campaigns",
  "Cinematic Edits",
  "Event Coverage",
];

function MyPortfolioPage() {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("All");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [favorites, setFavorites] = useState([]);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === "All") return photos;
    return photos.filter((photo) => photo.category === activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % photos.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  const currentPhoto = photos[carouselIndex];

  const handleCarouselPrevious = () => {
    setCarouselIndex((current) => (current === 0 ? photos.length - 1 : current - 1));
  };

  const handleCarouselNext = () => {
    setCarouselIndex((current) => (current + 1) % photos.length);
  };

  const toggleFavorite = (photoId) => {
    setFavorites((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId]
    );
  };

  return (
    <main className="portfolio-page">
      <div className="portfolio-shell">
        <button
          type="button"
          className="portfolio-close-button"
          onClick={() => navigate("/dashboard")}
          aria-label="Close portfolio page"
          title="Close"
        >
          <CloseOutlined />
        </button>

        <div className="portfolio-switch">
          <button type="button" onClick={() => navigate("/profile")}>
            <UserOutlined />
            Profile
          </button>

          <button type="button" className="active">
            <FolderOpenOutlined />
            Portfolio
          </button>
        </div>

        <section className="portfolio-hero">
          <div className="portfolio-hero-text">
            <p className="portfolio-kicker">Photographer Portfolio</p>
            <h1>{photographer.name}</h1>
            <p>
              <CameraOutlined /> {photographer.role}
            </p>

            <div className="portfolio-contact-row">
              <span>
                <MailOutlined /> {photographer.email}
              </span>
              <span>
                <PhoneOutlined /> {photographer.phone}
              </span>
            </div>
          </div>

          <div className="portfolio-stats">
            <div>
              <strong>20</strong>
              <span>Gallery Photos</span>
            </div>
            <div>
              <strong>5</strong>
              <span>Premium Picks</span>
            </div>
            <div>
              <strong>{favorites.length}</strong>
              <span>Favorites</span>
            </div>
          </div>
        </section>

        <section className="portfolio-panel">
          <div className="portfolio-section-head">
            <div>
              <h2>Creative Services</h2>
              <p>Photography styles and professional coverage.</p>
            </div>
          </div>

          <div className="service-cloud">
            {services.map((service) => (
              <span key={service}>
                <ThunderboltOutlined />
                {service}
              </span>
            ))}
          </div>
        </section>

        <section className="portfolio-panel">
          <div className="portfolio-section-head">
            <div>
              <h2>Address Details</h2>
              <p>Studio and communication location.</p>
            </div>
          </div>

          <div className="portfolio-info-grid">
            <div>
              <span>Address</span>
              <strong>{photographer.address}</strong>
            </div>
            <div>
              <span>City</span>
              <strong>{photographer.city}</strong>
            </div>
            <div>
              <span>State</span>
              <strong>{photographer.state}</strong>
            </div>
            <div>
              <span>Country</span>
              <strong>{photographer.country}</strong>
            </div>
            <div>
              <span>Postal Code</span>
              <strong>{photographer.postalCode}</strong>
            </div>
          </div>
        </section>

        <section className="portfolio-panel premium-gallery">
          <div className="portfolio-section-head">
            <div>
              <h2>Top 5 Best Pictures</h2>
              <p>Featured premium photography highlights.</p>
            </div>
          </div>

          <div className="top-photo-grid">
            {topPhotos.map((photo, index) => (
              <button
                type="button"
                key={photo.id}
                className={index === 0 ? "top-photo-card featured" : "top-photo-card"}
                onClick={() => setPreviewPhoto(photo)}
              >
                <img src={photo.image} alt={photo.title} />
                <span>{photo.category}</span>
                <h3>{photo.title}</h3>
                <small>
                  <EyeOutlined /> Preview
                </small>
              </button>
            ))}
          </div>
        </section>

        <section className="portfolio-panel">
          <div className="portfolio-section-head">
            <div>
              <h2>Carousel Gallery</h2>
              <p>20-photo auto sliding showcase.</p>
            </div>

            <div className="carousel-actions">
              <button type="button" onClick={handleCarouselPrevious} aria-label="Previous photo">
                <LeftOutlined />
              </button>
              <button type="button" onClick={handleCarouselNext} aria-label="Next photo">
                <RightOutlined />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="carousel-frame"
            onClick={() => setPreviewPhoto(currentPhoto)}
          >
            <img src={currentPhoto.image} alt={currentPhoto.title} />
            <div>
              <span>{currentPhoto.category}</span>
              <h3>{currentPhoto.title}</h3>
            </div>
          </button>

          <div className="carousel-thumbs">
            {photos.map((photo, index) => (
              <button
                type="button"
                key={photo.id}
                className={carouselIndex === index ? "active" : ""}
                onClick={() => setCarouselIndex(index)}
                aria-label={photo.title}
              >
                <img src={photo.image} alt="" />
              </button>
            ))}
          </div>
        </section>

        <section className="portfolio-panel">
          <div className="portfolio-section-head">
            <div>
              <h2>Full Gallery</h2>
              <p>Filter, favorite, and preview portfolio pictures.</p>
            </div>

            <button
              type="button"
              className="view-mode-button"
              onClick={() => setViewMode(viewMode === "grid" ? "masonry" : "grid")}
            >
              <AppstoreOutlined />
              {viewMode === "grid" ? "Masonry" : "Grid"}
            </button>
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

          <div className={`gallery-grid ${viewMode === "masonry" ? "masonry" : ""}`}>
            {filteredPhotos.map((photo, index) => (
              <div className="gallery-card" key={photo.id}>
                <button type="button" onClick={() => setPreviewPhoto(photo)}>
                  <img src={photo.image} alt={photo.title} />
                  <div>
                    <span>{photo.category}</span>
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

                <small>#{index + 1}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="portfolio-panel about-last">
          <div className="portfolio-section-head">
            <div>
              <h2>About Photographer</h2>
              <p>Creative direction, style, and professional strengths.</p>
            </div>
          </div>

          <div className="portfolio-about">
            {aboutLines.map((line) => (
              <p key={line}>
                <CheckCircleOutlined />
                {line}
              </p>
            ))}
          </div>
        </section>

        <footer className="portfolio-footer">© axs</footer>
      </div>

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

export default MyPortfolioPage;