import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { bookings as bookingsApi, ratings as ratingsApi } from '../../services/api';
import Icon from '../../components/ui/Icon';
import StatusBadge from '../../components/ui/StatusBadge';

const FILTERS = ['all', 'active', 'completed', 'cancelled'];

export default function MyBookings() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [ratingModal, setRatingModal] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9', card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
  };

  useEffect(() => {
    bookingsApi.getBookings({ userId: user?.id }).then(d => Array.isArray(d) && setBookings(d)).catch(() => {
      bookingsApi.getBookings({}).then(d => Array.isArray(d) && setBookings(d)).catch(() => {});
    });
  }, [user]);

  const filtered = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'active') return b.status === 'confirmed' || b.status === 'in-transit';
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

  const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: C.shadow };

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
            {f} ({f === 'all' ? bookings.length : bookings.filter(b => f === 'active' ? (b.status === 'confirmed' || b.status === 'in-transit') : b.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ ...box, padding: '48px 20px', textAlign: 'center' }}><Icon name="inventory_2" size={48} style={{ color: C.muted, marginBottom: 12 }} /><div style={{ fontSize: 14, color: C.sub }}>No bookings found</div></div>}

      {/* Bookings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {filtered.map(b => (
          <div key={b.id} style={box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div><div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{b.id}</div><div style={{ fontSize: 10, color: C.muted }}>{new Date(b.createdAt).toLocaleDateString()}</div></div>
              <StatusBadge status={b.status} />
            </div>
            {/* Route */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: C.accent }} />
                <div style={{ width: 1, height: 22, background: C.border }} />
                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#3B82F6' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.pickup?.address || 'Pickup'}</div>
                <div style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 14 }}>{b.dropoff?.address || 'Dropoff'}</div>
              </div>
            </div>
            {/* Cargo + Fare */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}`, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub }}>
                <Icon name="inventory_2" size={14} />{b.cargo?.loadType || b.cargo?.type || '--'} · {b.cargo?.weight || '--'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>₹{b.fare?.total?.toFixed(2) || '0'}</div>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 10 }}>
              {(b.status === 'confirmed' || b.status === 'in-transit') && (
                <Link to={`/tracking/${b.id}`} style={{ textDecoration: 'none', flex: 1, padding: '8px 0', textAlign: 'center', borderRadius: 8, background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600 }}>
                  <Icon name="location_on" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Track
                </Link>
              )}
              {b.status === 'completed' && (
                <>
                  <button onClick={() => { setRatingModal(b); setRatingValue(0); setRatingComment(''); }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    <Icon name="star" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Rate
                  </button>
                  <a href={`/api/invoices/${b.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flex: 1, padding: '8px 0', textAlign: 'center', borderRadius: 8, background: isDark ? '#27272A' : '#F1F5F9', color: C.sub, fontSize: 12, fontWeight: 600 }}>
                    <Icon name="receipt" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Invoice
                  </a>
                </>
              )}
              {b.status === 'cancelled' && (
                <Link to="/" style={{ textDecoration: 'none', flex: 1, padding: '8px 0', textAlign: 'center', borderRadius: 8, background: isDark ? '#27272A' : '#F1F5F9', color: C.sub, fontSize: 12, fontWeight: 600 }}>
                  <Icon name="refresh" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Rebook
                </Link>
              )}
            </div>
          </div>
        ))}
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
