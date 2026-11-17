"use strict";
// ============================================================
//  AeroEnglish — moteur d'exercices adaptatif + interface
// ============================================================

const STORE_KEY = "aeroEnglish.v1";
const LESSONS_PER_UNIT = 5;

// ---------------- État sauvegardé ----------------
const defaultState = () => ({
  placed: false, level: 1, xp: 0, streak: 0, lastDay: null,
  todayXp: 0, todayDate: null, dailyGoal: 30,
  lessons: {}, items: {}, history: [], writing: {},
  accent: "en-GB", rate: 0.9, unlockUpTo: 0,
  apiKey: "", aiModel: "claude-haiku-5-5", toeic: [],
});
let S = load();
function load() {
  try { return Object.assign(defaultState(), JSON.parse(localStorage.getItem(STORE_KEY)) || {}); }
  catch (e) { return defaultState(); }
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }

// ---------------- Utilitaires ----------------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function localDay(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return localDay(d); }
function weightedSample(items, weightFn, n, exclude = new Set()) {
  let pool = items.filter((it) => !exclude.has(it.key)).map((it) => ({ it, w: Math.max(0, weightFn(it)) })).filter((x) => x.w > 0);
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total, idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx].w; if (r <= 0) break; }
    idx = Math.min(idx, pool.length - 1);
    out.push(pool[idx].it);
    pool.splice(idx, 1);
  }
  return out;
}

