import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { drivers as driversApi } from '../../services/api';
import Icon from '../../components/ui/Icon';

export default function DriverEarnings() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [driver, setDriver] = useState(null);
  const [earningsData, setEarningsData] = useState({ totalEarnings: 0, entries: [] });
  const [mob, setMob] = useState(window.innerWidth < 480);
  useEffect(() => { const h = () => setMob(window.innerWidth < 480); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9', card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
    rowAlt: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
  };

  useEffect(() => {
    if (user?.id) {
      driversApi.getDriver(user.id).then(setDriver).catch(() => {});
      driversApi.getDriverEarnings(user.id).then(setEarningsData).catch(() => {});
    }
  }, [user]);

  const entries = earningsData.entries || [];
  const totalBase = entries.reduce((s, e) => s + (e.baseFare || 0), 0);
  const totalTips = entries.reduce((s, e) => s + (e.tip || 0), 0);
  const totalEarnings = earningsData.totalEarnings || 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Earnings</div>

      {/* Total Card */}
      <div style={{ background: isDark ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)', borderRadius: 16, padding: mob ? '24px 16px' : 28, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7, marginBottom: 8, color: isDark ? '#000' : '#fff' }}>Total Earnings</div>
        <div style={{ fontSize: mob ? 34 : 42, fontWeight: 900, color: isDark ? '#000' : '#fff' }}>₹{totalEarnings.toLocaleString()}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: mob ? 16 : 32, marginTop: 16 }}>
          {[{ l: 'Base Fare', v: `₹${totalBase.toFixed(0)}` }, { l: 'Tips', v: `₹${totalTips.toFixed(0)}` }, { l: 'Trips', v: entries.length }].map(s => (
            <div key={s.l} style={{ flex: mob ? 1 : 'unset' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.6, color: isDark ? '#000' : '#fff' }}>{s.l}</div>
              <div style={{ fontSize: mob ? 14 : 16, fontWeight: 700, color: isDark ? '#000' : '#fff', marginTop: 2 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance */}
      {driver && (
        <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: mob ? 10 : 12 }}>
          {[
            { icon: 'verified', label: 'Completion', value: `${driver.stats?.serviceLevel || 0}%` },
            { icon: 'schedule', label: 'On-time', value: '98%' },
            { icon: 'star', label: 'Rating', value: driver.rating },
            { icon: 'route', label: 'Total Trips', value: driver.stats?.totalTrips || entries.length },
          ].map((s, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: mob ? 14 : 16, textAlign: 'center', boxShadow: C.shadow }}>
              <Icon name={s.icon} filled={s.icon === 'star'} size={mob ? 18 : 20} style={{ color: C.accent, margin: '0 auto 6px' }} />
              <div style={{ fontSize: mob ? 16 : 18, fontWeight: 800, color: C.text }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Payout */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: mob ? 16 : 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: C.shadow, flexWrap: mob ? 'wrap' : 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg, flexShrink: 0 }}>
            <Icon name="account_balance" size={20} style={{ color: C.accent }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Next Payout</div>
            <div style={{ fontSize: 11, color: C.muted }}>Weekly · Bank Transfer</div>
          </div>
        </div>
        <div style={{ textAlign: mob ? 'left' : 'right', marginLeft: mob ? 52 : 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>₹{totalEarnings.toFixed(0)}</div>
          <div style={{ fontSize: 10, color: C.muted }}>Friday</div>
        </div>
      </div>

      {/* Trip History */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.shadow }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Trip History</span>
        </div>

        {/* Desktop table */}
        {!mob && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.rowAlt }}>
                  {['Date', 'Route', 'Distance', 'Fare', 'Tip', 'Total'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.rowAlt : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.text }}>{e.date}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.sub }}>{e.route?.from} → {e.route?.to}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.sub }}>{e.distance} km</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.text }}>₹{e.baseFare?.toFixed(0)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#10B981', fontWeight: 600 }}>{e.tip > 0 ? `+₹${e.tip}` : '--'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: C.text, textAlign: 'right' }}>₹{e.total?.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {mob && entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {entries.map((e, i) => (
              <div key={e.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.rowAlt : 'transparent' }}>
                {/* Top row: date + total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{e.date}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>₹{e.total?.toFixed(0)}</span>
                </div>
                {/* Route */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon name="route" size={14} style={{ color: C.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.route?.from} → {e.route?.to}</span>
                </div>
                {/* Bottom row: distance, fare, tip */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="straighten" size={12} />{e.distance} km
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}>Fare: ₹{e.baseFare?.toFixed(0)}</span>
                  {e.tip > 0 && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Tip: +₹{e.tip}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No earnings yet</div>}
      </div>
    </div>
  );
}
