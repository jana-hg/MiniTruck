# ✅ APK Driver Verification - Quick Implementation Checklist

## 🎯 Driver APK (MiniTruck Captain)

### Registration Screen (`src/pages/auth/DriverRegister.jsx`)
- [ ] Add `rcFile` state
- [ ] Add `profilePhoto` state
- [ ] Add `validateFiles()` function
- [ ] Add `fileToBase64()` function
- [ ] Add file input for RC upload
- [ ] Add file input for profile photo
- [ ] Show file names when selected (✅)
- [ ] Make both fields required (*)
- [ ] Update registration API call to include files
- [ ] Handle `documentVerification` in response

**Code Template**:
```javascript
const [rcFile, setRcFile] = useState(null);
const [profilePhoto, setProfilePhoto] = useState(null);

const handleRegister = async () => {
  if (!profilePhoto) {
    setError("Driver profile photo is required");
    return;
  }
  if (!rcFile) {
    setError("Registration Certificate (RC) is required");
    return;
  }

  const response = await api.post('/api/drivers/register', {
    // ... existing fields ...
    profilePicture: await fileToBase64(profilePhoto),
    uploadedDocuments: {
      rc: await fileToBase64(rcFile)
    }
  });
};
```

---

### Login Screen (`src/pages/auth/LoginScreen.jsx`)
- [ ] Add try-catch for login
- [ ] Handle 403 status code
- [ ] Check for "RC" in error message
- [ ] Check for "photo" in error message
- [ ] Check for "approval" in error message
- [ ] Check for "rejected" in error message
- [ ] Show specific error messages
- [ ] Add visual error styling (yellow/red background)
- [ ] Add "Check Status" button (optional)

**Code Template**:
```javascript
try {
  const response = await api.post('/api/auth/login', {
    id: driverId,
    password,
    role: 'driver'
  });
  // Success
  saveToken(response.token);
} catch (error) {
  if (error.response?.status === 403) {
    const msg = error.response.data.error;
    if (msg.includes('RC')) {
      setError('⏳ Your RC is pending verification');
    } else if (msg.includes('photo')) {
      setError('⏳ Your photo is pending verification');
    } else if (msg.includes('approval')) {
      setError('⏳ Your account is pending approval');
    } else if (msg.includes('rejected')) {
      setError('❌ Your application was rejected');
    }
  }
}
```

---

### Home Screen (`src/pages/driver/DriverHome.jsx`)
- [ ] Fetch user from localStorage
- [ ] Extract `documentVerification` field
- [ ] Create `VerificationStatusBanner` component
- [ ] Show banner only if verification pending
- [ ] Show which doc is pending (RC or photo)
- [ ] Green banner if both verified
- [ ] Yellow banner if pending
- [ ] Display at top of page

**Code Template**:
```javascript
const VerificationStatusBanner = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const dv = user.documentVerification;

  if (!dv?.rc?.verified || !dv?.profilePhoto?.verified) {
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#FEF3C7',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        ⏳ Document verification pending
      </div>
    );
  }
  return null;
};
```

---

### Profile Screen (`src/pages/driver/DriverProfile.jsx`)
- [ ] Create `VerificationSection` component
- [ ] Show RC verification status
- [ ] Show photo verification status
- [ ] Show verification type (auto-verified, verified, pending, rejected)
- [ ] Show verification timestamp
- [ ] Show admin's rejection reason if any
- [ ] Style with colors (green for verified, yellow for pending, red for rejected)
- [ ] Place below personal info section

**Code Template**:
```javascript
const VerificationSection = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const dv = user.documentVerification;

  if (!dv) return <p>No verification data</p>;

  return (
    <div style={{ border: '1px solid #E5E7EB', padding: '16px', marginBottom: '16px' }}>
      <h3>Document Verification</h3>

      <div style={{ marginBottom: '12px' }}>
        <label>RC Status</label>
        <div style={{
          padding: '8px 12px',
          backgroundColor: dv.rc?.verified ? '#D1FAE5' : '#FEF3C7',
          borderRadius: '6px'
        }}>
          {dv.rc?.verified ? '✅ Verified' : '⏳ Pending'}
        </div>
      </div>

      <div>
        <label>Photo Status</label>
        <div style={{
          padding: '8px 12px',
          backgroundColor: dv.profilePhoto?.verified ? '#D1FAE5' : '#FEF3C7',
          borderRadius: '6px'
        }}>
          {dv.profilePhoto?.verified ? '✅ Verified' : '⏳ Pending'}
        </div>
      </div>
    </div>
  );
};
```

---

## 👥 Customer APK (MiniTruck)

