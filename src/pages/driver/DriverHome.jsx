import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { drivers as driversApi, bookings as bookingsApi } from '../../services/api';
import Icon from '../../components/ui/Icon';

import MapView from '../../components/map/MapView';

export default function DriverHome() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [driver, setDriver] = useState(null);
  const [available, setAvailable] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [toggling, setToggling] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9',
    card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6',
    accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06)',
    green: '#10B981', red: '#EF4444',
  };

  useEffect(() => {
    if (!user?.id) return;
    driversApi.getDriver(user.id).then(d => { setDriver(d); setAvailable(d.available); }).catch(() => {});
    bookingsApi.getBookings({ status: 'confirmed' }).then(d => Array.isArray(d) && setPendingJobs(d.filter(b => !b.driverId || b.driverId === user.id))).catch(() => {});
    bookingsApi.getBookings({}).then(d => { if (Array.isArray(d)) { const a = d.find(b => b.driverId === user.id && b.status === 'in-transit'); if (a) setActiveJob(a); }}).catch(() => {});
  }, [user]);

  const toggleAvailability = () => {
    setToggling(true);
    driversApi.toggleAvailability(user.id, { available: !available })
      .then(d => { setAvailable(d.available); setDriver(d); })
      .finally(() => setToggling(false));
  };

  const acceptJob = (id) => {
    driversApi.acceptJob(user.id, id).then(res => {
      setActiveJob(res.booking);
      setPendingJobs(p => p.filter(j => j.id !== id));
      setExpandedJob(null);
    }).catch(() => {});
  };

  const rejectJob = (id) => {
    driversApi.rejectJob(user.id, id).then(() => {
      setPendingJobs(p => p.filter(j => j.id !== id));
      if (expandedJob === id) setExpandedJob(null);
    }).catch(() => {});
  };

  const completeJob = () => {
    if (!activeJob) return;
    fetch(`/api/bookings/${activeJob.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) })
      .then(() => setActiveJob(null)).catch(() => {});
  };

  const stats = driver?.stats || {};

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 12px 100px' }}>

      {/* ── Driver Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: C.accentBg, border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="person" filled size={22} style={{ color: C.accent }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{driver?.name || 'Driver'}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{driver?.truckId} · <Icon name="star" filled size={11} style={{ color: '#FBBF24', verticalAlign: 'middle' }} /> {driver?.rating}</div>
          </div>
        </div>
        {/* Online/Offline toggle */}
        <button onClick={toggleAvailability} disabled={toggling}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 800, letterSpacing: '0.05em', transition: 'all 0.2s',
            background: available ? C.green : (isDark ? '#27272A' : '#E2E8F0'),
            color: available ? '#fff' : C.sub,
            boxShadow: available ? '0 2px 10px rgba(16,185,129,0.3)' : 'none',
          }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: available ? '#fff' : C.muted }} />
          {available ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>

      {/* ── Quick Stats (2x2 grid for mobile) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { icon: 'route', label: 'Trips', value: stats.jobsToday || 0 },
          { icon: 'payments', label: 'Earned', value: `₹${(driver?.earnings || 0).toLocaleString()}` },
          { icon: 'straighten', label: 'Distance', value: `${stats.totalDistance || 0}km` },
          { icon: 'schedule', label: 'Hours', value: `${stats.activeHours || 0}h` },
        ].map((s, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 14px', boxShadow: C.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon name={s.icon} size={16} style={{ color: C.accent }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Active Job (with map) ── */}
      {activeJob && (
        <div style={{ background: C.card, border: `2px solid ${C.green}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: `0 4px 16px ${C.green}20` }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', background: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="local_shipping" filled size={18} style={{ color: C.green }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Trip</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>₹{activeJob.fare?.total?.toFixed(0)}</div>
          </div>

          {/* Map */}
          <div style={{ height: 200 }}>
            <MapView
              center={[activeJob.pickup?.lat || 19, activeJob.pickup?.lng || 72]}
              zoom={6}
              markers={[
                { lat: activeJob.pickup?.lat, lng: activeJob.pickup?.lng, label: 'P' },
                { lat: activeJob.dropoff?.lat, lng: activeJob.dropoff?.lng, label: 'D' },
              ]}
              origin={activeJob.pickup?.lat ? [activeJob.pickup.lat, activeJob.pickup.lng] : null}
              destination={activeJob.dropoff?.lat ? [activeJob.dropoff.lat, activeJob.dropoff.lng] : null}
              className="w-full h-full"
            />
          </div>

          {/* Route details */}
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: C.green }} />
                <div style={{ width: 2, height: 28, background: C.border }} />
                <div style={{ width: 10, height: 10, borderRadius: 5, background: '#3B82F6' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{activeJob.pickup?.address || 'Pickup'}</div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>PICKUP</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{activeJob.dropoff?.address || 'Dropoff'}</div>
                <div style={{ fontSize: 10, color: C.muted }}>DROP-OFF</div>
              </div>
            </div>

            {/* Cargo info */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { icon: 'inventory_2', text: activeJob.cargo?.type || '--' },
                { icon: 'scale', text: activeJob.cargo?.weight || '--' },
                { icon: 'local_shipping', text: activeJob.truckType || '--' },
              ].map((t, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: isDark ? '#27272A' : '#F1F5F9', color: C.sub }}>
                  <Icon name={t.icon} size={12} />{t.text}
                </span>
              ))}
            </div>

            {/* Complete button */}
            <button onClick={completeJob}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 800, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 10px rgba(16,185,129,0.3)' }}>
              <Icon name="check_circle" size={20} /> Complete Delivery
            </button>
          </div>
        </div>
      )}

      {/* ── Incoming Trip Requests ── */}
      {available && pendingJobs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Trip Requests</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, background: C.accentBg, padding: '2px 8px', borderRadius: 10 }}>{pendingJobs.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingJobs.map(j => {
              const isExpanded = expandedJob === j.id;
              return (
                <div key={j.id} style={{ background: C.card, border: `1px solid ${isExpanded ? C.accent : C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: isExpanded ? `0 4px 16px ${C.accent}15` : C.shadow, transition: 'all 0.2s' }}>
                  {/* Trip summary - always visible */}
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={() => setExpandedJob(isExpanded ? null : j.id)}>
                    {/* Amount circle */}
                    <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(255,215,0,0.1)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(255,215,0,0.2)' : '#FEF3C7'}`, flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: isDark ? '#FFD700' : '#F59E0B' }}>₹{j.fare?.total?.toFixed(0)}</div>
                    </div>

                    {/* Route info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{j.id}</div>
                      <div style={{ fontSize: 11, color: C.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.pickup?.address} → {j.dropoff?.address}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: isDark ? '#27272A' : '#F1F5F9', color: C.muted }}>{j.cargo?.type}</span>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: isDark ? '#27272A' : '#F1F5F9', color: C.muted }}>{j.cargo?.weight}</span>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: isDark ? '#27272A' : '#F1F5F9', color: C.muted, textTransform: 'uppercase' }}>{j.truckType}</span>
                      </div>
                    </div>

                    {/* Expand arrow */}
                    <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={20} style={{ color: C.muted, flexShrink: 0 }} />
                  </div>

                  {/* Expanded: Map + Actions */}
                  {isExpanded && (
                    <div>
                      {/* Map showing pickup and dropoff */}
                      <div style={{ height: 180, borderTop: `1px solid ${C.border}` }}>
                        <MapView
                          center={j.pickup?.lat ? [j.pickup.lat, j.pickup.lng] : [19, 72]}
                          zoom={6}
                          markers={[
                            ...(j.pickup?.lat ? [{ lat: j.pickup.lat, lng: j.pickup.lng }] : []),
                            ...(j.dropoff?.lat ? [{ lat: j.dropoff.lat, lng: j.dropoff.lng }] : []),
                          ]}
                          origin={j.pickup?.lat ? [j.pickup.lat, j.pickup.lng] : null}
                          destination={j.dropoff?.lat ? [j.dropoff.lat, j.dropoff.lng] : null}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Route details */}
                      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: C.accent }} />
                            <div style={{ width: 1, height: 20, background: C.border }} />
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#3B82F6' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{j.pickup?.address || 'Pickup'}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginTop: 12 }}>{j.dropoff?.address || 'Dropoff'}</div>
                          </div>
                        </div>

                        {/* Fare breakdown */}
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: isDark ? 'rgba(255,215,0,0.05)' : '#FFFBEB', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Trip Amount</div>
                            <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{j.cargo?.description || j.cargo?.type}</div>
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: isDark ? '#FFD700' : '#F59E0B' }}>₹{j.fare?.total?.toFixed(0)}</div>
                        </div>

                        {/* Accept / Decline buttons */}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => acceptJob(j.id)}
                            style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}>
                            <Icon name="check" size={18} /> Accept
                          </button>
                          <button onClick={() => rejectJob(j.id)}
                            style={{ flex: 1, padding: '13px 0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, background: 'transparent', border: `2px solid ${C.red}`, color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Icon name="close" size={18} /> Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No requests when online ── */}
      {available && pendingJobs.length === 0 && !activeJob && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center', boxShadow: C.shadow }}>
          <Icon name="hourglass_empty" size={40} style={{ color: C.accent, marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Waiting for trips...</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>New requests will appear here</div>
        </div>
      )}

      {/* ── Offline state ── */}
      {!available && !activeJob && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '48px 20px', textAlign: 'center', boxShadow: C.shadow }}>
          <Icon name="cloud_off" size={44} style={{ color: C.muted, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>You're offline</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 20 }}>Go online to start receiving trip requests</div>
          <button onClick={toggleAvailability} disabled={toggling}
            style={{ padding: '12px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: C.green, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="power_settings_new" size={18} /> Go Online
          </button>
        </div>
      )}
    </div>
  );
}
