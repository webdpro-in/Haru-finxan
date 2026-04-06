/**
 * Load Test Script for FinxanAI Platform
 * Task 36.1: Load test with 10,000 concurrent users
 * 
 * Tests system performance under high load:
 * - 10,000 concurrent virtual users
 * - Multiple API endpoints
 * - Socket.io connections
 * - Database operations
 * 
 * Run with: k6 run load-test.k6.js
 * 
 * Requirements:
 * - Install k6: https://k6.io/docs/getting-started/installation/
 * - Set BASE_URL environment variable (default: http://localhost:3000)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import ws from 'k6/ws';

// Custom metrics
const errorRate = new Rate('errors');
const sessionDuration = new Trend('session_duration');
const heatmapGeneration = new Trend('heatmap_generation_time');
const apiLatency = new Trend('api_latency');
const successfulSessions = new Counter('successful_sessions');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 1000 },   // Ramp up to 1,000 users
    { duration: '3m', target: 5000 },   // Ramp up to 5,000 users
    { duration: '5m', target: 10000 },  // Ramp up to 10,000 users
    { duration: '10m', target: 10000 }, // Stay at 10,000 users for 10 minutes
    { duration: '3m', target: 5000 },   // Ramp down to 5,000 users
    { duration: '2m', target: 0 },      // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'http_req_failed': ['rate<0.01'],   // Error rate should be below 1%
    'errors': ['rate<0.05'],            // Custom error rate below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Generate random student ID
function randomStudentId() {
  return `student-${Math.floor(Math.random() * 10000)}`;
}

// Generate random classroom ID
function randomClassroomId() {
  return `classroom-${Math.floor(Math.random() * 100)}`;
}

/**
 * Main test scenario
 * Simulates a complete user journey
 */
export default function () {
  const studentId = randomStudentId();
  
  // Scenario 1: Student Session Flow (60% of users)
  if (Math.random() < 0.6) {
    testStudentSessionFlow(studentId);
  }
  
  // Scenario 2: Teacher Dashboard Access (30% of users)
  else if (Math.random() < 0.9) {
    testTeacherDashboard();
  }
  
  // Scenario 3: Parent Dashboard Access (10% of users)
  else {
    testParentDashboard();
  }
  
  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

/**
 * Test student session creation and completion
 */
function testStudentSessionFlow(studentId) {
  const startTime = Date.now();
  
  // Start session
  const startResponse = http.post(
    `${BASE_URL}/api/student/session/start`,
    JSON.stringify({ studentId }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'SessionStart' },
    }
  );
  
  const startSuccess = check(startResponse, {
    'session start status is 200': (r) => r.status === 200,
    'session start has sessionId': (r) => JSON.parse(r.body).sessionId !== undefined,
  });
  
  errorRate.add(!startSuccess);
  apiLatency.add(startResponse.timings.duration);
  
  if (!startSuccess) {
    return;
  }
  
  const sessionId = JSON.parse(startResponse.body).sessionId;
  
  // Simulate session activity
  sleep(Math.random() * 2 + 1);
  
  // End session
  const endResponse = http.post(
    `${BASE_URL}/api/student/session/end`,
    JSON.stringify({ sessionId, studentId }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'SessionEnd' },
    }
  );
  
  const endSuccess = check(endResponse, {
    'session end status is 200': (r) => r.status === 200,
    'session end has summary': (r) => JSON.parse(r.body).summary !== undefined,
  });
  
  errorRate.add(!endSuccess);
  apiLatency.add(endResponse.timings.duration);
  
  if (endSuccess) {
    successfulSessions.add(1);
    sessionDuration.add(Date.now() - startTime);
  }
}

/**
 * Test teacher dashboard and heatmap generation
 */
function testTeacherDashboard() {
  const classroomId = randomClassroomId();
  
  // Get heatmap
  const heatmapStart = Date.now();
  const heatmapResponse = http.get(
    `${BASE_URL}/api/teacher/classroom/${classroomId}/heatmap`,
    {
      tags: { name: 'HeatmapGeneration' },
    }
  );
  
  const heatmapSuccess = check(heatmapResponse, {
    'heatmap status is 200': (r) => r.status === 200,
    'heatmap has grid': (r) => JSON.parse(r.body).grid !== undefined,
    'heatmap generation < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!heatmapSuccess);
  heatmapGeneration.add(Date.now() - heatmapStart);
  apiLatency.add(heatmapResponse.timings.duration);
}

/**
 * Test parent dashboard access
 */
function testParentDashboard() {
  const parentId = `parent-${Math.floor(Math.random() * 1000)}`;
  
  // Get parent dashboard
  const dashboardResponse = http.get(
    `${BASE_URL}/api/parent/${parentId}/dashboard`,
    {
      tags: { name: 'ParentDashboard' },
    }
  );
  
  const dashboardSuccess = check(dashboardResponse, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard has children': (r) => JSON.parse(r.body).children !== undefined,
  });
  
  errorRate.add(!dashboardSuccess);
  apiLatency.add(dashboardResponse.timings.duration);
}

/**
 * Test Socket.io connections under load
 */
export function testSocketIO() {
  const url = BASE_URL.replace('http', 'ws');
  
  ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'join', room: 'classroom-1' }));
    });
    
    socket.on('message', (data) => {
      check(data, {
        'received message': (d) => d !== null,
      });
    });
    
    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });
}

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('Starting load test...');
  console.log(`Target: 10,000 concurrent users`);
  console.log(`Base URL: ${BASE_URL}`);
  return { startTime: Date.now() };
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}
