// @vitest-environment node
import { createHmac } from 'node:crypto';
import { loadConfig } from '../config';
import { all, one } from '../db';
import { listRuns } from '../modules/automation';
import { createChannels } from '../modules/notifications/channels';
import { getIntegrationStatuses, processDue, retryNotification, testChannel } from '../modules/notifications/dispatcher';
import { createOrder, listOrders } from '../modules/orders';
import { fakeChannel, makeDeps, newKey, orderBody, SECRET } from './helpers';
import { tick } from '../worker';

const notifs = (deps: ReturnType<typeof makeDeps>['deps']) =>
  all<{ channel: string; status: string; attempts: number; last_error: string | null; order_id: string }>(deps.db, 'SELECT channel, status, attempts, last_error, order_id FROM notifications ORDER BY created_at, channel');

describe('outbox: staff notifications', () => {
  it('queues a notification only for channels that are actually configured', () => {
    const email = fakeChannel('email');
    const wa = fakeChannel('whatsapp', false); // not configured
    const { deps } = makeDeps({ channels: [email, wa, fakeChannel('kds')] });
    createOrder(deps, orderBody(), newKey());
    expect(notifs(deps).map((n) => n.channel).sort()).toEqual(['email', 'kds']);
  });

  it('with NO integrations configured nothing is queued and nothing claims to have been sent', async () => {
    const { deps } = makeDeps({ channels: [fakeChannel('email', false), fakeChannel('whatsapp', false)] });
    createOrder(deps, orderBody(), newKey());
    expect(notifs(deps)).toEqual([]);
    expect(await processDue(deps)).toEqual({ sent: 0, failed: 0, retrying: 0 });
    expect(listRuns(deps).filter((r) => r.automation.startsWith('notify_'))).toEqual([]);
  });

  it('delivers once and records success', async () => {
    const email = fakeChannel('email');
    const { deps } = makeDeps({ channels: [email] });
    const r = createOrder(deps, orderBody({ orderType: 'takeaway', contact: { name: 'Mei', phone: '0123456789' }, pickupInMinutes: 15 }), newKey());
    expect(await processDue(deps)).toEqual({ sent: 1, failed: 0, retrying: 0 });
    expect(await processDue(deps)).toEqual({ sent: 0, failed: 0, retrying: 0 }); // not sent twice
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]!.subject).toContain(r.order.orderId);
    expect(email.sent[0]!.text).toContain('2 × Black Sesame Paste');
    expect(email.sent[0]!.text).toContain('Name: Mei');
    expect(notifs(deps)[0]).toMatchObject({ status: 'sent', attempts: 1, last_error: null });
    expect(listRuns(deps)[0]).toMatchObject({ automation: 'notify_email', level: 'B', outcome: 'ok' });
  });

  it('a failed notification NEVER loses or duplicates the order; it backs off and retries', async () => {
    const email = fakeChannel('email');
    email.failures = 2;
    const { deps, advance } = makeDeps({ channels: [email] });
    const r = createOrder(deps, orderBody(), newKey());

    expect(await processDue(deps)).toEqual({ sent: 0, failed: 0, retrying: 1 });
    expect(notifs(deps)[0]).toMatchObject({ status: 'pending', attempts: 1, last_error: 'provider unavailable' });
    expect(listOrders(deps)).toHaveLength(1); // order intact

    expect(await processDue(deps)).toEqual({ sent: 0, failed: 0, retrying: 0 }); // backoff: not due yet
    advance(31_000);
    expect(await processDue(deps)).toEqual({ sent: 0, failed: 0, retrying: 1 }); // second failure
    advance(30_000);
    expect(await processDue(deps)).toEqual({ sent: 0, failed: 0, retrying: 0 }); // backoff doubled to 60s
    advance(31_000);
    expect(await processDue(deps)).toEqual({ sent: 1, failed: 0, retrying: 0 }); // third attempt succeeds

    expect(notifs(deps)[0]).toMatchObject({ status: 'sent', attempts: 3, last_error: null });
    expect(email.sent).toHaveLength(1);
    expect(one<{ n: number }>(deps.db, 'SELECT COUNT(*) AS n FROM orders')?.n).toBe(1);
    expect(listOrders(deps)[0]!.orderId).toBe(r.order.orderId);
    const outcomes = listRuns(deps).filter((x) => x.automation === 'notify_email').map((x) => x.outcome).reverse();
    expect(outcomes).toEqual(['failed', 'failed', 'ok']);
  });

  it('gives up after the maximum attempts, marks it failed, and allows a manual retry that reuses the same row', async () => {
    const email = fakeChannel('email');
    email.failures = Infinity;
    const { deps, advance } = makeDeps({ channels: [email], env: { NOTIFY_MAX_ATTEMPTS: '3' } });
    createOrder(deps, orderBody(), newKey());
    for (let i = 0; i < 3; i++) {
      await processDue(deps);
      advance(16 * 60_000);
    }
    expect(notifs(deps)[0]).toMatchObject({ status: 'failed', attempts: 3 });
    expect(await processDue(deps)).toEqual({ sent: 0, failed: 0, retrying: 0 }); // failed rows are not retried automatically

    const id = one<{ id: string }>(deps.db, 'SELECT id FROM notifications')!.id;
    expect(await retryNotification(deps, id, 'amy')).toBe('retrying'); // still down
    email.failures = 0;
    expect(await retryNotification(deps, id, 'amy')).toBe('sent');
    expect(notifs(deps)).toHaveLength(1); // same row, no duplicate notification
    expect(one<{ n: number }>(deps.db, 'SELECT COUNT(*) AS n FROM orders')?.n).toBe(1); // no duplicate order
    expect(await retryNotification(deps, id, 'amy')).toBe('not_retryable'); // already delivered
    expect(await retryNotification(deps, 'ntf_nope', 'amy')).toBe('not_found');
  });

  it('a double-clicked manual retry sends once, not twice', async () => {
    const email = fakeChannel('email');
    email.failures = 1;
    const { deps } = makeDeps({ channels: [email], env: { NOTIFY_MAX_ATTEMPTS: '1' } });
    createOrder(deps, orderBody(), newKey());
    await processDue(deps); // fails → 'failed'
    const id = one<{ id: string }>(deps.db, 'SELECT id FROM notifications')!.id;
    const [a, b] = await Promise.all([retryNotification(deps, id, 'amy'), retryNotification(deps, id, 'amy')]);
    expect([a, b].sort()).toEqual(['sent', 'skipped']);
    expect(email.sent).toHaveLength(1);
  });

  it('one channel failing does not block the others', async () => {
    const email = fakeChannel('email');
    email.failures = Infinity;
    const kds = fakeChannel('kds');
    const { deps } = makeDeps({ channels: [email, kds] });
    createOrder(deps, orderBody(), newKey());
    expect(await processDue(deps)).toEqual({ sent: 1, failed: 0, retrying: 1 });
    expect(kds.sent).toHaveLength(1);
  });

  it('KDS payload carries the order but never customer contact details', async () => {
    const kds = fakeChannel('kds');
    const { deps } = makeDeps({ channels: [kds] });
    createOrder(deps, orderBody({ orderType: 'takeaway', contact: { name: 'Mei Tan', phone: '0123456789' }, pickupInMinutes: 30 }), newKey());
    await processDue(deps);
    const payload = JSON.stringify(kds.sent[0]!.kds);
    expect(payload).toContain('Black Sesame Paste');
    expect(payload).not.toMatch(/Mei|0123456789/);
    expect(JSON.stringify(kds.sent[0]!.whatsappParams)).not.toMatch(/Mei|0123456789/);
  });

  it('error details are sanitised: secrets, tokens and phone numbers never reach the log or the database', async () => {
    const email = fakeChannel('email');
    email.failures = 1;
    email.error = `auth failed for key ${SECRET} Bearer abc.def-123456 sent to +60123456789 token ${'a'.repeat(40)}`;
    const { deps } = makeDeps({ channels: [email] });
    createOrder(deps, orderBody(), newKey());
    await processDue(deps);
    const stored = JSON.stringify([notifs(deps), listRuns(deps)]);
    expect(stored).not.toContain(SECRET);
    expect(stored).not.toMatch(/abc\.def-123456|\+60123456789|a{40}/);
    expect(notifs(deps)[0]!.last_error).toContain('[redacted]');
  });

  it('if the channel was un-configured after queueing, delivery fails honestly instead of pretending', async () => {
    const email = fakeChannel('email');
    const { deps, advance } = makeDeps({ channels: [email], env: { NOTIFY_MAX_ATTEMPTS: '1' } });
    createOrder(deps, orderBody(), newKey());
    email.configured = false;
    advance(1000);
    expect(await processDue(deps)).toEqual({ sent: 0, failed: 1, retrying: 0 });
    expect(email.sent).toHaveLength(0);
    expect(notifs(deps)[0]).toMatchObject({ status: 'failed', last_error: 'Channel is no longer configured' });
  });

  it('two workers cannot both send the same notification (leased claim)', async () => {
    const email = fakeChannel('email');
    const { deps } = makeDeps({ channels: [email] });
    createOrder(deps, orderBody(), newKey());
    await Promise.all([processDue(deps), processDue(deps)]);
    expect(email.sent).toHaveLength(1);
  });
});