### Driver Card Component (`src/pages/customer/DriverDetails.jsx` or similar)
- [ ] Create `DriverVerificationBadge` component
- [ ] Check `documentVerification?.rc?.verified` && `documentVerification?.profilePhoto?.verified`
- [ ] Show ✅ badge if both verified
- [ ] Place next to driver name
- [ ] Use green color (#D1FAE5)

**Code Template**:
```javascript
const DriverVerificationBadge = ({ driver }) => {
  const isVerified = driver.documentVerification?.rc?.verified &&
                     driver.documentVerification?.profilePhoto?.verified;

  if (!isVerified) return null;

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: '#D1FAE5',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#065F46',
      marginLeft: '8px'
    }}>
      ✅ Verified
    </span>
  );
};
```

---

### Assignment Notification (`src/pages/customer/RideTracking.jsx`)
- [ ] Create `DriverVerificationIndicator` in driver assignment card
- [ ] Show "Identity verified" if verified
- [ ] Place below driver name
- [ ] Use green color
- [ ] Show even if not verified (just don't display badge)

**Code Template**:
```javascript
const DriverCard = ({ driver }) => {
  const isVerified = driver.documentVerification?.rc?.verified &&
                     driver.documentVerification?.profilePhoto?.verified;

  return (
    <div>
      <h3>{driver.name}</h3>
      {isVerified && (
        <p style={{ color: '#065F46' }}>✅ Identity verified</p>
      )}
    </div>
  );
};
```

---

## 🔧 API Service Updates (`src/services/api.js`)

- [ ] Add `drivers.registerWithVerification` endpoint
- [ ] Add `drivers.getPendingVerification` endpoint (admin)
- [ ] Add `drivers.verifyDocuments` endpoint (admin)
- [ ] Ensure all endpoints return `documentVerification` field

**Code Template**:
```javascript
export const drivers = {
  registerWithVerification: (data) =>
    api.post('/api/drivers/register', data).then(r => r.data),

  getPendingVerification: () =>
    api.get('/api/drivers/pending-verification').then(r => r.data),

  verifyDocuments: (id, data) =>
    api.post(`/api/drivers/${id}/verify-documents`, data).then(r => r.data),
};
```

---

## 📱 Testing Checklist

### Driver APK Registration
- [ ] Open registration
- [ ] Try submit without RC → Error message shown
- [ ] Try submit without photo → Error message shown
- [ ] Upload valid RC and photo
- [ ] Submit → Success
- [ ] Check response includes `documentVerification`

### Driver APK Login
- [ ] Try login immediately after registration
  - [ ] Should show "RC pending verification" OR
  - [ ] Should show "Photo pending verification" OR
  - [ ] Should show "Account pending approval"
- [ ] Admin verifies documents
- [ ] Admin approves account
- [ ] Try login again → Should succeed

### Driver APK Home
- [ ] After login, check home screen
- [ ] If pending: Should show ⏳ banner
- [ ] If approved: No banner shown
- [ ] Banner should indicate which doc pending

### Driver APK Profile
- [ ] Open profile
- [ ] Scroll to "Document Verification" section
- [ ] Check RC status shown
- [ ] Check photo status shown
- [ ] Verify statuses match response

### Customer APK
- [ ] Open available drivers list
- [ ] Verified drivers should have ✅ badge
- [ ] Unverified drivers should have no badge
- [ ] Get assigned to verified driver
- [ ] Assignment notification should show "Identity verified"

---

## 🎨 Color Scheme

Use consistent colors across all APKs:

| Status | Background | Text | Icon |
|--------|-----------|------|------|
| Verified | #D1FAE5 (green) | #065F46 (dark green) | ✅ |
| Pending | #FEF3C7 (yellow) | #92400E (dark yellow) | ⏳ |
| Rejected | #FEE2E2 (red) | #991B1B (dark red) | ❌ |

---

## 📋 Implementation Order

1. **Start with Driver APK** (Most critical)
   - [ ] DriverRegister - Add file uploads
   - [ ] LoginScreen - Add error handling
   - [ ] DriverHome - Add banner
   - [ ] DriverProfile - Add verification section

2. **Then Customer APK** (Secondary)
   - [ ] DriverDetails - Add badge
   - [ ] RideTracking - Add indicator

3. **Test Everything**
   - [ ] Full registration flow
   - [ ] Full login flow
   - [ ] Verification status display
   - [ ] Customer visibility

---

## ⏱️ Estimated Time

- **Driver APK**: 2-3 hours
- **Customer APK**: 1-2 hours
- **Testing**: 1-2 hours
- **Total**: 4-7 hours

---

## 🔗 Related Documentation

- `APK_DRIVER_VERIFICATION_IMPLEMENTATION.md` - Full implementation guide
- `DRIVER_VERIFICATION_GUIDE.md` - Backend API reference
- `DRIVER_VERIFICATION_QUICK_API.md` - Quick API reference

---

## ✅ Final Verification

When complete, verify:
- [ ] Driver can register with RC & photo
- [ ] Driver blocked from login if not verified
- [ ] Driver sees status on profile
- [ ] Customer sees verified badge on drivers
- [ ] Error messages are helpful
- [ ] All styling is consistent
- [ ] Works offline (with localStorage)
- [ ] Works online (with API)

---

**Version**: 1.0.0
**Status**: Ready for Development
**Last Updated**: March 27, 2026
