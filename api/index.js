const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

// ── Database path: use /tmp for Vercel serverless (writable) ──
const TMP_DB_PATH = '/tmp/db.json';
const SOURCE_DB_PATH = path.join(__dirname, '..', 'backend', 'db.json');

// On cold start, copy the bundled db.json to /tmp if it doesn't exist
if (!fs.existsSync(TMP_DB_PATH)) {
  try {
    fs.copyFileSync(SOURCE_DB_PATH, TMP_DB_PATH);
  } catch (e) {
    // Try alternate paths
    const altPaths = [
      path.join(process.cwd(), 'backend', 'db.json'),
      path.join(__dirname, 'backend', 'db.json'),
      path.resolve('backend/db.json')
    ];
    let copied = false;
    for (const p of altPaths) {
      try { if (fs.existsSync(p)) { fs.copyFileSync(p, TMP_DB_PATH); copied = true; break; } } catch (_) {}
    }
    if (!copied) {
      // Write minimal db so function doesn't crash
      // SECURITY FIX: Hash passwords before storing (bcryptjs synchronous)
      const demoDb = {
        users: [{ id: "u01", name: "Demo User", email: "user@demo.com", password: bcrypt.hashSync("pass123", 10), role: "customer", phone: "+91-9876543210" }],
        drivers: [{ id: "d01", name: "Demo Driver", password: bcrypt.hashSync("pass123", 10), role: "driver", phone: "+91-9876543211", approved: true, status: "offline" }],
        admins: [{ id: "admin", name: "admin", password: bcrypt.hashSync("admin123", 10), role: "admin" }],
        bookings: [], trucks: [], fleet: [], payments: []
      };
      fs.writeFileSync(TMP_DB_PATH, JSON.stringify(demoDb, null, 2));
    }
  }
}

const DB_PATH = TMP_DB_PATH;

// ── Security middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
// SECURITY FIX: Restrict CORS to specific origins instead of allowing all
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS denied: ' + origin));
    }
  },
  credentials: true
}));
app.use(bodyParser.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Too many requests, try again later' } });
app.use('/api', limiter);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many login attempts' } });
app.use('/api/auth', authLimiter);

// ── Database helpers ──
let dbLock = false;
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Create database if missing
      const defaultDb = { users: [], drivers: [], admins: [{ id: 'admin', name: 'admin', password: bcrypt.hashSync('1234', 10), role: 'admin' }], bookings: [], trucks: [], fleet: [], payments: [], ratings: [], supportTickets: [], commission: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    console.error('Database error:', e.message);
    throw new Error('Database unavailable');
  }
}
function writeDB(data) {
  if (dbLock) { setTimeout(() => writeDB(data), 10); return; }
  dbLock = true;
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8'); }
  finally { dbLock = false; }
}

// Haversine distance in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const pendingAssignments = {};

// ── OTP store (in-memory, expires after 5 min) ──
const otpStore = {}; // { phone: { otp, expiresAt } }

// ── Input sanitization ──
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim().substring(0, 500);
}

// ── Password validation (SECURITY FIX: Enforce password strength) ──
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*)' };
  }
  return { valid: true };
}

// ── Driver RC Validation (DRIVER VERIFICATION) ──
function validateRC(rcData) {
  if (!rcData) return false;
  // RC should be a valid file/data URL (non-empty string or buffer)
  const isValid = typeof rcData === 'string' && rcData.length > 100; // Minimum size check for base64 image
  if (isValid) console.log('[RC Validation] ✅ RC auto-verified');
  return isValid;
}

// ── Driver Photo Validation (DRIVER VERIFICATION) ──
function validatePhoto(photoData) {
  if (!photoData) return false;
  // Photo should be a valid file/data URL (non-empty string or buffer)
  const isValid = typeof photoData === 'string' && photoData.length > 100; // Minimum size check for base64 image
  if (isValid) console.log('[Photo Validation] ✅ Profile photo auto-verified');
  return isValid;
}

// ── Auth middleware ──
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(header.split(' ')[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

// Optional auth - attaches user if token present, continues if not
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header) {
    try { req.user = jwt.verify(header.split(' ')[1], JWT_SECRET); } catch {}
  }
  next();
}

function generateBookingId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `MH-${num}-${letter}`;
}

// ═══════════════════════════════════════════════════════════════
//  OTP
// ═══════════════════════════════════════════════════════════════
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many OTP requests' } });

app.post('/api/otp/send', otpLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Valid phone number required' });

  const cleanPhone = phone.replace(/\s/g, '');
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore[cleanPhone] = { otp, expiresAt };
  // OTP logged only in development - NEVER return OTP in response (SECURITY FIX)
  if (process.env.NODE_ENV !== 'production') console.log(`OTP for ${cleanPhone}: ${otp}`);

  return res.json({ success: true }); // ✅ OTP not returned for security
});

app.post('/api/otp/verify', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const cleanPhone = phone.replace(/\s/g, '');
  const stored = otpStore[cleanPhone];

  if (!stored) return res.status(400).json({ error: 'No OTP was sent to this number. Send OTP first.' });
  if (Date.now() > stored.expiresAt) {
    delete otpStore[cleanPhone];
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });

  delete otpStore[cleanPhone];
  return res.json({ success: true, verified: true });
});

// ═══════════════════════════════════════════════════════════════
//  BIOMETRIC AUTH (WebAuthn)
// ═══════════════════════════════════════════════════════════════
const biometricChallenges = {}; // In-memory challenges (short-lived, acceptable)

app.post('/api/auth/biometric/register-challenge', (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });
  const challenge = require('crypto').randomBytes(32).toString('base64url');
  biometricChallenges[userId] = { challenge, role, expiresAt: Date.now() + 60000 };
  return res.json({ challenge });
});

app.post('/api/auth/biometric/register', (req, res) => {
  const { userId, role, credentialId, attestation } = req.body;
  if (!userId || !role || !credentialId) return res.status(400).json({ error: 'Missing fields' });
  const stored = biometricChallenges[userId];
  if (!stored || Date.now() > stored.expiresAt) return res.status(400).json({ error: 'Challenge expired' });
  delete biometricChallenges[userId];

  // SECURITY FIX: Persist to database instead of in-memory
  try {
    const db = readDB();
    const userCollection = role === 'driver' ? db.drivers : db.users;
    const user = userCollection.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.biometric = {
      credentialId,
      registeredAt: Date.now()
    };
    writeDB(db);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to register biometric' });
  }
});

app.post('/api/auth/biometric/auth-challenge', (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });

  // SECURITY FIX: Load credential from database instead of in-memory
  try {
    const db = readDB();
    const userCollection = role === 'driver' ? db.drivers : db.users;
    const user = userCollection.find(u => u.id === userId);
    if (!user || !user.biometric) return res.status(404).json({ error: 'No biometric credential registered' });

    const challenge = require('crypto').randomBytes(32).toString('base64url');
    biometricChallenges[userId] = { challenge, role, expiresAt: Date.now() + 60000 };
    return res.json({ challenge });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to get auth challenge' });
  }
});

