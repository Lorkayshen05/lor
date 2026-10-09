import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { API_BASE } from '../services/api';
import { adm, AdminApiError, type AdminUser, type Integration, type Summary } from './adminApi';
import { ApprovalsTab, KitchenTab, OrdersTab, usePolling } from './AdminOrders';
import { AutomationTab, IntegrationsTab, MenuTab, ReportsTab } from './AdminOps';
import './admin.css';

function Login({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      onLogin((await adm<{ user: AdminUser }>('POST', '/login', { username, password })).user);
    } catch (x) {
      setErr(x instanceof AdminApiError ? x.message : 'Could not sign in.');
      setBusy(false);
    }
  };
  return (
    <main className="adm adm-login">
      <h1>Staff sign-in</h1>
      <form onSubmit={submit} className="checkout__form">
        <div className="field">
          <label htmlFor="adm-user">Username</label>
          <input id="adm-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </div>
        <div className="field">
          <label htmlFor="adm-pass">Password</label>
          <input id="adm-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {err && (
          <p className="form-error" role="alert">
            {err}
          </p>
        )}
        <button className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <Link to="/" className="btn btn--link">
          Back to the menu
        </Link>
      </form>
    </main>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => void ctx.close();
  } catch {
    /* audio unavailable */
  }
}

// NOTE: links here are absolute on purpose. Inside the `admin/*` splat route, relative links resolve against the current
// path (…/orders + "automation"), which the catch-all then extended without end.
function Shell({ user, onLogout }: { user: AdminUser; onLogout: () => void }) {
  const { data: summary, error, refresh } = usePolling(() => adm<Summary>('GET', '/summary'), 5000);
  const integrations = usePolling(() => adm<{ integrations: Integration[] }>('GET', '/integrations'), 30_000);
  const [sound, setSound] = useState(false);
  const lastNew = useRef<number | null>(null);
  const baseTitle = useRef(document.title);

  // New-order alert: visible in the tab title and (if switched on) audible.
  useEffect(() => {
    if (!summary) return;
    const prev = lastNew.current;
    if (prev !== null && summary.newOrders > prev && sound) beep();
    lastNew.current = summary.newOrders;
    document.title = summary.newOrders > 0 ? `(${summary.newOrders}) New order — Ruby staff` : baseTitle.current;
  }, [summary, sound]);
  useEffect(() => () => void (document.title = baseTitle.current), []);

  const aiAvailable = integrations.data?.integrations.find((i) => i.id === 'ai')?.configured ?? false;
  const common = { user, onChanged: refresh };
  const badge = (n?: number) => (n ? <span className="adm-count">{n}</span> : null);

  return (
    <div className="adm">
      <header className="adm-head">
        <h1>Ruby staff</h1>
        <div className="adm-row">
          <label className="adm-check">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sound on new order
          </label>
          <span className="muted">
            {user.username} ({user.role})
          </span>
          <button className="btn btn--ghost btn--sm" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      {error && <p className="form-error">{error}</p>}
      {summary && summary.newOrders > 0 && (
        <p className="adm-alert" role="status">
          {summary.newOrders} new order{summary.newOrders > 1 ? 's' : ''} waiting
        </p>
      )}
      {summary && summary.failedNotifications > 0 && (
        <p className="adm-alert adm-alert--warn" role="alert">
          {summary.failedNotifications} staff notification(s) failed to send — see Automation to retry.
        </p>
      )}
      <nav aria-label="Staff sections" className="adm-nav">
        <NavLink to="/admin/orders">Orders {badge(summary?.newOrders)}</NavLink>
        <NavLink to="/admin/kitchen">Kitchen</NavLink>
        <NavLink to="/admin/approvals">Approvals {badge(summary?.pendingApprovals)}</NavLink>
        <NavLink to="/admin/automation">Automation {badge(summary?.failedNotifications || summary?.failedRuns)}</NavLink>
        <NavLink to="/admin/reports">Reports</NavLink>
        <NavLink to="/admin/integrations">Integrations</NavLink>
        <NavLink to="/admin/menu">Availability</NavLink>
      </nav>
      <Routes>
        <Route index element={<Navigate to="/admin/orders" replace />} />
        <Route path="orders" element={<OrdersTab {...common} />} />
        <Route path="kitchen" element={<KitchenTab {...common} />} />
        <Route path="approvals" element={<ApprovalsTab {...common} />} />
        <Route path="automation" element={<AutomationTab />} />
        <Route path="reports" element={<ReportsTab aiAvailable={aiAvailable} />} />
        <Route path="integrations" element={<IntegrationsTab user={user} />} />
        <Route path="menu" element={<MenuTab user={user} />} />
        <Route path="*" element={<Navigate to="/admin/orders" replace />} />
      </Routes>
    </div>
  );
}

export default function AdminApp() {
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);
  const check = useCallback(() => {
    adm<{ user: AdminUser }>('GET', '/me').then(
      (r) => setUser(r.user),
      () => setUser(null),
    );
  }, []);
  useEffect(() => {
    if (API_BASE) check();
  }, [check]);

  if (!API_BASE) {
    return (
      <main className="adm adm-login">
        <h1>Staff dashboard</h1>
        <p className="notice notice--warn">This build is not connected to an ordering server, so there is nothing to manage. Build with VITE_ORDER_API=/api and run the server (see docs/AUTOMATION.md).</p>
        <Link to="/" className="btn btn--link">
          Back to the menu
        </Link>
      </main>
    );
  }
  if (user === undefined) return <main className="adm adm-login"><p>Loading…</p></main>;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <Shell
      user={user}
      onLogout={() => {
        void adm('POST', '/logout', {}).finally(() => setUser(null));
      }}
    />
  );
}
