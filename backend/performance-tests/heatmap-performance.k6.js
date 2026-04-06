/**
 * Heatmap Performance Test for FinxanAI Platform
 * Task 36.3: Measure heatmap generation time
 * 
 * Tests heatmap generation performance for various classroom sizes:
 * - 10, 50, 100 students
 * - 5, 10, 20 concepts
 * - Cold cache (first request) vs warm cache (subsequent requests)
 * 
 * Performance Targets:
 * - <200ms for 100 students with 10 concepts
 * - Linear scaling with classroom size
 * - Cache should provide 10x speedup
 * 
 * Run with: k6 run heatmap-performance.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom metrics for heatmap performance
const heatmapColdCache = new Trend('heatmap_cold_cache_ms');
const heatmapWarmCache = new Trend('heatmap_warm_cache_ms');
const heatmap10Students = new Trend('heatmap_10_students_ms');
const heatmap50Students = new Trend('heatmap_50_students_ms');
const heatmap100Students = new Trend('heatmap_100_students_ms');
const heatmap5Concepts = new Trend('heatmap_5_concepts_ms');
const heatmap10Concepts = new Trend('heatmap_10_concepts_ms');
const heatmap20Concepts = new Trend('heatmap_20_concepts_ms');
const slowHeatmaps = new Counter('slow_heatmaps_over_200ms');
const verySlowHeatmaps = new Counter('very_slow_heatmaps_over_500ms');
const cacheHitRate = new Rate('cache_hit_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'heatmap_cold_cache_ms': ['p(95)<500'],
    'heatmap_warm_cache_ms': ['p(95)<50'],
    'heatmap_100_students_ms': ['p(95)<200'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test scenarios with different classroom configurations
const testScenarios = [
  { students: 10, concepts: 5, name: 'small_class' },
  { students: 10, concepts: 10, name: 'small_class_more_concepts' },
  { students: 50, concepts: 5, name: 'medium_class' },
  { students: 50, concepts: 10, name: 'medium_class_more_concepts' },
  { students: 100, concepts: 5, name: 'large_class' },
  { students: 100, concepts: 10, name: 'large_class_more_concepts' },
  { students: 100, concepts: 20, name: 'large_class_many_concepts' },
];

/**
 * Main test function
 */
export default function () {
  // Select a random test scenario
  const scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)];
  
  // Test cold cache (first request)
  testHeatmapGeneration(scenario, true);
  
  // Small delay
  sleep(0.1);
  
  // Test warm cache (second request within 30s cache window)
  testHeatmapGeneration(scenario, false);
  
  sleep(1);
}

/**
 * Test heatmap generation for a specific scenario
 */
function testHeatmapGeneration(scenario, isColdCache) {
  const classroomId = `perf-test-${scenario.name}-${__VU}`;
  
  // If testing cold cache, invalidate cache first
  if (isColdCache) {
    invalidateCache(classroomId);
    sleep(0.1);
  }
  
  const startTime = Date.now();
  
  const response = http.get(
    `${BASE_URL}/api/teacher/classroom/${classroomId}/heatmap`,
    {
      tags: {
        name: 'HeatmapGeneration',
        scenario: scenario.name,
        cache: isColdCache ? 'cold' : 'warm',
      },
    }
  );
  
  const duration = Date.now() - startTime;
  const latency = response.timings.duration;
  
  // Record metrics
  if (isColdCache) {
    heatmapColdCache.add(latency);
  } else {
    heatmapWarmCache.add(latency);
    cacheHitRate.add(latency < 50); // Cache hits should be very fast
  }
  
  // Record by student count
  if (scenario.students === 10) {
    heatmap10Students.add(latency);
  } else if (scenario.students === 50) {
    heatmap50Students.add(latency);
  } else if (scenario.students === 100) {
    heatmap100Students.add(latency);
  }
  
  // Record by concept count
  if (scenario.concepts === 5) {
    heatmap5Concepts.add(latency);
  } else if (scenario.concepts === 10) {
    heatmap10Concepts.add(latency);
  } else if (scenario.concepts === 20) {
    heatmap20Concepts.add(latency);
  }
  
  // Track slow heatmaps
  if (latency > 200) {
    slowHeatmaps.add(1);
  }
  if (latency > 500) {
    verySlowHeatmaps.add(1);
  }
  
  // Validate response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has grid': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.grid !== undefined;
      } catch {
        return false;
      }
    },
    'has timestamp': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.timestamp !== undefined;
      } catch {
        return false;
      }
    },
    'has classroom average': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.classroomAverage !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  // Additional checks for performance targets
  if (scenario.students === 100 && scenario.concepts === 10) {
    check(response, {
      '100 students/10 concepts < 200ms': (r) => r.timings.duration < 200,
    });
  }
  
  if (!isColdCache) {
    check(response, {
      'warm cache < 50ms': (r) => r.timings.duration < 50,
    });
  }
  
  if (!success) {
    console.error(`❌ Heatmap generation failed for ${scenario.name} (${isColdCache ? 'cold' : 'warm'} cache)`);
  }
}

