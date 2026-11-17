"use strict";
// ============================================================
//  IA (Claude) : corrections et conversation simulée
//  La clé API reste dans ce navigateur (localStorage).
// ============================================================

const AI_MODELS = {
  "claude-haiku-5-5": "Haiku 5.5 · économique (recommandé)",
  "claude-opus-5-5": "Opus 5.5 · plus précis, plus cher",
};
const aiReady = () => !!S.apiKey;

async function aiAsk(system, messages, maxTokens = 600) {
  const model = S.aiModel || "claude-haiku-5-5";
  const body = { model, max_tokens: maxTokens, system, messages, output_config: { effort: "low" } };
  const headers = {
    "content-type": "application/json",
    "x-api-key": S.apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (model === "claude-opus-5-5") { body.fallbacks = "default"; headers["anthropic-beta"] = "server-side-fallback-2026-07-01"; }
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data.error && data.error.message) || r.status;
    throw new Error(r.status === 401 ? "Clé API invalide (vérifie-la dans Profil)." : r.status === 429 ? "Trop de demandes, réessaie dans un instant." : "Erreur IA : " + msg);
  }
  if (data.stop_reason === "refusal") throw new Error("L'IA n'a pas voulu répondre à cette demande.");
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

const coachIntro = () =>
  `You are an English coach for a French-speaking maintenance engineer (aerospace, naval, automotive; composite structures and industrialization). Learner level: ${LEVELS[S.level].code}.`;

// Mise en forme très simple : **gras** et retours à la ligne
const aiHtml = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

// Bouton « Correction IA » réutilisable : remplit `target` avec l'explication
function aiButton(target, makePrompt) {
  if (!aiReady()) return;
  const b = document.createElement("button");
  b.className = "link"; b.textContent = "🤖 Correction IA";
  b.onclick = async () => {
    b.disabled = true; b.textContent = "🤖 L'IA réfléchit…";
    try {
      const txt = await aiAsk(coachIntro() + " Answer in French, short (max 5 lines), friendly. Explain mistakes and give the corrected English.", [{ role: "user", content: makePrompt() }], 500);
      target.innerHTML = `<div class="model" style="margin-top:8px">${aiHtml(txt)}</div>`;
      b.remove();
    } catch (e) { b.disabled = false; b.textContent = "🤖 Correction IA"; target.textContent = e.message; }
  };
  target.before(b);
}

// ---------------- Conversation simulée ----------------
const SCENARIOS = [
  { icon: "☀️", title: "Point du matin (stand-up)", role: "the team leader running the morning stand-up in a composite repair hangar", start: "Good morning! Let's start the stand-up. What did you work on yesterday?" },
  { icon: "🔍", title: "Constat de dommage avec l'inspecteur", role: "a quality inspector asking about a damage found on a carbon flap panel", start: "Hi, I heard you found something on the flap. Can you describe the damage?" },
  { icon: "📞", title: "Appel fournisseur (préimprégné en retard)", role: "a prepreg supplier's customer service agent; the delivery is late", start: "Hello, Composite Materials Ltd, how can I help you?" },
  { icon: "🏭", title: "Réunion d'industrialisation", role: "a program manager worried about the ramp-up and the cycle time of a new composite line", start: "Thanks for joining. I'm worried about the ramp-up. Where are we on cycle time?" },
  { icon: "🤝", title: "Entretien d'embauche technique", role: "a hiring manager interviewing a composite maintenance engineer for a job in an English-speaking company", start: "Welcome! Could you start by telling me about your experience with composite structures?" },
];
let chat = null;

function renderTalk() {
  app.innerHTML = topbar() + `<h1 class="page">🗣️ Conversation</h1>
    <p class="sub">Joue une vraie situation de travail avec l'IA. Réponds à l'écrit ou au micro ; elle te corrige après chaque réponse.</p>
    ${aiReady() ? "" : `<div class="card"><h3>Clé API nécessaire</h3><p>Ajoute ta clé Anthropic dans <b>Profil</b> pour activer la conversation et les corrections IA.</p></div>`}
    ${SCENARIOS.map((s, i) => `<div class="card row"><div style="font-size:30px">${s.icon}</div>
      <div class="grow"><h3>${esc(s.title)}</h3></div>
      <button class="btn blue small" data-s="${i}" ${aiReady() ? "" : "disabled"}>Commencer</button></div>`).join("")}`;
  app.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => openChat(SCENARIOS[+b.dataset.s])));
}

