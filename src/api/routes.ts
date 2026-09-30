import { z } from "zod";
import { AnalysisSchema } from "../contracts/analysis";
import { CompaniesQuery, CompaniesResponse, CompanyDetailSchema, MarketSnapshotSchema, TickerParams } from "../contracts/company";
import { EarningsQuery, EarningsResponse, EstimatesSchema } from "../contracts/earnings";
import { BalanceSheetSchema, FinancialsQuery, FinancialsResponse } from "../contracts/financials";
import { ConstituentsResponse, SectorsResponse, Sp500OverviewSchema } from "../contracts/index-sector";
import { HistoryQuery, HistoryResponse } from "../contracts/market";
import { NewsQuery, NewsResponse } from "../contracts/news";
import { CompareQuery, CompareResponse, PeersQuery, PeersResponse } from "../contracts/peers";
import { ScreenerQuery, ScreenerResponse } from "../contracts/screener";
import { ValuationSchema } from "../contracts/valuation";
import { WatchlistRemoveResponse, WatchlistResponse, WatchlistItemSchema } from "../contracts/watchlist";
import { NoParams, route, type AnyRoute } from "./route";
import type { Services } from "../services";
import { iso } from "../lib/clock";

const Health = z.object({ status: z.literal("ok"), time: z.iso.datetime({ offset: true }) });

export function buildRoutes(s: Services): AnyRoute[] {
  const stock = (suffix: string) => `/stocks/:ticker${suffix}`;
  return [
    route({
      method: "GET", path: "/health", summary: "Liveness probe", response: Health,
      handler: async () => ({ data: { status: "ok" as const, time: iso(s.ctx.clock.now()) }, meta: {} }),
    }),

    // ── companies ──
    route({
      method: "GET", path: "/companies", summary: "Search, filter and page company metadata",
      query: CompaniesQuery, response: CompaniesResponse, clientMaxAge: 300,
      handler: ({ query }) => s.companies.list(query),
    }),
    route({
      method: "GET", path: "/companies/:ticker", summary: "Company metadata plus market, financial and valuation snapshots",
      params: TickerParams, response: CompanyDetailSchema, clientMaxAge: 15,
      handler: ({ params }) => s.companies.detail(params.ticker),
    }),

    // ── stock data ──
    route({
      method: "GET", path: stock("/market"), summary: "Price, change, market cap, EV, volume, 52-week range",
      params: TickerParams, response: MarketSnapshotSchema, clientMaxAge: 15,
      handler: ({ params }) => s.market.snapshot(params.ticker),
    }),
    route({
      method: "GET", path: stock("/history"), summary: "OHLCV price history",
      params: TickerParams, query: HistoryQuery, response: HistoryResponse, clientMaxAge: 60,
      handler: ({ params, query }) => s.market.history(params.ticker, query.range, query.interval),
    }),
    route({
      method: "GET", path: stock("/financials"), summary: "Annual or quarterly financial periods",
      params: TickerParams, query: FinancialsQuery, response: FinancialsResponse, clientMaxAge: 600,
      handler: ({ params, query }) => s.financials.periods(params.ticker, query.period, query.years),
    }),
    route({
      method: "GET", path: stock("/balance-sheet"), summary: "Latest balance sheet and leverage",
      params: TickerParams, response: BalanceSheetSchema, clientMaxAge: 600,
      handler: ({ params }) => s.financials.balanceSheet(params.ticker),
    }),
    route({
      method: "GET", path: stock("/valuation"), summary: "Multiples with historical, sector and peer context",
      params: TickerParams, response: ValuationSchema, clientMaxAge: 300,
      handler: ({ params }) => s.valuation.get(params.ticker),
    }),
    route({
      method: "GET", path: stock("/peers"), summary: "Peer companies with comparable metrics",
      params: TickerParams, query: PeersQuery, response: PeersResponse, clientMaxAge: 300,
      handler: ({ params, query }) => s.peers.peers(params.ticker, query.limit),
    }),
    route({
      method: "GET", path: stock("/earnings"), summary: "Reported quarters versus estimates, with guidance",
      params: TickerParams, query: EarningsQuery, response: EarningsResponse, clientMaxAge: 600,
      handler: ({ params, query }) => s.earnings.earnings(params.ticker, query.limit),
    }),
    route({
      method: "GET", path: stock("/estimates"), summary: "Analyst consensus, target prices and revisions",
      params: TickerParams, response: EstimatesSchema, clientMaxAge: 600,
      handler: ({ params }) => s.earnings.estimates(params.ticker),
    }),
    route({
      method: "GET", path: stock("/news"), summary: "Recent articles from credible sources",
      params: TickerParams, query: NewsQuery, response: NewsResponse, clientMaxAge: 120,
      handler: ({ params, query }) => s.news.news(params.ticker, query.limit, query.cursor),
    }),
    route({
      method: "GET", path: stock("/analysis"), summary: "Business model, moat, risks, catalysts, scenarios",
      params: TickerParams, response: AnalysisSchema, clientMaxAge: 300,
      handler: ({ params }) => s.analysis.get(params.ticker),
    }),

    // ── cross-sectional ──
    route({
      method: "GET", path: "/compare", summary: "Side-by-side metrics for up to 5 tickers",
      query: CompareQuery, response: CompareResponse, clientMaxAge: 60,
      handler: ({ query }) => s.peers.compare(query.tickers),
    }),
    route({
      method: "GET", path: "/screener", summary: "Server-side filtered, sorted, paginated screener",
      query: ScreenerQuery, response: ScreenerResponse, clientMaxAge: 30,
      handler: ({ query }) => s.screener.run(query),
    }),
    route({
      method: "GET", path: "/index/sp500/constituents", summary: "S&P 500 membership and weights",
      response: ConstituentsResponse, clientMaxAge: 3600,
      handler: () => s.index.constituents(),
    }),
    route({
      method: "GET", path: "/index/sp500/overview", summary: "S&P 500 level, returns, range and breadth",
      response: Sp500OverviewSchema, clientMaxAge: 60,
      handler: () => s.index.overview(),
    }),
    route({
      method: "GET", path: "/sectors", summary: "Sector roll-up of the index universe",
      response: SectorsResponse, clientMaxAge: 120,
      handler: () => s.index.sectors(),
    }),

    // ── watchlist (bearer auth) ──
    route({
      method: "GET", path: "/watchlist", summary: "The caller's watchlist", auth: true, response: WatchlistResponse,
      handler: ({ userId }) => s.watchlist.list(userId),
    }),
    route({
      method: "POST", path: "/watchlist/:ticker", summary: "Add a ticker to the watchlist", auth: true, status: 201,
      params: TickerParams, response: WatchlistItemSchema,
      handler: ({ params, userId }) => s.watchlist.add(userId, params.ticker),
    }),
    route({
      method: "DELETE", path: "/watchlist/:ticker", summary: "Remove a ticker from the watchlist", auth: true,
      params: TickerParams, response: WatchlistRemoveResponse,
      handler: ({ params, userId }) => s.watchlist.remove(userId, params.ticker),
    }),
  ];
}

export { NoParams };
