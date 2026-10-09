import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS } from './migrations';

export type Db = DatabaseSync;

export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

export function migrate(db: Db): number[] {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const done = new Set((db.prepare('SELECT id FROM schema_migrations').all() as { id: number }[]).map((r) => r.id));
  const applied: number[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      db.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)').run(m.id, m.name, new Date().toISOString());
      db.exec('COMMIT');
      applied.push(m.id);
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return applied;
}

/** Run `fn` atomically. BEGIN IMMEDIATE takes the write lock up front so concurrent order numbering can't race. */
export function tx<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const all = <T>(db: Db, sql: string, ...params: (string | number | null)[]): T[] =>
  db.prepare(sql).all(...params) as T[];
export const one = <T>(db: Db, sql: string, ...params: (string | number | null)[]): T | undefined =>
  db.prepare(sql).get(...params) as T | undefined;
export const run = (db: Db, sql: string, ...params: (string | number | null)[]) => db.prepare(sql).run(...params);
