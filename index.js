// index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Enable CORS so external web pages can access the stream
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve a basic status page
app.get('/', (req, res) => {
  res.send('<h1>Direct Live Stream Server is Running</h1><p>Connect your broadcaster and player via WebSockets.</p>');
});

// Handle real-time connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When the broadcaster sends a video chunk, broadcast it to all viewers
  socket.on('stream-data', (data) => {
    socket.broadcast.emit('stream-data', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Render dynamically assigns a port via process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
