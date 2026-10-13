
import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

function App() {
  // Authentication
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [message, setMessage] = useState("");

  // Profile
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");

  // Generated content
  const [jobPost, setJobPost] = useState("");
  const [resumePoints, setResumePoints] = useState([]);
  const [coverLetter, setCoverLetter] = useState("");

  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] =
    useState(false);

  // Saved versions
  const [savedVersions, setSavedVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] =
    useState(null);

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

  // SIGN UP
  const handleSignup = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not create account");
        return;
      }

      setEmail("");
      setPassword("");
      setMessage("Account created successfully!");
    } catch (error) {
      console.error("Signup error:", error);
      setMessage("Could not connect to the server");
    }
  };

  // LOGIN
  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not log in");
        return;
      }

      clearUserData();

      localStorage.setItem("token", data.token);

      await loadProfile(data.token);

      setLoginEmail("");
      setLoginPassword("");
      setMessage("Login successful!");
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Could not connect to the server");
    }
  };

  // LOAD PROFILE
  const loadProfile = async (loginToken = null) => {
    const token =
      loginToken || localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      if (data.profile) {
        setName(data.profile.name || "");
        setSkills(data.profile.skills || "");
        setExperience(data.profile.experience || "");
      }
    } catch (error) {
      console.error("Load profile error:", error);
    }
  };

  // SAVE PROFILE
  const handleSaveProfile = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("You must log in before saving a profile");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            skills,
            experience
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not save profile");
        return;
      }

      setMessage("Profile saved successfully!");
    } catch (error) {
      console.error("Save profile error:", error);
      setMessage("Could not connect to the server");
    }
  };

  // GENERATE RESUME AND COVER LETTER
  const handleGenerate = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("You must log in before generating content");
      return;
    }

    if (!jobPost.trim()) {
      setMessage("Please enter a job description");
      return;
    }

    setIsGenerating(true);
    setMessage("");
    setSelectedVersionId(null);

    setResumePoints([]);
    setCoverLetter("");

    try {
      const response = await fetch(
        `${API_URL}/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            jobPost
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not generate content");
        return;
      }

      setResumePoints(data.resumePoints || []);
      setCoverLetter(data.coverLetter || "");

      setMessage("AI generation successful!");
    } catch (error) {
      console.error("Generate error:", error);
      setMessage("Could not connect to the server");
    } finally {
      setIsGenerating(false);
    }
  };

  // EDIT RESUME POINT
  const handleResumePointChange = (index, value) => {
    setResumePoints((previousPoints) =>
      previousPoints.map((point, pointIndex) =>
        pointIndex === index ? value : point
      )
    );
  };

  // LOAD SAVED VERSIONS
  const loadSavedVersions = async (
    loginToken = null,
    showMessage = true
  ) => {
    const token =
      loginToken || localStorage.getItem("token");

    if (!token) {
      setSavedVersions([]);

      if (showMessage) {
        setMessage("You must log in to view saved versions");
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
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setSavedVersions([]);

        if (showMessage) {
          setMessage(
            data.message || "Could not load saved versions"
          );
        }

        return;
      }

      setSavedVersions(
        Array.isArray(data.versions) ? data.versions : []
      );

      if (showMessage) {
        setMessage("Saved versions loaded successfully!");
      }
    } catch (error) {
      console.error("Load versions error:", error);

      if (showMessage) {
        setMessage("Could not connect to the server");
      }
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // SAVE VERSION
  const handleSaveVersion = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("You must log in before saving a version");
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
        "Please complete all four resume points and the cover letter before saving."
      );
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            jobPost,
            resumePoints,
            coverLetter
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not save version");
        return;
      }

      setSelectedVersionId(data.version?.id || null);

      // Refresh the list after saving.
      await loadSavedVersions(token, false);

      setMessage("Resume version saved successfully!");
    } catch (error) {
      console.error("Save version error:", error);
      setMessage("Could not connect to the server");
    } finally {
      setIsSaving(false);
    }
  };

  // REOPEN A SAVED VERSION
  const handleReopenVersion = (version) => {
    if (
      typeof version.job_post !== "string" ||
      !Array.isArray(version.resume_points) ||
      version.resume_points.length !== 4 ||
      typeof version.cover_letter !== "string"
    ) {
      setMessage("This saved version has invalid data");
      return;
    }

    setJobPost(version.job_post);
    setResumePoints([...version.resume_points]);
    setCoverLetter(version.cover_letter);

    setSelectedVersionId(version.id);

    setMessage(
      `Version #${version.id} reopened successfully!`
    );

    // Return to the editable content.
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");

    clearUserData();

    setLoginEmail("");
    setLoginPassword("");

    setMessage("Logged out successfully!");
  };

  // LOAD PROFILE WHEN THE PAGE STARTS
  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <div
      style={{
        maxWidth: "850px",
        margin: "30px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h1>AI Resume Builder</h1>

      <p>{message}</p>

      <hr />

      {/* SIGN UP */}
      <h2>Create Account</h2>

      <form onSubmit={handleSignup}>
        <div>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />
        </div>

        <br />

        <div>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
          />
        </div>

        <br />

        <button type="submit">
          Sign Up
        </button>
      </form>

      <hr />

      {/* LOGIN */}
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <div>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={loginEmail}
            onChange={(event) =>
              setLoginEmail(event.target.value)
            }
            required
          />
        </div>

        <br />

        <div>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={loginPassword}
            onChange={(event) =>
              setLoginPassword(event.target.value)
            }
            required
          />
        </div>

        <br />

        <button type="submit">
          Login
        </button>
      </form>

      <br />

      <button
        type="button"
        onClick={handleLogout}
      >
        Logout
      </button>

      <hr />

      {/* PROFILE */}
      <h2>Profile</h2>

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
            rows="4"
            cols="60"
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
            rows="4"
            cols="60"
          />
        </div>

        <br />

        <button type="submit">
          Save Profile
        </button>
      </form>

      <hr />

      {/* GENERATION */}
      <h2>Generate Resume & Cover Letter</h2>

      <form onSubmit={handleGenerate}>
        <div>
          <label>Job Description</label>
          <br />

          <textarea
            value={jobPost}
            onChange={(event) =>
              setJobPost(event.target.value)
            }
            rows="10"
            cols="60"
            placeholder="Paste the job description here..."
          />
        </div>

        <br />

        <button
          type="submit"
          disabled={isGenerating || isSaving}
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </form>

      {/* EDITABLE RESUME POINTS */}
      {resumePoints.length > 0 && (
        <>
          <hr />

          <h2>Resume Points</h2>

          {selectedVersionId && (
            <p>
              Editing saved version #{selectedVersionId}
            </p>
          )}

          {resumePoints.map((point, index) => (
            <div key={index}>
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
                rows="3"
                cols="60"
              />

              <br />
              <br />
            </div>
          ))}
        </>
      )}

      {/* EDITABLE COVER LETTER */}
      {coverLetter && (
        <>
          <h2>Cover Letter</h2>

          <textarea
            value={coverLetter}
            onChange={(event) =>
              setCoverLetter(event.target.value)
            }
            rows="15"
            cols="60"
          />
        </>
      )}

      {/* SAVE VERSION */}
      {resumePoints.length === 4 && (
        <>
          <br />
          <br />

          <button
            type="button"
            onClick={handleSaveVersion}
            disabled={isSaving || isGenerating}
          >
            {isSaving ? "Saving..." : "Save Version"}
          </button>

          <p>
            Saving creates a new version without
            overwriting previous versions.
          </p>
        </>
      )}

      <hr />

      {/* SAVED VERSIONS */}
      <h2>Saved Versions</h2>

      <button
        type="button"
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

      {savedVersions.length === 0 && (
        <p>No saved versions currently displayed.</p>
      )}

      {savedVersions.map((version) => (
        <div
          key={version.id}
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            marginTop: "15px",
            borderRadius: "8px"
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
            type="button"
            onClick={() =>
              handleReopenVersion(version)
            }
          >
            Reopen Version
          </button>
        </div>
      ))}

      <hr />

      <p>
        AI Resume Builder — Week 3 Development
      </p>
    </div>
  );
}

export default App;
