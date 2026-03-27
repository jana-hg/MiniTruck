import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { drivers as driversApi } from '../../services/api';
import Icon from '../../components/ui/Icon';
// import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../config/firebase';
import { sendMockOtp } from '../../config/otpMock';

export default function DriverProfile() {
  const { user, logout, updateUser } = useAuth();
  const { isDark } = useTheme();
  const [driver, setDriver] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // OTP states
  const [otpRequired, setOtpRequired] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaRef = useRef(null);

  // Profile pic
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const fileRef = useRef(null);

  const C = {
    bg: isDark ? '#09090B' : '#F1F5F9', card: isDark ? '#18181B' : '#FFFFFF',
    border: isDark ? '#27272A' : '#E2E8F0', text: isDark ? '#FAFAFA' : '#0F172A',
    sub: isDark ? '#A1A1AA' : '#64748B', muted: isDark ? '#52525B' : '#94A3B8',
    accent: isDark ? '#FFD700' : '#3B82F6', accentBg: isDark ? 'rgba(255,215,0,0.08)' : '#EFF6FF',
    shadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
    inputBg: isDark ? '#09090B' : '#F8FAFC',
    green: '#10B981',
  };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.inputBg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'block' };

  useEffect(() => {
    if (user?.id) driversApi.getDriver(user.id).then(d => { setDriver(d); initForm(d); }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const initForm = (d) => {
    setForm({
      name: d.name || '',
      phone: d.phone || '',
      city: d.city || '',
      licenseNumber: d.licenseNumber || '',
      licenseExpiry: d.licenseExpiry || '',
      vehicleMake: d.vehicleDetails?.make || '',
      vehicleModel: d.vehicleDetails?.model || '',
      vehicleRegNumber: d.vehicleDetails?.regNumber || d.vehicleDetails?.plateNumber || '',
      vehicleYear: d.vehicleDetails?.year || '',
    });
    setProfilePicPreview(d.profilePicture || null);
  };

  const startEdit = () => {
    setEditing(true);
    setSaved(false);
    setError('');
    setOtpRequired(false);
    setOtpSent(false);
    setOtpVerified(false);
    setOtpValue('');
    setOtpError('');
  };

  const cancelEdit = () => {
    setEditing(false);
    if (driver) initForm(driver);
    setError('');
    setOtpRequired(false);
    setOtpSent(false);
    setOtpVerified(false);
  };

  // Check if sensitive fields changed
  const hasSensitiveChange = () => {
    if (!driver) return false;
    if (form.phone !== (driver.phone || '')) return true;
    if (form.licenseNumber !== (driver.licenseNumber || '')) return true;
    if (form.vehicleRegNumber !== (driver.vehicleDetails?.regNumber || driver.vehicleDetails?.plateNumber || '')) return true;
    return false;
  };

  const handleProfilePic = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePicPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const sendOtp = async () => {
    const phone = form.phone || driver.phone;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setOtpError('Valid phone number required'); return; }
    setOtpSending(true);
    setOtpError('');
    try {
      const result = await sendMockOtp(`+91${digits}`);
      setConfirmationResult(result);
      setOtpSent(true);
      setOtpTimer(60);
    } catch (err) {
      setOtpError(err.message || 'Failed to send OTP');
    }
    setOtpSending(false);
  };

  const verifyOtp = async () => {
    if (!confirmationResult) { setOtpError('Send OTP first'); return; }
    try {
      await confirmationResult.confirm(otpValue);
      setOtpVerified(true);
      setOtpError('');
      // Auto-save after OTP verified
      setShowOtpPopup(false);
      setTimeout(() => handleSave(), 100);
    } catch (err) {
      setOtpError(err.code === 'auth/invalid-verification-code' ? 'Invalid OTP' : 'Verification failed');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        city: form.city,
        licenseNumber: form.licenseNumber,
        licenseExpiry: form.licenseExpiry,
        vehicleDetails: {
          ...(driver.vehicleDetails || {}),
          make: form.vehicleMake,
          model: form.vehicleModel,
          regNumber: form.vehicleRegNumber,
          plateNumber: form.vehicleRegNumber,
          year: form.vehicleYear ? Number(form.vehicleYear) : null,
        },
        lastEditedAt: new Date().toISOString(),
        lastEditedFields: getChangedFields(),
      };
      if (profilePicPreview !== driver.profilePicture) {
        payload.profilePicture = profilePicPreview || null;
      }

      const updated = await driversApi.updateDriver(driver.id, payload);
      setDriver(updated);
      initForm(updated);
      setEditing(false);
      setSaved(true);
      setOtpRequired(false);
      setOtpVerified(false);
      // Sync name & picture to header
      updateUser({ name: updated.name, profilePicture: updated.profilePicture || null });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Try again.');
    }
    setSaving(false);
  };

  const getChangedFields = () => {
    const changed = [];
    if (form.name !== (driver.name || '')) changed.push('name');
    if (form.phone !== (driver.phone || '')) changed.push('phone');
    if (form.city !== (driver.city || '')) changed.push('city');
    if (form.licenseNumber !== (driver.licenseNumber || '')) changed.push('licenseNumber');
    if (form.licenseExpiry !== (driver.licenseExpiry || '')) changed.push('licenseExpiry');
    if (form.vehicleMake !== (driver.vehicleDetails?.make || '')) changed.push('vehicleMake');
    if (form.vehicleModel !== (driver.vehicleDetails?.model || '')) changed.push('vehicleModel');
    if (form.vehicleRegNumber !== (driver.vehicleDetails?.regNumber || driver.vehicleDetails?.plateNumber || '')) changed.push('vehicleRegNumber');
    if (form.vehicleYear !== String(driver.vehicleDetails?.year || '')) changed.push('vehicleYear');
    return changed;
  };

  if (!driver) return <div style={{ padding: '80px 0', textAlign: 'center', color: C.muted }}>Loading...</div>;

  const vehicle = driver.vehicleDetails || {};
  const renderField = (label, field, value, type = 'text', sensitive = false) => (
    <div key={field}>
      <label style={labelStyle}>
        {label}
        {sensitive && editing && <span style={{ color: '#F59E0B', marginLeft: 4 }}>(OTP required)</span>}
      </label>
      {editing ? (
        <input key={`edit-${field}`} type={type} value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ ...inputStyle, borderColor: sensitive && hasSensitiveChange() ? '#F59E0B' : C.border }} />
      ) : (
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, padding: '10px 0' }}>{value || '—'}</div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 0 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>My Profile</div>
        {!editing ? (
          <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.accent}`, background: `${C.accent}10`, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.accent }}>
            <Icon name="edit" size={14} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancelEdit} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted }}>Cancel</button>
            <button onClick={() => { setShowOtpPopup(true); setOtpSent(false); setOtpValue(''); setOtpError(''); setOtpVerified(false); sendOtp(); }}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#F59E0B', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', opacity: saving ? 0.6 : 1 }}>
              <Icon name="sms" size={14} /> Verify & Save
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0'}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: C.green }}>
          <Icon name="check_circle" size={16} /> Profile updated successfully!
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'}`, fontSize: 12, fontWeight: 600, color: '#EF4444' }}>
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: C.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile" style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', border: `2px solid ${C.accent}` }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accentBg, border: `2px solid ${C.accent}` }}>
                <Icon name="person" filled size={36} style={{ color: C.accent }} />
              </div>
            )}
            {editing && (
              <>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleProfilePic} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current?.click()}
                  style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.accent, border: `2px solid ${C.card}`, cursor: 'pointer', color: isDark ? '#000' : '#fff' }}>
                  <Icon name="photo_camera" size={14} />
                </button>
                {profilePicPreview && (
                  <button onClick={() => setProfilePicPreview(null)}
                    style={{ position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EF4444', border: `2px solid ${C.card}`, cursor: 'pointer', color: '#fff', padding: 0 }}>
                    <Icon name="close" size={12} />
                  </button>
                )}
              </>
            )}
          </div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }} />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{driver.name}</div>
            )}
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{driver.rank} · ID: {driver.id}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="star" filled size={14} style={{ color: '#FBBF24' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{driver.rating}</span>
              <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>({driver.stats?.totalTrips || 0} trips)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: C.shadow }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Contact & Location</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {renderField('Phone Number', 'phone', driver.phone, 'text', true)}
          {renderField('City', 'city', driver.city)}
        </div>
      </div>

      {/* Vehicle */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: C.shadow }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Vehicle Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {renderField('Brand', 'vehicleMake', vehicle.make)}
          {renderField('Model', 'vehicleModel', vehicle.model)}
          {renderField('Registration Number', 'vehicleRegNumber', vehicle.regNumber || vehicle.plateNumber, 'text', true)}
          {renderField('Year', 'vehicleYear', vehicle.year, 'number')}
        </div>
      </div>

      {/* License */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: C.shadow }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>License Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {renderField('License Number', 'licenseNumber', driver.licenseNumber, 'text', true)}
          {renderField('License Expiry', 'licenseExpiry', driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : '', 'date')}
        </div>
      </div>

      {/* OTP Popup Modal */}
      {showOtpPopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16 }}
          onClick={() => setShowOtpPopup(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.6)' : '0 8px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Icon name="security" size={28} style={{ color: '#F59E0B' }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>Verify to Save</h3>
              <p style={{ fontSize: 12, color: C.sub, margin: 0 }}>
                Enter OTP sent to +91{(form.phone || driver?.phone || '').replace(/\D/g, '')}
              </p>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* OTP sending state */}
              {otpSending && (
                <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 13, color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="progress_activity" size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending OTP...
                </div>
              )}

              {/* OTP Input */}
              {otpSent && !otpSending && (
                <>
                  <div>
                    <input type="text" inputMode="numeric" placeholder="Enter 6-digit OTP" value={otpValue}
                      onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6}
                      autoFocus
                      style={{ width: '100%', padding: '14px', borderRadius: 12, border: `2px solid ${otpValue.length === 6 ? '#10B981' : C.border}`, background: C.inputBg, color: C.text, fontSize: 24, fontWeight: 900, textAlign: 'center', letterSpacing: '0.3em', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
                  </div>

                  {otpError && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', fontSize: 12, fontWeight: 600, color: '#EF4444', textAlign: 'center' }}>
                      {otpError}
                    </div>
                  )}

                  <button onClick={verifyOtp} disabled={otpValue.length < 4}
                    style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 800, background: otpValue.length === 4 ? '#10B981' : C.muted, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
                    <Icon name="verified" size={18} /> Verify & Save
                  </button>

                  {/* Resend */}
                  <div style={{ textAlign: 'center' }}>
                    {otpTimer > 0 ? (
                      <span style={{ fontSize: 12, color: C.muted }}>Resend in {otpTimer}s</span>
                    ) : (
                      <button onClick={sendOtp} disabled={otpSending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>
                        Resend OTP
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Cancel */}
              <button onClick={() => setShowOtpPopup(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.muted, textAlign: 'center', padding: 4 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Document Verification (RC & Photo) */}
      {user?.documentVerification && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: C.shadow }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Document Verification</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* RC Verification */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>Registration Certificate (RC)</div>
              <div style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: user.documentVerification.rc?.verified
                  ? (isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5')
                  : user.documentVerification.rc?.rejected
                  ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2')
                  : (isDark ? 'rgba(245,158,11,0.1)' : '#FEF3C7'),
                border: `1px solid ${
                  user.documentVerification.rc?.verified
                    ? (isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0')
                    : user.documentVerification.rc?.rejected
                    ? (isDark ? 'rgba(239,68,68,0.3)' : '#FECACA')
                    : (isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A')
                }`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}>
                <Icon
                  name={
                    user.documentVerification.rc?.verified
                      ? 'verified'
                      : user.documentVerification.rc?.rejected
                      ? 'close_circle'
                      : 'pending'
                  }
                  size={16}
                  style={{
                    color: user.documentVerification.rc?.verified
                      ? '#10B981'
                      : user.documentVerification.rc?.rejected
                      ? '#EF4444'
                      : '#F59E0B',
                    marginTop: 2,
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: user.documentVerification.rc?.verified
                      ? '#10B981'
                      : user.documentVerification.rc?.rejected
                      ? '#EF4444'
                      : '#F59E0B'
                  }}>
                    {user.documentVerification.rc?.verified
                      ? '✅ Verified'
                      : user.documentVerification.rc?.rejected
                      ? '❌ Rejected'
                      : '⏳ Pending'}
                  </div>
                  {user.documentVerification.rc?.verificationStatus && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      Status: {user.documentVerification.rc.verificationStatus}
                    </div>
                  )}
                  {user.documentVerification.rc?.verifiedAt && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      Verified: {new Date(user.documentVerification.rc.verifiedAt).toLocaleDateString()} {new Date(user.documentVerification.rc.verifiedAt).toLocaleTimeString()}
                    </div>
                  )}
                  {user.documentVerification.rc?.rejectionReason && (
                    <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontStyle: 'italic' }}>
                      Reason: {user.documentVerification.rc.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photo Verification */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>Profile Photo</div>
              <div style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: user.documentVerification.profilePhoto?.verified
                  ? (isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5')
                  : user.documentVerification.profilePhoto?.rejected
                  ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2')
                  : (isDark ? 'rgba(245,158,11,0.1)' : '#FEF3C7'),
                border: `1px solid ${
                  user.documentVerification.profilePhoto?.verified
                    ? (isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0')
                    : user.documentVerification.profilePhoto?.rejected
                    ? (isDark ? 'rgba(239,68,68,0.3)' : '#FECACA')
                    : (isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A')
                }`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}>
                <Icon
                  name={
                    user.documentVerification.profilePhoto?.verified
                      ? 'verified'
                      : user.documentVerification.profilePhoto?.rejected
                      ? 'close_circle'
                      : 'pending'
                  }
                  size={16}
                  style={{
                    color: user.documentVerification.profilePhoto?.verified
                      ? '#10B981'
                      : user.documentVerification.profilePhoto?.rejected
                      ? '#EF4444'
                      : '#F59E0B',
                    marginTop: 2,
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: user.documentVerification.profilePhoto?.verified
                      ? '#10B981'
                      : user.documentVerification.profilePhoto?.rejected
                      ? '#EF4444'
                      : '#F59E0B'
                  }}>
                    {user.documentVerification.profilePhoto?.verified
                      ? '✅ Verified'
                      : user.documentVerification.profilePhoto?.rejected
                      ? '❌ Rejected'
                      : '⏳ Pending'}
                  </div>
                  {user.documentVerification.profilePhoto?.verificationStatus && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      Status: {user.documentVerification.profilePhoto.verificationStatus}
                    </div>
                  )}
                  {user.documentVerification.profilePhoto?.verifiedAt && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      Verified: {new Date(user.documentVerification.profilePhoto.verifiedAt).toLocaleDateString()} {new Date(user.documentVerification.profilePhoto.verifiedAt).toLocaleTimeString()}
                    </div>
                  )}
                  {user.documentVerification.profilePhoto?.rejectionReason && (
                    <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontStyle: 'italic' }}>
                      Reason: {user.documentVerification.profilePhoto.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Earnings */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: C.shadow }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Earnings</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.accent, marginTop: 4 }}>₹{(driver.earnings || 0).toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Service Level</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginTop: 4 }}>{driver.stats?.serviceLevel || 0}%</div>
        </div>
      </div>

      {/* Last edited info */}
      {driver.lastEditedAt && (
        <div style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0' }}>
          <Icon name="history" size={13} /> Last edited: {new Date(driver.lastEditedAt).toLocaleString()}
          {driver.lastEditedFields?.length > 0 && ` (${driver.lastEditedFields.join(', ')})`}
        </div>
      )}

      {/* Logout */}
      <button onClick={logout} style={{ width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'}`, color: '#EF4444' }}>
        <Icon name="logout" size={18} /> Sign Out
      </button>
    </div>
  );
}
