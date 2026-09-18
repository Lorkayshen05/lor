/* Tiny HTTP server: serves the frontend and a small JSON API. No dependencies. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { DATA, MODES } = require("./content");
const { grade } = require("./scoring");
const store = require("./store");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "..", "public");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".ico": "image/x-icon" };

const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => { raw += c; if (raw.length > 1e5) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(Object.assign(new Error("Bad JSON"), { status: 400 })); } });
    req.on("error", reject);
  });
}

/* Send a question without the answer, so the student cannot read it in the network tab. */
function publicItem(mode, index) {
  const list = DATA[mode];
  const i = ((index % list.length) + list.length) % list.length;
  const it = list[i];
  const base = { mode, index: i, total: list.length };
  if (mode === "listening")  return { ...base, audio: it.audio, question: it.question };
  if (mode === "reading")    return { ...base, text: it.text, question: it.question };
  if (mode === "vocabulary") return { ...base, word: it.word, meaning: it.meaning, example: it.example, task: it.task };
  return { ...base, prompt: it.prompt, hint: it.hint || "" };
}

async function api(req, res, url) {
  const route = url.pathname;

  if (route === "/api/modes" && req.method === "GET") return json(res, 200, { modes: MODES });

  if (route === "/api/question" && req.method === "GET") {
    const mode = url.searchParams.get("mode");
    if (!DATA[mode]) return json(res, 400, { error: "Unknown mode" });
    const index = Number(url.searchParams.get("index") || 0) || 0;
    return json(res, 200, publicItem(mode, index));
  }

  if (route === "/api/progress" && req.method === "GET") return json(res, 200, store.view(store.read()));

  if (route === "/api/answer" && req.method === "POST") {
    const { mode, index = 0, answer = "" } = await readBody(req);
    if (!DATA[mode]) return json(res, 400, { error: "Unknown mode" });
    const result = grade(mode, Number(index) || 0, answer);
    const s = store.read();
    if (result.why !== "empty") {
      s.modes[mode].tries++;
      if (result.ok) s.modes[mode].correct++;
      if (result.xp) { s.xp += result.xp; store.markDay(s); }
      store.write(s);
    }
    return json(res, 200, { ...result, progress: store.view(s) });
  }

  if (route === "/api/timer" && req.method === "POST") {
    const { secondsLeft } = await readBody(req);
    const s = store.read();
    s.secondsLeft = Math.max(0, Math.min(store.DAY_SECONDS, Number(secondsLeft) || 0));
    store.write(s);
    return json(res, 200, store.view(s));
  }

  if (route === "/api/index" && req.method === "POST") {
    const { mode, index } = await readBody(req);
    if (!DATA[mode]) return json(res, 400, { error: "Unknown mode" });
    const s = store.read();
    s.modes[mode].index = ((Number(index) || 0) % DATA[mode].length + DATA[mode].length) % DATA[mode].length;
    store.write(s);
    return json(res, 200, store.view(s));
  }

  if (route === "/api/reset" && req.method === "POST") return json(res, 200, store.view(store.write(store.fresh())));

  return json(res, 404, { error: "Not found" });
}

function serveStatic(res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    serveStatic(res, url.pathname);
  } catch (e) {
    json(res, e.status || 500, { error: e.message || "Server error" });
  }
});

if (require.main === module) server.listen(PORT, () => console.log(`English Game Mode running: http://localhost:${PORT}`));
module.exports = server;
