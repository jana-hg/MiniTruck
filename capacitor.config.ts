import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.minitruck.captain',
  appName: 'MiniTruck Captain',
  webDir: 'dist-driver',
  server: {
    androidScheme: 'https',
    // For development: connect to local backend
    // Change to your actual backend server IP/URL
    url: 'http://localhost:5005',
    cleartext: true,
  },
  android: {
    path: 'android-driver',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#10B981',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
  },
};

export default config;