describe('integration status never over-claims', () => {
  const status = (deps: Parameters<typeof getIntegrationStatuses>[0], id: string) => getIntegrationStatuses(deps).find((i) => i.id === id)!;

  it('not configured → configured but UNTESTED → connected only after a real successful test', async () => {
    const email = fakeChannel('email', false);
    const { deps } = makeDeps({ channels: [email] });
    expect(status(deps, 'email').state).toBe('not_configured');
    expect(status(deps, 'dashboard').state).toBe('always_on');
    expect(await testChannel(deps, 'email', 'boss')).toEqual({ ok: false, error: 'Not configured' });
    expect(email.sent).toHaveLength(0);

    email.configured = true;
    expect(status(deps, 'email').state).toBe('configured_untested'); // configured is NOT connected
    email.failures = 1;
    expect((await testChannel(deps, 'email', 'boss')).ok).toBe(false);
    expect(status(deps, 'email')).toMatchObject({ state: 'failing', lastError: 'provider unavailable' });
    expect((await testChannel(deps, 'email', 'boss')).ok).toBe(true);
    expect(status(deps, 'email').state).toBe('connected');
    expect(email.sent[0]!.kind).toBe('test');
  });

  it('a real delivery failure after a good test downgrades "connected" to "failing"', async () => {
    const email = fakeChannel('email');
    const { deps } = makeDeps({ channels: [email] });
    await testChannel(deps, 'email', 'boss');
    expect(status(deps, 'email').state).toBe('connected');
    email.failures = 1;
    createOrder(deps, orderBody(), newKey());
    await processDue(deps);
    expect(status(deps, 'email').state).toBe('failing');
  });

  it('AI shows as not configured without a key', () => {
    const { deps } = makeDeps();
    expect(status(deps, 'ai').state).toBe('not_configured');
  });
});

