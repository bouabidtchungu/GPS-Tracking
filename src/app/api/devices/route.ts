import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';
import { calculateLocationData, isValidCoordinates } from '@/lib/location';

/**
 * GET /api/devices
 *
 * Get all devices for the authenticated user
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.statusCode || 401 }
    );
  }

  const { user } = authResult;

  try {
    const devices = await db.device.findMany({
      where: {
        userId: user.role === 'ADMIN' ? undefined : user.id,
      },
      include: {
        _count: {
          select: {
            locations: true,
            captures: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(
      {
        devices,
        count: devices.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices
 *
 * Register a new GPS device
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
    const { name, deviceId } = body;

    // Validate required fields
    if (!name || !deviceId) {
      return NextResponse.json(
        { error: 'Name and deviceId are required' },
        { status: 400 }
      );
    }

    // Check if deviceId is unique
    const existingDevice = await db.device.findUnique({
      where: { deviceId },
    });

    if (existingDevice) {
      return NextResponse.json(
        { error: 'Device with this ID already exists' },
        { status: 409 }
      );
    }

    // Create the device
    const device = await db.device.create({
      data: {
        name,
        deviceId,
        userId: user.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            locations: true,
            captures: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Device registered successfully',
        device,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      { error: 'Failed to create device' },
      { status: 500 }
    );
  }
}
