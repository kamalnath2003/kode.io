const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process'); // Import exec here

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // The origin of your client application
    methods: ["GET", "POST"]
  }
});

// Ensure the temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const tempFilePath = path.join(tempDir, 'Main.java');

// Apply CORS middleware
app.use(cors());
app.use(express.json()); // Ensure body parsing is configured

io.on('connection', (socket) => {
  const { id } = socket.handshake.query;
  socket.join(id);

  socket.on('codeChange', (newCode) => {
    socket.to(id).emit('codeChange', newCode);
  });
});

app.post('/compile', (req, res) => {
  const code = req.body.code;
  fs.writeFileSync(tempFilePath, code);

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
      const classFilePath = path.join(tempDir, 'Main.class');
      if (fs.existsSync(classFilePath)) {
        fs.unlinkSync(classFilePath);
      }
    } catch (cleanupError) {
      console.error(`Cleanup error: ${cleanupError.message}`);
    }
  });
});

server.listen(5000, () => {
  console.log('Server is listening on port 5000');
});
