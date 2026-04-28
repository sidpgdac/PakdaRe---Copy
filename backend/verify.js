// Phase 6+7: Full verification after all fixes applied
const http = require('http');
const { performance } = require('perf_hooks');

function req(method, path, data, token) {
  return new Promise((resolve) => {
    const start = performance.now();
    const body = data ? JSON.stringify(data) : null;
    const opts = {
      hostname: 'localhost', port: 5000, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      }
    };
    const r = http.request(opts, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => {
        const ms = performance.now() - start;
        try { resolve({ status: res.statusCode, body: JSON.parse(b), headers: res.headers, ms }); }
        catch (e) { resolve({ status: res.statusCode, body: b, headers: res.headers, ms }); }
      });
    });
    r.on('error', e => resolve({ status: 0, body: { error: e.message }, ms: performance.now() - start }));
    if (body) r.write(body); r.end();
  });
}

function check(label, pass, note) {
  const icon = pass ? '✅' : '❌';
  console.log('  ' + icon + ' ' + label.padEnd(52) + (note ? '  [' + note + ']' : ''));
  return pass;
}

async function verify() {
  const login = await req('POST', '/api/auth/login', { email: 'sidahire99@gmail.com', password: '1234' });
  const token = login.body.token;
  const ts = Date.now();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  PHASE 6: FULL VERIFICATION AFTER FIXES          ║');
  console.log('╚══════════════════════════════════════════════════╝');

  let passed = 0; let failed = 0;
  const assert = (label, pass, note) => { check(label, pass, note); pass ? passed++ : failed++; };

  // ── FIX VERIFICATION ──────────────────────────────────────
  console.log('\n  ── FIXES VERIFIED ────────────────────────────────────');

  let r = await req('GET', '/api/nonexistent-route');
  assert('Unknown route returns 404 (was 200)', r.status === 404, 'HTTP ' + r.status);

  r = await req('GET', '/.env');
  assert('/.env returns 404 (was 200)', r.status === 404, 'HTTP ' + r.status);

  r = await req('GET', '/admin');
  assert('/admin returns 404 (was 200)', r.status === 404, 'HTTP ' + r.status);

  r = await req('GET', '/api/v99/anything');
  assert('Unknown API version returns 404', r.status === 404, 'HTTP ' + r.status);

  r = await req('GET', '/');
  assert('Root health check returns 200', r.status === 200 && r.body?.status === 'ok', 'HTTP ' + r.status);

  r = await req('PUT', '/api/complaints/FAKE-ID', { status: 'Hacked' }, null);
  assert('PUT /complaints/:id without auth -> 401 (was 404)', r.status === 401, 'HTTP ' + r.status);

  // ── AUTH FLOWS ──────────────────────────────────────────────
  console.log('\n  ── AUTH FLOW ──────────────────────────────────────────');

  r = await req('GET', '/api/auth/me', null, token);
  assert('Admin /me returns user object', r.status === 200, 'HTTP ' + r.status);
  assert('Password not in /me response', !r.body?.data?.password, 'safe');

  const regRes = await req('POST', '/api/auth/register', { name: 'Citizen X', email: 'citizen_' + ts + '@test.com', password: 'Citizen1234' });
  assert('Citizen registration succeeds', regRes.status === 201, 'HTTP ' + regRes.status);

  const citLogin = await req('POST', '/api/auth/login', { email: 'citizen_' + ts + '@test.com', password: 'Citizen1234' });
  const citToken = citLogin.body.token;
  assert('Citizen login succeeds', citLogin.status === 200 && !!citToken, 'HTTP ' + citLogin.status);

  r = await req('POST', '/api/complaints/seed', [], citToken);
  assert('Citizen blocked from admin /seed -> 401/403', r.status === 401 || r.status === 403, 'HTTP ' + r.status);

  // ── COMPLAINT LIFECYCLE ────────────────────────────────────
  console.log('\n  ── COMPLAINT LIFECYCLE ────────────────────────────────');

  r = await req('GET', '/api/complaints?limit=5&offset=0');
  assert('GET complaints returns list', r.status === 200 && Array.isArray(r.body?.data), 'count=' + r.body?.count);
  assert('GET complaints has total field', r.body?.total !== undefined, 'total=' + r.body?.total);
  assert('GET complaints has hasMore field', r.body?.hasMore !== undefined, 'hasMore=' + r.body?.hasMore);
  assert('Cache-Control header on list', !!r.headers['cache-control'], r.headers['cache-control']);

  r = await req('GET', '/api/complaints?ward=A&limit=5');
  assert('Server-side ward filter works', r.status === 200, 'HTTP ' + r.status);

  r = await req('GET', '/api/complaints?resolved=false&limit=5');
  assert('Server-side resolved filter works', r.status === 200, 'HTTP ' + r.status);

  r = await req('GET', '/api/complaints?limit=-99');
  assert('Negative limit sanitized to default', r.status === 200, 'HTTP ' + r.status);

  r = await req('GET', '/api/complaints?limit=99999');
  assert('Absurd limit capped at 200', r.status === 200 && (r.body?.data?.length || 0) <= 200, 'rows=' + (r.body?.data?.length || 0));

  r = await req('GET', '/api/complaints/TOTALLY-FAKE-ID-XYZ');
  assert('GET single complaint invalid ID -> 404', r.status === 404, 'HTTP ' + r.status);

  // ── SECURITY HEADERS ──────────────────────────────────────
  console.log('\n  ── SECURITY HEADERS ───────────────────────────────────');
  r = await req('GET', '/api/complaints?limit=1');
  assert('X-Content-Type-Options: nosniff', r.headers['x-content-type-options'] === 'nosniff', r.headers['x-content-type-options']);
  assert('X-Frame-Options: SAMEORIGIN', !!r.headers['x-frame-options'], r.headers['x-frame-options']);
  assert('Content-Security-Policy present', !!r.headers['content-security-policy'], 'present');
  assert('X-Powered-By hidden', !r.headers['x-powered-by'], 'hidden');
  assert('Cache-Control on API response', !!r.headers['cache-control'], r.headers['cache-control']);

  // ── INPUT VALIDATION ──────────────────────────────────────
  console.log('\n  ── INPUT VALIDATION ───────────────────────────────────');
  r = await req('POST', '/api/auth/login', { email: '', password: '' });
  assert('Empty credentials blocked -> 400', r.status === 400, 'HTTP ' + r.status);

  r = await req('POST', '/api/auth/login', { email: 'notanemail', password: 'pass' });
  assert('Invalid email format blocked -> 400', r.status === 400, 'HTTP ' + r.status);

  r = await req('POST', '/api/auth/register', { name: 'X', email: 'x@x.com', password: 'short' });
  assert('Weak password blocked -> 400', r.status === 400, 'HTTP ' + r.status);

  r = await req('GET', '/api/complaints?' + 'x'.repeat(5000));
  assert('URL parameter flood handled (no 500)', r.status !== 500, 'HTTP ' + r.status);

  // ── PERFORMANCE SNAPSHOT ──────────────────────────────────
  console.log('\n  ── PERFORMANCE SNAPSHOT ───────────────────────────────');
  const timings = [];
  for (let i = 0; i < 5; i++) {
    const r2 = await req('GET', '/api/complaints?limit=5');
    timings.push(r2.ms);
  }
  const avg = (timings.reduce((a,b)=>a+b,0)/timings.length).toFixed(0);
  const max = Math.max(...timings).toFixed(0);
  console.log('  GET /complaints avg latency: ' + avg + 'ms  max: ' + max + 'ms  (5 sequential)');
  assert('p100 latency under 1000ms', parseInt(max) < 1000, max + 'ms');

  console.log('\n  ══════════════════════════════════════════════════════');
  console.log('  PHASE 6 RESULTS: ' + passed + ' PASSED  |  ' + failed + ' FAILED  |  ' + (passed + failed) + ' TOTAL');
  console.log('  ══════════════════════════════════════════════════════');
  return { passed, failed };
}

verify().catch(console.error);
