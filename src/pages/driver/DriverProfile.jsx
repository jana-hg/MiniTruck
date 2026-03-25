import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { drivers as driversApi } from '../../services/api';
import Icon from '../../components/ui/Icon';

export default function DriverProfile() {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [driver, setDriver] = useState(null);

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9', card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
  };

  useEffect(() => {
    if (user?.id) driversApi.getDriver(user.id).then(setDriver).catch(() => {});
  }, [user]);

  if (!driver) return <div style={{ padding: '80px 0', textAlign: 'center', color: C.muted }}>Loading...</div>;

  const docs = driver.documents || {};
  const vehicle = driver.vehicleDetails || {};

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Driver Profile</div>

      {/* Profile Card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, display: 'flex', alignItems: 'center', gap: 20, boxShadow: C.shadow }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg, border: `2px solid ${C.accent}`, flexShrink: 0 }}>
          <Icon name="person" filled size={32} style={{ color: C.accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{driver.name}</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{driver.rank} · ID: {driver.id}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Icon name="star" filled size={16} style={{ color: '#FBBF24' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{driver.rating}</span>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>({driver.stats?.totalTrips || 0} trips)</span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: C.shadow }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Contact</div>
        {[
          { icon: 'call', value: driver.phone },
          { icon: 'local_shipping', value: driver.truckId },
        ].map(c => (
          <div key={c.icon} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
              <Icon name={c.icon} size={16} style={{ color: C.accent }} />
            </div>
            <span style={{ fontSize: 14, color: C.text }}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* Vehicle Details */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: C.shadow }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Vehicle Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { l: 'Make', v: vehicle.make || '--' },
            { l: 'Model', v: vehicle.model || '--' },
            { l: 'Year', v: vehicle.year || '--' },
            { l: 'Plate Number', v: vehicle.plateNumber || '--' },
          ].map(item => (
            <div key={item.l}>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: C.shadow }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Document Verification</div>
        {[
          { label: 'Driving License', status: docs.license },
          { label: 'Insurance', status: docs.insurance },
          { label: 'Vehicle Registration', status: docs.registration },
        ].map(d => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 14, color: C.text }}>{d.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4, background: d.status === 'verified' ? (isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5') : (isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB'), color: d.status === 'verified' ? '#10B981' : '#F59E0B' }}>
              <Icon name={d.status === 'verified' ? 'verified' : 'pending'} size={14} />
              {d.status || 'pending'}
            </span>
          </div>
        ))}
      </div>

      {/* Earnings Summary */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: C.shadow }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Earnings</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.accent, marginTop: 4 }}>₹{(driver.earnings || 0).toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Service Level</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text, marginTop: 4 }}>{driver.stats?.serviceLevel || 0}%</div>
        </div>
      </div>

      {/* Logout */}
      <button onClick={logout} style={{ width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'}`, color: '#EF4444' }}>
        <Icon name="logout" size={18} /> Sign Out
      </button>
    </div>
  );
}
