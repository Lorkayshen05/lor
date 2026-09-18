/* English Game Mode - simple app logic */

const KEY = "egm_state_v1";
const LEVELS = [
  { level: 1, min: 0,    max: 100 },
  { level: 2, min: 101,  max: 250 },
  { level: 3, min: 251,  max: 500 },
  { level: 4, min: 501,  max: 800 },
  { level: 5, min: 801,  max: 1200 },
  { level: 6, min: 1201, max: Infinity }
];
const DAY_SECONDS = 25 * 60;

/* ---------- state ---------- */
function today() { return new Date().toISOString().slice(0, 10); }

function freshState() {
  const modes = {};
  MODES.forEach(m => modes[m.id] = { tries: 0, correct: 0, index: 0 });
  return { xp: 0, streak: 0, lastDay: null, modes, secondsLeft: DAY_SECONDS, timerDay: today() };
}

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    const s = Object.assign(freshState(), JSON.parse(raw));
    MODES.forEach(m => s.modes[m.id] = Object.assign({ tries: 0, correct: 0, index: 0 }, s.modes[m.id]));
    if (s.timerDay !== today()) { s.timerDay = today(); s.secondsLeft = DAY_SECONDS; }
    return s;
  } catch (e) { console.warn("localStorage not available:", e); return freshState(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn("Could not save progress:", e); }
}

function markDay() {
  const d = today();
  if (state.lastDay === d) return;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  state.streak = (state.lastDay === y) ? state.streak + 1 : 1;
  state.lastDay = d;
}

function levelOf(xp) { return LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[0]; }

