import { loadConfig } from '../config';
import { openDb } from '../db';
import type { Actor, Deps } from '../deps';
import { RateLimiter } from '../lib/security';
import type { LlmClient, LlmResult } from '../modules/ai/llm';
import { createStaffUser } from '../modules/auth';
import type { Channel, ChannelId, NotificationMessage } from '../modules/notifications/channels';
import type { OrderRequest } from '../modules/orders';
import { createApp } from '../app';

export const SECRET = 'test-secret-test-secret-test-secret-0123456789';

export interface FakeChannel extends Channel {
  sent: NotificationMessage[];
  /** Number of upcoming sends that should fail. Infinity = always fail. */
  failures: number;
  error: string;
  configured: boolean;
}

export function fakeChannel(id: ChannelId, configured = true): FakeChannel {
  const ch: FakeChannel = {
    id,
    label: id,
    sent: [],
    failures: 0,
    error: 'provider unavailable',
    configured,
    isConfigured: () => ch.configured,
    async send(msg) {
      if (ch.failures > 0) {
        ch.failures -= 1;
        throw new Error(ch.error);
      }
      ch.sent.push(msg);
    },
  };
  return ch;
}

export interface FakeLlm extends LlmClient {
  calls: { system: string; user: string }[];
  reply: unknown;
  failWith: string | null;
}

export function fakeLlm(reply: unknown = null): FakeLlm {
  const llm: FakeLlm = {
    model: 'fake-model',
    calls: [],
    reply,
    failWith: null,
    async parse<T>(args: { system: string; user: string; schema: { safeParse: (v: unknown) => { success: boolean; data?: T } } }): Promise<LlmResult<T>> {
      llm.calls.push({ system: args.system, user: args.user });
      if (llm.failWith) return { ok: false, error: llm.failWith };
      const parsed = args.schema.safeParse(llm.reply);
      return parsed.success ? { ok: true, data: parsed.data as T, usage: { inputTokens: 1, outputTokens: 1 } } : { ok: false, error: 'The AI answer did not match the expected format.' };
    },
    async ping() {
      if (llm.failWith) throw new Error(llm.failWith);
    },
  };
  return llm;
}

export function makeDeps(opts: { env?: Record<string, string>; now?: string; channels?: Channel[]; llm?: LlmClient | null } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', ORDER_TOKEN_SECRET: SECRET, ...opts.env });
  const clock = { t: new Date(opts.now ?? '2025-06-10T04:00:00Z') }; // 12:00 in Kuala Lumpur
  const deps: Deps = {
    config,
    db: openDb(':memory:'),
    now: () => new Date(clock.t),
    limiter: new RateLimiter(),
    llm: opts.llm ?? null,
    channels: opts.channels ?? [],
  };
  return { deps, clock, advance: (ms: number) => (clock.t = new Date(clock.t.getTime() + ms)) };
}

export const staff = (deps: Deps, username = 'amy'): Actor => createStaffUser(deps, { username, password: 'correct-horse-battery', role: 'staff' });
export const manager = (deps: Deps, username = 'boss'): Actor => createStaffUser(deps, { username, password: 'correct-horse-battery', role: 'manager' });

let n = 0;
export const newKey = () => `test-key-${++n}-${Math.random().toString(36).slice(2, 8)}`;

export const orderBody = (over: Partial<OrderRequest> = {}): OrderRequest => ({
  items: [{ itemId: 'black-sesame-paste', quantity: 2 }],
  orderType: 'dine-in',
  tableNumber: 'A12',
  contact: { name: '', phone: '' },
  ...over,
});

/** Drive the real HTTP app in-process (no sockets). */
export function api(deps: Deps) {
  const app = createApp(deps);
  return {
    app,
    async req(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string>; cookie?: string } = {}) {
      const res = await app.request(path, {
        method,
        headers: { 'content-type': 'application/json', ...(opts.cookie ? { cookie: opts.cookie } : {}), ...opts.headers },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      });
      const text = await res.text();
      return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
    },
    async signIn(username: string, password = 'correct-horse-battery') {
      const res = await app.request('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'ruby-admin' }, body: JSON.stringify({ username, password }) });
      const cookie = res.headers.get('set-cookie')?.split(';')[0] ?? '';
      return { status: res.status, cookie };
    },
  };
}
export const ADMIN = { 'x-requested-with': 'ruby-admin' };
