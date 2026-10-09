import type { Config } from './config';
import type { Db } from './db';
import type { RateLimiter } from './lib/security';
import type { LlmClient } from './modules/ai/llm';
import type { Channel } from './modules/notifications/channels';

/** Everything the server modules need, injected so tests can supply a clock, an in-memory DB and fake providers. */
export interface Deps {
  config: Config;
  db: Db;
  now: () => Date;
  limiter: RateLimiter;
  /** null when no AI provider is configured. */
  llm: LlmClient | null;
  channels: Channel[];
  /** Set by the worker: asks it to deliver pending notifications now instead of waiting for the next tick. */
  kick?: () => void;
}

export type Role = 'staff' | 'manager';
export interface Actor {
  id: string;
  username: string;
  role: Role;
}
export const SYSTEM_ACTOR = 'system';
