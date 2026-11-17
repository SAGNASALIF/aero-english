"use strict";
// ============================================================
//  Préparation TOEIC : tests blancs chronométrés et entraînement par partie
// ============================================================

const PARTS = {
  p2: { n: 2, name: "Questions-réponses", listen: true },
  p3: { n: 3, name: "Conversations", listen: true },
  p4: { n: 4, name: "Exposés courts", listen: true },
  p5: { n: 5, name: "Phrases à compléter", listen: false },
  p6: { n: 6, name: "Textes à compléter", listen: false },
  p7: { n: 7, name: "Compréhension écrite", listen: false },
};

// Transforme la banque en une liste de questions (une par écran)
const mix = (x) => { const ord = shuffle(x.o.map((_, i) => i)); return { ...x, o: ord.map((i) => x.o[i]), a: ord.indexOf(x.a) }; };
function toeicItems(part, groupLimit) {
  const src = TOEIC[part];
  if (part === "p2" || part === "p5") {
    return shuffle(src).slice(0, groupLimit || src.length).map(mix).map((x) => ({ part, ...x, audio: part === "p2" ? [["M", x.q], ...x.o.map((o, i) => ["W", "ABC"[i] + ". " + o])] : null }));
  }
  return shuffle(src).slice(0, groupLimit || src.length).flatMap((g) =>
    g.qs.map(mix).map((x, i) => ({ part, ...x, audio: g.lines || null, text: g.text || null, first: i === 0 })));
}

function speakLines(lines) {
  if (!TTS_OK) return;
  speechSynthesis.cancel();
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").startsWith("en"));
  lines.forEach(([who, text]) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = S.accent; u.rate = S.rate;
    const v = vs[who === "W" ? 0 : Math.min(1, vs.length - 1)];
    if (v) u.voice = v;
    u.pitch = who === "W" ? 1.15 : 0.85;
    speechSynthesis.speak(u);
  });
}

let T = null; // test en cours

function renderToeic() {
  const hist = S.toeic || [];
  const last = hist[hist.length - 1];
  app.innerHTML = topbar() + `<h1 class="page">🎯 Préparation TOEIC</h1>
    <p class="sub">Format TOEIC Listening & Reading (score sur 990). Questions d'entraînement originales, proches des vraies épreuves.</p>
    ${last ? `<div class="card"><h3>Dernier test blanc : ${last.total} / 990</h3><p>Écoute ${last.L} · Lecture ${last.R} · ${last.date}${hist.length > 1 ? ` · précédent : ${hist[hist.length - 2].total}` : ""}</p></div>` : ""}
    <div class="card row"><div style="font-size:34px">⏱️</div>
      <div class="grow"><h3>Test blanc (20 min)</h3><p>31 questions des parties 2 à 7, chronométré, audio limité à 2 écoutes, score estimé.</p></div>
      <button class="btn small" id="mock">Démarrer</button></div>
    <h3 style="margin:24px 0 8px">Entraînement par partie</h3>
    ${Object.entries(PARTS).map(([k, p]) => `<div class="card row"><div style="font-size:26px">${p.listen ? "🎧" : "📄"}</div>
      <div class="grow"><h3>Partie ${p.n} · ${p.name}</h3></div>
      <button class="btn blue small" data-part="${k}">S'entraîner</button></div>`).join("")}
    <p class="sub">ℹ️ La partie 1 (description de photos) n'est pas incluse. Le score affiché est une estimation.</p>`;
  $("#mock").onclick = () => startToeic("mock");
  app.querySelectorAll("[data-part]").forEach((b) => (b.onclick = () => startToeic(b.dataset.part)));
}