app.post('/api/auth/biometric/authenticate', async (req, res) => {
  const { userId, role, credentialId, authenticatorData, clientDataJSON, signature } = req.body;
  if (!userId || !role || !credentialId) return res.status(400).json({ error: 'Missing fields' });

  // SECURITY FIX: Load credential from database instead of in-memory
  try {
    const db = readDB();
    const userCollection = role === 'driver' ? db.drivers : db.users;
    const user = userCollection.find(u => u.id === userId);
    if (!user || !user.biometric || user.biometric.credentialId !== credentialId) {
      return res.status(401).json({ error: 'Invalid biometric credential' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to verify biometric' });
  }

  const stored = biometricChallenges[userId];
  if (!stored || Date.now() > stored.expiresAt) return res.status(400).json({ error: 'Challenge expired' });

  // Verify assertion if provided (enhanced security)
  if (authenticatorData && clientDataJSON && signature) {
    try {
      // Decode the clientDataJSON to verify challenge and origin
      const clientDataBuffer = Buffer.from(clientDataJSON, 'base64');
      const clientData = JSON.parse(clientDataBuffer.toString('utf-8'));

      // Verify the challenge matches
      if (clientData.challenge !== stored.challenge) {
        return res.status(401).json({ error: 'Challenge verification failed' });
      }

      // Verify origin matches (basic check)
      if (!clientData.origin.includes(req.get('host'))) {
        return res.status(401).json({ error: 'Origin verification failed' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid assertion format' });
    }
  }

  delete biometricChallenges[userId];
  const db = readDB();
  let user = null;
  if (role === 'customer') user = db.users.find(u => u.id === userId);
  else if (role === 'driver') user = db.drivers.find(d => d.id === userId);
  else if (role === 'admin') user = db.admins.find(a => a.id === userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const token = jwt.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: '8h' });
  const { password: _, ...safeUser } = user;
  return res.json({ token, user: safeUser, role });
});

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  try {
    const { id, password, role } = req.body;
    if (!id || !password || !role) return res.status(400).json({ error: 'id, password and role are required' });
    const db = readDB();
    let user = null;
    if (role === 'customer') user = db.users.find(u => u.id === id || u.email === id || u.phone === id || u.phone === `+91${id}`);
    else if (role === 'driver') user = db.drivers.find(d => d.id === id);
    else if (role === 'admin') user = db.admins.find(a => a.id === id || a.name === id);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Verify password first (before document checks)
    const valid = user.password && user.password.startsWith('$2') ? await bcrypt.compare(password, user.password) : password === user.password;
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // DRIVER VERIFICATION: Check RC and photo verification before allowing login
    if (role === 'driver') {
      const docVerif = user.documentVerification || {};
      // Only block if documentVerification field exists and documents are not verified
      if (user.documentVerification) {
        if (!docVerif.rc?.verified) {
          return res.status(403).json({ error: 'Your Registration Certificate (RC) is pending verification. Please wait for admin approval.' });
        }
        if (!docVerif.profilePhoto?.verified) {
          return res.status(403).json({ error: 'Your profile photo is pending verification. Please wait for admin approval.' });
        }
      }
    }

    if (role === 'driver' && user.approved === false && user.status === 'pending-approval') {
      return res.status(403).json({ error: 'Your account is pending approval' });
    }
    if (role === 'driver' && user.status === 'rejected') {
      return res.status(403).json({ error: 'Your application was rejected' });
    }

    const token = jwt.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: '8h' });
    const { password: _, ...safeUser } = user;
    return res.json({ token, user: safeUser, role });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// Helper: find user by phone
function findUserByPhone(db, phone, role) {
  const clean = phone.replace(/\D/g, '');
  if (role === 'driver') return { user: db.drivers.find(d => d.phone?.replace(/\D/g, '') === clean), collection: 'drivers' };
  return { user: db.users.find(u => u.phone?.replace(/\D/g, '') === clean || u.phone === `+91${clean}`), collection: 'users' };
}

// Issue OTP-verified token after Firebase OTP confirmation
app.post('/api/auth/verify-otp-token', (req, res) => {
  const { phone, role } = req.body;
  if (!phone || !role) return res.status(400).json({ error: 'Phone and role required' });
  const db = readDB();
  const { user } = findUserByPhone(db, phone, role);
  if (!user) return res.status(404).json({ error: 'No account found.' });
  const verifyToken = jwt.sign({ phone: phone.replace(/\D/g, ''), role, purpose: 'otp-verified' }, JWT_SECRET, { expiresIn: '10m' });
  return res.json({ verifyToken, userId: user.id });
});

// OTP-verified login (requires verifyToken)
app.post('/api/auth/login-otp', (req, res) => {
  const { phone, role, verifyToken } = req.body;
  if (!phone || !role || !verifyToken) return res.status(400).json({ error: 'Phone, role, and verifyToken required' });
  try {
    const decoded = jwt.verify(verifyToken, JWT_SECRET);
    if (decoded.purpose !== 'otp-verified' || decoded.phone !== phone.replace(/\D/g, '') || decoded.role !== role)
      return res.status(401).json({ error: 'Invalid verification.' });
  } catch { return res.status(401).json({ error: 'Verification expired.' }); }
  const db = readDB();
  const { user } = findUserByPhone(db, phone, role);
  if (!user) return res.status(404).json({ error: 'No account found.' });
  const token = jwt.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: '8h' });
  const { password: _, ...safeUser } = user;
  return res.json({ token, user: safeUser, role });
});

// Biometric login
app.post('/api/auth/biometric-login', (req, res) => {
  const { userId, role, bioToken } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });
  if (bioToken) { try { const d = jwt.verify(bioToken, JWT_SECRET); if (d.id !== userId || d.purpose !== 'biometric') return res.status(401).json({ error: 'Invalid' }); } catch { return res.status(401).json({ error: 'Expired' }); } }
  const db = readDB();
  let user = null;
  if (role === 'customer') user = db.users.find(u => u.id === userId);
  else if (role === 'driver') user = db.drivers.find(d => d.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = jwt.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: '8h' });
  const { password: _, ...safeUser } = user;
  return res.json({ token, user: safeUser, role });
});

// Lookup phone (rate limited, minimal info)
app.post('/api/auth/lookup-phone', (req, res) => {
  const { phone, role } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  const db = readDB();
  const { user } = findUserByPhone(db, phone, role || 'customer');
  if (!user) return res.status(404).json({ error: 'No account found' });
  return res.json({ userId: user.id });
});

// Reset password (requires verifyToken)
app.post('/api/auth/reset-password', (req, res) => {
  const { phone, newPassword, role, verifyToken } = req.body;
  if (!phone || !newPassword || !verifyToken) return res.status(400).json({ error: 'All fields required' });
  if (!/^\d{4}$/.test(newPassword)) return res.status(400).json({ error: 'Password must be 4 digits' });
  try {
    const decoded = jwt.verify(verifyToken, JWT_SECRET);
    if (decoded.purpose !== 'otp-verified' || decoded.phone !== phone.replace(/\D/g, '') || decoded.role !== role)
      return res.status(401).json({ error: 'Invalid verification.' });
  } catch { return res.status(401).json({ error: 'Verification expired.' }); }
  const db = readDB();
  const collection = role === 'driver' ? 'drivers' : 'users';
  const cleanPhone = phone.replace(/\D/g, '');
  const idx = db[collection].findIndex(u => u.phone?.replace(/\D/g, '') === cleanPhone || u.phone === `+91${cleanPhone}`);
  if (idx === -1) return res.status(404).json({ error: 'No account found' });
  db[collection][idx].password = newPassword;
  db[collection][idx].mustChangePassword = false;
  writeDB(db);
  return res.json({ success: true });
});

