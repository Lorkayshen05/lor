import { purgeExpiredContacts } from './modules/orders';
import { closeOrphanedRuns, finishRun, startRun } from './modules/automation';
import { enqueueReportEmail, processDue } from './modules/notifications/dispatcher';
import { generateReport, hasScheduledReport } from './modules/reports';
import type { Deps } from './deps';
import { addDays, businessDate, businessHour } from './lib/time';

/** One pass of background work. Exported so tests (and `npm run worker:once`) can drive it without timers. */
export async function tick(deps: Deps): Promise<void> {
  await processDue(deps);

  // Retention: erase expired customer contact details.
  const purged = purgeExpiredContacts(deps);
  if (purged > 0) {
    const h = startRun(deps, { automation: 'contact_purge', trigger: 'schedule' });
    finishRun(deps, h, 'ok');
  }

  // Daily report for yesterday, once the configured hour has passed (business time zone).
  const now = deps.now();
  if (businessHour(now, deps.config.businessTz) >= deps.config.reportHour) {
    const yesterday = addDays(businessDate(now, deps.config.businessTz), -1);
    if (!hasScheduledReport(deps, yesterday)) {
      try {
        const report = await generateReport(deps, { period: 'day', date: yesterday, by: 'scheduler', withAi: false });
        // Level B: emailing needs a configured, working email integration; otherwise the report is simply stored.
        if (deps.config.reportDailyEmail && enqueueReportEmail(deps, report.id)) {
          const h = startRun(deps, { automation: 'report_email', trigger: 'schedule', ref: report.id });
          finishRun(deps, h, 'ok');
          await processDue(deps);
        }
      } catch {
        /* already recorded in the automation log by generateReport */
      }
    }
  }
}

export function startWorker(deps: Deps): { stop: () => void; kick: () => void } {
  closeOrphanedRuns(deps);
  let running = false;
  const safeTick = async () => {
    if (running) return;
    running = true;
    try {
      await tick(deps);
    } catch (e) {
      console.error('[worker] tick failed:', e instanceof Error ? e.message : e);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void safeTick(), deps.config.workerIntervalMs);
  timer.unref();
  const kick = () => void setImmediate(() => void safeTick());
  deps.kick = kick;
  kick();
  return { stop: () => clearInterval(timer), kick };
}
