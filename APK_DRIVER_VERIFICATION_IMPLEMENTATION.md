# 📱 Driver Verification in APKs - Implementation Guide

**Status**: 📋 Planning & Implementation
**Date**: March 27, 2026
**Target**: Both Customer APK & Driver APK (MiniTruck Captain)

---

## 🎯 Overview

Implement the same driver verification system in APKs:
- **Driver APK**: Show verification status, block login if not verified
- **Customer APK**: Show driver verification status on driver details
- **Admin Web**: Already implemented ✅

---

## 🔄 Driver APK Changes (MiniTruck Captain)

### 1. Driver Registration Screen Changes

**File**: `src/pages/auth/DriverRegister.jsx` (Create/Enhance)

**Changes Needed**:
```javascript
// New state for documents
const [rcFile, setRcFile] = useState(null);
const [profilePhoto, setProfilePhoto] = useState(null);

// New validation
const validateFiles = () => {
  if (!profilePhoto) {
    return { valid: false, error: "Profile photo is required" };
  }
  if (!rcFile) {
    return { valid: false, error: "Registration Certificate (RC) is required" };
  }
  return { valid: true };
};

// Convert files to base64
const fileToBase64 = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};

// Enhanced registration
const handleRegister = async () => {
  const fileValidation = validateFiles();
  if (!fileValidation.valid) {
    setError(fileValidation.error);
    return;
  }

  const profilePhotoBase64 = await fileToBase64(profilePhoto);
  const rcBase64 = await fileToBase64(rcFile);

  const response = await api.post('/api/drivers/register', {
    name,
    phone,
    licenseNumber,
    licenseExpiry,
    password,
    profilePicture: profilePhotoBase64,
    uploadedDocuments: {
      rc: rcBase64
    },
    vehicleType,
    vehicleMake,
    vehicleModel,
    vehicleRegNumber
  });

  // Response will include documentVerification status
  console.log('Registration successful:', response);
};
```

**UI Changes**:
```jsx
// Add file upload inputs
<div>
  <label>Profile Photo *</label>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => setProfilePhoto(e.target.files[0])}
    required
  />
  {profilePhoto && <p>✅ {profilePhoto.name}</p>}
</div>

<div>
  <label>Registration Certificate (RC) *</label>
  <input
    type="file"
    accept=".pdf,image/*"
    onChange={(e) => setRcFile(e.target.files[0])}
    required
  />
  {rcFile && <p>✅ {rcFile.name}</p>}
</div>
```

---

### 2. Driver Login Screen Changes

**File**: `src/pages/auth/LoginScreen.jsx` (Driver Role)

**Changes Needed**:
```javascript
// Enhanced login error handling
const handleLogin = async () => {
  try {
    const response = await api.post('/api/auth/login', {
      id: driverId,
      password,
      role: 'driver'
    });

    // Success - driver verified
    saveToken(response.token);
    navigate('/driver');
  } catch (error) {
    // Handle verification errors
    if (error.response?.status === 403) {
      const errorMsg = error.response.data.error;

      // Show specific verification messages
      if (errorMsg.includes('RC')) {
        setError('⏳ Your Registration Certificate is pending verification. Please wait for admin approval.');
      } else if (errorMsg.includes('photo')) {
        setError('⏳ Your profile photo is pending verification. Please wait for admin approval.');
      } else if (errorMsg.includes('approval')) {
        setError('⏳ Your account is pending approval. Check back soon!');
      } else if (errorMsg.includes('rejected')) {
        setError('❌ Your application was rejected. Please contact support.');
      }
    } else {
      setError('Invalid credentials');
    }
  }
};
```

**UI Changes**:
```jsx
// Add helpful messaging
{error && (
  <div style={{
    padding: '12px',
    backgroundColor: '#FEE2E2',
    borderRadius: '8px',
    color: '#991B1B',
    marginBottom: '16px',
    fontSize: '13px',
    lineHeight: 1.5
  }}>
    {error}
  </div>
)}

// Add status checking button
<button
  onClick={() => checkVerificationStatus()}
  style={{ marginTop: '12px', opacity: 0.7 }}
>
  Check Verification Status
</button>
```

---

### 3. Driver Home Screen Changes

**File**: `src/pages/driver/DriverHome.jsx`