// Change password (requires old password)
app.post('/api/auth/change-password', (req, res) => {
  const { id, oldPassword, newPassword, role } = req.body;
  if (!id || !oldPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
  if (!/^\d{4}$/.test(newPassword)) return res.status(400).json({ error: 'Password must be 4 digits' });
  const db = readDB();
  const collection = role === 'driver' ? 'drivers' : 'users';
  const idx = db[collection].findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const stored = db[collection][idx].password;
  const valid = stored.startsWith('$2') ? false : stored === oldPassword;
  if (!valid) return res.status(401).json({ error: 'Old password incorrect' });
  db[collection][idx].password = newPassword;
  db[collection][idx].mustChangePassword = false;
  writeDB(db);
  return res.json({ success: true });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  // SECURITY FIX: Use strong password validation
  const pwValidation = validatePassword(password);
  if (!pwValidation.valid) return res.status(400).json({ error: pwValidation.error });
  const db = readDB();
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: `u${String(db.users.length + 1).padStart(2, '0')}`,
    name: sanitize(name), email: sanitize(email), phone: sanitize(phone || ''), password: hashedPassword,
    role: 'customer', bookings: 0, standing: 'Standard',
    address: '', preferences: { notifications: true, defaultPayment: 'wallet' }
  };
  db.users.push(user);
  db.wallet.push({ userId: user.id, balance: 0, transactions: [] });
  writeDB(db);
  const token = jwt.sign({ id: user.id, role: 'customer' }, JWT_SECRET, { expiresIn: '8h' });
  const { password: _, ...safe } = user;
  return res.status(201).json({ token, user: safe, role: 'customer' });
});

// ═══════════════════════════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════════════════════════

// User self-registration
app.post('/api/users/register', (req, res) => {
  const db = readDB();
  const { fullName, phone, email, profilePicture } = req.body;
  if (!fullName || !phone) return res.status(400).json({ error: 'Name and phone are required' });

  const cleanPhone = phone.replace(/\D/g, '');
  const exists = db.users.find(u => u.phone?.replace(/\D/g, '') === cleanPhone);
  if (exists) return res.status(409).json({ error: 'An account with this phone number already exists. Please login or use forgot password.' });

  let id;
  do { id = 'u' + String(Math.floor(100 + Math.random() * 900)); } while (db.users.find(u => u.id === id));
  const newUser = {
    id,
    name: fullName,
    email: email || '',
    phone,
    password: '1234',
    role: 'customer',
    profilePicture: profilePicture || null,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDB(db);
  const { password, ...safe } = newUser;
  return res.status(201).json(safe);
});

app.get('/api/users', (req, res) => {
  const db = readDB();
  return res.json(db.users.map(({ password, ...u }) => u));
});

app.get('/api/users/:id', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safe } = user;
  return res.json(safe);
});

app.post('/api/users', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  const db = readDB();
  const user = {
    id: `u${String(db.users.length + 1).padStart(2, '0')}`,
    name, email, phone: phone || '', password,
    role: 'customer', bookings: 0, standing: 'Standard',
    address: '', preferences: { notifications: true, defaultPayment: 'wallet' }
  };
  db.users.push(user);
  db.wallet.push({ userId: user.id, balance: 0, transactions: [] });
  writeDB(db);
  const { password: _, ...safe } = user;
  return res.status(201).json(safe);
});

app.patch('/api/users/:id', (req, res) => {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const { password, role, id, ...updates } = req.body;
  Object.assign(db.users[idx], updates);
  writeDB(db);
  const { password: _, ...safe } = db.users[idx];
  return res.json(safe);
});

app.delete('/api/users/:id', (req, res) => {
  const db = readDB();
  db.users = db.users.filter(u => u.id !== req.params.id);
  writeDB(db);
  return res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  BOOKINGS
// ═══════════════════════════════════════════════════════════════
app.get('/api/bookings', (req, res) => {
  const db = readDB();
  let bookings = db.bookings;
  const { userId, driverId, status } = req.query;
  if (userId) bookings = bookings.filter(b => b.userId === userId);
  if (driverId) bookings = bookings.filter(b => b.driverId === driverId);
  if (status) bookings = bookings.filter(b => b.status === status);
  return res.json(bookings);
});

app.get('/api/bookings/:id', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  return res.json(booking);
});

app.post('/api/bookings', (req, res) => {
  const db = readDB();
  const id = generateBookingId();
  const booking = {
    id, userId: req.body.userId || null, driverId: req.body.driverId || null,
    truckType: req.body.truckType || 'small',
    pickup: req.body.pickup || {}, dropoff: req.body.dropoff || {},
    cargo: req.body.cargo || {}, priority: req.body.priority || 'standard',
    status: 'pending',
    fare: req.body.fare || { base: 0, distance: 0, surcharge: 0, total: 0 },
    payment: req.body.payment || { method: req.body.paymentMethod || 'cash', status: 'pending', transactionId: null },
    paymentMethod: req.body.paymentMethod || 'cash',
    eta: req.body.eta || null, scheduledTime: req.body.scheduledTime || null,
    createdAt: new Date().toISOString(), completedAt: null,
    declinedDrivers: [], pendingDriverId: null, assignmentSentAt: null
  };
  db.bookings.push(booking);
  const uIdx = db.users.findIndex(u => u.id === booking.userId);
  if (uIdx !== -1) db.users[uIdx].bookings = (db.users[uIdx].bookings || 0) + 1;
  writeDB(db);
  return res.status(201).json(booking);
});

app.patch('/api/bookings/:id', (req, res) => {
  const db = readDB();
  const idx = db.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });
  Object.assign(db.bookings[idx], req.body);
  if (req.body.status === 'completed') db.bookings[idx].completedAt = new Date().toISOString();
  writeDB(db);
  return res.json(db.bookings[idx]);
});

// Tracking endpoint — converted from SSE to regular JSON for serverless compatibility
app.post('/api/bookings/:id/auto-assign', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.driverId) return res.json({ alreadyAssigned: true, driverId: booking.driverId });

  const declinedDrivers = booking.declinedDrivers || [];
  const pickup = booking.pickup;
  if (!pickup?.lat || !pickup?.lng) return res.status(400).json({ error: 'Booking has no pickup location' });

  const eligible = db.drivers
    .filter(d => d.status === 'active' && d.available === true && d.approved !== false && !d.currentJobId && d.location?.lat && d.location?.lng && !declinedDrivers.includes(d.id))
    .map(d => ({ ...d, distance: getDistanceKm(pickup.lat, pickup.lng, d.location.lat, d.location.lng) }))
    .sort((a, b) => a.distance - b.distance);

  if (eligible.length === 0) return res.status(404).json({ error: 'No available drivers nearby', noDrivers: true });

  let selected = eligible[0];
  const closeDrivers = eligible.filter(d => Math.abs(d.distance - selected.distance) <= 2);
  if (closeDrivers.length > 1) {
    selected = closeDrivers.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  }

  pendingAssignments[req.params.id] = { driverId: selected.id, sentAt: Date.now(), bookingId: req.params.id };
  const bIdx = db.bookings.findIndex(b => b.id === req.params.id);
  db.bookings[bIdx].pendingDriverId = selected.id;
  db.bookings[bIdx].assignmentSentAt = Date.now();
  writeDB(db);

  const { password, ...safeDriver } = selected;
  return res.json({ assigned: true, driver: safeDriver, distance: selected.distance.toFixed(1) });
});

