import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { calculateLocationData, isValidCoordinates } from '@/lib/location';

/**
 * POST /api/locations/batch
 *
 * Submit multiple location updates at once
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.statusCode }
      );
    }

    const body = await request.json();
    const { updates } = body;

    // Validate required fields
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'updates array is required' },
        { status: 400 }
      );
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'updates array cannot be empty' },
        { status: 400 }
      );
    }

    if (updates.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 updates per batch' },
        { status: 400 }
      );
    }

    // Process each update
    const results = [];
    const errors = [];

    for (const update of updates) {
      const {
        deviceId,
        latitude,
        longitude,
        accuracy,
        altitude,
        timestamp,
      } = update;

      // Validate required fields
      if (!deviceId || latitude === undefined || longitude === undefined) {
        errors.push({
          error: 'deviceId, latitude, and longitude are required',
          update,
        });
        continue;
      }

      // Validate coordinates
      if (!isValidCoordinates(latitude, longitude)) {
        errors.push({
          error: 'Invalid coordinates',
          update,
        });
        continue;
      }

      try {
        // Find device
        const device = await db.device.findUnique({
          where: { deviceId },
        });

        if (!device) {
          errors.push({
            error: 'Device not found',
            deviceId,
          });
          continue;
        }

        // Check ownership
        if (device.userId !== auth.user!.id && auth.user!.role !== 'ADMIN') {
          errors.push({
            error: 'Access denied',
            deviceId,
          });
          continue;
        }

        // Check if device is active
        if (!device.isActive) {
          errors.push({
            error: 'Device is not active',
            deviceId,
          });
          continue;
        }

        // Calculate location data
        const now = timestamp ? new Date(timestamp) : new Date();
        const timeElapsed = device.lastSeen
          ? now.getTime() - device.lastSeen.getTime()
          : null;

        const locationData = calculateLocationData(
          device.latitude,
          device.longitude,
          latitude,
          longitude,
          timeElapsed
        );

        // Create location record
        const location = await db.location.create({
          data: {
            deviceId: device.id,
            latitude,
            longitude,
            accuracy,
            altitude,
            speedKmh: locationData.speed.kmh > 0 ? locationData.speed.kmh : null,
            speedMph: locationData.speed.mph > 0 ? locationData.speed.mph : null,
            heading: locationData.bearing,
            motionState: locationData.motionState as any,
            timestamp: now,
          },
        });

        // Update device with latest location
        const updatedDevice = await db.device.update({
          where: { id: device.id },
          data: {
            latitude,
            longitude,
            speedKmh: locationData.speed.kmh > 0 ? locationData.speed.kmh : null,
            speedMph: locationData.speed.mph > 0 ? locationData.speed.mph : null,
            heading: locationData.bearing,
            motionState: locationData.motionState as any,
            lastSeen: now,
          },
        });

        results.push({
          success: true,
          deviceId,
          location,
          device: updatedDevice,
        });
      } catch (error) {
        console.error('Error processing location update:', error);
        errors.push({
          error: 'Internal server error',
          deviceId,
        });
      }
    }

    return NextResponse.json(
      {
        message: `Processed ${results.length} updates successfully`,
        results,
        errors,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Batch location update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
