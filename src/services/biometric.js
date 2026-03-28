// Biometric Authentication supporting both Native (Capacitor) and Web (WebAuthn)
import { Capacitor } from '@capacitor/core';

// Lazy load BiometricAuth only on native platforms to avoid build errors on web
let BiometricAuthPlugin = null;
async function getBiometricAuth() {
  if (!BiometricAuthPlugin) {
    if (Capacitor.isNativePlatform()) {
      const mod = await import('@aparajita/capacitor-biometric-auth');
      BiometricAuthPlugin = mod.BiometricAuth;
    }
  }
  return BiometricAuthPlugin;
}

const STORAGE_KEY = 'minitruck_biometric';
const CRED_KEY = 'minitruck_bio_cred';

// Check if device supports biometric/WebAuthn
export function isBiometricAvailable() {
  if (Capacitor.isNativePlatform()) return true;
  return !!(window.PublicKeyCredential && navigator.credentials);
}

// Async check if platform authenticator (fingerprint/face) is actually available
export async function isBiometricReady() {
  try {
    if (Capacitor.isNativePlatform()) {
      const bio = await getBiometricAuth();
      if (!bio) return false;
      const result = await bio.checkBiometry();
      return result.isAvailable;
    }

    if (!isBiometricAvailable()) return false;
    if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch { return false; }
}

// Check if user has registered biometric on this device
export function hasBiometricCredential() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

// Remove biometric credential
export function removeBiometricCredential() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CRED_KEY);
}

// Helper: Convert ArrayBuffer to base64url string
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper: Convert base64url string to ArrayBuffer
function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

// Register biometric credential after first login
export async function registerBiometric(userId, role) {
  if (Capacitor.isNativePlatform()) {
    try {
      const bio = await getBiometricAuth();
      if (!bio) return false;

      // Check if biometry is available on device
      const check = await bio.checkBiometry();
      if (!check.isAvailable) {
        console.warn('Biometric not available on this device');
        return false;
      }

      // Authenticate to register fingerprint
      await bio.authenticate({
        reason: 'Register Fingerprint for MiniTruck',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        androidTitle: 'MiniTruck Fingerprint',
        androidSubtitle: 'Verify your identity to enable fingerprint login',
      });

      // Store credential locally
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, role, isNative: true, enabledAt: Date.now() }));
      return true;
    } catch (e) {
      console.error('Biometric registration failed:', e);
      return false;
    }
  }

  if (!isBiometricAvailable()) throw new Error('Biometric not supported');

  // WebAuthn Registration Flow (for web browser)
  const cRes = await fetch('/api/auth/biometric/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role })
  });
  const { challenge: serverChallenge } = await cRes.json();

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: base64urlToBuffer(serverChallenge),
      rp: { name: 'MiniTruck', id: window.location.hostname },
      user: { id: new TextEncoder().encode(userId), name: userId, displayName: userId },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
      attestation: 'none'
    }
  });

  if (!credential) throw new Error('Failed to create biometric credential');

  const credentialId = bufferToBase64url(credential.rawId);
  const attestationObject = bufferToBase64url(credential.response.attestationObject);
  const clientDataJSON = bufferToBase64url(credential.response.clientDataJSON);

  const regRes = await fetch('/api/auth/biometric/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role, credentialId, attestationObject, clientDataJSON })
  });
  if (!regRes.ok) throw new Error('Failed to register on server');

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, role, credentialId, enabledAt: Date.now() }));
  return true;
}

// Authenticate using biometric
export async function authenticateWithBiometric() {
  const stored = hasBiometricCredential();
  if (!stored) throw new Error('No biometric credential found');

  if (Capacitor.isNativePlatform() || stored.isNative) {
    // Native Biometric Auth
    const bio = await getBiometricAuth();
    if (!bio) throw new Error('Biometric not available on this device');

    // Verify biometry is still available
    const check = await bio.checkBiometry();
    if (!check.isAvailable) throw new Error('Biometric hardware not available');

    await bio.authenticate({
      reason: 'Login to MiniTruck',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      androidTitle: 'MiniTruck Login',
      androidSubtitle: 'Use your fingerprint to login',
    });

    // After successful native auth, return stored auth data
    const authDataStr = localStorage.getItem('minitruck_auth');
    if (authDataStr) {
      return JSON.parse(authDataStr);
    }
    throw new Error('Please login with password once to refresh session');
  }

  // WebAuthn Auth Flow (for web browser)
  const cRes = await fetch('/api/auth/biometric/auth-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: stored.userId, role: stored.role })
  });
  if (!cRes.ok) throw new Error('Biometric login not available');
  const { challenge: serverChallenge } = await cRes.json();

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: base64urlToBuffer(serverChallenge),
      rpId: window.location.hostname,
      allowCredentials: [{ id: base64urlToBuffer(stored.credentialId), type: 'public-key', transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000
    }
  });

  if (!assertion) throw new Error('Biometric verification failed');

  const res = await fetch('/api/auth/biometric/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: stored.userId,
      role: stored.role,
      credentialId: stored.credentialId,
      authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
      clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
      signature: bufferToBase64url(assertion.response.signature)
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}