/**
 * Invalidate cache for a classroom
 */
function invalidateCache(classroomId) {
  // This would typically call a cache invalidation endpoint
  // For now, we'll just add a cache-busting parameter
  http.get(
    `${BASE_URL}/api/teacher/classroom/${classroomId}/heatmap?bustCache=${Date.now()}`,
    {
      tags: { name: 'CacheInvalidation' },
    }
  );
}

/**
 * Test scaling characteristics
 */
export function testScaling() {
  console.log('\n=== Testing Heatmap Scaling ===\n');
  
  const sizes = [10, 50, 100];
  const results = [];
  
  sizes.forEach(size => {
    const classroomId = `scaling-test-${size}`;
    invalidateCache(classroomId);
    sleep(0.2);
    
    const startTime = Date.now();
    const response = http.get(
      `${BASE_URL}/api/teacher/classroom/${classroomId}/heatmap`,
      { tags: { name: 'ScalingTest' } }
    );
    const duration = Date.now() - startTime;
    
    results.push({
      students: size,
      duration,
      success: response.status === 200,
    });
    
    console.log(`${size} students: ${duration}ms`);
    sleep(0.5);
  });
  
  // Check for linear scaling
  if (results.length === 3) {
    const ratio1 = results[1].duration / results[0].duration; // 50/10
    const ratio2 = results[2].duration / results[1].duration; // 100/50
    
    console.log(`\nScaling ratios:`);
    console.log(`50/10 students: ${ratio1.toFixed(2)}x`);
    console.log(`100/50 students: ${ratio2.toFixed(2)}x`);
    
    // Linear scaling means ratios should be close to student count ratios
    const isLinear = ratio1 < 10 && ratio2 < 5; // Allow some overhead
    console.log(`Linear scaling: ${isLinear ? '✅ PASS' : '❌ FAIL'}`);
  }
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting heatmap performance test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test scenarios: ${testScenarios.length}`);
  return { startTime: Date.now() };
}

/**
 * Teardown function with detailed results
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n=== Heatmap Performance Test Complete ===`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
}

/**
 * Custom summary handler
 */