// ---------------- Normalisation / comparaison de texte ----------------
const NUMS = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90", hundred: "100" };
const CONTRACTIONS = [
  [/\bi'm\b/g, "i am"], [/\bcan't\b/g, "cannot"], [/\bcan not\b/g, "cannot"], [/\bdon't\b/g, "do not"], [/\bdoesn't\b/g, "does not"],
  [/\bdidn't\b/g, "did not"], [/\bwon't\b/g, "will not"], [/\bisn't\b/g, "is not"], [/\baren't\b/g, "are not"], [/\bit's\b/g, "it is"],
  [/\bi'd\b/g, "i would"], [/\blet's\b/g, "let us"], [/\bwe're\b/g, "we are"], [/\bthey're\b/g, "they are"], [/\byou're\b/g, "you are"],
  [/\bi'll\b/g, "i will"], [/\bwe'll\b/g, "we will"], [/\bwe've\b/g, "we have"], [/\bi've\b/g, "i have"], [/\bthat's\b/g, "that is"],
  [/\bhasn't\b/g, "has not"], [/\bhaven't\b/g, "have not"], [/\bwasn't\b/g, "was not"], [/\bshouldn't\b/g, "should not"],
];
function norm(s) {
  let t = String(s).toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  t = t.replace(/[^a-z0-9'\- ]+/g, " ").replace(/-/g, " ");
  t = t.replace(/\bfiber/g, "fibre").replace(/\bmold/g, "mould").replace(/\baluminum\b/g, "aluminium")
       .replace(/([a-z])iz(e|ed|es|ing|ation)\b/g, "$1is$2").replace(/([a-z])yz(e|ed|es|ing)\b/g, "$1ys$2");
  t = t.split(/\s+/).filter(Boolean).map((w) => NUMS[w] || w).join(" ");
  return t.trim();
}
function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function similarity(a, b) {
  const A = norm(a).split(" ").filter(Boolean), B = norm(b).split(" ").filter(Boolean);
  if (!A.length && !B.length) return 1;
  return 1 - lev(A, B) / Math.max(A.length, B.length);
}
// Met en évidence les mots attendus qui manquent dans la réponse
function highlightMissing(expected, given) {
  const got = new Set(norm(given).split(" "));
  return expected.split(" ").map((w) => {
    const n = norm(w);
    return n && !n.split(" ").every((x) => got.has(x)) ? `<span class="miss">${esc(w)}</span>` : esc(w);
  }).join(" ");
}

// ---------------- Voix (synthèse et reconnaissance) ----------------
const TTS_OK = "speechSynthesis" in window;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function pickVoice() {
  if (!TTS_OK) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find((v) => v.lang === S.accent && /Google|Natural|Online/i.test(v.name))
    || vs.find((v) => v.lang === S.accent)
    || vs.find((v) => v.lang.replace("_", "-").startsWith("en"));
}
function speak(text, slow) {
  if (!TTS_OK) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = S.accent; u.rate = slow ? 0.6 : S.rate;
  const v = pickVoice(); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
if (TTS_OK) speechSynthesis.onvoiceschanged = () => {};
let currentRec = null;
function listenOnce() {
  return new Promise((resolve, reject) => {
    if (!SR) return reject("unsupported");
    const r = new SR();
    currentRec = r;
    r.lang = S.accent; r.interimResults = false; r.maxAlternatives = 4;
    let got = false;
    r.onresult = (e) => { got = true; resolve(Array.from(e.results[0]).map((a) => a.transcript)); };
    r.onerror = (e) => reject(e.error);
    r.onend = () => { currentRec = null; if (!got) resolve([]); };
    r.start();
  });
}

// ---------------- Sons ----------------
let audioCtx = null;
function beep(ok) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [660, 880] : [300, 220];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = ok ? "sine" : "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0.08, audioCtx.currentTime + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.11 + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + i * 0.11); o.stop(audioCtx.currentTime + i * 0.11 + 0.2);
    });
  } catch (e) {}
}

// ---------------- Contenu indexé ----------------
const VOCAB = [], SENTS = [];
UNITS.forEach((u, ui) => {
  u.vocab.forEach((v, i) => VOCAB.push({ key: `v:${u.id}:${i}`, en: v[0], fr: v[1], def: v[2], unit: u, ui }));
  u.sentences.forEach((s, i) => SENTS.push({ key: `s:${u.id}:${i}`, en: s[0], fr: s[1], level: s[2], unit: u, ui }));
});
// Pour les textes à trous : quels mots du lexique apparaissent dans chaque phrase
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
SENTS.forEach((s) => {
  const own = VOCAB.filter((v) => v.unit === s.unit), others = VOCAB.filter((v) => v.unit !== s.unit);
  s.blanks = [];
  for (const v of own.concat(others)) {
    const term = v.en.replace(/^to /, "");
    const m = s.en.match(new RegExp("\\b" + reEsc(term) + "(s|es|ed|d)?\\b", "i"));
    if (m) s.blanks.push({ v, match: m[0], suffix: m[1] || "" });
  }
});

const box = (key) => (S.items[key] ? S.items[key].box : 0);
const seen = (key) => !!S.items[key];
function record(key, ok) {
  const it = S.items[key] || { box: 0, seen: 0, ok: 0 };
  it.seen++; if (ok) it.ok++;
  it.box = ok ? Math.min(5, it.box + 1) : 0;
  it.last = Date.now();
  S.items[key] = it;
}
function recordAnswer(ok) {
  S.history.push(ok ? 1 : 0);
  if (S.history.length > 40) S.history.shift();
}

function addXp(n) {
  const d = localDay();
  if (S.todayDate !== d) { S.todayDate = d; S.todayXp = 0; }
  S.todayXp += n; S.xp += n;
  if (S.lastDay !== d) { S.streak = S.lastDay === yesterday() ? S.streak + 1 : 1; S.lastDay = d; }
  save();
}
const displayStreak = () => (S.lastDay === localDay() || S.lastDay === yesterday() ? S.streak : 0);
const todayXp = () => (S.todayDate === localDay() ? S.todayXp : 0);

function unitUnlocked(i) {
  if (i === 0 || i <= S.unlockUpTo) return true;
  return (S.lessons[UNITS[i - 1].id] || 0) >= 2;
}

// ---------------- Adaptation du niveau ----------------
function adaptLevel() {
  const h = S.history;
  if (h.length < 20) return null;
  const acc = h.reduce((a, b) => a + b, 0) / h.length;
  if (acc >= 0.85 && S.level < 4) { S.level++; S.history = []; return "up"; }
  if (acc <= 0.55 && S.level > 1) { S.level--; S.history = []; return "down"; }
  return null;
}

// ---------------- Construction d'une leçon ----------------
const MIX = {
  1: ["mcq", "mcq", "pairs", "fill", "mcq", "order", "listen", "fill", "order", "speak"],
  2: ["mcq", "pairs", "def", "fill", "order", "listen", "fill", "order", "speak", "translate"],
  3: ["def", "fill", "pairs", "order", "listen", "speak", "def", "translate", "speak", "translate"],
  4: ["def", "fill", "listen", "order", "speak", "translate", "listen", "speak", "translate", "translate"],
};
function sentWeight(s) {
  const L = S.level, d = s.level - L;
  if (d > 1) return 0;
  const base = d === 0 ? 3 : d === 1 ? 1.2 : d === -1 ? 2 : 0.6;
  return base * (6 - box(s.key));
}
const vocabWeight = (v) => (6 - box(v.key)) + (seen(v.key) ? 0 : 2);

function buildLesson(unitId) {
  let V, T;
  if (unitId === "review") {
    const open = UNITS.filter((u, i) => unitUnlocked(i));
    V = VOCAB.filter((v) => open.includes(v.unit));
    T = SENTS.filter((s) => open.includes(s.unit));
    const seenV = V.filter((v) => seen(v.key)), seenT = T.filter((s) => seen(s.key));
    if (seenV.length >= 8) V = seenV;
    if (seenT.length >= 6) T = seenT;
  } else {
    const u = UNITS.find((x) => x.id === unitId);
    V = VOCAB.filter((v) => v.unit === u);
    T = SENTS.filter((s) => s.unit === u);
  }
  const vw = unitId === "review" ? (v) => Math.pow(6 - box(v.key), 2) : vocabWeight;
  const sw = unitId === "review" ? (s) => (sentWeight(s) ? Math.pow(6 - box(s.key), 2) : 0) : sentWeight;
  // garde au moins quelques phrases même si le niveau les exclut
  if (!T.some((s) => sw(s) > 0)) T = T.slice().sort((a, b) => a.level - b.level).slice(0, 3).map((s) => ({ ...s }));
  const swSafe = (s) => sw(s) || 0.5;

  let types = MIX[S.level].slice();
  if (!SR) types = types.map((t) => (t === "speak" ? "listen" : t));
  if (!TTS_OK) types = types.map((t) => (t === "listen" ? "order" : t));

  const used = new Set();
  const exs = [];
  for (const type of types) {
    const ex = makeExercise(type, V, T, vw, swSafe, used);
    if (ex) exs.push(ex);
  }
  return exs;
}

function takeVocab(V, vw, used) {
  const [v] = weightedSample(V, vw, 1, used);
  const chosen = v || pick(V);
  used.add(chosen.key);
  return chosen;
}
function takeSent(T, sw, used, filter = () => true) {
  const cands = T.filter(filter);
  if (!cands.length) return null;
  const [s] = weightedSample(cands, sw, 1, used);
  const chosen = s || pick(cands);
  used.add(chosen.key);
  return chosen;
}
function distractors(correct, pool, n, field = "en") {
  const vals = [...new Set(pool.map((x) => x[field]).filter((x) => x.toLowerCase() !== correct.toLowerCase()))];
  const extra = [...new Set(VOCAB.map((x) => x[field]).filter((x) => x.toLowerCase() !== correct.toLowerCase() && !vals.includes(x)))];
  return shuffle(vals).concat(shuffle(extra)).slice(0, n);
}
const tokens = (sentence) => sentence.replace(/[.,!?;:«»"]/g, "").split(/\s+/).filter(Boolean);

function makeExercise(type, V, T, vw, sw, used) {
  switch (type) {
    case "mcq": {
      const v = takeVocab(V, vw, used);
      const toEn = Math.random() < (S.level <= 1 ? 0.6 : 0.5);
      if (toEn) return { type, keys: [v.key], kind: "Vocabulaire", title: `Comment dit-on « ${v.fr} » en anglais ?`, options: shuffle([v.en, ...distractors(v.en, V, 3, "en")]), answer: v.en, speakAnswer: true };
      return { type, keys: [v.key], kind: "Vocabulaire", title: `Que veut dire « ${v.en} » ?`, say: v.en, options: shuffle([v.fr, ...distractors(v.fr, V, 3, "fr")]), answer: v.fr };
    }
    case "def": {
      const v = takeVocab(V, vw, used);
      return { type: "mcq", keys: [v.key], kind: "Définition", title: "Quel terme correspond à cette définition ?", bubble: v.def, say: v.def, options: shuffle([v.en, ...distractors(v.en, V, 3, "en")]), answer: v.en, speakAnswer: true };
    }
    case "pairs": {
      const list = weightedSample(V, vw, 5, used);
      if (list.length < 3) return makeExercise("mcq", V, T, vw, sw, used);
      list.forEach((v) => used.add(v.key));
      return { type, keys: list.map((v) => v.key), kind: "Associer", title: "Associe les paires", list };
    }
    case "fill": {
      const s = takeSent(T, sw, used, (x) => x.blanks.length > 0);
      if (!s) return makeExercise("mcq", V, T, vw, sw, used);
      const b = s.blanks[0];
      const shown = s.en.replace(b.match, "_____");
      const opts = distractors(b.v.en, V, 3, "en").map((d) => d.replace(/^to /, "") + (b.suffix && !/s$/.test(d) ? b.suffix : ""));
      return { type: "mcq", keys: [s.key, b.v.key], kind: "Texte à trous", title: "Complète la phrase", bubble: shown, hint: s.fr, options: shuffle([b.match, ...opts]), answer: b.match, full: s.en };
    }
    case "order": {
      const s = takeSent(T, sw, used, (x) => tokens(x.en).length <= 14);
      if (!s) return makeExercise("mcq", V, T, vw, sw, used);
      return orderEx(s, "Construis la phrase", "Traduis cette phrase", s.fr, false);
    }
    case "listen": {
      const s = takeSent(T, sw, used, (x) => tokens(x.en).length <= 16);
      if (!s) return makeExercise("mcq", V, T, vw, sw, used);
      if (S.level >= 3) return { type: "dictation", keys: [s.key], kind: "Écoute", title: "Écris ce que tu entends", sentence: s };
      return orderEx(s, "Écoute", "Écoute et reconstruis la phrase", null, true);
    }
    case "speak": {
      const s = takeSent(T, sw, used);
      if (!s) return makeExercise("mcq", V, T, vw, sw, used);
      return { type: "speak", keys: [s.key], kind: "Prononciation", title: "Lis cette phrase à voix haute", sentence: s };
    }
    case "translate": {
      const s = takeSent(T, sw, used);
      if (!s) return makeExercise("mcq", V, T, vw, sw, used);
      return { type: "translate", keys: [s.key], kind: "Traduction écrite", title: "Écris cette phrase en anglais", sentence: s };
    }
  }
  return null;
}
function orderEx(s, kind, title, fr, listen) {
  const words = tokens(s.en);
  let extra = [];
  if (S.level >= 2) {
    const others = SENTS.filter((x) => x !== s).flatMap((x) => tokens(x.en));
    const low = new Set(words.map((w) => w.toLowerCase()));
    extra = shuffle([...new Set(others.filter((w) => !low.has(w.toLowerCase())))]).slice(0, S.level >= 3 ? 3 : 2);
  }
  return { type: "order", keys: [s.key], kind, title, fr, listen, sentence: s, bank: shuffle(words.concat(extra)) };
}

// ============================================================
//  Interface
// ============================================================
const app = $("#app"), nav = $("#nav");
let screen = "home";

function go(name) {
  screen = name;
  if (currentRec) try { currentRec.abort(); } catch (e) {}
  const withNav = ["home", "writing", "talk", "lexicon", "profile", "toeic"].includes(name);
  nav.classList.toggle("hidden", !withNav);
  nav.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.nav === name));
  removeFooter();
  window.scrollTo(0, 0);
  ({ home: renderHome, writing: renderWriting, talk: renderTalk, toeic: renderToeic, lexicon: renderLexicon, profile: renderProfile, welcome: renderWelcome })[name]();
}
nav.addEventListener("click", (e) => { const b = e.target.closest("[data-nav]"); if (b) go(b.dataset.nav); });

function topbar() {
  const lv = LEVELS[S.level];
  return `<div class="topbar">
    <span class="badge" title="Ton niveau actuel">${lv.code} · ${lv.name}</span>
    <span class="stat fire" title="Série de jours">🔥 ${displayStreak()}</span>
    <span class="stat xp" title="XP total">⚡ ${S.xp}</span>
  </div>`;
}

// ---------------- Accueil + test de placement ----------------
function renderWelcome() {
  app.innerHTML = `<div class="welcome">
    <div class="logo">✈️</div>
    <h1>AeroEnglish</h1>
    <p>L'anglais de l'ingénieur maintenance :<br>composites, aéronautique, naval, automobile et industrialisation.</p>
    <div class="stack">
      <button class="btn" id="placement">Trouver mon niveau (2 min)</button>
      <button class="btn ghost" id="beginner">Commencer depuis le début</button>
    </div>
  </div>`;
  $("#placement").onclick = startPlacement;
  $("#beginner").onclick = () => { S.placed = true; S.level = 1; save(); go("home"); };
}

function startPlacement() {
  const qs = PLACEMENT.map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return { ...q, opts: order.map((i) => q.options[i]), correct: order.indexOf(q.answer) };
  });
  let i = 0; const right = { 1: 0, 2: 0, 3: 0, 4: 0 };
  nav.classList.add("hidden");
  const show = () => {
    const q = qs[i];
    app.innerHTML = `<div class="lesson-top"><button class="close" id="quit">✕</button><div class="bar"><div style="width:${(i / qs.length) * 100}%"></div></div></div>
      <div class="ex-kind">Test de niveau · question ${i + 1}/${qs.length}</div>
      <div class="ex-title">${esc(q.q)}</div>
      <div class="options">${q.opts.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${k + 1}</span>${esc(o)}</button>`).join("")}</div>
      <div class="lesson-pad"></div>`;
    $("#quit").onclick = () => go(S.placed ? "home" : "welcome");
    app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      if (+b.dataset.k === q.correct) right[q.level]++;
      i++;
      if (i < qs.length) show(); else finish();
    }));
  };
  const finish = () => {
    let level = 1;
    for (let L = 1; L <= 4; L++) { if (right[L] >= 2) level = L; else break; }
    S.level = level; S.placed = true; S.history = [];
    S.unlockUpTo = Math.max(S.unlockUpTo, (level - 1) * 3);
    save();
    app.innerHTML = `<div class="result">
      <div class="big">🎯</div>
      <h1>Ton niveau : ${LEVELS[level].code} · ${LEVELS[level].name}</h1>
      <p class="sub">Bonnes réponses : A2 ${right[1]}/3 · B1 ${right[2]}/3 · B2 ${right[3]}/3 · C1 ${right[4]}/3</p>
      <p class="sub">Les exercices vont s'ajuster tout seuls : si tu réussis beaucoup, ça devient plus difficile ; si tu te trompes souvent, ça redevient plus simple.</p>
      <button class="btn" id="go">C'est parti !</button></div>`;
    $("#go").onclick = () => go("home");
  };
  show();
}