function startToeic(mode) {
  const items = mode === "mock"
    ? [...toeicItems("p2", 6), ...toeicItems("p3", 2), ...toeicItems("p4", 1), ...toeicItems("p5", 10), ...toeicItems("p6", 1), ...toeicItems("p7", 1)]
    : toeicItems(mode);
  T = { mode, items, i: 0, answers: [], end: mode === "mock" ? Date.now() + 20 * 60000 : null, plays: 0 };
  nav.classList.add("hidden");
  clearInterval(T.timer);
  if (T.end) T.timer = setInterval(() => {
    const left = T.end - Date.now(), el = $("#clock");
    if (left <= 0) return finishToeic();
    if (el) el.textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`;
  }, 1000);
  showToeicItem();
}

function showToeicItem() {
  removeFooter();
  const it = T.items[T.i], p = PARTS[it.part];
  if (it.first || it.part === "p2" || T.i === 0) T.plays = 0;
  const canPlay = () => T.mode !== "mock" || T.plays < 2;
  const hideOpts = it.part === "p2";
  app.innerHTML = `<div class="lesson-top"><button class="close" id="quit">✕</button>
    <div class="bar"><div style="width:${(T.i / T.items.length) * 100}%"></div></div>
    ${T.end ? `<b id="clock" style="min-width:48px">20:00</b>` : ""}</div>
    <div class="ex-kind">Partie ${p.n} · ${p.name} · ${T.i + 1}/${T.items.length}</div>
    ${it.audio ? `<div class="prompt-box"><button class="speaker big" id="play">🔊</button>
      <p class="sub" id="plays" style="align-self:center">${T.mode === "mock" ? "2 écoutes maximum" : "Écoute autant que tu veux"}</p></div>` : ""}
    ${it.text ? `<div class="model" style="margin-bottom:16px">${esc(it.text)}</div>` : ""}
    <div class="ex-title">${it.part === "p2" ? "Choisis la meilleure réponse à ce que tu entends." : esc(it.q)}</div>
    <div class="options">${it.o.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${"ABCD"[k]}</span>${hideOpts ? "" : esc(o)}</button>`).join("")}</div>
    <div id="why"></div><div class="lesson-pad"></div>`;
  $("#quit").onclick = () => { if (confirm("Quitter le test ?")) { clearInterval(T.timer); go("toeic"); } };
  const play = $("#play");
  if (play) {
    play.onclick = () => {
      if (!canPlay()) return;
      T.plays++; speakLines(it.audio);
      if (!canPlay()) play.disabled = true;
    };
    if (T.plays === 0) setTimeout(() => play.click(), 300); else if (!canPlay()) play.disabled = true;
  }
  let chosen = null;
  app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
    app.querySelectorAll(".opt").forEach((x) => x.classList.remove("sel"));
    b.classList.add("sel"); chosen = +b.dataset.k; $("#check").disabled = false;
  }));
  const f = document.createElement("div");
  f.className = "footer"; f.id = "footer";
  f.innerHTML = `<div class="footer-inner"><div class="grow"></div><button class="btn" id="check" style="max-width:220px" disabled>${T.mode === "mock" ? "Valider" : "Vérifier"}</button></div>`;
  document.body.appendChild(f);
  $("#check").onclick = () => {
    const ok = chosen === it.a;
    T.answers.push({ it, chosen, ok });
    if (T.mode === "mock") return nextToeic();
    // Entraînement : correction immédiate
    beep(ok);
    app.querySelectorAll(".opt").forEach((b, k) => {
      b.disabled = true;
      if (hideOpts) b.innerHTML = `<span class="k">${"ABCD"[k]}</span>${esc(it.o[k])}`;
      if (k === it.a) b.classList.add("good"); else if (k === chosen) b.classList.add("wrong");
    });
    $("#why").innerHTML = `<div class="card" style="margin-top:14px"><h3>${ok ? "✅ Bonne réponse" : "❌ Réponse : " + "ABCD"[it.a]}</h3><p>${esc(it.why)}</p>
      ${it.part === "p2" ? `<p style="margin-top:6px">🎧 ${esc(it.q)}</p>` : ""}</div>`;
    const c = $("#check"); c.textContent = "Continuer"; c.onclick = nextToeic;
  };
}

function nextToeic() {
  T.i++;
  if (T.i < T.items.length) showToeicItem(); else finishToeic();
}

function finishToeic() {
  clearInterval(T.timer);
  removeFooter();
  if (TTS_OK) speechSynthesis.cancel();
  const all = T.items.map((it, k) => T.answers[k] || { it, chosen: null, ok: false });
  const rate = (f) => { const a = all.filter(f); return a.length ? a.filter((x) => x.ok).length / a.length : 0; };
  const L = Math.round((5 + rate((x) => PARTS[x.it.part].listen) * 490) / 5) * 5;
  const R = Math.round((5 + rate((x) => !PARTS[x.it.part].listen) * 490) / 5) * 5;
  const good = all.filter((x) => x.ok).length;
  let head;
  if (T.mode === "mock") {
    S.toeic = (S.toeic || []).concat({ date: localDay(), L, R, total: L + R });
    head = `<h1>Score estimé : ${L + R} / 990</h1>
      <div class="result-stats"><div class="rstat blue"><b>Écoute</b><span>🎧 ${L}</span></div><div class="rstat green"><b>Lecture</b><span>📄 ${R}</span></div></div>`;
  } else head = `<h1>${good} / ${all.length} bonnes réponses</h1>`;
  addXp(T.mode === "mock" ? 30 : 10);
  const byPart = Object.keys(PARTS).filter((k) => all.some((x) => x.it.part === k))
    .map((k) => `Partie ${PARTS[k].n} : ${Math.round(rate((x) => x.it.part === k) * 100)}%`).join(" · ");
  const wrong = all.filter((x) => !x.ok);
  app.innerHTML = `<div class="result" style="text-align:left">
    <div class="big" style="text-align:center">🎯</div>${head.replace("<h1>", '<h1 style="text-align:center">')}
    <p class="sub" style="text-align:center">${byPart}</p>
    ${wrong.length ? `<h3>À revoir (${wrong.length})</h3>` + wrong.map((x) => `<div class="card">
      <p><b>Partie ${PARTS[x.it.part].n}</b> — ${esc(x.it.q)}</p>
      <p style="margin-top:6px">${x.chosen === null ? "Pas de réponse" : "Ta réponse : " + esc(x.it.o[x.chosen])} → <b>${esc(x.it.o[x.it.a])}</b></p>
      <p style="margin-top:6px">💡 ${esc(x.it.why)}</p></div>`).join("") : `<div class="levelup">Aucune erreur, bravo !</div>`}
    <button class="btn" id="go">Terminer</button></div>`;
  $("#go").onclick = () => go("toeic");
  T = null;
}
