const selfIdEl = document.getElementById("selfId");
const peerListEl = document.getElementById("peerList");
const connStatusEl = document.getElementById("connStatus");
const fileInput = document.getElementById("fileInput");
const sendFileBtn = document.getElementById("sendFileBtn");
const transfersEl = document.getElementById("transfers");

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
  console.log("[STATUS]", text);
}

function connectWS() {
  console.log("[WS] connecting to", `ws://${location.host}`);
  ws = new WebSocket(`ws://${location.host}`);

  ws.onopen = () => {
    console.log("[WS] open");
    ws.send(JSON.stringify({ type: "hello", id: selfId }));
  };

  ws.onmessage = async (event) => {
    console.log("[WS] message:", event.data);
    const msg = JSON.parse(event.data);
    if (msg.type === "peers") {
      peers = msg.peers;
      console.log("[WS] peers list:", peers);
      renderPeers();
    } else if (msg.type === "signal") {
      console.log("[WS] signal from", msg.from, msg.data.type);
      await handleSignal(msg.from, msg.data);
    }
  };

  ws.onerror = (err) => {
    console.error("[WS] error:", err);
    setStatus("Signalling error");
  };

  ws.onclose = () => {
    console.log("[WS] closed");
    setStatus("Signalling disconnected");
  };
}

function renderPeers() {
  peerListEl.innerHTML = "";
  peers.forEach((id) => {
    const li = document.createElement("li");
    li.textContent = id === selfId ? `${id} (you)` : id;
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
  console.log("[RTC] creating peer connection, caller:", isCaller, "remote:", remoteId);

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("[RTC] ICE candidate");
      sendSignal(remoteId, { type: "candidate", candidate: event.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log("[RTC] state:", pc.connectionState);
  };

  pc.ondatachannel = (event) => {
    console.log("[RTC] datachannel received");
    dataChannel = event.channel;
    setupDataChannel();
  };

  if (isCaller) {
    console.log("[RTC] creating datachannel");
    dataChannel = pc.createDataChannel("beamdrops");
    setupDataChannel();
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log("[DC] open");
    setStatus(`Connected to ${currentPeerId}`);
    sendFileBtn.disabled = false;
  };

  dataChannel.onclose = () => {
    console.log("[DC] close");
    setStatus("Disconnected");
    sendFileBtn.disabled = true;
  };

  dataChannel.onmessage = async (event) => {
    if (typeof event.data === "string") {
      try {
        const { type, name, size } = JSON.parse(event.data);
        if (type === "file-meta") {
          logTransfer(`Incoming file: ${name} (${size} bytes)`);
          receiveFile(name, size);
        }
      } catch (e) {
        console.warn("[DC] text message not JSON:", event.data);
      }
    } else {
      console.warn("[DC] unexpected binary without meta");
    }
  };
}

function sendSignal(to, data) {
  console.log("[WS] send signal to", to, data.type);
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
    setStatus(`Incoming connection from ${from}`);
    createPeerConnection(false, from);
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal(from, { type: "answer", sdp: answer });
  } else if (data.type === "answer") {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
  } else if (data.type === "candidate") {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      console.error("[RTC] addIceCandidate error:", e);
    }
  }
}

// --- File sending (simple, no chunking) ---
sendFileBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file || !dataChannel || dataChannel.readyState !== "open") return;

  dataChannel.send(
    JSON.stringify({ type: "file-meta", name: file.name, size: file.size })
  );

  const reader = new FileReader();
  reader.onload = () => {
    const arrayBuffer = reader.result;
    dataChannel.send(arrayBuffer);
    logTransfer(`Sent file: ${file.name} (${file.size} bytes)`);
  };
  reader.readAsArrayBuffer(file);
});

function receiveFile(name, size) {
  let receivedBuffers = [];
  let receivedBytes = 0;

  dataChannel.onmessage = (event) => {
    if (typeof event.data === "string") {
      return;
    }
    receivedBuffers.push(event.data);
    receivedBytes += event.data.byteLength;

    if (receivedBytes >= size) {
      const blob = new Blob(receivedBuffers);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.textContent = `Download ${name}`;
      logTransfer(`Received file: ${name} (${size} bytes)`);
      transfersEl.appendChild(a);
      transfersEl.appendChild(document.createElement("br"));

      // restore handler for meta messages
      dataChannel.onmessage = async (event2) => {
        if (typeof event2.data === "string") {
          try {
            const { type, name: n2, size: s2 } = JSON.parse(event2.data);
            if (type === "file-meta") {
              logTransfer(`Incoming file: ${n2} (${s2} bytes)`);
              receiveFile(n2, s2);
            }
          } catch (e) {
            console.warn("[DC] text message not JSON:", event2.data);
          }
        }
      };
    }
  };
}

// initial connect
connectWS();
