import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../config/constants';
import { useTheme } from '../../context/ThemeContext';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

// Custom icons
export function createTruckIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="truck-marker"><span class="material-symbols-outlined" style="font-size:18px;color:#0A0A0A;font-variation-settings:'FILL' 1">local_shipping</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function createFleetActiveIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="fleet-marker-active"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function createFleetIdleIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="fleet-marker-idle"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function createOriginIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:#FFD700;border-radius:50%;border:3px solid rgba(255,215,0,0.3);box-shadow:0 0 8px rgba(255,215,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function createDestinationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:#0047AB;border-radius:50%;border:3px solid rgba(0,71,171,0.3);box-shadow:0 0 8px rgba(0,71,171,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function createUserLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#4285F4;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(66,133,244,0.6);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers && markers.length >= 2) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function MapInstanceCapture({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) {
      if (typeof mapRef === 'function') mapRef(map);
      else mapRef.current = map;
    }
  }, [map, mapRef]);
  return null;
}

function LocateButton({ onLocate }) {
  const map = useMap();
  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 15);
        if (onLocate) onLocate({ lat: latitude, lng: longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 10, marginRight: 10 }}>
      <div className="leaflet-control">
        <button
          onClick={handleLocate}
          style={{
            width: 36, height: 36,
            background: 'var(--surface, #fff)',
            border: '1px solid var(--outline-variant, #ccc)',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
          title="Find my location"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#4285F4' }}>my_location</span>
        </button>
      </div>
    </div>
  );
}

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e);
    },
  });
  return null;
}

export default function MapView({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  markers = [],
  route = [],
  className = '',
  fitMarkers = false,
  showLocate = true,
  onClick,
  onExit,
  exitLabel = 'EXIT',
  mapRef,
  children,
}) {
  const { isDark } = useTheme();
  const [userLocation, setUserLocation] = useState(null);

  const tileUrl = isDark ? CARTO_DARK_TILES : OSM_TILES;
  const tileAttribution = isDark ? CARTO_ATTRIBUTION : OSM_ATTRIBUTION;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: '300px' }}
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer url={tileUrl} attribution={tileAttribution} updateWhenIdle={true} keepBuffer={2} />

      <MapInstanceCapture mapRef={mapRef} />
      {onClick && <MapClickHandler onClick={onClick} />}

      {fitMarkers && markers.length >= 2 && <FitBounds markers={markers} />}
      {!fitMarkers && center && <RecenterMap center={center} />}

      {markers.map((m, i) => (
        <Marker key={i} position={[m.lat, m.lng]} icon={m.icon || new L.Icon.Default()} />
      ))}

      {route.length >= 2 && (
        <Polyline
          positions={route}
          pathOptions={{ color: '#FFD700', weight: 3, opacity: 0.8, dashArray: '8, 12' }}
        />
      )}

      {showLocate && <LocateButton onLocate={setUserLocation} />}
      
      {onExit && (
        <div className="leaflet-top leaflet-left" style={{ marginTop: 10, marginLeft: 10 }}>
          <div className="leaflet-control">
            <button
              onClick={onExit}
              style={{
                padding: '10px 18px',
                background: '#EF4444',
                color: '#fff',
                border: 'none',
                borderRadius: 24,
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              {exitLabel}
            </button>
          </div>
        </div>
      )}

      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()} />
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={200}
            pathOptions={{ color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.1, weight: 1 }}
          />
        </>
      )}

      {children}
    </MapContainer>
  );
}
