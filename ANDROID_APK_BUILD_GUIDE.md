# MiniTruck Android APK Build Guide

## ✅ What's Been Set Up

Two separate native Android applications have been configured:

### **MiniTruck** (Customer App)
- **Package ID**: `com.minitruck.customer`
- **Directory**: `android-customer/`
- **Build Output**: `android-customer/app/build/outputs/apk/release/app-release.apk`
- **Theme Color**: Blue (#3B82F6)
- **Splash Screen**: Shows MiniTruck logo with blue background

### **MiniTruck Captain** (Driver App)
- **Package ID**: `com.minitruck.captain`
- **Directory**: `android-driver/`
- **Build Output**: `android-driver/app/build/outputs/apk/release/app-release.apk`
- **Theme Color**: Green (#10B981)
- **Splash Screen**: Shows MiniTruck Captain logo with green background

### **Web Admin Portal** (remains unchanged)
- PortalSwitcher shows all 3 portals when accessed from web browser
- Admin portal only accessible on web, not in mobile apps

---

## 🔧 Prerequisites for Building APKs

Before building, you must have installed on your system:

1. **Android Studio** (Latest version)
   - Download from: https://developer.android.com/studio

2. **Android SDK** (API 22+)
   - Minimum SDK Version: 22
   - Target SDK Version: 34+
   - Install via Android Studio SDK Manager

3. **JDK 17**
   - Download from: https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html
   - OR install via Android Studio bundled JDK

4. **Gradle** (Installed automatically by Android Studio)

---

## 📱 How to Build APKs

### **Option A: Using Android Studio (Recommended)**

#### Build Customer APK:
1. Open Android Studio
2. Click `File` → `Open` → Select `android-customer/` folder
3. Wait for Gradle sync to complete
4. Click `Build` → `Generate Signed APK`
5. Follow the wizard:
   - Select `APK` (not Android App Bundle)
   - Create or select a keystore file for signing
   - Select `release` build variant
   - Click `Finish`
6. APK will be generated at: `android-customer/app/build/outputs/apk/release/app-release.apk`

#### Build Driver APK:
1. Click `File` → `Close Project`
2. Click `File` → `Open` → Select `android-driver/` folder
3. Repeat steps 3-6 above
4. APK will be generated at: `android-driver/app/build/outputs/apk/release/app-release.apk`

---

### **Option B: Using Gradle Command Line**

#### Build Customer APK:
```bash
cd android-customer
./gradlew assembleRelease
```
- APK location: `app/build/outputs/apk/release/app-release.apk`

#### Build Driver APK:
```bash
cd android-driver
./gradlew assembleRelease
```
- APK location: `app/build/outputs/apk/release/app-release.apk`

---

### **Option C: Using NPM Scripts**

If you have all prerequisites set up, you can use the npm scripts:

```bash
# Build and sync customer web assets with Android
npm run cap:build:customer

# Build and sync driver web assets with Android
npm run cap:build:driver
```

Then use Android Studio to generate signed APKs from `android-customer/` and `android-driver/`.

---

## 🚀 App Features

### Customer App (MiniTruck)
- **Splash Screen**: 2.5 seconds with blue theme
- **Direct Navigation**: Opens directly to Customer Login (no portal selector)
- **Features**:
  - Book rides
  - Track rides
  - View bookings
  - Wallet & payments
  - Profile management
  - Support chat

### Driver App (MiniTruck Captain)
- **Splash Screen**: 2.5 seconds with green theme
- **Direct Navigation**: Opens directly to Driver Login (no portal selector)
- **Features**:
  - Accept ride requests
  - View earnings
  - Manage profile
  - Fleet information (admin only in web)
  - Ride tracking

---

## 📂 Project Structure

```
minitruck-app/
├── src/
│   ├── context/
│   │   ├── PlatformContext.jsx      ← Platform detection (customer/driver/web)
│   │   └── ...
│   ├── components/
│   │   ├── SplashScreen.jsx         ← Animated splash screen
│   │   └── ...
│   └── pages/
│       ├── auth/
│       │   ├── PortalSwitcher.jsx   ← Redirects based on platform
│       │   └── LoginScreen.jsx
│       └── ...
├── .env                              ← Default (web)
├── .env.customer                    ← Customer platform env
├── .env.driver                      ← Driver platform env
├── capacitor.config.ts              ← Default config (customer)
├── capacitor.customer.config.ts     ← Customer app config
├── capacitor.driver.config.ts       ← Driver app config
├── android-customer/                ← Customer Android project
├── android-driver/                  ← Driver Android project
├── dist-customer/                   ← Built customer web app
├── dist-driver/                     ← Built driver web app
└── ...
```

---

## 🔄 Web Assets Sync

If you modify the React app and need to update the Android projects:

**For Customer APK:**
```bash
npm run build:customer     # Builds to dist-customer/
npm run cap:copy:customer  # Syncs to android-customer/
```

**For Driver APK:**
```bash
npm run build:driver       # Builds to dist-driver/
npm run cap:copy:driver    # Syncs to android-driver/
```

---

## 🎯 Platform Detection in Code

The app uses `VITE_APP_PLATFORM` environment variable to determine which version to build:

```javascript
import { usePlatform } from '../context/PlatformContext';

function MyComponent() {
  const { platform, isCustomer, isDriver, isWeb } = usePlatform();

  if (isCustomer) {
    // Show customer-specific UI
  } else if (isDriver) {
    // Show driver-specific UI
  } else {
    // Web version - show all options
  }
}
```

---

## 🎨 App Icons & Splash Screens

### Custom Logos
The truck logo SVGs are located in:
- `public/truck-light.svg` - Light mode icon
- `public/truck-dark.svg` - Dark mode icon

To customize:
1. Edit the SVG files in `public/`
2. The files are automatically used for app splash screens
3. For Android launcher icons, update:
   - `android-customer/app/src/main/res/mipmap-*/ic_launcher.png`
   - `android-driver/app/src/main/res/mipmap-*/ic_launcher.png`

---

## 🔑 Signing the APK

For release builds, you need to sign the APK with a keystore file:

1. **Generate a keystore** (one-time):
   ```bash
   keytool -genkey -v -keystore my-minitruck-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
   ```

2. **Sign APK using jarsigner**:
   ```bash
   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-minitruck-key.keystore app-release-unsigned.apk my-key-alias
   ```

3. **Or use Android Studio's built-in signing** (recommended)

---

## 📤 Distribution

Once APKs are built, you can:
- **Google Play Store**: Upload signed APKs to Google Play Console
- **Direct Download**: Host on your website for users to download
- **Internal Testing**: Share APK files directly with testers

### APK Files to Share:
- **Customer**: `android-customer/app/build/outputs/apk/release/app-release.apk`
- **Driver**: `android-driver/app/build/outputs/apk/release/app-release.apk`

---

## 🐛 Troubleshooting

### Build Fails - "ANDROID_SDK_ROOT not set"
Set the Android SDK path:
```bash
export ANDROID_SDK_ROOT=<path-to-android-sdk>
# On Windows: set ANDROID_SDK_ROOT=C:\Users\YourName\AppData\Local\Android\sdk
```

### Gradle Sync Issues
1. Open Android Studio
2. Click `File` → `Sync Now`
3. Or delete `.gradle` folder and retry

### APK Won't Install
- Ensure you're installing on Android API 22+
- Check that you're not trying to install two apps with the same package ID
- Uninstall old version first before installing new APK

---

## ✨ Next Steps

1. **Install Prerequisites**:
   - Android Studio
   - Android SDK (API 22+)
   - JDK 17

2. **Build APKs**:
   - Follow Option A, B, or C above

3. **Test on Device**:
   - Connect Android device via USB
   - Install APK using: `adb install <path-to-apk>`
   - Or drag APK into Android Emulator

4. **Deploy to Play Store**:
   - Create Google Play Developer Account
   - Upload APKs to Google Play Console
   - Configure store listing and release

---

## 📞 Support

For issues with Capacitor: https://capacitorjs.com/docs/
For Android build issues: https://developer.android.com/docs

---

**Version**: 1.0
**Last Updated**: March 27, 2026
**Status**: Ready for APK Generation
