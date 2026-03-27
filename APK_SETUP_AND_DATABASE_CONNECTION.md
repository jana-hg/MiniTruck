# 📱 APK Setup & Database Connection Guide

**Status**: ✅ READY TO INSTALL & CONNECT

---

## 🎯 What Works in APK

The APK has **ALL FUNCTIONS** exactly like the web version:

### ✅ Core Features
- ✅ User registration & login
- ✅ Driver registration with RC & photo verification
- ✅ Real-time ride booking & tracking
- ✅ Payment & wallet management
- ✅ Profile management
- ✅ Biometric authentication (WebAuthn)
- ✅ OTP verification
- ✅ WebSocket real-time sync
- ✅ Offline support with automatic sync

### ✅ Driver Verification (NEW)
- ✅ RC document upload
- ✅ Profile photo upload
- ✅ Auto-verification
- ✅ Login blocking if not verified
- ✅ Verification status display
- ✅ Admin approval in web dashboard

### ✅ Database & Backend
- ✅ All data synced with backend database
- ✅ Real-time updates via WebSocket
- ✅ Persistent storage in database
- ✅ Cross-platform data consistency

---

## 🔧 APK Database Connection Setup

### Step 1: Start Backend Server

**Your backend runs on port 5005:**

```bash
# Terminal 1: Start backend server
cd d:\minitruck-app
npm start
```

**Backend will be running at:**
```
http://localhost:5005
http://192.168.x.x:5005 (from other devices on network)
```

### Step 2: Find Your Computer's IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**Example:**
```
Ethernet adapter:
   IPv4 Address . . . . . . . . . . : 192.168.1.100
```

### Step 3: Configure APK API Connection

**For Development (Testing):**

Edit `capacitor.driver.config.ts`:
```typescript
server: {
  url: 'http://192.168.1.100:5005',  // Your computer's IP
  cleartext: true,
}
```

Edit `capacitor.customer.config.ts`:
```typescript
server: {
  url: 'http://192.168.1.100:5005',  // Your computer's IP
  cleartext: true,
}
```

**For Production (Deployed):**
```typescript
server: {
  url: 'https://your-deployed-backend.com',  // Your production URL
}
```

---

## 🔨 Rebuild APKs with Database Connection

After updating the IP address above:

```bash
# 1. Rebuild APKs
npm run build:driver
npm run build:customer

# 2. Rebuild Android projects
cd android-driver
npx cap sync
./gradlew assembleDebug

cd ../android-customer
npx cap sync
./gradlew assembleDebug
```

**New APKs will be at:**
- Driver: `android-driver/app/build/outputs/apk/debug/app-debug.apk`
- Customer: `android-customer/app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 Install & Test

### Install APKs

```bash
adb install -r android-driver/app/build/outputs/apk/debug/app-debug.apk
adb install -r android-customer/app/build/outputs/apk/debug/app-debug.apk
```

### Network Requirements

**APK must be on SAME NETWORK as backend:**
- ✅ Both on home WiFi
- ✅ Both on office WiFi
- ✅ Mobile hotspot from computer
- ❌ Different networks won't work

### Test Database Connection

1. **Start backend server** (see Step 1 above)
2. **Install APK on phone**
3. **Register new driver** with RC & photo
4. **Check web admin dashboard** → See driver in pending list
5. **Check database** → `backend/db.json` has new driver

### Quick Test Flow

**Driver APK:**
```
Register (with RC + photo)
  ↓
See "Documents Verified" banner
  ↓
Cannot login (pending admin approval)
  ↓
Go to web admin → Approve driver
  ↓
Login succeeds in APK
  ↓
Check Profile → Verification status shown
```

**Customer APK:**
```
Login as customer
  ↓
Create booking
  ↓
Get assigned verified driver
  ↓
See ✅ Verified badge on driver name
```

---

## 🗄️ Database Files

**All data is stored in:**
```
d:\minitruck-app\backend\db.json
```

### What's Stored
- ✅ Users (customers, drivers, admins)
- ✅ Bookings & rides
- ✅ Biometric credentials
- ✅ Driver documents & verification status
- ✅ Payment & wallet data
- ✅ Audit logs

### Backup Database
```bash
# Before testing
copy backend\db.json backend\db.json.backup

# After testing
copy backend\db.json.backup backend\db.json
```

---

## 🐛 Troubleshooting

### APK Can't Connect to Backend

**Problem:** "Connection refused" or "Network error"

**Solutions:**
1. ✅ Backend running? Check: `http://192.168.x.x:5005`
2. ✅ IP correct? Update `capacitor.*.config.ts`
3. ✅ Same network? Phone & computer on same WiFi
4. ✅ Firewall? Allow port 5005 in Windows Firewall

### APK Connected but Data Not Saving

**Problem:** Can login but data disappears on restart

**Solutions:**
1. ✅ Backend still running? Restart with `npm start`
2. ✅ `backend/db.json` exists and is writable?
3. ✅ Check console for API errors

### Login Fails in APK

**Problem:** "Invalid credentials" or "User not found"

**Solutions:**
1. ✅ Use correct test account:
   - Driver: ID `D8829`, Password `1234`
   - Customer: ID `9876543210`, Password `1234`
2. ✅ Database has test users? Check `backend/db.json`
3. ✅ Password validation? RC password needs 8+ chars with uppercase, number, special char

---

## 📊 Test Credentials

### Pre-loaded Test Accounts

| Account | ID | Password | Role |
|---------|----|-----------| -----|
| Driver | D8829 | 1234 | driver |
| Customer | 9876543210 | 1234 | customer |
| Admin | admin | 1234 | admin |

### For Driver Verification Test

**New Driver Registration:**
- RC file: Any PDF file (min 100KB)
- Photo: Any image (min 100KB)
- Password: Must be 8+ chars with uppercase, number, special char (e.g., `Test@123`)

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] Backend server running on correct IP
- [ ] APK configured with correct backend URL
- [ ] APK and phone on same network
- [ ] Can register new driver with RC + photo
- [ ] Documents show in admin dashboard
- [ ] Admin can verify/reject documents
- [ ] Driver can login after approval
- [ ] Verification status shows in profile
- [ ] Customer sees verified badge
- [ ] Database has all data persisted
- [ ] Offline sync working
- [ ] WebSocket real-time updates working

---

## 🚀 Production Deployment

For production deployment (not localhost):

1. **Deploy backend to cloud** (Heroku, AWS, DigitalOcean, etc.)
2. **Update Capacitor configs** with production URL
3. **Rebuild APKs** with production URL
4. **Sign APKs** with release keystore
5. **Upload to Google Play** or distribute via other channels

**Production Capacitor Config:**
```typescript
server: {
  url: 'https://your-minitruck-api.com',
  // No cleartext needed for HTTPS
}
```

---

## 📞 Support

**If APK doesn't work:**
1. ✅ Check backend is running: `npm start`
2. ✅ Check IP address in capacitor config
3. ✅ Check phone & computer on same network
4. ✅ Check `backend/db.json` for test users
5. ✅ Check Android logcat for errors

**Backend logs:**
```bash
# Watch live logs while testing
npm start
```

---

**Version**: 1.0.0
**Last Updated**: March 27, 2026
**Status**: ✅ Ready for Testing

