import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * GET /api/devices/[id]/locations
 *
 * Get location history for a device
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (page < 1 || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

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

    // Build where clause
    const where: any = { deviceId: id };

    if (startDate) {
      where.timestamp = { ...where.timestamp, gte: new Date(startDate) };
    }

    if (endDate) {
      where.timestamp = { ...where.timestamp, lte: new Date(endDate) };
    }

    // Get total count
    const total = await db.locationHistory.count({ where });

    // Get location history with pagination
    const locations = await db.locationHistory.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json(
      {
        locations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching location history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location history' },
      { status: 500 }
    );
  }
}
