import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../config/firebase';

export default function UserRegister() {
  const { isDark } = useTheme();
  const clr = isDark ? '#60A5FA' : '#3B82F6';

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9',
    card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0',
    text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B',
    muted: isDark ? '#52525B' : '#94A3B8',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
    inputBg: isDark ? '#09090B' : '#F8FAFC',
  };

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6, display: 'block' };
  const sectionTitle = { fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px', boxShadow: C.shadow };

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaRef = useRef(null);

  // Camera / file refs
  const profileFileRef = useRef(null);
  const profileCamRef = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // --- Camera helpers (same pattern as DriverRegister) ---

  const openCamera = useCallback(async () => {
    setPickerOpen(false);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setCameraOpen(false);
      setTimeout(() => profileCamRef.current?.click(), 100);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraOpen) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setProfilePreview(dataUrl);
    setProfilePic(dataURLtoFile(dataUrl, 'profile.jpg'));
    closeCamera();
  }, [cameraOpen]);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  function dataURLtoFile(dataUrl, filename) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfilePic(file);
    const reader = new FileReader();
    reader.onloadend = () => setProfilePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // --- OTP helpers (same pattern as DriverRegister) ---

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    setOtpSent(false);
    setOtpVerified(false);
    setOtpValue('');
    setOtpError('');
    setConfirmationResult(null);
  };

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!digits || digits.length < 10) { setOtpError('Enter a valid 10-digit phone number'); return; }
    const formattedPhone = `+91${digits}`;
    setOtpSending(true);
    setOtpError('');
    try {
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch {}
        recaptchaRef.current = null;
      }
      const container = document.getElementById('recaptcha-container-user');
      if (container) container.innerHTML = '';

      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-user', {
        size: 'invisible',
        callback: () => {},
      });
      recaptchaRef.current = verifier;

      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setOtpSending(false);
      setOtpTimer(60);
    } catch (err) {
      setOtpSending(false);
      console.error('Firebase OTP Error:', err);
      if (recaptchaRef.current) { try { recaptchaRef.current.clear(); } catch {} recaptchaRef.current = null; }
      const container = document.getElementById('recaptcha-container-user');
      if (container) container.innerHTML = '';

      if (err.code === 'auth/invalid-phone-number') setOtpError('Invalid phone number. Enter 10 digits.');
      else if (err.code === 'auth/too-many-requests') setOtpError('Too many attempts. Try again later.');
      else if (err.code === 'auth/captcha-check-failed') setOtpError('Verification failed. Refresh the page and try again.');
      else if (err.code === 'auth/network-request-failed') setOtpError('Network error. Check your internet connection.');
      else if (err.code === 'auth/quota-exceeded') setOtpError('SMS quota exceeded. Try again tomorrow.');
      else if (err.code === 'auth/missing-phone-number') setOtpError('Phone number is required.');
      else setOtpError(`Error: ${err.code || err.message || 'Failed to send OTP'}`);
    }
  };

  const verifyOtp = async () => {
    setOtpError('');
    if (!confirmationResult) { setOtpError('Send OTP first'); return; }
    try {
      await confirmationResult.confirm(otpValue);
      setOtpVerified(true);
    } catch (err) {
      if (err.code === 'auth/invalid-verification-code') setOtpError('Invalid OTP. Please try again.');
      else if (err.code === 'auth/code-expired') setOtpError('OTP expired. Send a new one.');
      else setOtpError(err.message || 'Verification failed.');
    }
  };

  // --- Submit ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const profileB64 = await toBase64(profilePic);

      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        profilePicture: profileB64,
      };

      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setLoading(false);
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      setLoading(false);
      setSubmitted(true);
    } catch {
      setLoading(false);
      setError('Server error. Please try again.');
    }
  };

  // --- Success screen ---

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: 440, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${clr}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Icon name="check_circle" filled size={36} style={{ color: clr }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>Account Created!</h2>
          <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, margin: '0 0 28px' }}>
            Your account is ready. Start booking rides now!
          </p>
          <Link to="/login-user" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: clr }}>
            <Icon name="arrow_back" size={16} style={{ color: clr }} />
            Go to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  // --- Main form ---

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: `${clr}15` }}>
            <Icon name="person" filled size={28} style={{ color: clr }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Welcome to MiniTruK!</h1>
          <p style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>Create your account to start booking rides</p>
        </div>

        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container-user"></div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Personal Info */}
          <div style={cardStyle}>
            <div style={sectionTitle}>
              <Icon name="person" size={18} style={{ color: clr }} />
              Personal Information
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input type="text" placeholder="Enter your full name" value={fullName} onChange={e => setFullName(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="tel" placeholder="Enter phone number" value={phone} onChange={handlePhoneChange} required maxLength={10}
                    style={{ ...inputStyle, flex: 1 }} disabled={otpVerified} />
                  {!otpVerified && (
                    <button type="button" onClick={sendOtp} disabled={otpSending || otpTimer > 0 || !phone}
                      style={{
                        padding: '0 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                        background: otpSent ? (isDark ? '#27272A' : '#F1F5F9') : clr,
                        color: otpSent ? C.sub : '#fff',
                        opacity: (otpSending || otpTimer > 0 || !phone) ? 0.5 : 1,
                      }}>
                      {otpSending ? 'Sending...' : otpTimer > 0 ? `${otpTimer}s` : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  )}
                  {otpVerified && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', borderRadius: 10, background: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }}>
                      <Icon name="check_circle" filled size={16} style={{ color: '#10B981' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>Verified</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Error (always visible) */}
              {otpError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Icon name="error" size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#EF4444' }}>{otpError}</span>
                </div>
              )}

              {/* OTP Input */}
              {otpSent && !otpVerified && (
                <div style={{ background: isDark ? '#09090B' : '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Icon name="sms" size={16} style={{ color: clr }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>OTP sent to +91 {phone.replace(/\D/g, '')} via SMS</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text" placeholder="Enter 6-digit OTP" value={otpValue}
                      onChange={e => { setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                      maxLength={6}
                      style={{ ...inputStyle, flex: 1, textAlign: 'center', letterSpacing: '0.3em', fontSize: 18, fontWeight: 700 }}
                    />
                    <button type="button" onClick={verifyOtp} disabled={otpValue.length !== 6}
                      style={{
                        padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        background: otpValue.length === 6 ? clr : C.muted, color: '#fff', flexShrink: 0,
                      }}>
                      Verify
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" placeholder="email@example.com (optional)" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Profile Picture */}
          <div style={cardStyle}>
            <div style={sectionTitle}>
              <Icon name="photo_camera" size={18} style={{ color: clr }} />
              Profile Picture
            </div>
            <div
              onClick={() => setPickerOpen(true)}
              style={{
                padding: '20px 16px', borderRadius: 12, border: `2px dashed ${profilePreview ? clr : C.border}`,
                background: profilePreview ? `${clr}08` : C.inputBg, cursor: 'pointer', textAlign: 'center',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <Icon name="person" size={28} style={{ color: clr }} />
                </div>
              )}
              <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>{profilePreview ? 'Tap to change' : 'Add Profile Picture'}</p>
              <p style={{ fontSize: 10, color: C.muted, margin: '4px 0 0' }}>Take a photo or choose from gallery</p>
            </div>
            {/* Hidden file inputs */}
            <input ref={profileFileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            <input ref={profileCamRef} type="file" accept="image/*" capture="user" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: isDark ? '#7F1D1D40' : '#FEF2F2', border: `1px solid ${isDark ? '#991B1B' : '#FECACA'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="error" size={18} style={{ color: '#EF4444' }} />
              <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* OTP not verified info */}
          {!otpVerified && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: isDark ? '#27272A' : '#F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="info" size={16} style={{ color: C.muted }} />
              <span style={{ fontSize: 12, color: C.sub }}>Verify your phone number to create account</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading || !otpVerified}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
              cursor: (loading || !otpVerified) ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700, background: otpVerified ? clr : C.muted, color: '#fff',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading ? (
              <>
                <Icon name="sync" size={18} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                Creating Account...
              </>
            ) : (
              <>
                <Icon name="person_add" size={18} style={{ color: '#fff' }} />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, paddingBottom: 24 }}>
          <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login-user" style={{ textDecoration: 'none', fontWeight: 600, color: clr }}>Login</Link>
          </p>
        </div>

      </motion.div>

      {/* Camera / Gallery picker popup */}
      {pickerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16 }}
          onClick={() => setPickerOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 400, borderRadius: 20, overflow: 'hidden',
            background: C.card, border: `1px solid ${C.border}`,
            boxShadow: isDark ? '0 -8px 40px rgba(0,0,0,0.6)' : '0 -8px 40px rgba(0,0,0,0.15)',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.muted, margin: '12px auto', opacity: 0.3 }} />
            <div style={{ padding: '8px 16px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Profile Picture</div>
              <div style={{ fontSize: 12, color: C.muted }}>Choose how to add your photo</div>
            </div>
            <div style={{ padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Take Photo */}
              <button onClick={openCamera} style={{
                width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: `${clr}12`, display: 'flex', alignItems: 'center', gap: 14,
                fontSize: 14, fontWeight: 600, color: C.text, textAlign: 'left',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${clr}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="photo_camera" size={22} style={{ color: clr }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>Take Photo</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Open camera to capture</div>
                </div>
              </button>

              {/* Choose from Gallery */}
              <button onClick={() => {
                setPickerOpen(false);
                setTimeout(() => profileFileRef.current?.click(), 100);
              }} style={{
                width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: isDark ? '#27272A' : '#F1F5F9', display: 'flex', alignItems: 'center', gap: 14,
                fontSize: 14, fontWeight: 600, color: C.text, textAlign: 'left',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: isDark ? '#3F3F46' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="photo_library" size={22} style={{ color: C.sub }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>Choose from Gallery</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Select from your files</div>
                </div>
              </button>

              {/* Cancel */}
              <button onClick={() => setPickerOpen(false)} style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: `1.5px solid ${C.border}`,
                background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.sub, marginTop: 4,
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Camera Overlay */}
      {cameraOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            {/* Circular guide */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 200, height: 200, borderRadius: 100, border: '3px solid rgba(255,255,255,0.4)' }} />
            </div>
            <div style={{ position: 'absolute', top: 16, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ padding: '8px 20px', borderRadius: 20, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                Take Profile Photo
              </span>
            </div>
          </div>
          <div style={{ background: '#000', padding: '20px 0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            <button onClick={closeCamera} style={{
              width: 48, height: 48, borderRadius: 24, border: '2px solid rgba(255,255,255,0.4)',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="close" size={24} style={{ color: '#fff' }} />
            </button>
            <button onClick={capturePhoto} style={{
              width: 72, height: 72, borderRadius: 36, border: '4px solid #fff',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: '#fff' }} />
            </button>
            <div style={{ width: 48, height: 48 }} />
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
