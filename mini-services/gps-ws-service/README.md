# GPS WebSocket Service

Real-time WebSocket service for GPS tracking platform using Socket.io.

## Overview

This service provides real-time communication for:
- Device registration and tracking
- Live location updates
- Multi-client synchronization

## Configuration

- **Port**: 3003
- **Protocol**: WebSocket + HTTP polling fallback
- **Authentication**: JWT tokens

## Installation

```bash
bun install
```

## Running

Development mode (with hot reload):
```bash
bun run dev
```

Production mode:
```bash
bun run start
```

## Events

### Client → Server

#### `authenticate`
Authenticate socket connection with JWT token.

```javascript
socket.emit('authenticate', { token: 'jwt-token' }, callback);
```

#### `device:register`
Register a device to track.

```javascript
socket.emit('device:register', { deviceId: 'device-id' }, callback);
```

#### `location:update`
Send location update for a device.

```javascript
socket.emit('location:update', {
  deviceId: 'device-id',
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    speedKmh: 25.5,
    heading: 90,
    motionState: 'DRIVING'
  }
});
```

#### `device:unregister`
Unregister a device from tracking.

```javascript
socket.emit('device:unregister', { deviceId: 'device-id' }, callback);
```

### Server → Client

#### `authenticated`
Sent when authentication is successful.

```javascript
socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.user);
});
```

#### `location:update`
Broadcast when a device's location is updated.

```javascript
socket.on('location:update', (data) => {
  console.log('Device location updated:', data);
});
```

#### `error`
Sent when an error occurs.

```javascript
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});
```

## Rooms

- `user:{userId}` - All sockets for a specific user
- `device:{deviceId}` - All sockets tracking a specific device

## Authentication

JWT tokens are verified on connection. Tokens must include:
- `userId` - User ID
- `email` - User email
- `exp` - Expiration timestamp

## Environment Variables

```env
JWT_SECRET=your-secret-key
```

## Gateway Integration

This service uses the project's gateway for routing. Connect from frontend using:

```javascript
import { io } from 'socket.io-client';

const socket = io('/?XTransformPort=3003');
```
