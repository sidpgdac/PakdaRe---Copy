/**
 * PakdaRe — k6 Load Test Script
 * 
 * Install k6: https://k6.io/docs/getting-started/installation/
 * 
 * Run tests:
 *   Smoke test (sanity):     k6 run --vus 5 --duration 30s load-test.js
 *   Load test (normal):      k6 run --vus 100 --duration 2m load-test.js
 *   Stress test (peak):      k6 run --vus 500 --duration 5m load-test.js
 *   Spike test (burst):      k6 run --stage 0s:0,10s:1000,1m:1000,10s:0 load-test.js
 *   Soak test (endurance):   k6 run --vus 200 --duration 30m load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const getComplaintsLatency = new Trend('get_complaints_latency');
const postComplaintLatency = new Trend('post_complaint_latency');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// ── Test Thresholds (SLA targets) ──────────────────────────────────────
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests under 500ms
    http_req_duration: ['p(99)<1000'],  // 99% of requests under 1 second
    errors: ['rate<0.01'],              // Error rate under 1%
    http_req_failed: ['rate<0.01'],
  },
  stages: [
    { duration: '30s', target: 50   },  // Ramp up to 50 users
    { duration: '1m',  target: 200  },  // Hold at 200 users
    { duration: '30s', target: 500  },  // Spike to 500 users
    { duration: '1m',  target: 500  },  // Hold at peak
    { duration: '30s', target: 0    },  // Ramp down
  ],
};

// Test token (get by logging in before test)
let authToken = null;

export function setup() {
  // Login to get JWT token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'admin@pakdare.com',
    password: 'Admin@1234',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status === 200) {
    return { token: loginRes.json('token') };
  }
  return { token: null };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
  };

  // ── Test 1: GET Complaints (most frequent endpoint) ──
  const getRes = http.get(`${BASE_URL}/api/complaints?offset=0&limit=50`, { headers });
  getComplaintsLatency.add(getRes.timings.duration);
  
  check(getRes, {
    'GET complaints: status 200': (r) => r.status === 200,
    'GET complaints: has data': (r) => r.json('data') !== null,
    'GET complaints: has total': (r) => r.json('total') !== undefined,
    'GET complaints: <500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(0.5);

  // ── Test 2: GET Complaints with ward filter ──
  const wardRes = http.get(`${BASE_URL}/api/complaints?ward=A&limit=20`, { headers });
  check(wardRes, {
    'GET by ward: status 200': (r) => r.status === 200,
    'GET by ward: <300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  sleep(0.5);

  // ── Test 3: GET single complaint ──
  const singleRes = http.get(`${BASE_URL}/api/complaints/BMC-2704-2818`, { headers });
  check(singleRes, {
    'GET single: status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'GET single: <200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}

export function teardown(data) {
  console.log('Load test complete. Check results above.');
}