// ---------------- Écran principal : le chemin ----------------
function renderHome() {
  const goalPct = Math.min(100, (todayXp() / S.dailyGoal) * 100);
  const offsets = [0, 60, 90, 60, 0];
  let html = topbar() + `
    <div class="card">
      <div class="row"><div class="grow"><h3>Objectif du jour</h3><p>${todayXp()} / ${S.dailyGoal} XP</p></div><div style="font-size:34px">${goalPct >= 100 ? "🏆" : "🎯"}</div></div>
      <div class="bar gold" style="margin-top:10px"><div style="width:${goalPct}%"></div></div>
    </div>
    <div class="card row">
      <div style="font-size:36px">🧠</div>
      <div class="grow"><h3>Révision intelligente</h3><p>Reprend les mots et phrases où tu fais des erreurs.</p></div>
      <button class="btn blue small" id="review">Réviser</button>
    </div>
    <div class="card row">
      <div style="font-size:36px">🎯</div>
      <div class="grow"><h3>Préparation TOEIC</h3><p>${S.toeic && S.toeic.length ? `Dernier score estimé : ${S.toeic[S.toeic.length - 1].total} / 990` : "Tests blancs chronométrés et entraînement par partie."}</p></div>
      <button class="btn small" id="toeic">Ouvrir</button>
    </div>`;
  UNITS.forEach((u, i) => {
    const open = unitUnlocked(i), done = S.lessons[u.id] || 0;
    html += `<div class="unit-banner ${open ? "" : "locked"}" style="background:${u.color}">
      <small>Unité ${i + 1} ${open ? "" : "· 🔒 verrouillée"}</small><h2>${u.icon} ${esc(u.title)}</h2><p>${esc(u.titleFr)}</p></div><div class="path">`;
    for (let k = 0; k < LESSONS_PER_UNIT; k++) {
      const off = (i % 2 ? -1 : 1) * offsets[k];
      let cls = "locked", label = "🔒", tip = "";
      if (open) {
        if (k < done) { cls = "done"; label = "⭐"; }
        else if (k === done) { cls = "current"; label = k === LESSONS_PER_UNIT - 1 ? "🏁" : u.icon; tip = `<div class="tip">${done === 0 ? "COMMENCER" : "CONTINUER"}</div>`; }
      }
      if (open && done >= LESSONS_PER_UNIT && k === LESSONS_PER_UNIT - 1) { cls = "done"; label = "👑"; }
      html += `<div class="node-wrap" style="transform:translateX(${off}px)">${tip}
        <button class="node ${cls}" style="background:${u.color}" data-unit="${u.id}" ${cls === "locked" ? "disabled" : ""} title="Leçon ${k + 1}">${label}</button></div>`;
    }
    html += `</div>`;
  });
  html += `<p class="sub" style="text-align:center;margin-top:30px">Termine 2 leçons d'une unité pour débloquer la suivante.</p>`;
  app.innerHTML = html;
  $("#review").onclick = () => startLesson("review");
  $("#toeic").onclick = () => go("toeic");
  app.querySelectorAll(".node[data-unit]").forEach((b) => (b.onclick = () => startLesson(b.dataset.unit)));
}

