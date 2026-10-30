const pool = require('../db');

const MAX_TITLE = 160;
const MAX_JOB = 25000;
const MAX_RESUME = 25000;
const STATUSES = new Set(['draft', 'active', 'completed']);

function validateSession(body, isUpdate = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Invalid request body';
  const permitted = ['title', 'jobPost', 'resumeText', 'status'];
  if (Object.keys(body).some((key) => !permitted.includes(key))) return 'Unrecognized session field';
  if (!isUpdate && (body.title === undefined || body.jobPost === undefined)) return 'Title and job description are required';
  if (isUpdate && Object.keys(body).length === 0) return 'Provide at least one field';
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim() || body.title.length > MAX_TITLE)) return 'Title must be 1-160 characters';
  if (body.jobPost !== undefined && (typeof body.jobPost !== 'string' || !body.jobPost.trim() || body.jobPost.length > MAX_JOB)) return 'Job description must be 1-25000 characters';
  if (body.resumeText !== undefined && (typeof body.resumeText !== 'string' || body.resumeText.length > MAX_RESUME)) return 'Resume text must be 25000 characters or fewer';
  if (body.status !== undefined && !STATUSES.has(body.status)) return 'Invalid session status';
  return null;
}

function parseId(req, res) {
  const id = req.params.id;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    res.status(400).json({ message: 'Invalid session ID' });
    return null;
  }
  return id;
}

async function createSession(req, res) {
  const error = validateSession(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const { title, jobPost, resumeText = '', status = 'draft' } = req.body;
    const result = await pool.query(
      `INSERT INTO interview_sessions (user_id, title, job_post, resume_text, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.userId, title.trim(), jobPost.trim(), resumeText, status]
    );
    return res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error('Create interview session failed:', err);
    return res.status(500).json({ message: 'Could not create interview session' });
  }
}

async function listSessions(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, title, status, LEFT(job_post, 160) AS job_post_preview,
              created_at, updated_at
       FROM interview_sessions WHERE user_id = $1
       ORDER BY updated_at DESC, id DESC LIMIT 100`,
      [req.user.userId]
    );
    return res.json({ sessions: result.rows });
  } catch (err) {
    console.error('List interview sessions failed:', err);
    return res.status(500).json({ message: 'Could not load interview sessions' });
  }
}

async function getSession(req, res) {
  const id = parseId(req, res);
  if (!id) return;
  try {
    const result = await pool.query(
      'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Session not found' });
    return res.json({ session: result.rows[0] });
  } catch (err) {
    console.error('Get interview session failed:', err);
    return res.status(500).json({ message: 'Could not load interview session' });
  }
}

async function updateSession(req, res) {
  const id = parseId(req, res);
  if (!id) return;
  const error = validateSession(req.body, true);
  if (error) return res.status(400).json({ message: error });
  const fields = { title: 'title', jobPost: 'job_post', resumeText: 'resume_text', status: 'status' };
  const entries = Object.entries(req.body);
  const setters = entries.map(([key], i) => `${fields[key]} = $${i + 3}`);
  const values = entries.map(([key, value]) => key === 'title' || key === 'jobPost' ? value.trim() : value);
  try {
    const result = await pool.query(
      `UPDATE interview_sessions SET ${setters.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.userId, ...values]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Session not found' });
    return res.json({ session: result.rows[0] });
  } catch (err) {
    console.error('Update interview session failed:', err);
    return res.status(500).json({ message: 'Could not update interview session' });
  }
}

async function deleteSession(req, res) {
  const id = parseId(req, res);
  if (!id) return;
  try {
    const result = await pool.query(
      'DELETE FROM interview_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Session not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('Delete interview session failed:', err);
    return res.status(500).json({ message: 'Could not delete interview session' });
  }
}

module.exports = { createSession, listSessions, getSession, updateSession, deleteSession, validateSession };
