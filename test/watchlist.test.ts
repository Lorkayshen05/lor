import { newDb } from "pg-mem";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PgAnalysisRepository, PgWatchlistRepository } from "../src/store/pg";
import { ANALYSIS_FIXTURES } from "../src/store/analysis-fixtures";
import { makeApp } from "./helpers";

const A = { authorization: "Bearer tok-alice" };
const B = { authorization: "Bearer tok-bob" };

async function flow(app: ReturnType<typeof makeApp>["app"]) {
  const call = async (method: "GET" | "POST" | "DELETE", url: string, headers: Record<string, string> = A) => {
    const r = await app.inject({ method, url: `/api/v1${url}`, headers });
    return { status: r.statusCode, body: r.json() as any };
  };
  expect((await call("GET", "/watchlist")).body.data).toEqual([]);

  const add = await call("POST", "/watchlist/nvda");
  expect(add.status).toBe(201);
  expect(add.body.data).toMatchObject({ ticker: "NVDA", name: "NVIDIA Corporation" });
  expect(add.body.data.price.value).toBeGreaterThan(0);

  expect((await call("POST", "/watchlist/NVDA")).status).toBe(409);
  expect((await call("POST", "/watchlist/ZZZZ")).status).toBe(404);
  await call("POST", "/watchlist/SPOT");

  const list = await call("GET", "/watchlist");
  expect(list.body.data.map((i: any) => i.ticker)).toEqual(["NVDA", "SPOT"]);

  // isolation between users
  expect((await call("GET", "/watchlist", B)).body.data).toEqual([]);
  expect((await call("DELETE", "/watchlist/NVDA", B)).status).toBe(404);

  expect((await call("DELETE", "/watchlist/NVDA")).body.data).toEqual({ ticker: "NVDA", removed: true });
  expect((await call("DELETE", "/watchlist/NVDA")).status).toBe(404);
  expect((await call("GET", "/watchlist")).body.data.map((i: any) => i.ticker)).toEqual(["SPOT"]);
}

describe("watchlist", () => {
  it("requires a bearer token (401)", async () => {
    const { app } = makeApp();
    for (const headers of [{}, { authorization: "Bearer nope" }, { authorization: "Basic abc" }]) {
      const r = await app.inject({ url: "/api/v1/watchlist", headers });
      expect(r.statusCode).toBe(401);
      expect(r.json()).toEqual({ data: null, error: { code: "UNAUTHORIZED", message: expect.any(String) } });
    }
  });

  it("full flow on the in-memory repository", async () => {
    const { app } = makeApp();
    await flow(app);
  });

  it("full flow on PostgreSQL (pg-mem) using db/schema.sql", async () => {
    const db = newDb();
    db.public.none(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
    const { Pool } = db.adapters.createPg();
    const pool = new Pool();
    const { app } = makeApp({ deps: { watchlistRepo: new PgWatchlistRepository(pool) } });
    await flow(app);
    await pool.end();
  });

  it("PgAnalysisRepository validates stored JSON on read", async () => {
    const db = newDb();
    db.public.none(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
    const { Pool } = db.adapters.createPg();
    const pool = new Pool();
    const nvda = ANALYSIS_FIXTURES.find((a) => a.ticker === "NVDA")!;
    await pool.query("insert into analyses (ticker, updated_at, body) values ($1, $2, $3)", ["NVDA", nvda.updatedAt, JSON.stringify(nvda)]);
    await pool.query("insert into analyses (ticker, updated_at, body) values ($1, $2, $3)", ["BAD", nvda.updatedAt, JSON.stringify({ ticker: "BAD" })]);
    const repo = new PgAnalysisRepository(pool);
    expect((await repo.get("NVDA"))?.ticker).toBe("NVDA");
    expect(await repo.get("AAPL")).toBeNull();
    await expect(repo.get("BAD")).rejects.toThrow();
    await pool.end();
  });
});
