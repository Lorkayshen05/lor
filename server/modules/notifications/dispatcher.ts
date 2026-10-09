import { formatMoney } from '../../../src/utils/money';
import { all, one, run } from '../../db';
import type { Deps } from '../../deps';
import { sanitizeError, uid } from '../../lib/security';
import { finishRun, startRun } from '../automation';
import type { Channel, ChannelId, NotificationMessage } from './channels';

const LEASE_MS = 2 * 60_000;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 15 * 60_000;

const AUTOMATION_FOR: Record<ChannelId, string> = { email: 'notify_email', whatsapp: 'notify_whatsapp', kds: 'notify_kds' };

function configuredChannels(deps: Deps): Channel[] {
  return deps.channels.filter((c) => c.isConfigured());
}

/**
 * Called inside the order transaction. Only channels that are actually configured get a row, so the dashboard
 * never shows a "pending" message for a service that can't send, and nothing is ever reported as delivered
 * without a provider accepting it. The built-in dashboard alert needs no row: it reads the orders table.
 */
export function enqueueOrderNotifications(deps: Deps, orderId: string, nowIso: string): number {
  const channels = configuredChannels(deps);
  for (const c of channels) {
    run(
      deps.db,
      `INSERT INTO notifications (id, order_id, channel, kind, status, attempts, next_attempt_at, created_at)
       VALUES (?, ?, ?, 'order_created', 'pending', 0, ?, ?)`,
      uid('ntf'),
      orderId,
      c.id,
      nowIso,
      nowIso,
    );
  }
  return channels.length;
}

/* ---------------------------------------------------------------- message building */

interface Row {
  id: string;
  order_id: string | null;
  ref: string | null;
  channel: ChannelId;
  kind: 'order_created' | 'report' | 'test';
  status: string;
  attempts: number;
}

const rm = (sen: number) => formatMoney(sen);

function buildOrderMessage(deps: Deps, row: Row): NotificationMessage {
  const o = one<{ id: string; order_type: string; table_number: string | null; pickup_in_minutes: number | null; total: number; created_at: string }>(
    deps.db,
    'SELECT id, order_type, table_number, pickup_in_minutes, total, created_at FROM orders WHERE id = ?',
    row.order_id,
  );
  if (!o) throw new Error('Order no longer exists');
  const items = all<{ name: string; chinese_name: string; quantity: number; unit_price: number; line_total: number }>(
    deps.db,
    'SELECT name, chinese_name, quantity, unit_price, line_total FROM order_items WHERE order_id = ? ORDER BY line_no',
    o.id,
  );
  const contact = one<{ name: string | null; phone: string | null }>(deps.db, 'SELECT name, phone FROM order_contacts WHERE order_id = ?', o.id);
  const where = o.order_type === 'dine-in' ? `Dine-in, table ${o.table_number}` : `Takeaway, pickup ${o.pickup_in_minutes ? `in ${o.pickup_in_minutes} min` : 'as soon as ready'}`;
  const lines = items.map((i) => `${i.quantity} × ${i.name} (${i.chinese_name})  ${rm(i.line_total)}`);
  const summary = items.map((i) => `${i.quantity}× ${i.name}`).join(', ');
  const text = [
    `NEW ORDER ${o.id}`,
    where,
    '',
    ...lines,
    '',
    `Total: ${rm(o.total)}`,
    contact?.name ? `Name: ${contact.name}` : '',
    contact?.phone ? `Phone: ${contact.phone}` : '',
    `Placed: ${o.created_at}`,
  ]
    .filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i !== a.length - 1))
    .join('\n');
  return {
    id: row.id,
    kind: 'order_created',
    subject: `New order ${o.id} — ${o.order_type === 'dine-in' ? `table ${o.table_number}` : 'takeaway'} — ${rm(o.total)}`,
    text,
    // WhatsApp carries order content only; customer name and phone stay in the dashboard and email.
    whatsappParams: [o.id, `${where}. ${summary}`.slice(0, 300), rm(o.total)],
    // Kitchen systems get order content only — no customer contact details.
    kds: {
      orderId: o.id,
      orderType: o.order_type,
      tableNumber: o.table_number,
      pickupInMinutes: o.pickup_in_minutes,
      total: o.total,
      currency: 'MYR',
      createdAt: o.created_at,
      items: items.map((i) => ({ name: i.name, chineseName: i.chinese_name, quantity: i.quantity, unitPrice: i.unit_price })),
    },
  };
}

