/**
 * JWT Authentication Middleware
 * Handles token verification and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

const JWT_SECRET: string = process.env.JWT_SECRET || 'default_secret_change_in_production';

if (JWT_SECRET === 'default_secret_change_in_production') {
  console.warn('⚠️  Using default JWT secret. Set JWT_SECRET environment variable in production!');
}

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: string;
  userType: 'student' | 'teacher' | 'parent';
  classroomId?: string;
  exp: number;
}

/**
 * Extended Request interface with user data
 */
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'exp'>, expiresIn: StringValue | number = '24h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header provided' });
      return;
    }
    
    // Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization header format. Use: Bearer <token>' });
      return;
    }
    
    const token = parts[1];
    
    // Verify token
    const payload = verifyToken(token);
    
    // Attach user data to request
    req.user = payload;
    
    next();
  } catch (error: any) {
    res.status(401).json({ error: 'Authentication failed', message: error.message });
  }
}

/**
 * Optional authentication middleware
 * Attaches user data if token is present, but doesn't require it
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const payload = verifyToken(token);
        req.user = payload;
      }
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...roles: Array<'student' | 'teacher' | 'parent'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!roles.includes(req.user.userType)) {
      res.status(403).json({ 
        error: 'Forbidden', 
        message: `This endpoint requires one of these roles: ${roles.join(', ')}` 
      });
      return;
    }
    
    next();
  };
}

/**
 * Refresh token
 * Generates a new token with extended expiration
 */
export function refreshToken(req: AuthRequest, res: Response): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Generate new token with same payload
    const newToken = generateToken({
      userId: req.user.userId,
      userType: req.user.userType,
      classroomId: req.user.classroomId
    });
    
    res.json({ token: newToken });
  } catch (error: any) {
    res.status(500).json({ error: 'Token refresh failed', message: error.message });
  }
}
