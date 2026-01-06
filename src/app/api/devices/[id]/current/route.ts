import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * GET /api/devices/[id]/current
 *
 * Get current location of a device
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateRequest(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode || 401 }
    );
  }

  const { user } = authResult;
  const { id } = params;

  try {
    // Check if device exists and user has access
    const device = await db.device.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Check ownership (unless admin)
    if (user.role !== 'ADMIN' && device.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to access this device' },
        { status: 403 }
      );
    }

    // Get latest location
    const location = await db.location.findFirst({
      where: { deviceId: id },
      orderBy: { timestamp: 'desc' },
    });

    if (!location) {
      return NextResponse.json(
        {
          device: {
            id: device.id,
            deviceId: device.deviceId,
            name: device.name,
            lastSeen: device.lastSeen,
          },
          location: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        device: {
          id: device.id,
          deviceId: device.deviceId,
          name: device.name,
          lastSeen: device.lastSeen,
        },
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          speedKmh: location.speedKmh,
          speedMph: location.speedMph,
          heading: location.heading,
          motionState: location.motionState,
          timestamp: location.timestamp,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching current location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current location' },
      { status: 500 }
    );
  }
}
