/**
 * Monitoring Service
 * Tracks application health, performance metrics, and triggers alerts
 * 
 * Task 37.5: Set up monitoring and alerting
 * REQ-13.1 through REQ-13.5: Monitoring requirements
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../config/supabase.js';
import { driver as neo4jDriver } from '../config/neo4j.js';
import { redis } from '../config/redis.js';
import { client as weaviateClient } from '../config/weaviate.js';

export interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  databases: {
    supabase: DatabaseHealth;
    neo4j: DatabaseHealth;
    redis: DatabaseHealth;
    weaviate: DatabaseHealth;
  };
  performance: {
    avgResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
  alerts: Alert[];
}

export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'degraded';
  latency: number; // milliseconds
  lastCheck: string;
  error?: string;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
}

/**
 * Monitoring Service Class
 */
class MonitoringService {
  private performanceMetrics: PerformanceMetric[] = [];
  private alerts: Alert[] = [];
  private alertCallbacks: ((alert: Alert) => void)[] = [];
  private metricsRetentionMinutes = 60; // Keep 1 hour of metrics
  
  constructor() {
    // Clean up old metrics every 5 minutes
    setInterval(() => this.cleanupOldMetrics(), 5 * 60 * 1000);
    
    // Check health every 30 seconds
    setInterval(() => this.performHealthCheck(), 30 * 1000);
  }
  
