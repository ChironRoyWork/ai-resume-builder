# ResumeAI — AI Resume & Cover Letter Builder

## Project Overview

ResumeAI is a full-stack web application that helps job applicants generate tailored resume bullet points and cover letters using AI. Users can maintain professional profiles, customize generated content, save multiple application versions, and export formatted resumes as PDFs.

## Technology Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **Database:** Neon PostgreSQL
- **Authentication:** JSON Web Tokens (JWT) and bcrypt
- **AI:** Google Gemini API

## Features

- User registration and login
- Secure password hashing and JWT-protected routes
- Create, update, and retrieve professional profiles
- Generate four tailored resume bullet points and a cover letter
- Edit AI-generated content
- Save and reopen application versions
- Live resume preview
- US Letter resume PDF export through browser printing
- Responsive dashboard interface
- Daily AI generation limit
- Private interview practice sessions with editable job/resume context and history (Week 1)

## Local Setup

### Backend

1. Navigate to the `server` folder.
2. Run `npm install`.
3. Create a `.env` file with the required configuration.
4. Run `npm run dev`.

Backend environment variables:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — Secret for signing authentication tokens
- `GEMINI_API_KEY` — Google Gemini API key
- `CLIENT_ORIGIN` — Optional permitted frontend origin

The backend runs on `http://localhost:5000`.

### Frontend

1. Navigate to the `client` folder.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the URL displayed by Vite, normally `http://localhost:5173`.

Optional frontend environment variable:

- `VITE_API_URL` — Backend API base URL

## Database Requirements

The application uses five PostgreSQL tables after the Interview Prep migration:

- `users`
- `profiles`
- `ai_usage`
- `saved_versions`
- `interview_sessions`

The database must be initialized with the appropriate tables, relationships, and unique constraints before running the application.

## Application Workflow

1. Register an account and log in.
2. Create and save a professional profile.
3. Paste a job description.
4. Generate tailored resume bullet points and a cover letter.
5. Review and edit the generated content.
6. Save the application version.
7. Reopen saved versions whenever needed.
8. Preview and export the resume using the browser's Save as PDF feature.

## Testing

Run `npm test -- --runInBand` from the `server` folder to execute the parser, interview validation, and authenticated interview-route tests. Interview-route tests use a mocked database and do not contact Neon.

Run `npm run lint` and `npm run build` from the `client` folder to check the frontend.

Run `node --test tests/*.test.mjs` from `client` to check structured resume copying, account identity, and authentication recovery signals.

End-to-end testing is also required for authentication, profile persistence, AI generation, saved versions, account isolation, and PDF export.

## Limitations

- PDF export uses the browser's printing functionality.
- Long resume content may require additional pages.
- AI output should be reviewed by the user before submitting job applications.
- Local setup requires valid database and Gemini API credentials.
- Public deployment requires production configuration, additional security review, and operational testing.

## Project Status

Final Week 4 implementation and validation. Completion is confirmed after all required tests pass.

## Interview Prep — Week 1

The logged-in dashboard now includes interview-session history and a form to create, reopen, edit, and delete sessions. Use **Use current resume and job** to copy the current application, including a reopened resume version. This foundation does not generate interview questions or answer feedback yet.

See [`docs/INTERVIEW_PREP_SETUP.md`](../../docs/INTERVIEW_PREP_SETUP.md) for the API contract, local checks, and the Neon SQL Editor workflow for `server/migrations/001_interview_sessions.sql`. Apply it to a development branch/database first. No migration runs automatically, and production changes require explicit user approval.

Authenticated requests now offer a sign-in recovery dialog. Signing back into the same account preserves current edits; switching accounts clears the previous account's work. History includes separate loading/error/empty states, and the session form shows unsaved status and context-length counts.

See the [mentor demo guide](../../docs/MENTOR_DEMO_GUIDE.md) for architecture, design choices, tradeoffs, and the demonstration sequence, and the [verification record](../../docs/INTERVIEW_VERIFICATION.md) for test results and remaining live Neon checks. `PORT` optionally overrides the backend's default port 5000.