// ---------------- Déroulement d'une leçon ----------------
let L = null; // leçon en cours

function startLesson(unitId) {
  const exs = buildLesson(unitId);
  L = { unitId, queue: exs, total: exs.length, done: 0, firstTry: 0, answered: 0, retries: new Map(), start: Date.now() };
  nav.classList.add("hidden");
  nextExercise();
}

function nextExercise() {
  removeFooter();
  if (!L.queue.length) return finishLesson();
  const ex = L.queue[0];
  app.innerHTML = `<div class="lesson-top"><button class="close" id="quit" title="Quitter">✕</button>
    <div class="bar"><div style="width:${(L.done / L.total) * 100}%"></div></div></div>
    <div class="ex-kind">${esc(ex.kind)}</div><div class="ex-title">${esc(ex.title)}</div>
    <div id="ex"></div><div class="lesson-pad"></div>`;
  $("#quit").onclick = () => { if (confirm("Quitter la leçon ? Ta progression dans cette leçon sera perdue.")) go("home"); };
  const ui = RENDER[ex.type](ex, $("#ex"));
  showFooter(ui);
}

function showFooter(ui) {
  removeFooter();
  const f = document.createElement("div");
  f.className = "footer"; f.id = "footer";
  f.innerHTML = `<div class="footer-inner">
    ${ui.skip ? `<button class="btn ghost small" id="skip">${esc(ui.skip)}</button>` : ""}
    <div class="grow"></div>
    <button class="btn" id="check" style="max-width:220px" disabled>Vérifier</button></div>`;
  document.body.appendChild(f);
  const check = $("#check");
  ui.onReady = (ready) => (check.disabled = !ready);
  if (ui.ready) check.disabled = false;
  check.onclick = () => grade(ui);
  if (ui.skip) $("#skip").onclick = () => { L.queue.shift(); L.done++; nextExercise(); };
}
function removeFooter() { const f = $("#footer"); if (f) f.remove(); }

