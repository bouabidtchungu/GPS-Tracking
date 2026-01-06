import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { calculateLocationData, determineMotionState } from '@/lib/location';

/**
 * POST /api/locations
 *
 * Submit location update for a device
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode || 401 }
    );
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { deviceId, latitude, longitude, accuracy, altitude, speedKmh, heading, timestamp } = body;

    // Validate required fields
    if (!deviceId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'deviceId, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (!isValidCoordinates(latitude, longitude)) {
      return NextResponse.json(
        { error: 'Invalid GPS coordinates' },
        { status: 400 }
      );
    }

    // Check if device exists and user has access
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
    if (user.role !== 'ADMIN' && device.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this device' },
        { status: 403 }
      );
    }

    // Get previous location for speed/direction calculation
    const prevLocation = await db.location.findFirst({
      where: { deviceId: device.id },
      orderBy: { timestamp: 'desc' },
    });

    // Calculate speed and direction based on previous location
    let calculatedSpeedKmh = speedKmh;
    let calculatedHeading = heading;
    let motionState = determineMotionState(speedKmh || 0);

    if (prevLocation && prevLocation.latitude && prevLocation.longitude) {
      const timeElapsed = timestamp
        ? new Date(timestamp).getTime() - new Date(prevLocation.timestamp).getTime()
        : Date.now() - new Date(prevLocation.timestamp).getTime();

      if (timeElapsed > 0) {
        const calculations = calculateLocationData(
          prevLocation.latitude,
          prevLocation.longitude,
          latitude,
          longitude,
          timeElapsed
        );
        calculatedSpeedKmh = calculations.speed.kmh;
        calculatedHeading = calculations.bearing;
        motionState = calculations.motionState as any;
      }
    }

    // Convert km/h to mph
    const speedMph = calculatedSpeedKmh ? calculatedSpeedKmh * 0.621371 : null;

    const locationTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Create location record
    const location = await db.location.create({
      data: {
        deviceId: device.id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speedKmh: calculatedSpeedKmh || 0,
        speedMph,
        heading: calculatedHeading,
        motionState,
        timestamp: locationTimestamp,
      },
    });

    // Create location history record
    await db.locationHistory.create({
      data: {
        deviceId: device.id,
        latitude,
        longitude,
        accuracy,
        altitude,
        speedKmh: calculatedSpeedKmh || 0,
        speedMph,
        heading: calculatedHeading,
        motionState,
        timestamp: locationTimestamp,
      },
    });

    // Update device with latest location
    await db.device.update({
      where: { id: device.id },
      data: {
        latitude,
        longitude,
        speedKmh: calculatedSpeedKmh || 0,
        speedMph,
        heading: calculatedHeading,
        motionState,
        lastSeen: locationTimestamp,
      },
    });

    return NextResponse.json(
      {
        message: 'Location updated successfully',
        location: {
          id: location.id,
          deviceId: device.deviceId,
          latitude,
          longitude,
          speedKmh: calculatedSpeedKmh || 0,
          speedMph,
          heading: calculatedHeading,
          motionState,
          timestamp: locationTimestamp.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to validate coordinates
 */
function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
