/**
 * XSS (Cross-Site Scripting) Prevention Middleware
 * 
 * Provides comprehensive XSS detection and sanitization.
 * Implements defense in depth against various XSS attack vectors.
 * 
 * REQ-11.4: System SHALL validate all inputs (max length, SQL injection, XSS)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Get fresh XSS patterns to avoid global flag state issues
 * Detects common XSS attack vectors
 */
function getXSSPatterns(): RegExp[] {
  return [
    // Script tags
    /<script[^>]*>.*?<\/script>/i,
    /<script[^>]*>/i,
    
    // Iframe injection
    /<iframe[^>]*>.*?<\/iframe>/i,
    /<iframe[^>]*>/i,
    
    // Object and embed tags
    /<object[^>]*>.*?<\/object>/i,
    /<embed[^>]*>/i,
    /<applet[^>]*>/i,
    
    // Event handlers
    /on\w+\s*=\s*["']?[^"'>]*["']?/i,
    
    // JavaScript protocol
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    
    // Meta refresh
    /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/i,
    
    // Link tags with javascript
    /<link[^>]*href\s*=\s*["']?javascript:/i,
    
    // Style tags with expressions
    /<style[^>]*>.*?expression\s*\(/i,
    /style\s*=\s*["'][^"']*expression\s*\(/i,
    
    // Import statements
    /@import/i,
    
    // Base64 encoded scripts
    /data:text\/javascript/i,
    
    // SVG with script
    /<svg[^>]*>.*?<script/i,
    
    // Form with javascript action
    /<form[^>]*action\s*=\s*["']?javascript:/i,
  ];
}

/**
 * HTML entities that need to be escaped
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Detect XSS attempts in a value
 */
export function detectXSS(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Get fresh patterns to avoid global flag state issues
  const patterns = getXSSPatterns();
  
  // Check against all patterns
  return patterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize a string by escaping HTML entities
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Escape HTML entities
  sanitized = sanitized.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char] || char);
  
  return sanitized;
}

/**
 * Aggressively sanitize by removing all HTML tags
 */
export function stripHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove all HTML tags
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Recursively scan an object for XSS attempts
 */
function scanObjectForXSS(
  obj: any,
  path: string = '',
  sanitize: boolean = false
): { detected: boolean; field?: string; value?: string; sanitized?: any } {
  if (obj === null || obj === undefined) {
    return { detected: false, sanitized: obj };
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    const sanitizedArray: any[] = [];
    for (let i = 0; i < obj.length; i++) {
      const result = scanObjectForXSS(obj[i], `${path}[${i}]`, sanitize);
      if (result.detected && !sanitize) {
        return result;
      }
      sanitizedArray.push(result.sanitized);
    }
    return { detected: false, sanitized: sanitizedArray };
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const result = scanObjectForXSS(value, fieldPath, sanitize);
      if (result.detected && !sanitize) {
        return result;
      }
      sanitizedObj[key] = result.sanitized;
    }
    return { detected: false, sanitized: sanitizedObj };
  }
  
  // Handle primitive values
  if (typeof obj === 'string') {
    if (detectXSS(obj)) {
      if (sanitize) {
        return {
          detected: true,
          field: path,
          value: obj,
          sanitized: sanitizeHTML(obj)
        };
      } else {
        return {
          detected: true,
          field: path,
          value: obj
        };
      }
    }
  }
  
  return { detected: false, sanitized: obj };
}

/**
 * Middleware: Scan request body for XSS attempts (blocking mode)
 */
export function preventXSSBody() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
    
    const result = scanObjectForXSS(req.body, 'body', false);
    
    if (result.detected) {
      logger.warn('XSS attempt detected in request body', {
        ip: req.ip,
        path: req.path,
        field: result.field,
        value: result.value,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        field: result.field
      });
    }
    
    next();
  };
}

/**
 * Middleware: Scan request params for XSS attempts (blocking mode)
 */
export function preventXSSParams() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.params || Object.keys(req.params).length === 0) {
      return next();
    }
    
    const result = scanObjectForXSS(req.params, 'params', false);
    
    if (result.detected) {
      logger.warn('XSS attempt detected in request params', {
        ip: req.ip,
        path: req.path,
        field: result.field,
        value: result.value,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        field: result.field
      });
    }
    
    next();
  };
}

/**
 * Middleware: Scan request query for XSS attempts (blocking mode)
 */
export function preventXSSQuery() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.query || Object.keys(req.query).length === 0) {
      return next();
    }
    
    const result = scanObjectForXSS(req.query, 'query', false);
    
    if (result.detected) {
      logger.warn('XSS attempt detected in request query', {
        ip: req.ip,
        path: req.path,
        field: result.field,
        value: result.value,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        field: result.field
      });
    }
    
    next();
  };
}

/**
 * Middleware: Sanitize request body (non-blocking mode)
 * Automatically sanitizes XSS attempts instead of blocking
 */
export function sanitizeXSSBody() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
    
    const result = scanObjectForXSS(req.body, 'body', true);
    
    // Always use the sanitized version (even if no XSS detected, it returns the original)
    req.body = result.sanitized;
    
    if (result.detected) {
      logger.info('XSS content sanitized in request body', {
        ip: req.ip,
        path: req.path,
        field: result.field
      });
    }
    
    next();
  };
}

/**
 * Combined middleware: Scan all request inputs for XSS (blocking mode)
 */
export function preventXSS() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Scan body
    const bodyResult = scanObjectForXSS(req.body, 'body', false);
    if (bodyResult.detected) {
      logger.warn('XSS attempt detected in request body', {
        ip: req.ip,
        path: req.path,
        field: bodyResult.field,
        value: bodyResult.value,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        field: bodyResult.field
      });
    }
    
    // Scan params
    const paramsResult = scanObjectForXSS(req.params, 'params', false);
    if (paramsResult.detected) {
      logger.warn('XSS attempt detected in request params', {
        ip: req.ip,
        path: req.path,
        field: paramsResult.field,
        value: paramsResult.value,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        field: paramsResult.field
      });
    }
    
    // Scan query
    const queryResult = scanObjectForXSS(req.query, 'query', false);
    if (queryResult.detected) {
      logger.warn('XSS attempt detected in request query', {
        ip: req.ip,
        path: req.path,
        field: queryResult.field,
        value: queryResult.value,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        field: queryResult.field
      });
    }
    
    next();
  };
}

/**
 * Set security headers to prevent XSS
 */
export function setXSSHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // X-XSS-Protection header (legacy browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Content-Type-Options header (prevent MIME sniffing)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Content Security Policy (CSP)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
    );
    
    next();
  };
}

export default preventXSS;