function openChat(sc) {
  nav.classList.add("hidden");
  chat = { sc, msgs: [{ role: "user", content: "(Start the role-play.)" }, { role: "assistant", content: sc.start }], turns: 0 };
  app.innerHTML = `<div class="lesson-top"><button class="close" id="back">✕</button><b class="grow">${sc.icon} ${esc(sc.title)}</b></div>
    <div id="log"></div><div class="lesson-pad"></div>`;
  $("#back").onclick = () => go("talk");
  const f = document.createElement("div");
  f.className = "footer"; f.id = "footer";
  f.innerHTML = `<div class="footer-inner" style="flex-wrap:nowrap">
    ${SR ? `<button class="speaker" id="cmic" title="Parler">🎤</button>` : ""}
    <input type="text" id="cin" placeholder="Ta réponse en anglais…" autocomplete="off">
    <button class="btn small" id="csend">➤</button></div>`;
  document.body.appendChild(f);
  addBubble("ai", sc.start); speak(sc.start);
  const cin = $("#cin");
  $("#csend").onclick = () => sendChat(cin.value);
  cin.onkeydown = (e) => { if (e.key === "Enter") sendChat(cin.value); };
  const m = $("#cmic");
  if (m) m.onclick = async () => {
    m.textContent = "🎙️";
    try { const a = await listenOnce(); if (a[0]) cin.value = a[0]; } catch (e) {}
    m.textContent = "🎤"; cin.focus();
  };
}

function addBubble(who, text, extra = "") {
  const d = document.createElement("div");
  d.style.cssText = `display:flex;gap:8px;margin:12px 0;${who === "me" ? "justify-content:flex-end" : ""}`;
  d.innerHTML = who === "me"
    ? `<div class="bubble" style="flex:0 1 auto;background:var(--blue-soft)">${esc(text)}</div>`
    : `<div class="mascot" style="font-size:32px">👷</div><div class="bubble" style="flex:0 1 auto">${aiHtml(text)}${extra}</div>`;
  $("#log").appendChild(d);
  d.scrollIntoView({ behavior: "smooth" });
  return d;
}

async function sendChat(text) {
  text = text.trim();
  if (!text || chat.busy) return;
  chat.busy = true; $("#cin").value = "";
  const me = addBubble("me", text);
  chat.msgs.push({ role: "user", content: text });
  const wait = addBubble("ai", "…");
  const sys = coachIntro() + ` Role-play: you are ${chat.sc.role}. Keep the conversation going naturally with ONE short reply (1-3 sentences, vocabulary suited to the level) ending with a question.
Then on a new line write "CORRECTION:" followed by a very short feedback in French on the learner's last message (fix grammar/vocabulary, propose a more natural professional phrasing). If it was perfect, write "CORRECTION: Parfait !".`;
  try {
    const out = await aiAsk(sys, chat.msgs, 400);
    const [reply, corr] = out.split(/\n?CORRECTION\s*:\s*/i);
    chat.msgs.push({ role: "assistant", content: reply.trim() });
    wait.remove();
    if (corr) me.insertAdjacentHTML("afterend", `<p class="sub" style="text-align:right;margin:4px 0">💡 ${aiHtml(corr.trim())}</p>`);
    addBubble("ai", reply.trim(), ` <button class="mini-speak" style="margin-left:6px">🔊</button>`).querySelector(".mini-speak").onclick = () => speak(reply);
    speak(reply.trim());
    if (++chat.turns === 1) addXp(10);
  } catch (e) {
    wait.querySelector(".bubble").textContent = e.message;
    chat.msgs.pop();
  }
  chat.busy = false;
}
