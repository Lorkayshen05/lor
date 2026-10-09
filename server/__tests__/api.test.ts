// @vitest-environment node
import { ConfigError, loadConfig } from '../config';
import { all, one } from '../db';
import { hashPassword, orderToken, RateLimiter, sanitizeError, verifyPassword } from '../lib/security';
import { createStaffUser, setStaffActive } from '../modules/auth';
import { ADMIN, api, fakeChannel, fakeLlm, makeDeps, manager, newKey, orderBody, SECRET, staff } from './helpers';

describe('public order API (in-process HTTP)', () => {
  it('POST /api/orders: 201 with order + token, then the SAME key replays as 200 with the same order', async () => {
    const email = fakeChannel('email');
    const { deps } = makeDeps({ channels: [email] });
    const { req } = api(deps);
    const key = newKey();
    const a = await req('POST', '/api/orders', { body: orderBody(), headers: { 'idempotency-key': key } });
    expect(a.status).toBe(201);
    expect(a.json).toMatchObject({ created: true, order: { orderId: 'RDH-250610-001', status: 'new', total: 1500 } });
    expect(a.json.trackingToken).toBe(orderToken(SECRET, 'RDH-250610-001'));

    const b = await req('POST', '/api/orders', { body: orderBody(), headers: { 'idempotency-key': key } });
    expect(b.status).toBe(200);
    expect(b.json).toMatchObject({ created: false, order: { orderId: 'RDH-250610-001' } });
    expect(one<{ n: number }>(deps.db, 'SELECT COUNT(*) AS n FROM orders')?.n).toBe(1);
  });

  it('a lost response is safe: the client can retry blindly and still ends up with exactly one order', async () => {
    const { deps } = makeDeps();
    const { req } = api(deps);
    const key = newKey();
    const results = await Promise.all([1, 2, 3, 4].map(() => req('POST', '/api/orders', { body: orderBody(), headers: { 'idempotency-key': key } })));
    expect(new Set(results.map((r) => r.json.order.orderId)).size).toBe(1);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(one<{ n: number }>(deps.db, 'SELECT COUNT(*) AS n FROM orders')?.n).toBe(1);
  });

  it('returns structured errors: 409 PRICE_CHANGED, 422 validation, 400 missing key, 413 oversize, bad JSON', async () => {
    const { req } = api(makeDeps().deps);
    expect(await req('POST', '/api/orders', { body: orderBody({ expectedTotal: 1 }), headers: { 'idempotency-key': newKey() } })).toMatchObject({ status: 409, json: { error: { code: 'PRICE_CHANGED', details: { currentTotal: 1500 } } } });
    expect(await req('POST', '/api/orders', { body: orderBody({ tableNumber: '' }), headers: { 'idempotency-key': newKey() } })).toMatchObject({ status: 422, json: { error: { code: 'VALIDATION_FAILED' } } });
    expect(await req('POST', '/api/orders', { body: orderBody() })).toMatchObject({ status: 400, json: { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } } });
    expect((await req('POST', '/api/orders', { body: { items: 'x'.repeat(20_000) }, headers: { 'idempotency-key': newKey() } })).status).toBe(413);
    const bad = await api(makeDeps().deps).app.request('/api/orders', { method: 'POST', headers: { 'idempotency-key': newKey(), 'content-type': 'application/json' }, body: '{not json' });
    expect(bad.status).toBe(422);
  });

  it('rate-limits order spam per client', async () => {
    const { req } = api(makeDeps().deps);
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await req('POST', '/api/orders', { body: orderBody(), headers: { 'idempotency-key': newKey() } })).status);
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('GET /api/orders/:id/status needs the token; the response never exposes contact details', async () => {
    const { deps } = makeDeps();
    const { req } = api(deps);
    const o = await req('POST', '/api/orders', { body: orderBody({ orderType: 'takeaway', tableNumber: undefined, contact: { name: 'Mei', phone: '0123456789' }, pickupInMinutes: 0 }), headers: { 'idempotency-key': newKey() } });
    const id = o.json.order.orderId;
    expect((await req('GET', `/api/orders/${id}/status`)).status).toBe(404);
    expect((await req('GET', `/api/orders/${id}/status`, { headers: { 'x-order-token': 'nope' } })).status).toBe(404);
    const ok = await req('GET', `/api/orders/${id}/status`, { headers: { 'x-order-token': o.json.trackingToken } });
    expect(ok.status).toBe(200);
    expect(ok.json.order.status).toBe('new');
    expect(JSON.stringify(ok.json)).not.toMatch(/Mei|0123456789|phone/);
    expect(ok.headers.get('cache-control')).toBe('no-store');
  });

  it('the customer sees status changes staff make', async () => {
    const { deps } = makeDeps();
    staff(deps);
    const { req, signIn } = api(deps);
    const o = await req('POST', '/api/orders', { body: orderBody(), headers: { 'idempotency-key': newKey() } });
    const { cookie } = await signIn('amy');
    await req('POST', `/api/admin/orders/${o.json.order.orderId}/status`, { body: { to: 'confirmed' }, cookie, headers: ADMIN });
    const s = await req('GET', `/api/orders/${o.json.order.orderId}/status`, { headers: { 'x-order-token': o.json.trackingToken } });
    expect(s.json.order.status).toBe('confirmed');
  });

  it('GET /api/menu serves server prices/availability; /api/health reports readiness honestly', async () => {
    const { req } = api(makeDeps().deps);
    const menu = await req('GET', '/api/menu');
    expect(menu.json.isSample).toBe(true);
    expect(menu.json.menu.find((m: { id: string }) => m.id === 'black-sesame-paste').dineInPrice).toBe(750);
    expect((await req('GET', '/api/health')).json).toMatchObject({ ok: true, menuIsSample: true, orderingOpen: true, aiGuide: false });
    const prod = await api(makeDeps({ env: { NODE_ENV: 'production' } }).deps).req('GET', '/api/health');
    expect(prod.json.orderingOpen).toBe(false);
  });

  it('sets security headers and never caches API responses', async () => {
    const res = await api(makeDeps().deps).req('GET', '/api/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('unknown API routes are JSON 404s', async () => {
    const { req } = api(makeDeps().deps);
    expect(await req('GET', '/api/nope')).toMatchObject({ status: 404, json: { error: { code: 'NOT_FOUND' } } });
  });
});

