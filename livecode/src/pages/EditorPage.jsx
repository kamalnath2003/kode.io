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
    // const socketInstance = io('http://localhost:5000',
    const socketInstance = io(process.env.NODE_ENV === 'production' 
      ? 'https://kode-io-1.onrender.com/' 
      : 'http://localhost:5000', {
        query: { id },
        transports: ['websocket']
    });

    setSocket(socketInstance);

    socketInstance.on('codeUpdate', (newCode) => {
      setCode(newCode);
    });

    socketInstance.on('outputUpdate', (data) => {
      setOutput((prevOutput) => prevOutput + data);
    });

    socketInstance.on('inputUpdate', (newInput) => {
      setInput(newInput);
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
    <div className="container-fluid">
      <div className="row">
        <div className="col">
        <h2>Session ID: {id}</h2>

        </div>
      </div>
      <div className="row">
        <div className="col">

    <div className="editor-page">
      
      <Editor
        height="60vh"
        language="java"
        theme="vs-dark"
        value={code}
        onChange={(value) => handleCodeChange(value)}
      />


    </div>
    </div>
        <div className="col boxx output-container" id="outputbox" >
        <div className="output-container" >
        <div className="output-label">Output:</div>
        <pre>{output}</pre>
      </div>

        </div>
        </div>
        <div className="row">
          <div className="col">
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
          </div>
        </div>
      </div>

    
  );
}

export default EditorPage;
