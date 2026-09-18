/* Frontend. The backend owns the questions, the grading and the saved progress. */

const $ = id => document.getElementById(id);
const CACHE = "egm_cache_v3";
const RING = 2 * Math.PI * 52;          // circumference of the XP ring
const XP_HINT = { speaking:"+15", listening:"+20", reading:"+20", writing:"+15", vocabulary:"+15", speed:"+10" };

let modes = [], mode = "speaking", index = 0, item = null, progress = null;

/* ---------- api ---------- */
async function api(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}
const post = (path, body) => api(path, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
});

function setOnline(ok, msg) {
  $("dot").className = "dot " + (ok ? "on" : "off");
  $("conn").textContent = ok ? "Saved on your computer" : (msg || "Server offline — run: npm start");
}

const cacheSave = p => { try { localStorage.setItem(CACHE, JSON.stringify(p)); } catch (e) { console.warn(e); } };
const cacheLoad = () => { try { return JSON.parse(localStorage.getItem(CACHE) || "null"); } catch { return null; } };

/* ---------- drawing ---------- */
function bump(el) { el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }

function drawProgress(p, animate) {
  if (!p) return;
  const before = progress ? progress.xp : null;
  progress = p;
  cacheSave(p);

  $("level").textContent = p.level;
  $("xp").textContent = p.xp;
  $("xp2").textContent = p.xp;
  $("streak").textContent = p.streak;
  $("levelText").textContent = "Level " + p.level;

  let pct = 1;
  if (p.levelMax === null) $("goal").textContent = "MAX";
  else {
    const span = Math.max(1, p.levelMax - p.levelMin);
    pct = Math.min(1, (p.xp - p.levelMin) / span);
    $("goal").textContent = `${p.xp - p.levelMin} / ${span}`;
  }
  $("ringFg").style.strokeDasharray = RING;
  $("ringFg").style.strokeDashoffset = RING * (1 - pct);

  $("weakness").textContent = p.coaching.weakness;
  $("improvement").textContent = p.coaching.improvement;
  $("focus").textContent = p.coaching.focus;

  if (animate && before !== null && p.xp > before) {
    bump($("xp").closest(".chip"));
    bump($("level").closest(".chip"));
  }
  if (!timerRunning) { seconds = p.secondsLeft; drawTimer(); }
}

function drawModes() {
  $("modes").innerHTML = modes.map(m =>
    `<button class="mode${m.id === mode ? " active" : ""}" data-mode="${m.id}" title="${m.tag}">
       <i>${m.emoji}</i><b>${m.name}</b></button>`).join("");
  $("modes").querySelectorAll(".mode").forEach(b => b.onclick = () => selectMode(b.dataset.mode));
}

function drawQuestion() {
  const meta = modes.find(m => m.id === item.mode) || { emoji: "", name: item.mode };
  $("badge").textContent = meta.name;
  $("count").textContent = `${item.index + 1} / ${item.total}`;
  $("xpHint").textContent = XP_HINT[item.mode] || "+XP";
  $("feedback").className = "feedback";
  $("answer").value = "";
  countWords();

  if (item.mode === "listening") {
    $("question").textContent = "Press Hear, then write the sentence you heard.";
    $("hint").textContent = "You can listen as many times as you like.";
    speak(item.audio);
  } else if (item.mode === "reading") {
    $("question").textContent = item.text;
    $("hint").textContent = "Question: " + item.question;
  } else if (item.mode === "vocabulary") {
    $("question").textContent = `${item.word} — ${item.meaning}`;
    $("hint").textContent = `Example: ${item.example}\n${item.task}`;
  } else {
    $("question").textContent = item.prompt;
    $("hint").textContent = item.hint || "";
  }

  const card = $("stagecard");
  card.classList.remove("swap"); void card.offsetWidth; card.classList.add("swap");
  $("answer").focus();
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));

function note(kind, title, xp, rows) {
  $("feedback").className = "feedback show" + (kind ? " " + kind : "");
  $("feedback").innerHTML =
    `<div class="fb-top">${title}${xp ? `<span class="fb-xp">+${xp} XP</span>` : ""}</div>` +
    (rows || []).map(r => `<div class="fb-row"><b>${r[0]}</b><span class="${r[2] || ""}">${r[1]}</span></div>`).join("");
}

function countWords() {
  const n = $("answer").value.trim().split(/\s+/).filter(Boolean).length;
  $("wordcount").textContent = n === 1 ? "1 word" : n + " words";
}

/* ---------- actions ---------- */
async function loadQuestion() {
  try {
    item = await api(`/api/question?mode=${encodeURIComponent(mode)}&index=${index}`);
    index = item.index;
    setOnline(true);
    drawQuestion();
  } catch {
    setOnline(false);
    $("question").textContent = "The server is not running.";
    $("hint").textContent = "Open a terminal in this folder and run:  npm start";
  }
}

