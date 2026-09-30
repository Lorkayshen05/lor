import { hash32 } from "../../lib/hash";
import type { HistoryInterval, HistoryRange } from "../../contracts/market";
import type { MockCompany } from "./data";
import type { StatementPeriodDto } from "../types";

// ── deterministic pseudo-randomness ─────────────────────────────────────
/** Stable noise in [-1, 1] for a key. */
export const noise = (key: string): number => (hash32(key) / 0xffffffff) * 2 - 1;

// ── fiscal calendar ────────────────────────────────────────────────────
/** Latest quarter-end the mock "has reported" (fixed so fixtures are stable). */
const LATEST_REPORTED = { year: 2026, month: 6 };
const SEASON = [0.97, 0.99, 1.0, 1.04];

export interface QInfo {
  k: number;
  year: number;
  month: number;
  periodEnd: string;
  fiscalYear: number;
  fiscalQuarter: 1 | 2 | 3 | 4;
}

export function quarterInfo(fye: number, k: number): QInfo {
  // latest quarter-end month on or before LATEST_REPORTED
  let idx = LATEST_REPORTED.year * 12 + (LATEST_REPORTED.month - 1);
  while ((((idx % 12) + 1 - fye) % 3 + 3) % 3 !== 0) idx--;
  idx -= 3 * k;
  const year = Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  const rel = (((month - fye) % 12) + 12) % 12;
  const fiscalQuarter = (rel === 0 ? 4 : rel / 3) as 1 | 2 | 3 | 4;
  const fiscalYear = month > fye ? year + 1 : year;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const periodEnd = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { k, year, month, periodEnd, fiscalYear, fiscalQuarter };
}

// ── statements ──────────────────────────────────────────────────────────
export const QUARTERS_GENERATED = 48;

export interface QuarterRow extends StatementPeriodDto {
  _fq: 1 | 2 | 3 | 4;
}

export function generateQuarters(co: MockCompany): QuarterRow[] {
  const o = co.o ?? {};
  const fye = o.fye ?? 12;
  const growthFactor = (k: number) => Math.pow(1 + co.g, -k / 4);
  const raw = (k: number) => growthFactor(k) * SEASON[quarterInfo(fye, k).fiscalQuarter - 1]!;
  const base = (co.rev * 1e9) / [0, 1, 2, 3].reduce((a, k) => a + raw(k), 0);
  const capexPct = o.capex ?? 0.05;
  const taxRate = o.tax ?? 0.18;
  const bank = o.bank === true;
  const rows: QuarterRow[] = [];

  for (let k = 0; k < QUARTERS_GENERATED; k++) {
    const q = quarterInfo(fye, k);
    const n = (tag: string) => noise(`${co.t}:${k}:${tag}`);
    const revenue = base * raw(k) * (1 + 0.01 * n("rev"));
    const drift = Math.max(0.5, 1 - 0.02 * (k / 4));
    const gm = co.gm === null ? null : co.gm * drift * (1 + 0.01 * n("gm"));
    const om = co.om * drift * (1 + 0.015 * n("om"));
    const nm = co.nm * drift * (1 + 0.015 * n("nm"));
    const opInc = revenue * om;
    const netInc = revenue * nm;
    const da = revenue * 0.035;
    const shares = co.sh * 1e9 * (1 + 0.004 * k);
    const annual = base * 4 * growthFactor(k);
    const cash = bank ? null : (o.cash ?? 0.12) * annual;
    const debt = (o.debt ?? 0.15) * annual;
    const equity = (o.eq ?? 0.6) * annual;
    const ocf = netInc + da + revenue * 0.02;
    const cl = 0.14 * annual;

    rows.push({
      _fq: q.fiscalQuarter,
      fiscalYear: q.fiscalYear,
      fiscalQuarter: q.fiscalQuarter,
      periodEnd: q.periodEnd,
      revenue,
      grossProfit: gm === null ? null : revenue * gm,
      operatingIncome: opInc,
      ebitda: bank ? null : opInc + da,
      netIncome: netInc,
      epsDiluted: netInc / shares,
      dilutedShares: shares,
      effectiveTaxRate: taxRate,
      operatingCashFlow: ocf,
      capex: revenue * capexPct,
      cash,
      shortTermInvestments: cash === null ? null : cash * 0.3,
      totalDebt: debt,
      currentAssets: bank || cash === null ? null : (o.cr ?? 1.6) * cl,
      currentLiabilities: bank ? null : cl,
      totalEquity: equity,
      investedCapital: bank ? null : Math.max(equity + debt - (cash ?? 0) * 1.3, equity * 0.5),
    });
  }
  return rows;
}

