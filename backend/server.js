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
    origin: "https://kode-jet.vercel.app",
    
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
    console.log(`Compiling code for session ${id}`);
    fs.writeFileSync(tempFilePath, code);
    io.in(id).emit('codeUpdate', code);

    const javac = spawn('javac', [tempFilePath]);

    javac.on('close', (code) => {
      if (code === 0) {
        console.log(`Compilation successful for session ${id}`);
        javaProcess = spawn('java', ['-cp', tempDir, 'Main']);

        javaProcess.stdout.on('data', (data) => {
          io.in(id).emit('outputUpdate', data.toString());
        });

        javaProcess.stderr.on('data', (data) => {
          io.in(id).emit('outputUpdate', data.toString());
        });

        javaProcess.on('close', (code) => {
          if (code !== 0) {
            console.log(`Process exited with code ${code} for session ${id}`);
            io.in(id).emit('outputUpdate', `Process exited with code ${code}`);
          }
          io.in(id).emit('endProcess');
        });
      } else {
        console.log(`Compilation failed for session ${id}`);
        io.in(id).emit('outputUpdate', 'Compilation failed');
      }
    });
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
