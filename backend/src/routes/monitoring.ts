/**
 * Monitoring Routes
 * Provides health check and metrics endpoints
 * 
 * Task 37.5: Set up monitoring and alerting
 */

import express from 'express';
import { monitoringService } from '../services/MonitoringService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/monitoring/health
 * Comprehensive health check with all metrics
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = await monitoringService.getHealthMetrics();
    
    // Set appropriate status code based on health
    const statusCode = metrics.status === 'healthy' ? 200 : 
                      metrics.status === 'degraded' ? 503 : 503;
    
    res.status(statusCode).json(metrics);
  } catch (error: any) {
    logger.error('Health check failed', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/health/simple
 * Simple health check for load balancers
 */
router.get('/health/simple', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/monitoring/metrics
 * Performance metrics and statistics
 */
router.get('/metrics', (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const stats = monitoringService.getPerformanceStats(minutes);
    
    res.json({
      timeWindow: `${minutes} minutes`,
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get metrics', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Get active alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const alerts = monitoringService.getActiveAlerts();
    
    res.json({
      count: alerts.length,
      alerts,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get alerts', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/monitoring/alerts/:id/resolve
 * Resolve an alert
 */
router.post('/alerts/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    monitoringService.resolveAlert(id);
    
    res.json({
      success: true,
      message: `Alert ${id} resolved`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to resolve alert', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/status
 * System status summary
 */
router.get('/status', async (req, res) => {
  try {
    const metrics = await monitoringService.getHealthMetrics();
    const stats = monitoringService.getPerformanceStats(5); // Last 5 minutes
    
    res.json({
      status: metrics.status,
      uptime: metrics.uptime,
      memory: metrics.memory,
      databases: Object.entries(metrics.databases).map(([name, db]) => ({
        name,
        status: db.status,
        latency: db.latency
      })),
      performance: {
        avgResponseTime: stats.avgResponseTime,
        requestsPerMinute: stats.requestsPerMinute,
        errorRate: stats.errorRate
      },
      activeAlerts: metrics.alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get status', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export { router as monitoringRouter };
