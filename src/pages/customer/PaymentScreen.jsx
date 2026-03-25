import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { payments as paymentsApi, wallet as walletApi } from '../../services/api';
import Icon from '../../components/ui/Icon';

const METHODS = [
  { id: 'wallet', label: 'Wallet', icon: 'account_balance_wallet' },
  { id: 'upi', label: 'UPI', icon: 'smartphone' },
  { id: 'card', label: 'Card', icon: 'credit_card' },
  { id: 'cash', label: 'Cash', icon: 'payments' },
];

export default function PaymentScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');
  const amount = parseFloat(params.get('amount')) || 0;
  const [method, setMethod] = useState('wallet');
  const [walletBalance, setWalletBalance] = useState(0);
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null);

  const C = {
    card: isDark ? '#18181B' : '#FFFFFF', border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A', sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8', accent: isDark ? '#FFD700' : '#3B82F6',
    accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
    inputBg: isDark ? '#09090B' : '#FFFFFF',
  };
  const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: C.shadow };
  const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.inputBg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 };

  useEffect(() => { if (user?.id) walletApi.getWallet(user.id).then(d => setWalletBalance(d.balance || 0)).catch(() => {}); }, [user]);

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      paymentsApi.initiatePayment({ bookingId, userId: user?.id, amount, method })
        .then(res => paymentsApi.verifyPayment({ orderId: res.orderId, transactionId: res.transactionId }))
        .then(() => { if (method === 'wallet' && user?.id) walletApi.deduct(user.id, { amount, description: `Payment for ${bookingId}` }).catch(() => {}); setStatus('success'); })
        .catch(() => setStatus('failed')).finally(() => setProcessing(false));
    }, 1500);
  };

  if (status === 'success') {
    return (
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '80px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" filled size={36} style={{ color: '#10B981' }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Payment Successful!</div>
        <div style={{ fontSize: 13, color: C.sub }}>Booking <strong>{bookingId}</strong> confirmed.</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.accent }}>₹{amount.toFixed(2)}</div>
        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' }}>{method} payment</div>
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 16 }}>
          <button onClick={() => navigate('/bookings')} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: C.accent, color: isDark ? '#000' : '#fff' }}>My Bookings</button>
          <button onClick={() => navigate('/')} style={{ flex: 1, padding: '12px 0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${C.border}`, color: C.sub }}>Book Again</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Payment</div>
      {/* Summary */}
      <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={lbl}>Booking</div><div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{bookingId || 'N/A'}</div></div>
        <div style={{ textAlign: 'right' }}><div style={lbl}>Amount</div><div style={{ fontSize: 24, fontWeight: 900, color: C.accent }}>₹{amount.toFixed(2)}</div></div>
      </div>
      {/* Methods */}
      <div style={box}>
        <div style={{ ...lbl, marginBottom: 12 }}>Payment Method</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, cursor: 'pointer', background: method === m.id ? C.accentBg : 'transparent', border: method === m.id ? `2px solid ${C.accent}` : `1px solid ${C.border}`, color: method === m.id ? C.accent : C.sub }}>
              <Icon name={m.icon} size={20} /><span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Form */}
      {method === 'wallet' && (
        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: C.sub }}>Wallet Balance</span><span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>₹{walletBalance.toFixed(2)}</span></div>
          {walletBalance < amount && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}><Icon name="warning" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Insufficient balance</div>}
        </div>
      )}
      {method === 'upi' && <div style={box}><div style={lbl}>UPI ID</div><input placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} style={inp} /></div>}
      {method === 'card' && (
        <div style={box}>
          <div style={{ marginBottom: 10 }}><div style={lbl}>Card Number</div><input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value)} maxLength={19} style={inp} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><div style={lbl}>Expiry</div><input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} maxLength={5} style={inp} /></div>
            <div><div style={lbl}>CVV</div><input type="password" placeholder="***" value={cardCvv} onChange={e => setCardCvv(e.target.value)} maxLength={4} style={inp} /></div>
          </div>
        </div>
      )}
      {method === 'cash' && <div style={{ ...box, textAlign: 'center' }}><Icon name="payments" size={32} style={{ color: C.accent, marginBottom: 8 }} /><div style={{ fontSize: 14, color: C.text }}>Pay ₹{amount.toFixed(2)} in cash upon delivery</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Please have exact change ready</div></div>}
      {/* Pay button */}
      <button onClick={handlePay} disabled={processing || (method === 'wallet' && walletBalance < amount)}
        style={{ width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, background: processing ? C.muted : C.accent, color: isDark ? '#000' : '#fff', opacity: processing ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {processing ? <><Icon name="progress_activity" size={18} /> Processing...</> : <><Icon name="lock" size={18} /> Pay ₹{amount.toFixed(2)}</>}
      </button>
      {status === 'failed' && <div style={{ textAlign: 'center', fontSize: 12, color: '#EF4444' }}>Payment failed. Please try again.</div>}
    </div>
  );
}
