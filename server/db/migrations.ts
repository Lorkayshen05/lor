/**
 * Schema migrations, embedded as strings so the bundled server has no files to ship alongside it.
 * Append new migrations; never edit one that has been applied in production.
 */
export const MIGRATIONS: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: 'initial',
    sql: `
CREATE TABLE orders (
  id               TEXT PRIMARY KEY,
  business_date    TEXT NOT NULL,
  seq              INTEGER NOT NULL,
  idempotency_key  TEXT NOT NULL UNIQUE,
  request_hash     TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('new','confirmed','preparing','ready','completed','cancelled')),
  order_type       TEXT NOT NULL CHECK (order_type IN ('dine-in','takeaway')),
  table_number     TEXT,
  pickup_in_minutes INTEGER,
  total            INTEGER NOT NULL CHECK (total >= 0),
  currency         TEXT NOT NULL DEFAULT 'MYR',
  customer_ref     TEXT,
  language         TEXT,
  menu_is_sample   INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  UNIQUE (business_date, seq)
);
CREATE INDEX idx_orders_created ON orders (created_at);
CREATE INDEX idx_orders_status ON orders (status);

CREATE TABLE order_items (
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_no      INTEGER NOT NULL,
  item_id      TEXT NOT NULL,
  product_code TEXT NOT NULL,
  name         TEXT NOT NULL,
  chinese_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   INTEGER NOT NULL CHECK (unit_price >= 0),
  line_total   INTEGER NOT NULL CHECK (line_total >= 0),
  PRIMARY KEY (order_id, line_no)
);

-- Contact details live apart from the order so they can be purged on a schedule without touching sales data.
CREATE TABLE order_contacts (
  order_id     TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  name         TEXT,
  phone        TEXT,
  purge_after  TEXT NOT NULL,
  purged_at    TEXT
);

CREATE TABLE order_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  at          TEXT NOT NULL,
  actor       TEXT NOT NULL,
  type        TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT,
  note        TEXT
);
CREATE INDEX idx_events_order ON order_events (order_id);

CREATE TABLE notifications (
  id              TEXT PRIMARY KEY,
  order_id        TEXT REFERENCES orders(id) ON DELETE CASCADE,
  ref             TEXT,
  channel         TEXT NOT NULL CHECK (channel IN ('email','whatsapp','kds')),
  kind            TEXT NOT NULL CHECK (kind IN ('order_created','report','test')),
  status          TEXT NOT NULL CHECK (status IN ('pending','sent','failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  next_attempt_at TEXT,
  created_at      TEXT NOT NULL,
  sent_at         TEXT
);
CREATE INDEX idx_notif_due ON notifications (status, next_attempt_at);
CREATE INDEX idx_notif_order ON notifications (order_id);

CREATE TABLE staff_users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('staff','manager')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE automation_runs (
  id          TEXT PRIMARY KEY,
  automation  TEXT NOT NULL,
  level       TEXT NOT NULL CHECK (level IN ('A','B','C')),
  trigger     TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  outcome     TEXT NOT NULL CHECK (outcome IN ('running','ok','failed','skipped')),
  error       TEXT,
  order_id    TEXT,
  ref         TEXT
);
CREATE INDEX idx_runs_started ON automation_runs (started_at);

CREATE TABLE approval_requests (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('cancel_order')),
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  requested_by  TEXT NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
  created_at    TEXT NOT NULL,
  decided_by    TEXT,
  decided_at    TEXT,
  decision_note TEXT
);

CREATE TABLE reports (
  id           TEXT PRIMARY KEY,
  period       TEXT NOT NULL CHECK (period IN ('day','week','month')),
  range_start  TEXT NOT NULL,
  range_end    TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  data_json    TEXT NOT NULL,
  summary_json TEXT NOT NULL
);

CREATE TABLE menu_availability (
  item_id    TEXT PRIMARY KEY,
  available  INTEGER NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE integration_status (
  channel        TEXT PRIMARY KEY,
  last_test_at   TEXT,
  last_test_ok   INTEGER,
  last_test_error TEXT
);
`,
  },
  {
    id: 2,
    name: 'notification_lease',
    // Separates "being delivered right now" (lease) from "waiting for the next attempt" (next_attempt_at).
    sql: `ALTER TABLE notifications ADD COLUMN lease_until TEXT;`,
  },
];
