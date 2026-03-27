import io from 'socket.io-client';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const SOCKET_EVENTS = new Map();

/**
 * Initialize Socket.io connection with fallback to polling
 * @param {string} token - JWT authentication token
 * @param {string} userId - User ID
 * @param {string} role - User role (customer, driver, admin)
 * @returns {Promise<boolean>} Success status
 */
export async function initializeSocket(token, userId, role) {
  return new Promise((resolve, reject) => {
    try {
      // Get server URL
      const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005';

      socket = io(SERVER_URL, {
        auth: { token, userId, role },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        transports: ['websocket', 'polling'], // Fallback to polling
      });

      // Connection events
      socket.on('connect', () => {
        console.log('✅ WebSocket connected:', socket.id);
        reconnectAttempts = 0;
        resolve(true);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        // Will retry automatically
      });

      socket.on('disconnect', (reason) => {
        console.warn('⚠️  WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, need to re-authenticate
          initializeSocket(token, userId, role).catch(console.error);
        }
      });

      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!socket.connected) {
          console.warn('⚠️  WebSocket connection timeout, using polling fallback');
          resolve(true); // Resolve anyway, app will use polling
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      reject(error);
    }
  });
}

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export function isSocketConnected() {
  return socket && socket.connected;
}

/**
 * Emit event with optional callback
 * @param {string} event - Event name
 * @param {*} data - Event data
 * @param {Function} callback - Optional callback
 */
export function emitEvent(event, data, callback) {
  if (socket && socket.connected) {
    if (callback) {
      socket.emit(event, data, callback);
    } else {
      socket.emit(event, data);
    }
  } else {
    console.warn(`⚠️  Socket not connected, event "${event}" queued for retry`);
    // Queue events for later
    setTimeout(() => emitEvent(event, data, callback), 1000);
  }
}

/**
 * Subscribe to socket events
 * @param {string} event - Event name
 * @param {Function} callback - Callback function
 */
export function onEvent(event, callback) {
  if (!socket) {
    console.warn('Socket not initialized');
    return;
  }

  // Store callback for reconnection
  if (!SOCKET_EVENTS.has(event)) {
    SOCKET_EVENTS.set(event, []);
  }
  SOCKET_EVENTS.get(event).push(callback);

  // Subscribe to event
  socket.on(event, callback);
}

/**
 * Unsubscribe from socket events
 * @param {string} event - Event name
 * @param {Function} callback - Callback function
 */
export function offEvent(event, callback) {
  if (!socket) return;
  socket.off(event, callback);
}

/**
 * Subscribe to booking updates
 * @param {Function} callback - Called with booking data
 */
export function onBookingCreated(callback) {
  onEvent('booking:created', callback);
}

export function onBookingAccepted(callback) {
  onEvent('booking:accepted', callback);
}

export function onBookingStatusChanged(callback) {
  onEvent('booking:status-changed', callback);
}

/**
 * Subscribe to location updates
 * @param {Function} callback - Called with location data
 */
export function onDriverLocationUpdated(callback) {
  onEvent('driver:location-updated', callback);
}

/**
 * Subscribe to tracking updates for a driver
 * @param {string} driverId - Driver ID
 * @param {Function} callback - Called with location data
 */
export function subscribeToTracking(driverId, callback) {
  emitEvent('tracking:subscribe', { driverId });
  onEvent('driver:location-updated', callback);
}

/**
 * Unsubscribe from tracking
 * @param {string} driverId - Driver ID
 */
export function unsubscribeFromTracking(driverId) {
  emitEvent('tracking:unsubscribe', { driverId });
}

/**
 * Subscribe to admin updates
 * @param {Function} callback - Called with update data
 */
export function onAdminFleetUpdated(callback) {
  onEvent('admin:fleet-updated', callback);
}

export function onAdminPricingUpdated(callback) {
  onEvent('admin:pricing-updated', callback);
}

export function onAdminSettingsUpdated(callback) {
  onEvent('admin:settings-updated', callback);
}

export function onAdminDriverApproved(callback) {
  onEvent('admin:driver-approved', callback);
}

/**
 * Subscribe to assignment notifications
 * @param {Function} callback - Called with assignment data
 */
export function onAssignmentNotification(callback) {
  onEvent('assignment:notify', callback);
}

/**
 * Subscribe to connection status changes
 * @param {Function} callback - Called with status
 */
export function onConnectionStatusChange(callback) {
  if (!socket) return;

  socket.on('connect', () => callback({ connected: true }));
  socket.on('disconnect', () => callback({ connected: false }));
  socket.on('connect_error', (error) => callback({ connected: false, error }));
}

/**
 * Emit booking created event
 * @param {Object} booking - Booking data
 */
export function emitBookingCreated(booking) {
  emitEvent('booking:created', booking);
}

/**
 * Emit booking accepted event
 * @param {Object} data - Acceptance data
 */
export function emitBookingAccepted(data) {
  emitEvent('booking:accepted', data);
}

/**
 * Emit booking status change
 * @param {Object} data - Status change data
 */
export function emitBookingStatusChanged(data) {
  emitEvent('booking:status-changed', data);
}

/**
 * Emit driver location update
 * @param {Object} data - Location data { driverId, lat, lng }
 */
export function emitDriverLocationUpdate(data) {
  emitEvent('driver:location-updated', data);
}

/**
 * Emit admin fleet update
 * @param {Object} data - Fleet update data
 */
export function emitAdminFleetUpdate(data) {
  emitEvent('admin:fleet-updated', data);
}

/**
 * Emit admin pricing update
 * @param {Object} data - Pricing data
 */
export function emitAdminPricingUpdate(data) {
  emitEvent('admin:pricing-updated', data);
}

/**
 * Emit admin settings update
 * @param {Object} data - Settings data
 */
export function emitAdminSettingsUpdate(data) {
  emitEvent('admin:settings-updated', data);
}

/**
 * Emit admin driver approval
 * @param {Object} data - Approval data
 */
export function emitAdminDriverApproval(data) {
  emitEvent('admin:driver-approved', data);
}

/**
 * Request data sync (after offline period)
 * @returns {Promise}
 */
export function requestSync() {
  return new Promise((resolve) => {
    emitEvent('sync:request', {}, (response) => {
      console.log('Sync requested, response:', response);
      resolve(response);
    });
  });
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get socket instance (for advanced usage)
 * @returns {Socket|null}
 */
export function getSocket() {
  return socket;
}

export default {
  initializeSocket,
  isSocketConnected,
  emitEvent,
  onEvent,
  offEvent,
  onBookingCreated,
  onBookingAccepted,
  onBookingStatusChanged,
  onDriverLocationUpdated,
  subscribeToTracking,
  unsubscribeFromTracking,
  onAdminFleetUpdated,
  onAdminPricingUpdated,
  onAdminSettingsUpdated,
  onAdminDriverApproved,
  onAssignmentNotification,
  onConnectionStatusChange,
  emitBookingCreated,
  emitBookingAccepted,
  emitBookingStatusChanged,
  emitDriverLocationUpdate,
  emitAdminFleetUpdate,
  emitAdminPricingUpdate,
  emitAdminSettingsUpdate,
  emitAdminDriverApproval,
  requestSync,
  disconnectSocket,
  getSocket,
};