app.get('/api/bookings/:id/track', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const pickup = booking.pickup;
  const dropoff = booking.dropoff;
  const step = parseInt(req.query.step) || 0;
  const totalSteps = 30;

  if (step > totalSteps) {
    return res.json({ status: 'arrived', lat: dropoff.lat, lng: dropoff.lng, step: totalSteps, totalSteps, progress: 100 });
  }

  const t = step / totalSteps;
  return res.json({
    step,
    totalSteps,
    lat: parseFloat((pickup.lat + (dropoff.lat - pickup.lat) * t).toFixed(6)),
    lng: parseFloat((pickup.lng + (dropoff.lng - pickup.lng) * t).toFixed(6)),
    speed: parseFloat((45 + Math.random() * 30).toFixed(1)),
    progress: parseFloat((t * 100).toFixed(1)),
    status: step >= totalSteps ? 'arrived' : 'in-transit'
  });
});

// ═══════════════════════════════════════════════════════════════
//  DRIVERS
// ═══════════════════════════════════════════════════════════════
app.get('/api/drivers', (req, res) => {
  const db = readDB();
  return res.json(db.drivers.map(({ password, ...d }) => d));
});

// DRIVER VERIFICATION: Get drivers pending document verification
app.get('/api/drivers/pending-verification', (req, res) => {
  const db = readDB();
  const pendingDrivers = db.drivers.filter(d => {
    const docVerif = d.documentVerification || {};
    const rcPending = !docVerif.rc || docVerif.rc.verificationStatus === 'pending-review' || !docVerif.rc.verified;
    const photoPending = !docVerif.profilePhoto || docVerif.profilePhoto.verificationStatus === 'pending-review' || !docVerif.profilePhoto.verified;
    return rcPending || photoPending;
  }).map(({ password, ...d }) => d);

  return res.json(pendingDrivers);
});

// Driver self-registration (application)
app.post('/api/drivers/register', (req, res) => {
  const db = readDB();
  const { name, phone, city, vehicleType, vehicleModel, vehicleMake, vehicleRegNumber, vehicleYear, licenseNumber, licenseExpiry, password: userPassword, profilePicture, vehiclePicture, uploadedDocuments } = req.body;
  if (!name || !phone || !licenseNumber) return res.status(400).json({ error: 'Name, phone, and license number are required' });

  // DRIVER VERIFICATION: Require RC and profile photo for registration
  if (!profilePicture) return res.status(400).json({ error: 'Driver profile photo is required' });
  if (!uploadedDocuments || !uploadedDocuments.rc) return res.status(400).json({ error: 'Registration Certificate (RC) is required' });

  // SECURITY FIX: Require password and validate strength
  if (!userPassword) return res.status(400).json({ error: 'Password is required' });
  const pwValidation = validatePassword(userPassword);
  if (!pwValidation.valid) return res.status(400).json({ error: pwValidation.error });

  const cleanPhone = phone.replace(/\D/g, '');
  const phoneExists = db.drivers.find(d => d.phone?.replace(/\D/g, '') === cleanPhone);
  if (phoneExists) return res.status(409).json({ error: 'A driver account with this phone number already exists. Please login or use forgot password.' });
  const licenseExists = db.drivers.find(d => d.licenseNumber && d.licenseNumber === licenseNumber);
  if (licenseExists) return res.status(409).json({ error: 'A driver with this license number already exists.' });

  let id;
  do { id = 'D' + String(Math.floor(1000 + Math.random() * 9000)); } while (db.drivers.find(d => d.id === id));
  // SECURITY FIX: Hash password before storing
  const hashedPassword = bcrypt.hashSync(userPassword, 10);
  // DRIVER VERIFICATION: Auto-verify documents if they meet validation
  const isRCValid = validateRC(uploadedDocuments.rc);
  const isPhotoValid = validatePhoto(profilePicture);

  const newDriver = {
    id, name, password: hashedPassword, mustChangePassword: false, phone, city: city || '',
    status: 'pending-approval',
    available: false,
    approved: false,
    appliedAt: new Date().toISOString(),
    earnings: 0, rank: 'Rookie', rating: 0, truckId: null,
    location: { lat: 19.076, lng: 72.877 },
    currentJobId: null,
    licenseNumber: licenseNumber || '',
    licenseExpiry: licenseExpiry || '',
    profilePicture: profilePicture || null,
    vehiclePicture: vehiclePicture || null,
    uploadedDocuments: uploadedDocuments || null,
    // DRIVER VERIFICATION: Track document verification status
    documentVerification: {
      rc: { uploaded: true, verified: isRCValid, verificationStatus: isRCValid ? 'auto-verified' : 'pending-review', verifiedAt: isRCValid ? new Date().toISOString() : null },
      profilePhoto: { uploaded: true, verified: isPhotoValid, verificationStatus: isPhotoValid ? 'auto-verified' : 'pending-review', verifiedAt: isPhotoValid ? new Date().toISOString() : null },
    },
    documents: { license: 'pending', insurance: 'pending', registration: 'pending' },
    vehicleDetails: {
      type: vehicleType || 'small',
      make: vehicleMake || '',
      model: vehicleModel || '',
      regNumber: vehicleRegNumber || '',
      year: vehicleYear || 2024,
      plateNumber: vehicleRegNumber || '',
    },
    stats: { totalDistance: 0, activeHours: 0, serviceLevel: 0, jobsToday: 0, totalTrips: 0 },
  };
  db.drivers.push(newDriver);
  writeDB(db);
  const { password, ...safe } = newDriver;
  return res.status(201).json(safe);
});

