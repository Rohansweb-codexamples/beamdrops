const selfIdEl = document.getElementById("selfId");
const peerListEl = document.getElementById("peerList");
const connStatusEl = document.getElementById("connStatus");
const fileInput = document.getElementById("fileInput");
const sendFileBtn = document.getElementById("sendFileBtn");
const transfersEl = document.getElementById("transfers");
const chatMessagesEl = document.getElementById("chatMessages");
const chatTextEl = document.getElementById("chatText");
const sendMsgBtn = document.getElementById("sendMsgBtn");

const selfId = crypto.randomUUID();
selfIdEl.textContent = `Your ID: ${selfId}`;

let ws;
let peers = [];
let currentPeerId = null;
let pc = null;
let dataChannel = null;

function logTransfer(msg) {
  transfersEl.textContent += msg + "\n";
  transfersEl.scrollTop = transfersEl.scrollHeight;
}

function setStatus(text) {
  connStatusEl.textContent = text;
}

function addChatMessage(text, from = "system") {
  const div = document.createElement("div");
  div.className = `chat-line chat-${from}`;
  div.textContent = text;
  chatMessagesEl.appendChild(div);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function connectWS() {
  const wsUrl =
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "hello", id: selfId }));
  };

  ws.onerror = () => {
    setStatus("WebSocket error");
  };

  ws.onclose = () => {
    setStatus("WebSocket closed");
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

  const radarRect = document
    .querySelector(".radar")
    .getBoundingClientRect();

  peers.forEach((id, index) => {
    const li = document.createElement("li");
    li.textContent = id === selfId ? "You" : id.slice(0, 6);

    // random-ish position inside radar bounds
    const radius = radarRect.width / 2 - 40;
    const angle = (index / Math.max(peers.length, 1)) * Math.PI * 2;
    const cx = radarRect.width / 2;
    const cy = radarRect.height / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    li.style.left = `${x}px`;
    li.style.top = `${y}px`;

    if (id === selfId) {
      li.classList.add("self");
    } else {
      li.onclick = () => startConnection(id);
    }

    peerListEl.appendChild(li);
  });
}

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
    addChatMessage("Connected", "system");
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
          addChatMessage(`Peer: ${msg.text}`, "peer");
          return;
        }

        if (msg.type === "file-meta") {
          logTransfer(`Incoming file: ${msg.name} (${msg.size} bytes)`);
          receiveFile(msg.name, msg.size);
          return;
        }
      } catch {
        // plain text
        addChatMessage(`Peer: ${event.data}`, "peer");
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
    } catch (e) {
      console.error("ICE error:", e);
    }
  }
}

// file sending
sendFileBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file || !dataChannel || dataChannel.readyState !== "open") return;

  dataChannel.send(
    JSON.stringify({ type: "file-meta", name: file.name, size: file.size })
  );

  const reader = new FileReader();
  reader.onload = () => {
    dataChannel.send(reader.result);
    logTransfer(`Sent file: ${file.name} (${file.size} bytes)`);
  };
  reader.readAsArrayBuffer(file);
});

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

      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.textContent = `Download ${name}`;
      transfersEl.appendChild(a);
      transfersEl.appendChild(document.createElement("br"));

      logTransfer(`Received file: ${name} (${size} bytes)`);

      // restore handler for meta + chat
      dataChannel.onmessage = (event2) => {
        if (typeof event2.data === "string") {
          try {
            const msg = JSON.parse(event2.data);

            if (msg.type === "chat") {
              addChatMessage(`Peer: ${msg.text}`, "peer");
              return;
            }

            if (msg.type === "file-meta") {
              logTransfer(`Incoming file: ${msg.name} (${msg.size} bytes)`);
              receiveFile(msg.name, msg.size);
              return;
            }
          } catch {
            addChatMessage(`Peer: ${event2.data}`, "peer");
          }
        }
      };
    }
  };
}

// chat sending
sendMsgBtn.addEventListener("click", () => {
  const text = chatTextEl.value.trim();
  if (!text || !dataChannel || dataChannel.readyState !== "open") return;

  dataChannel.send(JSON.stringify({ type: "chat", text }));
  addChatMessage(`You: ${text}`, "you");
  chatTextEl.value = "";
});

chatTextEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMsgBtn.click();
  }
});

// start
connectWS();
