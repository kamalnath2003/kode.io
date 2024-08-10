import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Editor } from '@monaco-editor/react';
import io from 'socket.io-client';

function EditorPage() {
  const { id } = useParams();
  const [code, setCode] = useState('// Shared Java code goes here\n');
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const socketInstance = io('http://localhost:5000', {
      query: { id },
      transports: ['websocket']
    });

    setSocket(socketInstance);

    socketInstance.on('codeChange', (newCode) => {
      setCode(newCode);
    });

    socketInstance.on('output', (data) => {
      setOutput((prevOutput) => prevOutput + data);
    });

    socketInstance.on('endProcess', () => {
      setIsRunning(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [id]);

  const handleCodeChange = (value) => {
    setCode(value);
    if (socket) {
      socket.emit('codeChange', value);
    }
  };

  const handleCompileAndRun = () => {
    if (socket) {
      setOutput(''); // Clear previous output
      setIsRunning(true);
      socket.emit('startCode', { code });
    }
  };

  const handleSendInput = () => {
    if (socket && isRunning) {
      socket.emit('sendInput', input);
      setInput(''); // Clear input field after sending
    }
  };

  return (
    <div className="editor-page">
      <h2>Session ID: {id}</h2>
      <Editor
        height="60vh"
        language="java"
        theme="vs-dark"
        value={code}
        onChange={(value) => handleCodeChange(value)}
      />
      <button onClick={handleCompileAndRun} disabled={isRunning}>
        Compile & Run
      </button>
      {isRunning && (
        <div>
          <textarea
            placeholder="Enter input for your program"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows="4"
            style={{ width: '100%', marginTop: '10px' }}
          />
          <button onClick={handleSendInput}>Send Input</button>
        </div>
      )}
      <div className="output-container">
        <div className="output-label">Output:</div>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default EditorPage;