describe('worker tick: scheduled jobs', () => {
  it('creates yesterday\'s report once the configured hour has passed, and only once', async () => {
    const { deps, advance } = makeDeps({ now: '2025-06-10T04:00:00Z', env: { REPORT_HOUR: '8' } }); // 12:00 KL
    createOrder(deps, orderBody(), newKey());
    advance(24 * 3_600_000); // 11 June 12:00 KL; yesterday = 10 June
    await tick(deps);
    await tick(deps);
    const rows = all<{ range_start: string; generated_by: string }>(deps.db, 'SELECT range_start, generated_by FROM reports');
    expect(rows).toEqual([{ range_start: '2025-06-10', generated_by: 'scheduler' }]);
  });

  it('does not run the daily report before the configured hour', async () => {
    const { deps } = makeDeps({ now: '2025-06-10T20:00:00Z', env: { REPORT_HOUR: '8' } }); // 04:00 KL next day
    await tick(deps);
    expect(one(deps.db, 'SELECT 1 AS x FROM reports')).toBeUndefined();
  });

  it('emails the daily report only when email is configured AND report emailing is enabled', async () => {
    const email = fakeChannel('email');
    const on = makeDeps({ channels: [email], env: { REPORT_DAILY_EMAIL: 'true', REPORT_HOUR: '0' } });
    await tick(on.deps);
    expect(email.sent.map((m) => m.kind)).toEqual(['report']);

    const off = makeDeps({ channels: [fakeChannel('email', false)], env: { REPORT_DAILY_EMAIL: 'true', REPORT_HOUR: '0' } });
    await tick(off.deps);
    expect(one(off.deps.db, 'SELECT 1 AS x FROM notifications')).toBeUndefined();
    expect(one(off.deps.db, 'SELECT 1 AS x FROM reports')).toBeDefined(); // still drafted (Level A)
  });
});

