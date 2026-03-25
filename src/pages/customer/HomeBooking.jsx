import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TRUCK_TYPES, HANDLING_PROFILES, ETA_PRIORITIES } from '../../config/constants';
import { bookings as bookingsApi, geo, pricing as pricingApi } from '../../services/api';
import Icon from '../../components/ui/Icon';
import MapView from '../../components/map/MapView';

const LOAD_TYPES = ['General', 'Fragile', 'Perishable', 'Electronics', 'Furniture', 'Machinery'];
const SIZES = ['small', 'medium', 'large'];

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

export default function HomeBooking() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupResults, setPickupResults] = useState([]);
  const [dropoffResults, setDropoffResults] = useState([]);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [loadType, setLoadType] = useState('General');
  const [weight, setWeight] = useState('');
  const [size, setSize] = useState('medium');
  const [description, setDescription] = useState('');
  const [handling, setHandling] = useState('standard');
  const [truckType, setTruckType] = useState('small');
  const [priority, setPriority] = useState('standard');
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [booking, setBooking] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapPicker, setMapPicker] = useState(null); // null | 'pickup' | 'dropoff'
  const [mapPickerCenter, setMapPickerCenter] = useState([19.076, 72.877]);

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9', card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06)',
    inputBg: isDark ? '#09090B' : '#FFFFFF',
  };

  const dPickup = useDebounce(pickupQuery, 500);
  const dDropoff = useDebounce(dropoffQuery, 500);

  useEffect(() => { if (dPickup.length > 2 && !pickup) geo.geocode(dPickup).then(setPickupResults).catch(() => {}); else setPickupResults([]); }, [dPickup]);
  useEffect(() => { if (dDropoff.length > 2 && !dropoff) geo.geocode(dDropoff).then(setDropoffResults).catch(() => {}); else setDropoffResults([]); }, [dDropoff]);
  useEffect(() => { if (pickup && dropoff) { geo.getRoute(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng).then(setRouteData).catch(() => {}); setShowMap(true); } }, [pickup, dropoff]);
  useEffect(() => { if (pickup && dropoff && routeData) pricingApi.estimate({ truckType, distanceKm: routeData.distanceKm, loadType: handling, weight: weight || 0, priority, discountCode }).then(setEstimate).catch(() => {}); }, [truckType, routeData, handling, weight, priority, discountCode]);

  const selectLocation = (r, type) => {
    const loc = { address: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    const short = r.display_name.split(',').slice(0, 2).join(',');
    if (type === 'pickup') { setPickup(loc); setPickupQuery(short); setPickupResults([]); }
    else { setDropoff(loc); setDropoffQuery(short); setDropoffResults([]); }
  };

  const handleBook = () => {
    if (!pickup || !dropoff) return;
    setBooking(true);
    bookingsApi.createBooking({
      userId: user?.id, truckType, pickup, dropoff,
      cargo: { type: loadType, description, weight: `${weight || 0} KG`, handling, loadType, size },
      priority, fare: estimate ? { base: estimate.baseFare, distance: estimate.distanceCharge, surcharge: estimate.weightSurcharge + estimate.handlingSurcharge, total: estimate.total } : { total: 0 },
      scheduledTime: scheduleType === 'schedule' ? `${scheduleDate}T${scheduleTime}` : null,
    }).then(b => navigate(`/payment?bookingId=${b.id}&amount=${estimate?.total || 0}`))
      .catch(() => setBooking(false));
  };

  // Handle map tap to select location
  const handleMapSelect = async (lat, lng) => {
    if (!mapPicker) return;
    const loc = { lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    // Try reverse geocode
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'User-Agent': 'MiniTruck/1.0' } });
      const data = await res.json();
      if (data.display_name) loc.address = data.display_name;
    } catch {}
    const short = loc.address.split(',').slice(0, 2).join(',');
    if (mapPicker === 'pickup') { setPickup(loc); setPickupQuery(short); }
    else { setDropoff(loc); setDropoffQuery(short); }
    setMapPicker(null);
  };

  const markers = [];
  if (pickup) markers.push({ lat: pickup.lat, lng: pickup.lng, label: 'Pickup' });
  if (dropoff) markers.push({ lat: dropoff.lat, lng: dropoff.lng, label: 'Drop' });

  const inp = { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 };
  const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, boxShadow: C.shadow };
  const dropStyle = { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' };
  const dropBtn = { width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, color: C.text, background: 'transparent', border: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', borderBottom: `1px solid ${C.border}` };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '16px 0 100px', width: '100%', boxSizing: 'border-box' }}>
      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Logistics</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Book Your Truck</div>
      </div>

      {/* ── Route ── */}
      <div style={{ ...box, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
            <Icon name="route" size={14} style={{ color: C.accent }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Route</span>
        </div>
        {/* Pickup */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#10B981', flexShrink: 0 }} />
            <input placeholder="Pickup location..." value={pickupQuery} onChange={e => { setPickupQuery(e.target.value); setPickup(null); setShowMap(false); }} style={{ ...inp, flex: 1, paddingLeft: 0, border: 'none', borderBottom: `1px solid ${C.border}`, borderRadius: 0 }} />
            <button onClick={() => { setMapPicker('pickup'); setMapPickerCenter(pickup ? [pickup.lat, pickup.lng] : [19.076, 72.877]); }}
              style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1px solid ${C.border}`, background: C.accentBg, color: C.accent, flexShrink: 0 }}>
              <Icon name="map" size={16} />
            </button>
          </div>
          {pickupResults.length > 0 && <div style={dropStyle}>{pickupResults.map((r, i) => <button key={i} onClick={() => selectLocation(r, 'pickup')} style={dropBtn}>{r.display_name}</button>)}</div>}
        </div>
        {/* Dropoff */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#3B82F6', flexShrink: 0 }} />
            <input placeholder="Drop-off location..." value={dropoffQuery} onChange={e => { setDropoffQuery(e.target.value); setDropoff(null); setShowMap(false); }} style={{ ...inp, flex: 1, paddingLeft: 0, border: 'none', borderBottom: `1px solid ${C.border}`, borderRadius: 0 }} />
            <button onClick={() => { setMapPicker('dropoff'); setMapPickerCenter(dropoff ? [dropoff.lat, dropoff.lng] : pickup ? [pickup.lat, pickup.lng] : [19.076, 72.877]); }}
              style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1px solid ${C.border}`, background: C.accentBg, color: C.accent, flexShrink: 0 }}>
              <Icon name="map" size={16} />
            </button>
          </div>
          {dropoffResults.length > 0 && <div style={dropStyle}>{dropoffResults.map((r, i) => <button key={i} onClick={() => selectLocation(r, 'dropoff')} style={dropBtn}>{r.display_name}</button>)}</div>}
        </div>
        {/* Route info */}
        {routeData && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12, color: C.sub, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: C.accentBg }}>
              <Icon name="straighten" size={14} style={{ color: C.accent }} />{routeData.distanceKm} km
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: C.accentBg }}>
              <Icon name="schedule" size={14} style={{ color: C.accent }} />{routeData.durationMin} min
            </span>
          </div>
        )}
      </div>

      {/* ── Map (only when both locations selected) ── */}
      {showMap && pickup && dropoff && (
        <div style={{ ...box, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ height: 220 }}>
            <MapView center={[pickup.lat, pickup.lng]} zoom={5} markers={markers}
              routeCoords={routeData?.geometry?.coordinates?.map(c => [c[1], c[0]])}
              origin={[pickup.lat, pickup.lng]} destination={[dropoff.lat, dropoff.lng]}
              className="w-full h-full" />
          </div>
          <button onClick={() => setShowMap(false)} style={{ width: '100%', padding: '8px 0', background: 'transparent', border: 'none', borderTop: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon name="close" size={14} /> Hide Map
          </button>
        </div>
      )}

      {/* ── Select Truck ── */}
      <div style={{ ...box, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
            <Icon name="local_shipping" size={14} style={{ color: C.accent }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Select Truck</span>
        </div>
        {TRUCK_TYPES.map(t => (
          <button key={t.id} onClick={() => setTruckType(t.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 12, marginBottom: 8,
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            background: truckType === t.id ? C.accentBg : 'transparent',
            border: truckType === t.id ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: truckType === t.id ? `${C.accent}20` : (isDark ? '#27272A' : '#F1F5F9'), flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1", color: truckType === t.id ? C.accent : C.muted }}>{t.icon}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{t.capacity}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>₹{t.baseRate}</div>
              <div style={{ fontSize: 10, color: C.muted }}>+₹{t.perKm}/km</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Load Details ── */}
      <div style={{ ...box, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
            <Icon name="inventory_2" size={14} style={{ color: C.accent }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Load Details</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <div><div style={lbl}>Load Type</div><select value={loadType} onChange={e => setLoadType(e.target.value)} style={inp}>{LOAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><div style={lbl}>Weight (KG)</div><input type="number" placeholder="500" value={weight} onChange={e => setWeight(e.target.value)} style={inp} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>Size</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{SIZES.map(s => (
            <button key={s} onClick={() => setSize(s)} style={{ flex: '1 1 80px', padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', border: size === s ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: size === s ? C.accentBg : 'transparent', color: size === s ? C.accent : C.sub }}>{s}</button>
          ))}</div>
        </div>
        <div style={{ marginBottom: 12 }}><div style={lbl}>Handling</div><select value={handling} onChange={e => setHandling(e.target.value)} style={inp}>{HANDLING_PROFILES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}</select></div>
        <div><div style={lbl}>Notes (optional)</div><textarea rows={2} placeholder="Special instructions..." value={description} onChange={e => setDescription(e.target.value)} style={{ ...inp, resize: 'none' }} /></div>
      </div>

      {/* ── Schedule ── */}
      <div style={{ ...box, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
            <Icon name="schedule" size={14} style={{ color: C.accent }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Schedule</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['immediate', 'schedule'].map(t => (
            <button key={t} onClick={() => setScheduleType(t)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: scheduleType === t ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: scheduleType === t ? C.accentBg : 'transparent', color: scheduleType === t ? C.accent : C.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name={t === 'immediate' ? 'bolt' : 'calendar_today'} size={16} />{t === 'immediate' ? 'Now' : 'Schedule'}
            </button>
          ))}
        </div>
        {scheduleType === 'schedule' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}><input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={inp} /><input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={inp} /></div>}
        <div style={lbl}>Priority</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{ETA_PRIORITIES.map(p => (
          <button key={p.id} onClick={() => setPriority(p.id)} style={{ flex: '1 1 70px', padding: '10px 4px', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: priority === p.id ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: priority === p.id ? C.accentBg : 'transparent', color: priority === p.id ? C.accent : C.sub }}>{p.label.split('(')[0].trim()}</button>
        ))}</div>
      </div>

      {/* ── Discount ── */}
      <div style={{ marginBottom: 14 }}>
        <input placeholder="Discount code (e.g. FIRST50)" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} style={inp} />
      </div>

      {/* ── Price Estimate ── */}
      {estimate && (
        <div style={{ ...box, borderColor: C.accent, borderWidth: 2, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(255,215,0,0.15)' : '#FFFBEB' }}>
              <Icon name="receipt_long" size={14} style={{ color: isDark ? '#FFD700' : '#F59E0B' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Price Estimate</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}><span style={{ color: C.sub }}>Base fare</span><span style={{ color: C.text, fontWeight: 500 }}>₹{estimate.baseFare?.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}><span style={{ color: C.sub }}>Distance ({routeData?.distanceKm} km)</span><span style={{ color: C.text, fontWeight: 500 }}>₹{estimate.distanceCharge?.toFixed(2)}</span></div>
            {estimate.weightSurcharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.sub }}>Weight</span><span style={{ color: C.text }}>₹{estimate.weightSurcharge?.toFixed(2)}</span></div>}
            {estimate.handlingSurcharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.sub }}>Handling</span><span style={{ color: C.text }}>₹{estimate.handlingSurcharge?.toFixed(2)}</span></div>}
            {estimate.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#10B981' }}>Discount</span><span style={{ color: '#10B981' }}>-₹{estimate.discount?.toFixed(2)}</span></div>}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: C.accent }}>₹{estimate.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Button ── */}
      <button onClick={handleBook} disabled={!pickup || !dropoff || booking}
        style={{
          width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
          fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: (!pickup || !dropoff) ? C.muted : C.accent,
          color: isDark ? '#000' : '#fff', opacity: booking ? 0.6 : 1,
          boxShadow: (pickup && dropoff) ? `0 4px 16px ${C.accent}30` : 'none',
        }}>
        {booking ? <><Icon name="progress_activity" size={20} /> Booking...</> : <><Icon name="check_circle" size={20} /> Confirm Booking</>}
      </button>

      {/* ── Fullscreen Map Picker Overlay ── */}
      {mapPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: C.bg }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <button onClick={() => setMapPicker(null)}
              style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', background: isDark ? '#27272A' : '#F1F5F9', color: C.sub }}>
              <Icon name="arrow_back" size={20} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                Select {mapPicker === 'pickup' ? 'Pickup' : 'Drop-off'} Location
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>Tap on the map to choose</div>
            </div>
            <div style={{ width: 36 }} />
          </div>

          {/* Map */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapView
              center={mapPickerCenter}
              zoom={13}
              markers={[]}
              showLocate={true}
              className="w-full h-full"
              onClick={(e) => {
                if (e?.latlng) handleMapSelect(e.latlng.lat, e.latlng.lng);
              }}
            />
            {/* Center pin indicator */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)',
              pointerEvents: 'none', zIndex: 10,
            }}>
              <Icon name="location_on" filled size={40}
                style={{ color: mapPicker === 'pickup' ? '#10B981' : '#3B82F6', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </div>
          </div>

          {/* Bottom: Confirm center location */}
          <div style={{ padding: '12px 16px', background: C.card, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 10 }}>
              Tap on the map or use the center pin
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMapPicker(null)}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600, background: 'transparent', border: `1px solid ${C.border}`, color: C.sub }}>
                Cancel
              </button>
              <button onClick={() => {
                handleMapSelect(mapPickerCenter[0], mapPickerCenter[1]);
              }}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: mapPicker === 'pickup' ? '#10B981' : '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="check" size={18} />
                Set {mapPicker === 'pickup' ? 'Pickup' : 'Drop-off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