describe('POST /api/guide', () => {
  const body = (over: object = {}) => ({ language: 'en', context: { orderType: 'dine-in', orderedItemIds: [], cartItemIds: [] }, ...over });

  it('answers intents from rules without any AI', async () => {
    const llm = fakeLlm();
    const { req } = api(makeDeps({ llm }).deps);
    const r = await req('POST', '/api/guide', { body: body({ intent: { type: 'budget', amount: 1000 } }) });
    expect(r.status).toBe(200);
    expect(r.json.answer).toMatchObject({ source: 'rules', intent: 'budget' });
    expect(llm.calls).toHaveLength(0);
  });

  it('only unclassifiable free text reaches the AI, and a validated AI answer is used', async () => {
    const llm = fakeLlm({ answer: 'Peanut Paste is thick and nutty.', itemIds: ['peanut-paste'], needsStaff: false });
    const { req } = api(makeDeps({ llm }).deps);
    const known = await req('POST', '/api/guide', { body: body({ message: 'which dessert has sesame' }) });
    expect(known.json.answer.source).toBe('rules');
    expect(llm.calls).toHaveLength(0);
    const free = await req('POST', '/api/guide', { body: body({ message: 'which one feels the most comforting on a rainy day?' }) });
    expect(free.json.answer).toMatchObject({ source: 'ai', aiText: 'Peanut Paste is thick and nutty.', items: [{ itemId: 'peanut-paste' }] });
    expect(llm.calls).toHaveLength(1);
  });

  it('an AI answer that fails validation silently falls back to the rules answer', async () => {
    const llm = fakeLlm({ answer: 'Our best seller is Peanut Paste.', itemIds: ['peanut-paste'], needsStaff: false });
    const { req } = api(makeDeps({ llm }).deps);
    const r = await req('POST', '/api/guide', { body: body({ message: 'comforting on a rainy day?' }) });
    expect(r.json.answer).toMatchObject({ source: 'rules', intent: 'unknown' });
    expect(JSON.stringify(r.json)).not.toMatch(/best seller/i);
  });

  it('allergy questions NEVER go to the AI', async () => {
    const llm = fakeLlm({ answer: 'Yes it is safe.', itemIds: [], needsStaff: false });
    const { req } = api(makeDeps({ llm }).deps);
    const r = await req('POST', '/api/guide', { body: body({ message: 'is it safe if I have a nut allergy?' }) });
    expect(r.json.answer).toMatchObject({ intent: 'allergy', source: 'rules' });
    expect(llm.calls).toHaveLength(0);
  });

  it('validates input and caps AI calls separately from rule answers', async () => {
    const llm = fakeLlm({ answer: 'ok', itemIds: [], needsStaff: false });
    const { req } = api(makeDeps({ llm }).deps);
    expect((await req('POST', '/api/guide', { body: { message: 'hi' } })).status).toBe(422);
    expect((await req('POST', '/api/guide', { body: body({ message: 'x'.repeat(301) }) })).status).toBe(422);
    for (let i = 0; i < 12; i++) await req('POST', '/api/guide', { body: body({ message: `rainy day question ${i}` }) });
    expect(llm.calls.length).toBe(8); // capped; the rest were answered by rules
  });
});