function buildMessage(deps: Deps, row: Row): NotificationMessage {
  if (row.kind === 'order_created') return buildOrderMessage(deps, row);
  if (row.kind === 'report') {
    const rep = one<{ id: string; period: string; range_start: string; range_end: string; summary_json: string }>(
      deps.db,
      'SELECT id, period, range_start, range_end, summary_json FROM reports WHERE id = ?',
      row.ref,
    );
    if (!rep) throw new Error('Report no longer exists');
    const statements = (JSON.parse(rep.summary_json) as { statements: { text: string }[] }).statements.map((s) => `• ${s.text}`);
    const text = [`Ruby Dessert House — ${rep.period} report ${rep.range_start} to ${rep.range_end}`, '', ...statements, '', 'Source: saved orders. Open the admin dashboard for full figures.'].join('\n');
    return { id: row.id, kind: 'report', subject: `Report ${rep.range_start}${rep.range_end !== rep.range_start ? ` – ${rep.range_end}` : ''}`, text, whatsappParams: ['report', rep.range_start, ''], kds: null };
  }
  return { id: row.id, kind: 'test', subject: 'Ruby Dessert House — connection test', text: 'This is a connection test from the Ruby Dessert House admin dashboard. No order is attached.', whatsappParams: ['TEST', 'Connection test from the admin dashboard', 'RM 0.00'], kds: { test: true } };
}

/* ---------------------------------------------------------------- delivery */

const backoff = (attempts: number) => Math.min(BACKOFF_BASE_MS * 2 ** Math.max(attempts - 1, 0), BACKOFF_CAP_MS);

/** Try one notification. Safe to call concurrently: the row is leased before sending. */
async function deliver(deps: Deps, row: Row, trigger: string): Promise<'sent' | 'failed' | 'retrying' | 'skipped'> {
  const now = deps.now();
  const lease = new Date(now.getTime() + LEASE_MS).toISOString();
  const claimed = run(
    deps.db,
    "UPDATE notifications SET attempts = attempts + 1, lease_until = ? WHERE id = ? AND status = 'pending' AND next_attempt_at <= ? AND (lease_until IS NULL OR lease_until <= ?)",
    lease,
    row.id,
    now.toISOString(),
    now.toISOString(),
  );
  if (Number(claimed.changes) !== 1) return 'skipped'; // another worker (or a manual retry) has it
  const attempt = row.attempts + 1;
  const h = startRun(deps, { automation: AUTOMATION_FOR[row.channel], trigger, orderId: row.order_id, ref: row.id });
  const channel = deps.channels.find((c) => c.id === row.channel);

  try {
    if (!channel || !channel.isConfigured()) throw new Error('Channel is no longer configured');
    await channel.send(buildMessage(deps, row));
    run(deps.db, "UPDATE notifications SET status = 'sent', sent_at = ?, last_error = NULL, next_attempt_at = NULL, lease_until = NULL WHERE id = ?", deps.now().toISOString(), row.id);
    finishRun(deps, h, 'ok');
    return 'sent';
  } catch (e) {
    const msg = sanitizeError(e, deps.config.secrets);
    const exhausted = attempt >= deps.config.notifyMaxAttempts;
    run(
      deps.db,
      'UPDATE notifications SET status = ?, last_error = ?, next_attempt_at = ?, lease_until = NULL WHERE id = ?',
      exhausted ? 'failed' : 'pending',
      msg,
      exhausted ? null : new Date(deps.now().getTime() + backoff(attempt)).toISOString(),
      row.id,
    );
    finishRun(deps, h, 'failed', e);
    return exhausted ? 'failed' : 'retrying';
  }
}

export async function processDue(deps: Deps, limit = 20, trigger = 'worker'): Promise<{ sent: number; failed: number; retrying: number }> {
  const due = all<Row>(
    deps.db,
    "SELECT id, order_id, ref, channel, kind, status, attempts FROM notifications WHERE status = 'pending' AND next_attempt_at <= ? AND (lease_until IS NULL OR lease_until <= ?) ORDER BY created_at LIMIT ?",
    deps.now().toISOString(),
    deps.now().toISOString(),
    limit,
  );
  const out = { sent: 0, failed: 0, retrying: 0 };
  for (const row of due) {
    const r = await deliver(deps, row, row.attempts === 0 ? 'order_created' : `retry#${row.attempts + 1}`);
    if (r === 'sent') out.sent++;
    else if (r === 'failed') out.failed++;
    else if (r === 'retrying') out.retrying++;
  }
  void trigger;
  return out;
}

