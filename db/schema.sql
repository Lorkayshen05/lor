-- PostgreSQL / Supabase schema for persistent data.
-- Provider data is cached in-memory/Redis; only durable, product-owned data lives here.

create table if not exists watchlist_items (
  user_id   text        not null,
  ticker    text        not null check (ticker = upper(ticker)),
  added_at  timestamptz not null default now(),
  primary key (user_id, ticker)
);
create index if not exists watchlist_items_user_added_idx on watchlist_items (user_id, added_at);

-- Curated analysis (business model, moats, risks, catalysts, sources), validated
-- with StoredAnalysisSchema on read. One row per ticker.
create table if not exists analyses (
  ticker     text primary key check (ticker = upper(ticker)),
  updated_at timestamptz not null,
  body       jsonb       not null
);

-- Optional durable snapshots of provider payloads, for audit/backfill and as a
-- warm start after deploys. Keyed by provider-independent dataset name.
create table if not exists provider_snapshots (
  dataset    text        not null,          -- e.g. 'statements:quarterly'
  ticker     text        not null,
  fetched_at timestamptz not null,
  provider   text        not null,
  payload    jsonb       not null,
  primary key (dataset, ticker, fetched_at)
);
create index if not exists provider_snapshots_latest_idx on provider_snapshots (dataset, ticker, fetched_at desc);
create index if not exists provider_snapshots_payload_gin on provider_snapshots using gin (payload jsonb_path_ops);