  /**
   * Record performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);
    
    // Check for performance issues
    if (metric.responseTime > 5000) {
      this.createAlert({
        severity: 'warning',
        type: 'slow_response',
        message: `Slow response detected: ${metric.endpoint} took ${metric.responseTime}ms`
      });
    }
    
    if (metric.statusCode >= 500) {
      this.createAlert({
        severity: 'critical',
        type: 'server_error',
        message: `Server error on ${metric.endpoint}: ${metric.statusCode}`
      });
    }
  }
  
  /**
   * Get health metrics
   */
  async getHealthMetrics(): Promise<HealthMetrics> {
    const memory = process.memoryUsage();
    const memoryUsedMB = memory.heapUsed / 1024 / 1024;
    const memoryTotalMB = memory.heapTotal / 1024 / 1024;
    
    // Check database health
    const databases = {
      supabase: await this.checkSupabaseHealth(),
      neo4j: await this.checkNeo4jHealth(),
      redis: await this.checkRedisHealth(),
      weaviate: await this.checkWeaviateHealth()
    };
    
    // Calculate performance metrics
    const recentMetrics = this.getRecentMetrics(5); // Last 5 minutes
    const avgResponseTime = this.calculateAverageResponseTime(recentMetrics);
    const requestsPerMinute = recentMetrics.length / 5;
    const errorRate = this.calculateErrorRate(recentMetrics);
    
    // Determine overall status
    const status = this.determineOverallStatus(databases, errorRate, avgResponseTime);
    
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: memoryUsedMB,
        total: memoryTotalMB,
        percentage: (memoryUsedMB / memoryTotalMB) * 100
      },
      databases,
      performance: {
        avgResponseTime,
        requestsPerMinute,
        errorRate
      },
      alerts: this.getActiveAlerts()
    };
  }
  
  /**
   * Check Supabase health
   */
  private async checkSupabaseHealth(): Promise<DatabaseHealth> {
    const start = Date.now();
    try {
      const { error } = await supabase.from('students').select('id').limit(1);
      const latency = Date.now() - start;
      
      if (error) {
        return {
          status: 'degraded',
          latency,
          lastCheck: new Date().toISOString(),
          error: error.message
        };
      }
      
      return {
        status: 'connected',
        latency,
        lastCheck: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'disconnected',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Check Neo4j health
   */
  private async checkNeo4jHealth(): Promise<DatabaseHealth> {
    const start = Date.now();
    try {
      const session = neo4jDriver.session();
      await session.run('RETURN 1');
      await session.close();
      const latency = Date.now() - start;
      
      return {
        status: 'connected',
        latency,
        lastCheck: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'disconnected',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Check Redis health
   */
  private async checkRedisHealth(): Promise<DatabaseHealth> {
    const start = Date.now();
    try {
      await redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'connected',
        latency,
        lastCheck: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'disconnected',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Check Weaviate health
   */
  private async checkWeaviateHealth(): Promise<DatabaseHealth> {
    const start = Date.now();
    try {
      await weaviateClient.misc.liveChecker().do();
      const latency = Date.now() - start;
      
      return {
        status: 'connected',
        latency,
        lastCheck: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'disconnected',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Get recent metrics
   */
  private getRecentMetrics(minutes: number): PerformanceMetric[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.performanceMetrics.filter(m => m.timestamp >= cutoff);
  }
  
  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.responseTime, 0);
    return sum / metrics.length;
  }
  
  /**
   * Calculate error rate
   */
  private calculateErrorRate(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const errors = metrics.filter(m => m.statusCode >= 400).length;
    return (errors / metrics.length) * 100;
  }
  
  /**
   * Determine overall status
   */
  private determineOverallStatus(
    databases: Record<string, DatabaseHealth>,
    errorRate: number,
    avgResponseTime: number
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Check if any database is disconnected
    const hasDisconnectedDB = Object.values(databases).some(db => db.status === 'disconnected');
    if (hasDisconnectedDB) {
      return 'unhealthy';
    }
    
    // Check if error rate is high
    if (errorRate > 10) {
      return 'unhealthy';
    }
    
    // Check if response time is slow
    if (avgResponseTime > 2000) {
      return 'degraded';
    }
    
    // Check if any database is degraded
    const hasDegradedDB = Object.values(databases).some(db => db.status === 'degraded');
    if (hasDegradedDB || errorRate > 5) {
      return 'degraded';
    }
    
    return 'healthy';
  }
  
  /**
   * Create alert
   */
  private createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alert,
      timestamp: new Date().toISOString(),
      resolved: false
    };
    
    this.alerts.push(newAlert);
    
    // Log alert
    logger.warn(`Alert created: ${alert.type}`, { alert: newAlert });
    
    // Notify callbacks
    this.alertCallbacks.forEach(callback => callback(newAlert));
    
    // Auto-resolve info alerts after 5 minutes
    if (alert.severity === 'info') {
      setTimeout(() => this.resolveAlert(newAlert.id), 5 * 60 * 1000);
    }
  }
  
  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info(`Alert resolved: ${alert.type}`, { alertId });
    }
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }
  
  /**
   * Register alert callback
   */
  onAlert(callback: (alert: Alert) => void): void {
    this.alertCallbacks.push(callback);
  }
  
  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.metricsRetentionMinutes * 60 * 1000);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoff);
    
    // Clean up resolved alerts older than 24 hours
    const alertCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => 
      !a.resolved || new Date(a.timestamp) >= alertCutoff
    );
  }
  
  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const metrics = await this.getHealthMetrics();
      
      // Check for critical issues
      if (metrics.status === 'unhealthy') {
        this.createAlert({
          severity: 'critical',
          type: 'system_unhealthy',
          message: 'System health is unhealthy - immediate attention required'
        });
      }
      
      // Check memory usage
      if (metrics.memory.percentage > 90) {
        this.createAlert({
          severity: 'critical',
          type: 'high_memory',
          message: `Memory usage is ${metrics.memory.percentage.toFixed(1)}%`
        });
      } else if (metrics.memory.percentage > 80) {
        this.createAlert({
          severity: 'warning',
          type: 'high_memory',
          message: `Memory usage is ${metrics.memory.percentage.toFixed(1)}%`
        });
      }
      
      // Check error rate
      if (metrics.performance.errorRate > 10) {
        this.createAlert({
          severity: 'critical',
          type: 'high_error_rate',
          message: `Error rate is ${metrics.performance.errorRate.toFixed(1)}%`
        });
      } else if (metrics.performance.errorRate > 5) {
        this.createAlert({
          severity: 'warning',
          type: 'high_error_rate',
          message: `Error rate is ${metrics.performance.errorRate.toFixed(1)}%`
        });
      }
      
      // Check database health
      Object.entries(metrics.databases).forEach(([name, db]) => {
        if (db.status === 'disconnected') {
          this.createAlert({
            severity: 'critical',
            type: 'database_disconnected',
            message: `${name} database is disconnected: ${db.error || 'Unknown error'}`
          });
        } else if (db.status === 'degraded') {
          this.createAlert({
            severity: 'warning',
            type: 'database_degraded',
            message: `${name} database is degraded: ${db.error || 'Unknown error'}`
          });
        }
      });
      
    } catch (error: any) {
      logger.error('Health check failed', error);
    }
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(minutes: number = 60): {
    totalRequests: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    requestsByEndpoint: Record<string, number>;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
  } {
    const metrics = this.getRecentMetrics(minutes);
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        requestsByEndpoint: {},
        slowestEndpoints: []
      };
    }
    
    // Sort by response time for percentile calculations
    const sortedTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);
    
    // Count requests by endpoint
    const requestsByEndpoint: Record<string, number> = {};
    const timesByEndpoint: Record<string, number[]> = {};
    
    metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      requestsByEndpoint[key] = (requestsByEndpoint[key] || 0) + 1;
      
      if (!timesByEndpoint[key]) {
        timesByEndpoint[key] = [];
      }
      timesByEndpoint[key].push(m.responseTime);
    });
    
    // Calculate slowest endpoints
    const slowestEndpoints = Object.entries(timesByEndpoint)
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: times.reduce((sum, t) => sum + t, 0) / times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
    
    return {
      totalRequests: metrics.length,
      avgResponseTime: this.calculateAverageResponseTime(metrics),
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      errorRate: this.calculateErrorRate(metrics),
      requestsByEndpoint,
      slowestEndpoints
    };
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
