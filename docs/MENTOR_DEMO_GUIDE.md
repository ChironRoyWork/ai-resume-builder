# ResumeAI - mentor meeting and demo guide

## A short introduction you can say

"ResumeAI helps a job applicant maintain a structured profile, tailor resume bullets and a cover letter to a job, save application versions, and print a resume. I am extending it into interview preparation by reusing the job and resume context. The current interview feature manages private practice sessions. AI interview questions and answer feedback are the next stage."

## What is implemented

- Structured profile editing for contact details, skill groups, education, jobs, and projects, alongside legacy summary fields.
- Existing Gemini resume/cover-letter generation, editable output, saved application snapshots, resume preview, and browser PDF printing.
- Interview session creation, history, reopening, partial updates, status changes, and deletion through protected API routes.
- Explicit copying of the current resume/job or a reopened saved application into an independent session snapshot.
- Sign-in recovery after an authenticated request returns 401. Signing back into the same account preserves current profile and interview edits. A different account requires confirmation and clears the previous account's work.
- Distinct loading, empty, and error states; history refresh; unsaved-change indicators and browser-leave warnings; visible context-length counts; responsive layout and keyboard focus handling.

Neon setup is manual: apply the supplied migration to development and use that branch's connection string locally before the live database demonstration. Local verification has used an isolated PostgreSQL/WASM engine, not the user's Neon project. Existing Gemini calls have not been exercised in this change.

## Architecture and why the parts are separate

| Part | Responsibility | Reason |
| --- | --- | --- |
| React/Vite browser app | Forms, editing, history, preview, and user feedback | Keeps interactive state close to the interface. |
| Express routes and controllers | Validation, token verification, owner checks, and SQL operations | The browser cannot decide which user's records it may access. |
| Neon PostgreSQL | Durable profiles, application snapshots, usage records, and interview sessions | Relationships and database constraints protect data consistency. |
| Gemini, called by the backend | Existing resume/cover-letter generation | API credentials stay on the server; interview CRUD works without an AI call. |

The normal path is browser -> authenticated Express endpoint -> PostgreSQL -> JSON response -> updated interface. AI generation is a separate backend path.

## Design choices to explain

| Choice | Explanation for your mentor | Tradeoff or next improvement |
| --- | --- | --- |
| Reuse the current dashboard and visual theme | Interview Prep uses the same typography, indigo actions, cards, and spacing, so the extension feels part of the existing app. | The page is getting long; separate pages or tabs may help as the feature grows. |
| History beside the editor | Users can choose a session while keeping its editing context visible. The columns stack on mobile. | History currently returns the latest 100 sessions; pagination is a future extension. |
| Explicit "Use current resume and job" | The user chooses when to copy context. Later profile edits do not silently rewrite an existing interview session. | Copying text duplicates data, but preserves the context used for a particular practice session. |
| Preserve structured profile and saved-version snapshots | A reopened application keeps its own education, projects, jobs, dates, and selected-job bullets. | Snapshot validation and future schema evolution need continued care. |
| Short-lived JWT plus sign-in recovery | The existing login issues a one-hour signed token. Expiry still ends authorization, while a focused sign-in dialog avoids discarding ongoing edits. | Tokens remain in localStorage as in the existing app; secure HttpOnly cookies and a deliberate renewal design are production improvements. |
| Stable account key in React | Renewing the same user's token does not remount the interview editor. Switching users resets the editor. | The decoded client-side identity only controls interface state; server verification remains authoritative. |
| Owner checks in every record query | Queries use both session ID and verified user ID. Another user's session gets the same 404 as an unknown ID. | Database access is currently enforced by application queries rather than database row-level policies. |
| Validation in more than one layer | Browser constraints guide input, controllers reject invalid requests, and database constraints enforce required relationships and statuses. | All layers must stay aligned when requirements change. |
| Separate save result from history refresh | A successful save is still reported as successful if reloading the list fails. The user can refresh rather than create a duplicate. | An interrupted network write can still have an uncertain result; verify history before retrying. |
| Resume-only printing | Existing print CSS hides dashboard controls and prints the formatted resume on US Letter paper. | Browser printing differs across environments; check the mentor's browser and long resumes. |

The backend now checks the Bearer scheme, HS256 signatures, expiry, and a usable owner claim. Its JSON request limit accommodates the allowed multi-byte context text. Malformed or oversized JSON receives a readable response.

## An 8-minute demo sequence

1. **Before the meeting:** run the migration on development, set the local development DATABASE_URL, restart both apps, log in, and verify a fresh session once. Use a fictional candidate and job. Keep both a normal account and a second test account ready.
2. **0:00-1:00 - Introduce the problem.** Show the structured profile and describe why candidates need a consistent source of resume facts.
3. **1:00-2:00 - Show existing application output.** Reopen a saved application, point out the selected job's tailored bullets, and show the resume preview. Use an existing saved version to avoid depending on a live Gemini call during the core demo.
4. **2:00-4:00 - Show Interview Prep.** Create a titled session, copy the resume and job, edit the copied context, save, refresh, and reopen it. Change status from draft to active or completed.
5. **4:00-5:00 - Explain data protection.** Show the authenticated route and the SQL condition `WHERE id = $1 AND user_id = $2`. Use the second account to show that the first account's history is absent.
6. **5:00-6:00 - Show resilience.** Point out the unsaved indicator, discard confirmation, and character counts. Explain the sign-in recovery flow; use the prepared example screenshot instead of waiting an hour for a token to expire.
7. **6:00-7:00 - Show responsive layout and PDF.** Narrow the browser to show stacked history/editor, then open print preview and confirm that only the resume appears.
8. **7:00-8:00 - Discuss evidence and next steps.** Explain the tests, the remaining Neon verification, and the next stage: grounded question generation, then answers and feedback.

## Test evidence and honest boundaries

- Backend unit/HTTP suite: 75 passing tests, including owner filtering, expired and malformed tokens, Bearer handling, validation, and CRUD behavior.
- Frontend utilities: 6 passing tests for API recovery signals, account identity, connection errors, and resume context copying. Lint and production build pass.
- 21 isolated browser/database scenarios pass using real app session/authentication controllers and a local disk-backed PostgreSQL/WASM database. They include rerunning the SQL, maximum-length Unicode, registration/login, account isolation, restart persistence, expired-token recovery, preserved edits, cancellation, mobile layout, and resume-only print visibility.
- These checks do not verify Neon networking, Neon project/branch selection, SSL configuration, multi-user database concurrency, live Gemini output, or all long-resume pagination cases. Complete the development Neon check before saying that the deployed database workflow is demonstrated.
- Screenshots prepared with this guide use synthetic local test data. They illustrate the verified interface, not a production deployment.

## Questions to invite from your mentor

- Is the history/editor arrangement clear, or should the growing application use separate pages?
- Which interview-question types and feedback criteria provide the most value for the first AI iteration?
- Should sessions remain independent snapshots, or also link back to the saved application they came from?
- What level of authentication renewal, database concurrency protection, and deployment testing is appropriate for the next milestone?
