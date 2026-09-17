/**
 * End-to-end smoke test: register → dashboard → quest → run → submit → XP.
 * Drives a real browser so the Pyodide sandbox is exercised the way learners use it.
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const stamp = Date.now();
const user = { username: `smoke${stamp}`.slice(0, 20), email: `smoke${stamp}@playgame.dev`, password: "smoke12345" };

const steps = [];
function ok(name, detail = "") {
  steps.push(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  steps.push(`✗ ${name} — ${detail}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
let failures = 0;

try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  ok("landing page renders", await page.title());

  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) ok("protected route redirects to login");
  else { fail("protected route redirects to login", page.url()); failures++; }

  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", user.username);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.fill("#confirmPassword", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  ok("register signs the player in", user.username);

  await page.click("text=Continue:");
  await page.waitForURL("**/quest/**", { timeout: 30_000 });
  const questTitle = await page.locator("h1").first().innerText();
  ok("first quest opens", questTitle);

  // Solve the first quest.
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type('print("Hello, PlayGame!")');

  await page.getByRole("button", { name: "Run" }).click();
  await page.waitForSelector("text=tests passed", { timeout: 120_000 });
  ok("sandbox ran the code", (await page.locator("text=/\\d+\\/\\d+ tests passed/").first().innerText()));

  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForSelector("text=Quest cleared!", { timeout: 120_000 });
  ok("submission awards XP", await page.locator("text=Quest cleared!").first().innerText());

  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  const xpText = await page.locator("text=/Quests cleared/").first().textContent();
  ok("dashboard reflects progress", xpText?.trim());

  for (const path of ["/courses", "/leaderboard", "/achievements", "/projects", "/profile"]) {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    if (response?.status() === 200) ok(`${path} renders`);
    else { fail(`${path} renders`, String(response?.status())); failures++; }
  }

  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/dashboard")) ok("admin route blocks non-admins");
  else { fail("admin route blocks non-admins", page.url()); failures++; }

  // The AI tutor answers even without an API key (rule engine fallback).
  const tutor = await page.evaluate(async () => {
    const response = await fetch("/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "hint" }),
    });
    return { status: response.status, body: await response.json() };
  });
  if (tutor.status === 200 && tutor.body.body) ok("tutor responds", `${tutor.body.source}: ${tutor.body.body.slice(0, 40)}…`);
  else { fail("tutor responds", JSON.stringify(tutor).slice(0, 120)); failures++; }

  // Admin account from the seed.
  const adminPage = await browser.newPage();
  await adminPage.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await adminPage.fill("#email", "admin@playgame.dev");
  await adminPage.fill("#password", "admin1234");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL("**/dashboard", { timeout: 30_000 });
  ok("seeded admin can log in");

  await adminPage.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  if (await adminPage.locator("text=Create / update quest").isVisible()) ok("admin console renders for admins");
  else { fail("admin console renders for admins", adminPage.url()); failures++; }

  const unauthenticated = await browser.newContext();
  const guest = await unauthenticated.newPage();
  const guestTutor = await guest.request.post(`${BASE}/api/tutor`, { data: { action: "hint" } });
  if (guestTutor.status() === 401) ok("tutor API rejects anonymous callers");
  else { fail("tutor API rejects anonymous callers", String(guestTutor.status())); failures++; }
} catch (error) {
  fail("smoke run", error.message);
  failures++;
} finally {
  console.log(steps.join("\n"));
  await browser.close();
  process.exit(failures > 0 ? 1 : 0);
}
