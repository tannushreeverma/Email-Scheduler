import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';
import type { JwtPayload } from '../types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        avatar?: string | null;
      };
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts the token from Authorization header or cookies.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fall back to cookie
    if (!token && req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatar: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

/**
 * Generate a JWT for a user.
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email } as JwtPayload, env.jwtSecret, {
    expiresIn: '7d',
  });
}
