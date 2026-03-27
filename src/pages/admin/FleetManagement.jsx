import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';
import AppIcon from '../../components/ui/AppIcon';
import StatusBadge from '../../components/ui/StatusBadge';
import MapView, { createFleetActiveIcon, createFleetIdleIcon } from '../../components/map/MapView';
import { fleet as fleetApi, drivers as driversApi, bookings as bookingsApi } from '../../services/api';

const FILTERS = ['All', 'Small', 'Medium', 'Large'];

export default function FleetManagement() {
  const { isDark, toggleTheme } = useTheme();
  const [scaleFilter, setScaleFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [fleetData, setFleetData] = useState([]);
  const [operators, setOperators] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    fleetApi.getFleet().then(d => Array.isArray(d) && d.length > 0 && setFleetData(d)).catch(() => {});
    driversApi.getDrivers().then(d => Array.isArray(d) && d.length > 0 && setOperators(d)).catch(() => {});
    bookingsApi.getBookings({}).then(d => Array.isArray(d) && setBookings(d)).catch(() => {});
  }, []);

  const filtered = fleetData.filter(f => {
    if (scaleFilter !== 'All' && f.type?.toLowerCase() !== scaleFilter.toLowerCase()) return false;
    if (searchQuery && !f.id?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeCount = fleetData.filter(f => f.status === 'active' || f.status === 'on-trip').length;

  // Selected vehicle's driver and bookings
  const selDriver = selectedVehicle ? operators.find(o => o.id === selectedVehicle.driverId) : null;
  const selBookings = selDriver ? bookings.filter(b => b.driverId === selDriver.id) : [];

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9',
    headerBg: isDark ? '#0A0A0A' : '#FFFFFF',
    card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8',
    rowAlt: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    accent: isDark ? '#FFD700' : '#3B82F6',
    accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
  };

  const [mob, setMob] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const h = () => setMob(window.innerWidth < 1024);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* ═══ HEADER ═══ */}
      <header style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}`, boxShadow: C.shadow, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mob ? '0 12px' : '0 24px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 8 : 16 }}>
          <Link to="/admin" style={{ textDecoration: 'none', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#18181B' : '#F1F5F9', color: C.sub }}>
            <Icon name="arrow_back" size={20} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!mob && <AppIcon size={38} />}
            <div>
              <div style={{ fontSize: mob ? 15 : 17, fontWeight: 800, color: C.text }}>Fleet Map</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{activeCount} active · {fleetData.length} total</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,215,0,0.2)' : '#E2E8F0'}`, background: isDark ? 'rgba(255,215,0,0.08)' : '#F8FAFC', color: isDark ? '#FFD700' : '#64748B' }}>
            <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={18} />
          </button>
          <div style={{ width: 1, height: 28, background: C.border, margin: '0 4px' }} />
          <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>
            <Icon name="person" size={16} style={{ color: isDark ? '#000' : '#fff' }} />
          </div>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: mob ? '20px 12px 60px' : '32px 24px 48px', maxWidth: 1600, margin: '0 auto' }}>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Icon name="search" size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input type="text" placeholder="Search vehicle ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setScaleFilter(f)}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s', background: scaleFilter === f ? C.accent : (isDark ? '#18181B' : '#F1F5F9'), color: scaleFilter === f ? (isDark ? '#000' : '#fff') : C.sub, whiteSpace: 'nowrap' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Map + Vehicle Detail */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedVehicle && !mob ? '2fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
          {/* Map */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.shadow }}>
            <div style={{ height: mob ? 350 : (selectedVehicle ? 400 : 450) }}>
              <MapView
                center={selectedVehicle?.location ? [selectedVehicle.location.lat, selectedVehicle.location.lng] : [19.076, 72.877]}
                zoom={selectedVehicle ? 14 : 11}
                markers={selectedVehicle
                  ? [{ lat: selectedVehicle.location?.lat || 19.07, lng: selectedVehicle.location?.lng || 72.87, icon: createFleetActiveIcon() }]
                  : filtered.map(f => ({ lat: f.location?.lat || 19.07, lng: f.location?.lng || 72.87, icon: (f.status === 'active' || f.status === 'on-trip') ? createFleetActiveIcon() : createFleetIdleIcon() }))
                }
                origin={selBookings[0]?.pickup?.lat ? [selBookings[0].pickup.lat, selBookings[0].pickup.lng] : null}
                destination={selBookings[0]?.dropoff?.lat ? [selBookings[0].dropoff.lat, selBookings[0].dropoff.lng] : null}
                showLocate={false} className="w-full h-full"
              />
            </div>
            {/* Map footer */}
            <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#3B82F6' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>Active ({filtered.filter(f => f.status === 'active' || f.status === 'on-trip').length})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: C.muted }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>Idle ({filtered.filter(f => f.status === 'idle' || f.status === 'maintenance').length})</span>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.accent }}>{filtered.length} vehicles</span>
            </div>
          </div>

          {/* Selected Vehicle Detail Panel */}
          <AnimatePresence>
            {selectedVehicle && (
              <motion.div initial={{ opacity: 0, y: mob ? 20 : 0, x: mob ? 0 : 20 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0, y: mob ? 20 : 0, x: mob ? 0 : 20 }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.shadow, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
                      <Icon name="local_shipping" filled size={18} style={{ color: C.accent }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{selectedVehicle.id}</div>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>{selectedVehicle.type} truck</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedVehicle(null)} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#27272A' : '#F1F5F9', border: 'none', cursor: 'pointer', color: C.sub }}>
                    <Icon name="close" size={16} />
                  </button>
                </div>

                {/* Status + Health */}
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Status</div>
                    <StatusBadge status={selectedVehicle.status === 'on-trip' ? 'in-transit' : selectedVehicle.status} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Health</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? '#27272A' : '#F1F5F9', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${selectedVehicle.health || 0}%`, background: (selectedVehicle.health || 0) > 80 ? '#10B981' : (selectedVehicle.health || 0) > 50 ? '#F59E0B' : '#EF4444' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{selectedVehicle.health || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Driver */}
                {selDriver && (
                  <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Assigned Driver</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5' }}>
                        <Icon name="person" filled size={18} style={{ color: isDark ? '#34D399' : '#10B981' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{selDriver.name}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{selDriver.phone} · {selDriver.truckId}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Icon name="star" filled size={14} style={{ color: '#FBBF24' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{selDriver.rating}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Routes */}
                {selBookings.length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.border}`, flex: 1, overflowY: 'auto' }}>
                    <div style={{ padding: '12px 20px', fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Route History ({selBookings.length})</div>
                    {selBookings.map(b => (
                      <div key={b.id} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon name="route" size={14} style={{ color: C.accent }} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{b.id}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>{b.pickup?.address} → {b.dropoff?.address}</div>
                          </div>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Location */}
                <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted }}>
                  <Icon name="location_on" size={12} style={{ marginRight: 4 }} />
                  {selectedVehicle.location?.lat?.toFixed(4)}, {selectedVehicle.location?.lng?.toFixed(4)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fleet Vehicles Table */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.shadow, marginBottom: 24 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(251,191,36,0.1)' : '#FFFBEB' }}>
                <Icon name="directions_car" filled size={16} style={{ color: isDark ? '#FBBF24' : '#F59E0B' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Fleet Vehicles</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{filtered.length} vehicles</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.rowAlt }}>
                  {['Vehicle ID', 'Type', 'Driver', 'Status', 'Health', 'Location'].map(h => (
                    <th key={h} style={{ padding: mob ? '10px 12px' : '10px 20px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => {
                  const driver = operators.find(o => o.id === f.driverId);
                  const isSel = selectedVehicle?.id === f.id;
                  return (
                    <tr key={f.id}
                      onClick={() => setSelectedVehicle(isSel ? null : f)}
                      style={{
                        borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all 0.15s',
                        background: isSel ? (isDark ? 'rgba(255,215,0,0.06)' : '#EFF6FF') : (i % 2 === 0 ? C.rowAlt : 'transparent'),
                        borderLeft: isSel ? `3px solid ${C.accent}` : '3px solid transparent',
                      }}>
                      <td style={{ padding: mob ? '12px 12px' : '12px 20px', fontSize: 13, fontWeight: 600, color: C.text }}>{f.id}</td>
                      <td style={{ padding: mob ? '12px 12px' : '12px 20px', fontSize: 13, color: C.sub, textTransform: 'uppercase' }}>{f.type}</td>
                      <td style={{ padding: mob ? '12px 12px' : '12px 20px', fontSize: 13, color: C.text }}>{driver?.name || '--'}</td>
                      <td style={{ padding: mob ? '12px 12px' : '12px 20px' }}><StatusBadge status={f.status === 'on-trip' ? 'in-transit' : f.status} /></td>
                      <td style={{ padding: mob ? '12px 12px' : '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 3, background: isDark ? '#27272A' : '#F1F5F9', overflow: 'hidden', maxWidth: 80 }}>
                            <div style={{ height: '100%', borderRadius: 3, width: `${f.health || 0}%`, background: (f.health || 0) > 80 ? '#10B981' : (f.health || 0) > 50 ? '#F59E0B' : '#EF4444' }} />
                          </div>
                          {!mob && <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{f.health || 0}%</span>}
                        </div>
                      </td>
                      <td style={{ padding: mob ? '12px 12px' : '12px 20px', fontSize: 10, color: C.muted }}>{f.location?.lat?.toFixed(3)}, {f.location?.lng?.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No vehicles match filter</div>}
        </div>

        {/* Operators Grid */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(52,211,153,0.1)' : '#ECFDF5' }}>
              <Icon name="group" filled size={16} style={{ color: isDark ? '#34D399' : '#10B981' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Operators</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {operators.map(op => (
              <div key={op.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: C.shadow }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#27272A' : '#F1F5F9' }}>
                    <Icon name="person" filled size={20} style={{ color: C.sub }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 5, border: `2px solid ${C.card}`, background: op.status === 'active' ? '#10B981' : op.status === 'on-trip' ? '#3B82F6' : '#94A3B8' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{op.truckId || op.id} · {op.phone}</div>
                </div>
                <StatusBadge status={op.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
