import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Editor } from '@monaco-editor/react';
import io from 'socket.io-client';

function EditorPage() {
  const { id } = useParams();
  const [code, setCode] = useState('// Shared Java code goes here\n');
  const [output, setOutput] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io('http://localhost:5000', {
      query: { id },
      transports: ['websocket']
    });

    setSocket(socketInstance);

    // Listen for code updates from the server
    socketInstance.on('codeChange', (newCode) => {
      setCode(newCode);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [id]);

  const handleCodeChange = (value) => {
    setCode(value);
    if (socket) {
      socket.emit('codeChange', value); // Emit code changes
    }
  };

const handleCompileAndRun = async () => {
  try {
    const response = await fetch('http://localhost:5000/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        input: 'User input here' // Include the input data
      }),
    });

    const data = await response.json();
    setOutput(data.output);
  } catch (error) {
    console.error('Error:', error);
    setOutput('Error in executing the code.');
  }
};


  return (
    <div className="editor-page">
      <h2>Session ID: {id}</h2>
      <Editor
        height="80vh"
        language="java"
        theme="vs-dark"
        value={code}
        onChange={(value) => handleCodeChange(value)}
      />
      <button onClick={handleCompileAndRun}>Compile & Run</button>
      <div className="output-container">
        <div className="output-label">Output:</div>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default EditorPage;