describe('channels: real request shapes (against fake providers — NOT live services)', () => {
  const cfg = (env: Record<string, string>) => loadConfig({ NODE_ENV: 'test', ORDER_TOKEN_SECRET: SECRET, ...env });
  const msg = { id: 'ntf_1', kind: 'order_created' as const, subject: 'S', text: 'T', whatsappParams: ['RDH-1', 'summary', 'RM 15.00'] as [string, string, string], kds: { orderId: 'RDH-1' } };

  it('WhatsApp: posts an approved-template message to the Cloud API with a bearer token', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const [, wa] = createChannels(cfg({ WHATSAPP_ACCESS_TOKEN: 'tok_secret_value', WHATSAPP_PHONE_NUMBER_ID: '12345', WHATSAPP_STAFF_TO: '+60 12-345 6789', WHATSAPP_TEMPLATE_NAME: 'new_order', WHATSAPP_API_VERSION: 'v99.0' }), { fetch: fetchFake });
    expect(wa!.isConfigured()).toBe(true);
    await wa!.send(msg);
    expect(calls[0]!.url).toBe('https://graph.facebook.com/v99.0/12345/messages');
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer tok_secret_value');
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '60123456789', type: 'template', template: { name: 'new_order', language: { code: 'en' } } });
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual(['RDH-1', 'summary', 'RM 15.00']);
  });

  it('WhatsApp: a non-2xx response is a failure, never a silent success', async () => {
    const fetchFake = (async () => new Response('{"error":{"message":"Invalid token"}}', { status: 401 })) as unknown as typeof fetch;
    const [, wa] = createChannels(cfg({ WHATSAPP_ACCESS_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: '1', WHATSAPP_STAFF_TO: '60123', WHATSAPP_TEMPLATE_NAME: 't' }), { fetch: fetchFake });
    await expect(wa!.send(msg)).rejects.toThrow(/401.*Invalid token/);
  });

  it('WhatsApp: network failure and timeout reject', async () => {
    const down = (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
    const [, wa] = createChannels(cfg({ WHATSAPP_ACCESS_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: '1', WHATSAPP_STAFF_TO: '60123', WHATSAPP_TEMPLATE_NAME: 't' }), { fetch: down });
    await expect(wa!.send(msg)).rejects.toThrow('fetch failed');
    const slow = ((_: string, init: RequestInit) => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('timed out'))))) as unknown as typeof fetch;
    const [, wa2] = createChannels(cfg({ WHATSAPP_ACCESS_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: '1', WHATSAPP_STAFF_TO: '60123', WHATSAPP_TEMPLATE_NAME: 't' }), { fetch: slow, timeoutMs: 20 });
    await expect(wa2!.send(msg)).rejects.toThrow(/timed out/);
  });

  it('KDS webhook: signs the exact body with HMAC-SHA256 and sends a stable event id for de-duplication', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFake = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('ok'); }) as unknown as typeof fetch;
    const [, , kds] = createChannels(cfg({ KDS_WEBHOOK_URL: 'https://kds.example/hook', KDS_WEBHOOK_SECRET: 'whsec_123456' }), { fetch: fetchFake });
    await kds!.send(msg);
    const { init, url } = calls[0]!;
    const h = init.headers as Record<string, string>;
    expect(url).toBe('https://kds.example/hook');
    expect(h['X-Ruby-Signature']).toBe(`sha256=${createHmac('sha256', 'whsec_123456').update(init.body as string).digest('hex')}`);
    expect(h['X-Ruby-Event-Id']).toBe('ntf_1');
    expect(JSON.parse(init.body as string)).toEqual({ event: 'order.created', id: 'ntf_1', data: { orderId: 'RDH-1' } });
  });

  it('Email: sends through the SMTP transport with the configured from/to', async () => {
    const sent: unknown[] = [];
    const [email] = createChannels(cfg({ SMTP_HOST: 'smtp.example', EMAIL_FROM: 'orders@ruby.example', STAFF_EMAIL_TO: 'staff@ruby.example' }), { mailTransport: () => ({ sendMail: async (o) => void sent.push(o) }) });
    await email!.send(msg);
    expect(sent[0]).toMatchObject({ from: 'orders@ruby.example', to: 'staff@ruby.example', subject: 'S', text: 'T' });
  });

  it('a channel is "configured" only when ALL of its required settings are present', () => {
    const none = createChannels(cfg({}));
    expect(none.map((c) => c.isConfigured())).toEqual([false, false, false]);
    const partial = createChannels(cfg({ SMTP_HOST: 'x', WHATSAPP_ACCESS_TOKEN: 't', KDS_WEBHOOK_URL: 'https://x' }));
    expect(partial.map((c) => c.isConfigured())).toEqual([false, false, false]);
  });
});
