/**
 * SQL Injection Prevention Middleware
 * 
 * Provides comprehensive SQL injection detection and prevention.
 * Works in conjunction with parameterized queries to provide defense in depth.
 * 
 * REQ-11.4: System SHALL validate all inputs (max length, SQL injection, XSS)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Comprehensive SQL injection patterns
 * Detects common SQL injection attack vectors
 * Note: Patterns are recreated on each call to avoid global flag state issues
 */
function getSQLInjectionPatterns(): RegExp[] {
  return [
    // SQL keywords
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST|CONVERT)\b)/i,
    
    // SQL comments
    /(--|;|\/\*|\*\/|#)/,
    
    // SQL operators and logic
    /(\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/i,
    /(\bOR\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    
    // UNION-based injection
    /(UNION\s+(ALL\s+)?SELECT)/i,
    
    // Stored procedures
    /(xp_|sp_|exec\s+sp_|execute\s+sp_)/i,
    
    // System tables
    /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS|sys\.)/i,
    
    // Hex encoding attempts
    /(0x[0-9a-f]+)/i,
    
    // Time-based blind injection
    /(WAITFOR\s+DELAY|SLEEP\s*\(|BENCHMARK\s*\()/i,
    
    // Boolean-based blind injection
    /(\'\s*OR\s*\'1\'\s*=\s*\'1|\'\s*OR\s*1\s*=\s*1)/i,
    
    // Stacked queries
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,
  ];
}

/**
 * Detect SQL injection attempts in a value
 */
export function detectSQLInjection(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Get fresh patterns to avoid global flag state issues
  const patterns = getSQLInjectionPatterns();
  
  // Check against all patterns
  return patterns.some(pattern => pattern.test(value));
}

/**
 * Recursively scan an object for SQL injection attempts
 */
function scanObjectForSQLInjection(
  obj: any,
  path: string = ''
): { detected: boolean; field?: string; value?: string } {
  if (obj === null || obj === undefined) {
    return { detected: false };
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = scanObjectForSQLInjection(obj[i], `${path}[${i}]`);
      if (result.detected) {
        return result;
      }
    }
    return { detected: false };
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const result = scanObjectForSQLInjection(value, fieldPath);
      if (result.detected) {
        return result;
      }
    }
    return { detected: false };
  }
  
  // Handle primitive values
  if (typeof obj === 'string') {
    if (detectSQLInjection(obj)) {
      return {
        detected: true,
        field: path,
        value: obj
      };
    }
  }
  
  return { detected: false };
}

/**
 * Middleware: Scan request body for SQL injection attempts
 */
export function preventSQLInjectionBody() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
    
    const result = scanObjectForSQLInjection(req.body, 'body');
    
    if (result.detected) {
      logger.warn('SQL injection attempt detected in request body', {
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
 * Middleware: Scan request params for SQL injection attempts
 */
export function preventSQLInjectionParams() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.params || Object.keys(req.params).length === 0) {
      return next();
    }
    
    const result = scanObjectForSQLInjection(req.params, 'params');
    
    if (result.detected) {
      logger.warn('SQL injection attempt detected in request params', {
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
 * Middleware: Scan request query for SQL injection attempts
 */
export function preventSQLInjectionQuery() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.query || Object.keys(req.query).length === 0) {
      return next();
    }
    
    const result = scanObjectForSQLInjection(req.query, 'query');
    
    if (result.detected) {
      logger.warn('SQL injection attempt detected in request query', {
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
 * Combined middleware: Scan all request inputs for SQL injection
 */
export function preventSQLInjection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Scan body
    const bodyResult = scanObjectForSQLInjection(req.body, 'body');
    if (bodyResult.detected) {
      logger.warn('SQL injection attempt detected in request body', {
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
    const paramsResult = scanObjectForSQLInjection(req.params, 'params');
    if (paramsResult.detected) {
      logger.warn('SQL injection attempt detected in request params', {
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
    const queryResult = scanObjectForSQLInjection(req.query, 'query');
    if (queryResult.detected) {
      logger.warn('SQL injection attempt detected in request query', {
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

export default preventSQLInjection;
