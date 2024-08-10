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
  const { id } = socket.handshake.query;
  socket.join(id);

  socket.on('startCode', ({ code }) => {
    fs.writeFileSync(tempFilePath, code);
    io.in(id).emit('codeUpdate', code); // Broadcast code to all clients in the session

    const javac = spawn('javac', [tempFilePath]);

    javac.on('close', (code) => {
      if (code === 0) {
        javaProcess = spawn('java', ['-cp', tempDir, 'Main']);

        javaProcess.stdout.on('data', (data) => {
          io.in(id).emit('outputUpdate', data.toString()); // Broadcast output
        });

        javaProcess.stderr.on('data', (data) => {
          io.in(id).emit('outputUpdate', data.toString()); // Broadcast error
        });

        javaProcess.on('close', (code) => {
          if (code !== 0) {
            io.in(id).emit('outputUpdate', `Process exited with code ${code}`);
          }
          io.in(id).emit('endProcess'); // Notify clients that process has ended
        });
      } else {
        io.in(id).emit('outputUpdate', 'Compilation failed');
      }
    });
  });

  socket.on('sendInput', (input) => {
    if (javaProcess) {
      javaProcess.stdin.write(input + '\n');
      io.in(id).emit('inputUpdate', input); // Broadcast input to all clients in the session
    }
  });

  socket.on('codeChange', (newCode) => {
    io.in(id).emit('codeUpdate', newCode); // Broadcast code change
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
