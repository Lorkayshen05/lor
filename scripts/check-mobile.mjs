/**
 * Layout smoke test in a real (headless Chromium) browser.
 * For every route × viewport it checks:
 *   - the page never scrolls horizontally
 *   - no visible element pokes outside the viewport (except explicit scrollers)
 *   - interactive controls are at least 44×44 CSS px
 * Usage: npm run build && npm run check:mobile   (starts `vite preview` itself)
 * It also drives interactive flows (checkout errors → confirmation, wizard, planner, empty search,
 * Back-button scroll restoration) and audits each resulting state.
 * Set SHOTS=dir to save screenshots.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/#`;
const VIEWPORTS = [320, 375, 390, 393, 412, 768, 1024, 1440].map((w) => ({ width: w, height: w < 700 ? 800 : 900 }));
const ROUTES = ['/', '/menu', '/menu/black-sesame-paste', '/discover', '/discover?mode=plan', '/cart', '/checkout', '/orders'];
const LANGS = ['en', 'ar', 'ms', 'zh-CN'];
const SHOTS = process.env.SHOTS;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/`); if (r.ok) break; } catch { /* retry */ }
  await wait(250);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let failures = 0;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

async function audit(page, label) {
  const result = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const out = [];
    const inScroller = (el) => !!el.closest('.chips');
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed' && el.closest('.sheet-backdrop')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.closest('.sr-only') || el.classList.contains('sr-only') || el.closest('.skip-link') || el.classList.contains('skip-link')) continue;
      if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) {
        out.push(`overflow ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} [${Math.round(r.left)},${Math.round(r.right)}] vw=${vw}`);
      }
      if (el.matches('button, .option, .chip, .tag, .badge, .btn, .segmented__btn, .tabs__btn') && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
        out.push(`text-overflow ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} scrollW=${el.scrollWidth} clientW=${el.clientWidth} "${(el.textContent || '').trim().slice(0, 24)}"`);
      }
      if (['A', 'BUTTON', 'INPUT', 'SELECT'].includes(el.tagName) && !el.closest('.sr-only')) {
        const small = (r.height < 43.5 || r.width < 43.5) && !(el.tagName === 'A' && getComputedStyle(el).display === 'inline' );
        const isTitleLink = el.closest('.card__title, .rec__title, .combo__name, .cart-line__name, .wordmark, .panel, .facts, .outlets');
        if (small && !isTitleLink) out.push(`small-target ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}"`);
      }
    }
    return { vw, scrollW, issues: [...new Set(out)].slice(0, 12) };
  });
  const problems = [...result.issues];
  if (result.scrollW > result.vw + 1) problems.unshift(`HORIZONTAL SCROLL scrollWidth=${result.scrollW} > ${result.vw}`);
  if (problems.length) {
    failures += 1;
    console.log(`✗ ${label}\n   ${problems.join('\n   ')}`);
  }
  return problems.length === 0;
}

