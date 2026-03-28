import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';
import { API_BASE } from '../../config/constants';
// import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../config/firebase';
import { sendMockOtp } from '../../config/otpMock';
import { createWorker } from 'tesseract.js';
import ImageCropper from '../../components/ui/ImageCropper';
import { INDIAN_TRUCKS, ALL_TRUCK_MODELS } from '../../config/indianTrucks';

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
    licenseNumber: '', licenseExpiry: '', password: '',
  });
  const [generatedId, setGeneratedId] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [vehiclePic, setVehiclePic] = useState(null);
  const [vehiclePreview, setVehiclePreview] = useState(null);
  const [rcPic, setRcPic] = useState(null);
  const [rcPreview, setRcPreview] = useState(null);
  const [rcProcessing, setRcProcessing] = useState(false);
  const [rcExtracted, setRcExtracted] = useState(false);
  const [rcError, setRcError] = useState('');
  const rcCamRef = useRef(null);
  const [rcPickerOpen, setRcPickerOpen] = useState(false);
  const [rcFrontPreview, setRcFrontPreview] = useState(null);
  const [rcBackPreview, setRcBackPreview] = useState(null);
  const rcBackRef = useRef(null);
  const rcBackCamRef = useRef(null);
  const [rcBackPickerOpen, setRcBackPickerOpen] = useState(false);
  const [dlPic, setDlPic] = useState(null);
  const [dlPreview, setDlPreview] = useState(null);
  const [dlProcessing, setDlProcessing] = useState(false);
  const [dlExtracted, setDlExtracted] = useState(false);
  const [dlError, setDlError] = useState('');
  const dlRef = useRef(null);
  const dlCamRef = useRef(null);
  const [dlPickerOpen, setDlPickerOpen] = useState(false);
  const [dlFrontPreview, setDlFrontPreview] = useState(null);
  const [dlBackPreview, setDlBackPreview] = useState(null);
  const dlBackRef = useRef(null);
  const dlBackCamRef = useRef(null);
  const [dlBackPickerOpen, setDlBackPickerOpen] = useState(false);

  // Cropper state
  const [cropImage, setCropImage] = useState(null); // raw image to crop
  const [cropCallback, setCropCallback] = useState(null); // fn to call after crop
  const [modelQuery, setModelQuery] = useState('');
  const [modelSuggestions, setModelSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const rcRef = useRef(null);
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
    if (key === 'phone') { setOtpSent(false); setOtpVerified(false); setOtpValue(''); setOtpError(''); setConfirmationResult(null); }
  };

  // Model autocomplete
  const handleModelInput = (val) => {
    setModelQuery(val);
    setForm(prev => ({ ...prev, vehicleModel: val }));
    if (val.length >= 2) {
      const q = val.toLowerCase();
      const matches = ALL_TRUCK_MODELS.filter(t => t.full.toLowerCase().includes(q) || t.model.toLowerCase().includes(q) || t.brand.toLowerCase().includes(q)).slice(0, 8);
      setModelSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else { setModelSuggestions([]); setShowSuggestions(false); }
  };

  const selectModel = (t) => {
    setModelQuery(t.full);
    setForm(prev => ({ ...prev, vehicleModel: t.full }));
    setSelectedBrand(t.brand);
    setShowSuggestions(false);
  };

  // Open cropper for any document image
  const openCropperForFile = (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropImage(reader.result);
      setCropCallback(() => callback);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be re-selected
  };

  const handleCropDone = (croppedDataUrl) => {
    if (cropCallback) cropCallback(croppedDataUrl);
    setCropImage(null);
    setCropCallback(null);
  };

  const handleCropCancel = () => {
    setCropImage(null);
    setCropCallback(null);
  };

  // RC front side done (after crop) → run OCR
  const processRcFront = async (dataUrl) => {
    setRcFrontPreview(dataUrl);
    setRcPreview(dataUrl);
    setRcPic(dataUrl);
    setRcProcessing(true);
    setRcError('');
    setRcExtracted(false);
    await runRcOcr(dataUrl);
  };

  // RC back side done (after crop) → run OCR on back too for extra data
  const processRcBack = async (dataUrl) => {
    setRcBackPreview(dataUrl);
    // Run OCR on back side too for additional details
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(dataUrl);
      await worker.terminate();
      // Extract any additional info from back (fitness expiry, etc.)
      const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g);
      if (dateMatch) {
        const dates = dateMatch.map(d => { const p = d.split(/[\/\-]/); return { date: new Date(p[2], p[1] - 1, p[0]) }; }).filter(d => d.date > new Date());
        if (dates.length > 0) {
          const latest = dates.sort((a, b) => b.date - a.date)[0];
          setForm(prev => ({ ...prev, licenseExpiry: latest.date.toISOString().split('T')[0] }));
        }
      }
    } catch {}
  };

  // Legacy handler for direct upload without crop (not used anymore but kept for safety)
  const handleRcUpload = (e) => openCropperForFile(e, processRcFront);

  const runRcOcr = async (imageData) => {
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();

      const upperText = text.toUpperCase();
      let extracted = 0;

      // Extract vehicle number (Indian format: XX 00 XX 0000)
      const regMatch = text.match(/[A-Z]{2}\s*[-]?\s*\d{1,2}\s*[-]?\s*[A-Z]{1,3}\s*[-]?\s*\d{1,4}/i);
      if (regMatch) {
        const cleaned = regMatch[0].replace(/[-\s]+/g, ' ').toUpperCase().trim();
        setForm(prev => ({ ...prev, regNumber: prev.regNumber || cleaned }));
        extracted++;
      }

      // Extract vehicle model/make
      const truckBrands = ['TATA', 'MAHINDRA', 'ASHOK LEYLAND', 'MARUTI', 'PIAGGIO', 'FORCE', 'EICHER', 'BHARATBENZ', 'SML', 'ISUZU', 'ACE', 'BOLERO', 'DOST', 'SUPER CARRY'];
      for (const brand of truckBrands) {
        if (upperText.includes(brand)) {
          const idx = upperText.indexOf(brand);
          const after = text.substring(idx, idx + 30).trim();
          const match = ALL_TRUCK_MODELS.find(t => after.toUpperCase().includes(t.brand.toUpperCase()));
          if (match) {
            setForm(prev => ({ ...prev, vehicleModel: prev.vehicleModel || match.full }));
            setModelQuery(prev => prev || match.full);
            setSelectedBrand(prev => prev || match.brand);
          }
          extracted++;
          break;
        }
      }

      // Extract year (4-digit year between 1990-2030)
      const yearMatch = text.match(/\b(199\d|20[0-2]\d|2030)\b/);
      if (yearMatch) { setForm(prev => ({ ...prev, vehicleYear: prev.vehicleYear || yearMatch[1] })); extracted++; }

      // Extract dates
      const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g);
      if (dateMatch) {
        const dates = dateMatch.map(d => { const p = d.split(/[\/\-]/); return { str: d, date: new Date(p[2], p[1] - 1, p[0]) }; }).filter(d => d.date > new Date());
        if (dates.length > 0) {
          const latest = dates.sort((a, b) => b.date - a.date)[0];
          setForm(prev => ({ ...prev, licenseExpiry: prev.licenseExpiry || latest.date.toISOString().split('T')[0] }));
          extracted++;
        }
      }

      // Also check for RC keywords as a signal
      const rcKeywords = ['REGISTR', 'VEHICLE', 'MOTOR', 'CHASSIS', 'ENGINE', 'FUEL', 'OWNER', 'FITNESS', 'RTO', 'TRANSPORT', 'CERTIFICATE', 'REGN'];
      const rcKwCount = rcKeywords.filter(k => upperText.includes(k)).length;
      if (rcKwCount >= 1) extracted++;

      // Accept if we extracted anything at all
      if (extracted === 0 && text.trim().length < 20) {
        setRcError('Could not read any details from this image. Try a clearer photo or different angle.');
        setRcFrontPreview(null); setRcPreview(null);
        setRcProcessing(false);
        return;
      }

      setRcExtracted(true);
      if (extracted === 0) setRcError('Image accepted but no details could be extracted. Please fill manually.');
    } catch (err) {
      console.error('RC OCR error:', err);
      setRcError('Could not read RC book. Please upload a clear photo.');
    }
    setRcProcessing(false);
  };

  // DL front side done (after crop) → run OCR
  const processDlFront = async (dataUrl) => {
    setDlFrontPreview(dataUrl);
    setDlPreview(dataUrl);
    setDlPic(dataUrl);
    setDlProcessing(true);
    setDlError('');
    setDlExtracted(false);
    await runDlOcr(dataUrl);
  };

  // DL back side done (after crop)
  const processDlBack = async (dataUrl) => {
    setDlBackPreview(dataUrl);
    // Extract any extra info from back
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(dataUrl);
      await worker.terminate();
      const dateMatches = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g);
      if (dateMatches) {
        const parsed = dateMatches.map(d => { const p = d.split(/[\/\-]/); return { date: new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])), iso: '' }; }).filter(d => !isNaN(d.date.getTime()));
        parsed.forEach(d => { d.iso = d.date.toISOString().split('T')[0]; });
        const future = parsed.filter(d => d.date > new Date()).sort((a, b) => b.date - a.date);
        if (future.length > 0) setForm(prev => ({ ...prev, licenseExpiry: future[0].iso }));
      }
    } catch {}
  };

  const handleDlUpload = (e) => openCropperForFile(e, processDlFront);

  const runDlOcr = async (imageData) => {
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();

      const upper = text.toUpperCase();
      let extracted = 0;

      // Extract DL number
      const dlMatch = upper.match(/[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4,11}\d*/);
      if (dlMatch) {
        const cleaned = dlMatch[0].replace(/[-\s]+/g, '').trim();
        setForm(prev => ({ ...prev, licenseNumber: prev.licenseNumber || cleaned }));
        extracted++;
      }

      // Extract name
      const namePatterns = [/NAME\s*[:\-]?\s*([A-Z][A-Z\s]{2,30})/i, /HOLDER\s*[:\-]?\s*([A-Z][A-Z\s]{2,30})/i, /S\/O\s*[:\-]?\s*([A-Z][A-Z\s]{2,30})/i];
      for (const pat of namePatterns) {
        const m = upper.match(pat);
        if (m) {
          const name = m[1].trim().split('\n')[0].trim();
          if (name.length > 2) {
            setForm(prev => ({ ...prev, fullName: prev.fullName || name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ') }));
            extracted++;
          }
          break;
        }
      }

      // Extract dates
      const dateMatches = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g);
      if (dateMatches) {
        const parsed = dateMatches.map(d => {
          const p = d.split(/[\/\-]/);
          const dt = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
          return { str: d, date: dt, iso: dt.toISOString().split('T')[0] };
        }).filter(d => !isNaN(d.date.getTime()));

        const futureDates = parsed.filter(d => d.date > new Date()).sort((a, b) => b.date - a.date);
        if (futureDates.length > 0) {
          setForm(prev => ({ ...prev, licenseExpiry: prev.licenseExpiry || futureDates[0].iso }));
          extracted++;
        }
      }

      // Check for DL keywords
      const dlKeywords = ['DRIV', 'LICEN', 'LICENCE', 'LICENSE', 'TRANSPORT', 'LMV', 'HMV', 'MCWG', 'VALIDITY', 'BLOOD', 'DOB', 'AUTHORITY', 'COV', 'INDIA'];
      const dlKwCount = dlKeywords.filter(k => upper.includes(k)).length;
      if (dlKwCount >= 1) extracted++;

      // Accept if we got anything at all
      if (extracted === 0 && text.trim().length < 20) {
        setDlError('Could not read any details from this image. Try a clearer photo or different angle.');
        setDlFrontPreview(null); setDlPreview(null);
        setDlProcessing(false);
        return;
      }

      setDlExtracted(true);
      if (extracted === 0) setDlError('Image accepted but no details could be extracted. Please fill manually.');
    } catch (err) {
      console.error('DL OCR error:', err);
      setDlError('Could not read license. Please upload a clear photo.');
    }
    setDlProcessing(false);
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
      const result = await sendMockOtp(formattedPhone);
      setConfirmationResult(result);
      setOtpSent(true);
      setOtpSending(false);
      setOtpTimer(60);
    } catch (err) {
      setOtpSending(false);
      setOtpError(err.message || 'Failed to send OTP');
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
      // DRIVER VERIFICATION: Check required documents
      if (!profilePic) {
        setError('Driver profile photo is required');
        setLoading(false);
        return;
      }

      if (!rcFrontPreview) {
        setError('Registration Certificate (RC) is required - Please upload RC front');
        setLoading(false);
        return;
      }

      if (!rcBackPreview) {
        setError('Registration Certificate (RC) back is required');
        setLoading(false);
        return;
      }

      const [profileB64, vehicleB64] = await Promise.all([
        toBase64(profilePic),
        toBase64(vehiclePic),
      ]);

      // Extract brand from vehicleModel (e.g. "Tata Ace Gold" → brand: "Tata")
      const matchedTruck = ALL_TRUCK_MODELS.find(t => t.full === form.vehicleModel);
      const payload = {
        name: form.fullName,
        phone: form.phone,
        city: form.city,
        vehicleType: form.vehicleType,
        vehicleModel: form.vehicleModel,
        vehicleMake: matchedTruck?.brand || form.vehicleModel.split(' ')[0] || '',
        vehicleRegNumber: form.regNumber,
        vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : null,
        licenseNumber: form.licenseNumber,
        licenseExpiry: form.licenseExpiry,
        password: form.password,
        profilePicture: profileB64,
        vehiclePicture: vehicleB64,
        uploadedDocuments: {
          rc: rcFrontPreview, // DRIVER VERIFICATION: Include RC
          ...(rcBackPreview ? { rcBack: rcBackPreview } : {}),
          ...(dlFrontPreview ? { dlFront: dlFrontPreview } : {}),
          ...(dlBackPreview ? { dlBack: dlBackPreview } : {}),
        },
      };

      const res = await fetch(`${API_BASE}/drivers/register`, {
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

      // DRIVER VERIFICATION: Store verification status
      if (data.documentVerification) {
        console.log('✅ Documents auto-verified:', {
          rc: data.documentVerification.rc.verificationStatus,
          photo: data.documentVerification.profilePhoto.verificationStatus
        });
      }

      setGeneratedId(data.id);
      setLoading(false);
      setSubmitted(true);
    } catch {
      setLoading(false);
      setError('Server error. Please try again.');
    }
  };

  // Password setup after submission
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [idCopied, setIdCopied] = useState(false);

  const handleSetPassword = async () => {
    setPasswordError('');
    if (newPassword.length !== 4) { setPasswordError('Enter 4 digits'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setPasswordSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: generatedId, oldPassword: '1234', newPassword, role: 'driver' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setPasswordSaving(false); setPasswordError(data.error || 'Failed to set password'); return; }
      setPasswordSaving(false);
      setPasswordDone(true);
    } catch { setPasswordSaving(false); setPasswordError('Server error. Try again.'); }
  };

  if (submitted) {
    // Step 2: Set Password page
    if (showSetPassword) {
      return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ width: '100%', maxWidth: 400, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow, padding: '32px 24px' }}>

            {!passwordDone ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Icon name="lock" size={28} style={{ color: clr }} />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Set Your Password</h2>
                  <p style={{ fontSize: 12, color: C.sub, margin: 0 }}>Choose a 4-digit PIN to secure your account</p>
                </div>

                {/* Show User ID */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: isDark ? '#34D399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your User ID</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '0.08em', marginTop: 2 }}>{generatedId}</div>
                  </div>
                  <button onClick={() => { navigator.clipboard?.writeText(generatedId); setIdCopied(true); setTimeout(() => setIdCopied(false), 2000); }}
                    style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: idCopied ? '#10B981' : clr }}>
                    <Icon name={idCopied ? 'check' : 'content_copy'} size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                    {idCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Password fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>New 4-Digit Password *</label>
                    <input type="password" inputMode="numeric" maxLength={4} placeholder="● ● ● ●" value={newPassword}
                      onChange={e => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5em', fontSize: 24, fontWeight: 900 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm Password *</label>
                    <input type="password" inputMode="numeric" maxLength={4} placeholder="● ● ● ●" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5em', fontSize: 24, fontWeight: 900, borderColor: confirmPassword.length === 4 ? (confirmPassword === newPassword ? '#10B981' : '#EF4444') : C.border }} />
                  </div>
                  {confirmPassword.length === 4 && confirmPassword !== newPassword && (
                    <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="error" size={13} /> Passwords do not match
                    </div>
                  )}
                  {passwordError && <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>{passwordError}</div>}
                  <button onClick={handleSetPassword} disabled={passwordSaving || newPassword.length < 4 || confirmPassword.length < 4}
                    style={{ width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: (newPassword.length === 4 && confirmPassword.length === 4 && newPassword === confirmPassword) ? clr : C.muted, color: '#fff', opacity: passwordSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name="lock" size={16} />
                    {passwordSaving ? 'Setting Password...' : 'Set Password'}
                  </button>
                </div>
              </>
            ) : (
              /* Password set successfully */
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${clr}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Icon name="check_circle" filled size={36} style={{ color: clr }} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>Password Set!</h2>
                <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, margin: '0 0 20px' }}>
                  Your account is ready. Use your User ID and password to log in after approval.
                </p>

                <div style={{ padding: '14px', borderRadius: 10, background: isDark ? '#27272A' : '#F1F5F9', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: C.muted }}>User ID</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: '0.05em' }}>{generatedId}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: C.muted }}>Password</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{'●●●●'}</span>
                  </div>
                </div>

                <Link to="/login/driver" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', borderRadius: 10, background: clr, color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  Go to Login <Icon name="arrow_forward" size={16} />
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    // Step 1: Application submitted — show ID and proceed to set password
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: 400, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow, padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${clr}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="check_circle" filled size={36} style={{ color: clr }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>Application Submitted!</h2>
          <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, margin: '0 0 20px' }}>
            We'll verify your details and notify you once your account is active.
          </p>

          {/* Generated User ID */}
          <div style={{ padding: '16px', borderRadius: 12, background: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`, marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: isDark ? '#34D399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Your User ID</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: '0.08em' }}>{generatedId}</div>
            <button onClick={() => { navigator.clipboard?.writeText(generatedId); setIdCopied(true); setTimeout(() => setIdCopied(false), 2000); }}
              style={{ marginTop: 8, padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: idCopied ? '#10B981' : clr }}>
              <Icon name={idCopied ? 'check' : 'content_copy'} size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {idCopied ? 'Copied!' : 'Copy ID'}
            </button>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 8, background: isDark ? 'rgba(251,191,36,0.08)' : '#FFFBEB', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}`, marginBottom: 20, fontSize: 11, color: isDark ? '#FBBF24' : '#92400E', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left' }}>
            <Icon name="info" size={14} style={{ flexShrink: 0 }} />
            Remember this ID! Now set your login password.
          </div>

          <button onClick={() => setShowSetPassword(true)}
            style={{ width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, background: clr, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="lock" size={18} /> Set Password
          </button>
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
    <div style={{ minHeight: '100vh', background: C.bg, overflowY: 'auto', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: `${clr}15` }}>
            <Icon name="local_shipping" filled size={28} style={{ color: clr }} />
          </div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            fontFamily: "'Lexend', sans-serif",
            margin: '0 auto',
            letterSpacing: '-0.8px',
            color: isDark ? '#FFFFFF' : '#000000',
          }}>
            Join Mini<span style={{ fontWeight: 300, opacity: 0.85 }}>Truck</span> as a Driver
          </h1>
          <p style={{ fontSize: 13, color: C.sub, marginTop: 8, lineHeight: 1.6 }}>Register your vehicle and start earning with MiniTruck</p>
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

          {/* RC Book Upload - Front & Back */}
          <div style={{ ...cardStyle, background: isDark ? 'linear-gradient(135deg, #18181B, #1a1a2e)' : 'linear-gradient(135deg, #FFFFFF, #F0FDF4)', border: `1.5px dashed ${clr}40` }}>
            <div style={sectionTitle}>
              <Icon name="document_scanner" size={18} style={{ color: clr }} />
              Upload RC Book <span style={{ fontSize: 10, fontWeight: 500, color: C.muted, marginLeft: 4 }}>(Front & Back)</span>
            </div>
            <p style={{ fontSize: 11, color: C.sub, margin: '0 0 12px', lineHeight: 1.5 }}>
              Upload both sides of your RC Book. Crop & adjust before confirming.
            </p>
            {/* Hidden inputs */}
            <input ref={rcRef} type="file" accept="image/*" onChange={e => openCropperForFile(e, processRcFront)} style={{ display: 'none' }} />
            <input ref={rcCamRef} type="file" accept="image/*" capture="environment" onChange={e => openCropperForFile(e, processRcFront)} style={{ display: 'none' }} />
            <input ref={rcBackRef} type="file" accept="image/*" onChange={e => openCropperForFile(e, processRcBack)} style={{ display: 'none' }} />
            <input ref={rcBackCamRef} type="file" accept="image/*" capture="environment" onChange={e => openCropperForFile(e, processRcBack)} style={{ display: 'none' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Front Side */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Front Side *</div>
                {!rcFrontPreview ? (
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setRcPickerOpen(!rcPickerOpen)}
                      style={{ width: '100%', padding: '20px 8px', borderRadius: 10, border: `1.5px dashed ${clr}40`, background: `${clr}06`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Icon name="photo_camera" size={24} style={{ color: clr }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: clr }}>Front Side</span>
                    </button>
                    {rcPickerOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 6, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, boxShadow: '0 8px 28px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                        <button type="button" onClick={() => { setRcPickerOpen(false); rcCamRef.current?.click(); }}
                          style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text }}>
                          <Icon name="photo_camera" size={20} style={{ color: clr }} /> Take Photo
                        </button>
                        <button type="button" onClick={() => { setRcPickerOpen(false); rcRef.current?.click(); }}
                          style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text }}>
                          <Icon name="photo_library" size={20} style={{ color: C.sub }} /> Choose from Gallery
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={rcFrontPreview} alt="RC Front" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `2px solid ${clr}` }} />
                    <button type="button" onClick={() => { setRcFrontPreview(null); setRcPreview(null); setRcExtracted(false); setRcError(''); }}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, background: '#EF4444', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}>
                      <Icon name="close" size={12} />
                    </button>
                    {rcProcessing && <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="progress_activity" size={20} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /></div>}
                    {rcExtracted && <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#10B981', borderRadius: 10, padding: '2px 6px', fontSize: 8, fontWeight: 700, color: '#fff' }}>✓ Extracted</div>}
                  </div>
                )}
              </div>
              {/* Back Side */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Back Side</div>
                {!rcBackPreview ? (
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setRcBackPickerOpen(!rcBackPickerOpen)}
                      style={{ width: '100%', padding: '20px 8px', borderRadius: 10, border: `1.5px dashed ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Icon name="flip" size={24} style={{ color: C.muted }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Back Side</span>
                    </button>
                    {rcBackPickerOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 6, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, boxShadow: '0 8px 28px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                        <button type="button" onClick={() => { setRcBackPickerOpen(false); rcBackCamRef.current?.click(); }}
                          style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text }}>
                          <Icon name="photo_camera" size={20} style={{ color: clr }} /> Take Photo
                        </button>
                        <button type="button" onClick={() => { setRcBackPickerOpen(false); rcBackRef.current?.click(); }}
                          style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text }}>
                          <Icon name="photo_library" size={20} style={{ color: C.sub }} /> Choose from Gallery
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={rcBackPreview} alt="RC Back" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `2px solid ${C.border}` }} />
                    <button type="button" onClick={() => setRcBackPreview(null)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, background: '#EF4444', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}>
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {rcError && (
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Icon name="error" size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, lineHeight: 1.4 }}>{rcError}</span>
              </div>
            )}
          </div>

          {/* Vehicle Info */}
          <div style={cardStyle}>
            <div style={sectionTitle}>
              <Icon name="directions_car" size={18} style={{ color: clr }} />
              Vehicle Information
              {rcExtracted && <span style={{ fontSize: 9, fontWeight: 600, color: '#10B981', background: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', padding: '2px 8px', borderRadius: 4, marginLeft: 'auto' }}>Auto-filled from RC</span>}
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
                <label style={labelStyle}>Vehicle Brand *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {Object.keys(INDIAN_TRUCKS).map(brand => {
                    const selected = selectedBrand === brand;
                    return (
                      <button key={brand} type="button" onClick={() => {
                        setSelectedBrand(brand);
                        setModelSuggestions(ALL_TRUCK_MODELS.filter(t => t.brand === brand));
                        setShowSuggestions(true);
                        if (!selected) { setForm(prev => ({ ...prev, vehicleModel: '' })); setModelQuery(''); }
                      }}
                        style={{
                          padding: '10px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                          background: selected ? `${clr}15` : 'transparent',
                          border: selected ? `2px solid ${clr}` : `1px solid ${C.border}`,
                          fontSize: 11, fontWeight: selected ? 700 : 500, color: selected ? clr : C.text,
                        }}>
                        {brand}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Vehicle Model * {form.vehicleModel && <span style={{ color: clr, fontWeight: 700 }}>✓ {form.vehicleModel}</span>}</label>
                {showSuggestions && modelSuggestions.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {modelSuggestions.map((t, i) => {
                      const sel = form.vehicleModel === t.full;
                      return (
                        <button key={i} type="button" onClick={() => { selectModel(t); setShowSuggestions(false); }}
                          style={{
                            padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                            background: sel ? `${clr}15` : 'transparent',
                            border: sel ? `2px solid ${clr}` : `1px solid ${C.border}`,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                          <Icon name="local_shipping" size={14} style={{ color: sel ? clr : C.muted, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? clr : C.text }}>{t.model}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input type="text" placeholder="Select brand above or type model" value={modelQuery || form.vehicleModel}
                    onChange={e => handleModelInput(e.target.value)}
                    required style={inputStyle} />
                )}
              </div>
              <div>
                <label style={labelStyle}>Vehicle Registration Number *</label>
                <input type="text" placeholder="e.g. MH 04 AB 1234" value={form.regNumber} onChange={set('regNumber')} required
                  style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              </div>
              <div>
                <label style={labelStyle}>Vehicle Year</label>
                <input type="number" placeholder="e.g. 2022" value={form.vehicleYear} onChange={set('vehicleYear')} min="1990" max="2030" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* DL Upload - Front & Back */}
          <div style={{ ...cardStyle, background: isDark ? 'linear-gradient(135deg, #18181B, #1a1a2e)' : 'linear-gradient(135deg, #FFFFFF, #EFF6FF)', border: `1.5px dashed #3B82F640` }}>
            <div style={sectionTitle}>
              <Icon name="credit_card" size={18} style={{ color: isDark ? '#60A5FA' : '#3B82F6' }} />
              Upload Driving License <span style={{ fontSize: 10, fontWeight: 500, color: C.muted, marginLeft: 4 }}>(Front & Back)</span>
            </div>
            <p style={{ fontSize: 11, color: C.sub, margin: '0 0 12px', lineHeight: 1.5 }}>
              Upload both sides. Crop & adjust before confirming.
            </p>
            {/* Hidden inputs */}
            <input ref={dlRef} type="file" accept="image/*" onChange={e => openCropperForFile(e, processDlFront)} style={{ display: 'none' }} />
            <input ref={dlCamRef} type="file" accept="image/*" capture="environment" onChange={e => openCropperForFile(e, processDlFront)} style={{ display: 'none' }} />
            <input ref={dlBackRef} type="file" accept="image/*" onChange={e => openCropperForFile(e, processDlBack)} style={{ display: 'none' }} />
            <input ref={dlBackCamRef} type="file" accept="image/*" capture="environment" onChange={e => openCropperForFile(e, processDlBack)} style={{ display: 'none' }} />

            {(() => { const dlClr = isDark ? '#60A5FA' : '#3B82F6'; return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Front Side */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Front Side *</div>
                {!dlFrontPreview ? (
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setDlPickerOpen(!dlPickerOpen)}
                      style={{ width: '100%', padding: '20px 8px', borderRadius: 10, border: `1.5px dashed ${dlClr}40`, background: `${dlClr}06`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Icon name="photo_camera" size={24} style={{ color: dlClr }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: dlClr }}>Front Side</span>
                    </button>
                    {dlPickerOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 6, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, boxShadow: '0 8px 28px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                        <button type="button" onClick={() => { setDlPickerOpen(false); dlCamRef.current?.click(); }}
                          style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text }}>
                          <Icon name="photo_camera" size={20} style={{ color: dlClr }} /> Take Photo
                        </button>
                        <button type="button" onClick={() => { setDlPickerOpen(false); dlRef.current?.click(); }}
                          style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text }}>
                          <Icon name="photo_library" size={20} style={{ color: C.sub }} /> Choose from Gallery
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={dlFrontPreview} alt="DL Front" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `2px solid ${dlClr}` }} />
                    <button type="button" onClick={() => { setDlFrontPreview(null); setDlPreview(null); setDlExtracted(false); setDlError(''); }}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, background: '#EF4444', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}>
                      <Icon name="close" size={12} />
                    </button>
                    {dlProcessing && <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="progress_activity" size={20} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /></div>}
                    {dlExtracted && <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#10B981', borderRadius: 10, padding: '2px 6px', fontSize: 8, fontWeight: 700, color: '#fff' }}>✓ Extracted</div>}
                  </div>
                )}
              </div>
              {/* Back Side */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Back Side</div>
                {!dlBackPreview ? (
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setDlBackPickerOpen(!dlBackPickerOpen)}
                      style={{ width: '100%', padding: '20px 8px', borderRadius: 10, border: `1.5px dashed ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Icon name="flip" size={24} style={{ color: C.muted }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Back Side</span>
                    </button>
                    {dlBackPickerOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 6, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, boxShadow: '0 8px 28px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                        <button type="button" onClick={() => { setDlBackPickerOpen(false); dlBackCamRef.current?.click(); }}
                          style={{ width: '100%', padding: '14px 16px', border: 'none', borderBottom: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text }}>
                          <Icon name="photo_camera" size={20} style={{ color: dlClr }} /> Take Photo
                        </button>
                        <button type="button" onClick={() => { setDlBackPickerOpen(false); dlBackRef.current?.click(); }}
                          style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: C.text }}>
                          <Icon name="photo_library" size={20} style={{ color: C.sub }} /> Choose from Gallery
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={dlBackPreview} alt="DL Back" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, border: `2px solid ${C.border}` }} />
                    <button type="button" onClick={() => setDlBackPreview(null)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, background: '#EF4444', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}>
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            ); })()}
            {dlError && (
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Icon name="error" size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, lineHeight: 1.4 }}>{dlError}</span>
              </div>
            )}
          </div>

          {/* License Info */}
          <div style={cardStyle}>
            <div style={sectionTitle}>
              <Icon name="badge" size={18} style={{ color: clr }} />
              License Information
              {dlExtracted && <span style={{ fontSize: 9, fontWeight: 600, color: '#10B981', background: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', padding: '2px 8px', borderRadius: 4, marginLeft: 'auto' }}>Auto-filled from DL</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>License Number *</label>
                <input type="text" placeholder="e.g. TN01 20190012345" value={form.licenseNumber} onChange={set('licenseNumber')} required
                  style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
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
              Upload Pictures
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

      {/* Image Cropper Overlay */}
      {cropImage && (
        <ImageCropper
          imageSrc={cropImage}
          isDark={isDark}
          aspect={3 / 2}
          onCropDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      {/* Spin animation for loading icon */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
