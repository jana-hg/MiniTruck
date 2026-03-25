import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';

import MapView, { createTruckIcon, createOriginIcon, createDestinationIcon } from '../../components/map/MapView';
import { bookings as bookingsApi } from '../../services/api';

const MOCK = {
  id: 'BK-4829A', status: 'in-transit',
  origin: { name: 'Warehouse District 7', lat: 19.076, lng: 72.877 },
  destination: { name: 'Port Authority Complex', lat: 19.025, lng: 73.015 },
  truck: { lat: 19.055, lng: 72.940 },
  eta: '42 MIN', distance: '8.3 KM', currentLocation: 'Eastern Express Highway',
  driver: { name: 'Vikram Singh', rating: 4.9, truckId: 'MH-04-AB-1234', trips: 1247 },
  freight: 'Industrial Equipment',
};

export default function RideTracking() {
  const { id } = useParams();
  const { isDark } = useTheme();
  const [tracking, setTracking] = useState(MOCK);
  const [truckPos, setTruckPos] = useState(MOCK.truck);
  const esRef = useRef(null);

  const C = { card: isDark ? '#18181B' : '#FFFFFF', border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A', sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8', accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF' };
  const glass = { background: isDark ? 'rgba(9,9,11,0.85)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', border: `1px solid ${C.border}` };

  useEffect(() => { if (id && id !== 'demo') bookingsApi.getBooking(id).then(d => d && setTracking(p => ({ ...p, ...d }))).catch(() => {}); }, [id]);

  useEffect(() => {
    try {
      const es = new EventSource(`/api/bookings/${id || tracking.id}/track`);
      esRef.current = es;
      es.onmessage = (e) => { try { const d = JSON.parse(e.data); if (d.lat && d.lng) setTruckPos({ lat: d.lat, lng: d.lng }); } catch {} };
      es.onerror = () => es.close();
    } catch {}
    return () => { if (esRef.current) esRef.current.close(); };
  }, [id, tracking.id]);

  useEffect(() => {
    const iv = setInterval(() => setTruckPos(p => ({ lat: p.lat + (Math.random() - 0.4) * 0.002, lng: p.lng + (Math.random() - 0.3) * 0.003 })), 3000);
    return () => clearInterval(iv);
  }, []);

  const markers = [
    { lat: tracking.origin.lat, lng: tracking.origin.lng, icon: createOriginIcon() },
    { lat: tracking.destination.lat, lng: tracking.destination.lng, icon: createDestinationIcon() },
    { lat: truckPos.lat, lng: truckPos.lng, icon: createTruckIcon() },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Full screen map */}
      <div style={{ position: 'fixed', inset: 0, top: 52, zIndex: 0 }}>
        <MapView center={[truckPos.lat, truckPos.lng]} zoom={13} markers={markers}
          route={[[tracking.origin.lat, tracking.origin.lng], [truckPos.lat, truckPos.lng], [tracking.destination.lat, tracking.destination.lng]]}
          className="w-full h-full" />
      </div>

      {/* Top Status Bar */}
      <div style={{ position: 'fixed', top: 52, left: 0, right: 0, zIndex: 10, ...glass }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Location</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tracking.currentLocation}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{tracking.eta}</div>
              <div style={{ fontSize: 7, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>ETA</div>
            </div>
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{tracking.distance}</div>
              <div style={{ fontSize: 7, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Left</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Driver Card */}
      <div style={{ position: 'fixed', bottom: 68, left: 0, right: 0, zIndex: 10, ...glass }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg, border: `1px solid ${C.border}`, flexShrink: 0 }}>
            <Icon name="person" filled size={24} style={{ color: C.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{tracking.driver.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: C.accentBg, padding: '2px 6px', borderRadius: 4 }}>{tracking.driver.rating} ★</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{tracking.driver.truckId} · {tracking.driver.trips} trips</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: C.accentBg, border: `1px solid ${C.border}`, color: C.accent }}>
              <Icon name="call" filled size={18} />
            </button>
            <button style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: isDark ? '#27272A' : '#F1F5F9', border: `1px solid ${C.border}`, color: C.sub }}>
              <Icon name="chat" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
