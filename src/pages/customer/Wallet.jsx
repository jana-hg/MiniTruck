import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { wallet as walletApi } from '../../services/api';
import Icon from '../../components/ui/Icon';

const PRESETS = [500, 1000, 2000, 5000];

export default function Wallet() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [walletData, setWalletData] = useState({ balance: 0, transactions: [] });
  const [topupAmount, setTopupAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const C = { card: isDark ? '#18181B' : '#FFFFFF', border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A', sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8', accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF', shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)', rowAlt: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' };
  const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: C.shadow };

  const fetchWallet = () => { if (user?.id) walletApi.getWallet(user.id).then(setWalletData).catch(() => {}); };
  useEffect(fetchWallet, [user]);

  const handleTopup = (amount) => {
    const val = parseFloat(amount || topupAmount);
    if (!val || val <= 0) return;
    setLoading(true);
    walletApi.topup(user.id, { amount: val, description: `Top-up ₹${val}` })
      .then(d => { setWalletData(d); setTopupAmount(''); setSuccess(true); setTimeout(() => setSuccess(false), 2000); })
      .finally(() => setLoading(false));
  };

  const txns = walletData.transactions || [];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Wallet</div>

      {/* Balance */}
      <div style={{ background: isDark ? 'linear-gradient(135deg,#FFD700,#FF8C00)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)', borderRadius: 14, padding: 28, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7, color: isDark ? '#000' : '#fff', marginBottom: 8 }}>Available Balance</div>
        <div style={{ fontSize: 42, fontWeight: 900, color: isDark ? '#000' : '#fff' }}>₹{(walletData.balance || 0).toLocaleString()}</div>
        {success && <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: isDark ? '#000' : '#fff', opacity: 0.8 }}>Top-up successful!</div>}
      </div>

      {/* Top Up */}
      <div style={box}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Quick Top-Up</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {PRESETS.map(a => (
            <button key={a} onClick={() => handleTopup(a)} disabled={loading}
              style={{ padding: '12px 0', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: C.text, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.accentBg; e.currentTarget.style.borderColor = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}>
              ₹{a}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="number" placeholder="Custom amount" value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: isDark ? '#09090B' : '#fff', color: C.text, fontSize: 13, outline: 'none' }} />
          <button onClick={() => handleTopup()} disabled={loading || !topupAmount}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: C.accent, color: isDark ? '#000' : '#fff', opacity: (loading || !topupAmount) ? 0.5 : 1 }}>
            {loading ? 'Adding...' : 'Add Funds'}
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div style={{ ...box, padding: 0 }}>
        <div style={{ padding: '14px 24px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Transaction History</span>
        </div>
        {txns.length === 0 && <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: C.muted }}>No transactions yet</div>}
        {txns.map((t, i) => (
          <div key={t.id} style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.rowAlt : 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.type === 'topup' ? (isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5') : (isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2') }}>
                <Icon name={t.type === 'topup' ? 'add' : 'remove'} size={16} style={{ color: t.type === 'topup' ? '#10B981' : '#EF4444' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.description}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{t.date}</div>
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.type === 'topup' ? '#10B981' : '#EF4444' }}>{t.type === 'topup' ? '+' : '-'}₹{t.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
