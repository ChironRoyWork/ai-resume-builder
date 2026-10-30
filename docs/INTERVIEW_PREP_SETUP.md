# Interview Prep — Week 1 local integration

This integrates the downloaded `ResumeAI_InterviewPrep_Week1.zip` into the current local app. Week 1 provides private session history and create/open/edit/delete operations, with an optional resume copy. AI questions and answer feedback are future work.

The structured profile editor, selected-job tailoring, saved resume snapshots, and resume preview/printing remain in place. In Interview Prep, **Use current resume and job** copies the current application into the session; it does not save or modify the professional profile. Reopening a saved application first also lets you copy that version's resume and tailored bullets. Later profile edits do not overwrite a saved interview session.

## Apply the SQL in Neon

The SQL file lives at `server/migrations/001_interview_sessions.sql`. Keeping it in the project records the schema change; **Neon's SQL Editor is where you can execute it**. The app does not run migrations on startup.

No migration has been run by this integration. Do not run it on a production branch without the user's explicit approval. The downloaded package's instruction to use production has been replaced by the development workflow below.

1. Open the [Neon Console](https://console.neon.tech) and select the project used by this app. In that project's **Connect** dialog, compare its database and endpoint with the local `server/.env` `DATABASE_URL`. Do not share the full URL or password. The locally inspected configuration uses database **`neondb`** and endpoint **`ep-winter-fire-b4n1a7e4`** (the configured host includes `-pooler`). The URL alone does not reveal the human-readable project or branch name, so verify those in the Console rather than guessing.
2. Select an existing development/test branch with the app's schema, or create a child branch from the app's current branch using **Branches → New branch**. For example, name it `interview-prep-dev`. A child branch isolates its schema and data changes from its parent. Do not reset an existing branch.
3. Open **Postgres database → SQL Editor**. Explicitly select that **development branch** and database **`neondb`**, or the actual application database if its configuration has changed. Confirm the selected database has the existing `users`, `profiles`, `ai_usage`, and `saved_versions` tables. The new table references `users(id)`; it is not a standalone database initialization script.
4. Before making changes, run this read-only check in the editor:

   ```sql
   SELECT current_database(), current_user;
   SELECT to_regclass('public.users') AS users,
          to_regclass('public.profiles') AS profiles,
          to_regclass('public.saved_versions') AS saved_versions;
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'users'
     AND column_name = 'id';
   ```

   If tables are missing, stop and select the correct branch/database. This migration expects the app's existing schema and an integer-compatible `users.id`. `current_database()` confirms the database, not the Neon branch; verify the branch in the Console selector and Connect dialog too.
5. Open `server/migrations/001_interview_sessions.sql` in VS Code. Copy its **entire contents**, including `BEGIN` and `COMMIT`, into the SQL Editor and click **Run**. It creates only `interview_sessions` and its owner/history index. Existing resume tables are unchanged. If an error leaves the editor connection in a failed transaction, issue `ROLLBACK;`, fix the cause, then retry. `IF NOT EXISTS` permits reruns but does not repair a preexisting table with an incompatible shape.
6. Verify the result on the same branch/database:

   ```sql
   SELECT to_regclass('public.interview_sessions') AS interview_sessions;
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'interview_sessions'
   ORDER BY ordinal_position;
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'interview_sessions';
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'public.interview_sessions'::regclass;
   ```

7. In **Connect**, choose the same development branch, database, and application role. Copy that development connection string into local `server/.env` as `DATABASE_URL`, keeping the old value privately if you need to restore it. A new branch has its own endpoint; the local server must connect to the branch where you applied the SQL. Keep the existing SSL configuration. Restart the backend after changing `.env`.
8. Start both apps as usual: `npm run dev` in `server`, and `npm run dev` in `client`. Log in, use the new **Interview Prep** navigation link, and complete the persistence checks below.

A production rollout is a separate step. Review and test on development first, then obtain explicit approval for the exact production project/branch/database before applying the same migration there. Do not point the local app at production merely to make this feature work.

Official Neon references: [SQL Editor](https://neon.com/docs/get-started/query-with-neon-sql-editor) and [branches and connection selection](https://neon.com/docs/manage/branches).

## API

Every endpoint requires the existing JWT in `Authorization: Bearer <token>`. Ownership comes from the verified token; the client cannot supply an owner. Reads, edits, and deletes for another account or a missing session return the same 404.

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/interview-sessions` | Create; 201 with `{ session }` |
| GET | `/api/interview-sessions` | Latest 100 for this account, ordered by update time and ID; `{ sessions }` |
| GET | `/api/interview-sessions/:id` | Open; `{ session }` |
| PATCH | `/api/interview-sessions/:id` | Edit supplied fields; `{ session }` |
| DELETE | `/api/interview-sessions/:id` | Delete; empty 204 |

Create accepts `{ title, jobPost, resumeText?, status? }`. Title and job description are required nonblank text; limits are 160 characters for title and 25,000 each for job/resume context. `status` is `draft`, `active`, or `completed`; the default is `draft`. Patch requires at least one supported field. Resume context can be cleared with an empty string. Unknown fields are rejected.

## Verification

No new runtime dependencies are needed.

- In `server`: `npm test -- --runInBand`.
- In `client`: `npm run lint`, `npm run build`, and `node --test tests/interviewResumeContext.test.mjs`.
- Backend automated tests cover validation, all five protected routes, expired/invalid tokens, parameterized queries, owner filtering, 404 behavior, partial edits, and deletion. They mock the database and do not load `.env` or contact Neon.
- Resume-copy tests cover structured sections, filtered job indices, selected-job bullets, legacy profiles, and non-mutation of the source snapshot.

After applying the migration to development, verify real database persistence: create a session, refresh the page, reopen it, change the title/status/context, save, and refresh again. Confirm it survives a backend restart. Log in as a second account and confirm it cannot see the first account's history or open/edit/delete its session ID; switch back and delete the test session. Reopen a saved application and confirm the resume preview, selected-job bullets, and PDF output remain correct.

Until the development migration is applied, interview-session requests will report an error; the existing profile and resume features continue using their current tables. Automated tests and isolated browser checks do not replace the real Neon persistence check.
