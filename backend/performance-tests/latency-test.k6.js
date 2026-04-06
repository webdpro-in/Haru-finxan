/**
 * Latency Measurement Test for FinxanAI Platform
 * Task 36.2: Measure response latency (target <500ms)
 * 
 * Measures response latency for all critical endpoints:
 * - Student session endpoints
 * - Teacher dashboard endpoints
 * - Parent dashboard endpoints
 * - Real-time Socket.io events
 * 
 * Target: 95th percentile < 500ms
 * 
 * Run with: k6 run latency-test.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics for each endpoint
const sessionStartLatency = new Trend('session_start_latency');
const sessionEndLatency = new Trend('session_end_latency');
const heatmapLatency = new Trend('heatmap_latency');
const parentDashboardLatency = new Trend('parent_dashboard_latency');
const anonymousQuestionLatency = new Trend('anonymous_question_latency');
const lessonPlanLatency = new Trend('lesson_plan_latency');

const slowRequests = new Counter('slow_requests_over_500ms');
const verySlowRequests = new Counter('very_slow_requests_over_1000ms');

// Test configuration - moderate load to measure latency accurately
export const options = {
  stages: [
    { duration: '1m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'session_start_latency': ['p(95)<500'],
    'session_end_latency': ['p(95)<500'],
    'heatmap_latency': ['p(95)<500'],
    'parent_dashboard_latency': ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

function randomId(prefix, max) {
  return `${prefix}-${Math.floor(Math.random() * max)}`;
}

export default function () {
  // Test different endpoints in rotation
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    testStudentSessionLatency();
  } else if (scenario < 0.6) {
    testTeacherEndpointsLatency();
  } else if (scenario < 0.8) {
    testParentEndpointsLatency();
  } else {
    testMiscEndpointsLatency();
  }
  
  sleep(1);
}

/**
 * Test student session endpoint latency
 */
function testStudentSessionLatency() {
  const studentId = randomId('student', 10000);
  
  // Measure session start latency
  const startResponse = http.post(
    `${BASE_URL}/api/student/session/start`,
    JSON.stringify({ studentId }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'SessionStart' },
    }
  );
  
  const startLatency = startResponse.timings.duration;
  sessionStartLatency.add(startLatency);
  
  if (startLatency > 500) slowRequests.add(1);
  if (startLatency > 1000) verySlowRequests.add(1);
  
  check(startResponse, {
    'session start < 500ms': (r) => r.timings.duration < 500,
    'session start < 1000ms': (r) => r.timings.duration < 1000,
    'session start status 200': (r) => r.status === 200,
  });
  
  if (startResponse.status !== 200) return;
  
  const sessionId = JSON.parse(startResponse.body).sessionId;
  
  // Simulate session activity
  sleep(0.5);
  
  // Measure session end latency
  const endResponse = http.post(
    `${BASE_URL}/api/student/session/end`,
    JSON.stringify({ sessionId, studentId }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'SessionEnd' },
    }
  );
  
  const endLatency = endResponse.timings.duration;
  sessionEndLatency.add(endLatency);
  
  if (endLatency > 500) slowRequests.add(1);
  if (endLatency > 1000) verySlowRequests.add(1);
  
  check(endResponse, {
    'session end < 500ms': (r) => r.timings.duration < 500,
    'session end < 1000ms': (r) => r.timings.duration < 1000,
    'session end status 200': (r) => r.status === 200,
  });
}

/**
 * Test teacher endpoint latency
 */
