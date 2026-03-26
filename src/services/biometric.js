// Biometric Authentication using WebAuthn API
const STORAGE_KEY = 'minitruck_biometric';

// Check if device supports biometric/WebAuthn
export function isBiometricAvailable() {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

// Check if user has registered biometric on this device
export function hasBiometricCredential() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

// Save biometric credential info locally
function saveBiometricCredential(userId, role, credentialId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, role, credentialId, enabledAt: Date.now() }));
}

// Remove biometric credential
export function removeBiometricCredential() {
  localStorage.removeItem(STORAGE_KEY);
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
  if (!isBiometricAvailable()) throw new Error('Biometric not supported on this device');

  // Get registration challenge from server
  const res = await fetch('/api/auth/biometric/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role })
  });
  const challengeData = await res.json();
  if (!res.ok) throw new Error(challengeData.error || 'Failed to get challenge');

  // Create credential using device biometric
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: base64urlToBuffer(challengeData.challenge),
      rp: { name: 'MiniTruK', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: userId
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Use device biometric (not USB key)
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    }
  });

  const credentialId = bufferToBase64url(credential.rawId);

  // Send credential to server for storage
  const verifyRes = await fetch('/api/auth/biometric/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      role,
      credentialId,
      publicKey: bufferToBase64url(credential.response.getPublicKey?.() || new ArrayBuffer(0)),
      attestation: bufferToBase64url(credential.response.attestationObject)
    })
  });
  if (!verifyRes.ok) throw new Error('Failed to register biometric');

  // Save locally
  saveBiometricCredential(userId, role, credentialId);
  return true;
}

// Authenticate using biometric
export async function authenticateWithBiometric() {
  const stored = hasBiometricCredential();
  if (!stored) throw new Error('No biometric credential found');

  // Get auth challenge from server
  const res = await fetch('/api/auth/biometric/auth-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: stored.userId, role: stored.role })
  });
  const challengeData = await res.json();
  if (!res.ok) throw new Error(challengeData.error || 'Failed to get challenge');

  // Authenticate with device biometric
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: base64urlToBuffer(challengeData.challenge),
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

  // Verify with server
  const verifyRes = await fetch('/api/auth/biometric/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: stored.userId,
      role: stored.role,
      credentialId: bufferToBase64url(assertion.rawId),
      authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
      signature: bufferToBase64url(assertion.response.signature),
      clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON)
    })
  });
  const data = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(data.error || 'Biometric authentication failed');

  return data; // { token, user, role }
}