describe('staff authentication & permissions', () => {
  const setup = () => {
    const h = makeDeps({ channels: [fakeChannel('email')] });
    staff(h.deps, 'amy');
    manager(h.deps, 'boss');
    return { ...h, ...api(h.deps) };
  };

  it('every admin endpoint requires sign-in', async () => {
    const { req } = setup();
    const paths: [string, string][] = [['GET', '/api/admin/me'], ['GET', '/api/admin/orders'], ['GET', '/api/admin/summary'], ['GET', '/api/admin/automation/runs'], ['GET', '/api/admin/notifications'], ['GET', '/api/admin/integrations'], ['GET', '/api/admin/reports'], ['GET', '/api/admin/approvals'], ['POST', '/api/admin/reports'], ['POST', '/api/admin/orders/RDH-1/status'], ['POST', '/api/admin/integrations/email/test'], ['POST', '/api/admin/menu/soy-milk/availability']];
    for (const [m, p] of paths) expect((await req(m, p, { headers: ADMIN, body: m === 'GET' ? undefined : {} })).status, `${m} ${p}`).toBe(401);
  });

  it('login sets an HttpOnly SameSite=Strict cookie; wrong password and unknown user get the same answer', async () => {
    const { app, req } = setup();
    const res = await app.request('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', ...ADMIN }, body: JSON.stringify({ username: 'amy', password: 'correct-horse-battery' }) });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(/rdh_staff=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(JSON.stringify(await res.json())).not.toMatch(/password|hash/i);
    const wrong = await req('POST', '/api/admin/login', { body: { username: 'amy', password: 'wrong-password-123' }, headers: ADMIN });
    const ghost = await req('POST', '/api/admin/login', { body: { username: 'nobody', password: 'wrong-password-123' }, headers: ADMIN });
    expect(wrong.status).toBe(401);
    expect(wrong.json).toEqual(ghost.json);
  });

  it('locks out brute force after repeated failures for that account', async () => {
    const { req } = setup();
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await req('POST', '/api/admin/login', { body: { username: 'amy', password: `bad-password-${i}-xx` }, headers: ADMIN })).status);
    expect(codes).toEqual([401, 401, 401, 401, 401, 429, 429]);
    expect((await req('POST', '/api/admin/login', { body: { username: 'amy', password: 'correct-horse-battery' }, headers: ADMIN })).status).toBe(429);
  });

  it('staff can run orders but NOT manager-only actions (approvals, integration tests, availability)', async () => {
    const { req, signIn, deps } = setup();
    const o = await req('POST', '/api/orders', { body: orderBody(), headers: { 'idempotency-key': newKey() } });
    const id = o.json.order.orderId;
    const amy = await signIn('amy');
    expect((await req('POST', `/api/admin/orders/${id}/status`, { body: { to: 'confirmed' }, cookie: amy.cookie, headers: ADMIN })).status).toBe(200);
    expect((await req('POST', `/api/admin/orders/${id}/status`, { body: { to: 'cancelled', note: 'x y z' }, cookie: amy.cookie, headers: ADMIN })).json.error.code).toBe('APPROVAL_REQUIRED');
    const reqd = await req('POST', `/api/admin/orders/${id}/cancel-request`, { body: { reason: 'Customer asked' }, cookie: amy.cookie, headers: ADMIN });
    expect(reqd.status).toBe(201);
    const aprId = reqd.json.approvalId;
    const attempts: [string, string, object][] = [['POST', `/api/admin/approvals/${aprId}/decision`, { approve: true }], ['POST', '/api/admin/integrations/email/test', {}], ['POST', '/api/admin/menu/soy-milk/availability', { available: false }]];
    for (const [m, p, b] of attempts) expect((await req(m, p, { body: b, cookie: amy.cookie, headers: ADMIN })).status, p).toBe(403);
    expect(one<{ status: string }>(deps.db, 'SELECT status FROM orders')?.status).toBe('confirmed');

    const boss = await signIn('boss');
    expect((await req('POST', `/api/admin/approvals/${aprId}/decision`, { body: { approve: true }, cookie: boss.cookie, headers: ADMIN })).json.order.status).toBe('cancelled');
    expect((await req('POST', '/api/admin/menu/soy-milk/availability', { body: { available: false }, cookie: boss.cookie, headers: ADMIN })).status).toBe(200);
    expect((await req('GET', '/api/menu')).json.menu.find((m: { id: string }) => m.id === 'soy-milk').available).toBe(false);
  });

  it('CSRF: state-changing admin requests need the custom header and a same-origin Origin', async () => {
    const { req, signIn } = setup();
    const { cookie } = await signIn('amy');
    expect((await req('POST', '/api/admin/logout', { cookie })).status).toBe(403);
    expect((await req('POST', '/api/admin/logout', { cookie, headers: { ...ADMIN, origin: 'https://evil.example', host: 'ruby.example' } })).status).toBe(403);
    expect((await req('POST', '/api/admin/logout', { cookie, headers: { ...ADMIN, origin: 'https://ruby.example', host: 'ruby.example' } })).status).toBe(200);
  });

  it('CSRF: X-Forwarded-Host is ignored unless a trusted proxy is declared', async () => {
    const plain = makeDeps();
    staff(plain.deps);
    const a = api(plain.deps);
    const { cookie } = await a.signIn('amy');
    const spoof = { ...ADMIN, origin: 'https://evil.example', host: 'ruby.example', 'x-forwarded-host': 'evil.example' };
    expect((await a.req('POST', '/api/admin/logout', { cookie, headers: spoof })).status).toBe(403);
    const proxied = makeDeps({ env: { TRUST_PROXY: 'true' } });
    staff(proxied.deps);
    const b = api(proxied.deps);
    const s2 = await b.signIn('amy');
    expect((await b.req('POST', '/api/admin/logout', { cookie: s2.cookie, headers: { ...ADMIN, origin: 'https://ruby.example', host: 'internal:8787', 'x-forwarded-host': 'ruby.example' } })).status).toBe(200);
  });

  it('logout invalidates the session; disabling a user kills their sessions; expired sessions are refused', async () => {
    const { req, signIn, deps, advance } = setup();
    const a = await signIn('amy');
    expect((await req('GET', '/api/admin/me', { cookie: a.cookie })).json.user).toMatchObject({ username: 'amy', role: 'staff' });
    await req('POST', '/api/admin/logout', { cookie: a.cookie, headers: ADMIN });
    expect((await req('GET', '/api/admin/me', { cookie: a.cookie })).status).toBe(401);

    const b = await signIn('amy');
    setStaffActive(deps, 'amy', false);
    expect((await req('GET', '/api/admin/me', { cookie: b.cookie })).status).toBe(401);
    expect((await signIn('amy')).status).toBe(401);
    setStaffActive(deps, 'amy', true);

    const c = await signIn('amy');
    advance(13 * 3_600_000);
    expect((await req('GET', '/api/admin/me', { cookie: c.cookie })).status).toBe(401);
  });

  it('stored credentials: passwords are salted scrypt hashes; session tokens are stored only as hashes', async () => {
    const { deps, signIn } = setup();
    const row = one<{ password_hash: string }>(deps.db, "SELECT password_hash FROM staff_users WHERE username = 'amy'")!;
    expect(row.password_hash).toMatch(/^scrypt\$/);
    expect(row.password_hash).not.toContain('correct-horse-battery');
    const { cookie } = await signIn('amy');
    const token = cookie.split('=')[1]!;
    expect(JSON.stringify(all(deps.db, 'SELECT * FROM sessions'))).not.toContain(token);
    expect(hashPassword('x'.repeat(12))).not.toBe(hashPassword('x'.repeat(12)));
    expect(verifyPassword('right-password', hashPassword('right-password'))).toBe(true);
    expect(verifyPassword('wrong-password', hashPassword('right-password'))).toBe(false);
  });

  it('account creation enforces a strong password and a valid username/role', () => {
    const { deps } = setup();
    expect(() => createStaffUser(deps, { username: 'new1', password: 'short', role: 'staff' })).toThrow(/at least 12/);
    expect(() => createStaffUser(deps, { username: 'a b', password: 'long-enough-pass', role: 'staff' })).toThrow(/Username/);
    expect(() => createStaffUser(deps, { username: 'amy', password: 'long-enough-pass', role: 'staff' })).toThrow(/exists/);
    expect(() => createStaffUser(deps, { username: 'new2', password: 'long-enough-pass', role: 'owner' as never })).toThrow(/Role/);
  });

  it('there is no endpoint for refunds, payments, price changes, discounts or policies (Level C stays human-only)', () => {
    const { app } = setup();
    const routes = (app as unknown as { routes: { path: string; method: string }[] }).routes.map((r) => r.path.toLowerCase());
    expect(routes.length).toBeGreaterThan(15);
    expect(routes.filter((p) => /refund|payment|price|discount|policy|compensat|voucher/.test(p))).toEqual([]);
  });
});

