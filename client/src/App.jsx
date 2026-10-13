
import { useEffect, useState } from "react";
import ResumePreview from "./components/ResumePreview";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  // Authentication
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [message, setMessage] = useState("");

  // User profile
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");

  // AI generation
  const [jobPost, setJobPost] = useState("");
  const [resumePoints, setResumePoints] = useState([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Saved versions
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [savedVersions, setSavedVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  const token = localStorage.getItem("token");

  // Clear user-specific information
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

  // Read API error messages
  const readResponse = async (response) => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  };

  // Register a new user
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
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      await readResponse(response);

      setMessage("Account created successfully!");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Log in
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
        throw new Error("Login did not return a token.");
      }

      clearUserData();

      localStorage.setItem("token", data.token);

      setMessage("Login successful!");
      setLoginPassword("");

      await loadProfile(data.token);
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Retrieve the user's profile
  const loadProfile = async (loginToken = null) => {
    const currentToken =
      loginToken || localStorage.getItem("token");

    if (!currentToken) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const data = await readResponse(response);

      if (data.profile) {
        setName(data.profile.name || "");
        setSkills(data.profile.skills || "");
        setExperience(data.profile.experience || "");
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Save the user's profile
  const handleSaveProfile = async (event) => {
    event.preventDefault();

    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setMessage("Please log in first.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            name,
            skills,
            experience,
          }),
        }
      );

      await readResponse(response);

      setMessage("Profile saved successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Generate resume points and cover letter
  const handleGenerate = async (event) => {
    event.preventDefault();

    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setMessage("Please log in first.");
      return;
    }

    if (!jobPost.trim()) {
      setMessage("Please enter a job description.");
      return;
    }

    setIsGenerating(true);
    setMessage("Generating resume points and cover letter...");

    try {
      const response = await fetch(
        `${API_URL}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            jobPost,
          }),
        }
      );

      const data = await readResponse(response);

      if (
        !Array.isArray(data.resumePoints) ||
        data.resumePoints.length !== 4 ||
        typeof data.coverLetter !== "string"
      ) {
        throw new Error(
          "The AI returned an unexpected response."
        );
      }

      setResumePoints(data.resumePoints);
      setCoverLetter(data.coverLetter);
      setSelectedVersionId(null);

      setMessage("AI content generated successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit an individual resume point
  const handleResumePointChange = (index, value) => {
    setResumePoints((previousPoints) =>
      previousPoints.map((point, pointIndex) =>
        pointIndex === index ? value : point
      )
    );
  };

  // Retrieve saved versions
  const loadSavedVersions = async (
    loginToken = null,
    showMessage = true
  ) => {
    const currentToken =
      loginToken || localStorage.getItem("token");

    if (!currentToken) {
      if (showMessage) {
        setMessage("Please log in first.");
      }
      return;
    }

    setIsLoadingVersions(true);

    try {
      const response = await fetch(
        `${API_URL}/api/versions`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const data = await readResponse(response);

      setSavedVersions(data.versions || []);

      if (showMessage) {
        setMessage("Saved versions loaded successfully!");
      }
    } catch (error) {
      if (showMessage) {
        setMessage(error.message);
      }
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Save the current resume and cover letter
  const handleSaveVersion = async () => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setMessage("Please log in first.");
      return;
    }

    if (
      !jobPost.trim() ||
      resumePoints.length !== 4 ||
      resumePoints.some(
        (point) =>
          typeof point !== "string" ||
          !point.trim()
      ) ||
      !coverLetter.trim()
    ) {
      setMessage(
        "A job description, four resume points, and a cover letter are required."
      );
      return;
    }

    setIsSaving(true);
    setMessage("Saving version...");

    try {
      const response = await fetch(
        `${API_URL}/api/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
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

      await loadSavedVersions(currentToken, false);

      setMessage("Resume version saved successfully!");
    } catch (error) {
      setMessage(error.message);
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
      setMessage("This saved version contains invalid data.");
      return;
    }

    setJobPost(version.job_post);
    setResumePoints([...version.resume_points]);
    setCoverLetter(version.cover_letter);
    setSelectedVersionId(version.id);

    setMessage(
      `Version #${version.id} reopened successfully!`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Log out
  const handleLogout = () => {
    localStorage.removeItem("token");

    clearUserData();

    setLoginEmail("");
    setLoginPassword("");
    setMessage("Logged out successfully!");
  };

  // Load saved profile when the application starts
  useEffect(() => {
    if (localStorage.getItem("token")) {
      loadProfile();
    }
  }, []);

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1>AI Resume and Cover Letter Builder</h1>

      {/* Status Messages */}
      {message && (
        <p
          style={{
            padding: "10px",
            margin: "15px 0",
          }}
        >
          {message}
        </p>
      )}

      {/* Sign Up */}
      <section>
        <h2>Sign Up</h2>

        <form onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />

          <br />
          <br />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
          />

          <br />
          <br />

          <button type="submit">Sign Up</button>
        </form>
      </section>

      <hr />

      {/* Login */}
      <section>
        <h2>Login</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(event) =>
              setLoginEmail(event.target.value)
            }
            required
          />

          <br />
          <br />

          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(event) =>
              setLoginPassword(event.target.value)
            }
            required
          />

          <br />
          <br />

          <button type="submit">Login</button>
        </form>
      </section>

      <br />

      {/* Logout */}
      <button onClick={handleLogout}>
        Logout
      </button>

      <hr />

      {/* Profile */}
      <section>
        <h2>My Profile</h2>

        <form onSubmit={handleSaveProfile}>
          <div>
            <label>Name</label>

            <br />

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Your name"
            />
          </div>

          <br />

          <div>
            <label>Skills</label>

            <br />

            <textarea
              value={skills}
              onChange={(event) =>
                setSkills(event.target.value)
              }
              placeholder="JavaScript, React, Node.js..."
              rows={3}
              style={{ width: "80%" }}
            />
          </div>

          <br />

          <div>
            <label>Experience</label>

            <br />

            <textarea
              value={experience}
              onChange={(event) =>
                setExperience(event.target.value)
              }
              placeholder="Describe your professional experience"
              rows={5}
              style={{ width: "80%" }}
            />
          </div>

          <br />

          <button type="submit">
            Save Profile
          </button>
        </form>

        <br />

        <button onClick={() => loadProfile()}>
          Load Profile
        </button>
      </section>

      <hr />

      {/* AI Generation */}
      <section>
        <h2>Generate Resume and Cover Letter</h2>

        <form onSubmit={handleGenerate}>
          <label>Job Description</label>

          <br />
          <br />

          <textarea
            value={jobPost}
            onChange={(event) =>
              setJobPost(event.target.value)
            }
            placeholder="Paste the job description here..."
            rows={8}
            style={{ width: "90%" }}
            required
          />

          <br />
          <br />

          <button
            type="submit"
            disabled={isGenerating}
          >
            {isGenerating
              ? "Generating..."
              : "Generate"}
          </button>
        </form>
      </section>

      {/* Editable Resume Points */}
      {resumePoints.length > 0 && (
        <section>
          <hr />

          <h2>Resume Points</h2>

          {selectedVersionId && (
            <p>
              Editing saved version #{selectedVersionId}
            </p>
          )}

          {resumePoints.map((point, index) => (
            <div
              key={index}
              style={{
                marginBottom: "25px",
              }}
            >
              <label>
                Resume Point {index + 1}
              </label>

              <br />

              <textarea
                value={point}
                onChange={(event) =>
                  handleResumePointChange(
                    index,
                    event.target.value
                  )
                }
                rows={3}
                style={{
                  width: "80%",
                  maxWidth: "700px",
                }}
              />
            </div>
          ))}

          {/* Editable Cover Letter */}
          <h2>Cover Letter</h2>

          <textarea
            value={coverLetter}
            onChange={(event) =>
              setCoverLetter(event.target.value)
            }
            rows={12}
            style={{
              width: "90%",
              maxWidth: "800px",
            }}
          />

          <br />
          <br />

          {/* Save Version */}
          <button
            onClick={handleSaveVersion}
            disabled={isSaving}
          >
            {isSaving
              ? "Saving..."
              : "Save Version"}
          </button>
        </section>
      )}

      {/* NEW: One-page Resume Preview */}
      {resumePoints.length === 4 && (
        <section className="resume-preview-section">
          <hr />

          <h2>Resume Preview</h2>

          <button
              type="button"
              onClick={() => window.print()}
            >
              Download Resume PDF
          </button>

          <p>
            Preview your formatted resume below.
            Changes to your resume points will
            automatically appear here.
          </p>

          <ResumePreview
            name={name}
            skills={skills}
            experience={experience}
            resumePoints={resumePoints}
          />
        </section>
      )}

      <hr />

      {/* Saved Versions */}
      <section>
        <h2>Saved Versions</h2>

        <button
          onClick={() => loadSavedVersions()}
          disabled={isLoadingVersions}
        >
          {isLoadingVersions
            ? "Loading..."
            : "Load Saved Versions"}
        </button>

        <p>
          Total saved versions: {savedVersions.length}
        </p>

        {savedVersions.map((version) => (
          <div
            key={version.id}
            style={{
              border: "1px solid #999",
              borderRadius: "10px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h3>
              Saved Version #{version.id}
            </h3>

            <p>
              <strong>Date Saved:</strong>{" "}
              {new Date(
                version.created_at
              ).toLocaleString()}
            </p>

            <p>
              <strong>Job Description:</strong>{" "}
              {version.job_post}
            </p>

            <p>
              <strong>Resume Points:</strong>{" "}
              {Array.isArray(version.resume_points)
                ? version.resume_points.length
                : 0}
            </p>

            <button
              onClick={() =>
                handleReopenVersion(version)
              }
            >
              Reopen Version
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

export default App;