**Add Verification Status Banner**:
```javascript
const [verificationStatus, setVerificationStatus] = useState(null);

useEffect(() => {
  // Show verification status
  const driverId = localStorage.getItem('driverId');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};

  setVerificationStatus(user.documentVerification);
}, []);

// Show verification status component
const VerificationStatusBanner = () => {
  if (!verificationStatus) return null;

  const isFullyVerified = verificationStatus?.rc?.verified &&
                         verificationStatus?.profilePhoto?.verified;

  if (isFullyVerified) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#D1FAE5',
        borderRadius: '8px',
        marginBottom: '16px',
        color: '#065F46'
      }}>
        ✅ Your documents are verified. Account pending approval.
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#FEF3C7',
      borderRadius: '8px',
      marginBottom: '16px',
      color: '#92400E'
    }}>
      ⏳ Document verification pending.
      {!verificationStatus?.rc?.verified && ' RC needs verification.'}
      {!verificationStatus?.profilePhoto?.verified && ' Photo needs verification.'}
    </div>
  );
};
```

---

### 4. Driver Profile Screen Changes

**File**: `src/pages/driver/DriverProfile.jsx`

**Add Verification Details Section**:
```javascript
const VerificationSection = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const docVerif = user.documentVerification;

  if (!docVerif) return null;

  return (
    <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <h3 style={{ marginTop: 0 }}>Document Verification</h3>

      <div style={{ marginBottom: '12px' }}>
        <p style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>
          Registration Certificate (RC)
        </p>
        <div style={{
          padding: '8px 12px',
          backgroundColor: docVerif.rc?.verified ? '#D1FAE5' : '#FEF3C7',
          borderRadius: '6px',
          fontSize: '13px',
          color: docVerif.rc?.verified ? '#065F46' : '#92400E'
        }}>
          {docVerif.rc?.verified ? '✅ Verified' : '⏳ Pending Review'}
          {docVerif.rc?.verificationStatus === 'auto-verified' && ' (Auto-verified)'}
          {docVerif.rc?.verificationStatus === 'verified' && ' (Admin verified)'}
          {docVerif.rc?.verificationStatus === 'rejected' && ' (Rejected)'}
        </div>
      </div>

      <div>
        <p style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>
          Profile Photo
        </p>
        <div style={{
          padding: '8px 12px',
          backgroundColor: docVerif.profilePhoto?.verified ? '#D1FAE5' : '#FEF3C7',
          borderRadius: '6px',
          fontSize: '13px',
          color: docVerif.profilePhoto?.verified ? '#065F46' : '#92400E'
        }}>
          {docVerif.profilePhoto?.verified ? '✅ Verified' : '⏳ Pending Review'}
          {docVerif.profilePhoto?.verificationStatus === 'auto-verified' && ' (Auto-verified)'}
          {docVerif.profilePhoto?.verificationStatus === 'verified' && ' (Admin verified)'}
          {docVerif.profilePhoto?.verificationStatus === 'rejected' && ' (Rejected)'}
        </div>
      </div>

      {docVerif.rc?.verificationReason && (
        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          RC Note: {docVerif.rc.verificationReason}
        </p>
      )}

      {docVerif.profilePhoto?.verificationReason && (
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          Photo Note: {docVerif.profilePhoto.verificationReason}
        </p>
      )}
    </div>
  );
};
```

---

## 👥 Customer APK Changes (MiniTruck)

### 1. Driver Details Screen Changes

**File**: `src/pages/customer/DriverDetails.jsx` (New or Enhanced)

**Show Driver Verification Status**:
```javascript
const DriverVerificationBadge = ({ driver }) => {
  const isVerified = driver.documentVerification?.rc?.verified &&
                     driver.documentVerification?.profilePhoto?.verified;

  if (!isVerified) return null;

  return (
    <div style={{
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: '#D1FAE5',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#065F46',
      marginLeft: '8px'
    }}>
      ✅ Verified
    </div>
  );
};

// In driver card/details
<div>
  <h3>{driver.name} <DriverVerificationBadge driver={driver} /></h3>
  <p>Rating: {driver.rating}/5</p>
  {driver.documentVerification?.profilePhoto?.verified && (
    <p style={{ fontSize: '12px', color: '#666' }}>
      📸 Identity verified
    </p>
  )}
</div>
```

### 2. Driver Assignment Notification Changes

**File**: `src/pages/driver/RideTracking.jsx`

