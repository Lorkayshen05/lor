import { expect, type Browser, type Page } from "@playwright/test";
import pg from "pg";

export const ADMIN = { email: "admin@example.com", password: "admin-dev-password-1" };
export const REAL_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function login(page: Page, email: string, password: string, next?: string) {
  await page.goto(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function register(page: Page, name: string, email: string, password: string, next?: string) {
  await page.goto(`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

/** A fresh browser context (own cookies) — used to act as different people in one test. */
let personCounter = 0;
export async function newPerson(browser: Browser) {
  // Each simulated person gets their own client IP (the app trusts the proxy's x-forwarded-for), so
  // per-IP rate limits stay ON in e2e and don't make unrelated tests interfere with each other.
  const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${(++personCounter % 250) + 1}`;
  const context = await browser.newContext({ userAgent: REAL_UA, baseURL: "http://localhost:3100", extraHTTPHeaders: { "x-forwarded-for": ip } });
  return { context, page: await context.newPage() };
}

export async function adminPage(browser: Browser) {
  const p = await newPerson(browser);
  await login(p.page, ADMIN.email, ADMIN.password);
  await expect(p.page).toHaveURL(/\/admin$/);
  return p;
}

export const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@e2e.my`;

/** Next.js always renders an empty role="alert" route announcer; exclude it so real alerts are unambiguous. */
export const alerts = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://bekusegar:bekusegar_dev@localhost:5432/bekusegar_e2e";
export async function dbScalar<T = number>(sql: string, params: unknown[] = []): Promise<T> {
  const client = new pg.Client({ connectionString: E2E_DB });
  await client.connect();
  try {
    const { rows } = await client.query(sql, params);
    return Object.values(rows[0] ?? {})[0] as T;
  } finally {
    await client.end();
  }
}
export const eventCount = async (type: string) => Number(await dbScalar<string>('SELECT count(*) FROM "AnalyticsEvent" WHERE type = $1::"AnalyticsEventType"', [type]));
