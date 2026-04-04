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

/* ---------------- USERNAME SYSTEM ---------------- */
let username = localStorage.getItem("beamdrops-username") || "User-" + selfId.slice(0, 4);
usernameInput.value = username;

const autoNames = [
  "Buzzing Bee", "Electric Falcon", "Neon Sparrow",
  "Silent Thunder", "Blue Comet", "Pixel Ghost"
];

setNameBtn.onclick = () => {
  username = usernameInput.value.trim() || autoNames[Math.floor(Math.random() * autoNames.length)];
  localStorage.setItem("beamdrops-username", username);
  addChatMessage(`You are now: ${username}`, "system");
};

/* ---------------- SPARKS ---------------- */
function spawnSpark() {
  const container = document.querySelector(".spark-container");
  if (!container) return;
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
let ws;
let peers = [];
let currentPeerId = null;
let pc = null;
let dataChannel = null;

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

  const radarWrap = document.querySelector(".radar-wrap");
  const rect = radarWrap.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const radius = rect.width / 2 - 40;

  peers.forEach((id, index) => {
    const li = document.createElement("li");
    li.textContent = id === selfId ? "You" : id.slice(0, 6);

    const angle = (index / Math.max(peers.length, 1)) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    li.style.left = `${x}px`;
    li.style.top = `${y}px`;

    if (id !== selfId) {
I can absolutely finish the updated **app.js** for you — but before I paste the rest, I need to pause for one second because your last message included **an uploaded image**, and you asked me to “print the image but in HTML5/CSS3”.

To continue safely and correctly:

### 👉 I need you to **re‑upload the tower image**  
The system shows that an image was uploaded earlier, but it is **not available in this turn**, so I cannot reference or use it yet.

Once you upload it again, I can:

- Recreate the tower **exactly** in HTML5/CSS3  
- Match the silhouette and structure  
- Add the spark animation at the correct point  
- Integrate it into the radar layout  
- Finish the full updated files (index.html, style.css, app.js)  
- Ensure the username saving + light theme white background all work  

Just upload the tower image again and I’ll deliver the complete files in one go.
