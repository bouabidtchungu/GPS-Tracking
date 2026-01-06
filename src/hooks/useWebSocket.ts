/**
 * useWebSocket Hook
 *
 * Custom React hook for managing WebSocket connections
 * using Socket.io client
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LocationData {
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  motionState?: string;
  timestamp?: string;
}

export interface LocationUpdate {
  deviceId: string;
  location: LocationData;
  updatedAt: string;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  authenticate: (token: string) => Promise<boolean>;
  registerDevice: (deviceId: string) => Promise<boolean>;
  unregisterDevice: (deviceId: string) => Promise<boolean>;
  sendLocationUpdate: (deviceId: string, location: LocationData) => void;
  onLocationUpdate: (callback: (data: LocationUpdate) => void) => void;
  onError: (callback: (error: string) => void) => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const locationUpdateCallbackRef = useRef<((data: LocationUpdate) => void) | null>(null);
  const errorCallbackRef = useRef<((error: string) => void) | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    const socket = io('/?XTransformPort=3003', {
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError('Connection failed');
    });

    // Authentication event
    socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
      setIsAuthenticated(true);
      setError(null);
    });

    // Location update event
    socket.on('location:update', (data: LocationUpdate) => {
      if (locationUpdateCallbackRef.current) {
        locationUpdateCallbackRef.current(data);
      }
    });

    // Error event
    socket.on('error', (data: { message: string }) => {
      console.error('WebSocket error:', data.message);
      if (errorCallbackRef.current) {
        errorCallbackRef.current(data.message);
      }
      setError(data.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, reconnectionAttempts, reconnectionDelay]);

  /**
   * Authenticate with JWT token
   */
  const authenticate = useCallback(async (token: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current || !isConnected) {
        setError('Not connected to server');
        resolve(false);
        return;
      }

      socketRef.current.emit('authenticate', { token }, (response: { success: boolean; user?: any; error?: string }) => {
        if (response.success) {
          setIsAuthenticated(true);
          setError(null);
          resolve(true);
        } else {
          setError(response.error || 'Authentication failed');
          resolve(false);
        }
      });
    });
  }, [isConnected]);

  /**
   * Register a device for tracking
   */
  const registerDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current || !isAuthenticated) {
        setError('Not authenticated');
        resolve(false);
        return;
      }

      socketRef.current.emit('device:register', { deviceId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve(true);
        } else {
          setError(response.error || 'Device registration failed');
          resolve(false);
        }
      });
    });
  }, [isAuthenticated]);

  /**
   * Unregister a device
   */
  const unregisterDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current || !isAuthenticated) {
        setError('Not authenticated');
        resolve(false);
        return;
      }

      socketRef.current.emit('device:unregister', { deviceId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve(true);
        } else {
          setError(response.error || 'Device unregistration failed');
          resolve(false);
        }
      });
    });
  }, [isAuthenticated]);

  /**
   * Send location update for a device
   */
  const sendLocationUpdate = useCallback((deviceId: string, location: LocationData) => {
    if (!socketRef.current || !isAuthenticated) {
      setError('Not authenticated');
      return;
    }

    socketRef.current.emit('location:update', {
      deviceId,
      location: {
        ...location,
        timestamp: location.timestamp || new Date().toISOString(),
      },
    });
  }, [isAuthenticated]);

  /**
   * Register callback for location updates
   */
  const onLocationUpdate = useCallback((callback: (data: LocationUpdate) => void) => {
    locationUpdateCallbackRef.current = callback;
  }, []);

  /**
   * Register callback for errors
   */
  const onError = useCallback((callback: (error: string) => void) => {
    errorCallbackRef.current = callback;
  }, []);

  /**
   * Disconnect socket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isAuthenticated,
    error,
    authenticate,
    registerDevice,
    unregisterDevice,
    sendLocationUpdate,
    onLocationUpdate,
    onError,
    disconnect,
  };
}
