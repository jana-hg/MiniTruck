import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.minitruck.customer',
  appName: 'MiniTruck',
  webDir: 'dist-customer',
  server: {
    androidScheme: 'https',
    // For development: connect to local backend
    // Change to your actual backend server IP/URL
    url: 'http://localhost:5005',
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
