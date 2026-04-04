import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients: id → websocket
const clients = new Map();

// Broadcast updated peer list to all clients
function broadcastPeerList() {
  const list = Array.from(clients.keys());
  const msg = JSON.stringify({ type: "peers", peers: list });

  for (const ws of clients.values()) {
    ws.send(msg);
  }
}

wss.on("connection", (ws) => {
  let id = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    // When a client connects, it sends "hello" with its ID
    if (msg.type === "hello") {
      id = msg.id;
      clients.set(id, ws);
      broadcastPeerList();
      return;
    }

    // WebRTC signalling messages
    if (msg.type === "signal" && msg.to && clients.has(msg.to)) {
      const target = clients.get(msg.to);
      target.send(
        JSON.stringify({
          type: "signal",
          from: id,
          data: msg.data
        })
      );
    }
  });

  ws.on("close", () => {
    if (id && clients.has(id)) {
      clients.delete(id);
      broadcastPeerList();
    }
  });
});

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = 3000;

// IMPORTANT: Listen on ALL network interfaces so other devices can connect
server.listen(PORT, "0.0.0.0", () => {
  console.log(`BeamDrop server running on http://0.0.0.0:${PORT}`);
  console.log(`Open on your network: http://YOUR-IP:${PORT}`);
});
