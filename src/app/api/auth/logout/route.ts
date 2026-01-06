import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

/**
 * POST /api/auth/logout
 *
 * Logout user and invalidate session
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      // Verify token and get user ID
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userId = payload.userId as string;

      // Delete session from database
      await db.session.deleteMany({
        where: {
          userId,
          token,
        },
      });

      return NextResponse.json(
        { message: 'Logout successful' },
        { status: 200 }
      );
    } catch (error) {
      // Token is invalid, but we can still return success
      return NextResponse.json(
        { message: 'Logout successful' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