for (const lang of LANGS) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: vp.width < 700, hasTouch: vp.width < 700 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript(([l]) => {
      localStorage.setItem('rdh.lang.v1', JSON.stringify(l));
      // Seed one order + a cart so every state (cart lines, checkout, orders, welcome back) is exercised.
      localStorage.setItem('rdh.session.v1', JSON.stringify({ orderType: 'takeaway', tableNumber: '', cart: [{ itemId: 'black-sesame-paste', quantity: 2 }, { itemId: 'steamed-egg-custard', quantity: 1 }, { itemId: 'chinese-tea', quantity: 3 }], wizard: { step: 0 }, planner: {} }));
      localStorage.setItem('rdh.customerId.v1', JSON.stringify('test-customer'));
      localStorage.setItem('rdh.orders.v1', JSON.stringify([{ orderId: 'RDH-250101-ABCD', customerId: 'test-customer', items: [{ itemId: 'black-sesame-paste', name: 'Black Sesame Paste', chineseName: '芝麻糊', quantity: 1, unitPrice: 750 }], total: 750, orderType: 'dine-in', tableNumber: 'A12', timestamp: '2025-01-01T10:00:00.000Z', status: 'received' }]));
    }, [lang]);
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`);
      await page.waitForSelector('main');
      await wait(120);
      if (process.env.BREAK) await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'width:600px;height:50px'; d.textContent = 'x'; document.querySelector('main').appendChild(d); });
      const ok = await audit(page, `[${lang}] ${vp.width}px ${route}`);
      if (SHOTS && lang === (process.env.SHOT_LANG || 'en')) {
        await page.screenshot({ path: `${SHOTS}/${vp.width}-${route.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true });
      }
    }
    // Language sheet open
    await page.goto(`${BASE}/`);
    await page.click('.lang-btn');
    await page.waitForSelector('.sheet');
    await audit(page, `[${lang}] ${vp.width}px language sheet`);
    if (SHOTS && lang === (process.env.SHOT_LANG || 'en')) await page.screenshot({ path: `${SHOTS}/${vp.width}-language-sheet.png` });

    // ---- Interactive flows (states a static page load never reaches) ----
    const flowLabel = `[${lang}] ${vp.width}px`;
    const expect = (cond, msg) => { if (!cond) { failures += 1; console.log(`✗ ${flowLabel} flow: ${msg}`); } };

    // Escape closes the language sheet and focus returns to its trigger.
    await page.keyboard.press('Escape');
    await wait(80);
    expect((await page.locator('.sheet').count()) === 0, 'Escape closes the language sheet');
    expect(await page.evaluate(() => document.activeElement?.classList.contains('lang-btn')), 'focus returns to the language button');

    // Every dish image must actually load once scrolled into view (lazy loading must not leave blanks).
    await page.goto(`${BASE}/menu`);
    await page.waitForSelector('.card');
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)); }
    });
    await wait(300);
    const broken = await page.evaluate(() => [...document.querySelectorAll('img.dish-image')].filter((i) => !(i.complete && i.naturalWidth > 0)).length);
    const total = await page.evaluate(() => document.querySelectorAll('img.dish-image').length);
    expect(broken === 0 && total > 0, `${broken}/${total} dish images failed to load`);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));


    // Checkout: validation errors, then a successful takeaway order → confirmation.
    await page.goto(`${BASE}/checkout`);
    await page.waitForSelector('.checkout__form');
    await page.click('.checkout__form button[type=submit]');
    await page.waitForSelector('.field.has-error');
    await audit(page, `${flowLabel} checkout errors`);
    await page.fill('#f-name', 'Mei');
    await page.fill('#f-phone', '012 345 6789');
    await page.click('.checkout__form button[type=submit]');
    await page.waitForSelector('.confirmation');
    await audit(page, `${flowLabel} confirmation`);
    expect(await page.locator('.facts__big').innerText().then((t) => /^RDH-\d{6}-/.test(t)), 'order number shown');

    // Wizard → results, then planner → results.
    await page.goto(`${BASE}/discover`);
    await page.waitForSelector('.option');
    for (let i = 0; i < 3; i++) { await page.locator('.option').first().click(); await wait(60); }
    await page.waitForSelector('.rec');
    await audit(page, `${flowLabel} wizard results`);
    await page.goto(`${BASE}/discover?mode=plan`);
    await page.waitForSelector('.option');
    await page.locator('.option-grid--4 .option').nth(2).click();
    await page.locator('.option-grid--5 .option').nth(2).click();
    await page.waitForSelector('.plan .totals');
    await audit(page, `${flowLabel} planner results`);

    // Empty search state.
    await page.goto(`${BASE}/menu`);
    await page.fill('.searchbox input', 'zzzz');
    await page.waitForSelector('.empty');
    await audit(page, `${flowLabel} empty search`);

    // Back restores the menu scroll position.
    await page.fill('.searchbox input', '');
    await page.waitForSelector('.card');
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
    await wait(150);
    const before = await page.evaluate(() => window.scrollY);
    await page.locator('.card__title a').nth(4).click();
    await page.waitForSelector('.product');
    await page.goBack();
    await page.waitForSelector('.card');
    await wait(200);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before) < 40, `scroll restored on Back (before=${Math.round(before)}, after=${Math.round(after)})`);
    if (errors.length) { failures += 1; console.log(`✗ [${lang}] ${vp.width}px console errors:\n   ${errors.join('\n   ')}`); }
    await ctx.close();
  }
}

await browser.close();
server.kill();
console.log(failures === 0 ? '\n✓ mobile layout checks passed' : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
