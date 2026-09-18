/* Answer checking and XP rules. Runs on the server so the rules live in one place. */
const { DATA } = require("./content");

const XP = { correct: 10, challenge: 20, natural: 15, vocabulary: 15 };

const clean = s => (s || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
const words = s => clean(s).split(" ").filter(Boolean);

function similarity(a, b) {
  const A = words(a), B = words(b);
  if (!B.length) return 0;
  const pool = [...B];
  let hit = 0;
  A.forEach(w => { const i = pool.indexOf(w); if (i > -1) { hit++; pool.splice(i, 1); } });
  return hit / B.length;
}
function hasAny(text, list) {
  const t = clean(text);
  return (list || []).some(k => t.includes(clean(k)));
}

/* Returns { ok, xp, why, tip } for one answer. */
function grade(mode, index, answer) {
  const list = DATA[mode];
  if (!list) throw Object.assign(new Error("Unknown mode: " + mode), { status: 400 });
  const item = list[((index % list.length) + list.length) % list.length];
  const text = (answer || "").trim();
  if (!text) return { ok: false, xp: 0, why: "empty", tip: "Write something first — any try is good!" };

  if (mode === "listening") {
    const ok = similarity(text, item.answer) >= 0.7;
    return { ok, xp: ok ? XP.challenge : 0, why: "listening challenge",
      tip: ok ? "Great ears! 👂" : `Correct sentence: "${item.audio}"` };
  }
  if (mode === "reading" || mode === "speed") {
    const ok = hasAny(text, item.keywords) || similarity(text, item.answer) >= 0.6;
    return { ok, xp: ok ? (mode === "speed" ? XP.correct : XP.challenge) : 0,
      why: mode === "speed" ? "fast answer" : "reading challenge",
      tip: ok ? "Correct! ✅" : `A good answer: "${item.answer}"` };
  }
  if (mode === "vocabulary") {
    const ok = hasAny(text, [item.word]) && words(text).length >= 4;
    return { ok, xp: ok ? XP.vocabulary : 0, why: "new vocabulary",
      tip: ok ? "Nice use of the phrase! 💡" : `Use the phrase in a full sentence, like: "${item.example}"` };
  }
  // speaking + writing
  const n = words(text).length;
  const ok = n >= 6;
  const onTopic = hasAny(text, item.keywords);
  return {
    ok,
    xp: ok ? (onTopic ? XP.natural : XP.correct) : 0,
    why: onTopic ? "natural sentence" : "good try",
    tip: !ok ? "Try a longer answer — at least 6 words."
       : onTopic ? "Good, natural English! Add one more detail next time."
       : "Nice sentence. Try to use words from the question too."
  };
}

module.exports = { grade, XP, similarity, hasAny, words };
