import test from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, getAccountKey, AUTHENTICATION_REQUIRED } from '../src/utils/api.js';

const token = (userId, suffix = '') => `header.${btoa(JSON.stringify({ userId }))}.signature${suffix}`;

test('UI identity remains stable across renewal and separates accounts', () => {
  assert.equal(getAccountKey(token(7)), getAccountKey(token(7, 'renewed')));
  assert.notEqual(getAccountKey(token(7)), getAccountKey(token(8)));
  assert.equal(getAccountKey(null), null);
  assert.equal(getAccountKey('invalid'), 'token:invalid');
});

test('only authenticated 401s request reauthentication; login failures do not', async () => {
  const savedFetch = globalThis.fetch;
  const savedWindow = globalThis.window;
  const events = [];
  globalThis.window = { dispatchEvent(event) { events.push(event); } };
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  try {
    const response = await apiFetch('/api/interview-sessions', { headers: { Authorization: 'Bearer example' } });
    assert.equal(response.status, 401);
    assert.equal(events[0].type, AUTHENTICATION_REQUIRED);
    assert.equal(events[0].detail.token, 'example');
    await apiFetch('/api/auth/login', { method: 'POST' });
    assert.equal(events.length, 1);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
  }
});

test('connection errors are actionable and cancelled requests remain cancelled', async () => {
  const savedFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(apiFetch('/api/profile'), /Could not reach the server/);
    globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
    await assert.rejects(apiFetch('/api/profile'), { name: 'AbortError' });
  } finally { globalThis.fetch = savedFetch; }
});