function selectMode(id) {
  mode = id;
  index = (progress && progress.modes[id]) ? progress.modes[id].index : 0;
  drawModes();
  loadQuestion();
}

async function submit() {
  const answer = $("answer").value.trim();
  if (!answer) return note("warn", "✍️ Write something first", 0, [["Remember", "Mistakes are part of learning."]]);
  try {
    const r = await post("/api/answer", { mode, index, answer });
    drawProgress(r.progress, true);
    setOnline(true);
    note(r.ok ? "ok" : "", r.ok ? "✅ Well done!" : "💪 Almost there", r.xp,
      [["Your answer", escapeHtml(answer), "said"], ["Tip", escapeHtml(r.tip)]]);
  } catch {
    setOnline(false);
    note("warn", "⚠️ Not saved", 0, [["Server offline", "Start it with: <b>npm start</b>"]]);
  }
}

async function next() {
  index += 1;
  await loadQuestion();
  try { drawProgress(await post("/api/index", { mode, index })); } catch { setOnline(false); }
}

/* ---------- voice ---------- */
function speak(text) {
  if (!("speechSynthesis" in window)) return note("warn", "🔇 No voice in this browser", 0, [["What to do", "Please read the text instead."]]);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.9;
  speechSynthesis.speak(u);
}
function hear() {
  if (!item) return;
  if (item.mode === "listening") speak(item.audio);
  else if (item.mode === "reading") speak(item.text + " " + item.question);
  else if (item.mode === "vocabulary") speak(item.word + ". " + item.example);
  else speak(item.prompt);
}

let rec = null, recOn = false;
function voice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return note("warn", "🎙️ Voice input not supported", 0,
    [["What to do", "Please type your answer. Chrome and Edge support the microphone."]]);
  if (recOn && rec) return rec.stop();
  rec = new SR();
  rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onstart = () => { recOn = true; $("voice").classList.add("rec"); $("voice").innerHTML = "⏹<span>Stop</span>";
    note("", "🎙️ Listening…", 0, [["Speak in English", "Then press Stop."]]); };
  rec.onresult = e => { $("answer").value = e.results[0][0].transcript; countWords(); };
  rec.onerror = e => note("warn", "🎙️ Voice error", 0, [["Reason", escapeHtml(e.error) + " — you can type instead."]]);
  rec.onend = () => { recOn = false; $("voice").classList.remove("rec"); $("voice").innerHTML = "🎙️<span>Voice</span>"; };
  try { rec.start(); } catch { note("warn", "🎙️ Microphone not available", 0, [["What to do", "Please type instead."]]); }
}

/* ---------- 25-minute timer ---------- */
const DAY = 1500;
let seconds = DAY, timerRunning = false, tick = null;
function drawTimer() {
  const t = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  $("timer").textContent = t;
  $("miniTimer").textContent = t;
  $("timeFill").style.width = Math.min(100, (DAY - seconds) / DAY * 100) + "%";
}
const saveTimer = () => post("/api/timer", { secondsLeft: seconds }).then(p => drawProgress(p)).catch(() => setOnline(false));
function toggleTimer() {
  if (timerRunning) { clearInterval(tick); tick = null; timerRunning = false; $("start").textContent = "Start"; saveTimer(); return; }
  timerRunning = true; $("start").textContent = "Pause";
  tick = setInterval(() => {
    seconds--; drawTimer();
    if (seconds % 15 === 0) saveTimer();
    if (seconds <= 0) {
      clearInterval(tick); tick = null; timerRunning = false; $("start").textContent = "Start"; saveTimer();
      note("ok", "🎉 25 minutes done!", 0, [["Today", "Great work. See you tomorrow to keep the streak."]]);
    }
  }, 1000);
}

/* ---------- start ---------- */
$("submit").onclick = submit;
$("next").onclick = next;
$("hear").onclick = hear;
$("voice").onclick = voice;
$("start").onclick = toggleTimer;
$("reset").onclick = () => { clearInterval(tick); tick = null; timerRunning = false; $("start").textContent = "Start"; seconds = DAY; drawTimer(); saveTimer(); };
$("resetAll").onclick = async () => {
  if (!confirm("Delete all XP and progress?")) return;
  try { drawProgress(await post("/api/reset", {})); index = 0; await loadQuestion(); note("", "🧹 Progress reset", 0, [["Good luck", "Start again from Level 1."]]); }
  catch { setOnline(false); }
};
$("answer").addEventListener("input", countWords);
$("answer").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); });

(async function init() {
  $("ringFg").style.strokeDasharray = RING;
  $("ringFg").style.strokeDashoffset = RING;
  drawProgress(cacheLoad());
  drawTimer();
  try {
    modes = (await api("/api/modes")).modes;
    drawProgress(await api("/api/progress"));
    setOnline(true);
  } catch {
    modes = [{ id: "speaking", name: "Speaking", emoji: "🗣️", tag: "Real conversation" }];
    setOnline(false);
  }
  drawModes();
  await loadQuestion();
})();
