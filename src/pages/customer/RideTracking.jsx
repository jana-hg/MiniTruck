import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';

import MapView, { createTruckIcon, createOriginIcon, createDestinationIcon } from '../../components/map/MapView';
import { bookings as bookingsApi, drivers as driversApi, geo } from '../../services/api';

export default function RideTracking() {
  const { id } = useParams();
  const { isDark } = useTheme();
  const [booking, setBooking] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(true);

  const C = {
    card: isDark ? '#18181B' : '#FFFFFF', border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A', sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8', accent: isDark ? '#FFD700' : '#3B82F6',
    accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    green: '#10B981',
  };
  const glass = { background: isDark ? 'rgba(9,9,11,0.88)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', border: `1px solid ${C.border}` };

  // Load booking data
  useEffect(() => {
    if (!id) { setLoading(false); return; }
    bookingsApi.getBooking(id).then(b => {
      if (b) {
        setBooking(b);
        // Fetch driver info
        if (b.driverId) {
          driversApi.getDriver(b.driverId).then(d => {
            setDriver(d);
            if (d?.location) setDriverLoc(d.location);
          }).catch(() => {});
        }
        // Fetch route geometry
        if (b.pickup?.lat && b.dropoff?.lat) {
          geo.getRoute(b.pickup.lat, b.pickup.lng, b.dropoff.lat, b.dropoff.lng)
            .then(data => {
              const coords = data.geometry?.coordinates?.map(c => [c[1], c[0]]) || [];
              setRouteCoords(coords);
            }).catch(() => {});
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // Poll driver location every 5 seconds
  useEffect(() => {
    if (!booking?.driverId) return;
    const poll = () => {
      driversApi.getDriver(booking.driverId).then(d => {
        if (d?.location) setDriverLoc(d.location);
      }).catch(() => {});
    };
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [booking?.driverId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: C.muted }}>
      <Icon name="progress_activity" size={32} />
    </div>
  );

  if (!booking) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 12 }}>
      <Icon name="error" size={40} style={{ color: C.muted }} />
      <div style={{ fontSize: 14, color: C.sub }}>Booking not found</div>
      <Link to="/bookings" style={{ textDecoration: 'none', fontSize: 13, fontWeight: 600, color: C.accent }}>Back to Bookings</Link>
    </div>
  );

  const pickup = booking.pickup || {};
  const dropoff = booking.dropoff || {};

  const markers = [
    ...(pickup.lat ? [{ lat: pickup.lat, lng: pickup.lng, icon: createOriginIcon() }] : []),
    ...(dropoff.lat ? [{ lat: dropoff.lat, lng: dropoff.lng, icon: createDestinationIcon() }] : []),
    ...(driverLoc ? [{ lat: driverLoc.lat, lng: driverLoc.lng, icon: createTruckIcon() }] : []),
  ];

  const mapCenter = driverLoc
    ? [driverLoc.lat, driverLoc.lng]
    : pickup.lat ? [pickup.lat, pickup.lng] : [19.076, 72.877];

  return (
    <div style={{ position: 'relative' }}>
      {/* Full screen map */}
      <div style={{ position: 'fixed', inset: 0, top: 'calc(56px + env(safe-area-inset-top))', zIndex: 0 }}>
        <MapView
          center={mapCenter}
          zoom={14}
          markers={markers}
          route={routeCoords}
          fitMarkers={markers.length >= 2}
          showLocate={false}
          className="w-full h-full"
        />
      </div>

      {/* Top Status Bar */}
      <div style={{ position: 'fixed', top: 'calc(56px + env(safe-area-inset-top))', left: 0, right: 0, zIndex: 10, ...glass }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link to="/bookings" style={{ textDecoration: 'none', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#27272A' : '#F1F5F9', color: C.sub, flexShrink: 0 }}>
            <Icon name="arrow_back" size={18} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Tracking</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{booking.id}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* Live indicator */}
            {driverLoc && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: C.green, animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>LIVE</span>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.accent }}>₹{booking.fare?.total?.toFixed(0) || '0'}</div>
              <div style={{ fontSize: 7, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Fare</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div style={{ position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom))', left: 0, right: 0, zIndex: 10, ...glass, borderRadius: '18px 18px 0 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 16px' }}>

          {/* Route summary */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: 10, background: '#FFD700', boxShadow: '0 0 0 3px rgba(255,215,0,0.2)' }} />
              <div style={{ width: 2, height: 18, background: `linear-gradient(to bottom, #FFD70088, #0047AB88)`, borderRadius: 1 }} />
              <div style={{ width: 10, height: 10, borderRadius: 10, background: '#0047AB', boxShadow: '0 0 0 3px rgba(0,71,171,0.2)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pickup.address || 'Pickup'}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 8 }}>{dropoff.address || 'Dropoff'}</div>
            </div>
          </div>

          {/* Driver info */}
          {driver && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                <Icon name="person" filled size={22} style={{ color: C.accent }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{driver.name || 'Driver'}</span>
                  {driver.rating > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: C.accentBg, padding: '2px 6px', borderRadius: 4 }}>{driver.rating} ★</span>}
                  {driver.documentVerification?.rc?.verified && driver.documentVerification?.profilePhoto?.verified && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#065F46', background: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5', padding: '2px 6px', borderRadius: 4 }}>✅ Verified</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {driver.documentVerification?.rc?.verified && driver.documentVerification?.profilePhoto?.verified && (
                    <span>✅ Identity verified · </span>
                  )}
                  {driver.truckId || '--'} · {driver.stats?.totalTrips || 0} trips
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => window.open('tel:+911234567890', '_self')} style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: C.accentBg, border: `1px solid ${C.border}`, color: C.accent }}>
                  <Icon name="call" filled size={18} />
                </button>
              </div>
            </div>
          )}

          {/* No driver assigned yet */}
          {!driver && booking.status === 'confirmed' && (
            <div style={{ paddingTop: 12, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: C.muted }}>Waiting for driver assignment...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
