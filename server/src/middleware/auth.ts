import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  userId?: string; // For backwards compatibility
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  logger.debug('🔍 Auth check - Header:', authHeader);
  logger.debug('🔍 Auth check - Token:', token ? 'Present' : 'Missing');

  if (!token) {
    logger.debug('❌ Auth failed: No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      logger.debug('❌ Auth failed: Invalid token', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    logger.debug('✅ Auth success - User:', decoded.userId);
    req.user = decoded;
    (req as any).userId = decoded.userId; // Admin middleware için
    next();
  });
}

// Optional auth - doesn't require token but attaches user if present
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  logger.debug('🔍 Optional auth - Token:', token ? 'Present' : 'Missing');

  if (!token) {
    logger.debug('ℹ️  No token - continuing as guest');
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      logger.debug('⚠️  Invalid token - continuing as guest:', err.message);
      return next(); // Continue without user
    }
    logger.debug('✅ Optional auth success - User:', decoded.userId);
    req.user = decoded;
    (req as any).userId = decoded.userId;
    next();
  });
}