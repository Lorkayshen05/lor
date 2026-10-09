import { all, one, run } from '../db';
import type { Deps } from '../deps';
import { sanitizeError, uid } from '../lib/security';

/**
 * Automation levels (see docs/AUTOMATION.md):
 *  A — safe, deterministic, no outside effects (calculations, recommendations, draft reports, order intake)
 *  B — connected: talks to an external system; only runs once that integration is configured
 *  C — needs a human decision; the system can queue the request but never perform it on its own
 */
export type Level = 'A' | 'B' | 'C';

export interface AutomationDef {
  id: string;
  level: Level;
  description: string;
  /** Integration that must be configured for this automation to run at all. */
  requires?: 'email' | 'whatsapp' | 'kds' | 'ai';
}

export const AUTOMATIONS: readonly AutomationDef[] = [
  { id: 'order_intake', level: 'A', description: 'Validate, price and save a customer order' },
  { id: 'recommendation', level: 'A', description: 'Rule-based dessert recommendations and budget plans' },
  { id: 'guide_answer_rules', level: 'A', description: 'Ruby Dessert Guide answers from menu rules and verified facts' },
  { id: 'guide_answer_ai', level: 'A', description: 'Ruby Dessert Guide free-text answers from an AI model (validated against the menu)', requires: 'ai' },
  { id: 'report_generate', level: 'A', description: 'Draft sales report from saved orders' },
  { id: 'report_ai_summary', level: 'A', description: 'Plain-English report summary written by an AI model (numbers verified)', requires: 'ai' },
  { id: 'contact_purge', level: 'A', description: 'Erase customer name/phone after the retention period' },
  { id: 'notify_email', level: 'B', description: 'Email staff about a new order', requires: 'email' },
  { id: 'notify_whatsapp', level: 'B', description: 'WhatsApp staff about a new order', requires: 'whatsapp' },
  { id: 'notify_kds', level: 'B', description: 'Send a new order to the kitchen display system', requires: 'kds' },
  { id: 'report_email', level: 'B', description: 'Email the daily report to staff', requires: 'email' },
  { id: 'order_status_update', level: 'B', description: 'Order status changed by an authorised staff member' },
  { id: 'order_cancel_after_acceptance', level: 'C', description: 'Cancel an order that staff already accepted — manager approval required' },
];

/**
 * Things no automation (and no AI output) may do on its own. They have no code path at all in this system:
 * refunds, payment reversals, price changes, discounts, policy changes, compensation for complaints.
 */
export const HUMAN_ONLY_ACTIONS = ['refund', 'payment_reversal', 'price_change', 'discount', 'policy_change', 'complaint_compensation'] as const;

export interface RunHandle {
  id: string;
}

export function startRun(
  deps: Deps,
  meta: { automation: string; trigger: string; orderId?: string | null; ref?: string | null },
): RunHandle {
  const def = AUTOMATIONS.find((a) => a.id === meta.automation);
  if (!def) throw new Error(`Unknown automation "${meta.automation}"`);
  const id = uid('run');
  run(
    deps.db,
    `INSERT INTO automation_runs (id, automation, level, trigger, started_at, outcome, order_id, ref)
     VALUES (?, ?, ?, ?, ?, 'running', ?, ?)`,
    id,
    meta.automation,
    def.level,
    meta.trigger,
    deps.now().toISOString(),
    meta.orderId ?? null,
    meta.ref ?? null,
  );
  return { id };
}

export function finishRun(deps: Deps, handle: RunHandle, outcome: 'ok' | 'failed' | 'skipped', error?: unknown): void {
  run(
    deps.db,
    'UPDATE automation_runs SET finished_at = ?, outcome = ?, error = ? WHERE id = ?',
    deps.now().toISOString(),
    outcome,
    error === undefined ? null : sanitizeError(error, deps.config.secrets),
    handle.id,
  );
}

/** Record a run around `fn`. Errors are logged (sanitised) and re-thrown so callers still see them. */
export async function withRun<T>(
  deps: Deps,
  meta: { automation: string; trigger: string; orderId?: string | null; ref?: string | null },
  fn: () => Promise<T> | T,
): Promise<T> {
  const h = startRun(deps, meta);
  try {
    const out = await fn();
    finishRun(deps, h, 'ok');
    return out;
  } catch (e) {
    finishRun(deps, h, 'failed', e);
    throw e;
  }
}

export interface RunRow {
  id: string;
  automation: string;
  level: Level;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  outcome: 'running' | 'ok' | 'failed' | 'skipped';
  error: string | null;
  order_id: string | null;
  ref: string | null;
}

export function listRuns(deps: Deps, opts: { outcome?: string; limit?: number } = {}): RunRow[] {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return opts.outcome
    ? all<RunRow>(deps.db, 'SELECT * FROM automation_runs WHERE outcome = ? ORDER BY started_at DESC LIMIT ?', opts.outcome, limit)
    : all<RunRow>(deps.db, 'SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT ?', limit);
}

/** Runs left "running" by a crashed process are marked failed on startup so the dashboard never lies. */
export function closeOrphanedRuns(deps: Deps): number {
  const r = run(
    deps.db,
    "UPDATE automation_runs SET outcome = 'failed', finished_at = ?, error = 'Interrupted (server restarted)' WHERE outcome = 'running'",
    deps.now().toISOString(),
  );
  return Number(r.changes);
}

export const countFailedRuns = (deps: Deps): number =>
  one<{ n: number }>(deps.db, "SELECT COUNT(*) AS n FROM automation_runs WHERE outcome = 'failed'")?.n ?? 0;
