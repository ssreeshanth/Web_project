import assert from 'node:assert/strict';
import app from '../app.js';
import { initializeStore } from '../models/store.js';

const expectErrorShape = async (response, expectedStatus, expectedMessage) => {
  const data = await response.json();
  assert.equal(response.status, expectedStatus, `Expected status ${expectedStatus}, got ${response.status}`);
  assert.equal(data.success, false, 'Expected success=false');
  assert.equal(data.message, expectedMessage, `Expected message "${expectedMessage}", got "${data.message}"`);
};

const run = async () => {
  await initializeStore();

  const server = app.listen(0);
  try {
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}`;

    // 1) Invalid JSON payload should be centralized and consistent.
    const invalidJsonRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    await expectErrorShape(invalidJsonRes, 400, 'Invalid JSON payload');

    // 2) Invalid email format validation.
    const invalidEmailRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email', password: 'demo123' }),
    });
    await expectErrorShape(invalidEmailRes, 400, 'Invalid email format');

    // 3) Access denied for non-admin on admin endpoint.
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@bookflow.com', password: 'demo123' }),
    });
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Expected login token for demo user');

    const accessDeniedRes = await fetch(`${base}/api/admin/bookings`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    await expectErrorShape(accessDeniedRes, 403, 'Access denied');

    // 4) Not-found route error shape.
    const notFoundRes = await fetch(`${base}/does-not-exist`);
    const notFoundData = await notFoundRes.json();
    assert.equal(notFoundRes.status, 404);
    assert.equal(notFoundData.success, false);
    assert.ok(String(notFoundData.message || '').startsWith('Route not found:'), 'Expected route not found message');

    console.log('All error-format checks passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