/** Manual retry from the dashboard. Reuses the same row, so the order is never duplicated. */
export async function retryNotification(deps: Deps, id: string, actor: string): Promise<'sent' | 'failed' | 'retrying' | 'skipped' | 'not_found' | 'not_retryable'> {
  const row = one<Row>(deps.db, 'SELECT id, order_id, ref, channel, kind, status, attempts FROM notifications WHERE id = ?', id);
  if (!row) return 'not_found';
  if (row.status === 'sent') return 'not_retryable';
  const nowIso = deps.now().toISOString();
  // Re-arm the row unless an attempt is in flight right now (it holds a lease). A row merely waiting out its
  // backoff may be retried immediately; a double-click or second tab cannot trigger a second simultaneous send.
  const reset = run(
    deps.db,
    "UPDATE notifications SET status = 'pending', attempts = 0, next_attempt_at = ? WHERE id = ? AND status IN ('failed','pending') AND (lease_until IS NULL OR lease_until <= ?)",
    nowIso,
    id,
    nowIso,
  );
  if (Number(reset.changes) !== 1) return 'skipped';
  return deliver(deps, { ...row, status: 'pending', attempts: 0 }, `manual:${actor}`);
}

export function listNotifications(deps: Deps, opts: { status?: string; limit?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 300);
  const rows = opts.status
    ? all<NotificationRow>(deps.db, 'SELECT * FROM notifications WHERE status = ? ORDER BY created_at DESC LIMIT ?', opts.status, limit)
    : all<NotificationRow>(deps.db, 'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?', limit);
  return rows.map((n) => ({ id: n.id, orderId: n.order_id, ref: n.ref, channel: n.channel, kind: n.kind, status: n.status, attempts: n.attempts, lastError: n.last_error, createdAt: n.created_at, sentAt: n.sent_at, nextAttemptAt: n.next_attempt_at }));
}
interface NotificationRow { id: string; order_id: string | null; ref: string | null; channel: string; kind: string; status: string; attempts: number; last_error: string | null; next_attempt_at: string | null; created_at: string; sent_at: string | null }

/** Queue a report email (Level B — only when email is configured). */
export function enqueueReportEmail(deps: Deps, reportId: string): boolean {
  const email = deps.channels.find((c) => c.id === 'email');
  if (!email?.isConfigured()) return false;
  const nowIso = deps.now().toISOString();
  run(deps.db, "INSERT INTO notifications (id, order_id, ref, channel, kind, status, attempts, next_attempt_at, created_at) VALUES (?, NULL, ?, 'email', 'report', 'pending', 0, ?, ?)", uid('ntf'), reportId, nowIso, nowIso);
  return true;
}

/* ---------------------------------------------------------------- integration status */

export type IntegrationState = 'not_configured' | 'configured_untested' | 'connected' | 'failing' | 'always_on';

export interface IntegrationStatus {
  id: string;
  label: string;
  state: IntegrationState;
  configured: boolean;
  lastTestAt: string | null;
  lastError: string | null;
  setup: string;
}

const SETUP: Record<string, string> = {
  email: 'Set SMTP_HOST, EMAIL_FROM, STAFF_EMAIL_TO (and SMTP_USER/SMTP_PASS, SMTP_PORT, SMTP_SECURE if your provider needs them).',
  whatsapp: 'Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_STAFF_TO and WHATSAPP_TEMPLATE_NAME (an approved 3-parameter template). See docs/AUTOMATION.md.',
  kds: 'Set KDS_WEBHOOK_URL and KDS_WEBHOOK_SECRET. Your kitchen system must verify the X-Ruby-Signature header.',
  ai: 'Set ANTHROPIC_API_KEY (and optionally AI_MODEL). Without it, the guide uses menu rules only.',
};

