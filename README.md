# English Game Mode 🎮

English practice app for one student. Six modes, XP, levels, streak and a daily 25-minute timer.

## Structure

**Backend** (Node, no dependencies)
- `server/index.js` — HTTP server: serves the frontend + the JSON API
- `server/content.js` — all questions and answers
- `server/scoring.js` — checks answers and gives XP
- `server/store.js` — levels, streak, coaching, saves to `data/progress.json`

**Frontend** (plain HTML/CSS/JS)
- `public/index.html`, `public/style.css`, `public/app.js`

The answers stay on the server, so the student cannot read them in the browser.
`localStorage` keeps a copy of the XP so the numbers appear immediately on load.

## API
| Method | Path | What it does |
|---|---|---|
| GET | `/api/modes` | the six modes |
| GET | `/api/question?mode=&index=` | one question (no answer inside) |
| GET | `/api/progress` | XP, level, streak, timer, coaching |
| POST | `/api/answer` | checks an answer, adds XP, returns a tip |
| POST | `/api/index` | remembers which question you are on |
| POST | `/api/timer` | saves the 25-minute timer |
| POST | `/api/reset` | deletes all progress |

## How to run
```
npm start
```
Then open http://localhost:3000 (Chrome or Edge for voice input).

## XP and levels
+10 correct · +20 skill challenge · +15 natural sentence · +15 new vocabulary

L1 0–100 · L2 101–250 · L3 251–500 · L4 501–800 · L5 801–1200 · L6 1201+
