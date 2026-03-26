import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';
import { isBiometricReady, hasBiometricCredential, registerBiometric, authenticateWithBiometric, removeBiometricCredential } from '../../services/biometric';

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

  // Biometric states
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricCredential, setBiometricCredential] = useState(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(null); // store login data for biometric prompt

  useEffect(() => {
    (async () => {
      const ready = await isBiometricReady();
      setBiometricAvailable(ready);
      if (ready) {
        const cred = hasBiometricCredential();
        if (cred && cred.role === role) setBiometricCredential(cred);
        else setBiometricCredential(null);
      }
    })();
  }, [role]);

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

  const completeLogin = (data) => {
    login({ id: data.user?.id || formId, name: data.user?.name || formId }, data.role || role, data.token);
    navigate(cfg.redirect);
  };

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
        if (!res.ok || data.error) { setLoading(false); setError(data.error || 'Invalid credentials'); return; }
        setLoading(false);
        // If biometric is available and not yet registered for this role, prompt
        if (biometricAvailable && !hasBiometricCredential()) {
          setPendingLogin(data);
          setShowBiometricPrompt(true);
          return;
        }
        completeLogin(data);
      } else if (step === 2) {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: formId, password: formPass, role: 'admin' }) });
        const data = await res.json();
        if (!res.ok || data.error) { setLoading(false); setError('Invalid credentials'); return; }
        setLoading(false);
        completeLogin(data);
      } else { setLoading(false); setError('Fill in both fields'); }
    } catch { setLoading(false); setError('Server error. Try again.'); }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      const data = await authenticateWithBiometric();
      completeLogin(data);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Fingerprint cancelled');
      } else {
        setError('Biometric login failed. Use password instead.');
        removeBiometricCredential();
        setBiometricCredential(null);
      }
    } finally { setBiometricLoading(false); }
  };

  const handleEnableBiometric = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      await registerBiometric(pendingLogin.user.id, role);
      setBiometricCredential({ userId: pendingLogin.user.id, role });
      completeLogin(pendingLogin);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Fingerprint was cancelled. Logging in normally.');
      } else {
        setError(err.message || 'Biometric setup failed.');
      }
      // Proceed with login after 2 seconds
      setTimeout(() => completeLogin(pendingLogin), 2000);
    } finally { setBiometricLoading(false); }
  };

  const handleSkipBiometric = () => {
    if (pendingLogin) completeLogin(pendingLogin);
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
            {/* Biometric Enable Prompt */}
            {showBiometricPrompt && (
              <motion.div key="bio-prompt" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="fingerprint" size={36} style={{ color: clr }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>Enable Fingerprint Login?</h3>
                <p style={{ fontSize: 12, color: C.sub, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                  Use your fingerprint to login quickly next time without entering your password.
                </p>
                <button onClick={handleEnableBiometric} disabled={biometricLoading}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: clr, color: '#fff', opacity: biometricLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Icon name="fingerprint" size={18} style={{ color: '#fff' }} />
                  {biometricLoading ? 'Setting up...' : 'Enable Fingerprint'}
                </button>
                <button onClick={handleSkipBiometric}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.sub, padding: 4 }}>
                  Skip for now
                </button>
              </motion.div>
            )}

            {/* Normal Login Form */}
            {!showBiometricPrompt && step === 1 && (
              <motion.form key="s1" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}
                onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Biometric Login Button - shown if credential exists for this role */}
                {biometricCredential && (
                  <div style={{ marginBottom: 6 }}>
                    <button type="button" onClick={handleBiometricLogin} disabled={biometricLoading}
                      style={{
                        width: '100%', padding: '14px 0', borderRadius: 12, border: `2px solid ${clr}`,
                        background: `${clr}10`, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                        color: clr, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        opacity: biometricLoading ? 0.7 : 1
                      }}>
                      <Icon name="fingerprint" size={22} style={{ color: clr }} />
                      {biometricLoading ? 'Verifying...' : 'Login with Fingerprint'}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 4px' }}>
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                      <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>or use password</span>
                      <div style={{ flex: 1, height: 1, background: C.border }} />
                    </div>
                  </div>
                )}

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

            {!showBiometricPrompt && step === 2 && (
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
          {role === 'driver' ? (
            <Link to="/register-driver" style={{ textDecoration: 'none', fontSize: 11, fontWeight: 600, color: clr }}>Register as Driver</Link>
          ) : role === 'customer' ? (
            <Link to="/register-user" style={{ textDecoration: 'none', fontSize: 11, fontWeight: 600, color: clr }}>Create Account</Link>
          ) : (
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>Secure Login</span>
          )}
          <Link to="/login" style={{ textDecoration: 'none', fontSize: 11, fontWeight: 600, color: clr }}>Switch Portal</Link>
        </div>
      </motion.div>
    </div>
  );
}
