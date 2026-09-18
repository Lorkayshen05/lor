/* Frontend. All questions, grading and saving happen on the backend.
   localStorage keeps a copy of the progress so the numbers show instantly
   and are not lost if the server file disappears. */

const $ = id => document.getElementById(id);
const CACHE = "egm_cache_v2";

let modes = [], mode = "speaking", index = 0, item = null, progress = null, online = true;

async function api(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}
const post = (path, body) => api(path, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
});

function setOnline(ok, msg) {
  online = ok;
  $("conn").textContent = ok ? "Connected to the server. Progress is saved." : (msg || "Server is offline. Progress is kept in this browser only.");
  $("connLabel").textContent = ok ? "🔌 Connection" : "⚠️ Connection";
}

function cacheSave(p) { try { localStorage.setItem(CACHE, JSON.stringify(p)); } catch (e) { console.warn(e); } }
function cacheLoad() { try { return JSON.parse(localStorage.getItem(CACHE) || "null"); } catch { return null; } }

/* ---------- drawing ---------- */
function drawProgress(p) {
  if (!p) return;
  progress = p;
  cacheSave(p);
  $("level").textContent = p.level;
  $("xp").textContent = p.xp;
  $("xp2").textContent = p.xp;
  $("streak").textContent = p.streak;
  $("levelText").textContent = "Level " + p.level;
  if (p.levelMax === null) { $("goal").textContent = "MAX"; $("fill").style.width = "100%"; }
  else {
    const span = Math.max(1, p.levelMax - p.levelMin);
    $("goal").textContent = `${p.xp - p.levelMin} / ${span}`;
    $("fill").style.width = Math.min(100, (p.xp - p.levelMin) / span * 100) + "%";
  }
  $("weakness").textContent = p.coaching.weakness;
  $("improvement").textContent = p.coaching.improvement;
  $("focus").textContent = p.coaching.focus;
  if (!timerRunning) { seconds = p.secondsLeft; drawTimer(); }
}

function drawModes() {
  $("modes").innerHTML = modes.map(m =>
    `<button class="mode${m.id === mode ? " active" : ""}" data-mode="${m.id}">${m.emoji} <strong>${m.name}</strong><span>${m.tag}</span></button>`
  ).join("");
  $("modes").querySelectorAll(".mode").forEach(b => b.onclick = () => selectMode(b.dataset.mode));
}

function drawQuestion() {
  const meta = modes.find(m => m.id === item.mode) || { emoji: "", name: item.mode };
  $("badge").textContent = `${meta.emoji} ${meta.name.toUpperCase()}`;
  $("count").textContent = `${item.index + 1} / ${item.total}`;
  $("feedback").className = "feedback";
  $("answer").value = "";

  if (item.mode === "listening") {
    $("question").textContent = "🔊 Press Hear, then type the sentence.";
    $("hint").textContent = "You can listen as many times as you want.";
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
  $("answer").focus();
}

function say(html) { $("feedback").className = "feedback show"; $("feedback").innerHTML = html; }
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

/* ---------- actions ---------- */
async function loadQuestion() {
  try {
    item = await api(`/api/question?mode=${encodeURIComponent(mode)}&index=${index}`);
    index = item.index;
    setOnline(true);
    drawQuestion();
  } catch (e) {
    setOnline(false, "Cannot reach the server. Start it with: npm start");
    $("question").textContent = "⚠️ The server is not running. Open a terminal and run: npm start";
    $("hint").textContent = "";
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
  if (!answer) return say("⚠️ Write an answer first. Mistakes are okay.");
  try {
    const r = await post("/api/answer", { mode, index, answer });
    drawProgress(r.progress);
    setOnline(true);
    say(`${r.ok ? "✅ <b>Well done!</b>" : "💪 <b>Almost!</b>"} ${r.xp ? `<b>+${r.xp} XP</b> (${r.why})` : "No XP this time — you are still learning."}
      <br><br><b>Your answer:</b> ${escapeHtml(answer)}<br><br>💡 <b>Tip:</b> ${escapeHtml(r.tip)}`);
  } catch (e) {
    setOnline(false);
    say("⚠️ Could not reach the server, so this answer was not saved.<br>Start it in a terminal with: <b>npm start</b>");
  }
}

async function next() {
  index = index + 1;
  await loadQuestion();
  try { drawProgress(await post("/api/index", { mode, index })); } catch (e) { setOnline(false); }
}

/* ---------- voice ---------- */
function speak(text) {
  if (!("speechSynthesis" in window)) return say("🔇 This browser cannot play voice. Please read the text instead.");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.9;
  speechSynthesis.speak(u);
}
function hear() {
  if (!item) return say("⚠️ No question loaded yet.");
  if (item.mode === "listening") speak(item.audio);
  else if (item.mode === "reading") speak(item.text + " " + item.question);
  else if (item.mode === "vocabulary") speak(item.word + ". " + item.example);
  else speak(item.prompt);
}

let rec = null, recOn = false;
function voice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return say("🎙️ Voice input is not supported in this browser. Please type your answer (Chrome or Edge work best).");
  if (recOn && rec) return rec.stop();
  rec = new SR();
  rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onstart = () => { recOn = true; $("voice").classList.add("rec"); $("voice").textContent = "⏹ Stop"; say("🎙️ Listening… speak in English, then press Stop."); };
  rec.onresult = e => { $("answer").value = e.results[0][0].transcript; };
  rec.onerror = e => say("🎙️ Voice error: " + escapeHtml(e.error) + ". You can type instead.");
  rec.onend = () => { recOn = false; $("voice").classList.remove("rec"); $("voice").textContent = "🎙️ Voice"; };
  try { rec.start(); } catch { say("🎙️ Could not start the microphone. Please type instead."); }
}

/* ---------- 25-minute timer ---------- */
const DAY = 1500;
let seconds = DAY, timerRunning = false, tick = null;
function drawTimer() {
  $("timer").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  $("timeFill").style.width = Math.min(100, (DAY - seconds) / DAY * 100) + "%";
}
function saveTimer() { post("/api/timer", { secondsLeft: seconds }).then(drawProgress).catch(() => setOnline(false)); }
function toggleTimer() {
  if (timerRunning) { clearInterval(tick); tick = null; timerRunning = false; $("start").textContent = "Start"; saveTimer(); return; }
  timerRunning = true; $("start").textContent = "Pause";
  tick = setInterval(() => {
    seconds--; drawTimer();
    if (seconds % 15 === 0) saveTimer();
    if (seconds <= 0) {
      clearInterval(tick); tick = null; timerRunning = false; $("start").textContent = "Start";
      saveTimer(); say("🎉 <b>25 minutes done!</b> Great work today.");
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
  try { drawProgress(await post("/api/reset", {})); index = 0; await loadQuestion(); say("🧹 Progress reset. Good luck!"); }
  catch { setOnline(false); }
};
$("answer").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); });

(async function init() {
  drawProgress(cacheLoad());            // show saved numbers at once
  drawTimer();
  try {
    modes = (await api("/api/modes")).modes;
    drawProgress(await api("/api/progress"));
    setOnline(true);
  } catch {
    modes = [{ id: "speaking", name: "Speaking", emoji: "🗣️", tag: "Real conversation" }];
    setOnline(false, "Cannot reach the server. Start it with: npm start");
  }
  drawModes();
  await loadQuestion();
})();