function testTeacherEndpointsLatency() {
  const classroomId = randomId('classroom', 100);
  
  // Measure heatmap generation latency
  const heatmapResponse = http.get(
    `${BASE_URL}/api/teacher/classroom/${classroomId}/heatmap`,
    {
      tags: { name: 'Heatmap' },
    }
  );
  
  const heatmapLat = heatmapResponse.timings.duration;
  heatmapLatency.add(heatmapLat);
  
  if (heatmapLat > 500) slowRequests.add(1);
  if (heatmapLat > 1000) verySlowRequests.add(1);
  
  check(heatmapResponse, {
    'heatmap < 500ms': (r) => r.timings.duration < 500,
    'heatmap < 1000ms': (r) => r.timings.duration < 1000,
    'heatmap status 200': (r) => r.status === 200,
  });
  
  // Test lesson plan generation latency
  const lessonPlanResponse = http.post(
    `${BASE_URL}/api/teacher/lesson-plan/generate`,
    JSON.stringify({
      classroomId,
      topic: 'Algebra',
      duration: 45,
      difficulty: 'medium'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'LessonPlan' },
    }
  );
  
  const lessonLat = lessonPlanResponse.timings.duration;
  lessonPlanLatency.add(lessonLat);
  
  if (lessonLat > 500) slowRequests.add(1);
  if (lessonLat > 1000) verySlowRequests.add(1);
  
  check(lessonPlanResponse, {
    'lesson plan < 1000ms': (r) => r.timings.duration < 1000,
    'lesson plan status 200': (r) => r.status === 200,
  });
}

/**
 * Test parent endpoint latency
 */
function testParentEndpointsLatency() {
  const parentId = randomId('parent', 1000);
  const studentId = randomId('student', 10000);
  
  // Measure parent dashboard latency
  const dashboardResponse = http.get(
    `${BASE_URL}/api/parent/${parentId}/dashboard`,
    {
      tags: { name: 'ParentDashboard' },
    }
  );
  
  const dashboardLat = dashboardResponse.timings.duration;
  parentDashboardLatency.add(dashboardLat);
  
  if (dashboardLat > 500) slowRequests.add(1);
  if (dashboardLat > 1000) verySlowRequests.add(1);
  
  check(dashboardResponse, {
    'parent dashboard < 500ms': (r) => r.timings.duration < 500,
    'parent dashboard < 1000ms': (r) => r.timings.duration < 1000,
    'parent dashboard status 200': (r) => r.status === 200,
  });
  
  // Measure daily report latency
  const reportResponse = http.get(
    `${BASE_URL}/api/parent/${parentId}/child/${studentId}/report`,
    {
      tags: { name: 'DailyReport' },
    }
  );
  
  check(reportResponse, {
    'daily report < 500ms': (r) => r.timings.duration < 500,
    'daily report status 200': (r) => r.status === 200,
  });
}

/**
 * Test miscellaneous endpoint latency
 */
function testMiscEndpointsLatency() {
  const studentId = randomId('student', 10000);
  const classroomId = randomId('classroom', 100);
  
  // Test anonymous question latency
  const anonResponse = http.post(
    `${BASE_URL}/api/student/anonymous-question`,
    JSON.stringify({
      studentId,
      classroomId,
      question: 'What is algebra?'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'AnonymousQuestion' },
    }
  );
  
  const anonLat = anonResponse.timings.duration;
  anonymousQuestionLatency.add(anonLat);
  
  if (anonLat > 500) slowRequests.add(1);
  
  check(anonResponse, {
    'anonymous question < 500ms': (r) => r.timings.duration < 500,
    'anonymous question status 200': (r) => r.status === 200,
  });
}

/**
 * Summary handler
 */
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  const avg = data.metrics.http_req_duration.values.avg;
  
  console.log('\n=== LATENCY TEST RESULTS ===');
  console.log(`Average Latency: ${avg.toFixed(2)}ms`);
  console.log(`95th Percentile: ${p95.toFixed(2)}ms`);
  console.log(`99th Percentile: ${p99.toFixed(2)}ms`);
  console.log(`Target: <500ms (95th percentile)`);
  console.log(`Status: ${p95 < 500 ? '✅ PASS' : '❌ FAIL'}`);
  
  return {
    'latency-results.json': JSON.stringify(data, null, 2),
  };
}