function grade(ui) {
  const ex = L.queue[0];
  const res = ui.check();
  const ok = res.ok;
  beep(ok);
  const firstAttempt = !L.retries.has(ex);
  if (ex.type === "pairs") {
    ex.keys.forEach((k) => record(k, !res.wrongKeys.has(k)));
  } else ex.keys.forEach((k) => record(k, ok));
  if (firstAttempt) { recordAnswer(ok); L.answered++; if (ok) L.firstTry++; }
  save();
  ui.lock && ui.lock();

  const f = $("#footer");
  f.className = "footer " + (ok ? "ok" : "ko");
  const praise = pick(["Excellent !", "Bravo !", "Parfait !", "Bien joué !", "Super !"]);
  f.innerHTML = `<div class="footer-inner">
    <div class="fb">
      <h3>${ok ? (res.close ? "Presque parfait !" : praise) : "Réponse correcte :"}</h3>
      ${res.solution ? `<p>${res.solutionHtml || esc(res.solution)}</p>` : ""}
      ${res.note ? `<p style="font-weight:600;opacity:.85">${res.note}</p>` : ""}
      ${res.ai && !(ok && !res.close) ? `<div id="aiout"></div>` : ""}
    </div>
    ${res.say ? `<button class="mini-speak" id="fbsay" title="Écouter">🔊</button>` : ""}
    <div class="grow"></div>
    <button class="btn ${ok ? "" : "red"}" id="cont" style="max-width:220px">Continuer</button></div>`;
  if ($("#aiout")) aiButton($("#aiout"), () => res.ai);
  if (res.say) { $("#fbsay").onclick = () => speak(res.say); if (!ok || S.level <= 2) speak(res.say); }
  const cont = $("#cont");
  cont.focus();
  cont.onclick = () => {
    L.queue.shift();
    if (ok) L.done++;
    else {
      const n = (L.retries.get(ex) || 0) + 1;
      L.retries.set(ex, n);
      if (n <= 2) L.queue.push(ex); else L.done++;
    }
    nextExercise();
  };
}

function finishLesson() {
  removeFooter();
  const acc = L.answered ? Math.round((L.firstTry / L.answered) * 100) : 100;
  const perfect = acc === 100;
  const xp = 10 + (perfect ? 5 : 0) + (L.unitId === "review" ? 5 : 0);
  if (L.unitId !== "review") S.lessons[L.unitId] = (S.lessons[L.unitId] || 0) + 1;
  addXp(xp);
  const change = adaptLevel();
  save();
  const secs = Math.round((Date.now() - L.start) / 1000);
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const msg = change === "up"
    ? `🚀 Tu progresses vite ! Ton niveau passe à <b>${LEVELS[S.level].code} · ${LEVELS[S.level].name}</b>. Les exercices seront plus exigeants.`
    : change === "down"
    ? `🛠️ On ralentit un peu : niveau <b>${LEVELS[S.level].code}</b> pour consolider les bases. Tu remonteras vite !`
    : "";
  app.innerHTML = `<div class="result">
    <div class="big">${perfect ? "🏆" : "🎉"}</div>
    <h1>${perfect ? "Leçon parfaite !" : "Leçon terminée !"}</h1>
    <div class="result-stats">
      <div class="rstat"><b>XP</b><span>⚡ ${xp}</span></div>
      <div class="rstat green"><b>Précision</b><span>🎯 ${acc}%</span></div>
      <div class="rstat blue"><b>Temps</b><span>⏱️ ${time}</span></div>
    </div>
    ${msg ? `<div class="levelup">${msg}</div>` : ""}
    <button class="btn" id="go">Continuer</button></div>`;
  $("#go").onclick = () => go("home");
  L = null;
}

