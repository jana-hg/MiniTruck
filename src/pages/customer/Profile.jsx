import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { users as usersApi, wallet as walletApi } from '../../services/api';
import Icon from '../../components/ui/Icon';

export default function Profile() {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [notifs, setNotifs] = useState(true);

  const C = { card: isDark ? '#18181B' : '#FFFFFF', border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A', sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8', accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF', shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)', inputBg: isDark ? '#09090B' : '#FFFFFF' };
  const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: C.shadow };
  const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.inputBg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 };

  useEffect(() => {
    if (user?.id) {
      usersApi.getProfile(user.id).then(d => { setProfile(d); setForm({ name: d.name || '', email: d.email || '', phone: d.phone || '', address: d.address || '' }); setNotifs(d.preferences?.notifications !== false); }).catch(() => {});
      walletApi.getWallet(user.id).then(d => setWalletBalance(d.balance || 0)).catch(() => {});
    }
  }, [user]);

  const handleSave = () => { setSaving(true); usersApi.updateProfile(user.id, { ...form, preferences: { notifications: notifs, defaultPayment: profile?.preferences?.defaultPayment || 'wallet' } }).then(d => { setProfile(d); setEditing(false); }).finally(() => setSaving(false)); };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 0 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>My Profile</div>

      {/* Avatar */}
      <div style={{ ...box, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg, border: `2px solid ${C.accent}`, flexShrink: 0 }}>
          <Icon name="person" filled size={32} style={{ color: C.accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || user?.name || 'User'}</div>
          <div style={{ fontSize: 13, color: C.sub }}>{profile?.email || ''}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{profile?.standing || 'Standard'} · {profile?.bookings || 0} bookings</div>
        </div>
        <button onClick={() => setEditing(!editing)} style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#27272A' : '#F1F5F9', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.sub }}>
          <Icon name={editing ? 'close' : 'edit'} size={18} />
        </button>
      </div>

      {/* Details */}
      <div style={box}>
        <div style={{ ...lbl, marginBottom: 16 }}>Personal Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[{ l: 'Full Name', k: 'name' }, { l: 'Email', k: 'email' }, { l: 'Phone', k: 'phone' }, { l: 'Address', k: 'address' }].map(f => (
            <div key={f.k}>
              <div style={lbl}>{f.l}</div>
              {editing ? <input value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} style={inp} /> : <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{profile?.[f.k] || '--'}</div>}
            </div>
          ))}
        </div>
        {editing && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: C.accent, color: isDark ? '#000' : '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditing(false)} style={{ padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${C.border}`, color: C.sub }}>Cancel</button>
          </div>
        )}
      </div>

      {/* Wallet */}
      <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg }}>
            <Icon name="account_balance_wallet" filled size={22} style={{ color: C.accent }} />
          </div>
          <div><div style={lbl}>Wallet Balance</div><div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>₹{walletBalance.toFixed(2)}</div></div>
        </div>
        <Link to="/wallet" style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: 8, background: C.accent, color: isDark ? '#000' : '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="add" size={16} /> Top Up</Link>
      </div>

      {/* Preferences */}
      <div style={box}>
        <div style={{ ...lbl, marginBottom: 16 }}>Preferences</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div><div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Push Notifications</div><div style={{ fontSize: 11, color: C.muted }}>Receive booking updates</div></div>
          <button onClick={() => { setNotifs(!notifs); if (!editing) usersApi.updateProfile(user.id, { preferences: { notifications: !notifs } }).catch(() => {}); }}
            style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', border: 'none', background: notifs ? C.accent : C.muted, transition: 'all 0.2s' }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 3, left: notifs ? 23 : 3, transition: 'all 0.2s' }} />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Default Payment</div><div style={{ fontSize: 11, color: C.muted }}>Used when booking</div></div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: 'uppercase' }}>{profile?.preferences?.defaultPayment || 'Wallet'}</span>
        </div>
      </div>

      {/* Logout */}
      <button onClick={logout} style={{ width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'}`, color: '#EF4444' }}>
        <Icon name="logout" size={18} /> Sign Out
      </button>
    </div>
  );
}
