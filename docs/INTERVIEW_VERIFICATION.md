# Interview integration verification - October 29, 2026

## Changes in this revision

- A shared authenticated-request signal opens a focused sign-in dialog when the server rejects a stored token. Invalid login credentials remain a login error rather than retriggering the global flow.
- Same-account token renewal preserves open interview and profile edits; an explicit account switch clears the old user's data. Keyboard focus stays in the sign-in dialog, and the background is inert while it is open.
- Session history distinguishes loading, empty results, and request failures. Refresh recovers from failures without implying that a failed request means there are no sessions.
- Interview forms show unsaved/saved state, protect browser navigation when dirty, and display job/resume character counts.
- Authentication middleware requires Bearer tokens, validates HS256 signatures and the owner claim, and reports structured authentication error codes.
- JSON parsing allows 512 KB, accommodating two permitted 25,000-character Unicode context fields. Invalid or oversized JSON receives a readable error. PORT can optionally be configured.

## Local checks

Run from `server`: `npm test -- --runInBand`.

Run from `client`: `npm run lint`, `npm run build`, and `node --test tests/*.test.mjs`.

The backend suite uses a mocked database and never loads server/.env. The frontend utility tests do not contact the backend. Expanded browser testing during this revision uses the app's real session/authentication controllers with synthetic users and a separate disk-backed PostgreSQL/WASM database; it does not contact Neon or Gemini.

Results: 75 backend tests, 6 frontend utility tests, and 21 isolated browser/database scenarios passed. The local migration was applied twice successfully, persisted records survived database/API restart, real password verification recovered an expired sign-in, and another account could not read/update/delete the first account's sessions. Desktop/mobile screenshots were inspected.

## Manual development Neon check

1. In Neon, select the intended project, development branch, and application database. Do not rely on the SQL database name to identify the Neon branch.
2. Review and run `server/migrations/001_interview_sessions.sql` in the SQL Editor. See `INTERVIEW_PREP_SETUP.md` for preflight and post-migration queries.
3. Set local server/.env DATABASE_URL to that same development branch and restart the backend. Credentials are not changed by this revision.
4. Log in and create a fictional test session. Refresh, reopen, edit, restart the backend, and verify the saved values.
5. Copy a reopened saved resume into a session. Check the original snapshot and profile remain unchanged.
6. Log out, use a second test account, and verify separate history and denial of the first account's record IDs.
7. Return to the first account, test cancellation and deletion, and remove the fictional session when finished.

No remote migration or live Neon write was performed by this revision. There is no automatic migration on startup. Production migration requires explicit approval.
