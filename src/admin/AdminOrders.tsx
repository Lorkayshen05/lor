import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { adm, AdminApiError, NEXT_ACTION, rm, when, type AdminOrder, type AdminUser, type Approval } from './adminApi';

interface Common {
  user: AdminUser;
  onChanged: () => void;
}

/** Poll `load` every `ms` while mounted; returns the latest data and a manual refresh. */
export function usePolling<T>(load: () => Promise<T>, ms = 5000): { data: T | null; error: string; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const loadRef = useRef(load);
  loadRef.current = load;
  const refresh = useCallback(() => {
    loadRef.current().then(
      (d) => {
        setData(d);
        setError('');
      },
      (e) => setError(e instanceof AdminApiError ? e.message : 'Could not load.'),
    );
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, ms);
    return () => clearInterval(t);
  }, [refresh, ms]);
  return { data, error, refresh };
}

function ReasonForm({ label, submitLabel, onSubmit, onCancel }: { label: string; submitLabel: string; onSubmit: (reason: string) => Promise<void>; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await onSubmit(reason.trim());
    } catch (x) {
      setErr(x instanceof AdminApiError ? x.message : 'Failed.');
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="adm-reason">
      <label>
        {label}
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required minLength={3} autoFocus />
      </label>
      <div className="adm-row">
        <button className="btn btn--primary btn--sm" disabled={busy || reason.trim().length < 3}>
          {submitLabel}
        </button>
        <button type="button" className="btn btn--link" onClick={onCancel}>
          Back
        </button>
      </div>
      {err && <p className="form-error">{err}</p>}
    </form>
  );
}

