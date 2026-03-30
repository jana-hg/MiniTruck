import { CapacitorConfig } from '@capacitor/cli';

// Determine if we are building for customer or driver
const isDriver = process.env.CAP_MODE === 'driver' || process.env.npm_lifecycle_event?.includes('driver');

const config: CapacitorConfig = {
  appId: isDriver ? 'com.minitruck.captain' : 'com.minitruck.customer',
  appName: isDriver ? 'MiniTruck Captain' : 'MiniTruck',
  webDir: isDriver ? 'dist-driver' : 'dist-customer',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    path: isDriver ? 'android-driver' : 'android-customer',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
  },
};

export default config;
