/**
 * Modern CSRF Protection Middleware
 * Double Submit Cookie pattern - no session required
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Set CSRF token in cookie
 */
export function setCSRFCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Frontend needs to read it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  });
}

/**
 * CSRF Protection Middleware
 * Validates CSRF token for state-changing operations (POST, PUT, DELETE, PATCH)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): Response | void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints with Bearer token (already authenticated)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Get token from header
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;
  
  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  // Both must exist and match (Double Submit Cookie pattern)
  if (!headerToken || !cookieToken) {
    logger.warn('CSRF validation failed: Missing token', {
      method: req.method,
      path: req.path,
      hasHeaderToken: !!headerToken,
      hasCookieToken: !!cookieToken
    });
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing'
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))) {
    logger.warn('CSRF validation failed: Token mismatch', {
      method: req.method,
      path: req.path
    });
    return res.status(403).json({
      success: false,
      error: 'CSRF token invalid'
    });
  }

  next();
}

/**
 * Generate and send CSRF token endpoint
 */
export function csrfTokenEndpoint(req: Request, res: Response): void {
  const token = generateCSRFToken();
  setCSRFCookie(res, token);
  res.json({ csrfToken: token });
}

/**
 * Middleware: Auto-generate CSRF token if not present
 */
export function ensureCSRFToken(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = generateCSRFToken();
    setCSRFCookie(res, token);
  }
  next();
}