// ---------------- Rendu de chaque type d'exercice ----------------
const RENDER = {
  mcq(ex, root) {
    const ui = {};
    root.innerHTML = `
      ${ex.bubble || ex.say ? `<div class="prompt-box"><div class="mascot">👷</div>
        ${ex.bubble ? `<div class="bubble">${esc(ex.bubble)}</div>` : `<div class="bubble">${esc(ex.say)}</div>`}
        ${ex.say || ex.full ? `<button class="speaker" id="say" title="Écouter">🔊</button>` : ""}</div>` : ""}
      ${ex.hint ? `<p class="sub">🇫🇷 ${esc(ex.hint)}</p>` : ""}
      <div class="options">${ex.options.map((o, k) => `<button class="opt" data-v="${esc(o)}"><span class="k">${k + 1}</span>${esc(o)}</button>`).join("")}</div>`;
    let chosen = null;
    const sayBtn = $("#say", root);
    if (sayBtn) sayBtn.onclick = () => speak(ex.say || ex.full);
    if (ex.say && S.level <= 2) setTimeout(() => speak(ex.say), 250);
    root.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      root.querySelectorAll(".opt").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel"); chosen = b.dataset.v;
      if (ex.speakAnswer) speak(chosen);
      ui.onReady && ui.onReady(true);
    }));
    ui.check = () => ({
      ok: chosen === ex.answer,
      solution: chosen === ex.answer ? (ex.full || "") : (ex.full || ex.answer),
      say: ex.full || (ex.speakAnswer ? ex.answer : ex.say),
    });
    ui.lock = () => root.querySelectorAll(".opt").forEach((b) => (b.disabled = true));
    return ui;
  },

  pairs(ex, root) {
    const ui = {};
    const left = shuffle(ex.list), right = shuffle(ex.list);
    root.innerHTML = `<div class="pairs">${left.map((v, i) => `
      <button class="opt" data-side="en" data-key="${v.key}">${esc(v.en)}</button>
      <button class="opt" data-side="fr" data-key="${right[i].key}">${esc(right[i].fr)}</button>`).join("")}</div>`;
    let sel = null; const wrong = new Set(); let matched = 0;
    root.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
      if (b.dataset.side === "en") speak(b.textContent);
      if (!sel || sel.dataset.side === b.dataset.side) {
        if (sel) sel.classList.remove("sel");
        sel = b; b.classList.add("sel"); return;
      }
      if (sel.dataset.key === b.dataset.key) {
        [sel, b].forEach((x) => { x.classList.remove("sel"); x.classList.add("good"); });
        const a = sel; setTimeout(() => { a.classList.add("matched"); b.classList.add("matched"); }, 250);
        matched++;
        if (matched === ex.list.length) { beep(true); ui.onReady && ui.onReady(true); }
      } else {
        wrong.add(sel.dataset.key); wrong.add(b.dataset.key);
        const a = sel; [a, b].forEach((x) => { x.classList.remove("sel"); x.classList.add("wrong"); });
        setTimeout(() => [a, b].forEach((x) => x.classList.remove("wrong")), 500);
      }
      sel = null;
    }));
    ui.check = () => ({ ok: wrong.size <= 2, wrongKeys: wrong, note: wrong.size ? `${wrong.size / 2} erreur(s) d'association.` : "" });
    return ui;
  },

  order(ex, root) {
    const ui = {};
    root.innerHTML = `
      <div class="prompt-box">
        ${ex.listen
          ? `<button class="speaker big" id="say">🔊</button><button class="speaker slow" id="slow" title="Lentement">🐢</button>`
          : `<div class="mascot">👷</div><div class="bubble">${esc(ex.fr)}</div>`}
      </div>
      <div class="answer-line" id="line"></div>
      <div class="bank" id="bank">${ex.bank.map((w, i) => `<button class="tile" data-i="${i}">${esc(w)}</button>`).join("")}</div>`;
    if (ex.listen) {
      $("#say", root).onclick = () => speak(ex.sentence.en);
      $("#slow", root).onclick = () => speak(ex.sentence.en, true);
      setTimeout(() => speak(ex.sentence.en), 300);
    }
    const line = $("#line", root), placed = [];
    const refresh = () => {
      line.innerHTML = placed.map((i, p) => `<button class="tile" data-p="${p}">${esc(ex.bank[i])}</button>`).join("");
      root.querySelectorAll("#bank .tile").forEach((t) => t.classList.toggle("used", placed.includes(+t.dataset.i)));
      line.querySelectorAll(".tile").forEach((t) => (t.onclick = () => { placed.splice(+t.dataset.p, 1); refresh(); }));
      ui.onReady && ui.onReady(placed.length > 0);
    };
    root.querySelectorAll("#bank .tile").forEach((t) => (t.onclick = () => { placed.push(+t.dataset.i); refresh(); }));
    ui.check = () => {
      const given = placed.map((i) => ex.bank[i]).join(" ");
      const ok = norm(given) === norm(ex.sentence.en);
      return { ok, solution: ex.sentence.en, say: ex.sentence.en, note: ex.listen ? `🇫🇷 ${esc(ex.sentence.fr)}` : "" };
    };
    ui.lock = () => root.querySelectorAll(".tile").forEach((t) => (t.disabled = true));
    return ui;
  },

  dictation(ex, root) {
    const ui = {};
    root.innerHTML = `
      <div class="prompt-box"><button class="speaker big" id="say">🔊</button><button class="speaker slow" id="slow" title="Lentement">🐢</button></div>
      <textarea id="txt" rows="3" placeholder="Écris en anglais…" autocomplete="off" autocapitalize="sentences" spellcheck="false"></textarea>`;
    $("#say", root).onclick = () => speak(ex.sentence.en);
    $("#slow", root).onclick = () => speak(ex.sentence.en, true);
    setTimeout(() => speak(ex.sentence.en), 300);
    const txt = $("#txt", root);
    txt.oninput = () => ui.onReady && ui.onReady(txt.value.trim().length > 0);
    ui.check = () => textResult(ex.sentence, txt.value, 0.85);
    ui.lock = () => (txt.disabled = true);
    return ui;
  },

  translate(ex, root) {
    const ui = {};
    root.innerHTML = `
      <div class="prompt-box"><div class="mascot">👷</div><div class="bubble">${esc(ex.sentence.fr)}</div></div>
      <textarea id="txt" rows="4" placeholder="Écris en anglais…" autocomplete="off" autocapitalize="sentences" spellcheck="false"></textarea>
      ${SR ? `<button class="link" id="dict">🎤 Dicter ma réponse</button>` : ""}`;
    const txt = $("#txt", root);
    txt.oninput = () => ui.onReady && ui.onReady(txt.value.trim().length > 0);
    const d = $("#dict", root);
    if (d) d.onclick = async () => {
      d.textContent = "🎙️ Je t'écoute…";
      try { const alts = await listenOnce(); if (alts[0]) { txt.value = (txt.value + " " + alts[0]).trim(); txt.oninput(); } } catch (e) {}
      d.textContent = "🎤 Dicter ma réponse";
    };
    ui.check = () => textResult(ex.sentence, txt.value, 0.8);
    ui.lock = () => (txt.disabled = true);
    return ui;
  },

  speak(ex, root) {
    const ui = { skip: "Pas de micro maintenant" };
    root.innerHTML = `
      <div class="prompt-box"><button class="speaker" id="say" title="Écouter le modèle">🔊</button><div class="bubble">${esc(ex.sentence.en)}</div></div>
      <p class="sub">🇫🇷 ${esc(ex.sentence.fr)}</p>
      <button class="mic" id="mic">🎤 Appuie pour parler</button>
      <div class="heard" id="heard"></div>`;
    $("#say", root).onclick = () => speak(ex.sentence.en);
    let best = { score: 0, text: "" };
    const mic = $("#mic", root), heard = $("#heard", root);
    mic.onclick = async () => {
      if (mic.classList.contains("on")) { try { currentRec && currentRec.stop(); } catch (e) {} return; }
      mic.classList.add("on"); mic.textContent = "🎙️ Je t'écoute… (appuie pour arrêter)";
      try {
        const alts = await listenOnce();
        for (const a of alts) { const sc = similarity(a, ex.sentence.en); if (sc >= best.score) best = { score: sc, text: a }; }
        if (alts.length) {
          heard.innerHTML = `J'ai entendu : « ${esc(best.text)} » — ${Math.round(best.score * 100)}% ${best.score >= 0.7 ? "✅" : "↻ réessaie ou vérifie"}`;
          ui.onReady && ui.onReady(true);
        } else heard.textContent = "Je n'ai rien entendu. Réessaie en parlant plus près du micro.";
      } catch (e) {
        heard.textContent = e === "not-allowed" ? "Le micro est bloqué : autorise-le dans le navigateur (icône à gauche de l'adresse)." : "Erreur du micro : " + e;
      }
      mic.classList.remove("on"); mic.textContent = "🎤 Réessayer";
    };
    ui.check = () => {
      const ok = best.score >= 0.7;
      return {
        ok, close: ok && best.score < 0.9,
        solution: ex.sentence.en,
        solutionHtml: highlightMissing(ex.sentence.en, best.text),
        note: ok ? `Prononciation reconnue à ${Math.round(best.score * 100)}%` : "Les mots en rouge n'ont pas été reconnus. Écoute le modèle et réessaie plus tard.",
        say: ex.sentence.en,
      };
    };
    ui.lock = () => (mic.disabled = true);
    return ui;
  },
};

