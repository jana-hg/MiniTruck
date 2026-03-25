import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../config/firebase';

export default function DriverRegister() {
  const { isDark } = useTheme();
  const clr = isDark ? '#34D399' : '#10B981';

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

  const [form, setForm] = useState({
    fullName: '', phone: '', city: '',
    vehicleType: '', vehicleModel: '', regNumber: '', vehicleYear: '',
    licenseNumber: '', licenseExpiry: '',
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [vehiclePic, setVehiclePic] = useState(null);
  const [vehiclePreview, setVehiclePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaRef = useRef(null);

  const profileRef = useRef(null);
  const profileCamRef = useRef(null);
  const vehicleRef = useRef(null);
  const vehicleCamRef = useRef(null);
  const [pickerFor, setPickerFor] = useState(null); // null | 'profile' | 'vehicle'
  const [cameraOpen, setCameraOpen] = useState(null); // null | 'profile' | 'vehicle'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const openCamera = useCallback(async (type) => {
    setPickerFor(null);
    setCameraOpen(type);
    try {
      const facingMode = type === 'profile' ? 'user' : 'environment';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      // Wait for videoRef to be rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      // Camera not available, fall back to file input
      setCameraOpen(null);
      setTimeout(() => {
        if (type === 'profile') profileCamRef.current?.click();
        else vehicleCamRef.current?.click();
      }, 100);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraOpen) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // Mirror for front camera (profile)
    if (cameraOpen === 'profile') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (cameraOpen === 'profile') {
      setProfilePreview(dataUrl);
      // Convert to file-like for submission
      setProfilePic(dataURLtoFile(dataUrl, 'profile.jpg'));
    } else {
      setVehiclePreview(dataUrl);
      setVehiclePic(dataURLtoFile(dataUrl, 'vehicle.jpg'));
    }
    closeCamera();
  }, [cameraOpen]);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(null);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => { return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }; }, []);

  function dataURLtoFile(dataUrl, filename) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
    // Reset OTP if phone changes
    if (key === 'phone') { setOtpSent(false); setOtpVerified(false); setOtpValue(''); setOtpError(''); setConfirmationResult(null); }
  };

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const sendOtp = async () => {
    const digits = form.phone.replace(/\D/g, '');
    if (!digits || digits.length < 10) { setOtpError('Enter a valid 10-digit phone number'); return; }
    const formattedPhone = `+91${digits}`;
    setOtpSending(true);
    setOtpError('');
    try {
      // Always create a fresh reCAPTCHA verifier
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch {}
        recaptchaRef.current = null;
      }
      // Remove old recaptcha widgets
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';

      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
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
      const container = document.getElementById('recaptcha-container');
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

  const handleFile = (setter, previewSetter) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setter(file);
    const reader = new FileReader();
    reader.onloadend = () => previewSetter(reader.result);
    reader.readAsDataURL(file);
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const [profileB64, vehicleB64] = await Promise.all([
        toBase64(profilePic),
        toBase64(vehiclePic),
      ]);

      const payload = {
        ...form,
        vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : null,
        profilePicture: profileB64,
        vehiclePicture: vehicleB64,
      };

      const res = await fetch('/api/drivers/register', {
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

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: 440, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${clr}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Icon name="check_circle" filled size={36} style={{ color: clr }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>Application Submitted!</h2>
          <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.6, margin: '0 0 28px' }}>
            We'll verify your details and notify you once your driver account is active.
          </p>
          <Link to="/login/driver" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: clr }}>
            <Icon name="arrow_back" size={16} style={{ color: clr }} />
            Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  const uploadCard = (label, icon, preview, type) => (
    <div
      onClick={() => setPickerFor(type)}
      style={{
        flex: 1, minWidth: 140, padding: '20px 16px', borderRadius: 12, border: `2px dashed ${preview ? clr : C.border}`,
        background: preview ? `${clr}08` : C.inputBg, cursor: 'pointer', textAlign: 'center',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {preview ? (
        <img src={preview} alt={label} style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
      ) : (
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
          <Icon name={icon} size={24} style={{ color: clr }} />
        </div>
      )}
      <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 10, color: C.muted, margin: '4px 0 0' }}>{preview ? 'Tap to change' : 'Tap to upload'}</p>
    </div>
  );

  // Hidden file inputs (gallery + camera for each)
  const fileInputs = (
    <>
      <input ref={profileRef} type="file" accept="image/*" onChange={handleFile(setProfilePic, setProfilePreview)} style={{ display: 'none' }} />
      <input ref={profileCamRef} type="file" accept="image/*" capture="user" onChange={handleFile(setProfilePic, setProfilePreview)} style={{ display: 'none' }} />
      <input ref={vehicleRef} type="file" accept="image/*" onChange={handleFile(setVehiclePic, setVehiclePreview)} style={{ display: 'none' }} />
      <input ref={vehicleCamRef} type="file" accept="image/*" capture="environment" onChange={handleFile(setVehiclePic, setVehiclePreview)} style={{ display: 'none' }} />
    </>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: `${clr}15` }}>
            <Icon name="local_shipping" filled size={28} style={{ color: clr }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Join MiniTruK as a Driver</h1>
          <p style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>Fill out the details below to create your driver account</p>
        </div>

        {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
        <div id="recaptcha-container"></div>

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
                <input type="text" placeholder="Enter your full name" value={form.fullName} onChange={set('fullName')} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="tel" placeholder="Enter phone number" value={form.phone} onChange={set('phone')} required maxLength={10}
                    style={{ ...inputStyle, flex: 1 }} disabled={otpVerified} />
                  {!otpVerified && (
                    <button type="button" onClick={sendOtp} disabled={otpSending || otpTimer > 0 || !form.phone}
                      style={{
                        padding: '0 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                        background: otpSent ? (isDark ? '#27272A' : '#F1F5F9') : clr,
                        color: otpSent ? C.sub : '#fff',
                        opacity: (otpSending || otpTimer > 0 || !form.phone) ? 0.5 : 1,
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
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>OTP sent to +91 {form.phone.replace(/\D/g, '')} via SMS</span>
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
                <label style={labelStyle}>Preferred City *</label>
                <input type="text" placeholder="e.g. Mumbai, Delhi" value={form.city} onChange={set('city')} required style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div style={cardStyle}>
            <div style={sectionTitle}>
              <Icon name="directions_car" size={18} style={{ color: clr }} />
              Vehicle Information
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Vehicle Type *</label>
                <select value={form.vehicleType} onChange={set('vehicleType')} required
                  style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer', color: form.vehicleType ? C.text : C.muted }}>
                  <option value="" disabled>Select vehicle type</option>
                  <option value="mini_truck_500kg">Mini Truck (500KG)</option>
                  <option value="box_truck_2.5t">Box Truck (2.5T)</option>
                  <option value="heavy_duty_10t">Heavy Duty (10T+)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Vehicle Model *</label>
                <input type="text" placeholder="e.g. Tata Ace Gold" value={form.vehicleModel} onChange={set('vehicleModel')} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Vehicle Registration Number *</label>
                <input type="text" placeholder="e.g. MH 04 AB 1234" value={form.regNumber} onChange={set('regNumber')} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Vehicle Year</label>
                <input type="number" placeholder="e.g. 2022" value={form.vehicleYear} onChange={set('vehicleYear')} min="1990" max="2030" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* License Info */}
          <div style={cardStyle}>
            <div style={sectionTitle}>
              <Icon name="badge" size={18} style={{ color: clr }} />
              License Information
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>License Number *</label>
                <input type="text" placeholder="Enter your license number" value={form.licenseNumber} onChange={set('licenseNumber')} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>License Expiry Date *</label>
                <input type="date" value={form.licenseExpiry} onChange={set('licenseExpiry')} required style={{ ...inputStyle, color: form.licenseExpiry ? C.text : C.muted }} />
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div style={cardStyle}>
            <div style={sectionTitle}>
              <Icon name="upload" size={18} style={{ color: clr }} />
              Upload Documents
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {uploadCard('Profile Picture', 'photo_camera', profilePreview, 'profile')}
              {uploadCard('Vehicle Picture', 'directions_car', vehiclePreview, 'vehicle')}
            </div>
            {fileInputs}
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: isDark ? '#7F1D1D40' : '#FEF2F2', border: `1px solid ${isDark ? '#991B1B' : '#FECACA'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="error" size={18} style={{ color: '#EF4444' }} />
              <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          {!otpVerified && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: isDark ? '#27272A' : '#F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="info" size={16} style={{ color: C.muted }} />
              <span style={{ fontSize: 12, color: C.sub }}>Verify your phone number with OTP to submit the application</span>
            </div>
          )}
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
                Submitting...
              </>
            ) : (
              <>
                <Icon name="send" size={18} style={{ color: '#fff' }} />
                Submit Application
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, paddingBottom: 24 }}>
          <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login/driver" style={{ textDecoration: 'none', fontWeight: 600, color: clr }}>Login</Link>
          </p>
        </div>

      </motion.div>

      {/* Camera / Gallery picker popup */}
      {pickerFor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16 }}
          onClick={() => setPickerFor(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 400, borderRadius: 20, overflow: 'hidden',
            background: C.card, border: `1px solid ${C.border}`,
            boxShadow: isDark ? '0 -8px 40px rgba(0,0,0,0.6)' : '0 -8px 40px rgba(0,0,0,0.15)',
          }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.muted, margin: '12px auto', opacity: 0.3 }} />

            <div style={{ padding: '8px 16px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {pickerFor === 'profile' ? 'Profile Picture' : 'Vehicle Picture'}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>Choose how to add your photo</div>
            </div>

            <div style={{ padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Take Photo */}
              <button onClick={() => openCamera(pickerFor)} style={{
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
                const target = pickerFor;
                setPickerFor(null);
                setTimeout(() => { if (target === 'profile') profileRef.current?.click(); else vehicleRef.current?.click(); }, 100);
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
              <button onClick={() => setPickerFor(null)} style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: `1.5px solid ${C.border}`,
                background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.sub, marginTop: 4,
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Fullscreen Camera Overlay ═══ */}
      {cameraOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000', display: 'flex', flexDirection: 'column' }}>
          {/* Camera viewfinder */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: cameraOpen === 'profile' ? 'scaleX(-1)' : 'none',
              }}
            />
            {/* Guide overlay */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              {cameraOpen === 'profile' ? (
                <div style={{ width: 200, height: 200, borderRadius: 100, border: '3px solid rgba(255,255,255,0.4)' }} />
              ) : (
                <div style={{ width: 280, height: 180, borderRadius: 16, border: '3px solid rgba(255,255,255,0.4)' }} />
              )}
            </div>
            {/* Top label */}
            <div style={{ position: 'absolute', top: 16, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ padding: '8px 20px', borderRadius: 20, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                {cameraOpen === 'profile' ? 'Take Profile Photo' : 'Take Vehicle Photo'}
              </span>
            </div>
          </div>

          {/* Bottom controls */}
          <div style={{ background: '#000', padding: '20px 0 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            {/* Cancel */}
            <button onClick={closeCamera} style={{
              width: 48, height: 48, borderRadius: 24, border: '2px solid rgba(255,255,255,0.4)',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="close" size={24} style={{ color: '#fff' }} />
            </button>

            {/* Capture */}
            <button onClick={capturePhoto} style={{
              width: 72, height: 72, borderRadius: 36, border: '4px solid #fff',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: '#fff' }} />
            </button>

            {/* Spacer for alignment */}
            <div style={{ width: 48, height: 48 }} />
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* Spin animation for loading icon */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
