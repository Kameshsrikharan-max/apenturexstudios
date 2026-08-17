import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { CloseOutlined, EnvironmentOutlined, SearchOutlined, AimOutlined } from "@ant-design/icons";
import "./LocationPickerModal.css";


declare global {
  interface Window {
    L: any;
  }
}

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]; 

let leafletLoadPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve();
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("lpm-leaflet-css")) {
      const link = document.createElement("link");
      link.id = "lpm-leaflet-css";
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById("lpm-leaflet-js") as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Leaflet failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.id = "lpm-leaflet-js";
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });

  return leafletLoadPromise;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerModalProps {
  initialLocation: LocationData | null;
  onClose: () => void;
  onSave: (location: LocationData) => void;
}

export default function LocationPickerModal({
  initialLocation,
  onClose,
  onSave,
}: LocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [picked, setPicked] = useState<LocationData | null>(initialLocation);

  const [searchQuery, setSearchQuery] = useState(initialLocation?.address || "");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);


  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  
  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then(() => {
        if (cancelled || !mapContainerRef.current || mapRef.current) return;
        const L = window.L;

        const start: [number, number] = initialLocation
          ? [initialLocation.lat, initialLocation.lng]
          : DEFAULT_CENTER;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
        }).setView(start, initialLocation ? 16 : 5);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker(start, { draggable: true }).addTo(map);
        if (!initialLocation) marker.setOpacity(0);

        const commitPoint = (lat: number, lng: number, address?: string) => {
          marker.setLatLng([lat, lng]);
          marker.setOpacity(1);
          setPicked(current => ({ lat, lng, address: address ?? current?.address }));
        };

        map.on("click", (event: any) => {
          commitPoint(event.latlng.lat, event.latlng.lng);
          setSearchQuery("");
        });

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          commitPoint(pos.lat, pos.lng);
          setSearchQuery("");
        });

        mapRef.current = map;
        markerRef.current = marker;

      
        setTimeout(() => map.invalidateSize(), 120);
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  
  }, []);

  const flyTo = (lat: number, lng: number, address?: string) => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setOpacity(1);
      mapRef.current.setView([lat, lng], 16);
    }
    setPicked({ lat, lng, address });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      position => {
        flyTo(position.coords.latitude, position.coords.longitude);
        setSearchQuery("");
      },
      () => {
        
      }
    );
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data: NominatimResult[] = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error(error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const chooseResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    flyTo(lat, lng, result.display_name);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  const confirmSave = () => {
    if (picked) onSave(picked);
  };

  return ReactDOM.createPortal(
    <div className="lpm-overlay" onMouseDown={onClose}>
      <div className="lpm-panel" onMouseDown={event => event.stopPropagation()}>
        <header className="lpm-head">
          <span className="lpm-head-title">
            <EnvironmentOutlined /> Pin Venue Location
          </span>
          <button type="button" className="lpm-close" onClick={onClose} aria-label="Close">
            <CloseOutlined />
          </button>
        </header>

        <div className="lpm-search" ref={searchBoxRef}>
          <div className="lpm-search-input">
            <SearchOutlined />
            <input
              placeholder="Search for a place or address..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runSearch();
                }
              }}
            />
            <button type="button" onClick={runSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="lpm-results">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.lat}-${result.lon}-${index}`}
                  type="button"
                  className="lpm-result"
                  onClick={() => chooseResult(result)}
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lpm-map-wrap">
          <div ref={mapContainerRef} className="lpm-map" />
          {!mapReady && !mapError && <div className="lpm-map-status">Loading map...</div>}
          {mapError && (
            <div className="lpm-map-status lpm-map-error">
              Couldn't load the map. Check your connection and try again.
            </div>
          )}
          {mapReady && <div className="lpm-hint">Click anywhere on the map, or drag the pin</div>}
        </div>

        <footer className="lpm-footer">
          <button type="button" className="lpm-my-loc" onClick={useMyLocation}>
            <AimOutlined /> Use My Location
          </button>

          <div className="lpm-coords">
            {picked ? (
              <>
                <strong>{picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}</strong>
                {picked.address && <span>{picked.address}</span>}
              </>
            ) : (
              <span className="lpm-coords-empty">No location pinned yet</span>
            )}
          </div>

          <div className="lpm-actions">
            <button type="button" className="lpm-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="lpm-confirm" disabled={!picked} onClick={confirmSave}>
              Save Location
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}