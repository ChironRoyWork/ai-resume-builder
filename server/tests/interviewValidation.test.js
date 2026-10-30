const { validateSession } = require('../src/controllers/interviewSessionController');

jest.mock('../src/db', () => ({ query: jest.fn() }));

describe('interview session validation', () => {
  test('allows required fields', () => expect(validateSession({ title: 'Practice', jobPost: 'Engineer role' })).toBeNull());
  test('requires job posting', () => expect(validateSession({ title: 'Practice' })).toBeTruthy());
  test('rejects whitespace titles', () => expect(validateSession({ title: ' ', jobPost: 'Engineer role' })).toBeTruthy());
  test('rejects invalid status', () => expect(validateSession({ title: 'Practice', jobPost: 'Engineer', status: 'other' })).toBeTruthy());
  test('rejects unknown properties', () => expect(validateSession({ title: 'Practice', jobPost: 'Engineer', userId: 9 })).toBeTruthy());
  test('accepts partial edits', () => expect(validateSession({ title: 'Updated' }, true)).toBeNull());
  test('rejects empty edits', () => expect(validateSession({}, true)).toBeTruthy());
  test('rejects non-text resume', () => expect(validateSession({ title: 'Practice', jobPost: 'Engineer', resumeText: [] })).toBeTruthy());
  test.each([null, undefined, [], 'text', 12])('rejects a non-object body: %j', (body) => {
    expect(validateSession(body)).toBeTruthy();
  });
  test.each(['draft', 'active', 'completed'])('accepts status %s', (status) => {
    expect(validateSession({ status }, true)).toBeNull();
  });
  test('accepts maximum field lengths', () => {
    expect(validateSession({ title: 'a'.repeat(160), jobPost: 'a'.repeat(25000), resumeText: 'a'.repeat(25000) })).toBeNull();
  });
  test.each(['title', 'jobPost', 'resumeText'])('rejects oversized %s', (field) => {
    expect(validateSession({ title: 'Practice', jobPost: 'Engineer', [field]: 'a'.repeat(field === 'title' ? 161 : 25001) })).toBeTruthy();
  });
});
