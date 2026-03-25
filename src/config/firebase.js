import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDsreWhdkxzJ8TCsxxA8AFhMHo0VHXLY_k",
  authDomain: "login-731b8.firebaseapp.com",
  projectId: "login-731b8",
  storageBucket: "login-731b8.firebasestorage.app",
  messagingSenderId: "1079654007364",
  appId: "1:1079654007364:web:a6ca60f325177a206e3211",
  measurementId: "G-JFB2P5XGP4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, RecaptchaVerifier, signInWithPhoneNumber };
