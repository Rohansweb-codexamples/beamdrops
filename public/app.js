const selfIdEl = document.getElementById("selfId");
const peerListEl = document.getElementById("peerList");
const connStatusEl = document.getElementById("connStatus");
const fileInput = document.getElementById("fileInput");
const sendFileBtn = document.getElementById("sendFileBtn");
const transfersEl = document.getElementById("transfers");
const chatMessagesEl = document.getElementById("chatMessages");
const chatTextEl = document.getElementById("chatText");
const sendMsgBtn = document.getElementById("sendMsgBtn");
const usernameInput = document.getElementById("usernameInput");
const setNameBtn = document.getElementById("setNameBtn");

const selfId = crypto.randomUUID();
selfIdEl.textContent = `ID: ${selfId.slice(0, 6)}`;

let username = "User-" + selfId.slice(0, 4);
const autoNames = [
  "Buzzing Bee", "Electric Falcon", "Neon Sparrow",
  "Silent Thunder", "Blue Comet", "Pixel Ghost"
];

let ws;
let peers = [];
let currentPeerId = null;
let pc = null;
let dataChannel = null;

/* ---------------- SPARKS ---------------- */
function spawnSpark() {
  const container = document.querySelector(".spark-container");
  const spark = document.createElement("div");
  spark.className = "spark";

  spark.style.setProperty("--dx", (Math.random() - 0.5) * 200);
  spark.style.setProperty("--dy", (Math.random() - 0.5) * 200);

  container.appendChild(spark);
  setTimeout(() => spark.remove(), 800);
}
setInterval(spawnSpark, 120);

/* ---------------- FAVICON ---------------- */
function updateFavicon() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#00ffcc";
  ctx.beginPath();
  ctx.arc(32, 32, 20 + Math.sin(Date.now() / 200) * 4, 0, Math.PI * 2);
  ctx.fill();

  document.getElementById("favicon").href = canvas.toDataURL();
}
setInterval(updateFavicon, 120);

/* ---------------- UI HELPERS ---------------- */
function addChatMessage(text, who = "peer") {
  const div = document.createElement("div");
  div.className = `chat-line chat-${who}`;
  div.textContent = text;
  chatMessagesEl.appendChild(div);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function setStatus(text) {
  connStatusEl.textContent = text;
}

/* ---------------- WEBSOCKET ---------------- */
function connectWS() {
  const wsUrl =
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "hello", id: selfId }));
  };

  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "peers") {
      peers = msg.peers;
      renderPeers();
    }

    if (msg.type === "signal") {
      await handleSignal(msg.from, msg.data);
    }
  };
}

function renderPeers() {
  peerListEl.innerHTML = "";

  const radarRect = document.querySelector(".radar").getBoundingClientRect();

  peers.forEach((id, index) => {
    const li = document.createElement("li");
    li.textContent = id === selfId ? "You" : id.slice(0, 6);

    const radius = radarRect.width / 2 - 40;
    const angle = (index / Math.max(peers.length, 1)) * Math.PI * 2;
    const cx = radarRect.width / 2;
    const cy = radarRect.height / 2;

    li.style.left = `${cx + Math.cos(angle) * radius}px`;
    li.style.top = `${cy + Math.sin(angle) * radius}px`;

    if (id !== selfId) {
      li.onclick = () => startConnection(id);
    }

    peerListEl.appendChild(li);
  });
}

/* ---------------- WEBRTC ---------------- */
function createPeerConnection(isCaller, remoteId) {
  currentPeerId = remoteId;

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal(remoteId, { type: "candidate", candidate: event.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
      setStatus("Disconnected");
      sendFileBtn.disabled = true;
    }
  };

  pc.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel();
  };

  if (isCaller) {
    dataChannel = pc.createDataChannel("beamdrops");
    setupDataChannel();
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    setStatus(`Connected to ${currentPeerId}`);
    sendFileBtn.disabled = false;
    addChatMessage("Connected", "you");
  };

  dataChannel.onclose = () => {
    setStatus("Disconnected");
    sendFileBtn.disabled = true;
    addChatMessage("Disconnected", "system");
  };

  dataChannel.onmessage = (event) => {
    if (typeof event.data === "string") {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "chat") {
          addChatMessage(`${msg.from}: ${msg.text}`, "peer");
          return;
        }

        if (msg.type === "file-meta") {
          receiveFile(msg.name, msg.size);
          return;
        }
      } catch {
        addChatMessage(event.data, "peer");
      }
    }
  };
}

function sendSignal(to, data) {
  ws.send(JSON.stringify({ type: "signal", to, data }));
}

async function startConnection(remoteId) {
  setStatus(`Connecting to ${remoteId}...`);
  createPeerConnection(true, remoteId);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  sendSignal(remoteId, { type: "offer", sdp: offer });
}

async function handleSignal(from, data) {
  if (data.type === "offer") {
    createPeerConnection(false, from);
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal(from, { type: "answer", sdp: answer });
  }

  if (data.type === "answer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
  }

  if (data.type === "candidate") {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch {}
  }
}

/* ---------------- FILE TRANSFER ---------------- */
sendFileBtn.onclick = () => {
  const file = fileInput.files[0];
  if (!file || !dataChannel || dataChannel.readyState !== "open") return;

  dataChannel.send(JSON.stringify({ type: "file-meta", name: file.name, size: file.size }));

  const reader = new FileReader();
  reader.onload = () => {
    dataChannel.send(reader.result);
    addChatMessage(`You sent: ${file.name}`, "you");
  };
  reader.readAsArrayBuffer(file);
};

function receiveFile(name, size) {
  let received = [];
  let bytes = 0;

  dataChannel.onmessage = (event) => {
    if (typeof event.data === "string") return;

    received.push(event.data);
    bytes += event.data.byteLength;

    if (bytes >= size) {
      const blob = new Blob(received);
      const url = URL.createObjectURL(blob);

      addChatMessage(`📄 ${name} (download below)`, "peer");

      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.textContent = `Download ${name}`;
      transfersEl.appendChild(a);
      transfersEl.appendChild(document.createElement("br"));

      setupDataChannel();
    }
  };
}

/* ---------------- CHAT ---------------- */
sendMsgBtn.onclick = () => {
  const text = chatTextEl.value.trim();
  if (!text || !dataChannel || dataChannel.readyState !== "open") return;

  const msg = { type: "chat", text, from: username };
  dataChannel.send(JSON.stringify(msg));

  addChatMessage(`You: ${text}`, "you");
  chatTextEl.value = "";
};

chatTextEl.onkeydown = (e) => {
  if (e.key === "Enter") sendMsgBtn.click();
};

/* ---------------- USERNAME ---------------- */
setNameBtn.onclick = () => {
  username = usernameInput.value.trim() || autoNames[Math.floor(Math.random() * autoNames.length)];
  addChatMessage(`You are now: ${username}`, "system");
};

/* ---------------- THEME ---------------- */
document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("light-theme");
};

/* ---------------- START ---------------- */
connectWS();
