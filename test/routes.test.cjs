const assert = require('node:assert/strict');
const test = require('node:test');
const { app } = require('../dist/app.js');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test('health and OpenAPI endpoints are registered centrally', async () => {
  const live = await fetch(`${baseUrl}/health/live`);
  assert.equal(live.status, 200);
  assert.equal((await live.json()).status, 'live');
  assert.ok(live.headers.get('x-request-id'));

  const openapi = await fetch(`${baseUrl}/api/v1/openapi.json`);
  assert.equal(openapi.status, 200);
  const specification = await openapi.json();
  assert.equal(specification.openapi, '3.0.3');
  assert.ok(specification.paths['/api/v1/auth/login']);
  assert.ok(specification.paths['/api/v1/auth/password-reset/confirmations']);
});

test('school-scoped API routes reject missing and malformed tenant codes', async () => {
  const response = await fetch(`${baseUrl}/api/v1/not-implemented`);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'SCHOOL_CODE_REQUIRED');
  assert.equal(body.error.requestId, response.headers.get('x-request-id'));

  const malformed = await fetch(`${baseUrl}/api/v1/not-implemented`, {
    headers: { 'X-School-Code': 'not a code' },
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'SCHOOL_CODE_INVALID');
});

test('tenant access checks run before JSON parsing and disallowed CORS is rejected', async () => {
  const malformedJson = await fetch(`${baseUrl}/api/v1/not-implemented`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-School-Code': 'TEST-SCHOOL',
    },
    body: '{',
  });
  assert.equal(malformedJson.status, 503);
  assert.equal((await malformedJson.json()).error.code, 'SCHOOL_ACCESS_CHECK_UNAVAILABLE');

  const disallowedOrigin = await fetch(`${baseUrl}/health/live`, {
    headers: { origin: 'https://not-allowed.example' },
  });
  assert.equal(disallowedOrigin.status, 403);
  assert.equal((await disallowedOrigin.json()).error.code, 'ORIGIN_NOT_ALLOWED');
});
