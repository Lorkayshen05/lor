/* Saves one student's progress in a small JSON file. No database needed. */
const fs = require("fs");
const path = require("path");
const { MODES } = require("./content");

const FILE = path.join(__dirname, "..", "data", "progress.json");
const DAY_SECONDS = 25 * 60;
const LEVELS = [
  { level: 1, min: 0, max: 100 },
  { level: 2, min: 101, max: 250 },
  { level: 3, min: 251, max: 500 },
  { level: 4, min: 501, max: 800 },
  { level: 5, min: 801, max: 1200 },
  { level: 6, min: 1201, max: null }   // null = no top
];

const today = () => new Date().toISOString().slice(0, 10);

function fresh() {
  const modes = {};
  MODES.forEach(m => modes[m.id] = { tries: 0, correct: 0, index: 0 });
  return { xp: 0, streak: 0, lastDay: null, modes, secondsLeft: DAY_SECONDS, timerDay: today() };
}

function read() {
  let s;
  try { s = JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { s = fresh(); }
  s = Object.assign(fresh(), s);
  MODES.forEach(m => s.modes[m.id] = Object.assign({ tries: 0, correct: 0, index: 0 }, s.modes[m.id]));
  if (s.timerDay !== today()) { s.timerDay = today(); s.secondsLeft = DAY_SECONDS; }
  return s;
}

function write(s) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
  return s;
}

function levelOf(xp) {
  return LEVELS.find(l => xp >= l.min && (l.max === null || xp <= l.max)) || LEVELS[0];
}

function markDay(s) {
  const d = today();
  if (s.lastDay === d) return s;
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  s.streak = (s.lastDay === y) ? s.streak + 1 : 1;
  s.lastDay = d;
  return s;
}

/* Weakness / improvement / next focus, worked out from the saved counts. */
function coaching(s) {
  const stats = MODES.map(m => {
    const x = s.modes[m.id];
    return { name: m.name, tries: x.tries, rate: x.tries ? x.correct / x.tries : null };
  });
  const played = stats.filter(x => x.tries >= 2);
  const tried = stats.filter(x => x.tries > 0);
  const unplayed = stats.filter(x => x.tries === 0);
  const worst = a => a.reduce((x, y) => (x.rate <= y.rate ? x : y));

  const out = {
    weakness: "Not enough data yet. Try a few answers.",
    improvement: "Keep practicing!",
    focus: "Try all six modes today."
  };
  if (played.length) {
    const w = worst(played), b = played.reduce((x, y) => (x.rate >= y.rate ? x : y));
    out.weakness = `${w.name} — ${Math.round(w.rate * 100)}% correct. Practice it a little more.`;
    out.improvement = `${b.name} — ${Math.round(b.rate * 100)}% correct. Well done!`;
  }
  const pool = played.length ? played : tried;
  if (unplayed.length) out.focus = `Try ${unplayed[0].name} next.`;
  else if (pool.length) out.focus = `Do 3 more ${worst(pool).name} questions.`;
  return out;
}

/* Everything the frontend needs to draw the screen. */
function view(s) {
  const lv = levelOf(s.xp);
  return {
    xp: s.xp, streak: s.streak, secondsLeft: s.secondsLeft, modes: s.modes,
    level: lv.level, levelMin: lv.min, levelMax: lv.max,
    coaching: coaching(s)
  };
}

module.exports = { read, write, fresh, view, levelOf, markDay, coaching, DAY_SECONDS, LEVELS, FILE };
