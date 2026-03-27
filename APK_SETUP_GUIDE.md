# APK Setup & Deployment Guide

**IMPORTANT:** APKs are the primary platform. Follow this guide carefully to avoid conflicts and sync issues.

---

## ⚠️ Critical: Configure Backend URL

Before building APKs, you MUST set the backend server URL in environment files:

### Step 1: Update `.env.customer` (Customer APK)
```
VITE_APP_PLATFORM=customer
VITE_API_BASE=http://YOUR_BACKEND_IP:5005/api
```

### Step 2: Update `.env.driver` (Driver APK)
```
VITE_APP_PLATFORM=driver
VITE_API_BASE=http://YOUR_BACKEND_IP:5005/api
```

**Replace `YOUR_BACKEND_IP` with:**
- **Development:** Your computer's IP (find with `ipconfig` on Windows)
  - Example: `http://192.168.1.100:5005/api`
- **Production:** Your backend server domain
  - Example: `https://api.yourdomain.com/api`

---

## 🏗️ Building APKs

### Customer APK (MiniTruck)
```bash
npm run build:customer
npm run cap:copy:customer
cd android-customer
./gradlew build
# APK output: android-customer/app/build/outputs/apk/debug/
```

### Driver APK (MiniTruck Captain)
```bash
npm run build:driver
npm run cap:copy:driver
cd android-driver
./gradlew build
# APK output: android-driver/app/build/outputs/apk/debug/
```

---

## 📱 Installation on Device

### Android Emulator
```bash
cd android-customer
./gradlew installDebug
```

### Physical Device (connected via USB)
```bash
cd android-customer
./gradlew installDebug
# Make sure device is in USB debugging mode
```

---

## 🔒 Database & API Sync Checklist

Before deploying APK to production:

- [ ] **Backend Server Running**
  - Ensure `node backend/server.js` is running on production server
  - Port 5005 is accessible from your network

- [ ] **Database Connection**
  - `db.json` exists and is readable by backend
  - Database is not corrupted
  - All collections are present (users, drivers, bookings, etc.)

- [ ] **API Endpoints Working**
  - Test: `curl http://YOUR_BACKEND_IP:5005/api/auth/login`
  - Should return error response, not timeout

- [ ] **CORS Configuration**
  - Backend has CORS enabled for APK domain
  - Check `backend/server.js` for CORS headers

- [ ] **Environment Variables Correct**
  - `VITE_API_BASE` matches your actual backend URL
  - No hardcoded localhost URLs

- [ ] **WebSocket Connection**
  - Socket.io is configured for real-time sync
  - Check that real-time features (live tracking, notifications) work

---

## 🚨 Common Issues & Fixes

### APK Can't Connect to Backend
**Error:** Connection timeout or "Cannot reach server"

**Fix:**
1. Check backend is running: `node backend/server.js`
2. Verify IP is correct: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Disable Windows Firewall or add exception for port 5005
4. Make sure device is on same WiFi network

### Database Errors in APK
**Error:** "Cannot read property 'id' of undefined" or missing data

**Fix:**
1. Check `backend/db.json` is not corrupted: `cat backend/db.json | head -20`
2. Restart backend: `node backend/server.js`
3. Rebuild APK with fresh code: `npm run build:customer && npm run cap:copy:customer`

### APK Shows Old Data
**Error:** Changes in APK don't sync, shows stale data

**Fix:**
1. Clear APK cache: Settings → Apps → MiniTruck → Storage → Clear Cache
2. Restart backend server
3. Restart APK

---

## 📝 Pre-Deployment Checklist

- [ ] All features tested in APK (support, bookings, driver verification)
- [ ] No console errors in Logcat
- [ ] Backend database is backed up
- [ ] APK version number updated in `AndroidManifest.xml`
- [ ] Production backend URL set in `.env.customer` and `.env.driver`
- [ ] Tested on physical device (not just emulator)
- [ ] All user data preserved after APK update

---

## 🔄 Update Workflow

When pushing updates to production:

1. **Make changes** to `src/`
2. **Test in web** (quick feedback loop)
3. **Test in APK**: `npm run build:customer && npm run cap:copy:customer`
4. **Test on device**: Install and verify
5. **Push to production**:
   - Update backend if needed
   - Update APK URL if server changed
   - Rebuild APKs
   - Deploy to users

---

## 📞 Support

If APK has connection issues:
- Check backend logs: `tail -f backend/server.log` (if logging is enabled)
- Verify network: Can other apps connect to backend?
- Test API directly: `curl http://YOUR_IP:5005/api/auth/login`