const sumOrNull = (xs: Array<number | null>): number | null => (xs.every((x) => x !== null) ? (xs as number[]).reduce((a, b) => a + b, 0) : null);

/** Aggregate complete fiscal years from the quarter series (newest first). */
export function generateAnnual(quarters: QuarterRow[]): StatementPeriodDto[] {
  const byFy = new Map<number, QuarterRow[]>();
  for (const q of quarters) byFy.set(q.fiscalYear, [...(byFy.get(q.fiscalYear) ?? []), q]);
  const out: StatementPeriodDto[] = [];
  for (const [fy, qs] of [...byFy].sort((a, b) => b[0] - a[0])) {
    if (qs.length !== 4) continue;
    const q4 = qs.find((q) => q._fq === 4);
    if (!q4) continue;
    const f = <K extends keyof StatementPeriodDto>(key: K) => sumOrNull(qs.map((q) => q[key] as number | null));
    out.push({
      fiscalYear: fy,
      fiscalQuarter: null,
      periodEnd: q4.periodEnd,
      revenue: f("revenue"),
      grossProfit: f("grossProfit"),
      operatingIncome: f("operatingIncome"),
      ebitda: f("ebitda"),
      netIncome: f("netIncome"),
      epsDiluted: f("epsDiluted"),
      dilutedShares: sumOrNull(qs.map((q) => q.dilutedShares))! / 4,
      effectiveTaxRate: q4.effectiveTaxRate,
      operatingCashFlow: f("operatingCashFlow"),
      capex: f("capex"),
      cash: q4.cash,
      shortTermInvestments: q4.shortTermInvestments,
      totalDebt: q4.totalDebt,
      currentAssets: q4.currentAssets,
      currentLiabilities: q4.currentLiabilities,
      totalEquity: q4.totalEquity,
      investedCapital: q4.investedCapital,
    });
  }
  return out;
}

export const stripQuarter = ({ _fq, ...rest }: QuarterRow): StatementPeriodDto => rest;

// ── prices ──────────────────────────────────────────────────────────────
const DAY = 86_400_000;
export const SESSION_OPEN_MIN = 13 * 60 + 30; // 13:30Z
export const SESSION_MINUTES = 390;

const isWeekend = (dayNum: number) => {
  const wd = new Date(dayNum * DAY).getUTCDay();
  return wd === 0 || wd === 6;
};

/** Most recent completed-or-current trading day number (UTC days since epoch) for a moment. */
export function latestSessionDay(nowMs: number): number {
  let d = Math.floor(nowMs / DAY);
  // before the session opens, today has no data yet
  if (nowMs - d * DAY < SESSION_OPEN_MIN * 60_000) d--;
  while (isWeekend(d)) d--;
  return d;
}
export function prevSessionDay(d: number): number {
  let x = d - 1;
  while (isWeekend(x)) x--;
  return x;
}

export class PriceModel {
  private readonly phase1: number;
  private readonly phase2: number;
  private readonly amp: number;
  constructor(
    readonly co: MockCompany,
    readonly d0: number,
  ) {
    this.phase1 = (hash32(co.t + "p1") / 0xffffffff) * 6.28;
    this.phase2 = (hash32(co.t + "p2") / 0xffffffff) * 6.28;
    this.amp = 0.06 + 0.06 * Math.min(1, Math.abs(co.g) + 0.2);
  }
  private f(d: number): number {
    return (
      (0.1 / 365) * d +
      this.amp * Math.sin(d / 23 + this.phase1) +
      0.025 * Math.sin(d / 6.1 + this.phase2) +
      0.011 * noise(`${this.co.t}:d:${d}`)
    );
  }
  close(d: number): number {
    return this.co.price * Math.exp(this.f(d) - this.f(this.d0));
  }
  volume(d: number): number {
    return Math.round(this.co.vol * 1e6 * (0.75 + 0.5 * (noise(`${this.co.t}:v:${d}`) + 1) / 2 * 1.0));
  }
  /** Intraday price at fraction `frac` (0..1) of session `d`; equals close(d) at frac=1. */
  intraday(d: number, frac: number): number {
    const p0 = this.close(prevSessionDay(d));
    const p1 = this.close(d);
    const wobble = frac >= 1 ? 0 : 0.0009 * noise(`${this.co.t}:i:${d}:${Math.round(frac * SESSION_MINUTES)}`);
    return p0 * Math.pow(p1 / p0, frac) * (1 + wobble);
  }
  sessions(count: number): number[] {
    const out: number[] = [];
    let d = this.d0;
    while (out.length < count) {
      out.push(d);
      d = prevSessionDay(d);
    }
    return out.reverse();
  }
  yearRange(): { high: number; low: number } {
    let high = -Infinity;
    let low = Infinity;
    for (const d of this.sessions(252)) {
      const c = this.close(d);
      high = Math.max(high, c * 1.006);
      low = Math.min(low, c * 0.994);
    }
    return { high, low };
  }
}

