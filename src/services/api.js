import axios from 'axios';
import { API_BASE } from '../config/constants';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach auth token to every request
api.interceptors.request.use(config => {
  try {
    const auth = JSON.parse(sessionStorage.getItem('minitruck_auth') || '{}');
    if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  } catch {}
  return config;
});

// Auto logout on 401
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    sessionStorage.removeItem('minitruck_auth');
    if (window.location.pathname !== '/login') window.location.href = '/login';
  }
  return Promise.reject(err);
});

// ── Auth ──
export const auth = {
  login: (id, password, role) => api.post('/auth/login', { id, password, role }).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
};

// ── Users ──
export const users = {
  getProfile: (id) => api.get(`/users/${id}`).then(r => r.data),
  updateProfile: (id, data) => api.patch(`/users/${id}`, data).then(r => r.data),
  register: (data) => api.post('/users', data).then(r => r.data),
};

// ── Bookings ──
export const bookings = {
  getBookings: (params) => api.get('/bookings', { params }).then(r => r.data),
  getBooking: (id) => api.get(`/bookings/${id}`).then(r => r.data),
  createBooking: (data) => api.post('/bookings', data).then(r => r.data),
  updateBooking: (id, data) => api.patch(`/bookings/${id}`, data).then(r => r.data),
};

// ── Drivers ──
export const drivers = {
  getDrivers: () => api.get('/drivers').then(r => r.data),
  getDriver: (id) => api.get(`/drivers/${id}`).then(r => r.data),
  addDriver: (data) => api.post('/drivers', data).then(r => r.data),
  updateDriver: (id, data) => api.patch(`/drivers/${id}`, data).then(r => r.data),
  deleteDriver: (id) => api.delete(`/drivers/${id}`).then(r => r.data),
  getDriverEarnings: (id) => api.get(`/drivers/${id}/earnings`).then(r => r.data),
  toggleAvailability: (id, data) => api.post(`/drivers/${id}/availability`, data).then(r => r.data),
  acceptJob: (id, bookingId) => api.post(`/drivers/${id}/accept-job`, { bookingId }).then(r => r.data),
  rejectJob: (id, bookingId) => api.post(`/drivers/${id}/reject-job`, { bookingId }).then(r => r.data),
};

// ── Trucks ──
export const trucks = {
  getTrucks: () => api.get('/trucks').then(r => r.data),
  addTruck: (data) => api.post('/trucks', data).then(r => r.data),
  updateTruck: (id, data) => api.patch(`/trucks/${id}`, data).then(r => r.data),
};

// ── Fleet ──
export const fleet = {
  getFleet: () => api.get('/fleet').then(r => r.data),
};

// ── Payments ──
export const payments = {
  getPayments: () => api.get('/payments').then(r => r.data),
  initiatePayment: (data) => api.post('/payments/initiate', data).then(r => r.data),
  verifyPayment: (data) => api.post('/payments/verify', data).then(r => r.data),
};

// ── Wallet ──
export const wallet = {
  getWallet: (userId) => api.get(`/wallet/${userId}`).then(r => r.data),
  topup: (userId, data) => api.post(`/wallet/${userId}/topup`, data).then(r => r.data),
  deduct: (userId, data) => api.post(`/wallet/${userId}/deduct`, data).then(r => r.data),
};

// ── Ratings ──
export const ratings = {
  submit: (data) => api.post('/ratings', data).then(r => r.data),
  getForDriver: (driverId) => api.get(`/ratings/driver/${driverId}`).then(r => r.data),
};

// ── Support ──
export const support = {
  getTickets: (params) => api.get('/support/tickets', { params }).then(r => r.data),
  getTicket: (id) => api.get(`/support/tickets/${id}`).then(r => r.data),
  createTicket: (data) => api.post('/support/tickets', data).then(r => r.data),
  replyTicket: (id, data) => api.post(`/support/tickets/${id}/reply`, data).then(r => r.data),
};

// ── Pricing ──
export const pricing = {
  estimate: (data) => api.post('/pricing/estimate', data).then(r => r.data),
};

// ── Invoices ──
export const invoices = {
  get: (bookingId) => api.get(`/invoices/${bookingId}`).then(r => r.data),
};

// ── Admin ──
export const admin = {
  getStats: () => api.get('/admin/stats').then(r => r.data),
  getAnalytics: () => api.get('/admin/analytics').then(r => r.data),
  getCommission: () => api.get('/admin/commission').then(r => r.data),
  updateCommission: (data) => api.post('/admin/commission', data).then(r => r.data),
  refund: (bookingId) => api.post('/admin/refund', { bookingId }).then(r => r.data),
};

// ── Geocoding ──
export const geo = {
  geocode: (query) => api.get('/geocode', { params: { q: query } }).then(r => r.data),
  getRoute: (fromLat, fromLng, toLat, toLng) => api.get('/route', { params: { fromLat, fromLng, toLat, toLng } }).then(r => r.data),
};

export default api;