function addXp(n, why) {
  state.xp += n;
  markDay();
  save();
  renderStats();
  return `+${n} XP (${why})`;
}

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const clean = s => (s || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
const words = s => clean(s).split(" ").filter(Boolean);

function similarity(a, b) {
  const A = words(a), B = words(b);
  if (!B.length) return 0;
  let hit = 0;
  const pool = [...B];
  A.forEach(w => { const i = pool.indexOf(w); if (i > -1) { hit++; pool.splice(i, 1); } });
  return hit / B.length;
}
function hasAny(text, list) {
  const t = clean(text);
  return (list || []).some(k => t.includes(clean(k)));
}

/* ---------- app ---------- */
let current = { mode: null, item: null };

function buildModeBar() {
  $("modeBar").innerHTML = MODES.map(m =>
    `<button class="mode-btn" data-mode="${m.id}">${m.emoji} ${m.name}<small>${m.tag}</small></button>`
  ).join("");
  $("modeBar").querySelectorAll(".mode-btn").forEach(b =>
    b.addEventListener("click", () => startMode(b.dataset.mode))
  );
}

function startMode(id) {
  current.mode = id;
  $("modeBar").querySelectorAll(".mode-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.mode === id)
  );
  showItem();
}

function showItem() {
  const id = current.mode;
  if (!id) return;
  const list = DATA[id];
  const st = state.modes[id];
  if (st.index >= list.length) st.index = 0;
  const item = list[st.index];
  current.item = item;

  const meta = MODES.find(m => m.id === id);
  $("modeBadge").textContent = meta.emoji + " " + meta.name;
  $("qCount").textContent = `${st.index + 1} / ${list.length}`;
  $("feedback").innerHTML = "";
  $("answerBox").value = "";
  $("answerBox").placeholder = "Type your answer in English...";

  if (id === "listening") {
    $("promptText").textContent = "🔊 Press Hear, then type the sentence.";
    $("hintText").textContent = "You can listen many times.";
    speak(item.audio);
  } else if (id === "reading") {
    $("promptText").textContent = item.text;
    $("hintText").textContent = "Question: " + item.question;
  } else if (id === "vocabulary") {
    $("promptText").textContent = `${item.word} — ${item.meaning}`;
    $("hintText").textContent = `Example: ${item.example}\n${item.task}`;
  } else {
    $("promptText").textContent = item.prompt;
    $("hintText").textContent = item.hint || "";
  }
  $("answerBox").focus();
}

function submit() {
  if (!current.item) { $("feedback").textContent = "Pick a mode first 🙂"; return; }
  const id = current.mode, item = current.item;
  const ans = $("answerBox").value.trim();
  if (!ans) { $("feedback").textContent = "Write something first — any try is good!"; return; }

  const st = state.modes[id];
  st.tries++;

  let ok = false, xp = 0, tip = "", why = "";

  if (id === "listening") {
    const score = similarity(ans, item.answer);
    ok = score >= 0.7;
    xp = ok ? 20 : 0; why = "listening challenge";
    tip = ok ? "Great ears! 👂" : `Correct sentence: "${item.audio}"`;
  } else if (id === "reading" || id === "speed") {
    ok = hasAny(ans, item.keywords) || similarity(ans, item.answer) >= 0.6;
    xp = ok ? (id === "speed" ? 10 : 20) : 0;
    why = id === "speed" ? "fast answer" : "reading challenge";
    tip = ok ? "Correct! ✅" : `A good answer: "${item.answer}"`;
  } else if (id === "vocabulary") {
    ok = hasAny(ans, [item.word]) && words(ans).length >= 4;
    xp = ok ? 15 : 0; why = "new vocabulary";
    tip = ok ? "Nice use of the phrase! 💡" : `Use the phrase in a full sentence, like: "${item.example}"`;
  } else { // speaking + writing
    const n = words(ans).length;
    ok = n >= 6;
    const onTopic = hasAny(ans, item.keywords);
    xp = ok ? (onTopic ? 15 : 10) : 0;
    why = onTopic ? "natural sentence" : "good try";
    tip = !ok ? "Try a longer answer — at least 6 words."
        : onTopic ? "Good, natural English! Add one more detail next time."
        : "Nice sentence. Try to use words from the question too.";
  }

  if (ok) st.correct++;
  const gain = xp ? addXp(xp, why) : "No XP this time — try again, you are learning!";
  save();

  $("feedback").innerHTML =
    `<span class="${ok ? "ok" : "tip"}">${ok ? "Well done!" : "Almost!"}</span> ${gain}
     <div class="box"><b>Your answer:</b> ${escapeHtml(ans)}<br><b>Tip:</b> ${escapeHtml(tip)}</div>`;
  renderSide();
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function next() {
  if (!current.mode) { $("feedback").textContent = "Pick a mode first 🙂"; return; }
  state.modes[current.mode].index++;
  save();
  showItem();
}

/* ---------- voice ---------- */
function speak(text) {
  if (!("speechSynthesis" in window)) {
    $("feedback").textContent = "Your browser cannot play voice. You can read the text instead.";
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

function hear() {
  const item = current.item;
  if (!item) { $("feedback").textContent = "Pick a mode first 🙂"; return; }
  if (current.mode === "listening") speak(item.audio);
  else if (current.mode === "reading") speak(item.text + " " + item.question);
  else if (current.mode === "vocabulary") speak(item.word + ". " + item.example);
  else speak(item.prompt);
}

let rec = null, recOn = false;
function voice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    $("feedback").textContent = "🎤 Voice input is not supported in this browser. Please type your answer (Chrome works best).";
    return;
  }
  if (recOn && rec) { rec.stop(); return; }
  rec = new SR();
  rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onstart = () => { recOn = true; $("feedback").textContent = "🎤 Listening... speak in English, then press Stop."; $("btnVoice").classList.add("rec"); $("btnVoice").textContent = "⏹ Stop"; };
  rec.onresult = e => { $("answerBox").value = e.results[0][0].transcript; };
  rec.onerror = e => { $("feedback").textContent = "Voice error: " + e.error + ". You can type instead."; };
  rec.onend = () => { recOn = false; $("btnVoice").classList.remove("rec"); $("btnVoice").textContent = "🎤 Voice"; };
  try { rec.start(); } catch (e) { $("feedback").textContent = "Could not start the microphone. Please type instead."; }
}

/* ---------- timer ---------- */
let timerRunning = true, tick = null;
function fmt(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
function renderTimer() {
  $("hdrTimer").textContent = fmt(Math.max(0, state.secondsLeft));
  const done = (DAY_SECONDS - state.secondsLeft) / DAY_SECONDS * 100;
  $("timeFill").style.width = Math.min(100, done) + "%";
}
function startTimer() {
  tick = setInterval(() => {
    if (!timerRunning) return;
    if (state.secondsLeft <= 0) {
      timerRunning = false;
      $("feedback").innerHTML = `<span class="ok">25 minutes done! 🎉</span> Great work today.`;
      return;
    }
    state.secondsLeft--;
    renderTimer();
    if (state.secondsLeft % 10 === 0) save();
  }, 1000);
}

/* ---------- render ---------- */
function renderStats() {
  const lv = levelOf(state.xp);
  $("hdrLevel").textContent = lv.level;
  $("hdrXp").textContent = state.xp;
  $("hdrStreak").textContent = state.streak + "🔥";
  $("sideLevel").textContent = lv.level;
  const top = lv.max === Infinity ? state.xp : lv.max;
  const span = Math.max(1, top - lv.min);
  $("sideXpText").textContent = `${state.xp} / ${lv.max === Infinity ? "∞" : lv.max} XP`;
  $("xpFill").style.width = Math.min(100, ((state.xp - lv.min) / span) * 100) + "%";
}

function renderSide() {
  const stats = MODES.map(m => {
    const s = state.modes[m.id];
    return { name: m.name, tries: s.tries, rate: s.tries ? s.correct / s.tries : null };
  });
  const played = stats.filter(s => s.tries >= 2);
  const unplayed = stats.filter(s => s.tries === 0);

  if (!played.length) {
    $("weakness").textContent = "Not enough data yet. Try a few answers.";
    $("improvement").textContent = "Keep practicing!";
  } else {
    const worst = played.reduce((a, b) => (a.rate <= b.rate ? a : b));
    const best = played.reduce((a, b) => (a.rate >= b.rate ? a : b));
    $("weakness").textContent = `${worst.name} — ${Math.round(worst.rate * 100)}% correct. Practice it a little more.`;
    $("improvement").textContent = `${best.name} — ${Math.round(best.rate * 100)}% correct. Well done!`;
  }
  const tried = stats.filter(s => s.tries > 0);
  const pool = played.length ? played : tried;
  $("nextFocus").textContent = unplayed.length
    ? `Try ${unplayed[0].name} next.`
    : (pool.length ? `Do 3 more ${pool.reduce((a, b) => (a.rate <= b.rate ? a : b)).name} questions.`
                   : "Try all six modes today.");
  renderStats();
  renderTimer();
}

/* ---------- init ---------- */
buildModeBar();
renderSide();
startTimer();

$("btnSubmit").addEventListener("click", submit);
$("btnNext").addEventListener("click", next);
$("btnHear").addEventListener("click", hear);
$("btnVoice").addEventListener("click", voice);
$("btnTimer").addEventListener("click", () => {
  timerRunning = !timerRunning;
  $("btnTimer").textContent = timerRunning ? "Pause" : "Start";
});
$("btnResetDay").addEventListener("click", () => {
  state.secondsLeft = DAY_SECONDS; timerRunning = true; $("btnTimer").textContent = "Pause"; save(); renderTimer();
});
$("btnResetAll").addEventListener("click", () => {
  if (confirm("Delete all XP and progress?")) { state = freshState(); save(); current = { mode: null, item: null }; buildModeBar(); renderSide(); location.reload(); }
});
$("answerBox").addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
});

startMode("speaking");