export function getIntegrationStatuses(deps: Deps): IntegrationStatus[] {
  const test = new Map(
    all<{ channel: string; last_test_at: string | null; last_test_ok: number | null; last_test_error: string | null }>(deps.db, 'SELECT * FROM integration_status').map((r) => [r.channel, r]),
  );
  const status = (id: string, label: string, configured: boolean): IntegrationStatus => {
    const t = test.get(id);
    let state: IntegrationState = 'not_configured';
    if (configured) {
      if (!t || t.last_test_ok === null) state = 'configured_untested';
      else if (t.last_test_ok === 1) state = 'connected';
      else state = 'failing';
      // A real delivery that failed after the last good test downgrades "connected".
      if (state === 'connected' && id in AUTOMATION_FOR) {
        const latest = one<{ status: string }>(deps.db, "SELECT status FROM notifications WHERE channel = ? AND kind != 'test' AND (status = 'sent' OR last_error IS NOT NULL) ORDER BY created_at DESC LIMIT 1", id);
        if (latest && latest.status !== 'sent') state = 'failing';
      }
    }
    return { id, label, state, configured, lastTestAt: t?.last_test_at ?? null, lastError: t?.last_test_error ?? null, setup: SETUP[id] ?? '' };
  };
  return [
    { id: 'dashboard', label: 'Admin dashboard alerts', state: 'always_on', configured: true, lastTestAt: null, lastError: null, setup: 'Built in: new orders appear on the Orders and Kitchen screens.' },
    ...deps.channels.map((c) => status(c.id, c.label, c.isConfigured())),
    status('ai', 'AI model (Ruby Dessert Guide, report wording)', deps.config.ai.enabled),
  ];
}

export function recordTest(deps: Deps, channel: string, ok: boolean, error?: unknown): void {
  run(
    deps.db,
    `INSERT INTO integration_status (channel, last_test_at, last_test_ok, last_test_error) VALUES (?, ?, ?, ?)
     ON CONFLICT(channel) DO UPDATE SET last_test_at = excluded.last_test_at, last_test_ok = excluded.last_test_ok, last_test_error = excluded.last_test_error`,
    channel,
    deps.now().toISOString(),
    ok ? 1 : 0,
    ok ? null : sanitizeError(error, deps.config.secrets),
  );
}

/** Admin "send test": a real call to the real provider. The status only becomes "connected" if it succeeds. */
export async function testChannel(deps: Deps, channelId: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  if (channelId === 'ai') {
    if (!deps.llm) return { ok: false, error: 'AI is not configured' };
    const h = startRun(deps, { automation: 'guide_answer_ai', trigger: `test:${actor}` });
    try {
      await deps.llm.ping();
      recordTest(deps, 'ai', true);
      finishRun(deps, h, 'ok');
      return { ok: true };
    } catch (e) {
      recordTest(deps, 'ai', false, e);
      finishRun(deps, h, 'failed', e);
      return { ok: false, error: sanitizeError(e, deps.config.secrets) };
    }
  }
  const channel = deps.channels.find((c) => c.id === channelId);
  if (!channel) return { ok: false, error: 'Unknown integration' };
  if (!channel.isConfigured()) return { ok: false, error: 'Not configured' };
  const nowIso = deps.now().toISOString();
  const id = uid('ntf');
  run(deps.db, "INSERT INTO notifications (id, order_id, ref, channel, kind, status, attempts, created_at) VALUES (?, NULL, NULL, ?, 'test', 'pending', 1, ?)", id, channelId, nowIso);
  const h = startRun(deps, { automation: AUTOMATION_FOR[channel.id], trigger: `test:${actor}`, ref: id });
  try {
    await channel.send(buildMessage(deps, { id, order_id: null, ref: null, channel: channel.id, kind: 'test', status: 'pending', attempts: 1 }));
    run(deps.db, "UPDATE notifications SET status = 'sent', sent_at = ? WHERE id = ?", deps.now().toISOString(), id);
    recordTest(deps, channelId, true);
    finishRun(deps, h, 'ok');
    return { ok: true };
  } catch (e) {
    const msg = sanitizeError(e, deps.config.secrets);
    run(deps.db, "UPDATE notifications SET status = 'failed', last_error = ? WHERE id = ?", msg, id);
    recordTest(deps, channelId, false, e);
    finishRun(deps, h, 'failed', e);
    return { ok: false, error: msg };
  }
}
