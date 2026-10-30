const express = require('express');
const jwt = require('jsonwebtoken');

// These tests never import a real database connection or load server/.env.
jest.mock('../src/db', () => ({ query: jest.fn() }));
const pool = require('../src/db');
const routes = require('../src/routes/interviewSessionRoutes');

let server;
let baseUrl;
let token;
const originalSecret = process.env.JWT_SECRET;
const session = {
  id: '12', user_id: 7, title: 'Practice', job_post: 'Engineer role',
  resume_text: '', status: 'draft', updated_at: '2026-10-27T12:00:00Z'
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'interview-route-tests-only';
  token = jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const app = express();
  app.use(express.json());
  app.use('/api/interview-sessions', routes);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/interview-sessions`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

beforeEach(() => pool.query.mockReset());

async function request(method = 'GET', path = '', body, authorization = `Bearer ${token}`) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  return { status: response.status, data };
}

const endpoints = [['POST', ''], ['GET', ''], ['GET', '/12'], ['PATCH', '/12'], ['DELETE', '/12']];

test.each(endpoints)('%s %s requires authentication before touching data', async (method, path) => {
  expect((await request(method, path, undefined, '')).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});

test.each(['Bearer invalid', 'Bearer', ''])('rejects invalid credentials: %s', async (authorization) => {
  expect((await request('GET', '', undefined, authorization)).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});

test('rejects expired JWTs', async () => {
  const expired = jwt.sign({ userId: 7, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
  expect((await request('GET', '', undefined, `Bearer ${expired}`)).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});

test.each([undefined, null, 0, -1, 1.2, {}, [7], 'invalid'])('rejects a signed token with invalid owner %j', async (userId) => {
  const invalid = jwt.sign({ userId }, process.env.JWT_SECRET);
  expect((await request('GET', '', undefined, `Bearer ${invalid}`)).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});

test('rejects an unexpected JWT algorithm', async () => {
  const invalid = jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { algorithm: 'HS384' });
  expect((await request('GET', '', undefined, `Bearer ${invalid}`)).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});

test('requires the Bearer scheme', async () => {
  expect((await request('GET', '', undefined, `Basic ${token}`)).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});

test('creates with the authenticated owner, trimmed text, and defaults', async () => {
  pool.query.mockResolvedValueOnce({ rows: [session] });
  const result = await request('POST', '', { title: ' Practice ', jobPost: ' Engineer role ' });
  expect(result).toEqual({ status: 201, data: { session } });
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO interview_sessions'),
    [7, 'Practice', 'Engineer role', '', 'draft']);
});

test('persists optional resume and status', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ ...session, resume_text: 'Resume', status: 'active' }] });
  expect((await request('POST', '', { title: 'Practice', jobPost: 'Engineer role', resumeText: 'Resume', status: 'active' })).status).toBe(201);
  expect(pool.query.mock.calls[0][1]).toEqual([7, 'Practice', 'Engineer role', 'Resume', 'active']);
});

test('lists only the authenticated owner with stable order and a bounded history', async () => {
  pool.query.mockResolvedValueOnce({ rows: [session] });
  expect((await request()).data.sessions).toEqual([session]);
  const [sql, values] = pool.query.mock.calls[0];
  expect(sql).toMatch(/WHERE user_id = \$1/);
  expect(sql).toMatch(/ORDER BY updated_at DESC, id DESC LIMIT 100/);
  expect(values).toEqual([7]);
});

test('reopens an owned session', async () => {
  pool.query.mockResolvedValueOnce({ rows: [session] });
  expect(await request('GET', '/12')).toEqual({ status: 200, data: { session } });
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1 AND user_id = $2'), ['12', 7]);
});

test.each(['GET', 'PATCH', 'DELETE'])('%s hides a missing or other user session behind a 404', async (method) => {
  pool.query.mockResolvedValueOnce({ rows: [] });
  const otherToken = jwt.sign({ userId: 8 }, process.env.JWT_SECRET);
  const result = await request(method, '/12', method === 'PATCH' ? { title: 'Stolen' } : undefined, `Bearer ${otherToken}`);
  expect(result).toEqual({ status: 404, data: { message: 'Session not found' } });
  const [sql, values] = pool.query.mock.calls[0];
  expect(sql).toMatch(/WHERE id = \$1 AND user_id = \$2/);
  expect(values.slice(0, 2)).toEqual(['12', 8]);
});

test('partial update changes only supplied fields and keeps ownership filtering', async () => {
  const title = "Practice'); DELETE FROM users; --";
  pool.query.mockResolvedValueOnce({ rows: [{ ...session, title }] });
  const result = await request('PATCH', '/12', { title: ` ${title} ` });
  expect(result.status).toBe(200);
  const [sql, values] = pool.query.mock.calls[0];
  expect(sql).toContain('SET title = $3, updated_at = NOW()');
  expect(sql).toContain('WHERE id = $1 AND user_id = $2');
  expect(sql).not.toContain(title);
  expect(values).toEqual(['12', 7, title]);
});

test('can clear optional resume context and mark a session completed', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ ...session, status: 'completed' }] });
  expect((await request('PATCH', '/12', { resumeText: '', status: 'completed' })).status).toBe(200);
  expect(pool.query.mock.calls[0][1]).toEqual(['12', 7, '', 'completed']);
});

test('deletes an owned session with an empty 204 response', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ id: '12' }] });
  expect(await request('DELETE', '/12')).toEqual({ status: 204, data: null });
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1 AND user_id = $2'), ['12', 7]);
});

test.each(['0', '-1', '1.2', '012', '1 OR 1=1', '9007199254740992'])('rejects invalid ID %s', async (id) => {
  expect((await request('GET', `/${encodeURIComponent(id)}`)).status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});

test.each([
  {}, { title: ' ', jobPost: 'Role' }, { title: 'Practice', jobPost: ' ' },
  { title: 'Practice', jobPost: 'Role', userId: 8 },
  { title: 'Practice', jobPost: 'Role', user_id: 8 },
  { title: 'Practice', jobPost: 'Role', resumeText: null },
  { title: 'Practice', jobPost: 'Role', status: 'unknown' }
])('rejects invalid create input %j', async (body) => {
  expect((await request('POST', '', body)).status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});

test.each([{}, { userId: 8 }, { title: null }, { jobPost: '' }, { status: 'unknown' }])('rejects invalid partial edit %j', async (body) => {
  expect((await request('PATCH', '/12', body)).status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});

test('returns a safe error when database access fails', async () => {
  const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
  pool.query.mockRejectedValueOnce(new Error('private connection details'));
  try {
    expect(await request()).toEqual({ status: 500, data: { message: 'Could not load interview sessions' } });
  } finally { logged.mockRestore(); }
});