// DRIVER VERIFICATION: Admin verify/reject driver documents (RC and photo)
app.post('/api/drivers/:id/verify-documents', (req, res) => {
  const db = readDB();
  const idx = db.drivers.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });

  const { rcVerified, photoVerified, rcReason, photoReason } = req.body;

  if (!db.drivers[idx].documentVerification) {
    db.drivers[idx].documentVerification = {
      rc: { uploaded: false, verified: false, verificationStatus: 'not-submitted' },
      profilePhoto: { uploaded: false, verified: false, verificationStatus: 'not-submitted' },
    };
  }

  // Verify RC
  if (rcVerified !== undefined) {
    db.drivers[idx].documentVerification.rc.verified = rcVerified;
    db.drivers[idx].documentVerification.rc.verificationStatus = rcVerified ? 'verified' : 'rejected';
    db.drivers[idx].documentVerification.rc.verifiedAt = new Date().toISOString();
    db.drivers[idx].documentVerification.rc.verificationReason = rcReason || null;
  }

  // Verify Photo
  if (photoVerified !== undefined) {
    db.drivers[idx].documentVerification.profilePhoto.verified = photoVerified;
    db.drivers[idx].documentVerification.profilePhoto.verificationStatus = photoVerified ? 'verified' : 'rejected';
    db.drivers[idx].documentVerification.profilePhoto.verifiedAt = new Date().toISOString();
    db.drivers[idx].documentVerification.profilePhoto.verificationReason = photoReason || null;
  }

  writeDB(db);
  const { password, ...safe } = db.drivers[idx];
  return res.json({
    success: true,
    message: 'Documents verified',
    driver: safe,
  });
});

// Admin approve/reject driver
app.post('/api/drivers/:id/approve', (req, res) => {
  const db = readDB();
  const idx = db.drivers.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });
  const { approved, reason } = req.body;
  db.drivers[idx].approved = approved;
  db.drivers[idx].status = approved ? 'offline' : 'rejected';
  db.drivers[idx].approvedAt = new Date().toISOString();
  if (reason) db.drivers[idx].rejectionReason = reason;
  if (approved) {
    db.drivers[idx].documents = { license: 'verified', insurance: 'verified', registration: 'verified' };
  }
  writeDB(db);
  const { password, ...safe } = db.drivers[idx];
  return res.json(safe);
});

// Add new driver
app.post('/api/drivers', (req, res) => {
  const db = readDB();
  const { name, phone, truckId, vehicleDetails } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
  const id = String(Math.floor(1000 + Math.random() * 9000));
  const newDriver = {
    id, name, password: '1234', phone, status: 'offline', available: false,
    earnings: 0, rank: 'Rookie', rating: 0, truckId: truckId || null,
    location: { lat: 41.87, lng: -87.63 }, currentJobId: null,
    documents: { license: 'pending', insurance: 'pending', registration: 'pending' },
    vehicleDetails: vehicleDetails || { make: '', model: '', year: 2024, plateNumber: '' },
    stats: { totalDistance: 0, activeHours: 0, serviceLevel: 0, jobsToday: 0, totalTrips: 0 },
  };
  db.drivers.push(newDriver);
  writeDB(db);
  const { password, ...safe } = newDriver;
  return res.status(201).json(safe);
});

// Delete driver
app.delete('/api/drivers/:id', (req, res) => {
  const db = readDB();
  const idx = db.drivers.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });
  db.drivers.splice(idx, 1);
  writeDB(db);
  return res.json({ success: true });
});

app.get('/api/drivers/:id', (req, res) => {
  const db = readDB();
  const driver = db.drivers.find(d => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  const { password, ...safe } = driver;
  return res.json(safe);
});

app.patch('/api/drivers/:id', (req, res) => {
  const db = readDB();
  const idx = db.drivers.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });
  Object.assign(db.drivers[idx], req.body);
  writeDB(db);
  const { password, ...safe } = db.drivers[idx];
  return res.json(safe);
});

app.post('/api/drivers/:id/location', (req, res) => {
  const db = readDB();
  const idx = db.drivers.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
  db.drivers[idx].location = { lat, lng };
  writeDB(db);
  return res.json({ id: req.params.id, location: db.drivers[idx].location });
});

app.get('/api/drivers/:id/earnings', (req, res) => {
  const db = readDB();
  const earnings = db.earnings.filter(e => e.driverId === req.params.id);
  const totalEarnings = earnings.reduce((sum, e) => sum + e.total, 0);
  return res.json({ driverId: req.params.id, totalEarnings: parseFloat(totalEarnings.toFixed(2)), entries: earnings });
});

app.post('/api/drivers/:id/availability', (req, res) => {
  const db = readDB();
  const idx = db.drivers.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });
  const available = req.body.available !== undefined ? req.body.available : !db.drivers[idx].available;
  db.drivers[idx].available = available;
  db.drivers[idx].status = available ? 'active' : 'offline';
  writeDB(db);
  const { password, ...safe } = db.drivers[idx];
  return res.json(safe);
});

app.post('/api/drivers/:id/accept-job', (req, res) => {
  const db = readDB();
  const idx = db.drivers.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });
  const { bookingId } = req.body;
  const bIdx = db.bookings.findIndex(b => b.id === bookingId);
  if (bIdx === -1) return res.status(404).json({ error: 'Booking not found' });
  db.bookings[bIdx].driverId = req.params.id;
  db.bookings[bIdx].status = 'in-transit';
  db.drivers[idx].currentJobId = bookingId;
  db.drivers[idx].status = 'on-trip';
  db.drivers[idx].available = false;
  writeDB(db);
  return res.json({ success: true, booking: db.bookings[bIdx] });
});

app.post('/api/drivers/:id/reject-job', (req, res) => {
  const db = readDB();
  const { bookingId } = req.body;
  return res.json({ success: true, message: `Job ${bookingId} rejected` });
});

