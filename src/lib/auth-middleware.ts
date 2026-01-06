/**
 * Authentication Middleware Utilities
 *
 * Provides helper functions for authentication in API routes
 */

import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  statusCode?: number;
}

/**
 * Extract and verify JWT token from request
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Authorization token required',
        statusCode: 401,
      };
    }

    const token = authHeader.substring(7);

    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        statusCode: 404,
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: 'Account is deactivated',
        statusCode: 403,
      };
    }

    return {
      success: true,
      user: user as AuthUser,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401,
    };
  }
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(
  user: AuthUser,
  requiredRole: 'ADMIN' | 'USER'
): boolean {
  if (requiredRole === 'ADMIN') {
    return user.role === 'ADMIN';
  }
  return true; // USER role is the minimum
}

/**
 * Verify user owns a resource
 */
export async function verifyResourceOwnership(
  userId: string,
  deviceId: string
): Promise<boolean> {
  const device = await db.device.findUnique({
    where: { id: deviceId },
  });

  return device?.userId === userId;
}
