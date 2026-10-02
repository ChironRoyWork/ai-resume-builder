import { useEffect, useState } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");

  const [jobPost, setJobPost] = useState("");
  const [resumePoints, setResumePoints] = useState([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSignup = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/register",
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

      setMessage("Account created successfully!");

      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
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

      localStorage.setItem("token", data.token);
      await loadProfile(data.token);

      setMessage("Login successful!");

      setLoginEmail("");
      setLoginPassword("");
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("You must log in before saving a profile");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/profile",
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
      setMessage("Could not connect to the server");
    }
  };

  const loadProfile = async (loginToken = null) => {
    const token = loginToken || localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/profile",
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

      setName(data.profile.name || "");
      setSkills(data.profile.skills || "");
      setExperience(data.profile.experience || "");
    } catch (error) {
      console.error("Could not load profile");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");

    setName("");
    setSkills("");
    setExperience("");

    setMessage("Logged out successfully!");
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <div>
      <h1>AI Resume Builder</h1>

      <h2>Create Account</h2>

      <form onSubmit={handleSignup}>
        <div>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <br />

        <button type="submit">
          Sign Up
        </button>
      </form>

      <hr />

      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <div>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
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
            onChange={(event) => setLoginPassword(event.target.value)}
            required
          />
        </div>

        <br />

        <button type="submit">
          Login
        </button>
      </form>

        <button type="button" onClick={handleLogout}>
          Logout
        </button>  

      <hr />

      <h2>Profile</h2>

      <form onSubmit={handleSaveProfile}>
        <div>
          <label>Name</label>
          <br />
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <br />

        <div>
          <label>Skills</label>
          <br />
          <textarea
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
          />
        </div>

        <br />

        <div>
          <label>Experience</label>
          <br />
          <textarea
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
          />
        </div>

        <br />

        <button type="submit">
          Save Profile
        </button>
      </form>

      <p>{message}</p>
    </div>
  );
}

export default App;