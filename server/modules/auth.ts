import { all, one, run } from '../db';
import type { Actor, Deps, Role } from '../deps';
import { hashPassword, newToken, sha256, uid, verifyDummy, verifyPassword } from '../lib/security';

export class AuthError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    message: string,
    public retryAfterSec?: number,
  ) {
    super(message);
  }
}

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const MIN_PASSWORD = 12;

export function createStaffUser(deps: Deps, input: { username: string; password: string; role: Role }): Actor {
  const username = input.username.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new AuthError('INVALID_USERNAME', 422, 'Username must be 3–32 characters: letters, digits, dot, dash or underscore.');
  if (input.password.length < MIN_PASSWORD) throw new AuthError('WEAK_PASSWORD', 422, `Password must be at least ${MIN_PASSWORD} characters.`);
  if (!['staff', 'manager'].includes(input.role)) throw new AuthError('INVALID_ROLE', 422, 'Role must be staff or manager.');
  if (one(deps.db, 'SELECT 1 AS x FROM staff_users WHERE username = ?', username)) throw new AuthError('USERNAME_TAKEN', 409, 'That username already exists.');
  const id = uid('usr');
  run(deps.db, 'INSERT INTO staff_users (id, username, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)', id, username, hashPassword(input.password), input.role, deps.now().toISOString());
  return { id, username, role: input.role };
}

export function setStaffActive(deps: Deps, username: string, active: boolean): boolean {
  const r = run(deps.db, 'UPDATE staff_users SET active = ? WHERE username = ?', active ? 1 : 0, username.toLowerCase());
  if (!active) run(deps.db, 'DELETE FROM sessions WHERE user_id IN (SELECT id FROM staff_users WHERE username = ?)', username.toLowerCase());
  return Number(r.changes) === 1;
}

export function login(deps: Deps, username: string, password: string, ip: string): { token: string; user: Actor; expiresAt: string } {
  const uname = username.trim().toLowerCase().slice(0, 64);
  const win = 15 * 60_000;
  const byIp = deps.limiter.check(`login:ip:${ip}`, 20, win, deps.now().getTime());
  const byUser = deps.limiter.check(`login:user:${uname}`, 5, win, deps.now().getTime());
  if (!byIp.allowed || !byUser.allowed) {
    throw new AuthError('RATE_LIMITED', 429, 'Too many sign-in attempts. Please wait and try again.', Math.max(byIp.retryAfterSec, byUser.retryAfterSec));
  }
  const row = one<{ id: string; username: string; password_hash: string; role: Role; active: number }>(deps.db, 'SELECT id, username, password_hash, role, active FROM staff_users WHERE username = ?', uname);
  const valid = row ? verifyPassword(password, row.password_hash) : verifyDummy(password);
  // Same message for unknown user, wrong password and disabled account.
  if (!row || !valid || row.active !== 1) throw new AuthError('INVALID_CREDENTIALS', 401, 'Invalid username or password.');

  const token = newToken();
  const now = deps.now();
  const expiresAt = new Date(now.getTime() + deps.config.sessionHours * 3_600_000).toISOString();
  run(deps.db, 'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', sha256(token), row.id, now.toISOString(), expiresAt);
  run(deps.db, 'UPDATE staff_users SET last_login_at = ? WHERE id = ?', now.toISOString(), row.id);
  return { token, user: { id: row.id, username: row.username, role: row.role }, expiresAt };
}

export function sessionUser(deps: Deps, token: string | undefined): Actor | null {
  if (!token) return null;
  const row = one<{ id: string; username: string; role: Role; active: number; expires_at: string }>(
    deps.db,
    'SELECT u.id, u.username, u.role, u.active, s.expires_at FROM sessions s JOIN staff_users u ON u.id = s.user_id WHERE s.token_hash = ?',
    sha256(token),
  );
  if (!row || row.active !== 1 || row.expires_at <= deps.now().toISOString()) return null;
  return { id: row.id, username: row.username, role: row.role };
}

export function logout(deps: Deps, token: string | undefined): void {
  if (token) run(deps.db, 'DELETE FROM sessions WHERE token_hash = ?', sha256(token));
}

export const listStaff = (deps: Deps) =>
  all<{ username: string; role: Role; active: number; last_login_at: string | null }>(deps.db, 'SELECT username, role, active, last_login_at FROM staff_users ORDER BY username');
