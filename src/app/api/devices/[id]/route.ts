import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * PUT /api/devices/[id]
 *
 * Update device details
 */
export async function PUT(
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
    const body = await request.json();
    const { name, isActive } = body;

    // Validate input
    if (!name && typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'At least one field (name or isActive) must be provided' },
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
        { error: 'You do not have permission to update this device' },
        { status: 403 }
      );
    }

    // Update device
    const updatedDevice = await db.device.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(typeof isActive === 'boolean' && { isActive }),
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
        message: 'Device updated successfully',
        device: updatedDevice,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/devices/[id]
 *
 * Delete a device
 */
export async function DELETE(
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
    // Check if device exists
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
        { error: 'You do not have permission to delete this device' },
        { status: 403 }
      );
    }

    // Delete device (cascades will delete related records)
    await db.device.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        message: 'Device deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}
