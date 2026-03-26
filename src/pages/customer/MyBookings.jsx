import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { bookings as bookingsApi, ratings as ratingsApi, drivers as driversApi } from '../../services/api';
import Icon from '../../components/ui/Icon';
import StatusBadge from '../../components/ui/StatusBadge';
import MapView, { createTruckIcon } from '../../components/map/MapView';

const FILTERS = ['all', 'active', 'completed', 'cancelled'];
// active = pending + confirmed + in-transit

export default function MyBookings() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [ratingModal, setRatingModal] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [trackingId, setTrackingId] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [driverDetails, setDriverDetails] = useState({}); // { [driverId]: driverObj }

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9', card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
  };

  useEffect(() => {
    const fetch = () => bookingsApi.getBookings({ userId: user?.id }).then(d => Array.isArray(d) && setBookings(d)).catch(() => {
      bookingsApi.getBookings({}).then(d => Array.isArray(d) && setBookings(d)).catch(() => {});
    });
    fetch();
    const interval = setInterval(fetch, 6000);
    return () => clearInterval(interval);
  }, [user]);

  // Re-trigger auto-assign for pending bookings with no driver and no pending assignment
  useEffect(() => {
    bookings.filter(b => b.status === 'pending' && !b.driverId && !b.pendingDriverId)
      .forEach(b => bookingsApi.autoAssign(b.id).catch(() => {}));
  }, [bookings]);

  // Fetch driver details for confirmed/in-transit bookings
  useEffect(() => {
    const driverIds = [...new Set(bookings.filter(b => b.driverId && (b.status === 'confirmed' || b.status === 'in-transit')).map(b => b.driverId))];
    driverIds.forEach(id => {
      if (!driverDetails[id]) {
        driversApi.getDriver(id).then(d => setDriverDetails(prev => ({ ...prev, [id]: d }))).catch(() => {});
      }
    });
  }, [bookings]);


  const filtered = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'active') return b.status === 'pending' || b.status === 'confirmed' || b.status === 'in-transit';
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const handleRate = () => {
    if (!ratingModal || !ratingValue) return;
    setSubmitting(true);
    ratingsApi.submit({ userId: user?.id, driverId: ratingModal.driverId, bookingId: ratingModal.id, rating: ratingValue, comment: ratingComment })
      .then(() => { setRatingModal(null); setRatingValue(0); setRatingComment(''); })
      .finally(() => setSubmitting(false));
  };

  const handleCancel = (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancellingId(id);
    bookingsApi.updateBooking(id, { status: 'cancelled' })
      .then(() => setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b)))
      .finally(() => setCancellingId(null));
  };

  useEffect(() => {
    if (!trackingId) { setDriverLoc(null); return; }
    const b = bookings.find(x => x.id === trackingId);
    if (!b?.driverId) return;
    const fetchLoc = () => driversApi.getDriver(b.driverId).then(d => {
      if (d?.location) setDriverLoc(d.location);
    }).catch(() => {});
    fetchLoc();
    const interval = setInterval(fetchLoc, 5000);
    return () => clearInterval(interval);
  }, [trackingId, bookings]);

  const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: C.shadow };

  const statusAccent = (status) => {
    if (status === 'pending') return isDark ? '#FBBF24' : '#D97706';
    if (status === 'confirmed') return isDark ? '#34D399' : '#059669';
    if (status === 'in-transit') return isDark ? '#60A5FA' : '#2563EB';
    if (status === 'completed') return isDark ? '#FFD700' : '#F59E0B';
    if (status === 'cancelled') return isDark ? '#F87171' : '#DC2626';
    return C.accent;
  };

  const statusGlow = (status) => {
    if (status === 'pending') return isDark ? 'rgba(251,191,36,0.10)' : 'rgba(217,119,6,0.06)';
    if (status === 'confirmed') return isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.06)';
    if (status === 'in-transit') return isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.06)';
    if (status === 'completed') return isDark ? 'rgba(255,215,0,0.10)' : 'rgba(245,158,11,0.06)';
    if (status === 'cancelled') return isDark ? 'rgba(248,113,113,0.10)' : 'rgba(220,38,38,0.04)';
    return 'transparent';
  };

  const statusIcon = (status) => {
    if (status === 'pending') return 'hourglass_top';
    if (status === 'confirmed') return 'check_circle';
    if (status === 'in-transit') return 'local_shipping';
    if (status === 'completed') return 'verified';
    if (status === 'cancelled') return 'cancel';
    return 'circle';
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>My Bookings</div>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: C.accent, color: isDark ? '#000' : '#fff', fontSize: 12, fontWeight: 700 }}>
          <Icon name="add" size={16} /> New Booking
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, background: isDark ? '#18181B' : '#E2E8F0', borderRadius: 10, padding: 4 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', textTransform: 'uppercase', background: filter === f ? C.accent : 'transparent', color: filter === f ? (isDark ? '#000' : '#fff') : C.sub }}>
            {f} ({f === 'all' ? bookings.length : bookings.filter(b => f === 'active' ? (b.status === 'pending' || b.status === 'confirmed' || b.status === 'in-transit') : b.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ ...box, padding: '48px 20px', textAlign: 'center' }}><Icon name="inventory_2" size={48} style={{ color: C.muted, marginBottom: 12 }} /><div style={{ fontSize: 14, color: C.sub }}>No bookings found</div></div>}

      {/* Bookings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
        {filtered.map(b => {
          const accent = statusAccent(b.status);
          const glow = statusGlow(b.status);
          return (
          <div key={b.id} style={{
            background: C.card,
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: isDark
              ? `0 2px 8px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)`
              : `0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.06)`,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
            position: 'relative',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isDark ? `0 4px 16px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.3)` : `0 4px 12px rgba(0,0,0,0.08), 0 12px 36px rgba(0,0,0,0.1)`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isDark ? `0 2px 8px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)` : `0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.06)`; }}
          >
            {/* Top accent bar */}
            <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

            {/* Status glow background */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderRadius: '0 0 0 100%', background: `radial-gradient(circle at top right, ${glow}, transparent 70%)`, pointerEvents: 'none' }} />

            <div style={{ padding: '18px 20px 16px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: glow, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${accent}33` }}>
                    <Icon name={statusIcon(b.status)} size={20} style={{ color: accent }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{b.id}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>

              {/* Route */}
              <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 12, padding: '14px 14px', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 10, background: accent, boxShadow: `0 0 0 3px ${accent}22` }} />
                    <div style={{ width: 2, height: 20, background: `linear-gradient(to bottom, ${accent}66, #3B82F666)`, borderRadius: 1 }} />
                    <div style={{ width: 10, height: 10, borderRadius: 10, background: '#3B82F6', boxShadow: '0 0 0 3px rgba(59,130,246,0.15)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.pickup?.address || 'Pickup'}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 12 }}>{b.dropoff?.address || 'Dropoff'}</div>
                  </div>
                </div>
              </div>

              {/* Cargo + Fare */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="inventory_2" size={14} style={{ color: C.sub }} />
                  </div>
                  <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>{b.cargo?.loadType || b.cargo?.type || '--'} · {b.cargo?.weight || '--'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>₹</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{b.fare?.total?.toFixed(0) || '0'}</span>
                </div>
              </div>

              {/* Payment method */}
              {b.paymentMethod && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Icon name={b.paymentMethod === 'cash' ? 'money' : b.paymentMethod === 'upi' ? 'qr_code_2' : 'account_balance_wallet'} size={14} style={{ color: C.muted }} />
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{b.paymentMethod}</span>
                </div>
              )}

              {/* Pending status - waiting for driver */}
              {b.status === 'pending' && (
                <div style={{ padding: '10px 12px', borderRadius: 10, background: isDark ? 'rgba(251,191,36,0.08)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="hourglass_top" size={16} style={{ color: isDark ? '#FBBF24' : '#D97706' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#FBBF24' : '#D97706' }}>
                    {b.pendingDriverId ? 'Waiting for driver to accept...' : 'Finding a driver for you...'}
                  </span>
                </div>
              )}

              {/* Driver details - shown after confirmed */}
              {b.driverId && (b.status === 'confirmed' || b.status === 'in-transit') && driverDetails[b.driverId] && (() => {
                const drv = driverDetails[b.driverId];
                return (
                  <div style={{ padding: '12px', borderRadius: 12, background: isDark ? 'rgba(16,185,129,0.06)' : '#ECFDF5', border: `1px solid ${isDark ? 'rgba(16,185,129,0.15)' : '#A7F3D0'}`, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {drv.profilePicture ? <img src={drv.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="person" size={18} style={{ color: '#10B981' }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{drv.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            {drv.rating > 0 && <span style={{ fontSize: 11, color: isDark ? '#FFD700' : '#F59E0B', fontWeight: 600 }}>★ {drv.rating}</span>}
                            {drv.vehicleDetails?.model && <span style={{ fontSize: 10, color: C.muted }}>{drv.vehicleDetails.model}</span>}
                            {drv.vehicleDetails?.plateNumber && <span style={{ fontSize: 10, color: C.muted }}>· {drv.vehicleDetails.plateNumber}</span>}
                          </div>
                        </div>
                      </div>
                      {drv.phone && (
                        <a href={`tel:${drv.phone}`} style={{
                          width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: '#10B981', color: '#fff', textDecoration: 'none',
                        }}>
                          <Icon name="call" size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 10, flexWrap: 'wrap' }}>
                {/* Pending: only cancel */}
                {b.status === 'pending' && (
                  <button onClick={() => handleCancel(b.id)} disabled={cancellingId === b.id} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                    background: isDark ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.05)',
                    border: `1px solid ${isDark ? 'rgba(248,113,113,0.3)' : 'rgba(220,38,38,0.2)'}`,
                    color: isDark ? '#F87171' : '#DC2626', fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                    opacity: cancellingId === b.id ? 0.5 : 1,
                  }}>
                    <Icon name="cancel" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {cancellingId === b.id ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                )}
                {/* Confirmed/In-transit: track + call (no cancel) */}
                {(b.status === 'confirmed' || b.status === 'in-transit') && (
                  <button onClick={() => setTrackingId(trackingId === b.id ? null : b.id)} style={{
                    flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: 10, cursor: 'pointer',
                    background: trackingId === b.id ? accent : `linear-gradient(135deg, ${accent}18, ${accent}08)`,
                    border: `1px solid ${accent}25`,
                    color: trackingId === b.id ? '#fff' : accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                  }}>
                    <Icon name="location_on" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {trackingId === b.id ? 'Hide Location' : 'Track Location'}
                  </button>
                )}
                {b.status === 'completed' && (
                  <>
                    <button onClick={() => { setRatingModal(b); setRatingValue(0); setRatingComment(''); }} style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
                      border: `1px solid ${accent}25`,
                      color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em',
                    }}>
                      <Icon name="star" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Rate Trip
                    </button>
                    <a href={`/api/invoices/${b.id}`} target="_blank" rel="noreferrer" style={{
                      textDecoration: 'none', flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: 10,
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      color: C.sub, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                    }}>
                      <Icon name="receipt" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Invoice
                    </a>
                  </>
                )}
                {b.status === 'cancelled' && (
                  <Link to="/" style={{
                    textDecoration: 'none', flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: 10,
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    color: C.sub, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                  }}>
                    <Icon name="refresh" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Rebook
                  </Link>
                )}
              </div>

              {/* Live Driver Location Map */}
              {trackingId === b.id && (b.status === 'confirmed' || b.status === 'in-transit') && (
                <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  <div style={{ height: 200 }}>
                    <MapView
                      center={driverLoc ? [driverLoc.lat, driverLoc.lng] : [b.pickup?.lat || 19.076, b.pickup?.lng || 72.877]}
                      zoom={14}
                      markers={[
                        ...(b.pickup ? [{ position: [b.pickup.lat, b.pickup.lng], popup: 'Pickup', icon: 'pickup' }] : []),
                        ...(b.dropoff ? [{ position: [b.dropoff.lat, b.dropoff.lng], popup: 'Dropoff', icon: 'dropoff' }] : []),
                        ...(driverLoc ? [{ position: [driverLoc.lat, driverLoc.lng], popup: 'Driver', iconHtml: createTruckIcon() }] : []),
                      ]}
                    />
                  </div>
                  <div style={{ padding: '8px 12px', background: driverLoc ? (isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5') : (isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC'), display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name={driverLoc ? 'local_shipping' : 'hourglass_top'} size={14} style={{ color: driverLoc ? '#10B981' : C.muted }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: driverLoc ? '#10B981' : C.muted }}>
                      {driverLoc ? 'Driver is on the way' : 'Waiting for driver location...'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16 }} onClick={() => setRatingModal(null)}>
          <div style={{ ...box, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Rate Your Driver</span>
              <button onClick={() => setRatingModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted }}><Icon name="close" size={20} /></button>
            </div>
            <div style={{ fontSize: 12, color: C.sub }}>Booking: {ratingModal.id}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRatingValue(s)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Icon name="star" filled={s <= ratingValue} size={36} style={{ color: s <= ratingValue ? (isDark ? '#FFD700' : '#F59E0B') : C.muted }} />
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: C.text }}>{ratingValue > 0 ? ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][ratingValue] : 'Tap to rate'}</div>
            <textarea rows={3} placeholder="Leave a comment (optional)..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#fff', color: C.text, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            <button onClick={handleRate} disabled={!ratingValue || submitting} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: !ratingValue ? C.muted : C.accent, color: isDark ? '#000' : '#fff', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
