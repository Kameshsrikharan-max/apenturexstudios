import { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Tooltip } from "antd";
import "./MediaLibraryPage.css";

import {PictureOutlined,VideoCameraOutlined,FolderOpenOutlined,SearchOutlined,FilterOutlined,HeartOutlined,HeartFilled,DeleteOutlined,UploadOutlined,AppstoreOutlined,BarsOutlined,CloseOutlined,LeftOutlined,RightOutlined,EditOutlined,PlusOutlined,ZoomInOutlined,ZoomOutOutlined,ReloadOutlined,CompassOutlined,StarOutlined} from "@ant-design/icons";
import ConfirmDeleteButton from "../../../components/common/DeleteButton";

type MediaItem = {
  id: number;
  type: "photo" | "video";
  title: string;
  url: string;
  liked: boolean;
  albumId: number | null;
};

type Album = { id: number; title: string };

const initialMedia: MediaItem[] = [
  {
    id: 1,
    type: "photo",
    title: "Wedding Shot 1",
    url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
    liked: false,
    albumId: null,
  },
  {
    id: 2,
    type: "photo",
    title: "Studio Portrait",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    liked: true,
    albumId: null,
  },
  {
    id: 3,
    type: "video",
    title: "Behind Scenes",
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    liked: false,
    albumId: null,
  },
];

const initialAlbums: Album[] = [
  { id: 101, title: "Summer Vacation" },
  { id: 102, title: "Client Shoots" },
];