**Show Verification Status When Driver Assigned**:
```javascript
const DriverAssignmentCard = ({ driver }) => {
  const isVerified = driver.documentVerification?.rc?.verified &&
                     driver.documentVerification?.profilePhoto?.verified;

  return (
    <div style={{
      padding: '16px',
      border: '1px solid #E5E7EB',
      borderRadius: '12px'
    }}>
      <h3>{driver.name}</h3>

      {isVerified && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#D1FAE5',
          borderRadius: '6px',
          marginBottom: '8px',
          fontSize: '13px',
          color: '#065F46'
        }}>
          ✅ Identity Verified Driver
        </div>
      )}

      <p>Rating: {driver.rating}/5 ⭐</p>
      <p>Vehicle: {driver.vehicleDetails?.make} {driver.vehicleDetails?.model}</p>
      <p>ETA: {driver.eta || 'Calculating...'}</p>
    </div>
  );
};
```

---

## 🔧 API Integration (For Both APKs)

### Update API Service

**File**: `src/services/api.js`

**Add Driver Verification Endpoints**:
```javascript
// Add to drivers object
export const drivers = {
  // ... existing endpoints ...

  // Get driver with verification status
  getDriverWithVerification: (id) =>
    api.get(`/api/drivers/${id}`).then(r => r.data),

  // Get drivers pending verification (admin only)
  getPendingVerification: () =>
    api.get('/api/drivers/pending-verification').then(r => r.data),

  // Register with verification (driver only)
  registerWithVerification: (data) =>
    api.post('/api/drivers/register', data).then(r => r.data),

  // Verify documents (admin only)
  verifyDocuments: (driverId, verification) =>
    api.post(`/api/drivers/${driverId}/verify-documents`, verification).then(r => r.data),
};
```

---

## 📱 UI/UX Changes Summary

### For Driver APK
| Component | Change | Purpose |
|-----------|--------|---------|
| Registration Screen | Add RC & photo uploads | Require verification docs |
| Login Screen | Show specific error messages | Help drivers understand why blocked |
| Home Screen | Add verification banner | Show verification status |
| Profile Screen | Add verification section | Display detailed verification status |

### For Customer APK
| Component | Change | Purpose |
|-----------|--------|---------|
| Driver Card | Add verification badge | Show driver is verified |
| Driver Details | Show verification indicator | Build customer trust |
| Assignment Notification | Show verified status | Reassure customer |

---

## 📋 Implementation Checklist

### Phase 1: Driver APK Registration
- [ ] Add RC file upload input
- [ ] Add profile photo file upload input
- [ ] Add file validation (required fields)
- [ ] Convert files to base64
- [ ] Send to `/api/drivers/register`
- [ ] Handle verification status in response
- [ ] Show success/error messages

### Phase 2: Driver APK Login
- [ ] Update error handling for 403 responses
- [ ] Show specific verification messages
- [ ] Add "Check Status" button
- [ ] Save verification status after login

### Phase 3: Driver APK Home
- [ ] Fetch driver data with verification status
- [ ] Show verification status banner
- [ ] Update on app startup
- [ ] Refresh when needed

### Phase 4: Driver APK Profile
- [ ] Add verification details section
- [ ] Show RC verification status
- [ ] Show photo verification status
- [ ] Display verification timestamps
- [ ] Show admin notes if rejected

### Phase 5: Customer APK
- [ ] Add verification badge to driver cards
- [ ] Show verified indicator in driver details
- [ ] Display in assignment notifications
- [ ] Build trust with customer

### Phase 6: Testing
- [ ] Register driver with RC & photo
- [ ] Verify auto-verification works
- [ ] Try login before approval
- [ ] Login after approval
- [ ] Check status displays correctly

---

## 🎨 UI Component Examples

### Verification Status Banner
```jsx
// Pending Verification
<div style={{
  padding: '12px 16px',
  backgroundColor: '#FEF3C7',
  borderRadius: '8px',
  borderLeft: '4px solid #F59E0B',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}}>
  <span style={{ fontSize: '16px' }}>⏳</span>
  <div>
    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Pending Verification</p>
    <p style={{ margin: 0, fontSize: '12px', color: '#92400E' }}>Your documents are being reviewed</p>
  </div>
</div>

// Verified
<div style={{
  padding: '12px 16px',
  backgroundColor: '#D1FAE5',
  borderRadius: '8px',
  borderLeft: '4px solid #10B981',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}}>
  <span style={{ fontSize: '16px' }}>✅</span>
  <div>
    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Verified</p>
    <p style={{ margin: 0, fontSize: '12px', color: '#065F46' }}>Your documents are verified</p>
  </div>
</div>

// Rejected
<div style={{
  padding: '12px 16px',
  backgroundColor: '#FEE2E2',
  borderRadius: '8px',
  borderLeft: '4px solid #EF4444',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}}>
  <span style={{ fontSize: '16px' }}>❌</span>
  <div>
    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Verification Failed</p>
    <p style={{ margin: 0, fontSize: '12px', color: '#991B1B' }}>Please resubmit your documents</p>
  </div>
</div>
```

