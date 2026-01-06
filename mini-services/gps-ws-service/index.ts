/**
 * GPS Tracking WebSocket Service
 *
 * Real-time WebSocket server for GPS location updates
 * Port: 3003
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { jwtVerify } from 'jose';

// Configuration
const PORT = 3003;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// Create HTTP server
const httpServer = createServer();

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Store connected devices and their socket IDs
const connectedDevices = new Map<string, Set<string>>(); // deviceId -> Set of socketIds
const socketToUser = new Map<string, { userId: string; email: string }>(); // socketId -> user info

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Handle socket connection
 */
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Authenticate connection
  socket.on('authenticate', async (data: { token: string }, callback) => {
    const user = await verifyToken(data.token);

    if (!user) {
      socket.emit('error', { message: 'Authentication failed' });
      socket.disconnect();
      return;
    }

    // Store user info for this socket
    socketToUser.set(socket.id, user);
    console.log(`Socket ${socket.id} authenticated as user ${user.email}`);

    // Send success callback
    callback?.({ success: true, user: { userId: user.userId, email: user.email } });

    // Join user's personal room for all their devices
    socket.join(`user:${user.userId}`);

    // Emit success event
    socket.emit('authenticated', { user: { userId: user.userId, email: user.email } });
  });

  /**
   * Register a device to track
   */
  socket.on('device:register', (data: { deviceId: string }, callback) => {
    const user = socketToUser.get(socket.id);

    if (!user) {
      callback?.({ success: false, error: 'Not authenticated' });
      return;
    }

    const { deviceId } = data;

    // Join device-specific room
    socket.join(`device:${deviceId}`);

    // Track this socket for the device
    if (!connectedDevices.has(deviceId)) {
      connectedDevices.set(deviceId, new Set());
    }
    connectedDevices.get(deviceId)!.add(socket.id);

    console.log(`Device ${deviceId} registered by user ${user.email}`);

    callback?.({ success: true });
  });

  /**
   * Handle location update
   */
  socket.on('location:update', (data: {
    deviceId: string;
    location: {
      latitude: number;
      longitude: number;
      speedKmh?: number;
      heading?: number;
      motionState?: string;
      timestamp?: string;
    };
  }) => {
    const user = socketToUser.get(socket.id);

    if (!user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { deviceId, location } = data;

    console.log(`Location update for device ${deviceId}:`, location);

    // Broadcast to all users who are tracking this device
    // In a real app, this would check if the device belongs to the user
    io.to(`device:${deviceId}`).emit('location:update', {
      deviceId,
      location: {
        ...location,
        timestamp: location.timestamp || new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });
  });

  /**
   * Unregister a device
   */
  socket.on('device:unregister', (data: { deviceId: string }, callback) => {
    const user = socketToUser.get(socket.id);

    if (!user) {
      callback?.({ success: false, error: 'Not authenticated' });
      return;
    }

    const { deviceId } = data;

    // Leave device room
    socket.leave(`device:${deviceId}`);

    // Remove socket from device tracking
    const sockets = connectedDevices.get(deviceId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        connectedDevices.delete(deviceId);
      }
    }

    console.log(`Device ${deviceId} unregistered by user ${user.email}`);

    callback?.({ success: true });
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    const user = socketToUser.get(socket.id);
    console.log(`Client disconnected: ${socket.id}${user ? ` (${user.email})` : ''}`);

    // Remove socket from all devices
    for (const [deviceId, sockets] of connectedDevices.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        connectedDevices.delete(deviceId);
      }
    }

    // Clean up socket user mapping
    socketToUser.delete(socket.id);
  });

  /**
   * Handle errors
   */
  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`GPS WebSocket Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  io.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  io.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});
