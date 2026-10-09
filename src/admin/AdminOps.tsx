import { useEffect, useState } from 'react';
import { adm, AdminApiError, rm, when, type AdminUser, type AutomationDef, type Integration, type NotificationRow, type ReportData, type RunRow, type StoredReport } from './adminApi';
import { usePolling } from './AdminOrders';

const STATE_LABEL: Record<Integration['state'], string> = {
  not_configured: 'Not configured',
  configured_untested: 'Configured — not tested',
  connected: 'Connected (last test passed)',
  failing: 'Failing',
  always_on: 'Built in',
};

export function AutomationTab() {
  const [onlyFailed, setOnlyFailed] = useState(false);
  const runs = usePolling(() => adm<{ runs: RunRow[]; catalogue: AutomationDef[] }>('GET', `/automation/runs${onlyFailed ? '?outcome=failed' : ''}`), 6000);
  const notifs = usePolling(() => adm<{ notifications: NotificationRow[] }>('GET', '/notifications'), 6000);
  const [msg, setMsg] = useState('');
  useEffect(runs.refresh, [onlyFailed, runs.refresh]);

  const retry = async (id: string) => {
    setMsg('');
    try {
      const r = await adm<{ result: string }>('POST', `/notifications/${id}/retry`, {});
      setMsg(r.result === 'sent' ? 'Delivered.' : `Retry result: ${r.result}.`);
    } catch (e) {
      setMsg(e instanceof AdminApiError ? e.message : 'Retry failed.');
    }
    notifs.refresh();
    runs.refresh();
  };

  const problems = (notifs.data?.notifications ?? []).filter((n) => n.status !== 'sent');
  return (
    <section aria-labelledby="auto-h">
      <h2 id="auto-h">Automation</h2>
      {(runs.error || notifs.error) && <p className="form-error">{runs.error || notifs.error}</p>}
      {msg && <p role="status">{msg}</p>}

      <h3>Notifications needing attention</h3>
      {problems.length === 0 ? (
        <p className="muted">Everything queued has been delivered.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Channel</th>
                <th>Order</th>
                <th>Status</th>
                <th>Last error</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {problems.map((n) => (
                <tr key={n.id}>
                  <td>{when(n.createdAt)}</td>
                  <td>{n.channel}</td>
                  <td dir="ltr">{n.orderId ?? n.kind}</td>
                  <td>
                    {n.status} (attempt {n.attempts})
                  </td>
                  <td className="adm-err">{n.lastError}</td>
                  <td>
                    <button className="btn btn--primary btn--sm" onClick={() => retry(n.id)}>
                      Retry now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="adm-bar">
        <h3>Execution history</h3>
        <button className={`chip ${onlyFailed ? 'is-selected' : ''}`} aria-pressed={onlyFailed} onClick={() => setOnlyFailed((v) => !v)}>
          Failed only
        </button>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Started</th>
              <th>Automation</th>
              <th>Level</th>
              <th>Trigger</th>
              <th>Outcome</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {runs.data?.runs.map((r) => (
              <tr key={r.id}>
                <td>{when(r.started_at)}</td>
                <td>{r.automation}</td>
                <td>
                  <span className={`adm-level adm-level--${r.level}`}>{r.level}</span>
                </td>
                <td>{r.trigger}</td>
                <td>
                  <span className={`adm-badge adm-badge--${r.outcome}`}>{r.outcome}</span>
                </td>
                <td className="adm-err">
                  {r.error}
                  {r.order_id && <span dir="ltr"> {r.order_id}</span>}
                </td>
              </tr>
            ))}
            {runs.data?.runs.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nothing recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3>What each automation may do</h3>
      <p className="muted">A = safe, no outside effects · B = connected, runs only when its integration is configured · C = needs a human decision. Refunds, payment reversals, price changes, discounts, policy changes and compensation are never automated.</p>
      <ul className="adm-catalogue">
        {runs.data?.catalogue.map((a) => (
          <li key={a.id}>
            <span className={`adm-level adm-level--${a.level}`}>{a.level}</span> <strong>{a.id}</strong> — {a.description}
            {a.requires && <em> (requires {a.requires})</em>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function IntegrationsTab({ user }: { user: AdminUser }) {
  const { data, error, refresh } = usePolling(() => adm<{ integrations: Integration[] }>('GET', '/integrations'), 10_000);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});
  const test = async (id: string) => {
    setBusy(id);
    try {
      const r = await adm<{ ok: boolean; error?: string }>('POST', `/integrations/${id}/test`, {});
      setResult((p) => ({ ...p, [id]: r.ok ? 'Test succeeded.' : `Test failed: ${r.error}` }));
    } catch (e) {
      setResult((p) => ({ ...p, [id]: e instanceof AdminApiError ? e.message : 'Test failed.' }));
    }
    setBusy(null);
    refresh();
  };
  return (
    <section aria-labelledby="int-h">
      <h2 id="int-h">Integrations</h2>
      <p className="muted">A service shows as “Connected” only after a real test message was accepted by the provider. “Configured” means the settings are present, nothing more.</p>
      {error && <p className="form-error">{error}</p>}
      <ul className="adm-list">
        {data?.integrations.map((i) => (
          <li key={i.id} className="panel">
            <div className="adm-bar">
              <h3>{i.label}</h3>
              <span className={`adm-badge adm-badge--${i.state}`}>{STATE_LABEL[i.state]}</span>
            </div>
            {!i.configured && i.state !== 'always_on' && <p className="muted">{i.setup}</p>}
            {i.state === 'always_on' && <p className="muted">{i.setup}</p>}
            {i.lastTestAt && (
              <p className="muted">
                Last test: {when(i.lastTestAt)}
                {i.lastError && <span className="adm-err"> — {i.lastError}</span>}
              </p>
            )}
            {i.configured && i.state !== 'always_on' && (
              <div className="adm-row">
                <button className="btn btn--ghost btn--sm" disabled={busy !== null || user.role !== 'manager'} onClick={() => test(i.id)}>
                  {busy === i.id ? 'Testing…' : 'Send test'}
                </button>
                {user.role !== 'manager' && <span className="muted">Managers only</span>}
              </div>
            )}
            {result[i.id] && <p role="status">{result[i.id]}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MenuTab({ user }: { user: AdminUser }) {
  const { data, error, refresh } = usePolling(() => adm<{ menu: { id: string; productCode: string; name: string; chineseName: string; available: boolean }[] }>('GET', '/menu'), 15_000);
  const [err, setErr] = useState('');
  const toggle = async (id: string, available: boolean) => {
    setErr('');
    try {
      await adm('POST', `/menu/${id}/availability`, { available });
      refresh();
    } catch (e) {
      setErr(e instanceof AdminApiError ? e.message : 'Failed.');
    }
  };
  return (
    <section aria-labelledby="menu-h">
      <h2 id="menu-h">Availability</h2>
      <p className="muted">Switch a dish off when it runs out; customers can't order it and it disappears from recommendations. Prices can only be changed in the menu data and a redeploy — never from here, and never automatically.</p>
      {(error || err) && <p className="form-error">{error || err}</p>}
      <ul className="adm-list">
        {data?.menu.map((m) => (
          <li key={m.id} className="adm-menu-row">
            <span>
              <strong dir="ltr">{m.productCode}</strong> {m.name} <span lang="zh-Hans">{m.chineseName}</span>
            </span>
            <button className={`chip ${m.available ? 'is-selected' : ''}`} aria-pressed={m.available} disabled={user.role !== 'manager'} onClick={() => toggle(m.id, !m.available)}>
              {m.available ? 'Available' : 'Sold out'}
            </button>
          </li>
        ))}
      </ul>
      {user.role !== 'manager' && <p className="muted">Only a manager can change availability.</p>}
    </section>
  );
}

function ReportView({ report }: { report: StoredReport }) {
  const d: ReportData = report.data;
  const range = d.rangeStart === d.rangeEnd ? d.rangeStart : `${d.rangeStart} to ${d.rangeEnd}`;
  return (
    <article className="panel adm-report" aria-label={`Report ${range}`}>
      <h3>
        {d.period[0]!.toUpperCase() + d.period.slice(1)} report · <span dir="ltr">{range}</span>
      </h3>
      <p className="muted">
        Time zone {d.timezone} · Source: {d.source.description} · {d.source.ordersInRange} orders in range · generated {when(report.generatedAt)} by {report.generatedBy}
      </p>
      {d.source.sampleMenuOrders > 0 && (
        <p className="notice notice--warn">
          {d.source.sampleMenuOrders} order(s) in this range were placed on the sample menu. They are test data, not real sales.
        </p>
      )}
      <h4>Summary</h4>
      <ul>
        {report.summary.statements.map((s, i) => (
          <li key={i}>
            {s.text} {s.source === 'ai' && <span className="adm-badge">AI-worded, numbers verified</span>}
          </li>
        ))}
      </ul>
      {report.summary.aiNote && <p className="muted">{report.summary.aiNote}</p>}
      <div className="adm-stats">
        <div><span>Orders</span><strong>{d.totals.orders}</strong></div>
        <div><span>Sales (placed)</span><strong dir="ltr">{rm(d.totals.grossSales)}</strong></div>
        <div><span>Completed</span><strong>{d.totals.completedOrders} · <span dir="ltr">{rm(d.totals.completedSales)}</span></strong></div>
        <div><span>Average order</span><strong dir="ltr">{d.totals.averageOrderValue === null ? '—' : rm(d.totals.averageOrderValue)}</strong></div>
        <div><span>Dine-in</span><strong>{d.byType.dineIn.orders} · <span dir="ltr">{rm(d.byType.dineIn.sales)}</span></strong></div>
        <div><span>Takeaway</span><strong>{d.byType.takeaway.orders} · <span dir="ltr">{rm(d.byType.takeaway.sales)}</span></strong></div>
        <div><span>Cancelled</span><strong>{d.totals.cancelledOrders} · <span dir="ltr">{rm(d.totals.cancelledValue)}</span></strong></div>
      </div>
      <h4>Most ordered items (by units)</h4>
      {d.topItems.length === 0 ? (
        <p className="muted">No items in this range.</p>
      ) : (
        <ol>
          {d.topItems.map((i) => (
            <li key={i.itemId}>
              {i.name}: {i.units} units in {i.orders} orders (<span dir="ltr">{rm(i.revenue)}</span>)
            </li>
          ))}
        </ol>
      )}
      {d.byDay.length > 1 && (
        <>
          <h4>By day</h4>
          <ul>
            {d.byDay.map((x) => (
              <li key={x.date}>
                <span dir="ltr">{x.date}</span>: {x.orders} orders · <span dir="ltr">{rm(x.sales)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <h4>Repeat purchases</h4>
      <p>
        {d.repeat.identifiableOrders} orders carry a device id; {d.repeat.customersWithRepeatOrders} device(s) ordered more than once in the range; {d.repeat.ordersFromReturningCustomers} order(s) came from a device that had ordered before.
      </p>
      <p className="muted">{d.repeat.note}</p>
    </article>
  );
}

export function ReportsTab({ aiAvailable }: { aiAvailable: boolean }) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<StoredReport | null>(null);
  const list = usePolling(() => adm<{ reports: StoredReport[] }>('GET', '/reports?limit=15'), 30_000);

  const generate = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await adm<{ report: StoredReport }>('POST', '/reports', { period, date, ai: ai && aiAvailable });
      setSelected(r.report);
      list.refresh();
    } catch (e) {
      setErr(e instanceof AdminApiError ? e.message : 'Could not generate the report.');
    }
    setBusy(false);
  };

  return (
    <section aria-labelledby="rep-h">
      <h2 id="rep-h">Reports</h2>
      <p className="muted">Figures come from saved orders only. Every report shows its date range, time zone and data source.</p>
      <form
        className="adm-row adm-form"
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        <label>
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            <option value="day">Day</option>
            <option value="week">Week (Mon–Sun)</option>
            <option value="month">Month</option>
          </select>
        </label>
        <label>
          Date within period
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="adm-check">
          <input type="checkbox" checked={ai && aiAvailable} disabled={!aiAvailable} onChange={(e) => setAi(e.target.checked)} /> Add AI wording {!aiAvailable && '(AI not configured)'}
        </label>
        <button className="btn btn--primary" disabled={busy}>
          {busy ? 'Generating…' : 'Generate report'}
        </button>
      </form>
      {err && <p className="form-error">{err}</p>}
      {selected && <ReportView report={selected} />}
      <h3>Recent reports</h3>
      <ul className="adm-list">
        {list.data?.reports.map((r) => (
          <li key={r.id}>
            <button className="adm-linkbtn" onClick={() => setSelected(r)}>
              {r.data.period} · {r.data.rangeStart}
              {r.data.rangeEnd !== r.data.rangeStart && ` to ${r.data.rangeEnd}`}
            </button>{' '}
            <span className="muted">({r.generatedBy === 'scheduler' ? 'scheduled' : `by ${r.generatedBy}`}, {when(r.generatedAt)})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
