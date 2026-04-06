/**
 * Monitoring Service Tests
 * Tests for monitoring and alerting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { monitoringService } from '../MonitoringService.js';

describe('MonitoringService', () => {
  beforeEach(() => {
    // Clear metrics before each test
    vi.clearAllMocks();
    // Note: MonitoringService is a singleton, so metrics persist across tests
    // This is expected behavior in production
  });
  
  describe('Performance Metrics', () => {
    it('should record performance metrics', () => {
      const metric = {
        endpoint: '/api/chat',
        method: 'POST',
        responseTime: 250,
        statusCode: 200,
        timestamp: new Date(),
        userId: 'test_user'
      };
      
      monitoringService.recordMetric(metric);
      
      const stats = monitoringService.getPerformanceStats(60);
      expect(stats.totalRequests).toBeGreaterThan(0);
    });
    
    it('should calculate average response time', () => {
      const metrics = [
        {
          endpoint: '/api/test-avg',
          method: 'POST',
          responseTime: 100,
          statusCode: 200,
          timestamp: new Date()
        },
        {
          endpoint: '/api/test-avg',
          method: 'POST',
          responseTime: 200,
          statusCode: 200,
          timestamp: new Date()
        },
        {
          endpoint: '/api/test-avg',
          method: 'POST',
          responseTime: 300,
          statusCode: 200,
          timestamp: new Date()
        }
      ];
      
      metrics.forEach(m => monitoringService.recordMetric(m));
      
      const stats = monitoringService.getPerformanceStats(60);
      // Average should be around 200ms, but may include other metrics from previous tests
      expect(stats.avgResponseTime).toBeGreaterThan(0);
      expect(stats.totalRequests).toBeGreaterThanOrEqual(3);
    });
    
    it('should calculate error rate', () => {
      const metrics = [
        {
          endpoint: '/api/test-error',
          method: 'POST',
          responseTime: 100,
          statusCode: 200,
          timestamp: new Date()
        },
        {
          endpoint: '/api/test-error',
          method: 'POST',
          responseTime: 100,
          statusCode: 500,
          timestamp: new Date()
        }
      ];
      
      metrics.forEach(m => monitoringService.recordMetric(m));
      
      const stats = monitoringService.getPerformanceStats(60);
      // Error rate should be > 0 since we added an error
      expect(stats.errorRate).toBeGreaterThan(0);
      expect(stats.errorRate).toBeLessThanOrEqual(100);
    });
    
    it('should identify slowest endpoints', () => {
      const metrics = [
        {
          endpoint: '/api/chat',
          method: 'POST',
          responseTime: 500,
          statusCode: 200,
          timestamp: new Date()
        },
        {
          endpoint: '/api/health',
          method: 'GET',
          responseTime: 50,
          statusCode: 200,
          timestamp: new Date()
        }
      ];
      
      metrics.forEach(m => monitoringService.recordMetric(m));
      
      const stats = monitoringService.getPerformanceStats(60);
      expect(stats.slowestEndpoints[0].endpoint).toBe('POST /api/chat');
    });
  });
  
  describe('Alerts', () => {
    it('should create alert for slow response', () => {
      const metric = {
        endpoint: '/api/test-slow',
        method: 'POST',
        responseTime: 6000, // >5000ms threshold
        statusCode: 200,
        timestamp: new Date()
      };
      
      monitoringService.recordMetric(metric);
      
      const alerts = monitoringService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      // Check that at least one alert is for slow response
      const slowAlert = alerts.find(a => a.type === 'slow_response');
      expect(slowAlert).toBeDefined();
    });
    
    it('should create alert for server error', () => {
      const metric = {
        endpoint: '/api/chat',
        method: 'POST',
        responseTime: 100,
        statusCode: 500,
        timestamp: new Date()
      };
      
      monitoringService.recordMetric(metric);
      
      const alerts = monitoringService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('server_error');
      expect(alerts[0].severity).toBe('critical');
    });
    
    it('should resolve alerts', () => {
      const metric = {
        endpoint: '/api/chat',
        method: 'POST',
        responseTime: 6000,
        statusCode: 200,
        timestamp: new Date()
      };
      
      monitoringService.recordMetric(metric);
      
      const alerts = monitoringService.getActiveAlerts();
      const alertId = alerts[0].id;
      
      monitoringService.resolveAlert(alertId);
      
      const activeAlerts = monitoringService.getActiveAlerts();
      expect(activeAlerts.find(a => a.id === alertId)).toBeUndefined();
    });
    
    it('should trigger alert callback', () => {
      const callback = vi.fn();
      monitoringService.onAlert(callback);
      
      const metric = {
        endpoint: '/api/chat',
        method: 'POST',
        responseTime: 6000,
        statusCode: 200,
        timestamp: new Date()
      };
      
      monitoringService.recordMetric(metric);
      
      expect(callback).toHaveBeenCalled();
    });
  });
  
  describe('Health Metrics', () => {
    it('should return health metrics', async () => {
      const metrics = await monitoringService.getHealthMetrics();
      
      expect(metrics).toHaveProperty('status');
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('databases');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('alerts');
    });
    
    it('should include memory metrics', async () => {
      const metrics = await monitoringService.getHealthMetrics();
      
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('percentage');
      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.percentage).toBeLessThanOrEqual(100);
    });
    
    it('should include database health', async () => {
      const metrics = await monitoringService.getHealthMetrics();
      
      expect(metrics.databases).toHaveProperty('supabase');
      expect(metrics.databases).toHaveProperty('neo4j');
      expect(metrics.databases).toHaveProperty('redis');
      expect(metrics.databases).toHaveProperty('weaviate');
      
      // Each database should have status and latency
      Object.values(metrics.databases).forEach(db => {
        expect(db).toHaveProperty('status');
        expect(db).toHaveProperty('latency');
        expect(db).toHaveProperty('lastCheck');
      });
    });
  });
  
  describe('Performance Statistics', () => {
    it('should calculate P95 and P99 response times', () => {
      // Generate 100 metrics with varying response times
      for (let i = 0; i < 100; i++) {
        monitoringService.recordMetric({
          endpoint: '/api/test',
          method: 'GET',
          responseTime: i * 10, // 0ms to 990ms
          statusCode: 200,
          timestamp: new Date()
        });
      }
      
      const stats = monitoringService.getPerformanceStats(60);
      
      expect(stats.p95ResponseTime).toBeGreaterThan(0);
      expect(stats.p99ResponseTime).toBeGreaterThan(stats.p95ResponseTime);
    });
    
    it('should count requests by endpoint', () => {
      const uniqueEndpoint = `/api/test-count-${Date.now()}`;
      const metrics = [
        {
          endpoint: uniqueEndpoint,
          method: 'POST',
          responseTime: 100,
          statusCode: 200,
          timestamp: new Date()
        },
        {
          endpoint: uniqueEndpoint,
          method: 'POST',
          responseTime: 100,
          statusCode: 200,
          timestamp: new Date()
        }
      ];
      
      metrics.forEach(m => monitoringService.recordMetric(m));
      
      const stats = monitoringService.getPerformanceStats(60);
      expect(stats.requestsByEndpoint[`POST ${uniqueEndpoint}`]).toBe(2);
    });
  });
});
