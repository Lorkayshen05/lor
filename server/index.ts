import { existsSync, readFileSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app';
import { ConfigError, loadConfig } from './config';
import { openDb } from './db';
import type { Deps } from './deps';
import { RateLimiter } from './lib/security';
import { createAnthropicLlm } from './modules/ai/llm';
import { menuIsSample } from './modules/menu';
import { createChannels } from './modules/notifications/channels';
import { startWorker } from './worker';

/** Minimal .env loader (no dependency). Real environment variables win over the file. */
function loadDotEnv(path = '.env'): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2]!.replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]!] === undefined) process.env[m[1]!] = value;
  }
}

async function main() {
  loadDotEnv();
  let config;
  try {
    config = loadConfig(process.env);
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(`Configuration error: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }

  const db = openDb(config.databasePath);
  const deps: Deps = { config, db, now: () => new Date(), limiter: new RateLimiter(), llm: createAnthropicLlm(config), channels: createChannels(config) };
  const worker = startWorker(deps);
  const app = createApp(deps);

  // Production: serve the built front end from the same origin (so cookies and /api need no CORS).
  if (existsSync('./dist/index.html')) {
    app.use('/*', serveStatic({ root: './dist' }));
    app.get('*', serveStatic({ path: './dist/index.html' }));
  }

  const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`Ruby Dessert House server listening on :${info.port} (${config.env})`);
    if (menuIsSample()) console.warn(config.isProd && !config.allowSampleMenu ? '⚠ Sample menu loaded: ordering is DISABLED in production until the real menu is added.' : '⚠ Sample menu loaded: orders are test data.');
    const on = deps.channels.filter((c) => c.isConfigured()).map((c) => c.id);
    console.log(`Notification channels configured: ${on.length ? on.join(', ') : 'none (dashboard alerts only)'}; AI guide: ${config.ai.enabled ? config.ai.model : 'off'}`);
  });

  const shutdown = () => {
    worker.stop();
    server.close(() => {
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void main();