---

## 🔄 Data Flow in APK

```
DRIVER APK FLOW
═══════════════════════════════════════════════════════

1. Registration
   ├─ Driver selects RC file
   ├─ Driver selects profile photo
   ├─ Driver enters password
   └─ POST /api/drivers/register
      └─ Response includes documentVerification status

2. Backend Processing
   ├─ Auto-validates files
   ├─ Sets verification status
   └─ Sets status to pending-approval

3. Login Attempt
   └─ POST /api/auth/login
      ├─ Check RC verified
      ├─ Check photo verified
      ├─ Check account approved
      └─ Response: token ✅ or error ❌

4. Home Screen
   ├─ Get driver data from localStorage
   ├─ Check documentVerification field
   └─ Show banner based on status

5. Profile Screen
   ├─ Display verification status
   ├─ Show RC verification
   ├─ Show photo verification
   └─ Display timestamps & notes


CUSTOMER APK FLOW
═══════════════════════════════════════════════════════

1. View Driver Details
   ├─ GET /api/drivers/:id
   ├─ Check documentVerification field
   └─ Show ✅ verified badge if verified

2. Get Assigned Driver
   ├─ Receive driver assignment
   ├─ Check driver.documentVerification
   └─ Show verification badge in notification

3. Build Trust
   ├─ Display verified indicator
   ├─ Show identity verified status
   └─ Reassure customer about safety
```

---

## ✅ Testing in APK

### Test Scenario 1: Registration
```
1. Open Driver APK registration
2. Select RC file
3. Select profile photo
4. Enter all details
5. Click register
✅ Should show success + verification status
```

### Test Scenario 2: Login Before Approval
```
1. Open Driver APK login
2. Enter credentials
3. Click login
❌ Should show "Your account is pending approval"
```

### Test Scenario 3: Login After Approval
```
1. Admin approves driver account
2. Open Driver APK login
3. Enter credentials
4. Click login
✅ Should login successfully
```

### Test Scenario 4: View Verification Status
```
1. After login, go to Profile
2. Scroll to "Document Verification"
3. Should show RC status: ✅ Verified
4. Should show Photo status: ✅ Verified
```

### Test Scenario 5: Customer sees Verified Driver
```
1. Open Customer APK
2. View assigned driver
3. Should see ✅ badge next to driver name
4. Should see "Identity Verified" indicator
```

---

## 📦 Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `src/pages/auth/DriverRegister.jsx` | Enhance | Add RC & photo upload |
| `src/pages/auth/LoginScreen.jsx` | Enhance | Better error messages |
| `src/pages/driver/DriverHome.jsx` | Enhance | Add verification banner |
| `src/pages/driver/DriverProfile.jsx` | Enhance | Add verification section |
| `src/pages/customer/DriverDetails.jsx` | Enhance | Show verification badge |
| `src/pages/customer/RideTracking.jsx` | Enhance | Show verified indicator |
| `src/services/api.js` | Enhance | Add verification endpoints |

---

## 🚀 Deployment Order

1. **Backend First** ✅ Already done
   - All APIs ready
   - Database schema updated

2. **Driver APK Second** (Priority)
   - Registration with verification
   - Login with verification checks
   - Profile showing status

3. **Customer APK Third**
   - Show verification badges
   - Display verified drivers
   - Build customer trust

4. **Test Everything**
   - Driver registration flow
   - Driver login flow
   - Customer visibility
   - Error messages

---

## ✨ Summary

**Driver APK Changes**:
- Add RC & photo file upload to registration
- Show better error messages on login
- Display verification status on home & profile
- Show which documents are verified/pending/rejected

**Customer APK Changes**:
- Show verification badge on driver cards
- Display "Verified Driver" in assignment notifications
- Build customer trust with certified drivers

**Result**: Same verification system across all platforms (Web, Customer APK, Driver APK)

---

**Version**: 1.0.0
**Status**: Ready for Implementation
**Priority**: High
**Estimated Time**: 4-6 hours development + testing