export default function MediaLibraryPage() {

  const [mediaList, setMediaList] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem("persistent_media");
    return saved ? JSON.parse(saved) : initialMedia;
  });

  const [albums, setAlbums] = useState<Album[]>(() => {
    const saved = localStorage.getItem("persistent_albums");
    return saved ? JSON.parse(saved) : initialAlbums;
  });


  const [activeFolder, setActiveFolder] = useState("all");
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [filterLikedOnly, setFilterLikedOnly] = useState(false);


  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isRenameMode, setIsRenameMode] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isNavigating, setIsNavigating] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // ---- Smooth height / cross-fade transition for the content region ----
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
  const [contentFading, setContentFading] = useState(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem("persistent_media", JSON.stringify(mediaList));
  }, [mediaList]);

  useEffect(() => {
    localStorage.setItem("persistent_albums", JSON.stringify(albums));
  }, [albums]);

  // Freeze current height right before the tab/album/view actually changes,
  // then measure the new content and animate smoothly toward it.
  useLayoutEffect(() => {
    const node = contentWrapperRef.current;
    if (!node) return;

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);

    const targetHeight = node.scrollHeight;

    const raf = requestAnimationFrame(() => {
      setContainerHeight(targetHeight);
    });

    fadeTimerRef.current = setTimeout(() => setContentFading(false), 40);
    unlockTimerRef.current = setTimeout(() => setContainerHeight(undefined), 420);

    return () => {
      cancelAnimationFrame(raf);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolder, selectedAlbumId, viewMode, mediaList, albums, search, filterLikedOnly]);

  const switchFolder = (key: string) => {
    if (key === activeFolder) return;
    const node = contentWrapperRef.current;
    if (node) setContainerHeight(node.offsetHeight);
    setContentFading(true);
    setActiveFolder(key);
    setSelectedAlbumId(null);
  };

  const openAlbumFolder = (id: number) => {
    const node = contentWrapperRef.current;
    if (node) setContainerHeight(node.offsetHeight);
    setContentFading(true);
    setSelectedAlbumId(id);
  };

  const backToAlbums = () => {
    const node = contentWrapperRef.current;
    if (node) setContainerHeight(node.offsetHeight);
    setContentFading(true);
    setSelectedAlbumId(null);
  };

  const switchViewMode = (mode: string) => {
    if (mode === viewMode) return;
    const node = contentWrapperRef.current;
    if (node) setContainerHeight(node.offsetHeight);
    setContentFading(true);
    setViewMode(mode);
  };

  
  const counts = useMemo(() => {
    return {
      photos: mediaList.filter((m) => m.type === "photo").length,
      videos: mediaList.filter((m) => m.type === "video").length,
      albums: albums.length,
      favorites: mediaList.filter((m) => m.liked).length,
    };
  }, [mediaList, albums]);

  const folderTabs = [
    { key: "all", label: "All Media", icon: <FolderOpenOutlined />, info: `${counts.photos}P · ${counts.videos}V` },
    { key: "photo", label: "Photos", icon: <PictureOutlined />, info: `${counts.photos} photos` },
    { key: "video", label: "Videos", icon: <VideoCameraOutlined />, info: `${counts.videos} videos` },
    { key: "album", label: "Albums", icon: <CompassOutlined />, info: `${counts.albums} albums` },
  ];

  
  const displayedMedia = useMemo(() => {
    return mediaList.filter((item) => {
      if (activeFolder === "photo" && item.type !== "photo") return false;
      if (activeFolder === "video" && item.type !== "video") return false;
      if (activeFolder === "album") {
        if (!selectedAlbumId) return false;
        if (item.albumId !== selectedAlbumId) return false;
      }
      if (filterLikedOnly && !item.liked) return false;
      return item.title.toLowerCase().includes(search.toLowerCase());
    });
  }, [mediaList, activeFolder, selectedAlbumId, search, filterLikedOnly]);

  
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file: File) => {
      const fileType: "photo" | "video" = file.type.startsWith("video/") ? "video" : "photo";

      if (activeFolder === "photo" && fileType !== "photo") {
        alert("Please upload image files only while inside the Photos tab view.");
        return;
      }
      if (activeFolder === "video" && fileType !== "video") {
        alert("Please upload video files only while inside the Videos tab view.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: MediaItem = {
          id: Date.now() + Math.random(),
          type: fileType,
          title: file.name.split(".").slice(0, -1).join(".") || "Untitled Resource",
          url: reader.result as string,
          liked: false,
          albumId: activeFolder === "album" ? selectedAlbumId : null,
        };
        setMediaList((prev) => [newItem, ...prev]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const createAlbum = () => {
    const name = prompt("Enter new album title name:");
    if (!name || !name.trim()) return;
    setAlbums((prev) => [...prev, { id: Date.now(), title: name.trim() }]);
  };

  const deleteAlbum = (id: number) => {
    setAlbums((prev) => prev.filter((a) => a.id !== id));
    setMediaList((prev) =>
      prev.map((item) => (item.albumId === id ? { ...item, albumId: null } : item))
    );
    if (selectedAlbumId === id) setSelectedAlbumId(null);
  };

  const toggleLike = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMediaList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, liked: !item.liked } : item))
    );
  };

  const deleteMediaItem = (id: number) => {
    setMediaList((prev) => prev.filter((item) => item.id !== id));
    setPreviewIndex(null);
    setIsRenameMode(false);
  };

  const saveRename = (id: number) => {
    if (!renameTitle.trim()) return;
    setMediaList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: renameTitle.trim() } : item))
    );
    setIsRenameMode(false);
  };

  
  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setRenameTitle(displayedMedia[index].title);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsRenameMode(false);
  };

  const navigatePreview = (direction: number) => {
    setIsNavigating(direction > 0 ? "right" : "left");
    setTimeout(() => {
      let nextIndex = (previewIndex ?? 0) + direction;
      if (nextIndex < 0) nextIndex = displayedMedia.length - 1;
      if (nextIndex >= displayedMedia.length) nextIndex = 0;
      setPreviewIndex(nextIndex);
      setRenameTitle(displayedMedia[nextIndex].title);
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
      setIsRenameMode(false);
      setIsNavigating(null);
    }, 200); 
  };

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.35, 4));
  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.35, 0.5);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleZoomReset = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentPreviewItem = previewIndex !== null ? displayedMedia[previewIndex] : null;

  const previewModal = currentPreviewItem ? (
    <div className="media-modal-backdrop" onClick={() => setPreviewIndex(null)}>
      
      <div 
        className="holographic-glow-backdrop"
        style={{ 
          backgroundImage: currentPreviewItem.type === "photo" ? `url(${currentPreviewItem.url})` : "none",
          backgroundColor: currentPreviewItem.type === "video" ? "#101223" : "transparent"
        }}
      ></div>

      <div className="media-modal-window" onClick={(e) => e.stopPropagation()}>
        
        
        <div className="modal-top-header-bar">
          <div className="modal-header-left-group">
            {isRenameMode ? (
              <div className="modal-rename-inline-row">
                <input
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="modal-rename-input"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveRename(currentPreviewItem.id)}
                />
                <button className="modal-rename-save-btn" onClick={() => saveRename(currentPreviewItem.id)}>
                  Save
                </button>
                <button className="modal-rename-cancel-btn" onClick={() => setIsRenameMode(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="modal-title-display-line">
                <h3 className="modal-media-title">{currentPreviewItem.title}</h3>
                <button className="modal-inline-edit-trigger" onClick={() => setIsRenameMode(true)}>
                  <EditOutlined /> Rename
                </button>
                <span className="modal-media-badge">{currentPreviewItem.type.toUpperCase()} </span>
                
                <button 
                  className={`modal-inline-like-btn ${currentPreviewItem.liked ? "liked-active" : ""}`}
                  onClick={(e) => toggleLike(currentPreviewItem.id, e)}
                >
                  {currentPreviewItem.liked ? <HeartFilled /> : <HeartOutlined />}
                </button>
                <ConfirmDeleteButton
                  mode="popover"
                  itemName={currentPreviewItem.title}
                  icon={<DeleteOutlined />}
                  iconOnly={false}
                  label="Delete"
                  className="modal-inline-delete-btn"
                  onDelete={() => deleteMediaItem(currentPreviewItem.id)}
                />
              </div>
            )}
          </div>

          <div className="modal-header-right-group">
            <button className="modal-top-close-trigger" onClick={() => setPreviewIndex(null)}>
              <CloseOutlined />
            </button>
          </div>
        </div>

        
        <button className="modal-nav-arrow arrow-left-slide" onClick={() => navigatePreview(-1)}>
          <LeftOutlined />
        </button>
        <button className="modal-nav-arrow arrow-right-slide" onClick={() => navigatePreview(1)}>
          <RightOutlined />
        </button>

        
        <div className="modal-content-container-full">
          <div 
            className={`modal-media-viewport-center ${isNavigating ? `navigating-${isNavigating}` : ""}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: zoomScale > 1 ? "grab" : "default" }}
          >
            <div 
              className="zoom-transform-container-fluid" 
              style={{ 
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)"
              }}
            >
              {currentPreviewItem.type === "video" ? (
                <video src={currentPreviewItem.url} controls autoPlay className="modal-main-element-fluid" />
              ) : (
                <img src={currentPreviewItem.url} alt={currentPreviewItem.title} className="modal-main-element-fluid" draggable="false" />
              )}
            </div>
          </div>

      
          {currentPreviewItem.type === "photo" && (
            <div className="modal-bottom-zoom-cockpit">
              <button onClick={handleZoomOut} className="cockpit-btn" title="De-escalate Scale">
                <ZoomOutOutlined />
              </button>
              <div className="scale-indicator-readout" onClick={handleZoomReset}>
                {Math.round(zoomScale * 100)}%
              </div>
              <button onClick={handleZoomIn} className="cockpit-btn" title="Escalate Scale">
                <ZoomInOutlined />
              </button>
              {zoomScale !== 1 && (
                <button onClick={handleZoomReset} className="cockpit-reset-btn" title="Recalibrate Layer">
                  <ReloadOutlined /> Reset
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  ) : null;

  return (
    <div className="media-page animate-fade-in">
      
      <div className="glow-blob blob-1"></div>
      <div className="glow-blob blob-2"></div>

      
      <div className="media-header">
        <div className="brand-stack">
          <h2>Media <span className="neon-accent">Library</span></h2>
          <p>Organize, manage, and access your studio photos and videos in one place.</p>
        </div>

        <div className="media-controls-top">
          <div className="media-search glow-focus">
            <SearchOutlined className="search-icon" />
            <input
              placeholder="Search media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Tooltip title={filterLikedOnly ? "Show all media" : "Show favorites only"}>
            <button 
              className={`fav-toggle-pill ${filterLikedOnly ? "active" : ""}`}
              onClick={() => setFilterLikedOnly(!filterLikedOnly)}
            >
              {filterLikedOnly ? <HeartFilled /> : <HeartOutlined />}
              <span> ({counts.favorites})</span>
            </button>
          </Tooltip>

          <Tooltip title="Upload media">
            <label className="upload-btn dynamic-button">
              <UploadOutlined className="bounce-loop" /> 
              <input
                type="file"
                multiple
                accept={
                  activeFolder === "photo"
                    ? "image/*"
                    : activeFolder === "video"
                    ? "video/*"
                    : "image/*,video/*"
                }
                onChange={handleUpload}
                style={{ display: "none" }}
              />
            </label>
          </Tooltip>
        </div>
      </div>

      
      <div className="media-folders-switchboard">
        {folderTabs.map((folder) => (
          <div
            key={folder.key}
            className={`folder-pill ${activeFolder === folder.key ? "active" : ""}`}
            onClick={() => switchFolder(folder.key)}
          >
            <span className="pill-icon">{folder.icon}</span>
            <span className="pill-label">{folder.label}</span>
            <span className="pill-badge">{folder.info}</span>
          </div>
        ))}
      </div>

      
      <div
        className="content-height-wrapper"
        style={{ height: containerHeight !== undefined ? `${containerHeight}px` : "auto" }}
      >
        <div ref={contentWrapperRef} className={`content-fade-inner ${contentFading ? "fading" : ""}`}>

          {activeFolder === "album" && !selectedAlbumId && (
            <div className="album-directory-wrapper">
              <div className="album-action-bar">
                <h3>Folders</h3>
                <button className="create-album-btn" onClick={createAlbum}>
                  <PlusOutlined /> Create New Album
                </button>
              </div>
              {albums.length === 0 ? (
                <div className="empty-state-notice custom-dash"></div>
              ) : (
                <div className="albums-grid">
                  {albums.map((alb, index) => {
                    const albumItemsCount = mediaList.filter((m) => m.albumId === alb.id).length;
                    return (
                      <div
                        key={alb.id}
                        className="album-folder-card"
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => openAlbumFolder(alb.id)}
                      >
                        <div className="folder-graphic-stack">
                          <div className="folder-back-plate"></div>
                          <FolderOpenOutlined className="large-folder-icon" />
                        </div>
                        <h4>{alb.title}</h4>
                        <span className="items-badge">{albumItemsCount} items</span>
                        <ConfirmDeleteButton
                          mode="popover"
                          itemName={alb.title}
                          icon={<DeleteOutlined />}
                          className="album-card-delete"
                          onDelete={() => deleteAlbum(alb.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          
          {!(activeFolder === "album" && !selectedAlbumId) && (
            <div className="media-filter-bar">
              <div className="filter-left">
                <FilterOutlined className="pulse-icon" />
                <span>
                  {activeFolder === "album" ? "Active Spatial Matrix" : `Total ${displayedMedia.length} items`}
                  {selectedAlbumId && ` indexed inside "${albums.find((a) => a.id === selectedAlbumId)?.title}"`}
                </span>
                {selectedAlbumId && (
                  <button className="back-to-albums-link" onClick={backToAlbums}>
                    ← Back to Albums
                  </button>
                )}
              </div>

              <div className="view-toggle-buttons">
                <Tooltip title="Grid view">
                  <button
                    className={viewMode === "grid" ? "active-toggle" : ""}
                    onClick={() => switchViewMode("grid")}
                  >
                    <AppstoreOutlined />
                  </button>
                </Tooltip>
                <Tooltip title="List view">
                  <button
                    className={viewMode === "list" ? "active-toggle" : ""}
                    onClick={() => switchViewMode("list")}
                  >
                    <BarsOutlined />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          
          {!(activeFolder === "album" && !selectedAlbumId) && (
            <>
              {displayedMedia.length === 0 ? (
                <div className="empty-state-notice custom-dash entrance-shimmer">
              
                </div>
              ) : (
                <div className={`media-layout-${viewMode} streams-container`}>
                  {displayedMedia.map((item, idx) => (
                    <div 
                      key={item.id} 
                      className="media-card sequential-node" 
                      style={{ "--node-index": idx } as React.CSSProperties}
                      onClick={() => openPreview(idx)}
                    >
                      <div className="media-image-wrapper">
                        {item.type === "video" ? (
                          <video src={item.url} muted playsInline className="media-element-thumb" />
                        ) : (
                          <img src={item.url} alt={item.title} className="media-element-thumb" loading="lazy" />
                        )}
                        
                        <div className={`media-overlay-tag ${item.type}`}>
                          {item.type === "video" ? "▶ Video" : "📷 Photo"}
                        </div>

                        <div className="media-thumb-actions-drawer">
                          <button className="action-drawer-btn heart-action" onClick={(e) => toggleLike(item.id, e)}>
                            {item.liked ? <HeartFilled style={{ color: "#ff2e63" }} /> : <HeartOutlined />}
                          </button>
                          <ConfirmDeleteButton
                            mode="popover"
                            itemName={item.title}
                            icon={<DeleteOutlined />}
                            className="action-drawer-btn delete-action"
                            onDelete={() => deleteMediaItem(item.id)}
                          />
                        </div>
                      </div>

                      <div className="media-info-deck">
                        <div className="media-title-line">
                          <h4>{item.title}</h4>
                          {item.liked && <StarOutlined className="neon-star" />}
                        </div>
                        <div className="meta-footer">
                          
                          <span className="media-type-label">{item.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {typeof document !== "undefined" && currentPreviewItem
        ? createPortal(previewModal, document.body)
        : null}
    </div>
  );
}