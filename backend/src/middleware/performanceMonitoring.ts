/**
 * Performance Monitoring Middleware
 * Tracks request performance and records metrics
 * 
 * Task 37.5: Set up monitoring and alerting
 */

import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/MonitoringService.js';

/**
 * Performance monitoring middleware
 * Records response time and status for each request
 */
export function performanceMonitoring(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Capture response finish event
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    
    // Record metric
    monitoringService.recordMetric({
      endpoint: req.path,
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      timestamp: new Date(),
      userId: (req as any).user?.userId
    });
  });
  
  next();
}
