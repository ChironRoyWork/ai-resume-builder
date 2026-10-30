import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./InterviewPrep.css";
import { apiFetch } from "../utils/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const emptyForm = { title: "", jobPost: "", resumeText: "", status: "draft" };
const MAX_CONTEXT = 25000;

export default function InterviewPrep({ authToken, initialJobPost = "", initialResumeText = "" }) {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [savedForm, setSavedForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const formId = useId();
  const lifecycle = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  const request = useCallback(async (path = "", options = {}) => {
    if (!authToken) throw new Error("Please log in to manage interview sessions.");
    const signal = lifecycle.current?.signal;
    const response = await apiFetch(`${API_URL}/api/interview-sessions${path}`, {
      ...options,
      signal,
      headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }
    });
    signal?.throwIfAborted();
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    signal?.throwIfAborted();
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }, [authToken]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request();
      if (!Array.isArray(data.sessions)) throw new Error("Could not read session history. Try Refresh again.");
      setSessions(data.sessions);
      setHistoryError("");
    } catch (error) {
      if (error.name !== "AbortError") setHistoryError(error.message);
      throw error;
    } finally {
      if (!lifecycle.current?.signal.aborted) setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    request().then((data) => {
      if (!controller.signal.aborted) {
        if (!Array.isArray(data.sessions)) throw new Error("Could not read session history. Try Refresh again.");
        setSessions(data.sessions);
        setHistoryError("");
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setHistoryError(error.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [request]);

  function notify(text, error = false) {
    setMessage(text);
    setIsError(error);
  }

  async function perform(action, task, successMessage, reloadHistory = false) {
    setBusy(action);
    notify("");
    try {
      await task();
      notify(successMessage);
      if (reloadHistory) {
        try {
          await refresh();
        } catch (error) {
          if (error.name !== "AbortError") {
            notify(`${successMessage} History could not refresh: ${error.message}`, true);
          }
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") notify(error.message, true);
    } finally {
      if (!lifecycle.current?.signal.aborted) setBusy("");
    }
  }

  function canReplaceForm() {
    return !dirty || window.confirm("Discard unsaved interview session changes?");
  }

  function resetForm() {
    setSelectedId(null);
    setForm(emptyForm);
    setSavedForm(emptyForm);
  }

  function newSession() {
    if (!canReplaceForm()) return;
    resetForm();
    notify("New session ready. You can copy your current resume and job description below.");
  }

  function useCurrentContext() {
    if (initialJobPost.length > MAX_CONTEXT || initialResumeText.length > MAX_CONTEXT) {
      notify("The current resume or job description exceeds 25,000 characters. Paste a shorter version below.", true);
      return;
    }
    if ((form.jobPost || form.resumeText) && !window.confirm("Replace this session's job description and resume context with your current application?")) return;
    setForm((current) => ({ ...current, jobPost: initialJobPost, resumeText: initialResumeText }));
    notify("Current resume and job description copied. Save the session to keep them.");
  }

  async function openSession(id) {
    if (!canReplaceForm()) return;
    await perform("Opening...", async () => {
      const { session } = await request(`/${id}`);
      const nextForm = { title: session.title, jobPost: session.job_post, resumeText: session.resume_text || "", status: session.status };
      setSelectedId(session.id);
      setForm(nextForm);
      setSavedForm(nextForm);
    }, "Session reopened.");
  }

  async function saveSession(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.jobPost.trim()) {
      notify("A session title and job description are required.", true);
      return;
    }
    if (form.title.length > 160 || form.jobPost.length > MAX_CONTEXT || form.resumeText.length > MAX_CONTEXT) {
      notify("Use a title of up to 160 characters and context fields of up to 25,000 characters each.", true);
      return;
    }
    await perform("Saving...", async () => {
      const { session } = await request(selectedId ? `/${selectedId}` : "", {
        method: selectedId ? "PATCH" : "POST", body: JSON.stringify(form)
      });
      const nextForm = { title: session.title, jobPost: session.job_post, resumeText: session.resume_text, status: session.status };
      setSelectedId(session.id);
      setForm(nextForm);
      setSavedForm(nextForm);
    }, selectedId ? "Session updated." : "Session created.", true);
  }

  async function deleteSession() {
    if (!selectedId || !window.confirm("Delete this interview session?")) return;
    await perform("Deleting...", async () => {
      await request(`/${selectedId}`, { method: "DELETE" });
      resetForm();
    }, "Session deleted.", true);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section id="interview-prep" className="app-card interview-prep" aria-labelledby="interview-heading">
      <header className="interview-prep-heading section-heading">
        <div>
          <span className="section-number">INTERVIEW PRACTICE</span>
          <h2 id="interview-heading">Interview Prep</h2>
          <p>Save a job description and resume context for each practice session. Questions and answer feedback are coming later.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={newSession} disabled={Boolean(busy)}>+ New session</button>
      </header>
      {message && <p role={isError ? "alert" : "status"} className={`interview-message ${isError ? "error" : ""}`}>{message}</p>}
      <div className="interview-layout">
        <aside className="interview-history" aria-label="Saved interview sessions" aria-busy={loading}>
          <div className="interview-history-heading">
            <h3>Saved sessions</h3>
            <button className="btn btn-outline btn-small" type="button" disabled={Boolean(busy) || loading}
              onClick={() => perform("Refreshing...", refresh, "Session history refreshed.")}>Refresh</button>
          </div>
          <p className="form-hint">Your 100 most recently updated sessions.</p>
          {loading && <p role="status">Loading sessions...</p>}
          {historyError && <p role="alert" className="interview-history-error">History could not load: {historyError} Use Refresh to try again.</p>}
          {!loading && !historyError && !sessions.length && <p>No interview sessions yet.</p>}
          {sessions.map((session) => (
            <button className={String(session.id) === String(selectedId) ? "selected" : ""}
              aria-pressed={String(session.id) === String(selectedId)} type="button" key={session.id}
              onClick={() => openSession(session.id)} disabled={Boolean(busy)}>
              <strong>{session.title}</strong>
              <small>{new Date(session.updated_at).toLocaleDateString()} · {session.status}</small>
              <small>{session.job_post_preview}</small>
            </button>
          ))}
        </aside>
        <form className="interview-form" onSubmit={saveSession} aria-label="Interview session editor">
          <fieldset disabled={Boolean(busy)}>
            <legend>{selectedId ? "Edit practice session" : "Create practice session"}</legend>
            <p role="status" className="form-hint">{dirty ? "Unsaved changes" : selectedId ? "All changes saved" : "New session"}</p>
            <button className="btn btn-secondary" type="button" onClick={useCurrentContext}
              disabled={!initialJobPost && !initialResumeText}>Use current resume and job</button>
            <p className="form-hint">Copies your current profile or reopened resume version. You can edit this copy before saving.</p>
            <div className="profile-field">
              <label htmlFor={`${formId}-title`}>Session title</label>
              <input id={`${formId}-title`} value={form.title} onChange={(e) => updateField("title", e.target.value)} maxLength={160} required placeholder="Frontend Engineer – Practice" />
            </div>
            <div className="profile-field">
              <label htmlFor={`${formId}-job`}>Job description</label>
              <textarea id={`${formId}-job`} rows={8} value={form.jobPost} onChange={(e) => updateField("jobPost", e.target.value)} maxLength={MAX_CONTEXT} required placeholder="Paste the job description" />
              <span className="form-hint">{form.jobPost.length.toLocaleString()} / 25,000 characters</span>
            </div>
            <div className="profile-field">
              <label htmlFor={`${formId}-resume`}>Resume context (optional)</label>
              <textarea id={`${formId}-resume`} rows={6} value={form.resumeText} onChange={(e) => updateField("resumeText", e.target.value)} maxLength={MAX_CONTEXT} placeholder="Paste resume text or copy your current resume above" />
              <span className="form-hint">{form.resumeText.length.toLocaleString()} / 25,000 characters</span>
            </div>
            <div className="profile-field">
              <label htmlFor={`${formId}-status`}>Status</label>
              <select id={`${formId}-status`} value={form.status} onChange={(e) => updateField("status", e.target.value)}>
                <option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option>
              </select>
            </div>
            <div className="interview-actions">
              <button className="btn btn-primary" type="submit">{busy || (selectedId ? "Save changes" : "Create session")}</button>
              {selectedId && <button className="btn interview-delete" type="button" onClick={deleteSession}>Delete session</button>}
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
