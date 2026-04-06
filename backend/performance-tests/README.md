# Performance Testing for FinxanAI Platform

This directory contains performance testing scripts for validating the system can handle high load.

## Task 36.1: Load Test with 10,000 Concurrent Users

### Prerequisites

1. **Install k6**:
   ```bash
   # macOS
   brew install k6
   
   # Windows
   choco install k6
   
   # Linux
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Start the backend server**:
   ```bash
   cd backend
   npm run dev
   ```

### Running Load Tests

#### Basic Load Test
```bash
cd backend/performance-tests
k6 run load-test.k6.js
```

#### Custom Configuration
```bash
# Test with custom base URL
BASE_URL=http://localhost:3000 k6 run load-test.k6.js

# Test with custom duration
k6 run --duration 5m --vus 1000 load-test.k6.js

# Generate HTML report
k6 run --out json=results.json load-test.k6.js
```

#### Quick Smoke Test (100 users)
```bash
k6 run --vus 100 --duration 30s load-test.k6.js
```

#### Stress Test (15,000 users)
```bash
k6 run --vus 15000 --duration 10m load-test.k6.js
```

### Test Scenarios

The load test includes three main scenarios:

1. **Student Session Flow (60% of traffic)**
   - POST /api/student/session/start
   - POST /api/student/session/end
   - Simulates complete learning session

2. **Teacher Dashboard (30% of traffic)**
   - GET /api/teacher/classroom/:id/heatmap
   - Tests heatmap generation under load

3. **Parent Dashboard (10% of traffic)**
   - GET /api/parent/:id/dashboard
   - Tests dashboard aggregation

### Load Test Stages

1. **Ramp Up (2 min)**: 0 → 1,000 users
2. **Ramp Up (3 min)**: 1,000 → 5,000 users
3. **Ramp Up (5 min)**: 5,000 → 10,000 users
4. **Sustained Load (10 min)**: 10,000 users
5. **Ramp Down (3 min)**: 10,000 → 5,000 users
6. **Ramp Down (2 min)**: 5,000 → 0 users

**Total Duration**: 25 minutes

### Performance Thresholds

- **Response Time**: 95th percentile < 500ms
- **Error Rate**: < 1%
- **Custom Error Rate**: < 5%

### Metrics Collected

- **API Latency**: Response time for all API calls
- **Session Duration**: Time to complete full session
- **Heatmap Generation Time**: Time to generate classroom heatmap
- **Error Rate**: Percentage of failed requests
- **Successful Sessions**: Count of completed sessions

### Interpreting Results

After running the test, k6 will output:

```
     ✓ session start status is 200
     ✓ session end status is 200
     ✓ heatmap generation < 500ms

     checks.........................: 98.50% ✓ 29550    ✗ 450
     data_received..................: 150 MB 6.0 MB/s
     data_sent......................: 75 MB  3.0 MB/s
     errors.........................: 2.00%  ✓ 600      ✗ 29400
     heatmap_generation_time........: avg=245ms min=120ms med=230ms max=480ms p(95)=380ms
     http_req_duration..............: avg=320ms min=50ms  med=280ms max=950ms  p(95)=450ms
     http_reqs......................: 30000  1200/s
     successful_sessions............: 9500
     vus............................: 10000  min=0      max=10000
```

### Success Criteria

✅ **PASS** if:
- 95th percentile response time < 500ms
- Error rate < 1%
- System remains stable throughout test
- No crashes or memory leaks

❌ **FAIL** if:
- Response times exceed 500ms consistently
- Error rate > 1%
- Server crashes or becomes unresponsive
- Memory usage grows unbounded

### Troubleshooting

**High Error Rates**:
- Check database connection pool size
- Verify Redis connection limits
- Check server logs for errors

**Slow Response Times**:
- Profile database queries
- Check for N+1 query problems
- Verify caching is working
- Check network latency

**Server Crashes**:
- Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`
- Check for memory leaks
- Verify connection pooling

## Task 36.2: Measure Response Latency

### Running Latency Tests

```bash
cd backend/performance-tests
k6 run latency-test.k6.js
```

The latency test measures response times for all critical endpoints with moderate load (500 users) to get accurate latency measurements.

**Performance Targets**:
- 95th percentile < 500ms
- 99th percentile < 1000ms

See `TASK_36.1_COMPLETION.md` for detailed results.

## Task 36.3: Measure Heatmap Generation Time

### Running Heatmap Performance Tests

```bash
cd backend/performance-tests
k6 run heatmap-performance.k6.js

# Or using npm
npm run test:heatmap
```

### Test Coverage

The heatmap performance test validates generation times for:

**Classroom Sizes**:
- 10 students (small classroom)
- 50 students (medium classroom)
- 100 students (large classroom)

**Concept Counts**:
- 5 concepts (minimal)
- 10 concepts (standard)
- 20 concepts (comprehensive)

**Cache Scenarios**:
- Cold cache (first request)
- Warm cache (cached request within 30s)

### Performance Targets

- **100 students / 10 concepts**: < 200ms (95th percentile)
- **Cold cache**: < 500ms (95th percentile)
- **Warm cache**: < 50ms (95th percentile)
- **Cache speedup**: > 10x improvement
- **Scaling**: Linear with classroom size

### Results Output

The test generates:
1. **Console output** with detailed performance metrics
2. **JSON file** (`heatmap-performance-results.json`) with complete results

Example output:
```
=== HEATMAP PERFORMANCE RESULTS ===

Cold Cache (First Request):
  Average: 245.32ms
  P95: 387.45ms ✅ PASS
  P99: 456.78ms

Warm Cache (Cached Request):
  Average: 12.45ms
  P95: 23.67ms ✅ PASS
  Cache Hit Rate: 87.5%
  Cache Speedup: 16.37x

Performance by Classroom Size:
  10 students: 78.23ms avg, 125.45ms p95
  50 students: 156.78ms avg, 234.56ms p95
  100 students: 189.34ms avg, 287.65ms p95 ✅ PASS
```

See `TASK_36.3_COMPLETION.md` for detailed documentation.

### Next Steps

After completing performance testing:
1. ✅ Task 36.1: Load test with 10,000 concurrent users - COMPLETE
2. ✅ Task 36.2: Measure response latency - COMPLETE
3. ✅ Task 36.3: Measure heatmap generation time - COMPLETE
4. ⏭️ Task 36.4: Optimize slow queries based on test results

### Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)
