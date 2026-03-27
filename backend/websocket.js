const { Server } = require('socket.io');

// Store active connections by user ID
const userSockets = new Map();
const adminSockets = new Set();
const driverSockets = new Map();
const customerSockets = new Map();

/**
 * Initialize Socket.io WebSocket server
 * @param {http.Server} httpServer - Express HTTP server
 * @returns {Server} Socket.io instance
 */
function initializeWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Middleware: Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    const role = socket.handshake.auth.role;

    if (!token || !userId || !role) {
      return next(new Error('Authentication required'));
    }

    // Store user info in socket
    socket.userId = userId;
    socket.userRole = role;
    socket.token = token;

    next();
  });

  // Connection handler
  io.on('connection', (socket) => {
    const { userId, userRole } = socket;

    console.log(`[WebSocket] ${userRole} ${userId} connected: ${socket.id}`);

    // Store socket by role
    userSockets.set(userId, socket);

    if (userRole === 'admin') {
      adminSockets.add(socket.id);
      socket.join('admin-room');
    } else if (userRole === 'driver') {
      driverSockets.set(userId, socket.id);
      socket.join(`driver-${userId}`);
      socket.join('drivers-room');
    } else if (userRole === 'customer') {
      customerSockets.set(userId, socket.id);
      socket.join(`customer-${userId}`);
      socket.join('customers-room');
    }

    // Notify admin of user connection
    io.to('admin-room').emit('user-connected', { userId, role: userRole });

    // ═══════════════════════════════════════════════════════════════
    // BOOKING EVENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Customer creates a booking
     * Event: 'booking:created'
     * Data: { bookingId, customerId, driverId?, status, fare, route }
     */
    socket.on('booking:created', (booking) => {
      console.log(`[Booking] Created: ${booking.id} by ${userId}`);

      // Notify admin
      io.to('admin-room').emit('booking:created', booking);

      // Notify relevant drivers
      io.to('drivers-room').emit('booking:created', booking);
    });

    /**
     * Driver accepts a booking
     * Event: 'booking:accepted'
     * Data: { bookingId, driverId, driverLocation, eta }
     */
    socket.on('booking:accepted', (data) => {
      console.log(`[Booking] Accepted: ${data.bookingId} by driver ${userId}`);

      // Notify customer
      io.to(`customer-${data.customerId}`).emit('booking:accepted', data);

      // Notify admin
      io.to('admin-room').emit('booking:accepted', data);

      // Notify all drivers (so they remove from their list)
      io.to('drivers-room').emit('booking:accepted', data);
    });

    /**
     * Booking status changed
     * Event: 'booking:status-changed'
     * Data: { bookingId, status, driverId?, eta, completedAt? }
     */
    socket.on('booking:status-changed', (data) => {
      console.log(`[Booking] Status changed: ${data.bookingId} → ${data.status}`);

      // Notify everyone involved
      io.to(`customer-${data.customerId}`).emit('booking:status-changed', data);
      if (data.driverId) {
        io.to(`driver-${data.driverId}`).emit('booking:status-changed', data);
      }
      io.to('admin-room').emit('booking:status-changed', data);
    });

    // ═══════════════════════════════════════════════════════════════
    // LOCATION UPDATES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Driver updates location (real-time tracking)
     * Event: 'driver:location-updated'
     * Data: { driverId, lat, lng, timestamp }
     */
    socket.on('driver:location-updated', (data) => {
      // Notify admin (for fleet map)
      io.to('admin-room').emit('driver:location-updated', data);

      // Notify customers viewing this driver
      io.to(`tracking-driver-${data.driverId}`).emit('driver:location-updated', data);
    });

    // ═══════════════════════════════════════════════════════════════
    // ADMIN DATA UPDATES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Admin updates truck/fleet data
     * Event: 'admin:fleet-updated'
     * Data: { fleetId, status, location, health }
     */
    socket.on('admin:fleet-updated', (data) => {
      console.log(`[Admin] Fleet updated: ${data.fleetId}`);

      // Notify all users (data affects driver assignments)
      io.emit('admin:fleet-updated', data);
    });

    /**
     * Admin updates pricing
     * Event: 'admin:pricing-updated'
     * Data: { baseRate, kmCharge, surcharge }
     */
    socket.on('admin:pricing-updated', (data) => {
      console.log(`[Admin] Pricing updated`);

      // Notify all apps
      io.emit('admin:pricing-updated', data);
    });

    /**
     * Admin updates driver approval
     * Event: 'admin:driver-approved'
     * Data: { driverId, approved, message }
     */
    socket.on('admin:driver-approved', (data) => {
      console.log(`[Admin] Driver ${data.driverId} approved`);

      // Notify the driver
      if (driverSockets.has(data.driverId)) {
        io.to(`driver-${data.driverId}`).emit('admin:driver-approved', data);
      }

      // Broadcast to all admins
      io.to('admin-room').emit('admin:driver-approved', data);
    });

    /**
     * Admin updates commission/settings
     * Event: 'admin:settings-updated'
     * Data: { commission, handlingCharges, priorityMultipliers }
     */
    socket.on('admin:settings-updated', (data) => {
      console.log(`[Admin] Settings updated`);

      // Notify all apps
      io.emit('admin:settings-updated', data);
    });

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATION EVENTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Assignment notification (driver receives booking assignment)
     * Event: 'assignment:notify'
     * Data: { driverId, bookingId, pickup, dropoff, fare, urgency }
     */
    socket.on('assignment:notify', (data) => {
      io.to(`driver-${data.driverId}`).emit('assignment:notify', data);
    });

    // ═══════════════════════════════════════════════════════════════
    // REAL-TIME SYNCHRONIZATION REQUESTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Request sync (e.g., after offline period)
     * Event: 'sync:request'
     * Response: 'sync:data' with latest data
     */
    socket.on('sync:request', (callback) => {
      console.log(`[Sync] Requested by ${userId}`);

      // Callback will be handled by backend to send fresh data
      if (typeof callback === 'function') {
        callback({ status: 'acknowledged', timestamp: Date.now() });
      }
    });

    /**
     * Subscribe to tracking updates for a specific booking
     * Event: 'tracking:subscribe'
     * Data: { bookingId, driverId }
     */
    socket.on('tracking:subscribe', (data) => {
      socket.join(`tracking-driver-${data.driverId}`);
      console.log(`[Tracking] Subscribed to driver ${data.driverId}`);
    });

    /**
     * Unsubscribe from tracking
     * Event: 'tracking:unsubscribe'
     * Data: { driverId }
     */
    socket.on('tracking:unsubscribe', (data) => {
      socket.leave(`tracking-driver-${data.driverId}`);
      console.log(`[Tracking] Unsubscribed from driver ${data.driverId}`);
    });

    // ═══════════════════════════════════════════════════════════════
    // DISCONNECTION
    // ═══════════════════════════════════════════════════════════════

    socket.on('disconnect', () => {
      console.log(`[WebSocket] ${userRole} ${userId} disconnected: ${socket.id}`);

      // Clean up
      userSockets.delete(userId);

      if (userRole === 'admin') {
        adminSockets.delete(socket.id);
      } else if (userRole === 'driver') {
        driverSockets.delete(userId);
      } else if (userRole === 'customer') {
        customerSockets.delete(userId);
      }

      // Notify admin
      io.to('admin-room').emit('user-disconnected', { userId, role: userRole });
    });

    // ═══════════════════════════════════════════════════════════════
    // ERROR HANDLER
    // ═══════════════════════════════════════════════════════════════

    socket.on('error', (error) => {
      console.error(`[WebSocket Error] ${userId}:`, error);
    });
  });

  return io;
}

