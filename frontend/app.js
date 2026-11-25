const messages = document.querySelector("#messages");
const form = document.querySelector("#chat-form");
const promptBox = document.querySelector("#prompt");
const sendButton = document.querySelector("#send");
const connection = document.querySelector("#connection");
const win = document.querySelector("#win");
let sessionId = null;
let thinkingRow = null;

// Animação local: não depende de bibliotecas, imagens ou serviços externos.
const thinkingStyles = document.createElement("style");
thinkingStyles.textContent = `
  .thinking-bubble { min-width: 210px; }
  .thinking-status {
    display: flex; align-items: center; gap: 9px;
    margin-top: 9px; color: #9aa7b9;
    font: 11px 'DM Mono', monospace; letter-spacing: .5px;
  }
  .thinking-dots { display: inline-flex; align-items: center; gap: 4px; }
  .thinking-dots span {
    width: 6px; height: 6px; border-radius: 50%;
    background: #4ce0d2; opacity: .35;
    animation: vortexThinking 1.15s infinite ease-in-out;
  }
  .thinking-dots span:nth-child(2) { animation-delay: .16s; }
  .thinking-dots span:nth-child(3) { animation-delay: .32s; }
  @keyframes vortexThinking {
    0%, 60%, 100% { transform: translateY(0); opacity: .3; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .thinking-dots span { animation: none; opacity: 1; }
  }
`;
document.head.appendChild(thinkingStyles);

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "VX4" : "Você";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const label = document.createElement("small");
  label.textContent = role === "assistant" ? "VORTEX Assistente" : "PARTICIPANT";

  const content = document.createElement("p");
  content.textContent = text;

  bubble.append(label, content);
  row.append(avatar, bubble);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

function showThinking() {
  removeThinking();

  thinkingRow = document.createElement("div");
  thinkingRow.className = "message assistant thinking-message";
  thinkingRow.setAttribute("aria-label", "Vortex 4 está processando a mensagem");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "VX4";

  const bubble = document.createElement("div");
  bubble.className = "bubble thinking-bubble";

  const label = document.createElement("small");
  label.textContent = "VORTEX Assistente";

  const status = document.createElement("div");
  status.className = "thinking-status";
  const statusText = document.createElement("span");
  statusText.textContent = "Analisando sua mensagem";

  const dots = document.createElement("span");
  dots.className = "thinking-dots";
  dots.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) {
    dots.appendChild(document.createElement("span"));
  }

  status.append(statusText, dots);
  bubble.append(label, status);
  thinkingRow.append(avatar, bubble);
  messages.append(thinkingRow);
  messages.scrollTop = messages.scrollHeight;
}

function removeThinking() {
  if (thinkingRow) {
    thinkingRow.remove();
    thinkingRow = null;
  }
}

async function checkHealth() {
  try {
    const r = await fetch("/api/health");
    if (!r.ok) throw new Error("offline");
    const data = await r.json();
    connection.textContent = `MODEL ONLINE • ${data.model.toUpperCase()}`;
  } catch {
    connection.textContent = "MODELO INDISPONÍVEL";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = promptBox.value.trim();
  if (!message || sendButton.disabled) return;

  addMessage("user", message);
  promptBox.value = "";
  sendButton.disabled = true;
  sendButton.querySelector("span").textContent = "AGUARDE";
  showThinking();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({message, session_id: sessionId})
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Falha ao consultar o modelo.");

    sessionId = data.session_id;
    removeThinking();
    addMessage("assistant", data.reply);

    if (data.solved && data.flag) {
      document.querySelector("#flag").textContent = data.flag;
      win.classList.remove("hidden");
      win.scrollIntoView({behavior: "smooth", block: "center"});
    }
  } catch (error) {
    removeThinking();
    addMessage("assistant", `Erro: ${error.message}`);
  } finally {
    removeThinking();
    sendButton.disabled = false;
    sendButton.querySelector("span").textContent = "ENVIAR";
    promptBox.focus();
  }
});

promptBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelector("#reset").addEventListener("click", async () => {
  if (sessionId) {
    await fetch("/api/reset", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({session_id: sessionId})
    }).catch(() => {});
  }

  removeThinking();
  sessionId = null;
  messages.replaceChildren();
  win.classList.add("hidden");
  addMessage("assistant", "Nova sessão iniciada. Como posso ajudar você?");
});

checkHealth();
