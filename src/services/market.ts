import type { HistoryInterval, HistoryRange } from "../contracts/market";
import type { MarketSnapshot } from "../contracts/company";
import { metric } from "../lib/metric";
import { notFound } from "../lib/errors";
import type { Core } from "./core";
import type { CoreService } from "./core";
import type { Gateway } from "./gateway";
import { result, type Result } from "./result";
import type { HistoryResponse } from "../contracts/market";

export function marketSnapshot(c: Core): MarketSnapshot {
  const asOf = c.asOf;
  const source = c.sources.market;
  const usd = { currency: "USD", asOf, source } as const;
  return {
    price: metric(c.price, { ...usd, type: "actual", unit: "per_share" }),
    dailyChange: metric(c.dailyChange, { asOf, source, type: "calculated", unit: "ratio", period: "1d" }),
    previousClose: metric(c.previousClose, { ...usd, type: "actual", unit: "per_share" }),
    marketCap: metric(c.marketCapUsd, { ...usd, type: "calculated" }),
    enterpriseValue: metric(c.enterpriseValueUsd, { ...usd, type: "calculated" }),
    volume: metric(c.quote.volume, { asOf, source, type: "actual", unit: "shares", period: "1d" }),
    averageVolume: metric(c.quote.averageVolume, { asOf, source, type: "actual", unit: "shares" }),
    fiftyTwoWeekHigh: metric(c.quote.fiftyTwoWeekHigh, { ...usd, type: "actual", unit: "per_share", period: "52w" }),
    fiftyTwoWeekLow: metric(c.quote.fiftyTwoWeekLow, { ...usd, type: "actual", unit: "per_share", period: "52w" }),
  };
}

export class MarketService {
  constructor(
    private readonly core: CoreService,
    private readonly gw: Gateway,
  ) {}

  async snapshot(ticker: string): Promise<Result<MarketSnapshot>> {
    const c = await this.core.get(ticker);
    return result(marketSnapshot(c), { asOf: c.asOf, source: c.sources.market.name, stale: c.stale });
  }

  async history(ticker: string, range: HistoryRange, interval: HistoryInterval): Promise<Result<HistoryResponse>> {
    const h = await this.gw.history(ticker, range, interval);
    if (!h.value) throw notFound(`Unknown ticker ${ticker}`);
    const d = h.value;
    return result(
      { ticker, range, interval, currency: d.currency, points: d.points },
      { asOf: d.asOf, source: d.source.name, stale: h.stale },
    );
  }
}
