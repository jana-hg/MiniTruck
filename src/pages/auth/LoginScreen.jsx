import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';

const ROLE_CFG = {
  customer: { icon: 'person', title: 'Customer Login', redirect: '/', clr: '#3B82F6', dark: '#60A5FA' },
  driver: { icon: 'local_shipping', title: 'Driver Login', redirect: '/driver', clr: '#10B981', dark: '#34D399' },
  admin: { icon: 'shield', title: 'Admin Login', redirect: '/admin', clr: '#8B5CF6', dark: '#A78BFA' },
};

export default function LoginScreen({ role = 'customer' }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();
  const cfg = ROLE_CFG[role] || ROLE_CFG.customer;
  const clr = isDark ? cfg.dark : cfg.clr;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formId, setFormId] = useState('');
  const [formPass, setFormPass] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9',
    card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
    inputBg: isDark ? '#09090B' : '#F8FAFC',
  };

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6, display: 'block' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (step === 1 && role === 'admin' && formId && formPass) {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: formId, password: formPass, role }) });
        const data = await res.json();
        if (!res.ok || data.error) { setLoading(false); setError('Invalid credentials'); return; }
        setLoading(false); setStep(2); return;
      }
      if (step === 1 && formId && formPass) {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: formId, password: formPass, role }) });
        const data = await res.json();
        if (!res.ok || data.error) { setLoading(false); setError('Invalid credentials'); return; }
        login({ id: data.user?.id || formId, name: data.user?.name || formId }, role, data.token);
        setLoading(false); navigate(cfg.redirect);
      } else if (step === 2) {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: formId, password: formPass, role: 'admin' }) });
        const data = await res.json();
        if (!res.ok || data.error) { setLoading(false); setError('Invalid credentials'); return; }
        login({ id: data.user?.id || formId, name: data.user?.name || 'Admin' }, 'admin', data.token);
        setLoading(false); navigate(cfg.redirect);
      } else { setLoading(false); setError('Fill in both fields'); }
    } catch { setLoading(false); setError('Server error. Try again.'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 400, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: `${clr}15` }}>
            <Icon name={cfg.icon} filled size={24} style={{ color: clr }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>{cfg.title}</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Enter your credentials</p>
        </div>

        {/* Form */}
        <div style={{ padding: '0 24px 24px' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form key="s1" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}
                onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>ID</label>
                  <input type="text" placeholder="Enter your ID" value={formId} onChange={e => setFormId(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" placeholder="Enter password" value={formPass} onChange={e => setFormPass(e.target.value)} required style={inputStyle} />
                </div>
                {error && <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, margin: 0 }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: clr, color: '#fff', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
                  {loading ? 'Authenticating...' : role === 'admin' ? 'Continue' : 'Login'}
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form key="s2" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}
                onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '14px 16px', borderRadius: 10, background: isDark ? '#27272A' : '#F8FAFC', textAlign: 'center' }}>
                  <Icon name="verified_user" size={24} style={{ color: clr, marginBottom: 6 }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>Two-Factor Verification</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>Enter the OTP sent to your device</p>
                </div>
                <div>
                  <label style={labelStyle}>OTP Code</label>
                  <input type="text" placeholder="000000" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.3em', fontSize: 18, fontWeight: 700 }} />
                </div>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: clr, color: '#fff', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Verifying...' : 'Verify & Enter'}
                </button>
                <button type="button" onClick={() => setStep(1)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.sub, padding: 4 }}>
                  ← Back to credentials
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>Secure Login</span>
          <Link to="/login" style={{ textDecoration: 'none', fontSize: 11, fontWeight: 600, color: clr }}>Switch Portal</Link>
        </div>
      </motion.div>
    </div>
  );
}
