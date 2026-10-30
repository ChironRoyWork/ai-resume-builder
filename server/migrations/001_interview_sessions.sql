-- Review and run in the matching DEVELOPMENT branch/database in Neon's SQL Editor.
-- See docs/INTERVIEW_PREP_SETUP.md. Production requires explicit approval.
-- Existing resume tables are unchanged; users(id) must already exist.
BEGIN;
CREATE TABLE IF NOT EXISTS interview_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL CHECK (char_length(trim(title)) > 0),
    job_post TEXT NOT NULL CHECK (char_length(trim(job_post)) > 0),
    resume_text TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS interview_sessions_user_updated_idx ON interview_sessions(user_id, updated_at DESC, id DESC);
COMMIT;