export const RANGE_SESSIONS: Record<HistoryRange, number> = { "1d": 1, "1w": 5, "1m": 21, "3m": 63, "6m": 126, "1y": 252, "5y": 1260 };
export const INTERVAL_MINUTES: Partial<Record<HistoryInterval, number>> = { "1m": 1, "5m": 5, "1h": 60 };

export interface Bar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const r4 = (x: number) => Math.round(x * 10000) / 10000;

function makeBar(ts: number, open: number, close: number, volume: number, wick: number, key: string): Bar {
  const hi = Math.max(open, close) * (1 + wick * (0.5 + 0.5 * Math.abs(noise(key + "h"))));
  const lo = Math.min(open, close) * (1 - wick * (0.5 + 0.5 * Math.abs(noise(key + "l"))));
  return { timestamp: new Date(ts).toISOString(), open: r4(open), high: r4(hi), low: r4(lo), close: r4(close), volume: Math.max(0, Math.round(volume)) };
}

export function generateBars(model: PriceModel, range: HistoryRange, interval: HistoryInterval, nowMs: number): Bar[] {
  const sessions = model.sessions(RANGE_SESSIONS[range]);
  const t = model.co.t;
  const step = INTERVAL_MINUTES[interval];
  if (step) {
    const bars: Bar[] = [];
    for (const d of sessions) {
      const dayVol = model.volume(d);
      for (let m = 0; m < SESSION_MINUTES; m += step) {
        const start = d * DAY + (SESSION_OPEN_MIN + m) * 60_000;
        const endMin = Math.min(m + step, SESSION_MINUTES);
        if (d * DAY + (SESSION_OPEN_MIN + endMin) * 60_000 > nowMs) continue; // bar not finished
        const open = model.intraday(d, m / SESSION_MINUTES);
        const close = model.intraday(d, endMin / SESSION_MINUTES);
        const share = ((endMin - m) / SESSION_MINUTES) * (0.7 + 0.6 * ((noise(`${t}:bv:${d}:${m}`) + 1) / 2));
        bars.push(makeBar(start, open, close, dayVol * share, 0.0006, `${t}:b:${d}:${m}`));
      }
    }
    return bars;
  }
  const daily: Bar[] = sessions.map((d) => {
    const prev = model.close(prevSessionDay(d));
    const open = prev * (1 + 0.004 * noise(`${t}:gap:${d}`));
    return makeBar(d * DAY + 20 * 3_600_000, open, model.close(d), model.volume(d), 0.006, `${t}:day:${d}`);
  });
  if (interval === "1d") return daily;
  // weekly: group by Monday-anchored week
  const weeks = new Map<number, Bar[]>();
  for (const b of daily) {
    const day = Math.floor(Date.parse(b.timestamp) / DAY);
    const monday = day - ((new Date(day * DAY).getUTCDay() + 6) % 7);
    weeks.set(monday, [...(weeks.get(monday) ?? []), b]);
  }
  return [...weeks.values()].map((g) => ({
    timestamp: g[g.length - 1]!.timestamp,
    open: g[0]!.open,
    close: g[g.length - 1]!.close,
    high: Math.max(...g.map((b) => b.high)),
    low: Math.min(...g.map((b) => b.low)),
    volume: g.reduce((a, b) => a + b.volume, 0),
  }));
}
