import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.minitruck.customer',
  appName: 'MiniTruck',
  webDir: 'dist-customer',
  server: {
    androidScheme: 'https',
    // Using Smart Wrapper approach instead of direct redirect.
    // url: 'https://minitruck-app.vercel.app',
    cleartext: true,
  },
  android: {
    path: 'android-customer',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#3B82F6',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
  },
};

export default config;
