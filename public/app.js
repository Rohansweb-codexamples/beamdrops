/* DOM ELEMENTS */
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
const themeToggle = document.getElementById("themeToggle");

/* ID */
const selfId = crypto.randomUUID();
selfIdEl.textContent = `ID: ${selfId.slice(0, 6)}`;

/* USERNAME SYSTEM */
let username =
  localStorage.getItem("beamdrops-username") ||
  "User-" + selfId.slice(0, 4);

usernameInput.value = username;

const autoNames = [
  "Buzzing Bee",
  "Electric Falcon",
  "Neon Sparrow",
  "Silent Thunder",
  "Blue Comet",
  "Pixel Ghost"
];

setNameBtn.onclick = () => {
  username =
    usernameInput.value.trim() ||
    autoNames[Math.floor(Math.random() * autoNames.length)];

  localStorage.setItem("beamdrops-username", username);
  addChatMessage(`You are now: ${username}`, "system");
};

/* THEME SWITCHING */
themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem(
    "beamdrops-theme",
    document.body.classList.contains("light") ? "light" : "dark"
  );
};

/* Load saved theme */
if (localStorage.getItem("beamdrops-theme") === "light") {
  document.body.classList.add("light");
}

/* SPARKS */
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

/* FAVICON */
function updateFavicon() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#00ffcc";
  ctx.beginPath();
  ctx.arc(
    32,
    32,
    20 + Math.sin(Date.now() / 200) * 4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  document.getElementById("favicon").href = canvas.toDataURL();
}
setInterval(updateFavicon, 120);

/* UI HELPERS */
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

/* WEBSOCKET */
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
    li.textContent = id === selfId ? "YouI’ve got you — but before I paste another giant block of code that *still won’t work*, I need to reset the situation a bit so we can actually fix this properly.

Right now, your message says:

> **“nothing works now no theme switching no name nothing fix give me full files”**

That tells me something important:

### 👉 The files I sent **did not load correctly** in your environment  
Either:

- One file didn’t save  
- A syntax error broke the JS  
- The theme class wasn’t applied  
- The username code didn’t run  
- Or the browser cached old files  

Before I paste the final corrected files, I need **one tiny piece of information** so I can fix the exact cause:

---

# 🔍 **Tell me what you see in the browser console**

Open your site → press **F12** → click **Console** → refresh the page.

Then tell me:

### ❗ Do you see ANY red errors?  
Examples:

- `Uncaught SyntaxError: Unexpected token`  
- `Cannot read property 'onclick' of null`  
- `Failed to load resource`  
- `ReferenceError: usernameInput is null`  

Even one line of that will tell me exactly what broke.

---

# Why I need this before giving you new files  
If I paste another full set of files **without knowing the error**, you’ll just get:

- “still doesn’t work”  
- “nothing loads”  
- “theme still broken”  

And we’ll go in circles.

I want to give you **a fully working BeamDrop**, not another broken version.

---

# 🛠️ So — send me the console errors  
Just copy/paste the red text.

After that, I will:

### ✔ Fix the root cause  
### ✔ Give you **fully working** index.html, style.css, app.js  
### ✔ Make theme switching work  
### ✔ Make username saving work  
### ✔ Make radar + tower + sparks work  
### ✔ Make chat + file sending work  
### ✔ Make everything stable  

No more broken builds — we’ll fix it properly.

---

Whenever you're ready, paste the console errors here.
