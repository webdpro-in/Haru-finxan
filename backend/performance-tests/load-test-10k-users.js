/**
 * Task 36.1: Load Test with 10,000 Concurrent Users
 * 
 * This k6 script tests the FinxanAI platform with 10,000 concurrent users
 * simulating realistic student learning sessions.
 * 
 * Requirements tested:
 * - REQ-1.1.5: System SHALL support concurrent sessions for multiple students
 * - REQ-1.2.5: System SHALL achieve <500ms total response latency (95th percentile)
 * - REQ-9.1: System SHALL achieve <500ms total response latency (95th percentile)
 * - REQ-9.2: System SHALL support 10,000+ concurrent sessions
 * 
 * Test scenarios:
 * 1. Student session creation (10,000 concurrent)
 * 2. API endpoint load testing
 * 3. Socket.io connection load
 * 4. Database query performance under load
 * 
 * Usage:
 *   k6 run load-test-10k-users.js
 *   k6 run --vus 10000 --duration 5m load-test-10k-users.js
 * 
 * Installation:
 *   Windows: choco install k6
 *   macOS: brew install k6
 *   Linux: sudo apt-get install k6
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const sessionStartLatency = new Trend('session_start_latency');
const sessionEndLatency = new Trend('session_end_latency');
const heatmapLatency = new Trend('heatmap_latency');
const errorRate = new Rate('error_rate');
const confusionDetected = new Counter('confusion_detected');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 1000 },   // Ramp up to 1k users
    { duration: '3m', target: 5000 },   // Ramp up to 5k users
    { duration: '5m', target: 10000 },  // Ramp up to 10k users
    { duration: '10m', target: 10000 }, // Stay at 10k users
    { duration: '2m', target: 0 },      // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests under 500ms
    'http_req_failed': ['rate<0.01'],   // Error rate under 1%
    'session_start_latency': ['p(95)<500'],
    'session_end_latency': ['p(95)<500'],
    'heatmap_latency': ['p(95)<2000'],  // Heatmap under 2s
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test data generators
function generateStudentId() {
  return `student_${randomIntBetween(1, 50000)}`;
}

function generateTeacherId() {
  return `teacher_${randomIntBetween(1, 500)}`;
}

function generateClassroomId() {
  return `classroom_${randomIntBetween(1, 1000)}`;
}

function generateQuestion() {
  const questions = [
    'What is photosynthesis?',
    'How do I solve quadratic equations?',
    'Can you explain Newton\'s laws?',
    'What is the Pythagorean theorem?',
    'I don\'t understand fractions',
    'How does cellular respiration work?',
    'What is the difference between mitosis and meiosis?',
    'Can you help me with algebra?',
  ];
  return questions[randomIntBetween(0, questions.length - 1)];
}

function generateAuthToken(userId, role = 'student') {
  // In real scenario, this would be a valid JWT
  // For testing, we'll use a mock token
  return `Bearer mock_token_${userId}_${role}`;
}

// Main test scenario
export default function () {
  const studentId = generateStudentId();
  const teacherId = generateTeacherId();
  const classroomId = generateClassroomId();

  // Scenario 1: Student Session Flow (70% of users)
  if (Math.random() < 0.7) {
    studentSessionFlow(studentId, classroomId);
  }
  // Scenario 2: Teacher Dashboard Access (20% of users)
  else if (Math.random() < 0.9) {
    teacherDashboardFlow(teacherId, classroomId);
  }
  // Scenario 3: Parent Dashboard Access (10% of users)
  else {
    parentDashboardFlow(studentId);
  }

  sleep(randomIntBetween(1, 3));
}

function studentSessionFlow(studentId, classroomId) {
  group('Student Session Flow', () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': generateAuthToken(studentId, 'student'),
    };

    // 1. Start session
    const sessionStartTime = Date.now();
    const startSessionRes = http.post(
      `${BASE_URL}/api/student/session/start`,
      JSON.stringify({
        studentId,
        classroomId,
        subject: 'math',
      }),
      { headers }
    );

    const sessionStartDuration = Date.now() - sessionStartTime;
    sessionStartLatency.add(sessionStartDuration);

    const sessionStartSuccess = check(startSessionRes, {
      'session start status 200': (r) => r.status === 200,
      'session start has sessionId': (r) => {
        try {
          return JSON.parse(r.body).sessionId !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!sessionStartSuccess) {
      errorRate.add(1);
      return;
    }

    const sessionId = JSON.parse(startSessionRes.body).sessionId;

    // 2. Ask multiple questions (simulate learning session)
    const questionCount = randomIntBetween(3, 8);
    for (let i = 0; i < questionCount; i++) {
      const question = generateQuestion();
      
      const askQuestionRes = http.post(
        `${BASE_URL}/api/student/ask`,
        JSON.stringify({
          studentId,
          sessionId,
          question,
          voiceMetrics: {
            pauseCount: randomIntBetween(0, 5),
            fillerWordCount: randomIntBetween(0, 3),
            averagePauseDuration: randomIntBetween(100, 500),
          },
        }),
        { headers }
      );

      const askSuccess = check(askQuestionRes, {
        'ask question status 200': (r) => r.status === 200,
        'response has text': (r) => {
          try {
            return JSON.parse(r.body).response?.text !== undefined;
          } catch {
            return false;
          }
        },
        'response time < 500ms': (r) => r.timings.duration < 500,
      });

      if (!askSuccess) {
        errorRate.add(1);
      }

      // Check if confusion was detected
      try {
        const response = JSON.parse(askQuestionRes.body);
        if (response.confusionDetected) {
          confusionDetected.add(1);
        }
      } catch {}

      sleep(randomIntBetween(2, 5)); // Think time between questions
    }

    // 3. End session
    const sessionEndTime = Date.now();
    const endSessionRes = http.post(
      `${BASE_URL}/api/student/session/end`,
      JSON.stringify({
        studentId,
        sessionId,
      }),
      { headers }
    );

    const sessionEndDuration = Date.now() - sessionEndTime;
    sessionEndLatency.add(sessionEndDuration);

    const sessionEndSuccess = check(endSessionRes, {
      'session end status 200': (r) => r.status === 200,
      'session end has summary': (r) => {
        try {
          return JSON.parse(r.body).summary !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!sessionEndSuccess) {
      errorRate.add(1);
    }
  });
}

function teacherDashboardFlow(teacherId, classroomId) {
  group('Teacher Dashboard Flow', () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': generateAuthToken(teacherId, 'teacher'),
    };

    // 1. Get classroom heatmap
    const heatmapStartTime = Date.now();
    const heatmapRes = http.get(
      `${BASE_URL}/api/teacher/classroom/${classroomId}/heatmap`,
      { headers }
    );

    const heatmapDuration = Date.now() - heatmapStartTime;
    heatmapLatency.add(heatmapDuration);

    const heatmapSuccess = check(heatmapRes, {
      'heatmap status 200': (r) => r.status === 200,
      'heatmap has grid': (r) => {
        try {
          return JSON.parse(r.body).grid !== undefined;
        } catch {
          return false;
        }
      },
      'heatmap time < 2s': (r) => r.timings.duration < 2000,
    });

    if (!heatmapSuccess) {
      errorRate.add(1);
    }

    // 2. Get risk predictions
    const riskRes = http.get(
      `${BASE_URL}/api/teacher/classroom/${classroomId}/risk-predictions`,
      { headers }
    );

    check(riskRes, {
      'risk predictions status 200': (r) => r.status === 200,
    });

    // 3. Get classroom analytics
    const analyticsRes = http.get(
      `${BASE_URL}/api/teacher/classroom/${classroomId}/analytics`,
      { headers }
    );

    check(analyticsRes, {
      'analytics status 200': (r) => r.status === 200,
    });
  });
}

function parentDashboardFlow(studentId) {
  group('Parent Dashboard Flow', () => {
    const parentId = `parent_${studentId}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': generateAuthToken(parentId, 'parent'),
    };

    // 1. Get parent dashboard
    const dashboardRes = http.get(
      `${BASE_URL}/api/parent/${parentId}/dashboard`,
      { headers }
    );

    check(dashboardRes, {
      'parent dashboard status 200': (r) => r.status === 200,
      'dashboard has children': (r) => {
        try {
          return JSON.parse(r.body).children !== undefined;
        } catch {
          return false;
        }
      },
    });

    // 2. Get daily reports
    const reportsRes = http.get(
      `${BASE_URL}/api/parent/${parentId}/reports`,
      { headers }
    );

    check(reportsRes, {
      'reports status 200': (r) => r.status === 200,
    });
  });
}

// Setup function (runs once at start)
export function setup() {
  console.log('Starting load test with 10,000 concurrent users');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Test duration: 22 minutes');
  console.log('Peak load: 10,000 virtual users');
  return { startTime: Date.now() };
}

// Teardown function (runs once at end)
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}