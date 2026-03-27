# 🚀 Quick Commands Reference

## Build Commands

```bash
# Build all versions
npm run build              # Web (default) → dist/
npm run build:customer     # Customer app → dist-customer/
npm run build:driver       # Driver app → dist-driver/

# Build and sync to Android projects
npm run cap:build:customer # Build customer + sync to android-customer/
npm run cap:build:driver   # Build driver + sync to android-driver/

# Sync already-built web assets to Android
npm run cap:copy:customer  # Sync dist-customer/ → android-customer/
npm run cap:copy:driver    # Sync dist-driver/ → android-driver/
```

---

## Development

```bash
# Start dev server (web version with all portals)
npm run dev

# Run linter
npm run lint

# Preview production build
npm run preview

# Run backend server
npm run serve
npm run start              # Build + start server
```

---

## Android Build (Command Line)

```bash
# Build Customer APK
cd android-customer
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk

# Build Driver APK
cd android-driver
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

---

## Install on Device

```bash
# Install Customer APK
adb install android-customer/app/build/outputs/apk/release/app-release.apk

# Install Driver APK
adb install android-driver/app/build/outputs/apk/release/app-release.apk

# List installed apps
adb shell pm list packages | grep minitruck

# Uninstall
adb uninstall com.minitruck.customer
adb uninstall com.minitruck.captain
```

---

## Android Studio Workflow

### Open Customer Project
```bash
# Option 1: From Android Studio
File → Open → Select android-customer/

# Option 2: From command line
open -a "Android Studio" android-customer/  # macOS
start android-customer/                     # Windows
```

### Open Driver Project
```bash
# Same as above, but use android-driver/ instead
```

### Build APK in Android Studio
1. `Build` → `Generate Signed APK`
2. Select/create keystore
3. Choose `release` build variant
4. Click `Finish`

---

## File Locations

```
Web App (Default):
  dist/index.html

Customer App:
  dist-customer/index.html
  android-customer/app/src/main/assets/public/
  android-customer/app/build/outputs/apk/release/app-release.apk

Driver App:
  dist-driver/index.html
  android-driver/app/src/main/assets/public/
  android-driver/app/build/outputs/apk/release/app-release.apk
```

---

## Environment Detection

```javascript
// In your React components
import { usePlatform } from '../context/PlatformContext';

const { platform, isCustomer, isDriver, isWeb, isNative } = usePlatform();
```

---

## Configuration Files

```
capacitor.config.ts              ← Default (customer)
capacitor.customer.config.ts     ← Customer configuration
capacitor.driver.config.ts       ← Driver configuration

.env                 ← Web platform
.env.customer       ← Customer app env
.env.driver         ← Driver app env
```

---

## APK File Naming

- **Customer APK**: `com.minitruck.customer-release.apk`
- **Driver APK**: `com.minitruck.captain-release.apk`

---

## Useful URLs

- **Capacitor Docs**: https://capacitorjs.com/docs/
- **Android Docs**: https://developer.android.com/docs/
- **React Router**: https://reactrouter.com/
- **Framer Motion**: https://www.framer.com/motion/

---

## Troubleshooting Quick Fixes

```bash
# Sync node modules
npm install

# Clear caches
rm -rf node_modules package-lock.json
npm install

# Rebuild Gradle
cd android-customer
./gradlew clean
./gradlew build

# Update Capacitor plugins
npx cap sync

# Check Android SDK
echo $ANDROID_SDK_ROOT   # Linux/Mac
echo %ANDROID_SDK_ROOT%  # Windows
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Could not find installation of TypeScript" | `npm install -D typescript` |
| Build fails on Android | `./gradlew clean && ./gradlew build` |
| APK won't install | Uninstall old version first, or use different device |
| Splash screen not showing | Check `capacitor.config.ts` settings |
| Wrong app showing | Make sure building with correct `npm run build:*` |
| Android SDK not found | Set `ANDROID_SDK_ROOT` environment variable |

---

**For detailed information, see:**
- `ANDROID_APK_BUILD_GUIDE.md` - Complete APK build guide
- `MOBILE_APP_SETUP_SUMMARY.md` - Setup summary and features
