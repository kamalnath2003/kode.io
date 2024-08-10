import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Updated import

function HomePage() {
  const navigate = useNavigate(); // Updated hook
  const [sessionId, setSessionId] = useState('');

  const createNewSession = () => {
    const newSessionId = Math.random().toString(36).substr(2, 9); // Generate a random session ID
    navigate(`/session/${newSessionId}`); // Updated navigation method
  };

  const joinSession = () => {
    if (sessionId.trim()) {
      navigate(`/session/${sessionId}`); // Updated navigation method
    }
  };

  return (
    <div className="home-page">
      <button onClick={createNewSession}>Create New Session</button>
      <div>
        <input
          type="text"
          placeholder="Enter Session ID"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />
        <button onClick={joinSession}>Join Session</button>
      </div>
    </div>
  );
}

export default HomePage;
