import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { drivers as driversApi, bookings as bookingsApi, geo } from '../../services/api';
import Icon from '../../components/ui/Icon';

import MapView from '../../components/map/MapView';
import { createOriginIcon, createDestinationIcon } from '../../components/map/MapView';

export default function DriverHome() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [driver, setDriver] = useState(null);
  const [available, setAvailable] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [toggling, setToggling] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [routeCache, setRouteCache] = useState({}); // { [jobId]: { coords, distanceKm, durationMin } }
  const [driverLoc, setDriverLoc] = useState(null);
  const [assignedTrip, setAssignedTrip] = useState(null);

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
    bookingsApi.getBookings({}).then(d => {
      if (!Array.isArray(d)) return;
      setPendingJobs(d.filter(b => (b.status === 'pending' || b.status === 'confirmed') && (!b.driverId || b.driverId === user.id)));
      const a = d.find(b => b.driverId === user.id && (b.status === 'confirmed' || b.status === 'in-transit'));
      if (a) setActiveJob(a);
    }).catch(() => {});
  }, [user]);

  // Poll for assigned trips (auto-assignment system)
  useEffect(() => {
    if (!user?.id || !available) return;
    const check = () => {
      bookingsApi.getBookings({}).then(all => {
        if (!Array.isArray(all)) return;
        const assigned = all.find(b => b.pendingDriverId === user.id && b.status === 'pending' && !b.driverId);
        if (assigned && (!assignedTrip || assignedTrip.id !== assigned.id)) {
          setAssignedTrip(assigned);
        } else if (!assigned && assignedTrip) {
          setAssignedTrip(null);
        }
      }).catch(() => {});
    };
    check();
    const interval = setInterval(check, 4000);
    return () => clearInterval(interval);
  }, [user, available, assignedTrip]);

  const handleAcceptAssignment = () => {
    if (!assignedTrip) return;
    driversApi.respondAssignment(user.id, assignedTrip.id, true).then(res => {
      if (res.accepted) {
        setActiveJob(res.booking);
        setAssignedTrip(null);
        setAvailable(false);
        setPendingJobs(prev => prev.filter(j => j.id !== assignedTrip.id));
      }
    }).catch(() => {});
  };

  const handleDeclineAssignment = () => {
    if (!assignedTrip) return;
    driversApi.respondAssignment(user.id, assignedTrip.id, false).then(() => {
      setAssignedTrip(null);
    }).catch(() => {});
  };

  const [locPopup, setLocPopup] = useState(false);

  const toggleAvailability = () => {
    if (!available) {
      // Show location permission popup first
      setLocPopup(true);
    } else {
      // Going offline
      setToggling(true);
      driversApi.toggleAvailability(user.id, { available: false })
        .then(d => { setAvailable(d.available); setDriver(d); })
        .finally(() => setToggling(false));
    }
  };

  const confirmGoOnline = () => {
    if (!navigator.geolocation) {
      setLocPopup(false);
      return;
    }
    setToggling(true);
    setLocPopup(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDriverLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        driversApi.updateLocation(user.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        driversApi.toggleAvailability(user.id, { available: true })
          .then(d => { setAvailable(d.available); setDriver(d); })
          .finally(() => setToggling(false));
      },
      () => {
        setToggling(false);
        // Location denied — show popup again with error
        setLocPopup('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      .then(() => {
        setActiveJob(null);
        // Set driver back to available after completing trip
        driversApi.toggleAvailability(user.id, { available: true })
          .then(d => { setAvailable(d.available); setDriver(d); }).catch(() => {});
      }).catch(() => {});
  };

  // Fetch route when a job is expanded or active
  const fetchRoute = (job) => {
    if (!job || routeCache[job.id]) return;
    if (!job.pickup?.lat || !job.dropoff?.lat) return;
    geo.getRoute(job.pickup.lat, job.pickup.lng, job.dropoff.lat, job.dropoff.lng)
      .then(data => {
        const coords = data.geometry?.coordinates?.map(c => [c[1], c[0]]) || [];
        setRouteCache(prev => ({ ...prev, [job.id]: { coords, distanceKm: data.distanceKm, durationMin: data.durationMin } }));
      }).catch(() => {});
  };

  // Fetch route when expanding a pending job
  useEffect(() => {
    if (expandedJob) {
      const job = pendingJobs.find(j => j.id === expandedJob);
      if (job) fetchRoute(job);
    }
  }, [expandedJob]);

  // Fetch route for active job
  useEffect(() => {
    if (activeJob) fetchRoute(activeJob);
  }, [activeJob]);

  // Only track & send location when driver is ONLINE
  useEffect(() => {
    if (!available || !user?.id || !navigator.geolocation) return;
    let watchId;
    const sendLocation = (lat, lng) => {
      setDriverLoc({ lat, lng });
      driversApi.updateLocation(user.id, lat, lng).catch(() => {});
    };
    watchId = navigator.geolocation.watchPosition(
      pos => sendLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId); };
  }, [available, user?.id]);

  const stats = driver?.stats || {};

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 0 60px' }}>

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

      {/* Profile Incomplete Notification */}
      {driver?.profileIncomplete && driver?.missingFields?.length > 0 && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: isDark ? 'rgba(251,191,36,0.08)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(251,191,36,0.25)' : '#FDE68A'}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(251,191,36,0.15)' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="warning" size={18} style={{ color: isDark ? '#FBBF24' : '#D97706' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#FBBF24' : '#92400E' }}>Complete Your Profile</div>
            <div style={{ fontSize: 11, color: isDark ? '#FDE68A' : '#A16207', marginTop: 3, lineHeight: 1.4 }}>
              Please update your profile with missing details: {driver.missingFields.map(f => {
                const labels = { name: 'Full Name', phone: 'Phone', city: 'City', licenseNumber: 'License Number', licenseExpiry: 'License Expiry', vehicleDetails: 'Vehicle Info', plateNumber: 'Reg Number' };
                return labels[f] || f;
              }).join(', ')}.
            </div>
            <a href="/driver/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '6px 14px', borderRadius: 8, background: isDark ? '#FBBF24' : '#D97706', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
              <Icon name="edit" size={13} /> Update Profile
            </a>
          </div>
        </div>
      )}

      {/* Location Permission Popup */}
      {locPopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 20 }} onClick={() => { setLocPopup(false); setToggling(false); }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 340, background: C.card, borderRadius: 20, overflow: 'hidden',
            boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.6)' : '0 8px 40px rgba(0,0,0,0.15)',
            border: `1px solid ${C.border}`,
          }}>
            {/* Icon */}
            <div style={{ padding: '28px 24px 16px', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: locPopup === 'denied'
                  ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2')
                  : (isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF'),
              }}>
                <Icon name={locPopup === 'denied' ? 'location_off' : 'location_on'} filled size={32}
                  style={{ color: locPopup === 'denied' ? '#EF4444' : '#3B82F6' }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>
                {locPopup === 'denied' ? 'Location Access Denied' : 'Turn On Location'}
              </div>
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
                {locPopup === 'denied'
                  ? 'Location access was denied. Please enable location in your browser settings and try again.'
                  : 'To go online and receive trip requests, we need access to your location. Your live location will be shared with customers for tracking.'}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {locPopup === 'denied' ? (
                <>
                  <button onClick={() => { setLocPopup(false); confirmGoOnline(); }}
                    style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, background: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Icon name="refresh" size={18} /> Try Again
                  </button>
                  <button onClick={() => { setLocPopup(false); setToggling(false); }}
                    style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: `1.5px solid ${C.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent', color: C.sub }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={confirmGoOnline}
                    style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 10px rgba(16,185,129,0.3)' }}>
                    <Icon name="location_on" size={18} /> Allow & Go Online
                  </button>
                  <button onClick={() => { setLocPopup(false); setToggling(false); }}
                    style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: `1.5px solid ${C.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent', color: C.sub }}>
                    Not Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* ── Active Job ── */}
      {activeJob && (() => {
        const activeRoute = routeCache[activeJob.id];
        const openGoogleNav = () => {
          const origin = driverLoc ? `${driverLoc.lat},${driverLoc.lng}` : (activeJob.pickup?.lat ? `${activeJob.pickup.lat},${activeJob.pickup.lng}` : '');
          const dest = activeJob.dropoff?.lat ? `${activeJob.dropoff.lat},${activeJob.dropoff.lng}` : '';
          if (origin && dest) window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`, '_blank');
        };
        return (
        <div style={{ background: C.card, border: `2px solid ${C.green}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20, boxShadow: `0 4px 16px ${C.green}20` }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', background: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="local_shipping" filled size={18} style={{ color: C.green }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Trip</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>₹{activeJob.fare?.total?.toFixed(0)}</div>
          </div>

          {/* Route info chips */}
          {activeRoute && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', color: C.green }}>
                <Icon name="straighten" size={12} />{activeRoute.distanceKm} km
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', color: C.green }}>
                <Icon name="schedule" size={12} />{activeRoute.durationMin} min
              </span>
            </div>
          )}

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

            {/* Start Navigation → Google Maps turn-by-turn */}
            <button onClick={openGoogleNav}
              style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 10px rgba(16,185,129,0.3)', marginBottom: 10 }}>
              <Icon name="navigation" size={18} /> Start Navigation
            </button>

            {/* Quick actions: Call, Share, Complete */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.open('tel:+911234567890', '_self')}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${C.border}`, background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700, color: C.green,
                }}>
                <Icon name="call" size={16} /> Call
              </button>
              <button onClick={completeJob}
                style={{
                  flex: 1.2, padding: '12px 0', borderRadius: 12, cursor: 'pointer', border: 'none',
                  background: isDark ? '#27272A' : '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 12, fontWeight: 800, color: C.text,
                }}>
                <Icon name="check_circle" size={16} style={{ color: C.green }} /> Complete
              </button>
            </div>
          </div>
        </div>
        );
      })()}

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
                  {isExpanded && (() => {
                    const jobRoute = routeCache[j.id];
                    return (
                    <div>
                      {/* Map showing route */}
                      <div style={{ height: 180, borderTop: `1px solid ${C.border}` }}>
                        <MapView
                          center={j.pickup?.lat ? [j.pickup.lat, j.pickup.lng] : [19, 72]}
                          zoom={6}
                          markers={[
                            ...(j.pickup?.lat ? [{ lat: j.pickup.lat, lng: j.pickup.lng, icon: createOriginIcon() }] : []),
                            ...(j.dropoff?.lat ? [{ lat: j.dropoff.lat, lng: j.dropoff.lng, icon: createDestinationIcon() }] : []),
                          ]}
                          route={jobRoute?.coords || []}
                          fitMarkers={true}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Route details */}
                      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
                        {/* Distance & duration chips */}
                        {jobRoute && (
                          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.accentBg, color: C.accent }}>
                              <Icon name="straighten" size={13} />{jobRoute.distanceKm} km
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.accentBg, color: C.accent }}>
                              <Icon name="schedule" size={13} />{jobRoute.durationMin} min
                            </span>
                          </div>
                        )}

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
                    );
                  })()}
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

      {/* ── Assignment Notification Popup ── */}
      {assignedTrip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{
            width: '100%', maxWidth: 420, background: C.card, borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.3)', border: `1px solid ${C.border}`,
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="notifications_active" size={24} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>New Trip Request!</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>You've been selected as the nearest driver</div>
              </div>
            </div>

            {/* Trip Details */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>ESTIMATED FARE</span>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981', marginTop: 2 }}>₹{assignedTrip.fare?.total?.toFixed(0) || '0'}</div>
              </div>

              <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 10, background: '#10B981' }} />
                    <div style={{ width: 2, height: 24, background: 'linear-gradient(to bottom, #10B981, #3B82F6)' }} />
                    <div style={{ width: 10, height: 10, borderRadius: 10, background: '#3B82F6' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignedTrip.pickup?.address || 'Pickup'}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 16 }}>{assignedTrip.dropoff?.address || 'Dropoff'}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ padding: '6px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', fontSize: 11, fontWeight: 600, color: C.sub }}>
                  <Icon name="inventory_2" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{assignedTrip.cargo?.loadType || assignedTrip.cargo?.type || 'General'}
                </div>
                <div style={{ padding: '6px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', fontSize: 11, fontWeight: 600, color: C.sub }}>
                  <Icon name="local_shipping" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{assignedTrip.truckType || 'small'}
                </div>
                {assignedTrip.paymentMethod && (
                  <div style={{ padding: '6px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', fontSize: 11, fontWeight: 600, color: C.sub }}>
                    <Icon name="payments" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{assignedTrip.paymentMethod.toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleDeclineAssignment} style={{
                  flex: 1, padding: '14px 0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  background: isDark ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.06)',
                  border: `1.5px solid ${isDark ? 'rgba(248,113,113,0.4)' : 'rgba(220,38,38,0.25)'}`,
                  color: isDark ? '#F87171' : '#DC2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Icon name="close" size={18} /> Decline
                </button>
                <button onClick={handleAcceptAssignment} style={{
                  flex: 2, padding: '14px 0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 800,
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                }}>
                  <Icon name="check_circle" size={18} /> Accept Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