function textResult(sentence, given, threshold) {
  const sc = similarity(given, sentence.en);
  const ok = sc >= threshold;
  return {
    ok, close: ok && sc < 1,
    solution: sentence.en,
    solutionHtml: ok && sc === 1 ? esc(sentence.en) : highlightMissing(sentence.en, given),
    note: sc === 1 ? "" : ok ? "Petites différences : compare avec la phrase ci-dessus." : `Ta réponse : « ${esc(given)} »`,
    say: sentence.en,
    ai: `French sentence: "${sentence.fr}"\nReference translation: "${sentence.en}"\nLearner's answer: "${given}"\nIs the learner's answer acceptable? Explain the mistakes.`,
  };
}

// ---------------- Atelier d'écriture ----------------
function renderWriting() {
  const tasks = [];
  UNITS.forEach((u) => u.writing.forEach((w, i) => tasks.push({ ...w, unit: u, key: `w:${u.id}:${i}` })));
  tasks.sort((a, b) => Math.abs(a.level - S.level) - Math.abs(b.level - S.level) || a.level - b.level);
  app.innerHTML = topbar() + `<h1 class="page">✍️ Atelier d'écriture</h1>
    <p class="sub">De vraies situations de ton métier : rapports, e-mails, carnets de route. Écris (ou dicte) ta réponse, puis compare avec un modèle.</p>
    ${tasks.map((t) => `<div class="card row">
      <div style="font-size:30px">${t.unit.icon}</div>
      <div class="grow"><h3>${esc(t.unit.titleFr)} <span class="chip ${t.level === S.level ? "rec" : ""}">${LEVELS[t.level].code}</span> ${S.writing[t.key] ? "✅" : ""}</h3><p>${esc(t.prompt)}</p></div>
      <button class="btn blue small" data-w="${t.key}">Écrire</button></div>`).join("")}`;
  app.querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => openWriting(tasks.find((t) => t.key === b.dataset.w))));
}

function openWriting(t) {
  nav.classList.add("hidden");
  app.innerHTML = `<div class="lesson-top"><button class="close" id="back">✕</button><div class="grow"></div><span class="chip">${LEVELS[t.level].code}</span></div>
    <div class="ex-kind">${t.unit.icon} ${esc(t.unit.titleFr)}</div>
    <div class="ex-title">${esc(t.prompt)}</div>
    <p class="sub">Mots-clés conseillés : ${t.keywords.map((k) => `<span class="chip">${esc(k)}</span>`).join(" ")}</p>
    <textarea id="txt" rows="8" placeholder="Écris en anglais…" spellcheck="false">${esc((S.writing[t.key] && S.writing[t.key].text) || "")}</textarea>
    ${SR ? `<button class="link" id="dict">🎤 Dicter (s'entraîner à l'oral)</button>` : ""}
    <div id="fb"></div><div class="lesson-pad"></div>`;
  $("#back").onclick = () => go("writing");
  const txt = $("#txt");
  const d = $("#dict");
  if (d) d.onclick = async () => {
    d.textContent = "🎙️ Je t'écoute…";
    try { const alts = await listenOnce(); if (alts[0]) txt.value = (txt.value + " " + alts[0]).trim() + " "; } catch (e) {}
    d.textContent = "🎤 Dicter (s'entraîner à l'oral)";
  };
  const f = document.createElement("div");
  f.className = "footer"; f.id = "footer";
  f.innerHTML = `<div class="footer-inner"><div class="grow"></div><button class="btn" id="chk" style="max-width:240px">Vérifier</button></div>`;
  document.body.appendChild(f);
  $("#chk").onclick = () => {
    const text = txt.value.trim();
    if (!text) return;
    const n = norm(text);
    const stem = (w) => (w.length > 5 ? w.slice(0, w.length - 2) : w);
    const kw = t.keywords.map((k) => ({ k, ok: norm(k).split(" ").every((w) => n.includes(stem(w))) }));
    const words = n.split(" ").filter(Boolean).length;
    const minWords = Math.round(t.model.split(/\s+/).length * 0.5);
    const checks = [
      ...kw.map((x) => ({ ok: x.ok, label: `Mot-clé « ${x.k} »` })),
      { ok: words >= minWords, label: `Longueur : ${words} mots (conseillé : ${minWords}+)` },
      { ok: /^[A-Z]/.test(text), label: "Commence par une majuscule" },
      { ok: /[.!?:,]\s*$/.test(text), label: "Termine par une ponctuation" },
    ];
    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
    const first = !S.writing[t.key];
    S.writing[t.key] = { text, score, date: localDay() };
    if (first && score >= 50) addXp(15); else save();
    beep(score >= 60);
    $("#fb").innerHTML = `<div class="card" style="margin-top:18px">
      <h3>Score : ${score}% ${score >= 80 ? "🏆" : score >= 60 ? "👍" : "💪"}</h3>
      <ul class="check-list">${checks.map((c) => `<li>${c.ok ? "✅" : "❌"} ${esc(c.label)}</li>`).join("")}</ul>
      <div class="row"><h3 class="grow" style="margin:8px 0">Exemple de réponse</h3><button class="mini-speak" id="saymodel">🔊</button></div>
      <div class="model">${esc(t.model)}</div>
      <p class="sub" style="margin-top:10px">Compare ta réponse avec le modèle : repère les tournures utiles et réécris ta version si tu veux.${first && score >= 50 ? " <b>+15 XP</b>" : ""}</p>
    </div>`;
    $("#saymodel").onclick = () => speak(t.model.replace(/\n/g, " "));
    $("#fb .card").insertAdjacentHTML("beforeend", `<div id="aiw"></div>`);
    aiButton($("#aiw"), () => `Writing task (in French): ${t.prompt}\nLearner's text:\n"""${text}"""\nCorrect it like a teacher: list the main mistakes, then give a corrected, natural professional version.`);
    $("#fb").scrollIntoView({ behavior: "smooth" });
  };
}