describe('dashboard data endpoints', () => {
  it('summary, orders list, runs, notifications and integrations reflect reality', async () => {
    const email = fakeChannel('email');
    email.failures = Infinity;
    const h = makeDeps({ channels: [email] });
    manager(h.deps);
    const { req, signIn } = api(h.deps);
    await req('POST', '/api/orders', { body: orderBody(), headers: { 'idempotency-key': newKey() } });
    const { processDue } = await import('../modules/notifications/dispatcher');
    await processDue(h.deps);
    const { cookie } = await signIn('boss');

    const sum = (await req('GET', '/api/admin/summary', { cookie })).json;
    expect(sum).toMatchObject({ newOrders: 1, activeOrders: 1, pendingNotifications: 1, failedNotifications: 0, pendingApprovals: 0, failedRuns: 1 });

    const orders = (await req('GET', '/api/admin/orders?active=1', { cookie })).json.orders;
    expect(orders[0]).toMatchObject({ orderId: 'RDH-250610-001', status: 'new', notifications: [{ channel: 'email', status: 'pending', attempts: 1, lastError: 'provider unavailable' }] });

    const failed = (await req('GET', '/api/admin/automation/runs?outcome=failed', { cookie })).json;
    expect(failed.runs[0]).toMatchObject({ automation: 'notify_email', level: 'B', outcome: 'failed', error: 'provider unavailable' });
    expect(failed.catalogue.map((a: { level: string }) => a.level)).toEqual(expect.arrayContaining(['A', 'B', 'C']));

    const ntf = (await req('GET', '/api/admin/notifications', { cookie })).json.notifications[0];
    email.failures = 0;
    expect((await req('POST', `/api/admin/notifications/${ntf.id}/retry`, { cookie, headers: ADMIN })).json.result).toBe('sent');
    expect((await req('POST', `/api/admin/notifications/${ntf.id}/retry`, { cookie, headers: ADMIN })).status).toBe(409);

    const integ = (await req('GET', '/api/admin/integrations', { cookie })).json.integrations;
    expect(integ.find((i: { id: string }) => i.id === 'email').state).toBe('configured_untested');
  });

  it('report endpoints create, list and fetch reports; validate input', async () => {
    const h = makeDeps();
    staff(h.deps);
    const { req, signIn } = api(h.deps);
    const { cookie } = await signIn('amy');
    await req('POST', '/api/orders', { body: orderBody(), headers: { 'idempotency-key': newKey() } });
    const made = await req('POST', '/api/admin/reports', { body: { period: 'day', date: '2025-06-10' }, cookie, headers: ADMIN });
    expect(made.status).toBe(201);
    expect(made.json.report.data.totals).toMatchObject({ orders: 1, grossSales: 1500 });
    expect((await req('GET', '/api/admin/reports', { cookie })).json.reports).toHaveLength(1);
    expect((await req('GET', `/api/admin/reports/${made.json.report.id}`, { cookie })).json.report.summary.statements.length).toBeGreaterThan(0);
    expect((await req('POST', '/api/admin/reports', { body: { period: 'year' }, cookie, headers: ADMIN })).status).toBe(422);
    expect((await req('POST', '/api/admin/reports', { body: { period: 'day', date: '2025-13-45' }, cookie, headers: ADMIN })).status).toBe(422);
    expect((await req('GET', '/api/admin/orders?date=bad', { cookie })).status).toBe(422);
    expect((await req('GET', '/api/admin/orders?status=bogus', { cookie })).status).toBe(422);
  });
});

