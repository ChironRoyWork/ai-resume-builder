
import { useEffect, useId, useRef, useState } from "react";
import ResumePreview from "./components/ResumePreview";
import InterviewPrep from "./components/InterviewPrep";
import { buildInterviewResumeText } from "./utils/interviewResumeContext";
import { apiFetch, AUTHENTICATION_REQUIRED, getAccountKey } from "./utils/api";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyEducation = () => ({
  school: "",
  degree: "",
  location: "",
  graduationDate: "",
  coursework: ""
});

const emptyJob = () => ({
  company: "",
  title: "",
  location: "",
  startDate: "",
  endDate: "",
  bullets: [""]
});

const emptyProject = () => ({
  name: "",
  technologies: "",
  startDate: "",
  endDate: "",
  bullets: [""]
});

const emptySkillGroup = () => ({
  category: "",
  items: ""
});

const asArray = (value) =>
  Array.isArray(value) ? value : [];

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

// Reusable input component
function TextField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  multiline = false,
  rows = 3
}) {
  const id = useId();

  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>

      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// Add, edit and remove resume bullet points
function BulletsEditor({ bullets, onChange }) {
  const entries = asArray(bullets);

  return (
    <div className="profile-field">
      <label>Bullet points</label>

      {entries.map((bullet, index) => (
        <div className="bullet-editor" key={index}>
          <textarea
            rows={2}
            aria-label={`Bullet ${index + 1}`}
            value={bullet}
            onChange={(e) =>
              onChange(
                entries.map((item, i) =>
                  i === index ? e.target.value : item
                )
              )
            }
          />

          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={() =>
              onChange(entries.filter((_, i) => i !== index))
            }
          >
            Remove bullet
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-outline btn-small"
        onClick={() => onChange([...entries, ""])}
      >
        + Add bullet
      </button>
    </div>
  );
}

function App() {
  // Authentication
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("token")
  );
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const loadedAccount = useRef(null);
  const signInDialog = useRef(null);
  const accountKey = getAccountKey(authToken);

  useEffect(() => {
    if (!requiresSignIn) return;
    const previousFocus = document.activeElement;
    const dialog = signInDialog.current;
    dialog?.querySelector("input")?.focus();
    const keepFocus = (event) => {
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll("input, button")].filter((control) => !control.disabled);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    dialog?.addEventListener("keydown", keepFocus);
    return () => {
      dialog?.removeEventListener("keydown", keepFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [requiresSignIn]);

  useEffect(() => {
    const requireSignIn = (event) => {
      // Ignore a late response from an account that is no longer open.
      if (event.detail?.token === authToken) setRequiresSignIn(true);
    };
    window.addEventListener(AUTHENTICATION_REQUIRED, requireSignIn);
    return () => window.removeEventListener(AUTHENTICATION_REQUIRED, requireSignIn);
  }, [authToken]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Feedback
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Legacy profile fields
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");

  // Contact information
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // Structured resume information
  const [skillGroups, setSkillGroups] = useState([]);
  const [education, setEducation] = useState([]);
  const [workExperiences, setWorkExperiences] = useState([]);
  const [projects, setProjects] = useState([]);

  const [
    selectedExperienceIndex,
    setSelectedExperienceIndex
  ] = useState(0);

  // AI generation
  const [jobPost, setJobPost] = useState("");
  const [resumePoints, setResumePoints] = useState([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Saved versions
  const [savedVersions, setSavedVersions] = useState([]);
  const [hasLoadedVersions, setHasLoadedVersions] =
    useState(false);

  const [selectedVersionId, setSelectedVersionId] =
    useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] =
    useState(false);

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const isLoggedIn = Boolean(authToken);

  const hasResume =
    Boolean(name.trim()) &&
    (
      resumePoints.length > 0 ||
      education.length > 0 ||
      workExperiences.length > 0 ||
      projects.length > 0
    );

  const validJobs = workExperiences
    .map((job, index) => ({ job, index }))
    .filter(
      ({ job }) =>
        job.company?.trim() || job.title?.trim()
    );

  // Match the preview's filtered job list.
  const selectedPreviewIndex = workExperiences
    .slice(0, selectedExperienceIndex)
    .filter(
      (job) =>
        job.company?.trim() || job.title?.trim()
    ).length;

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const clearUserData = () => {
    loadedAccount.current = null;
    setName("");
    setSkills("");
    setExperience("");
    setContactEmail("");
    setPhone("");
    setLocation("");
    setPortfolioUrl("");
    setSkillGroups([]);
    setEducation([]);
    setWorkExperiences([]);
    setProjects([]);
    setSelectedExperienceIndex(0);

    setJobPost("");
    setResumePoints([]);
    setCoverLetter("");

    setSavedVersions([]);
    setHasLoadedVersions(false);
    setSelectedVersionId(null);
  };

  // Apply profile data from the backend
  const applyProfile = (profile) => {
    setName(profile.name || "");
    setSkills(profile.skills || "");
    setExperience(profile.experience || "");

    setContactEmail(profile.contact_email || "");
    setPhone(profile.phone || "");
    setLocation(profile.location || "");
    setPortfolioUrl(profile.portfolio_url || "");

    setSkillGroups(asArray(profile.skill_groups));
    setEducation(asArray(profile.education));
    setWorkExperiences(asArray(profile.work_experiences));
    setProjects(asArray(profile.projects));

    setSelectedExperienceIndex(0);
  };

  // Registration
  const handleSignup = async (event) => {
    event.preventDefault();

    try {
      await readResponse(
        await apiFetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        })
      );

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
      const data = await readResponse(
        await apiFetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword
          })
        })
      );

      if (!data.token) {
        throw new Error("No authentication token returned.");
      }

      const sameAccount = requiresSignIn && accountKey === getAccountKey(data.token);
      if (requiresSignIn && !sameAccount && !window.confirm(
        "This is a different account. Switch accounts and clear the current unsaved work?"
      )) return;
      if (!sameAccount) clearUserData();

      localStorage.setItem("token", data.token);
      setAuthToken(data.token);
      setRequiresSignIn(false);
      setLoginPassword("");

      showMessage(sameAccount ? "Signed in again. Your current edits are preserved." : "Logged in successfully!", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  // Manually reload profile
  const loadProfile = async (token = authToken) => {
    if (!token) return;

    try {
      const response = await apiFetch(
        `${API_URL}/api/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 404) {
        showMessage(
          "No profile yet. Enter your details and save."
        );
        return;
      }

      const data = await readResponse(response);

      applyProfile(data.profile);
      showMessage("Profile loaded.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  // Automatically load profile and saved versions
  useEffect(() => {
    if (!authToken) return;
    const identity = getAccountKey(authToken);
    // Renewing the same account must not reload over unsaved profile edits.
    if (loadedAccount.current === identity) return;

    const controller = new AbortController();

    const headers = {
      Authorization: `Bearer ${authToken}`
    };

    const fetchProfile = async () => {
      try {
        const response = await apiFetch(
          `${API_URL}/api/profile`,
          {
            headers,
            signal: controller.signal
          }
        );

        if (response.status === 404) return true;

        const data = await readResponse(response);

        if (!controller.signal.aborted) {
          const profile = data.profile;

          setName(profile.name || "");
          setSkills(profile.skills || "");
          setExperience(profile.experience || "");

          setContactEmail(profile.contact_email || "");
          setPhone(profile.phone || "");
          setLocation(profile.location || "");
          setPortfolioUrl(profile.portfolio_url || "");

          setSkillGroups(asArray(profile.skill_groups));
          setEducation(asArray(profile.education));

          setWorkExperiences(
            asArray(profile.work_experiences)
          );

          setProjects(asArray(profile.projects));
          return true;
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(error.message);
          setMessageType("error");
        }
      }
    };

    const fetchVersions = async () => {
      try {
        const data = await readResponse(
          await apiFetch(`${API_URL}/api/versions`, {
            headers,
            signal: controller.signal
          })
        );

        if (!controller.signal.aborted) {
          setSavedVersions(asArray(data.versions));
          setHasLoadedVersions(true);
          return true;
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(error.message);
          setMessageType("error");
        }
      }
    };

    Promise.all([fetchProfile(), fetchVersions()]).then((loaded) => {
      if (!controller.signal.aborted && loaded.every(Boolean)) loadedAccount.current = identity;
    });

    return () => controller.abort();
  }, [authToken]);

  // General helpers for editable lists
  const updateItem = (setter, index, field, value) => {
    setter((items) =>
      items.map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const removeItem = (setter, index) => {
    setter((items) =>
      items.filter((_, i) => i !== index)
    );
  };

  // Build the payload for the profile API.
  // Legacy fields remain populated for compatibility.
  const buildProfilePayload = () => {
    const structuredSkills = skillGroups
      .filter(
        (group) =>
          group.category.trim() &&
          group.items.trim()
      )
      .map(
        (group) =>
          `${group.category}: ${group.items}`
      )
      .join("\n");

    const structuredExperience = workExperiences
      .filter(
        (job) =>
          job.company.trim() ||
          job.title.trim()
      )
      .map((job) =>
        [
          job.company,
          job.title,
          job.location,
          job.startDate,
          job.endDate,
          ...asArray(job.bullets)
        ]
          .filter(Boolean)
          .join(" | ")
      )
      .join("\n");

    const projectSummary = projects
      .filter((project) => project.name.trim())
      .map((project) =>
        [
          project.name,
          project.technologies,
          ...asArray(project.bullets)
        ]
          .filter(Boolean)
          .join(" | ")
      )
      .join("\n");

    return {
      name: name.trim(),

      skills: (
        structuredSkills || skills
      ).trim(),

      experience: (
        [structuredExperience, projectSummary]
          .filter(Boolean)
          .join("\n") || experience
      ).trim(),

      contact_email: contactEmail,
      phone,
      location,
      portfolio_url: portfolioUrl,

      skill_groups: skillGroups,
      education,
      work_experiences: workExperiences,
      projects
    };
  };

  // Save complete professional profile
  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Please log in first.", "error");
      return;
    }

    const payload = buildProfilePayload();

    if (
      !payload.name ||
      !payload.skills ||
      !payload.experience
    ) {
      showMessage(
        "Name, skills, and experience are required. Add structured entries or fill out the summary fields.",
        "error"
      );
      return;
    }

    setIsSavingProfile(true);

    try {
      const data = await readResponse(
        await apiFetch(`${API_URL}/api/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        })
      );

      setSkills(data.profile.skills);
      setExperience(data.profile.experience);

      showMessage(
        "Professional profile saved successfully!",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Generate AI resume bullets and cover letter
  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!jobPost.trim()) {
      showMessage(
        "Please enter a job description.",
        "error"
      );
      return;
    }

    setIsGenerating(true);

    showMessage(
      "Generating your application content..."
    );

    try {
      const data = await readResponse(
        await apiFetch(`${API_URL}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            jobPost,
            selectedExperienceIndex
          })
        })
      );

      if (
        !Array.isArray(data.resumePoints) ||
        data.resumePoints.length !== 4 ||
        data.resumePoints.some(
          (point) =>
            typeof point !== "string" ||
            !point.trim()
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
        "Your tailored resume bullets and cover letter are ready!",
        "success"
      );

      setTimeout(() => {
        document
          .getElementById("editor")
          ?.scrollIntoView({
            behavior: "smooth"
          });
      }, 0);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Load saved application versions
  const loadSavedVersions = async (
    showSuccess = true
  ) => {
    setIsLoadingVersions(true);

    try {
      const data = await readResponse(
        await apiFetch(`${API_URL}/api/versions`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        })
      );

      setSavedVersions(asArray(data.versions));
      setHasLoadedVersions(true);

      if (showSuccess) {
        showMessage(
          "Saved versions loaded!",
          "success"
        );
      }

      return true;
    } catch (error) {
      showMessage(error.message, "error");
      return false;
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Capture the full resume when saving a version
  const resumeSnapshot = () => ({
    name,
    skills,
    experience,
    contact_email: contactEmail,
    phone,
    location,
    portfolio_url: portfolioUrl,
    skill_groups: skillGroups,
    education,
    work_experiences: workExperiences,
    projects,
    selectedExperienceIndex
  });

  // Save a version
  const handleSaveVersion = async () => {
    if (
      !jobPost.trim() ||
      resumePoints.length !== 4 ||
      resumePoints.some(
        (point) => !point.trim()
      ) ||
      !coverLetter.trim()
    ) {
      showMessage(
        "A job description, four resume bullets, and a cover letter are required.",
        "error"
      );
      return;
    }

    setIsSaving(true);

    try {
      const data = await readResponse(
        await apiFetch(`${API_URL}/api/versions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            jobPost,
            resumePoints,
            coverLetter,
            resumeSnapshot: resumeSnapshot()
          })
        })
      );

      setSelectedVersionId(
        data.version?.id ?? null
      );

      if (await loadSavedVersions(false)) {
        showMessage(
          "Resume version saved!",
          "success"
        );
      }
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Reopen a previously saved version
  const handleReopenVersion = (version) => {
    if (
      typeof version.job_post !== "string" ||
      !Array.isArray(version.resume_points) ||
      version.resume_points.length !== 4 ||
      typeof version.cover_letter !== "string"
    ) {
      showMessage(
        "Invalid saved version.",
        "error"
      );
      return;
    }

    setJobPost(version.job_post);
    setResumePoints([...version.resume_points]);
    setCoverLetter(version.cover_letter);
    setSelectedVersionId(version.id);

    // Older saved versions may not have snapshots.
    if (
      version.resume_snapshot &&
      typeof version.resume_snapshot === "object" &&
      !Array.isArray(version.resume_snapshot)
    ) {
      applyProfile(version.resume_snapshot);

      setSelectedExperienceIndex(
        Number.isInteger(
          version.resume_snapshot.selectedExperienceIndex
        )
          ? version.resume_snapshot.selectedExperienceIndex
          : 0
      );
    }

    showMessage(
      `Saved version #${version.id} reopened.`,
      "success"
    );

    setTimeout(() => {
      document
        .getElementById("editor")
        ?.scrollIntoView({
          behavior: "smooth"
        });
    }, 0);
  };

  // Download cover letter
  const handleDownloadCoverLetter = () => {
    if (!coverLetter.trim()) {
      showMessage(
        "No cover letter to download.",
        "error"
      );
      return;
    }

    const blob = new Blob(
      [coverLetter],
      { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ResumeAI_Cover_Letter.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuthToken(null);
    setRequiresSignIn(false);
    clearUserData();
    setLoginEmail("");
    setLoginPassword("");

    showMessage(
      "Logged out successfully.",
      "success"
    );
  };

  // Remove a job while maintaining selection
  const removeJob = (index) => {
    removeItem(setWorkExperiences, index);

    if (selectedExperienceIndex === index) {
      setResumePoints([]);
    }

    setSelectedExperienceIndex((current) =>
      current > index
        ? current - 1
        : current === index
          ? 0
          : current
    );
  };

  return (
    <div className="app-shell">
      {requiresSignIn && (
        <div className="reauth-overlay">
          <section ref={signInDialog} className="app-card reauth-dialog" role="dialog" aria-modal="true" aria-labelledby="reauth-title">
            <h2 id="reauth-title">Sign in again to continue</h2>
            <p>Your sign-in is no longer valid. Sign back into the same account to keep your current edits open.</p>
            <form className="app-form" onSubmit={handleLogin}>
              <TextField label="Email address" type="email" value={loginEmail} onChange={setLoginEmail} />
              <TextField label="Password" type="password" value={loginPassword} onChange={setLoginPassword} />
              <button className="btn btn-primary" type="submit">Sign in again</button>
            </form>
            {messageType === "error" && <p role="alert">{message}</p>}
            <button className="btn btn-outline" type="button" onClick={() => {
              if (window.confirm("Log out and clear the current unsaved work?")) handleLogout();
            }}>Log out and clear work</button>
          </section>
        </div>
      )}
      {/* Header */}
      <header className="app-header" inert={requiresSignIn}>
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">R</div>

            <div>
              <h1>ResumeAI</h1>
              <span>
                AI Resume & Cover Letter Builder
              </span>
            </div>
          </div>

          {isLoggedIn && (
            <nav className="app-nav">
              <a href="#profile">Profile</a>
              <a href="#generate">Generate</a>
              <a href="#versions">Saved Versions</a>
              <a href="#interview-prep">Interview Prep</a>

              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="app-main" inert={requiresSignIn}>
        {/* Status messages */}
        {message && (
          <div
            className={`status-message ${messageType}`}
            role={
              messageType === "error"
                ? "alert"
                : "status"
            }
          >
            <span>{message}</span>

            <button
              type="button"
              className="dismiss-button"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* Authentication */}
        {!isLoggedIn ? (
          <section className="auth-section">
            <div className="hero">
              <span className="eyebrow">
                YOUR CAREER, POWERED BY AI
              </span>

              <h2>
                Build better applications, faster.
              </h2>

              <p>
                Create complete resumes, tailor them
                with AI, and save multiple application
                versions.
              </p>
            </div>

            <div className="auth-grid">
              {/* Login */}
              <div className="app-card">
                <div className="card-heading">
                  <h3>Welcome back</h3>
                  <p>Log in to continue your work.</p>
                </div>

                <form
                  className="app-form"
                  onSubmit={handleLogin}
                >
                  <TextField
                    label="Email address"
                    type="email"
                    value={loginEmail}
                    onChange={setLoginEmail}
                  />

                  <TextField
                    label="Password"
                    type="password"
                    value={loginPassword}
                    onChange={setLoginPassword}
                  />

                  <button className="btn btn-primary">
                    Log In
                  </button>
                </form>
              </div>

              {/* Registration */}
              <div className="app-card">
                <div className="card-heading">
                  <h3>Create an account</h3>
                  <p>Get started with your profile.</p>
                </div>

                <form
                  className="app-form"
                  onSubmit={handleSignup}
                >
                  <TextField
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={setEmail}
                  />

                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                  />

                  <button className="btn btn-secondary">
                    Create Account
                  </button>
                </form>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Dashboard */}
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
                  Build your professional resume,
                  tailor your applications, and
                  manage saved versions.
                </p>
              </div>

              <div className="dashboard-stats">
                <div className="stat-card">
                  <strong>
                    {savedVersions.length}
                  </strong>
                  <span>Saved versions</span>
                </div>

                <div className="stat-card">
                  <strong>
                    {hasResume ? "Ready" : "—"}
                  </strong>
                  <span>Resume preview</span>
                </div>
              </div>
            </section>

            {/* Professional profile */}
            <section
              id="profile"
              className="app-card"
            >
              <div className="section-heading">
                <div>
                  <span className="section-number">
                    01
                  </span>

                  <h2>Professional Profile</h2>

                  <p>
                    Provide factual information.
                    Gemini uses this information
                    to tailor your application.
                  </p>
                </div>
              </div>

              <form
                className="app-form"
                onSubmit={handleSaveProfile}
              >
                <TextField
                  label="Full name"
                  value={name}
                  onChange={setName}
                  placeholder="Alex Morgan"
                />

                {/* Contact information */}
                <div className="profile-subsection">
                  <h3>Contact Information</h3>

                  <p>
                    Displayed at the top of your resume.
                  </p>

                  <TextField
                    label="Contact email"
                    type="email"
                    value={contactEmail}
                    onChange={setContactEmail}
                    placeholder="alex@example.com"
                  />

                  <TextField
                    label="Phone number"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="(555) 123-4567"
                  />

                  <TextField
                    label="Location"
                    value={location}
                    onChange={setLocation}
                    placeholder="Seattle, WA"
                  />

                  <TextField
                    label="Portfolio or LinkedIn URL"
                    value={portfolioUrl}
                    onChange={setPortfolioUrl}
                    placeholder="https://portfolio.example.com"
                  />
                </div>

                {/* Skills */}
                <div className="profile-subsection">
                  <div className="profile-subsection-header">
                    <div>
                      <h3>Categorized Skills</h3>

                      <p>
                        Add languages, frameworks,
                        tools, or other skill groups.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() =>
                        setSkillGroups((items) => [
                          ...items,
                          emptySkillGroup()
                        ])
                      }
                    >
                      + Add Skill Category
                    </button>
                  </div>

                  {skillGroups.map((group, index) => (
                    <div
                      className="profile-entry"
                      key={index}
                    >
                      <div className="profile-subsection-header">
                        <h4>
                          Skills Category {index + 1}
                        </h4>

                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() =>
                            removeItem(
                              setSkillGroups,
                              index
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <TextField
                        label="Category"
                        value={group.category}
                        onChange={(value) =>
                          updateItem(
                            setSkillGroups,
                            index,
                            "category",
                            value
                          )
                        }
                        placeholder="Languages"
                      />

                      <TextField
                        label="Skills (comma separated)"
                        value={group.items}
                        onChange={(value) =>
                          updateItem(
                            setSkillGroups,
                            index,
                            "items",
                            value
                          )
                        }
                        placeholder="Python, JavaScript, SQL"
                      />
                    </div>
                  ))}

                  <TextField
                    label="General skills summary (fallback for existing accounts)"
                    multiline
                    value={skills}
                    onChange={setSkills}
                    placeholder="React, Node.js, PostgreSQL"
                  />
                </div>

                {/* Education */}
                <div className="profile-subsection">
                  <div className="profile-subsection-header">
                    <div>
                      <h3>Education</h3>

                      <p>
                        Add schools, degrees,
                        and graduation dates.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() =>
                        setEducation((items) => [
                          ...items,
                          emptyEducation()
                        ])
                      }
                    >
                      + Add Education
                    </button>
                  </div>

                  {education.map((entry, index) => (
                    <div
                      className="profile-entry"
                      key={index}
                    >
                      <div className="profile-subsection-header">
                        <h4>
                          Education {index + 1}
                        </h4>

                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() =>
                            removeItem(
                              setEducation,
                              index
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <TextField
                        label="University or school"
                        value={entry.school}
                        onChange={(value) =>
                          updateItem(
                            setEducation,
                            index,
                            "school",
                            value
                          )
                        }
                        placeholder="Boston University"
                      />

                      <TextField
                        label="Degree"
                        value={entry.degree}
                        onChange={(value) =>
                          updateItem(
                            setEducation,
                            index,
                            "degree",
                            value
                          )
                        }
                        placeholder="Bachelor of Arts in Computer Science"
                      />

                      <TextField
                        label="Location"
                        value={entry.location}
                        onChange={(value) =>
                          updateItem(
                            setEducation,
                            index,
                            "location",
                            value
                          )
                        }
                        placeholder="Boston, MA"
                      />

                      <TextField
                        label="Graduation date"
                        value={entry.graduationDate}
                        onChange={(value) =>
                          updateItem(
                            setEducation,
                            index,
                            "graduationDate",
                            value
                          )
                        }
                        placeholder="May 2026"
                      />

                      <TextField
                        label="Relevant coursework (optional)"
                        multiline
                        value={entry.coursework}
                        onChange={(value) =>
                          updateItem(
                            setEducation,
                            index,
                            "coursework",
                            value
                          )
                        }
                      />
                    </div>
                  ))}
                </div>

                {/* Work experience */}
                <div className="profile-subsection">
                  <div className="profile-subsection-header">
                    <div>
                      <h3>Work Experience</h3>

                      <p>
                        Each role has its own title,
                        location, dates, and bullet points.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() =>
                        setWorkExperiences((items) => [
                          ...items,
                          emptyJob()
                        ])
                      }
                    >
                      + Add Job
                    </button>
                  </div>

                  {workExperiences.map((job, index) => (
                    <div
                      className="profile-entry"
                      key={index}
                    >
                      <div className="profile-subsection-header">
                        <h4>
                          Work Experience {index + 1}
                        </h4>

                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() => removeJob(index)}
                        >
                          Remove Job
                        </button>
                      </div>

                      <TextField
                        label="Company"
                        value={job.company}
                        onChange={(value) =>
                          updateItem(
                            setWorkExperiences,
                            index,
                            "company",
                            value
                          )
                        }
                        placeholder="Example Company"
                      />

                      <TextField
                        label="Job title"
                        value={job.title}
                        onChange={(value) =>
                          updateItem(
                            setWorkExperiences,
                            index,
                            "title",
                            value
                          )
                        }
                        placeholder="Software Developer"
                      />

                      <TextField
                        label="Location"
                        value={job.location}
                        onChange={(value) =>
                          updateItem(
                            setWorkExperiences,
                            index,
                            "location",
                            value
                          )
                        }
                        placeholder="Seattle, WA"
                      />

                      <TextField
                        label="Start date"
                        value={job.startDate}
                        onChange={(value) =>
                          updateItem(
                            setWorkExperiences,
                            index,
                            "startDate",
                            value
                          )
                        }
                        placeholder="September 2025"
                      />

                      <TextField
                        label="End date"
                        value={job.endDate}
                        onChange={(value) =>
                          updateItem(
                            setWorkExperiences,
                            index,
                            "endDate",
                            value
                          )
                        }
                        placeholder="Present"
                      />

                      <BulletsEditor
                        bullets={job.bullets}
                        onChange={(bullets) =>
                          updateItem(
                            setWorkExperiences,
                            index,
                            "bullets",
                            bullets
                          )
                        }
                      />
                    </div>
                  ))}

                  <TextField
                    label="General experience summary (fallback for existing accounts)"
                    multiline
                    rows={4}
                    value={experience}
                    onChange={setExperience}
                    placeholder="Describe your professional background"
                  />
                </div>

                {/* Projects */}
                <div className="profile-subsection">
                  <div className="profile-subsection-header">
                    <div>
                      <h3>Projects (Optional)</h3>

                      <p>
                        Include relevant projects,
                        dates, and technical achievements.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={() =>
                        setProjects((items) => [
                          ...items,
                          emptyProject()
                        ])
                      }
                    >
                      + Add Project
                    </button>
                  </div>

                  {projects.map((project, index) => (
                    <div
                      className="profile-entry"
                      key={index}
                    >
                      <div className="profile-subsection-header">
                        <h4>
                          Project {index + 1}
                        </h4>

                        <button
                          type="button"
                          className="btn btn-outline btn-small"
                          onClick={() =>
                            removeItem(
                              setProjects,
                              index
                            )
                          }
                        >
                          Remove Project
                        </button>
                      </div>

                      <TextField
                        label="Project name"
                        value={project.name}
                        onChange={(value) =>
                          updateItem(
                            setProjects,
                            index,
                            "name",
                            value
                          )
                        }
                        placeholder="AI Resume Builder"
                      />

                      <TextField
                        label="Technologies"
                        value={project.technologies}
                        onChange={(value) =>
                          updateItem(
                            setProjects,
                            index,
                            "technologies",
                            value
                          )
                        }
                        placeholder="React, Express, PostgreSQL"
                      />

                      <TextField
                        label="Start date"
                        value={project.startDate}
                        onChange={(value) =>
                          updateItem(
                            setProjects,
                            index,
                            "startDate",
                            value
                          )
                        }
                        placeholder="September 2026"
                      />

                      <TextField
                        label="End date"
                        value={project.endDate}
                        onChange={(value) =>
                          updateItem(
                            setProjects,
                            index,
                            "endDate",
                            value
                          )
                        }
                        placeholder="October 2026"
                      />

                      <BulletsEditor
                        bullets={project.bullets}
                        onChange={(bullets) =>
                          updateItem(
                            setProjects,
                            index,
                            "bullets",
                            bullets
                          )
                        }
                      />
                    </div>
                  ))}
                </div>

                {/* Profile actions */}
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

            {/* AI generation */}
            <section
              id="generate"
              className="app-card"
            >
              <div className="section-heading">
                <div>
                  <span className="section-number">
                    02
                  </span>

                  <h2>
                    Generate Application Content
                  </h2>

                  <p>
                    Save your profile first, then
                    paste a job description to
                    tailor your resume points and
                    cover letter.
                  </p>
                </div>

                <span className="info-pill">
                  5 generations / day
                </span>
              </div>

              <form
                className="app-form"
                onSubmit={handleGenerate}
              >
                {validJobs.length > 0 && (
                  <div className="profile-field">
                    <label htmlFor="target-job">
                      Place generated bullets under this job
                    </label>

                    <select
                      id="target-job"
                      className="resume-select"
                      value={
                        validJobs.some(
                          ({ index }) =>
                            index === selectedExperienceIndex
                        )
                          ? selectedExperienceIndex
                          : ""
                      }
                      onChange={(e) => {
                        setSelectedExperienceIndex(
                          Number(e.target.value)
                        );
                        setResumePoints([]);
                      }}
                    >
                      <option value="" disabled>
                        Select a job
                      </option>

                      {validJobs.map(
                        ({ job, index }) => (
                          <option
                            key={index}
                            value={index}
                          >
                            {job.title || "Role"} —{" "}
                            {job.company || "Company"}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <TextField
                  label="Job description"
                  multiline
                  rows={9}
                  value={jobPost}
                  onChange={setJobPost}
                  placeholder="Paste the full job posting here"
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

            {/* Generated content editor */}
            {resumePoints.length > 0 && (
              <section
                id="editor"
                className="app-card"
              >
                <div className="section-heading">
                  <div>
                    <span className="section-number">
                      03
                    </span>

                    <h2>Application Editor</h2>

                    <p>
                      Review and edit the generated
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

                  {resumePoints.map(
                    (point, index) => (
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
                          rows={3}
                          value={point}
                          onChange={(e) =>
                            setResumePoints((items) =>
                              items.map(
                                (item, i) =>
                                  i === index
                                    ? e.target.value
                                    : item
                              )
                            )
                          }
                        />
                      </div>
                    )
                  )}
                </div>

                <div className="editor-group">
                  <h3>Cover Letter</h3>

                  <textarea
                    aria-label="Cover letter"
                    rows={13}
                    value={coverLetter}
                    onChange={(e) =>
                      setCoverLetter(e.target.value)
                    }
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

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleDownloadCoverLetter}
                  >
                    Download Cover Letter
                  </button>
                </div>
              </section>
            )}

            {/* Resume preview */}
            {hasResume && (
              <section className="resume-preview-section">
                <div className="preview-actions">
                  <div>
                    <span className="section-number">
                      04
                    </span>

                    <h2>Resume Preview</h2>

                    <p>
                      Complete resume with live
                      updates and right-aligned dates.
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
                  contactEmail={contactEmail}
                  phone={phone}
                  location={location}
                  portfolioUrl={portfolioUrl}
                  skillGroups={skillGroups}
                  education={education}
                  workExperiences={workExperiences}
                  projects={projects}
                  selectedExperienceIndex={
                    selectedPreviewIndex
                  }
                />
              </section>
            )}

            <InterviewPrep
              key={accountKey}
              authToken={authToken}
              initialJobPost={jobPost}
              initialResumeText={buildInterviewResumeText(
                resumeSnapshot(),
                resumePoints
              )}
            />

            {/* Saved versions */}
            <section
              id="versions"
              className="app-card"
            >
              <div className="section-heading">
                <div>
                  <span className="section-number">
                    05
                  </span>

                  <h2>Saved Versions</h2>

                  <p>
                    Reopen previous applications
                    without generating again.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isLoadingVersions}
                  onClick={() =>
                    loadSavedVersions()
                  }
                >
                  {isLoadingVersions
                    ? "Loading..."
                    : "Refresh Versions"}
                </button>
              </div>

              {!hasLoadedVersions ? (
                <div className="empty-state">
                  <h3>Loading saved versions...</h3>
                </div>
              ) : savedVersions.length === 0 ? (
                <div className="empty-state">
                  <h3>No saved versions yet</h3>

                  <p>
                    Generate and save your first
                    application to see it here.
                  </p>
                </div>
              ) : (
                <div className="versions-grid">
                  {savedVersions.map((version) => (
                    <div
                      className="version-card"
                      key={version.id}
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
                        {asArray(
                          version.resume_points
                        ).length}{" "}
                        resume points
                      </div>

                      <button
                        type="button"
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

      <footer className="app-footer" inert={requiresSignIn}>
        ResumeAI · AI Resume & Cover Letter Builder
      </footer>
    </div>
  );
}

export default App;
