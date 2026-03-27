// Biometric Authentication using WebAuthn API
const STORAGE_KEY = 'minitruck_biometric';
const CRED_KEY = 'minitruck_bio_cred';

// Check if device supports biometric/WebAuthn
export function isBiometricAvailable() {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

// Async check if platform authenticator (fingerprint/face) is actually available
export async function isBiometricReady() {
  try {
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

// Convert ArrayBuffer to base64url string
function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Convert base64url string to ArrayBuffer
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
  if (!isBiometricAvailable()) throw new Error('Biometric not supported');

  // 1. Get challenge from server
  const cRes = await fetch('/api/auth/biometric/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role })
  });
  const { challenge: serverChallenge } = await cRes.json();

  // 2. Trigger browser fingerprint creation
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: base64urlToBuffer(serverChallenge),
      rp: { name: 'MiniTruK', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: userId
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' }
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    }
  });

  if (!credential) throw new Error('Failed to create biometric credential');

  const credentialId = bufferToBase64url(credential.rawId);
  const attestationObject = bufferToBase64url(credential.response.attestationObject);
  const clientDataJSON = bufferToBase64url(credential.response.clientDataJSON);

  // 3. Register with backend
  const regRes = await fetch('/api/auth/biometric/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role, credentialId, attestationObject, clientDataJSON })
  });
  if (!regRes.ok) throw new Error('Failed to register biometric on server');

  // Store credential info locally for UI state
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, role, credentialId, enabledAt: Date.now() }));

  // Also store the login data as local backup
  const authData = localStorage.getItem('minitruck_auth');
  if (authData) {
    localStorage.setItem(CRED_KEY, authData);
  }

  return true;
}

// Authenticate using biometric — verifies fingerprint then returns login data from server
export async function authenticateWithBiometric() {
  const stored = hasBiometricCredential();
  if (!stored) throw new Error('No biometric credential found');

  // 1. Get challenge from server
  const cRes = await fetch('/api/auth/biometric/auth-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: stored.userId, role: stored.role })
  });
  if (!cRes.ok) throw new Error('Biometric login not available for this user');
  const { challenge: serverChallenge } = await cRes.json();

  // 2. Trigger fingerprint verification UI and capture assertion
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: base64urlToBuffer(serverChallenge),
      rpId: window.location.hostname,
      allowCredentials: [{
        id: base64urlToBuffer(stored.credentialId),
        type: 'public-key',
        transports: ['internal']
      }],
      userVerification: 'required',
      timeout: 60000
    }
  });

  if (!assertion) throw new Error('Biometric verification failed');

  // 3. Verify with backend to get a fresh token
  const authenticatorData = bufferToBase64url(assertion.response.authenticatorData);
  const clientDataJSON = bufferToBase64url(assertion.response.clientDataJSON);
  const signature = bufferToBase64url(assertion.response.signature);

  const res = await fetch('/api/auth/biometric/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: stored.userId,
      role: stored.role,
      credentialId: stored.credentialId,
      authenticatorData,
      clientDataJSON,
      signature
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}