describe('configuration & security helpers', () => {
  it('production requires a strong ORDER_TOKEN_SECRET', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(ConfigError);
    expect(() => loadConfig({ NODE_ENV: 'production', ORDER_TOKEN_SECRET: 'short' })).toThrow(/32/);
    expect(loadConfig({ NODE_ENV: 'production', ORDER_TOKEN_SECRET: SECRET }).isProd).toBe(true);
  });
  it('rejects malformed values and treats empty strings as unset', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError);
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(ConfigError);
    const c = loadConfig({ NODE_ENV: 'test', SMTP_HOST: '', EMAIL_FROM: '', STAFF_EMAIL_TO: '' });
    expect(c.smtp).toBeNull();
    expect(c.ai).toMatchObject({ enabled: false, model: 'claude-opus-5-5' });
    expect(loadConfig({ NODE_ENV: 'test', ANTHROPIC_API_KEY: 'sk-ant-test-123456', AI_MODEL: 'claude-haiku-5-5' }).ai).toMatchObject({ enabled: true, model: 'claude-haiku-5-5' });
    expect(loadConfig({ NODE_ENV: 'test', ANTHROPIC_API_KEY: 'sk-ant-test-123456', AI_ENABLED: 'false' }).ai.enabled).toBe(false);
  });
  it('collects configured secrets so they can be scrubbed from logs', () => {
    const c = loadConfig({ NODE_ENV: 'test', ANTHROPIC_API_KEY: 'sk-ant-test-123456', SMTP_PASS: 'hunter2hunter2' });
    expect(c.secrets).toEqual(expect.arrayContaining(['sk-ant-test-123456', 'hunter2hunter2']));
    expect(sanitizeError(new Error('bad key sk-ant-test-123456 for hunter2hunter2'), c.secrets)).toBe('bad key [redacted] for [redacted]');
  });
  it('rate limiter windows reset', () => {
    const l = new RateLimiter();
    expect([1, 2, 3, 4].map(() => l.check('k', 3, 1000, 0).allowed)).toEqual([true, true, true, false]);
    expect(l.check('k', 3, 1000, 1001).allowed).toBe(true);
    expect(l.check('other', 3, 1000, 0).allowed).toBe(true);
  });
  it('migrations are idempotent and tracked', async () => {
    const { migrate } = await import('../db');
    const { deps } = makeDeps();
    expect(migrate(deps.db)).toEqual([]);
    expect(all<{ id: number }>(deps.db, 'SELECT id FROM schema_migrations')).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
