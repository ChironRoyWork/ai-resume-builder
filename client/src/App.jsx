
import { useEffect, useState } from "react";
import ResumePreview from "./components/ResumePreview";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  // Authentication
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("token")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Feedback
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Profile
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");

  // Generation
  const [jobPost, setJobPost] = useState("");
  const [resumePoints, setResumePoints] = useState([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Saved versions
  const [savedVersions, setSavedVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const isLoggedIn = Boolean(authToken);
  const hasResume = resumePoints.length === 4;

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const readResponse = async (response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || `Request failed (${response.status})`
      );
    }

    return data;
  };

  const clearUserData = () => {
    setName("");
    setSkills("");
    setExperience("");
    setJobPost("");
    setResumePoints([]);
    setCoverLetter("");
    setSavedVersions([]);
    setSelectedVersionId(null);
  };

  // Signup
  const handleSignup = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      await readResponse(response);

      setEmail("");
      setPassword("");

      showMessage(
        "Account created successfully! You can now log in.",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  // Login
  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
          }),
        }
      );

      const data = await readResponse(response);

      if (!data.token) {
        throw new Error("No authentication token returned.");
      }

      clearUserData();

      localStorage.setItem("token", data.token);
      setAuthToken(data.token);

      setLoginPassword("");

      showMessage("Logged in successfully!", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  // Load profile
  const loadProfile = async (token = authToken) => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_URL}/api/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readResponse(response);

      setName(data.profile?.name || "");
      setSkills(data.profile?.skills || "");
      setExperience(data.profile?.experience || "");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  // Load profile when authenticated
  useEffect(() => {
    if (!authToken) return;

    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/profile`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        const data = await readResponse(response);

        if (!cancelled) {
          setName(data.profile?.name || "");
          setSkills(data.profile?.skills || "");
          setExperience(data.profile?.experience || "");
        }
      } catch (error) {
        if (!cancelled) {
          showMessage(error.message, "error");
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  // Save profile
  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Please log in first.", "error");
      return;
    }

    setIsSavingProfile(true);

    try {
      const response = await fetch(
        `${API_URL}/api/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            name,
            skills,
            experience,
          }),
        }
      );

      await readResponse(response);

      showMessage("Profile saved successfully!", "success");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // AI generation
  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Please log in first.", "error");
      return;
    }

    if (!jobPost.trim()) {
      showMessage("Please enter a job description.", "error");
      return;
    }

    setIsGenerating(true);
    showMessage("Generating your application content...");

    try {
      const response = await fetch(
        `${API_URL}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ jobPost }),
        }
      );

      const data = await readResponse(response);

      if (
        !Array.isArray(data.resumePoints) ||
        data.resumePoints.length !== 4 ||
        data.resumePoints.some(
          (point) =>
            typeof point !== "string" || !point.trim()
        ) ||
        typeof data.coverLetter !== "string" ||
        !data.coverLetter.trim()
      ) {
        throw new Error("Invalid AI response received.");
      }

      setResumePoints(data.resumePoints);
      setCoverLetter(data.coverLetter);
      setSelectedVersionId(null);

      showMessage(
        "Your resume points and cover letter are ready!",
        "success"
      );

      document.getElementById("editor")?.scrollIntoView({
        behavior: "smooth",
      });
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit resume points
  const handleResumePointChange = (index, value) => {
    setResumePoints((previous) =>
      previous.map((point, i) =>
        i === index ? value : point
      )
    );
  };

  // Load saved versions
  const loadSavedVersions = async (
    token = authToken,
    showSuccess = true
  ) => {
    if (!token) {
      showMessage("Please log in first.", "error");
      return false;
    }

    setIsLoadingVersions(true);

    try {
      const response = await fetch(
        `${API_URL}/api/versions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readResponse(response);

      setSavedVersions(data.versions || []);

      if (showSuccess) {
        showMessage("Saved versions loaded!", "success");
      }

      return true;
    } catch (error) {
      showMessage(error.message, "error");
      return false;
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Save current version
  const handleSaveVersion = async () => {
    if (!authToken) {
      showMessage("Please log in first.", "error");
      return;
    }

    if (
      !jobPost.trim() ||
      resumePoints.length !== 4 ||
      resumePoints.some(
        (point) =>
          typeof point !== "string" || !point.trim()
      ) ||
      !coverLetter.trim()
    ) {
      showMessage(
        "A job description, four resume points, and a cover letter are required.",
        "error"
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            jobPost,
            resumePoints,
            coverLetter,
          }),
        }
      );

      const data = await readResponse(response);

      setSelectedVersionId(data.version?.id || null);

      const refreshed = await loadSavedVersions(
        authToken,
        false
      );

      if (refreshed) {
        showMessage(
          "Resume version saved successfully!",
          "success"
        );
      } else {
        showMessage(
          "Version saved, but the list could not be refreshed.",
          "error"
        );
      }
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Reopen version
  const handleReopenVersion = (version) => {
    if (
      typeof version.job_post !== "string" ||
      !Array.isArray(version.resume_points) ||
      version.resume_points.length !== 4 ||
      version.resume_points.some(
        (point) => typeof point !== "string"
      ) ||
      typeof version.cover_letter !== "string"
    ) {
      showMessage("Invalid saved version.", "error");
      return;
    }

    setJobPost(version.job_post);
    setResumePoints([...version.resume_points]);
    setCoverLetter(version.cover_letter);
    setSelectedVersionId(version.id);

    showMessage(
      `Saved version #${version.id} reopened.`,
      "success"
    );

    setTimeout(() => {
      document.getElementById("editor")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 0);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuthToken(null);

    clearUserData();

    setLoginEmail("");
    setLoginPassword("");

    showMessage("Logged out successfully.", "success");
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">R</div>

            <div>
              <h1>ResumeAI</h1>
              <span>AI Resume & Cover Letter Builder</span>
            </div>
          </div>

          {isLoggedIn && (
            <nav className="app-nav">
              <a href="#profile">Profile</a>
              <a href="#generate">Generate</a>
              <a href="#versions">Saved Versions</a>

              <button
                className="btn btn-outline btn-small"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="app-main">
        {/* Feedback */}
        {message && (
          <div className={`status-message ${messageType}`}>
            <span>{message}</span>

            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
              className="dismiss-button"
            >
              ×
            </button>
          </div>
        )}

        {/* Authentication */}
        {!isLoggedIn && (
          <section className="auth-section">
            <div className="hero">
              <span className="eyebrow">
                YOUR CAREER, POWERED BY AI
              </span>

              <h2>Build better applications, faster.</h2>

              <p>
                Create tailored resume points and cover
                letters, edit your results, and save
                multiple versions in one place.
              </p>
            </div>

            <div className="auth-grid">
              <div className="app-card">
                <div className="card-heading">
                  <h3>Welcome back</h3>
                  <p>Log in to continue your work.</p>
                </div>

                <form
                  onSubmit={handleLogin}
                  className="app-form"
                >
                  <label htmlFor="login-email">
                    Email address
                  </label>

                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) =>
                      setLoginEmail(e.target.value)
                    }
                    required
                  />

                  <label htmlFor="login-password">
                    Password
                  </label>

                  <input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) =>
                      setLoginPassword(e.target.value)
                    }
                    required
                  />

                  <button className="btn btn-primary">
                    Log In
                  </button>
                </form>
              </div>

              <div className="app-card">
                <div className="card-heading">
                  <h3>Create an account</h3>
                  <p>Get started with your profile.</p>
                </div>

                <form
                  onSubmit={handleSignup}
                  className="app-form"
                >
                  <label htmlFor="signup-email">
                    Email address
                  </label>

                  <input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    required
                  />

                  <label htmlFor="signup-password">
                    Password
                  </label>

                  <input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />

                  <button className="btn btn-secondary">
                    Create Account
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* Logged-in dashboard */}
        {isLoggedIn && (
          <>
            <section className="dashboard-intro">
              <div>
                <span className="eyebrow">
                  YOUR WORKSPACE
                </span>

                <h2>
                  {name
                    ? `Welcome back, ${name}`
                    : "Welcome to your workspace"}
                </h2>

                <p>
                  Manage your profile, generate tailored
                  application content, and keep track
                  of your saved versions.
                </p>
              </div>

              <div className="dashboard-stats">
                <div className="stat-card">
                  <strong>{savedVersions.length}</strong>
                  <span>Versions loaded</span>
                </div>

                <div className="stat-card">
                  <strong>{hasResume ? "Ready" : "—"}</strong>
                  <span>Resume preview</span>
                </div>
              </div>
            </section>

            {/* Profile */}
            <section id="profile" className="app-card">
              <div className="section-heading">
                <div>
                  <span className="section-number">01</span>
                  <h2>Professional Profile</h2>
                  <p>
                    This information helps the AI tailor
                    your application materials.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSaveProfile}
                className="app-form"
              >
                <label htmlFor="profile-name">
                  Full name
                </label>

                <input
                  id="profile-name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter your full name"
                />

                <label htmlFor="profile-skills">
                  Skills
                </label>

                <textarea
                  id="profile-skills"
                  value={skills}
                  onChange={(e) =>
                    setSkills(e.target.value)
                  }
                  rows={3}
                  placeholder="React, Node.js, PostgreSQL..."
                />

                <label htmlFor="profile-experience">
                  Professional experience
                </label>

                <textarea
                  id="profile-experience"
                  value={experience}
                  onChange={(e) =>
                    setExperience(e.target.value)
                  }
                  rows={7}
                  placeholder="Describe your work experience..."
                />

                <div className="button-row">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile
                      ? "Saving..."
                      : "Save Profile"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => loadProfile()}
                  >
                    Reload Profile
                  </button>
                </div>
              </form>
            </section>

            {/* Generate */}
            <section id="generate" className="app-card">
              <div className="section-heading">
                <div>
                  <span className="section-number">02</span>
                  <h2>Generate Application Content</h2>
                  <p>
                    Paste a job description to generate
                    tailored resume points and a cover letter.
                  </p>
                </div>

                <span className="info-pill">
                  5 generations / day
                </span>
              </div>

              <form
                onSubmit={handleGenerate}
                className="app-form"
              >
                <label htmlFor="job-post">
                  Job description
                </label>

                <textarea
                  id="job-post"
                  value={jobPost}
                  onChange={(e) =>
                    setJobPost(e.target.value)
                  }
                  rows={9}
                  placeholder="Paste the full job description here..."
                  required
                />

                <div className="button-row">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isGenerating}
                  >
                    {isGenerating
                      ? "Generating..."
                      : "Generate with AI"}
                  </button>
                </div>
              </form>
            </section>

            {/* Editor */}
            {resumePoints.length > 0 && (
              <section id="editor" className="app-card">
                <div className="section-heading">
                  <div>
                    <span className="section-number">03</span>
                    <h2>Application Editor</h2>
                    <p>
                      Review and customize your AI-generated
                      content before saving.
                    </p>
                  </div>

                  {selectedVersionId && (
                    <span className="info-pill">
                      Version #{selectedVersionId}
                    </span>
                  )}
                </div>

                <div className="editor-group">
                  <h3>Resume Bullet Points</h3>

                  {resumePoints.map((point, index) => (
                    <div
                      key={index}
                      className="editor-field"
                    >
                      <label
                        htmlFor={`resume-point-${index}`}
                      >
                        Resume Point {index + 1}
                      </label>

                      <textarea
                        id={`resume-point-${index}`}
                        value={point}
                        onChange={(e) =>
                          handleResumePointChange(
                            index,
                            e.target.value
                          )
                        }
                        rows={3}
                      />
                    </div>
                  ))}
                </div>

                <div className="editor-group">
                  <h3>Cover Letter</h3>

                  <textarea
                    value={coverLetter}
                    onChange={(e) =>
                      setCoverLetter(e.target.value)
                    }
                    rows={13}
                    aria-label="Cover letter"
                  />
                </div>

                <div className="button-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveVersion}
                    disabled={isSaving}
                  >
                    {isSaving
                      ? "Saving..."
                      : "Save This Version"}
                  </button>
                </div>
              </section>
            )}

            {/* Resume Preview */}
            {hasResume && (
              <section className="resume-preview-section">
                <div className="preview-actions">
                  <div>
                    <span className="section-number">04</span>
                    <h2>Resume Preview</h2>
                    <p>
                      Your changes appear here automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => window.print()}
                  >
                    Download Resume PDF
                  </button>
                </div>

                <ResumePreview
                  name={name}
                  skills={skills}
                  experience={experience}
                  resumePoints={resumePoints}
                />
              </section>
            )}

            {/* Saved Versions */}
            <section id="versions" className="app-card">
              <div className="section-heading">
                <div>
                  <span className="section-number">05</span>
                  <h2>Saved Versions</h2>
                  <p>
                    Reopen previous application versions
                    without generating them again.
                  </p>
                </div>

                <button
                  className="btn btn-outline"
                  onClick={() => loadSavedVersions()}
                  disabled={isLoadingVersions}
                >
                  {isLoadingVersions
                    ? "Loading..."
                    : "Refresh Versions"}
                </button>
              </div>

              {savedVersions.length === 0 ? (
                <div className="empty-state">
                  <h3>No versions loaded</h3>
                  <p>
                    Save your first version or click
                    Refresh Versions to load existing ones.
                  </p>
                </div>
              ) : (
                <div className="versions-grid">
                  {savedVersions.map((version) => (
                    <div
                      key={version.id}
                      className="version-card"
                    >
                      <div className="version-card-top">
                        <h3>
                          Version #{version.id}
                        </h3>

                        <span className="version-date">
                          {new Date(
                            version.created_at
                          ).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="version-description">
                        {version.job_post}
                      </p>

                      <div className="version-meta">
                        <span>
                          {Array.isArray(
                            version.resume_points
                          )
                            ? version.resume_points.length
                            : 0}{" "}
                          resume points
                        </span>
                      </div>

                      <button
                        className="btn btn-secondary"
                        onClick={() =>
                          handleReopenVersion(version)
                        }
                      >
                        Reopen Version
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        ResumeAI · AI Resume & Cover Letter Builder
      </footer>
    </div>
  );
}

export default App;
