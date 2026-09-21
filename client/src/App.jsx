import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  const testServer = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/health");
      const data = await response.json();

      setMessage(data.message);
    } catch (error) {
      setMessage("Could not connect to server");
    }
  };

  return (
    <div>
      <h1>AI Resume Builder</h1>

      <button onClick={testServer}>
        Test Server
      </button>

      <p>{message}</p>
    </div>
  );
}

export default App;