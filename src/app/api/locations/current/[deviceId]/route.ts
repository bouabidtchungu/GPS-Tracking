import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

interface RouteContext {
  params: { deviceId: string };
}

/**
 * GET /api/locations/current/[deviceId]
 *
 * Get the current location of a device
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.statusCode }
      );
    }

    const { deviceId } = params;

    // Find device
    const device = await db.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (device.userId !== auth.user!.id && auth.user!.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get most recent location
    const location = await db.location.findFirst({
      where: { deviceId: device.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'No location data available for this device' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        location,
        device: {
          id: device.id,
          deviceId: device.deviceId,
          name: device.name,
          latitude: device.latitude,
          longitude: device.longitude,
          speedKmh: device.speedKmh,
          speedMph: device.speedMph,
          heading: device.heading,
          motionState: device.motionState,
          lastSeen: device.lastSeen,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current location error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
