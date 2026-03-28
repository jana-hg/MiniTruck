import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';
import { API_BASE } from '../../config/constants';
import { isBiometricReady, hasBiometricCredential, registerBiometric, authenticateWithBiometric, removeBiometricCredential } from '../../services/biometric';
// import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../config/firebase';
import { sendMockOtp } from '../../config/otpMock';

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
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  // Biometric states
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'otp'
  const [otpLoginSent, setOtpLoginSent] = useState(false);
  const [otpLoginValue, setOtpLoginValue] = useState('');
  const [otpLoginSending, setOtpLoginSending] = useState(false);
  const [otpLoginConfirm, setOtpLoginConfirm] = useState(null);
  const [otpLoginTimer, setOtpLoginTimer] = useState(0);
  const recaptchaLoginRef = { current: null };

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpConfirm, setForgotOtpConfirm] = useState(null);
  const [forgotVerified, setForgotVerified] = useState(false);
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [forgotSaving, setForgotSaving] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotTimer, setForgotTimer] = useState(0);
  const [forgotUserId, setForgotUserId] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pendingChangeData, setPendingChangeData] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricCredential, setBiometricCredential] = useState(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(null); // store login data for biometric prompt

  const [bioAutoTriggered, setBioAutoTriggered] = useState(false);

  useEffect(() => {
    (async () => {
      const ready = await isBiometricReady();
      setBiometricAvailable(ready);
      if (ready) {
        const cred = hasBiometricCredential();
        if (cred && cred.role === role) {
          setBiometricCredential(cred);
          // Auto-trigger fingerprint login on page load
          if (!bioAutoTriggered) {
            setBioAutoTriggered(true);
            setBiometricLoading(true);
            try {
              const data = await authenticateWithBiometric();
              login({ id: data.user?.id, name: data.user?.name }, data.role || role, data.token);
              navigate(cfg.redirect);
            } catch {
              setBiometricLoading(false);
              // Silent fail — user can tap manually or use password
            }
          }
        } else {
          setBiometricCredential(null);
        }
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

  const completeLogin = async (data) => {
    // Check if driver must change password on first login
    if (data.user?.mustChangePassword) {
      setPendingChangeData(data);
      setShowPasswordChange(true);
      return;
    }

    // Check if we should prompt for biometric enablement
    const ready = await isBiometricReady();
    const stored = hasBiometricCredential();
    if (ready && (!stored || stored.userId !== data.user?.id)) {
      setPendingUser(data);
      setShowBioPrompt(true);
      return;
    }

    login({ id: data.user?.id || formId, name: data.user?.name || formId }, data.role || role, data.token);
    navigate(cfg.redirect);
  };

  const handleEnableBio = async () => {
    if (!pendingUser) return;
    setLoading(true);
    try {
      const success = await registerBiometric(pendingUser.user.id, pendingUser.role);
      if (success) {
        // Now finalize login
        login({ id: pendingUser.user.id, name: pendingUser.user.name }, pendingUser.role, pendingUser.token);
        navigate(cfg.redirect);
      } else {
        // Even if bio registration failed, let user login
        login({ id: pendingUser.user.id, name: pendingUser.user.name }, pendingUser.role, pendingUser.token);
        navigate(cfg.redirect);
      }
    } catch (err) {
      console.error('Bio enable failed:', err);
      login({ id: pendingUser.user.id, name: pendingUser.user.name }, pendingUser.role, pendingUser.token);
      navigate(cfg.redirect);
    }
    setLoading(false);
    setShowBioPrompt(false);
  };

  const handleSkipBio = () => {
    if (pendingUser) {
      login({ id: pendingUser.user.id, name: pendingUser.user.name }, pendingUser.role, pendingUser.token);
      navigate(cfg.redirect);
    }
    setShowBioPrompt(false);
  };

  // OTP login timer
  useEffect(() => {
    if (otpLoginTimer <= 0) return;
    const t = setTimeout(() => setOtpLoginTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpLoginTimer]);

  const sendLoginOtp = async () => {
    const digits = formId.replace(/\D/g, '');
    if (digits.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    setOtpLoginSending(true); setError('');
    try {
      // Check if account exists first
      const checkRes = await fetch(`${API_BASE}/auth/lookup-phone`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: digits, role }) });
      if (!checkRes.ok) {
        setOtpLoginSending(false);
        setError(`No ${role} account found with this number. Please register first.`);
        return;
      }

      const result = await sendMockOtp(`+91${digits}`);
      setOtpLoginConfirm(result);
      setOtpLoginSent(true);
      setOtpLoginTimer(60);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    }
    setOtpLoginSending(false);
  };

  const verifyLoginOtp = async () => {
    if (!otpLoginConfirm) { setError('Send OTP first'); return; }
    setLoading(true); setError('');
    try {
      await otpLoginConfirm.confirm(otpLoginValue);
      const digits = formId.replace(/\D/g, '');
      // Get verify token first
      const vRes = await fetch(`${API_BASE}/auth/verify-otp-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: digits, role }) });
      const vData = await vRes.json();
      if (!vRes.ok) { setLoading(false); setError(vData.error || 'Verification failed'); return; }
      // Now login with verify token
      const res = await fetch(`${API_BASE}/auth/login-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: digits, role, verifyToken: vData.verifyToken }) });
      const data = await res.json();
      if (!res.ok || data.error) { setLoading(false); setError(data.error || 'Login failed'); return; }
      setLoading(false);
      completeLogin(data);
    } catch (err) {
      setLoading(false);
      setError(err.code === 'auth/invalid-verification-code' ? 'Invalid OTP' : 'Verification failed');
    }
  };

  // Forgot password timer
  useEffect(() => {
    if (forgotTimer <= 0) return;
    const t = setTimeout(() => setForgotTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [forgotTimer]);

  const sendForgotOtp = async () => {
    const digits = forgotPhone.replace(/\D/g, '');
    if (digits.length < 10) { setForgotError('Enter a valid 10-digit phone number'); return; }
    setForgotSending(true); setForgotError('');
    try {
      // First check if account exists with this phone
      const checkRes = await fetch(`${API_BASE}/auth/lookup-phone`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: digits, role }) });
      const checkData = await checkRes.json();
      if (!checkRes.ok || !checkData.userId) {
        setForgotSending(false);
        setForgotError(`No ${role} account found with this phone number. Please register first.`);
        return;
      }
      setForgotUserId(checkData.userId);

      // Account exists — send mock OTP
      const result = await sendMockOtp(`+91${digits}`);
      setForgotOtpConfirm(result);
      setForgotOtpSent(true);
      setForgotTimer(60);
    } catch (err) {
      setForgotError(err.message || 'Failed to send OTP');
    }
    setForgotSending(false);
  };

  const [forgotVerifyToken, setForgotVerifyToken] = useState('');

  const verifyForgotOtp = async () => {
    if (!forgotOtpConfirm) return;
    setForgotError('');
    try {
      await forgotOtpConfirm.confirm(forgotOtp);
      const digits = forgotPhone.replace(/\D/g, '');
      // Get verify token (proves OTP was verified)
      const res = await fetch(`${API_BASE}/auth/verify-otp-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: digits, role }) });
      const data = await res.json();
      if (!res.ok) { setForgotError(data.error || 'Verification failed'); return; }
      if (data.userId) setForgotUserId(data.userId);
      setForgotVerifyToken(data.verifyToken);
      setForgotVerified(true);
    } catch (err) {
      setForgotError(err.code === 'auth/invalid-verification-code' ? 'Invalid OTP' : 'Verification failed');
    }
  };

  const handleForgotReset = async () => {
    if (forgotNewPin.length !== 4) { setForgotError('Enter 4 digits'); return; }
    if (forgotNewPin !== forgotConfirmPin) { setForgotError('Passwords do not match'); return; }
    setForgotSaving(true); setForgotError('');
    try {
      const digits = forgotPhone.replace(/\D/g, '');
      const res = await fetch(`${API_BASE}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: digits, newPassword: forgotNewPin, role, verifyToken: forgotVerifyToken }) });
      const data = await res.json();
      if (!res.ok || data.error) { setForgotSaving(false); setForgotError(data.error || 'Failed'); return; }
      setForgotSaving(false);
      setForgotDone(true);
    } catch { setForgotSaving(false); setForgotError('Server error'); }
  };

  const resetForgot = () => { setShowForgot(false); setForgotPhone(''); setForgotOtpSent(false); setForgotOtp(''); setForgotVerified(false); setForgotNewPin(''); setForgotConfirmPin(''); setForgotDone(false); setForgotError(''); setForgotUserId(''); setForgotVerifyToken(''); };

  const handlePinChange = async () => {
    setPinError('');
    if (newPin.length !== 4) { setPinError('Enter 4 digits'); return; }
    if (newPin !== confirmPin) { setPinError('PINs do not match'); return; }
    if (newPin === '1234') { setPinError('Choose a different PIN'); return; }
    setPinSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pendingChangeData.user.id, oldPassword: formPass, newPassword: newPin, role }) });
      const data = await res.json();
      if (!res.ok || data.error) { setPinSaving(false); setPinError(data.error || 'Failed'); return; }
      setPinSaving(false);
      // Now complete login
      login({ id: pendingChangeData.user.id, name: pendingChangeData.user.name }, pendingChangeData.role || role, pendingChangeData.token);
      navigate(cfg.redirect);
    } catch { setPinSaving(false); setPinError('Server error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (step === 1 && role === 'admin' && formId && formPass) {
        const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: formId, password: formPass, role }) });
        const data = await res.json();
        if (!res.ok || data.error) { setLoading(false); setError('Invalid credentials'); return; }
        setLoading(false); setStep(2); return;
      }
      if (step === 1 && formId && formPass) {
        const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: formId, password: formPass, role }) });
        const data = await res.json();

        // DRIVER VERIFICATION: Handle verification errors
        if (!res.ok || data.error) {
          setLoading(false);

          // Check if 403 Forbidden (verification issue)
          if (res.status === 403) {
            const errorMsg = data.error || '';

            if (errorMsg.includes('RC') || errorMsg.includes('Certificate')) {
              setError('⏳ Your Registration Certificate is pending verification. Please wait for admin approval.');
            } else if (errorMsg.includes('photo') || errorMsg.includes('Photo')) {
              setError('⏳ Your profile photo is pending verification. Please wait for admin approval.');
            } else if (errorMsg.includes('approval')) {
              setError('⏳ Your account is pending approval. Check back soon!');
            } else if (errorMsg.includes('rejected')) {
              setError('❌ Your application was rejected. Please contact support.');
            } else {
              setError(errorMsg);
            }
          } else {
            setError(data.error || 'Invalid credentials');
          }
          return;
        }

        setLoading(false);
        // If biometric is available and not yet registered for this role, prompt
        if (biometricAvailable && !hasBiometricCredential()) {
          setPendingLogin(data);
          setShowBiometricPrompt(true);
          return;
        }
        completeLogin(data);
      } else if (step === 2) {
        const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: formId, password: formPass, role: 'admin' }) });
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
      // First complete login so auth data is in localStorage for biometric to save
      login({ id: pendingLogin.user?.id || formId, name: pendingLogin.user?.name || formId }, pendingLogin.role || role, pendingLogin.token);
      await registerBiometric(pendingLogin.user.id, role);
      setBiometricCredential({ userId: pendingLogin.user.id, role });
      navigate(cfg.redirect);
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
    <div style={{ 
      height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', 
      paddingTop: 'calc(16px + env(safe-area-inset-top))',
      paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
      paddingLeft: 'calc(16px + env(safe-area-inset-left))',
      paddingRight: 'calc(16px + env(safe-area-inset-right))',
      overflow: 'hidden', boxSizing: 'border-box' 
    }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 400, maxHeight: '95vh', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', background: `${clr}12` }}>
            <Icon name={cfg.icon} filled size={26} style={{ color: clr }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>{cfg.title}</h2>
          <p style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>Welcome back to MiniTruck</p>
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

            {/* Forgot Password Flow */}
            {showForgot && (
              <motion.div key="forgot" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '12px 0' }}>

                {forgotDone ? (
                  /* Success */
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Icon name="check_circle" filled size={28} style={{ color: clr }} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Password Reset!</h3>
                    <p style={{ fontSize: 12, color: C.sub, margin: '0 0 16px' }}>You can now login with your new password.</p>
                    <button onClick={resetForgot}
                      style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: clr, color: '#fff' }}>
                      Back to Login
                    </button>
                  </div>
                ) : !forgotVerified ? (
                  /* Step 1 & 2: Phone + OTP */
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 4 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <Icon name="lock_reset" size={24} style={{ color: clr }} />
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Reset Password</h3>
                      <p style={{ fontSize: 11, color: C.sub, margin: '4px 0 0' }}>Enter your phone number to verify</p>
                    </div>

                    <div>
                      <label style={labelStyle}>Phone Number</label>
                      <div style={{ display: 'flex', gap: 0 }}>
                        <div style={{ padding: '12px 10px', borderRadius: '10px 0 0 10px', border: `1px solid ${C.border}`, borderRight: 'none', background: isDark ? '#27272A' : '#E2E8F0', fontSize: 13, fontWeight: 700, color: C.sub }}>+91</div>
                        <input type="tel" inputMode="numeric" maxLength={10} placeholder="Enter phone number" value={forgotPhone}
                          onChange={e => { setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setForgotOtpSent(false); setForgotOtp(''); }}
                          style={{ ...inputStyle, borderRadius: '0 10px 10px 0' }} />
                      </div>
                    </div>

                    {!forgotOtpSent ? (
                      <button onClick={sendForgotOtp} disabled={forgotSending || forgotPhone.length < 10}
                        style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: forgotPhone.length >= 10 ? clr : C.muted, color: '#fff', opacity: forgotSending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Icon name="sms" size={16} /> {forgotSending ? 'Sending...' : 'Send OTP'}
                      </button>
                    ) : (
                      <>
                        <div>
                          <label style={labelStyle}>Enter OTP</label>
                          <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={forgotOtp}
                            onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.3em', fontSize: 18, fontWeight: 700 }} />
                        </div>
                        <button onClick={verifyForgotOtp} disabled={forgotOtp.length < 6}
                          style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: forgotOtp.length >= 6 ? clr : C.muted, color: '#fff' }}>
                          Verify OTP
                        </button>
                        {forgotTimer > 0 ? (
                          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>Resend in {forgotTimer}s</div>
                        ) : (
                          <button onClick={sendForgotOtp} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: clr, textAlign: 'center' }}>Resend OTP</button>
                        )}
                      </>
                    )}

                    {forgotError && <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, margin: 0 }}>{forgotError}</p>}
                    <button onClick={resetForgot} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.sub, padding: 4 }}>
                      ← Back to Login
                    </button>
                    <div id="recaptcha-forgot" />
                  </>
                ) : (
                  /* Step 3: Set new password */
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 4 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <Icon name="verified" size={24} style={{ color: '#10B981' }} />
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Phone Verified!</h3>
                      <p style={{ fontSize: 11, color: C.sub, margin: '4px 0 0' }}>Set your new password</p>
                    </div>
                    {/* Show User ID */}
                    {forgotUserId && (
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: isDark ? '#34D399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your User ID</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: '0.06em', marginTop: 2 }}>{forgotUserId}</div>
                        </div>
                        <button onClick={() => navigator.clipboard?.writeText(forgotUserId)} type="button"
                          style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: clr }}>
                          <Icon name="content_copy" size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Copy
                        </button>
                      </div>
                    )}
                    <div>
                      <label style={labelStyle}>New Password (4 digits)</label>
                      <input type="password" inputMode="numeric" maxLength={4} placeholder="● ● ● ●" value={forgotNewPin}
                        onChange={e => setForgotNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5em', fontSize: 22, fontWeight: 900 }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm Password</label>
                      <input type="password" inputMode="numeric" maxLength={4} placeholder="● ● ● ●" value={forgotConfirmPin}
                        onChange={e => setForgotConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5em', fontSize: 22, fontWeight: 900, borderColor: forgotConfirmPin.length === 4 ? (forgotConfirmPin === forgotNewPin ? '#10B981' : '#EF4444') : C.border }} />
                    </div>
                    {forgotError && <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, margin: 0 }}>{forgotError}</p>}
                    <button onClick={handleForgotReset} disabled={forgotSaving || forgotNewPin.length < 4 || forgotConfirmPin.length < 4}
                      style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: (forgotNewPin.length === 4 && forgotConfirmPin === forgotNewPin) ? clr : C.muted, color: '#fff', opacity: forgotSaving ? 0.7 : 1 }}>
                      {forgotSaving ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* Force Password Change */}
            {showPasswordChange && (
              <motion.div key="pin-change" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="lock_reset" size={28} style={{ color: clr }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, textAlign: 'center' }}>Set Your New Password</h3>
                <p style={{ fontSize: 11, color: C.sub, textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
                  Your account was created by admin. Choose a 4-digit PIN as your new password.
                </p>
                <div style={{ width: '100%' }}>
                  <label style={labelStyle}>New 4-Digit PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} placeholder="● ● ● ●" value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 22, fontWeight: 800 }} />
                </div>
                <div style={{ width: '100%' }}>
                  <label style={labelStyle}>Confirm PIN</label>
                  <input type="password" inputMode="numeric" maxLength={4} placeholder="● ● ● ●" value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: 22, fontWeight: 800, borderColor: confirmPin.length === 4 && confirmPin === newPin ? '#10B981' : confirmPin.length === 4 ? '#EF4444' : C.border }} />
                </div>
                {pinError && <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, margin: 0 }}>{pinError}</p>}
                <button onClick={handlePinChange} disabled={pinSaving || newPin.length < 4 || confirmPin.length < 4}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: (newPin.length === 4 && confirmPin.length === 4) ? clr : C.muted, color: '#fff', opacity: pinSaving ? 0.7 : 1 }}>
                  {pinSaving ? 'Saving...' : 'Set Password & Login'}
                </button>
              </motion.div>
            )}

            {/* Normal Login Form */}
            {!showBiometricPrompt && !showPasswordChange && !showForgot && step === 1 && (
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

                {/* Login mode toggle - customer & driver */}
                {(role === 'customer' || role === 'driver') && (
                  <div style={{ display: 'flex', background: isDark ? '#27272A' : '#E2E8F0', borderRadius: 8, padding: 3, marginBottom: 2 }}>
                    <button type="button" onClick={() => { setLoginMode('password'); setOtpLoginSent(false); setOtpLoginValue(''); setError(''); }}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: loginMode === 'password' ? clr : 'transparent', color: loginMode === 'password' ? '#fff' : C.sub }}>
                      Password
                    </button>
                    <button type="button" onClick={() => { setLoginMode('otp'); setError(''); }}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: loginMode === 'otp' ? clr : 'transparent', color: loginMode === 'otp' ? '#fff' : C.sub }}>
                      Login with OTP
                    </button>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>{loginMode === 'otp' ? 'Phone Number' : role === 'customer' ? 'Phone Number' : role === 'driver' ? 'Driver ID' : 'Admin ID'}</label>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {(role === 'customer' || loginMode === 'otp') && (
                      <div style={{ padding: '12px 10px', borderRadius: '10px 0 0 10px', border: `1px solid ${C.border}`, borderRight: 'none', background: isDark ? '#27272A' : '#E2E8F0', fontSize: 13, fontWeight: 700, color: C.sub }}>+91</div>
                    )}
                    <input type={(role === 'customer' || loginMode === 'otp') ? 'tel' : 'text'}
                      placeholder={loginMode === 'otp' ? 'Enter phone number' : role === 'customer' ? 'Enter phone number' : role === 'driver' ? 'Enter Driver ID' : 'Enter admin ID'}
                      value={formId} onChange={e => { setFormId((role === 'customer' || loginMode === 'otp') ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value); setOtpLoginSent(false); }}
                      inputMode={(role === 'customer' || loginMode === 'otp') ? 'numeric' : 'text'} maxLength={(role === 'customer' || loginMode === 'otp') ? 10 : undefined}
                      required style={{ ...inputStyle, borderRadius: (role === 'customer' || loginMode === 'otp') ? '0 10px 10px 0' : 10 }} />
                  </div>
                </div>

                {/* Password mode */}
                {loginMode === 'password' && (
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input type="password" placeholder="Enter password" value={formPass} onChange={e => setFormPass(e.target.value)} required style={inputStyle} />
                  </div>
                )}

                {/* OTP mode */}
                {loginMode === 'otp' && (role === 'customer' || role === 'driver') && (
                  <>
                    {!otpLoginSent ? (
                      <button type="button" onClick={sendLoginOtp} disabled={otpLoginSending || formId.replace(/\D/g, '').length < 10}
                        style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: formId.replace(/\D/g, '').length >= 10 ? clr : C.muted, color: '#fff', opacity: otpLoginSending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Icon name="sms" size={16} />
                        {otpLoginSending ? 'Sending...' : 'Send OTP'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Enter OTP</label>
                          <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={otpLoginValue}
                            onChange={e => setOtpLoginValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.3em', fontSize: 18, fontWeight: 700 }} />
                        </div>
                        <button type="button" onClick={verifyLoginOtp} disabled={loading || otpLoginValue.length < 6}
                          style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: otpLoginValue.length >= 6 ? clr : C.muted, color: '#fff', opacity: loading ? 0.7 : 1 }}>
                          {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                        {otpLoginTimer > 0 ? (
                          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>Resend in {otpLoginTimer}s</div>
                        ) : (
                          <button type="button" onClick={sendLoginOtp} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: clr, textAlign: 'center' }}>Resend OTP</button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {error && <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, margin: 0 }}>{error}</p>}

                {/* Password login submit */}
                {loginMode === 'password' && (
                  <button type="submit" disabled={loading}
                    style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: clr, color: '#fff', opacity: loading ? 0.7 : 1, marginTop: 2 }}>
                    {loading ? 'Authenticating...' : role === 'admin' ? 'Continue' : 'Login'}
                  </button>
                )}

                <div id="recaptcha-login" />
              </motion.form>
            )}

            {!showBiometricPrompt && !showPasswordChange && !showForgot && step === 2 && (
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
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}` }}>
          {role === 'customer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/register-user" style={{ textDecoration: 'none', display: 'block', width: '100%', padding: '10px 0', textAlign: 'center', borderRadius: 8, border: `1.5px solid ${clr}`, fontSize: 13, fontWeight: 700, color: clr }}>
                Create Account
              </Link>
              <button onClick={() => { setShowForgot(true); setError(''); }} type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted, padding: 2, textAlign: 'center' }}>
                Forgot Password?
              </button>
            </div>
          )}
          {role === 'driver' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/register-driver" style={{ textDecoration: 'none', display: 'block', width: '100%', padding: '10px 0', textAlign: 'center', borderRadius: 8, border: `1.5px solid ${clr}`, fontSize: 13, fontWeight: 700, color: clr }}>
                Register as Driver
              </Link>
              <button onClick={() => { setShowForgot(true); setError(''); }} type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted, padding: 2, textAlign: 'center' }}>
                Forgot Password?
              </button>
            </div>
          )}
          {role === 'admin' && (
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>Secure Admin Login</span>
            </div>
          )}
        </div>
        
        {/* Biometric Enablement Prompt */}
        {showBioPrompt && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: isDark ? 'rgba(9,9,11,0.98)' : 'rgba(255,255,255,0.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Icon name="fingerprint" size={36} style={{ color: clr }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 12px' }}>Enable Fingerprint?</h3>
            <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, margin: '0 0 32px' }}>Speed up your future logins with your device's fingerprint scanner. It's fast and secure.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 220 }}>
              <button onClick={handleEnableBio} disabled={loading}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: clr, color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? 'Setting up...' : 'Enable Now'}
              </button>
              <button onClick={handleSkipBio} disabled={loading}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