/**
 * Helper functions to emit events from backend
 */
const WebSocketEmitter = {
  /**
   * Notify all admins of a booking
   */
  notifyBookingCreated: (io, booking) => {
    io.to('admin-room').emit('booking:created', booking);
  },

  /**
   * Notify customer of driver location update
   */
  notifyDriverLocation: (io, driverId, customerId, location) => {
    io.to(`customer-${customerId}`).emit('driver:location-updated', {
      driverId,
      ...location,
      timestamp: Date.now(),
    });
  },

  /**
   * Notify driver of new assignment
   */
  notifyDriverAssignment: (io, driverId, booking) => {
    io.to(`driver-${driverId}`).emit('assignment:notify', {
      bookingId: booking.id,
      customerId: booking.userId,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      fare: booking.fare,
      priority: booking.priority,
      timestamp: Date.now(),
    });
  },

  /**
   * Broadcast admin changes to all apps
   */
  broadcastAdminUpdate: (io, type, data) => {
    io.emit(`admin:${type}`, {
      ...data,
      updatedAt: Date.now(),
    });
  },

  /**
   * Get stats about active connections
   */
  getStats: () => ({
    totalConnected: userSockets.size,
    admins: adminSockets.size,
    drivers: driverSockets.size,
    customers: customerSockets.size,
    timestamp: Date.now(),
  }),
};

module.exports = {
  initializeWebSocket,
  WebSocketEmitter,
  getConnectedUsers: () => userSockets,
  getAdminSockets: () => adminSockets,
  getDriverSockets: () => driverSockets,
  getCustomerSockets: () => customerSockets,
};
