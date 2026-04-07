const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from the current directory
app.use(express.static(__dirname));

const peers = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a global room for peer discovery
    socket.on('join-network', (userData) => {
        peers[socket.id] = {
            id: socket.id,
            name: userData.name,
            device: userData.device
        };
        
        // Broadcast to everyone that a new peer joined
        io.emit('peers-update', Object.values(peers));
    });

    // Handle Signaling for WebRTC
    socket.on('signal', ({ to, from, signal }) => {
        io.to(to).emit('signal', { from, signal });
    });

    // Handle File Transfer Requests
    socket.on('file-offer', ({ to, from, metadata }) => {
        io.to(to).emit('file-offer', { from, metadata });
    });

    socket.on('file-accept', ({ to, from }) => {
        io.to(to).emit('file-accept', { from });
    });

    socket.on('file-decline', ({ to, from }) => {
        io.to(to).emit('file-decline', { from });
    });

    socket.on('disconnect', () => {
        delete peers[socket.id];
        io.emit('peers-update', Object.values(peers));
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Beam Drop server running on port ${PORT}`);
});
