// For web: use relative path (same domain)
// For APK: use absolute URL to backend server
const isNative = () => {
  try {
    return window.location.href.startsWith('capacitor://');
  } catch {
    return false;
  }
};

// APK needs to connect to backend server
// For development: http://192.168.x.x:5005/api
// For production: https://your-backend-server.com/api
const BACKEND_URL = import.meta.env.VITE_API_BASE || (isNative() ? 'http://localhost:5005/api' : '/api');
export const API_BASE = BACKEND_URL;

export const MOCK_CREDENTIALS = {
  customer: { id: '9876543210', password: '1234', label: 'Rajesh Kumar' },
  driver: { id: 'D8829', password: '1234', label: 'Ravi Shankar' },
  admin: { id: 'admin', password: '1234', otp: '000000', label: 'Admin' },
};

export const TRUCK_TYPES = [
  {
    id: 'small',
    label: 'Mini Truck',
    icon: 'minor_crash',
    capacity: '500 KG',
    dimensions: '6ft x 4ft x 4ft',
    baseRate: 45,
    perKm: 1.20,
    description: 'Light cargo, quick deliveries',
  },
  {
    id: 'medium',
    label: 'Box Truck',
    icon: 'local_shipping',
    capacity: '2.5T',
    dimensions: '10ft x 6ft x 6ft',
    baseRate: 120,
    perKm: 2.50,
    description: 'Standard freight, furniture moves',
  },
  {
    id: 'large',
    label: 'Heavy Duty',
    icon: 'rv_hookup',
    capacity: '10T+',
    dimensions: '16ft x 8ft x 8ft',
    baseRate: 380,
    perKm: 5.50,
    description: 'Industrial loads, bulk transport',
  },
];

export const HANDLING_PROFILES = [
  { id: 'standard', label: 'Standard' },
  { id: 'fragile', label: 'Fragile' },
  { id: 'hazmat', label: 'Hazardous Material' },
  { id: 'temperature', label: 'Temperature Controlled' },
  { id: 'oversized', label: 'Oversized Load' },
];

export const ETA_PRIORITIES = [
  { id: 'standard', label: 'Standard (2-4 hrs)', multiplier: 1.0 },
  { id: 'express', label: 'Express (1-2 hrs)', multiplier: 1.5 },
  { id: 'urgent', label: 'Urgent (<1 hr)', multiplier: 2.2 },
];

export const BOOKING_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_TRANSIT: 'in-transit',
  DELAYED: 'delayed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const DRIVER_STATUSES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  ON_TRIP: 'on-trip',
};

export const DEFAULT_MAP_CENTER = [19.076, 72.8777]; // Mumbai
export const DEFAULT_MAP_ZOOM = 13;
