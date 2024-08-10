const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Ensure the temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Paths to temporary files
const tempFilePath = path.join(tempDir, 'Main.java');
const classFilePath = path.join(tempDir, 'Main.class');

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// WebSocket server setup
const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${server.address().port}`);
});
const wss = new WebSocket.Server({ server });

// WebSocket connections management
const sessions = {}; // Store sessions and their connections

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.pathname.split('/')[2];

  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  sessions[sessionId].push(ws);

  ws.on('message', (message) => {
    // Broadcast message to all clients in the same session
    sessions[sessionId].forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    sessions[sessionId] = sessions[sessionId].filter(client => client !== ws);
    if (sessions[sessionId].length === 0) {
      delete sessions[sessionId];
    }
  });
});

// Route for compiling and running Java code
app.post('/compile', (req, res) => {
  const code = req.body.code;

  // Write the code to a temporary Java file
  fs.writeFileSync(tempFilePath, code);

  // Compile and run the Java code
  exec(`javac ${tempFilePath} && java -cp ${tempDir} Main`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${stderr}`);
      return res.send({ output: stderr });
    }
    
    console.log(`Execution output: ${stdout}`);
    res.send({ output: stdout });
    
    // Cleanup files after execution
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (fs.existsSync(classFilePath)) {
        fs.unlinkSync(classFilePath);
      }
    } catch (cleanupError) {
      console.error(`Cleanup error: ${cleanupError.message}`);
    }
  });
});