function OrderCard({ order, user, onChanged }: { order: AdminOrder } & Common) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'none' | 'cancel' | 'request'>('none');
  const next = NEXT_ACTION[order.status];
  const terminal = order.status === 'completed' || order.status === 'cancelled';

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      setMode('none');
      onChanged();
    } catch (e) {
      setErr(e instanceof AdminApiError ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`adm-order adm-order--${order.status}`}>
      <header className="adm-order__head">
        <h3 dir="ltr">{order.orderId}</h3>
        <span className={`adm-status adm-status--${order.status}`}>{order.status.toUpperCase()}</span>
      </header>
      <p className="adm-meta">
        {order.orderType === 'dine-in' ? `Dine-in · table ${order.tableNumber}` : `Takeaway · pickup ${order.pickupInMinutes ? `in ${order.pickupInMinutes} min` : 'as soon as ready'}`} · {when(order.createdAt)}
        {order.menuIsSample && <span className="adm-badge adm-badge--warn">sample-menu test order</span>}
      </p>
      <ul className="adm-items">
        {order.items.map((i) => (
          <li key={i.itemId}>
            <span>
              {i.quantity} × {i.name} <span lang="zh-Hans">{i.chineseName}</span>
            </span>
            <span dir="ltr">{rm(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <p className="adm-total">
        <strong>Total</strong> <strong dir="ltr">{rm(order.total)}</strong>
      </p>
      {order.contact && (
        <p className="adm-meta">
          {order.contact.purged ? 'Contact details erased (retention period passed)' : `${order.contact.name ?? ''} ${order.contact.phone ? '· ' : ''}`}
          {!order.contact.purged && order.contact.phone && (
            <a href={`tel:${order.contact.phone}`} dir="ltr">
              {order.contact.phone}
            </a>
          )}
        </p>
      )}

      <ul className="adm-notifs" aria-label="Notifications">
        {order.notifications.length === 0 && <li className="adm-badge">No external notification channels configured — this dashboard is the alert</li>}
        {order.notifications.map((n) => (
          <li key={n.id} className={`adm-badge adm-badge--${n.status}`} title={n.lastError ?? undefined}>
            {n.channel}: {n.status}
            {n.status !== 'sent' && ` (attempt ${n.attempts})`}
            {n.status !== 'sent' && (
              <button className="adm-linkbtn" disabled={busy} onClick={() => act(() => adm('POST', `/notifications/${n.id}/retry`, {}))}>
                retry
              </button>
            )}
            {n.lastError && n.status !== 'sent' && <span className="adm-err"> — {n.lastError}</span>}
          </li>
        ))}
      </ul>

      {order.pendingApproval && (
        <p className="adm-approval" role="status">
          Cancellation requested by {order.pendingApproval.requestedBy}: “{order.pendingApproval.reason}” — waiting for a manager.
          {user.role === 'manager' && (
            <span className="adm-row">
              <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => act(() => adm('POST', `/approvals/${order.pendingApproval!.id}/decision`, { approve: true }))}>
                Approve cancel
              </button>
              <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => act(() => adm('POST', `/approvals/${order.pendingApproval!.id}/decision`, { approve: false }))}>
                Reject
              </button>
            </span>
          )}
        </p>
      )}

      {!terminal && mode === 'none' && (
        <div className="adm-row">
          {next && (
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => act(() => adm('POST', `/orders/${order.orderId}/status`, { to: next.to }))}>
              {next.label}
            </button>
          )}
          {order.status === 'new' || user.role === 'manager' ? (
            <button className="btn btn--ghost btn--sm" onClick={() => setMode('cancel')}>
              Cancel order
            </button>
          ) : (
            !order.pendingApproval && (
              <button className="btn btn--ghost btn--sm" onClick={() => setMode('request')}>
                Request cancellation
              </button>
            )
          )}
        </div>
      )}
      {mode === 'cancel' && <ReasonForm label="Reason for cancelling" submitLabel="Cancel order" onCancel={() => setMode('none')} onSubmit={(note) => act(() => adm('POST', `/orders/${order.orderId}/status`, { to: 'cancelled', note }))} />}
      {mode === 'request' && <ReasonForm label="Why should this order be cancelled? A manager must approve." submitLabel="Send request" onCancel={() => setMode('none')} onSubmit={(reason) => act(() => adm('POST', `/orders/${order.orderId}/cancel-request`, { reason }))} />}
      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
    </article>
  );
}

export function OrdersTab({ user, onChanged }: Common) {
  const [filter, setFilter] = useState<'active' | 'today' | 'all'>('active');
  const { data, error, refresh } = usePolling(
    () => adm<{ orders: AdminOrder[] }>('GET', `/orders?${filter === 'active' ? 'active=1' : filter === 'today' ? `date=${new Date().toLocaleDateString('en-CA')}` : ''}&limit=150`),
    5000,
  );
  useEffect(refresh, [filter, refresh]);
  const changed = () => {
    refresh();
    onChanged();
  };
  return (
    <section aria-labelledby="orders-h">
      <div className="adm-bar">
        <h2 id="orders-h">Orders</h2>
        <div role="group" aria-label="Filter" className="adm-row">
          {(['active', 'today', 'all'] as const).map((f) => (
            <button key={f} className={`chip ${filter === f ? 'is-selected' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'active' ? 'Active' : f === 'today' ? 'Today' : 'Recent'}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {data && data.orders.length === 0 && <p className="muted">No orders here yet.</p>}
      <div className="adm-grid">{data?.orders.map((o) => <OrderCard key={o.orderId} order={o} user={user} onChanged={changed} />)}</div>
    </section>
  );
}

const KITCHEN_COLUMNS: { status: AdminOrder['status']; title: string }[] = [
  { status: 'new', title: 'New' },
  { status: 'confirmed', title: 'Confirmed' },
  { status: 'preparing', title: 'Preparing' },
  { status: 'ready', title: 'Ready' },
];

/** Kitchen board: items, table/pickup and one-tap progress. No prices, no customer details. */
export function KitchenTab({ onChanged }: Common) {
  const { data, error, refresh } = usePolling(() => adm<{ orders: AdminOrder[] }>('GET', '/orders?active=1&limit=150'), 4000);
  const [err, setErr] = useState('');
  const advance = async (o: AdminOrder) => {
    const next = NEXT_ACTION[o.status];
    if (!next) return;
    setErr('');
    try {
      await adm('POST', `/orders/${o.orderId}/status`, { to: next.to });
      refresh();
      onChanged();
    } catch (e) {
      setErr(e instanceof AdminApiError ? e.message : 'Failed.');
      refresh();
    }
  };
  return (
    <section aria-labelledby="kitchen-h">
      <h2 id="kitchen-h">Kitchen</h2>
      {(error || err) && <p className="form-error">{error || err}</p>}
      <div className="adm-kitchen">
        {KITCHEN_COLUMNS.map((col) => {
          const orders = (data?.orders ?? []).filter((o) => o.status === col.status).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          return (
            <div key={col.status} className="adm-col">
              <h3>
                {col.title} <span className="adm-badge">{orders.length}</span>
              </h3>
              {orders.map((o) => (
                <article key={o.orderId} className="adm-ticket">
                  <p className="adm-ticket__head">
                    <strong dir="ltr">{o.orderId.slice(-3)}</strong> · {o.orderType === 'dine-in' ? `Table ${o.tableNumber}` : `Takeaway${o.pickupInMinutes ? ` +${o.pickupInMinutes}m` : ''}`}
                  </p>
                  <ul>
                    {o.items.map((i) => (
                      <li key={i.itemId}>
                        <strong>{i.quantity}×</strong> {i.name} <span lang="zh-Hans">{i.chineseName}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="adm-meta">{new Date(o.createdAt).toLocaleTimeString()}</p>
                  {NEXT_ACTION[o.status] && (
                    <button className="btn btn--primary btn--block" onClick={() => advance(o)}>
                      {NEXT_ACTION[o.status]!.label}
                    </button>
                  )}
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ApprovalsTab({ user, onChanged }: Common) {
  const { data, error, refresh } = usePolling(() => adm<{ approvals: Approval[] }>('GET', '/approvals'), 6000);
  const [err, setErr] = useState('');
  const decide = async (a: Approval, approve: boolean) => {
    setErr('');
    try {
      await adm('POST', `/approvals/${a.id}/decision`, { approve });
      refresh();
      onChanged();
    } catch (e) {
      setErr(e instanceof AdminApiError ? e.message : 'Failed.');
    }
  };
  return (
    <section aria-labelledby="appr-h">
      <h2 id="appr-h">Approvals</h2>
      <p className="muted">Actions the system will never take on its own. Cancelling an order after staff accepted it needs a manager's decision.</p>
      {(error || err) && <p className="form-error">{error || err}</p>}
      {data?.approvals.length === 0 && <p className="muted">Nothing is waiting for approval.</p>}
      <ul className="adm-list">
        {data?.approvals.map((a) => (
          <li key={a.id} className="panel">
            <p>
              <strong dir="ltr">{a.orderId}</strong> — cancellation requested by {a.requestedBy} ({when(a.createdAt)})
            </p>
            <p>“{a.reason}”</p>
            {user.role === 'manager' ? (
              <div className="adm-row">
                <button className="btn btn--primary btn--sm" onClick={() => decide(a, true)}>
                  Approve cancellation
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => decide(a, false)}>
                  Reject
                </button>
              </div>
            ) : (
              <p className="muted">Only a manager can decide.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