// ---------------- Lexique ----------------
function renderLexicon() {
  app.innerHTML = topbar() + `<h1 class="page">📖 Lexique technique</h1>
    <p class="sub">${VOCAB.length} termes · les étoiles montrent ta maîtrise de chaque mot.</p>
    <input type="text" id="q" placeholder="Rechercher (anglais ou français)…" />
    <div id="list"></div>`;
  const list = $("#list");
  const draw = (q = "") => {
    const nq = q.toLowerCase();
    list.innerHTML = UNITS.map((u) => {
      const items = VOCAB.filter((v) => v.unit === u && (!nq || v.en.toLowerCase().includes(nq) || v.fr.toLowerCase().includes(nq)));
      if (!items.length) return "";
      return `<h3 style="margin:22px 0 4px">${u.icon} ${esc(u.titleFr)}</h3>` + items.map((v) => `
        <div class="word"><button class="mini-speak" data-say="${esc(v.en)}">🔊</button>
          <div class="grow"><b>${esc(v.en)}</b> — <span class="fr">${esc(v.fr)}</span><div class="def">${esc(v.def)}</div></div>
          <div class="dots">${[1, 2, 3, 4, 5].map((n) => `<i class="${box(v.key) >= n ? "on" : ""}"></i>`).join("")}</div></div>`).join("");
    }).join("") || `<p class="sub" style="margin-top:20px">Aucun résultat.</p>`;
    list.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => speak(b.dataset.say)));
  };
  $("#q").oninput = (e) => draw(e.target.value);
  draw();
}

// ---------------- Profil / réglages ----------------
function renderProfile() {
  const items = Object.values(S.items);
  const totalAns = items.reduce((a, b) => a + b.seen, 0), totalOk = items.reduce((a, b) => a + b.ok, 0);
  const mastered = VOCAB.filter((v) => box(v.key) >= 3).length;
  const lessons = Object.values(S.lessons).reduce((a, b) => a + b, 0);
  const recent = S.history.length ? Math.round((S.history.reduce((a, b) => a + b, 0) / S.history.length) * 100) : null;
  app.innerHTML = topbar() + `<h1 class="page">👤 Mon profil</h1>
    <div class="stats-grid">
      <div class="card"><b>🔥 ${displayStreak()}</b><p>jours de suite</p></div>
      <div class="card"><b>⚡ ${S.xp}</b><p>XP total</p></div>
      <div class="card"><b>📚 ${lessons}</b><p>leçons terminées</p></div>
      <div class="card"><b>⭐ ${mastered}/${VOCAB.length}</b><p>mots maîtrisés</p></div>
      <div class="card"><b>🎯 ${totalAns ? Math.round((totalOk / totalAns) * 100) : 0}%</b><p>réussite globale</p></div>
      <div class="card"><b>📈 ${recent === null ? "—" : recent + "%"}</b><p>réussite récente (${S.history.length}/20 pour ajuster)</p></div>
    </div>
    <div class="card">
      <h3>Comment l'appli s'adapte</h3>
      <p>Après au moins 20 réponses : si tu réussis 85% ou plus, ton niveau monte ; à 55% ou moins, il baisse. Les mots ratés reviennent plus souvent (répétition espacée).</p>
    </div>
    <div class="field"><label>Niveau actuel</label>
      <select id="level">${[1, 2, 3, 4].map((l) => `<option value="${l}" ${l === S.level ? "selected" : ""}>${LEVELS[l].code} · ${LEVELS[l].name}</option>`).join("")}</select></div>
    <div class="field"><label>Objectif quotidien</label>
      <select id="goal">${[[20, "Tranquille · 20 XP"], [30, "Normal · 30 XP"], [50, "Sérieux · 50 XP"], [80, "Intense · 80 XP"]].map(([v, l]) => `<option value="${v}" ${v === S.dailyGoal ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field"><label>Accent de la voix</label>
      <select id="accent"><option value="en-GB" ${S.accent === "en-GB" ? "selected" : ""}>Britannique (en-GB)</option><option value="en-US" ${S.accent === "en-US" ? "selected" : ""}>Américain (en-US)</option></select></div>
    <div class="field"><label>Vitesse de la voix : <span id="rv">${S.rate}</span></label>
      <input type="range" id="rate" min="0.6" max="1.2" step="0.1" value="${S.rate}" style="width:100%"></div>
    <div class="card">
      <h3>🤖 Correction par IA (Claude)</h3>
      <p>Crée une clé sur console.anthropic.com (rubrique API Keys) et colle-la ici. Elle reste uniquement dans ce navigateur. Chaque correction coûte une fraction de centime avec Haiku.</p>
      <div class="field" style="margin-top:12px"><label>Clé API</label>
        <input type="password" id="apikey" placeholder="sk-ant-…" value="${esc(S.apiKey)}" autocomplete="off"></div>
      <div class="field" style="margin:0"><label>Modèle</label>
        <select id="aimodel">${Object.entries(AI_MODELS).map(([v, l]) => `<option value="${v}" ${v === S.aiModel ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    </div>
    <div class="stack" style="margin-top:24px">
      <button class="btn ghost" id="test">🔊 Tester la voix</button>
      <button class="btn blue" id="placement">Refaire le test de niveau</button>
      <button class="btn red" id="reset">Tout remettre à zéro</button>
    </div>
    ${!SR ? `<p class="sub" style="margin-top:16px">ℹ️ Ce navigateur ne gère pas la reconnaissance vocale : utilise Chrome ou Edge pour les exercices de prononciation.</p>` : ""}`;
  $("#level").onchange = (e) => { S.level = +e.target.value; S.history = []; save(); renderProfile(); };
  $("#goal").onchange = (e) => { S.dailyGoal = +e.target.value; save(); };
  $("#apikey").onchange = (e) => { S.apiKey = e.target.value.trim(); save(); };
  $("#aimodel").onchange = (e) => { S.aiModel = e.target.value; save(); };
  $("#accent").onchange = (e) => { S.accent = e.target.value; save(); speak("The aircraft is ready for release to service."); };
  $("#rate").oninput = (e) => { S.rate = +e.target.value; $("#rv").textContent = S.rate; save(); };
  $("#test").onclick = () => speak("Please find attached the inspection report for the composite flap.");
  $("#placement").onclick = startPlacement;
  $("#reset").onclick = () => {
    if (confirm("Effacer toute ta progression (XP, série, niveau, mots) ? C'est définitif.")) {
      S = defaultState(); save(); go("welcome");
    }
  };
}

// ---------------- Raccourcis clavier (PC) ----------------
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "TEXTAREA" && !(e.key === "Enter" && (e.ctrlKey || e.metaKey))) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.key === "Enter") {
    const b = $("#cont") || $("#check") || $("#chk");
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  } else if (/^[1-4]$/.test(e.key)) {
    const opts = app.querySelectorAll(".options .opt");
    if (opts[+e.key - 1] && !opts[+e.key - 1].disabled) opts[+e.key - 1].click();
  }
});

// ---------------- Démarrage ----------------
go(S.placed ? "home" : "welcome");
