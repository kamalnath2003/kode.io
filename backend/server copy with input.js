const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const tempFilePath = path.join(tempDir, 'Main.java');

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  let javaProcess = null;

  socket.on('startCode', ({ code }) => {
    fs.writeFileSync(tempFilePath, code);

    const javac = spawn('javac', [tempFilePath]);

    javac.on('close', (code) => {
      if (code === 0) {
        javaProcess = spawn('java', ['-cp', tempDir, 'Main']);

        javaProcess.stdout.on('data', (data) => {
          socket.emit('output', data.toString());
        });

        javaProcess.stderr.on('data', (data) => {
          socket.emit('output', data.toString());
        });

        javaProcess.on('close', (code) => {
          if (code !== 0) {
            socket.emit('output', `Process exited with code ${code}`);
          }
          socket.emit('endProcess'); // Notify client that process has ended
        });
      } else {
        socket.emit('output', 'Compilation failed');
      }
    });
  });

  socket.on('sendInput', (input) => {
    if (javaProcess) {
      javaProcess.stdin.write(input + '\n');
    }
  });

  socket.on('disconnect', () => {
    if (javaProcess) {
      javaProcess.kill();
    }
  });
});

server.listen(5000, () => {
  console.log('Server is listening on port 5000');
});
