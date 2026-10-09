/**
 * Create or reset a staff account (there is deliberately no web sign-up).
 *
 *   STAFF_PASSWORD='…' npm run staff:create -- --username amy --role staff
 *   printf '%s' "$PW" | npm run staff:create -- --username boss --role manager --password-stdin
 *
 * The password is never accepted as a command-line argument (it would land in shell history / process lists).
 */
import { readFileSync } from 'node:fs';
import { loadConfig } from '../server/config';
import { openDb } from '../server/db';
import type { Deps, Role } from '../server/deps';
import { RateLimiter } from '../server/lib/security';
import { AuthError, createStaffUser } from '../server/modules/auth';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const username = arg('username');
const role = (arg('role') ?? 'staff') as Role;
const password = process.argv.includes('--password-stdin') ? readFileSync(0, 'utf8').replace(/\r?\n$/, '') : process.env.STAFF_PASSWORD;

if (!username || !password) {
  console.error('Usage: STAFF_PASSWORD=… staff:create -- --username <name> [--role staff|manager]   (or --password-stdin)');
  process.exit(2);
}

const config = loadConfig(process.env);
const db = openDb(config.databasePath);
const deps: Deps = { config, db, now: () => new Date(), limiter: new RateLimiter(), llm: null, channels: [] };
try {
  const user = createStaffUser(deps, { username, password, role });
  console.log(`Created ${user.role} account "${user.username}".`);
} catch (e) {
  console.error(e instanceof AuthError ? e.message : e);
  process.exit(1);
} finally {
  db.close();
}