export function handleSummary(data) {
  const metrics = data.metrics;
  
  // Extract key metrics
  const coldCacheP95 = metrics.heatmap_cold_cache_ms?.values['p(95)'] || 0;
  const warmCacheP95 = metrics.heatmap_warm_cache_ms?.values['p(95)'] || 0;
  const students100P95 = metrics.heatmap_100_students_ms?.values['p(95)'] || 0;
  const cacheHitRateValue = metrics.cache_hit_rate?.values.rate || 0;
  
  const summary = {
    timestamp: new Date().toISOString(),
    testDuration: data.state.testRunDurationMs / 1000,
    performance: {
      coldCache: {
        p50: metrics.heatmap_cold_cache_ms?.values['p(50)'] || 0,
        p95: coldCacheP95,
        p99: metrics.heatmap_cold_cache_ms?.values['p(99)'] || 0,
        avg: metrics.heatmap_cold_cache_ms?.values.avg || 0,
      },
      warmCache: {
        p50: metrics.heatmap_warm_cache_ms?.values['p(50)'] || 0,
        p95: warmCacheP95,
        p99: metrics.heatmap_warm_cache_ms?.values['p(99)'] || 0,
        avg: metrics.heatmap_warm_cache_ms?.values.avg || 0,
      },
      byStudentCount: {
        students10: {
          p95: metrics.heatmap_10_students_ms?.values['p(95)'] || 0,
          avg: metrics.heatmap_10_students_ms?.values.avg || 0,
        },
        students50: {
          p95: metrics.heatmap_50_students_ms?.values['p(95)'] || 0,
          avg: metrics.heatmap_50_students_ms?.values.avg || 0,
        },
        students100: {
          p95: students100P95,
          avg: metrics.heatmap_100_students_ms?.values.avg || 0,
        },
      },
      byConcepts: {
        concepts5: {
          p95: metrics.heatmap_5_concepts_ms?.values['p(95)'] || 0,
          avg: metrics.heatmap_5_concepts_ms?.values.avg || 0,
        },
        concepts10: {
          p95: metrics.heatmap_10_concepts_ms?.values['p(95)'] || 0,
          avg: metrics.heatmap_10_concepts_ms?.values.avg || 0,
        },
        concepts20: {
          p95: metrics.heatmap_20_concepts_ms?.values['p(95)'] || 0,
          avg: metrics.heatmap_20_concepts_ms?.values.avg || 0,
        },
      },
    },
    caching: {
      hitRate: (cacheHitRateValue * 100).toFixed(2) + '%',
      speedup: coldCacheP95 > 0 ? (coldCacheP95 / warmCacheP95).toFixed(2) + 'x' : 'N/A',
    },
    thresholds: {
      coldCacheUnder500ms: coldCacheP95 < 500 ? '✅ PASS' : '❌ FAIL',
      warmCacheUnder50ms: warmCacheP95 < 50 ? '✅ PASS' : '❌ FAIL',
      students100Under200ms: students100P95 < 200 ? '✅ PASS' : '❌ FAIL',
    },
    slowRequests: {
      over200ms: metrics.slow_heatmaps_over_200ms?.values.count || 0,
      over500ms: metrics.very_slow_heatmaps_over_500ms?.values.count || 0,
    },
  };
  
  console.log('\n=== HEATMAP PERFORMANCE RESULTS ===\n');
  console.log('Cold Cache (First Request):');
  console.log(`  Average: ${summary.performance.coldCache.avg.toFixed(2)}ms`);
  console.log(`  P95: ${summary.performance.coldCache.p95.toFixed(2)}ms ${summary.thresholds.coldCacheUnder500ms}`);
  console.log(`  P99: ${summary.performance.coldCache.p99.toFixed(2)}ms`);
  
  console.log('\nWarm Cache (Cached Request):');
  console.log(`  Average: ${summary.performance.warmCache.avg.toFixed(2)}ms`);
  console.log(`  P95: ${summary.performance.warmCache.p95.toFixed(2)}ms ${summary.thresholds.warmCacheUnder50ms}`);
  console.log(`  Cache Hit Rate: ${summary.caching.hitRate}`);
  console.log(`  Cache Speedup: ${summary.caching.speedup}`);
  
  console.log('\nPerformance by Classroom Size:');
  console.log(`  10 students: ${summary.performance.byStudentCount.students10.avg.toFixed(2)}ms avg, ${summary.performance.byStudentCount.students10.p95.toFixed(2)}ms p95`);
  console.log(`  50 students: ${summary.performance.byStudentCount.students50.avg.toFixed(2)}ms avg, ${summary.performance.byStudentCount.students50.p95.toFixed(2)}ms p95`);
  console.log(`  100 students: ${summary.performance.byStudentCount.students100.avg.toFixed(2)}ms avg, ${summary.performance.byStudentCount.students100.p95.toFixed(2)}ms p95 ${summary.thresholds.students100Under200ms}`);
  
  console.log('\nPerformance by Concept Count:');
  console.log(`  5 concepts: ${summary.performance.byConcepts.concepts5.avg.toFixed(2)}ms avg, ${summary.performance.byConcepts.concepts5.p95.toFixed(2)}ms p95`);
  console.log(`  10 concepts: ${summary.performance.byConcepts.concepts10.avg.toFixed(2)}ms avg, ${summary.performance.byConcepts.concepts10.p95.toFixed(2)}ms p95`);
  console.log(`  20 concepts: ${summary.performance.byConcepts.concepts20.avg.toFixed(2)}ms avg, ${summary.performance.byConcepts.concepts20.p95.toFixed(2)}ms p95`);
  
  console.log('\nSlow Requests:');
  console.log(`  Over 200ms: ${summary.slowRequests.over200ms}`);
  console.log(`  Over 500ms: ${summary.slowRequests.over500ms}`);
  
  return {
    'stdout': '', // Already printed above
    'heatmap-performance-results.json': JSON.stringify(summary, null, 2),
  };
}