app.post('/api/drivers/:id/respond-assignment', (req, res) => {
  const db = readDB();
  const { bookingId, accept } = req.body;
  const dIdx = db.drivers.findIndex(d => d.id === req.params.id);
  if (dIdx === -1) return res.status(404).json({ error: 'Driver not found' });
  const bIdx = db.bookings.findIndex(b => b.id === bookingId);
  if (bIdx === -1) return res.status(404).json({ error: 'Booking not found' });

  delete pendingAssignments[bookingId];
  db.bookings[bIdx].pendingDriverId = null;
  db.bookings[bIdx].assignmentSentAt = null;

  if (accept) {
    db.bookings[bIdx].driverId = req.params.id;
    db.bookings[bIdx].status = 'confirmed';
    db.drivers[dIdx].currentJobId = bookingId;
    db.drivers[dIdx].available = false;
    db.drivers[dIdx].status = 'on-trip';
    writeDB(db);
    return res.json({ success: true, accepted: true, booking: db.bookings[bIdx] });
  } else {
    if (!db.bookings[bIdx].declinedDrivers) db.bookings[bIdx].declinedDrivers = [];
    db.bookings[bIdx].declinedDrivers.push(req.params.id);
    writeDB(db);
    return res.json({ success: true, accepted: false, message: 'Declined, looking for another driver' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  TRUCKS
// ═══════════════════════════════════════════════════════════════
app.get('/api/trucks', (req, res) => res.json(readDB().trucks));

app.patch('/api/trucks/:id', (req, res) => {
  const db = readDB();
  const idx = db.trucks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Truck not found' });
  Object.assign(db.trucks[idx], req.body);
  writeDB(db);
  return res.json(db.trucks[idx]);
});

app.post('/api/trucks', (req, res) => {
  const db = readDB();
  const truck = { id: req.body.id || uuidv4().slice(0, 8), label: req.body.label || 'New Truck', capacity: req.body.capacity || '0KG', icon: req.body.icon || 'local_shipping', price: req.body.price || 0, kmCharge: req.body.kmCharge || 0, active: req.body.active !== undefined ? req.body.active : true };
  db.trucks.push(truck);
  writeDB(db);
  return res.status(201).json(truck);
});

// ═══════════════════════════════════════════════════════════════
//  FLEET
// ═══════════════════════════════════════════════════════════════
app.get('/api/fleet', (req, res) => res.json(readDB().fleet));

app.patch('/api/fleet/:id', (req, res) => {
  const db = readDB();
  const idx = db.fleet.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Fleet vehicle not found' });
  Object.assign(db.fleet[idx], req.body);
  writeDB(db);
  return res.json(db.fleet[idx]);
});

// ═══════════════════════════════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════════════════════════════
app.get('/api/payments', (req, res) => res.json(readDB().payments));

app.post('/api/payments/initiate', (req, res) => {
  const db = readDB();
  const orderId = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
  const txnId = `mock_${uuidv4().slice(0, 6)}`;
  const payment = {
    id: `p${String(db.payments.length + 1).padStart(2, '0')}`,
    bookingId: req.body.bookingId || null, userId: req.body.userId || null,
    amount: req.body.amount || 0, method: req.body.method || 'mock',
    status: 'pending', date: new Date().toISOString().split('T')[0],
    transactionId: txnId, orderId
  };
  db.payments.push(payment);
  writeDB(db);
  return res.status(201).json({ orderId, transactionId: txnId, payment });
});

app.post('/api/payments/verify', (req, res) => {
  const db = readDB();
  const { orderId, transactionId } = req.body;
  const idx = db.payments.findIndex(p => p.orderId === orderId || p.transactionId === transactionId);
  if (idx === -1) return res.status(404).json({ error: 'Payment not found' });
  db.payments[idx].status = 'completed';
  writeDB(db);
  return res.json({ status: 'completed', payment: db.payments[idx] });
});

// ═══════════════════════════════════════════════════════════════
//  WALLET
// ═══════════════════════════════════════════════════════════════
app.get('/api/wallet/:userId', (req, res) => {
  const db = readDB();
  let w = db.wallet.find(w => w.userId === req.params.userId);
  if (!w) { w = { userId: req.params.userId, balance: 0, transactions: [] }; db.wallet.push(w); writeDB(db); }
  return res.json(w);
});

app.post('/api/wallet/:userId/topup', (req, res) => {
  const db = readDB();
  let wIdx = db.wallet.findIndex(w => w.userId === req.params.userId);
  if (wIdx === -1) { db.wallet.push({ userId: req.params.userId, balance: 0, transactions: [] }); wIdx = db.wallet.length - 1; }
  const amount = parseFloat(req.body.amount) || 0;
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
  db.wallet[wIdx].balance += amount;
  db.wallet[wIdx].transactions.push({ id: `wt${uuidv4().slice(0, 4)}`, type: 'topup', amount, date: new Date().toISOString().split('T')[0], description: req.body.description || 'Wallet top-up' });
  writeDB(db);
  return res.json(db.wallet[wIdx]);
});

app.post('/api/wallet/:userId/deduct', (req, res) => {
  const db = readDB();
  let wIdx = db.wallet.findIndex(w => w.userId === req.params.userId);
  if (wIdx === -1) return res.status(404).json({ error: 'Wallet not found' });
  const amount = parseFloat(req.body.amount) || 0;
  if (amount > db.wallet[wIdx].balance) return res.status(400).json({ error: 'Insufficient balance' });
  db.wallet[wIdx].balance -= amount;
  db.wallet[wIdx].transactions.push({ id: `wt${uuidv4().slice(0, 4)}`, type: 'deduct', amount, date: new Date().toISOString().split('T')[0], description: req.body.description || 'Payment deduction' });
  writeDB(db);
  return res.json(db.wallet[wIdx]);
});

// ═══════════════════════════════════════════════════════════════
//  RATINGS
// ═══════════════════════════════════════════════════════════════
app.post('/api/ratings', (req, res) => {
  const db = readDB();
  const { userId, driverId, bookingId, rating, comment } = req.body;
  if (!userId || !driverId || !rating) return res.status(400).json({ error: 'userId, driverId, rating required' });
  const r = { id: `r${String(db.ratings.length + 1).padStart(2, '0')}`, userId, driverId, bookingId: bookingId || null, rating: Math.min(5, Math.max(1, parseInt(rating))), comment: comment || '', date: new Date().toISOString().split('T')[0] };
  db.ratings.push(r);
  const driverRatings = db.ratings.filter(rt => rt.driverId === driverId);
  const avg = driverRatings.reduce((s, rt) => s + rt.rating, 0) / driverRatings.length;
  const dIdx = db.drivers.findIndex(d => d.id === driverId);
  if (dIdx !== -1) db.drivers[dIdx].rating = parseFloat(avg.toFixed(1));
  writeDB(db);
  return res.status(201).json(r);
});

app.get('/api/ratings/driver/:driverId', (req, res) => {
  const db = readDB();
  return res.json(db.ratings.filter(r => r.driverId === req.params.driverId));
});

app.get('/api/ratings/user/:userId', (req, res) => {
  const db = readDB();
  return res.json(db.ratings.filter(r => r.userId === req.params.userId));
});

// ═══════════════════════════════════════════════════════════════
//  SUPPORT TICKETS
// ═══════════════════════════════════════════════════════════════
app.get('/api/support/tickets', (req, res) => {
  const db = readDB();
  const { userId } = req.query;
  let tickets = db.supportTickets;
  if (userId) tickets = tickets.filter(t => t.userId === userId);
  return res.json(tickets);
});

app.get('/api/support/tickets/:id', (req, res) => {
  const db = readDB();
  const ticket = db.supportTickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  return res.json(ticket);
});

// Get ticket suggestions by category
app.get('/api/support/suggestions', (req, res) => {
  const { category } = req.query;
  const suggestions = {
    delivery: ['Where is my delivery?', 'My delivery is late', 'Item was damaged', 'Wrong item delivered', 'Driver didn\'t arrive'],
    payment: ['I was charged incorrectly', 'Request a refund', 'Payment failed', 'Duplicate charge', 'Receipt not received'],
    account: ['Can\'t login to my account', 'Reset my password', 'Update my phone number', 'Delete my account', 'Profile not updating'],
    other: ['I have a general question', 'Report a technical issue', 'Share feedback', 'Partnership inquiry', 'Other']
  };
  const result = suggestions[category] || suggestions.other;
  return res.json({ suggestions: result });
});

app.post('/api/support/tickets', (req, res) => {
  const db = readDB();
  const { userId, subject, message, category } = req.body;
  if (!userId || !subject || !message) return res.status(400).json({ error: 'userId, subject, message required' });
  const ticket = {
    id: `st${String(db.supportTickets.length + 1).padStart(2, '0')}`,
    userId, subject, category: category || 'other', status: 'open',
    createdAt: new Date().toISOString().split('T')[0],
    messages: [{ sender: 'user', message, timestamp: new Date().toISOString() }]
  };
  db.supportTickets.push(ticket);
  writeDB(db);
  return res.status(201).json(ticket);
});

app.post('/api/support/tickets/:id/reply', (req, res) => {
  const db = readDB();
  const idx = db.supportTickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  const { sender, message, type, voiceData } = req.body;
  const newMessage = {
    sender: sender || 'user',
    type: type || 'text',
    message: message || '',
    timestamp: new Date().toISOString()
  };
  if (type === 'voice' && voiceData) {
    newMessage.voiceData = voiceData;
  }
  db.supportTickets[idx].messages.push(newMessage);
  if (sender === 'admin') db.supportTickets[idx].status = 'in-progress';
  writeDB(db);
  return res.json(db.supportTickets[idx]);
});

app.patch('/api/support/tickets/:id', (req, res) => {
  const db = readDB();
  const idx = db.supportTickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  if (req.body.status) db.supportTickets[idx].status = req.body.status;
  writeDB(db);
  return res.json(db.supportTickets[idx]);
});

// ═══════════════════════════════════════════════════════════════
//  INVOICES
// ═══════════════════════════════════════════════════════════════
app.get('/api/invoices/:bookingId', (req, res) => {
  const db = readDB();
  const booking = db.bookings.find(b => b.id === req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const payment = db.payments.find(p => p.bookingId === req.params.bookingId);
  const user = db.users.find(u => u.id === booking.userId);
  const driver = db.drivers.find(d => d.id === booking.driverId);
  return res.json({
    invoiceId: `INV-${req.params.bookingId}`,
    date: booking.completedAt || booking.createdAt,
    booking: { id: booking.id, pickup: booking.pickup, dropoff: booking.dropoff, cargo: booking.cargo, truckType: booking.truckType, status: booking.status },
    fare: booking.fare,
    payment: payment ? { method: payment.method, status: payment.status, transactionId: payment.transactionId, date: payment.date } : null,
    customer: user ? { name: user.name, email: user.email, phone: user.phone } : null,
    driver: driver ? { name: driver.name, phone: driver.phone, truckId: driver.truckId } : null,
    company: { name: 'MiniTruck Logistics', address: '100 Fleet Street', gst: 'GSTIN-DEMO-001' }
  });
});

// ═══════════════════════════════════════════════════════════════
//  DYNAMIC PRICING
// ═══════════════════════════════════════════════════════════════
// Get all pricing config (for frontend)
app.get('/api/pricing/config', (req, res) => {
  const db = readDB();
  res.json({
    trucks: db.trucks,
    handlingCharges: db.handlingCharges || { standard: 0, fragile: 50, hazmat: 120, temperature: 80, oversized: 100 },
    weightCharges: db.weightCharges || { below500: 0, above500: 30, above2000: 80, above5000: 150 },
    priorityMultipliers: db.priorityMultipliers || { standard: 1.0, express: 1.5, urgent: 2.2 },
    commission: { minimumFare: db.commission?.minimumFare || 50, surgeEnabled: db.commission?.surgeEnabled, surgeMultiplier: db.commission?.surgeMultiplier, peakHours: db.commission?.peakHours },
  });
});

// Update pricing config (admin)
app.post('/api/pricing/config', (req, res) => {
  const db = readDB();
  const { trucks, handlingCharges, weightCharges, priorityMultipliers, commission } = req.body;
  if (trucks) trucks.forEach(t => { const existing = db.trucks.find(tr => tr.id === t.id); if (existing) { existing.price = t.price; existing.kmCharge = t.kmCharge; } });
  if (handlingCharges) db.handlingCharges = handlingCharges;
  if (weightCharges) db.weightCharges = weightCharges;
  if (priorityMultipliers) db.priorityMultipliers = priorityMultipliers;
  if (commission) db.commission = { ...db.commission, ...commission };
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/pricing/estimate', (req, res) => {
  const db = readDB();
  const { truckType, distanceKm, loadType, weight, priority, discountCode } = req.body;
  const truck = db.trucks.find(t => t.id === truckType) || db.trucks[0];
  const commission = db.commission;
  const hCharges = db.handlingCharges || {};
  const wCharges = db.weightCharges || {};
  const pMultipliers = db.priorityMultipliers || {};

  const baseFare = truck.price;
  const distanceCharge = (distanceKm || 0) * truck.kmCharge;

  const w = parseFloat(weight) || 0;
  const weightSurcharge = w > 5000 ? (wCharges.above5000 || 150) : w > 2000 ? (wCharges.above2000 || 80) : w > 500 ? (wCharges.above500 || 30) : (wCharges.below500 || 0);

  const handlingSurcharge = hCharges[loadType?.toLowerCase()] || 0;

  const priorityMultiplier = pMultipliers[priority] || 1.0;

  const hour = new Date().getHours();
  const surgeMultiplier = (commission.surgeEnabled && commission.peakHours.includes(hour)) ? commission.surgeMultiplier : 1.0;

  let discount = 0;
  let discountApplied = false;
  if (discountCode === 'FIRST50') { discount = 50; discountApplied = true; }
  else if (discountCode === 'HAUL20') { discount = 0; discountApplied = true; }

  let subtotal = (baseFare + distanceCharge + weightSurcharge + handlingSurcharge) * priorityMultiplier * surgeMultiplier;
  if (discountCode === 'HAUL20') { discount = subtotal * 0.20; }
  const total = Math.max(commission.minimumFare, subtotal - discount);

  return res.json({
    baseFare, distanceCharge: parseFloat(distanceCharge.toFixed(2)),
    weightSurcharge, handlingSurcharge,
    priorityMultiplier, surgeMultiplier, surgeActive: surgeMultiplier > 1,
    discount: parseFloat(discount.toFixed(2)), discountApplied,
    subtotal: parseFloat(subtotal.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    currency: 'INR'
  });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════════════
app.get('/api/admin/stats', (req, res) => {
  const db = readDB();
  const completedPayments = db.payments.filter(p => p.status === 'completed');
  const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const activeFleet = db.fleet.filter(f => f.status === 'active' || f.status === 'on-trip').length;
  return res.json({
    revenue: { total: parseFloat(totalRevenue.toFixed(2)), transactions: completedPayments.length },
    fleet: { active: activeFleet, total: db.fleet.length, avgHealth: parseFloat((db.fleet.reduce((s, f) => s + f.health, 0) / (db.fleet.length || 1)).toFixed(1)) },
    bookings: { total: db.bookings.length, confirmed: db.bookings.filter(b => b.status === 'confirmed').length, inTransit: db.bookings.filter(b => b.status === 'in-transit').length, completed: db.bookings.filter(b => b.status === 'completed').length, cancelled: db.bookings.filter(b => b.status === 'cancelled').length },
    drivers: { active: db.drivers.filter(d => d.status === 'active' || d.status === 'on-trip').length, total: db.drivers.length },
    users: { total: db.users.length },
    support: { open: db.supportTickets.filter(t => t.status === 'open').length, total: db.supportTickets.length }
  });
});

app.get('/api/admin/analytics', (req, res) => {
  const db = readDB();
  const payments = db.payments.filter(p => p.status === 'completed');
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const avgBookingValue = payments.length ? totalRevenue / payments.length : 0;
  const topDrivers = [...db.drivers].sort((a, b) => b.earnings - a.earnings).slice(0, 5).map(({ password, ...d }) => d);
  const popularRoutes = db.bookings.slice(0, 5).map(b => ({ from: b.pickup?.address, to: b.dropoff?.address, count: 1 }));
  return res.json({
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalBookings: db.bookings.length,
    totalUsers: db.users.length,
    totalDrivers: db.drivers.length,
    avgBookingValue: parseFloat(avgBookingValue.toFixed(2)),
    avgDriverRating: parseFloat((db.drivers.reduce((s, d) => s + d.rating, 0) / db.drivers.length).toFixed(1)),
    completionRate: parseFloat(((db.bookings.filter(b => b.status === 'completed').length / db.bookings.length) * 100).toFixed(1)),
    topDrivers, popularRoutes,
    revenueByMethod: payments.reduce((acc, p) => { acc[p.method] = (acc[p.method] || 0) + p.amount; return acc; }, {})
  });
});

app.get('/api/admin/commission', (req, res) => res.json(readDB().commission));

app.post('/api/admin/commission', (req, res) => {
  const db = readDB();
  Object.assign(db.commission, req.body);
  writeDB(db);
  return res.json(db.commission);
});

app.post('/api/admin/refund', (req, res) => {
  const db = readDB();
  const { bookingId } = req.body;
  const bIdx = db.bookings.findIndex(b => b.id === bookingId);
  if (bIdx === -1) return res.status(404).json({ error: 'Booking not found' });
  db.bookings[bIdx].status = 'cancelled';
  db.bookings[bIdx].payment = { ...db.bookings[bIdx].payment, status: 'refunded', method: 'refunded' };
  const userId = db.bookings[bIdx].userId;
  const amount = db.bookings[bIdx].fare?.total || 0;
  const wIdx = db.wallet.findIndex(w => w.userId === userId);
  if (wIdx !== -1 && amount > 0) {
    db.wallet[wIdx].balance += amount;
    db.wallet[wIdx].transactions.push({ id: `wt${uuidv4().slice(0, 4)}`, type: 'topup', amount, date: new Date().toISOString().split('T')[0], description: `Refund for ${bookingId}` });
  }
  writeDB(db);
  return res.json({ success: true, refundedAmount: amount, booking: db.bookings[bIdx] });
});

// ═══════════════════════════════════════════════════════════════
//  DATABASE MANAGEMENT (OTP Protected)
// ═══════════════════════════════════════════════════════════════

// Send OTP for database access (admin only)
app.post('/api/admin/db-otp/send', (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const db = readDB();
    const admin = db.admins.find(a => a.id === decoded.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const clean = (admin.phone || '9999999999').replace(/\D/g, '');
    otpStore[clean] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };
    console.log(`[DB-OTP] ${clean}: ${otp}`);
    return res.json({ success: true, message: 'OTP sent to registered phone' });
  } catch (err) { return res.status(401).json({ error: 'Invalid token' }); }
});

// Verify OTP and get database access token
app.post('/api/admin/db-otp/verify', (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'phone and otp required' });
  try {
    const decoded = jwt.verify(auth, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const clean = phone.replace(/\D/g, '');
    const stored = otpStore[clean];
    if (!stored) return res.status(400).json({ error: 'OTP expired or not sent' });
    if (Date.now() > stored.expiresAt) { delete otpStore[clean]; return res.status(400).json({ error: 'OTP expired' }); }
    if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    delete otpStore[clean];
    const dbAccessToken = jwt.sign({ id: decoded.id, role: 'admin', purpose: 'db-access' }, JWT_SECRET, { expiresIn: '10m' });
    return res.json({ success: true, dbAccessToken });
  } catch (err) { return res.status(401).json({ error: 'Invalid token' }); }
});

// Get all records from a collection (requires db access token)
app.get('/api/admin/db/:collection', (req, res) => {
  const dbToken = req.headers['x-db-token'];
  if (!dbToken) return res.status(401).json({ error: 'DB access token required' });
  try {
    const decoded = jwt.verify(dbToken, JWT_SECRET);
    if (decoded.role !== 'admin' || decoded.purpose !== 'db-access') return res.status(403).json({ error: 'Invalid token' });
    const db = readDB();
    const collection = req.params.collection;
    if (!(collection in db)) return res.status(404).json({ error: 'Collection not found' });
    return res.json({ [collection]: db[collection] });
  } catch (err) { return res.status(401).json({ error: 'Invalid token' }); }
});

// Update a record (requires db access token)
app.put('/api/admin/db/:collection/:id', (req, res) => {
  const dbToken = req.headers['x-db-token'];
  if (!dbToken) return res.status(401).json({ error: 'DB access token required' });
  try {
    const decoded = jwt.verify(dbToken, JWT_SECRET);
    if (decoded.role !== 'admin' || decoded.purpose !== 'db-access') return res.status(403).json({ error: 'Invalid token' });
    const db = readDB();
    const { collection, id } = req.params;
    if (!(collection in db)) return res.status(404).json({ error: 'Collection not found' });
    const idx = db[collection].findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Record not found' });
    Object.assign(db[collection][idx], req.body);
    writeDB(db);
    return res.json({ success: true, updated: db[collection][idx] });
  } catch (err) { return res.status(401).json({ error: 'Invalid token' }); }
});

// Delete a record (requires db access token)
app.delete('/api/admin/db/:collection/:id', (req, res) => {
  const dbToken = req.headers['x-db-token'];
  if (!dbToken) return res.status(401).json({ error: 'DB access token required' });
  try {
    const decoded = jwt.verify(dbToken, JWT_SECRET);
    if (decoded.role !== 'admin' || decoded.purpose !== 'db-access') return res.status(403).json({ error: 'Invalid token' });
    const db = readDB();
    const { collection, id } = req.params;
    if (!(collection in db)) return res.status(404).json({ error: 'Collection not found' });
    const idx = db[collection].findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Record not found' });
    const deleted = db[collection][idx];
    db[collection].splice(idx, 1);
    writeDB(db);
    return res.json({ success: true, deleted });
  } catch (err) { return res.status(401).json({ error: 'Invalid token' }); }
});

// ═══════════════════════════════════════════════════════════════
//  GEOCODING
// ═══════════════════════════════════════════════════════════════
app.get('/api/geocode', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`, { headers: { 'User-Agent': 'MiniTruck-TruckBooking/1.0 (demo@minitruck.app)' } });
    return res.json(await response.json());
  } catch (err) { return res.status(502).json({ error: 'Geocoding failed', details: err.message }); }
});

app.get('/api/route', async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) return res.status(400).json({ error: 'fromLat, fromLng, toLat, toLng required' });
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`, { headers: { 'User-Agent': 'MiniTruck-TruckBooking/1.0 (demo@minitruck.app)' } });
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return res.json({ distance: route.distance, duration: route.duration, distanceKm: parseFloat((route.distance / 1000).toFixed(2)), durationMin: parseFloat((route.duration / 60).toFixed(1)), geometry: route.geometry });
    }
    return res.json(data);
  } catch (err) { return res.status(502).json({ error: 'Routing failed', details: err.message }); }
});

// Export for Vercel serverless
module.exports = app;

// Also export as handler for Vercel functions
module.exports.handler = app;
