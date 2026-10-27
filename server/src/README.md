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

The application uses four PostgreSQL tables:

- `users`
- `profiles`
- `ai_usage`
- `saved_versions`

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

Run `npm test -- --runInBand` from the `server` folder to execute the existing automated parser tests.

Run `npm run lint` and `npm run build` from the `client` folder to check the frontend.

End-to-end testing is also required for authentication, profile persistence, AI generation, saved versions, account isolation, and PDF export.

## Limitations

- PDF export uses the browser's printing functionality.
- Long resume content may require additional pages.
- AI output should be reviewed by the user before submitting job applications.
- Local setup requires valid database and Gemini API credentials.
- Public deployment requires production configuration, additional security review, and operational testing.

## Project Status

Final Week 4 implementation and validation. Completion is confirmed after all required tests pass.