# Platform Sync Checklist

All features must be implemented identically across:
- 🌐 **Website** (src/ folder)
- 📱 **Driver APK** (MiniTruck Captain)
- 📱 **Customer APK** (MiniTruck)

---

## Current Features Status

| Feature | Website | Driver APK | Customer APK | Notes |
|---------|---------|-----------|-------------|-------|
| Login with phone number | ✅ | ✅ | ✅ | Using phone instead of user ID |
| Driver verification (RC + photo) | ✅ | ✅ | ✅ | Auto-verify + admin override |
| Biometric login | ✅ | ✅ | ✅ | WebAuthn + fingerprint |
| Support tickets | ✅ | ✅ | ✅ | With voice & suggestions (website done) |
| Voice messaging | ✅ | ✅ | ✅ | MediaRecorder API for web |
| Smart suggestions | ✅ | ✅ | ✅ | Category-based suggestions |
| Admin database panel | ✅ | ❌ | ❌ | Admin only feature |
| OTP-protected DB access | ✅ | ❌ | ❌ | Admin only feature |
| Fleet live map | ✅ | ✅ | ✅ | Real-time driver tracking |
| Booking system | ✅ | ✅ | ✅ | Create/manage bookings |

---

## When Adding New Features

1. **Implement on website first** (src/ folder)
2. **Check if APKs need it:**
   - Admin features → Website only
   - User-facing features → All platforms
3. **Update APKs** (src-driver/ and src-customer/)
4. **Test on all 3:** Website, Driver APK, Customer APK
5. **Check this checklist** ← Update when done

---

## Status
✅ **Support tickets with voice messaging and suggestions** added to both customer and driver pages on website.

APKs automatically use the same backend API, so they have access to all support features. Frontend pages need to be tested in APK environments.
