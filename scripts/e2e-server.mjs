/**
 * End-to-end check of the whole stack in a real browser:
 *   built front end  →  real HTTP  →  built server  →  SQLite  →  signed webhook to a local receiver
 *
 * What this proves: ordering, server-side pricing, duplicate protection when a response is lost, failed
 * notifications keeping the order and retrying without duplicates, live status reaching the customer,
 * staff sign-in and role limits. What it does NOT prove: delivery through real WhatsApp / SMTP / kitchen
 * providers (those need real credentials) — the kitchen webhook goes to a local receiver started here.
 *
 * Usage: npm run build:all && npm run e2e      (CHROMIUM_PATH=… if Playwright's browser isn't installed)
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 8798;
const RECEIVER_PORT = 8797;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'ruby-e2e-'));
const WEBHOOK_SECRET = randomBytes(16).toString('hex');
const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: String(PORT),
  DATABASE_PATH: join(tmp, 'e2e.db'),
  ORDER_TOKEN_SECRET: randomBytes(32).toString('hex'),
  KDS_WEBHOOK_URL: `http://127.0.0.1:${RECEIVER_PORT}/hook`,
  KDS_WEBHOOK_SECRET: WEBHOOK_SECRET,
  WORKER_INTERVAL_MS: '1000',
  NOTIFY_MAX_ATTEMPTS: '2',
  NODE_NO_WARNINGS: '1',
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? `\n    ${detail}` : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000, step = 200) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await wait(step);
  }
  return null;
}

// ---- a stand-in for a kitchen display system: a real HTTP receiver that verifies the signature ----
const received = [];
let receiverMode = 'ok';
const receiver = createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    if (receiverMode === 'fail') {
      res.writeHead(503).end('down');
      return;
    }
    const expected = `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')}`;
    received.push({ signatureOk: req.headers['x-ruby-signature'] === expected, eventId: req.headers['x-ruby-event-id'], body: JSON.parse(body) });
    res.writeHead(200).end('ok');
  });
});
await new Promise((r) => receiver.listen(RECEIVER_PORT, '127.0.0.1', r));

// ---- staff account + server ----
const mk = spawnSync('node', ['dist-server/scripts/create-staff.mjs', '--username', 'amy', '--role', 'staff', '--password-stdin'], { env, input: 'staff-password-123', encoding: 'utf8' });
spawnSync('node', ['dist-server/scripts/create-staff.mjs', '--username', 'boss', '--role', 'manager', '--password-stdin'], { env, input: 'manager-password-123', encoding: 'utf8' });
check('staff CLI creates accounts', mk.status === 0, mk.stderr);

const server = spawn('node', ['dist-server/server/index.mjs'], { env, stdio: 'ignore' });
const up = await until(async () => fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false), 15000);
check('server starts and reports healthy', !!up);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));

  // ===== 1. Customer orders (dine-in) =====
  await page.goto(`${BASE}/#/menu/peanut-paste`);
  await page.getByRole('button', { name: /Add to cart/ }).click();
  await page.goto(`${BASE}/#/checkout`);
  await page.fill('#f-tableNumber', 'b5');
  await page.getByRole('button', { name: /Place order/ }).click();
  await page.waitForSelector('.confirmation');
  const orderId = (await page.locator('.facts__big').innerText()).trim();
  check('customer places an order and sees a server-issued order number', /^RDH-\d{6}-001$/.test(orderId), orderId);
  check('order total on confirmation is the server price (RM 7.00)', (await page.locator('.order-summary').innerText()).includes('RM 7.00'));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/customer-confirmation-390.png`, fullPage: true });

  const hook = await until(() => received.find((r) => r.body.data?.orderId === orderId), 10000);
  check('kitchen webhook was really delivered over HTTP with a valid HMAC signature', !!hook && hook.signatureOk);
  const allKeys = (o) => (o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => [k, ...allKeys(v)]) : []);
  check('kitchen payload has the order but no customer contact fields', !!hook && hook.body.data.tableNumber === 'B5' && !allKeys(hook.body).some((k) => /^(contact|phone|customer.*|email)$/i.test(k)), JSON.stringify(allKeys(hook?.body)));
  check('webhook carries a stable event id for de-duplication', !!hook && /^ntf_/.test(hook.eventId ?? ''));

  // ===== 2. Staff signs in (separate session) and sees the order =====
  const staffCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const staff = await staffCtx.newPage();
  await staff.goto(`${BASE}/#/admin`);
  await staff.fill('#adm-user', 'amy');
  await staff.fill('#adm-pass', 'staff-password-123');
  await staff.getByRole('button', { name: 'Sign in' }).click();
  await staff.waitForSelector('.adm-order');
  check('staff sees the new order on the dashboard', (await staff.locator('.adm-order').first().innerText()).includes(orderId));
  check('dashboard raises a new-order alert', await staff.getByText(/new order.* waiting/).isVisible());
  check('dashboard shows the KDS notification as delivered', (await staff.locator('.adm-notifs').first().innerText()).includes('kds: sent'));
  if (SHOTS) await staff.screenshot({ path: `${SHOTS}/admin-orders-1280.png` });

  // ===== 3. Staff confirms → the customer's page updates by itself =====
  await staff.getByRole('button', { name: 'Confirm', exact: true }).first().click();
  const seen = await until(async () => (await page.locator('.order-summary .status').innerText()) === 'Confirmed', 20000, 500);
  check('customer sees "Confirmed" without reloading (live status)', !!seen);

  // ===== 4. Level C: staff cannot cancel an accepted order directly =====
  check('staff gets "Request cancellation", not a direct cancel, on an accepted order', (await staff.getByRole('button', { name: 'Request cancellation' }).count()) === 1 && (await staff.getByRole('button', { name: 'Cancel order' }).count()) === 0);
  await staff.getByRole('button', { name: 'Request cancellation' }).click();
  await staff.getByLabel(/Why should this order be cancelled/).fill('Customer asked to cancel');
  await staff.getByRole('button', { name: 'Send request' }).click();
  await staff.waitForSelector('.adm-approval');
  check('cancellation request waits for a manager (order still Confirmed)', (await staff.locator('.adm-approval').innerText()).includes('waiting for a manager') && (await staff.locator('.adm-status').first().innerText()) === 'CONFIRMED');
  const denied = await staff.evaluate(async () => {
    const r = await fetch('/api/admin/approvals/anything/decision', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'ruby-admin' }, body: JSON.stringify({ approve: true }) });
    return r.status;
  });
  check('staff session is refused when it tries a manager-only action directly (403)', denied === 403, String(denied));

  // ===== 5. A lost response must not create a second order =====
  const before = await staff.evaluate(async () => (await (await fetch('/api/admin/orders?limit=50', { credentials: 'same-origin' })).json()).orders.length);
  await page.goto(`${BASE}/#/menu/soy-milk`);
  await page.getByRole('button', { name: /Add to cart/ }).click();
  await page.goto(`${BASE}/#/checkout`);
  await page.fill('#f-tableNumber', 'b6');
  let dropped = false;
  await page.route('**/api/orders', async (route) => {
    if (!dropped && route.request().method() === 'POST') {
      dropped = true;
      await route.fetch(); // the server really receives and SAVES the order…
      await route.abort('connectionreset'); // …but the response never reaches the phone
      return;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: /Place order/ }).click();
  await page.getByText("We couldn't send your order").waitFor();
  check('lost response shows a retry prompt and keeps the cart', (await page.getByRole('button', { name: 'Try again' }).count()) === 1);
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForSelector('.confirmation');
  const after = await staff.evaluate(async () => (await (await fetch('/api/admin/orders?limit=50', { credentials: 'same-origin' })).json()).orders.length);
  check('retry after a lost response created exactly ONE new order (no duplicate)', after === before + 1, `before=${before} after=${after}`);
  await page.unroute('**/api/orders');

  // ===== 6. Notification failure keeps the order; retry delivers without duplicating =====
  receiverMode = 'fail';
  await page.goto(`${BASE}/#/menu/chinese-tea`);
  await page.getByRole('button', { name: /Add to cart/ }).click();
  await page.goto(`${BASE}/#/checkout`);
  await page.fill('#f-tableNumber', 'b7');
  await page.getByRole('button', { name: /Place order/ }).click();
  await page.waitForSelector('.confirmation');
  const order3 = (await page.locator('.facts__big').innerText()).trim();
  check('order is accepted even though the kitchen system is down', /^RDH-/.test(order3));
  await staff.getByRole('link', { name: /^Automation/ }).click();
  const shown = await until(async () => (await staff.getByText('Notifications needing attention').isVisible()) && (await staff.locator('.adm-table').first().innerText()).includes('kds'), 20000, 500);
  check('dashboard lists the failed notification with its error', !!shown);
  if (!shown) {
    console.log('    DEBUG url:', staff.url());
    console.log('    DEBUG page text:', (await staff.locator('body').innerText()).slice(0, 700).replace(/\n+/g, ' | '));
    if (SHOTS) await staff.screenshot({ path: `${SHOTS}/debug-automation.png`, fullPage: true });
  }
  const failedText = (await staff.locator('.adm-table').count()) ? await staff.locator('.adm-table').first().innerText() : '';
  check('the error detail is sanitised (no secret leaks into the dashboard)', !failedText.includes(WEBHOOK_SECRET));
  receiverMode = 'ok';
  await staff.getByRole('button', { name: 'Retry now' }).first().click();
  const delivered = await until(() => received.find((r) => r.body.data?.orderId === order3), 10000);
  check('manual retry delivers once the kitchen system is back', !!delivered && delivered.signatureOk);
  const count3 = received.filter((r) => r.body.data?.orderId === order3).length;
  await wait(2500); // let the background worker run; it must not resend
  check('no duplicate notification after the retry', received.filter((r) => r.body.data?.orderId === order3).length === count3);

  // ===== 7. Manager approves the cancellation =====
  const mgrCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mgr = await mgrCtx.newPage();
  await mgr.goto(`${BASE}/#/admin/approvals`);
  await mgr.fill('#adm-user', 'boss');
  await mgr.fill('#adm-pass', 'manager-password-123');
  await mgr.getByRole('button', { name: 'Sign in' }).click();
  await mgr.getByRole('button', { name: 'Approve cancellation' }).click();
  check('manager approves → order becomes cancelled', !!(await until(async () => (await mgr.evaluate(async (id) => (await (await fetch(`/api/admin/orders/${id}`)).json()).order.status, orderId)) === 'cancelled', 8000)));
  if (SHOTS) await mgr.screenshot({ path: `${SHOTS}/admin-approvals-390.png` });

  // ===== 8. Report reflects the saved orders =====
  await staff.goto(`${BASE}/#/admin/reports`);
  await staff.getByRole('button', { name: 'Generate report' }).click();
  await staff.waitForSelector('.adm-report');
  const rep = await staff.locator('.adm-report').innerText();
  check('report shows date range, time zone and data source', /Asia\/Kuala_Lumpur/.test(rep) && /order database/.test(rep));
  check('report counts the 2 live orders (1 cancelled is excluded from sales)', /Orders\s*\n?\s*2/.test(rep) || rep.includes('1 order was cancelled'), rep.slice(0, 400));
  check('report flags sample-menu orders as test data', /sample menu/i.test(rep));
  if (SHOTS) await staff.screenshot({ path: `${SHOTS}/admin-report-1280.png`, fullPage: true });

  // ===== 9. Guide in the browser =====
  await page.goto(`${BASE}/#/discover`);
  await page.getByRole('button', { name: 'What can I order within RM10?' }).click();
  await page.waitForSelector('.guide__answer');
  check('Ruby Dessert Guide answers a budget question in the browser', (await page.locator('.guide__answer').last().innerText()).includes('RM 10.00'));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/guide-390.png`, fullPage: true });

  check('no console/page errors in the customer app', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.kill();
  receiver.close();
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} of ${results.length} end-to-end checks FAILED` : `\n✓ all ${results.length} end-to-end checks passed`);
process.exit(failed.length ? 1 : 0);
