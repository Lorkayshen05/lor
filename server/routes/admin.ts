import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import type { Actor, Deps, Role } from '../deps';
import { clientIp, errorResponse } from '../lib/http';
import { isDate } from '../lib/time';
import { AUTOMATIONS, countFailedRuns, listRuns } from '../modules/automation';
import { login, logout, sessionUser } from '../modules/auth';
import { getMenu, setAvailability } from '../modules/menu';
import { getIntegrationStatuses, listNotifications, retryNotification, testChannel } from '../modules/notifications/dispatcher';
import { decideApproval, getOrderDetail, listApprovals, listOrders, requestCancellation, transitionOrder } from '../modules/orders';
import { generateReport, getReport, listReports } from '../modules/reports';
import { one } from '../db';

const COOKIE = 'rdh_staff';
type Env = { Variables: { user: Actor } };

const OrderStatus = z.enum(['new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']);

export function adminRoutes(deps: Deps): Hono<Env> {
  const r = new Hono<Env>();
  const ip = (c: Context) => clientIp(c, deps.config.trustProxy);

  /** Cookie auth + CSRF defence-in-depth (SameSite=Strict cookie, custom header, same-origin Origin check). */
  const csrf: MiddlewareHandler = async (c, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
      if (c.req.header('x-requested-with') !== 'ruby-admin') return c.json({ error: { code: 'CSRF', message: 'Missing request header.' } }, 403);
      const origin = c.req.header('origin');
      if (origin) {
        const host = (deps.config.trustProxy ? c.req.header('x-forwarded-host') : undefined) ?? c.req.header('host');
        if (!host || new URL(origin).host !== host) return c.json({ error: { code: 'CSRF', message: 'Cross-origin request blocked.' } }, 403);
      }
    }
    await next();
  };
  r.use('*', csrf);

  const auth = (role?: Role): MiddlewareHandler<Env> => async (c, next) => {
    const user = sessionUser(deps, getCookie(c, COOKIE));
    if (!user) return c.json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } }, 401);
    if (role && user.role !== role) return c.json({ error: { code: 'FORBIDDEN', message: 'This action needs a manager.' } }, 403);
    c.set('user', user);
    c.header('Cache-Control', 'no-store');
    await next();
  };
  const manager = auth('manager');

  /* ---------- session ---------- */
  r.post('/login', async (c) => {
    const body = z.object({ username: z.string().max(64), password: z.string().max(200) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: { code: 'INVALID_REQUEST', message: 'Enter a username and password.' } }, 422);
    try {
      const s = login(deps, body.data.username, body.data.password, ip(c));
      setCookie(c, COOKIE, s.token, { httpOnly: true, sameSite: 'Strict', secure: deps.config.isProd, path: '/', maxAge: deps.config.sessionHours * 3600 });
      return c.json({ user: s.user });
    } catch (e) {
      return errorResponse(c, e);
    }
  });
  r.post('/logout', (c) => {
    logout(deps, getCookie(c, COOKIE));
    deleteCookie(c, COOKIE, { path: '/' });
    return c.json({ ok: true });
  });
  r.get('/me', auth(), (c) => c.json({ user: c.get('user') }));

  /* ---------- dashboard summary (alerts) ---------- */
  r.get('/summary', auth(), (c) => {
    const n = (sql: string) => one<{ n: number }>(deps.db, sql)?.n ?? 0;
    return c.json({
      newOrders: n("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'"),
      activeOrders: n("SELECT COUNT(*) AS n FROM orders WHERE status IN ('new','confirmed','preparing','ready')"),
      failedNotifications: n("SELECT COUNT(*) AS n FROM notifications WHERE status = 'failed'"),
      pendingNotifications: n("SELECT COUNT(*) AS n FROM notifications WHERE status = 'pending'"),
      pendingApprovals: n("SELECT COUNT(*) AS n FROM approval_requests WHERE status = 'pending'"),
      failedRuns: countFailedRuns(deps),
      serverTime: deps.now().toISOString(),
    });
  });

  /* ---------- orders ---------- */
  r.get('/orders', auth(), (c) => {
    const date = c.req.query('date');
    if (date && !isDate(date)) return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid date.' } }, 422);
    const status = c.req.query('status');
    if (status && !OrderStatus.safeParse(status).success) return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid status.' } }, 422);
    return c.json({ orders: listOrders(deps, { status, date, active: c.req.query('active') === '1', limit: Number(c.req.query('limit')) || 100 }) });
  });
  r.get('/orders/:id', auth(), (c) => {
    const o = getOrderDetail(deps, c.req.param('id'));
    return o ? c.json({ order: o }) : c.json({ error: { code: 'NOT_FOUND', message: 'No such order.' } }, 404);
  });
  r.post('/orders/:id/status', auth(), async (c) => {
    const body = z.object({ to: OrderStatus, note: z.string().max(300).optional() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid status change.' } }, 422);
    try {
      return c.json({ order: transitionOrder(deps, c.req.param('id'), body.data.to, c.get('user'), body.data.note) });
    } catch (e) {
      return errorResponse(c, e);
    }
  });
  r.post('/orders/:id/cancel-request', auth(), async (c) => {
    const body = z.object({ reason: z.string().max(300) }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: { code: 'INVALID_REQUEST', message: 'A reason is required.' } }, 422);
    try {
      return c.json(requestCancellation(deps, c.req.param('id'), c.get('user'), body.data.reason), 201);
    } catch (e) {
      return errorResponse(c, e);
    }
  });

  /* ---------- approvals (Level C) ---------- */
  r.get('/approvals', auth(), (c) => c.json({ approvals: listApprovals(deps, c.req.query('status') === 'approved' ? 'approved' : c.req.query('status') === 'rejected' ? 'rejected' : 'pending') }));
  r.post('/approvals/:id/decision', manager, async (c) => {
    const body = z.object({ approve: z.boolean(), note: z.string().max(300).optional() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid decision.' } }, 422);
    try {
      return c.json({ order: decideApproval(deps, c.req.param('id'), c.get('user'), body.data.approve, body.data.note) });
    } catch (e) {
      return errorResponse(c, e);
    }
  });

  /* ---------- automation log, notifications ---------- */
  r.get('/automation/runs', auth(), (c) => c.json({ runs: listRuns(deps, { outcome: c.req.query('outcome') || undefined, limit: Number(c.req.query('limit')) || 100 }), catalogue: AUTOMATIONS }));
  r.get('/notifications', auth(), (c) => c.json({ notifications: listNotifications(deps, { status: c.req.query('status') || undefined }) }));
  r.post('/notifications/:id/retry', auth(), async (c) => {
    const result = await retryNotification(deps, c.req.param('id'), c.get('user').username);
    if (result === 'not_found') return c.json({ error: { code: 'NOT_FOUND', message: 'No such notification.' } }, 404);
    if (result === 'not_retryable') return c.json({ error: { code: 'ALREADY_SENT', message: 'This notification was already delivered.' } }, 409);
    return c.json({ result });
  });

  /* ---------- integrations ---------- */
  r.get('/integrations', auth(), (c) => c.json({ integrations: getIntegrationStatuses(deps) }));
  r.post('/integrations/:id/test', manager, async (c) => c.json(await testChannel(deps, c.req.param('id'), c.get('user').username)));

  /* ---------- reports ---------- */
  r.get('/reports', auth(), (c) => c.json({ reports: listReports(deps, Number(c.req.query('limit')) || 20) }));
  r.get('/reports/:id', auth(), (c) => {
    const rep = getReport(deps, c.req.param('id'));
    return rep ? c.json({ report: rep }) : c.json({ error: { code: 'NOT_FOUND', message: 'No such report.' } }, 404);
  });
  r.post('/reports', auth(), async (c) => {
    const body = z.object({ period: z.enum(['day', 'week', 'month']), date: z.string().optional(), ai: z.boolean().optional() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success || (body.data.date && !isDate(body.data.date))) return c.json({ error: { code: 'INVALID_REQUEST', message: 'Choose a period and a valid date.' } }, 422);
    return c.json({ report: await generateReport(deps, { period: body.data.period, date: body.data.date, by: c.get('user').username, withAi: body.data.ai }) }, 201);
  });

  /* ---------- availability (operational switch; prices are never editable here) ---------- */
  r.get('/menu', auth(), (c) => c.json({ menu: getMenu(deps).map((m) => ({ id: m.id, productCode: m.productCode, name: m.name, chineseName: m.chineseName, available: m.available })) }));
  r.post('/menu/:id/availability', manager, async (c) => {
    const body = z.object({ available: z.boolean() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: { code: 'INVALID_REQUEST', message: 'Invalid request.' } }, 422);
    return setAvailability(deps, c.req.param('id'), body.data.available, c.get('user').username)
      ? c.json({ ok: true })
      : c.json({ error: { code: 'NOT_FOUND', message: 'No such menu item.' } }, 404);
  });

  return r;
}
