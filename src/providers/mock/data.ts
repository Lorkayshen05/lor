/**
 * SYNTHETIC fixture universe. Figures are illustrative round numbers used to
 * exercise the contracts and formulas — they are NOT real market data and
 * must never be presented as such. Real adapters replace this whole folder.
 */
export interface MockCompany {
  t: string;
  name: string;
  ex: string;
  sector: string;
  industry: string;
  /** trailing-12-month revenue, in billions of reporting currency */
  rev: number;
  /** revenue growth (YoY, fraction) */
  g: number;
  /** gross margin; null = not reported (banks) */
  gm: number | null;
  om: number;
  nm: number;
  price: number;
  /** shares outstanding, billions */
  sh: number;
  div: number;
  /** average daily volume, millions */
  vol: number;
  o?: {
    sc?: string;
    sub?: string;
    cur?: string;
    fx?: number;
    fye?: number;
    bank?: boolean;
    capex?: number;
    debt?: number;
    cash?: number;
    eq?: number;
    cr?: number;
    tax?: number;
    estG?: number;
    analysts?: number;
    site?: string;
    ir?: string;
  };
}

const c = (
  t: string, name: string, ex: string, sector: string, industry: string,
  rev: number, g: number, gm: number | null, om: number, nm: number,
  price: number, sh: number, div: number, vol: number, o?: MockCompany["o"],
): MockCompany => ({ t, name, ex, sector, industry, rev, g, gm, om, nm, price, sh, div, vol, o });

export const MOCK_COMPANIES: MockCompany[] = [
  // ── the eight tickers that must pass end-to-end ──
  c("NVDA", "NVIDIA Corporation", "NASDAQ", "Technology", "Semiconductors", 165, 0.55, 0.72, 0.6, 0.53, 180, 24.4, 0.0002, 180, { fye: 1, capex: 0.03, cash: 0.2, eq: 1.0, debt: 0.06, site: "https://www.nvidia.com", ir: "https://investor.nvidia.com" }),
  c("AAPL", "Apple Inc.", "NASDAQ", "Technology", "Consumer Electronics", 410, 0.06, 0.47, 0.32, 0.25, 235, 14.8, 0.004, 55, { fye: 9, debt: 0.25, eq: 0.4, cash: 0.2, site: "https://www.apple.com", ir: "https://investor.apple.com" }),
  c("MSFT", "Microsoft Corporation", "NASDAQ", "Technology", "Systems Software", 305, 0.15, 0.69, 0.46, 0.36, 500, 7.43, 0.007, 22, { fye: 6, capex: 0.22, debt: 0.2, site: "https://www.microsoft.com", ir: "https://www.microsoft.com/investor" }),
  c("AMZN", "Amazon.com, Inc.", "NASDAQ", "Consumer Discretionary", "Broadline Retail", 690, 0.11, 0.5, 0.11, 0.1, 225, 10.7, 0, 40, { fye: 12, capex: 0.14, debt: 0.2, site: "https://www.amazon.com", ir: "https://ir.aboutamazon.com" }),
  c("GOOGL", "Alphabet Inc.", "NASDAQ", "Communication Services", "Interactive Media & Services", 380, 0.13, 0.6, 0.32, 0.29, 245, 12.1, 0.0035, 30, { sc: "Class A", fye: 12, capex: 0.2, debt: 0.05, site: "https://abc.xyz", ir: "https://abc.xyz/investor" }),
  c("JPM", "JPMorgan Chase & Co.", "NYSE", "Financials", "Diversified Banks", 185, 0.07, null, 0.38, 0.3, 305, 2.75, 0.019, 9, { fye: 12, bank: true, debt: 1.4, eq: 1.4, site: "https://www.jpmorganchase.com", ir: "https://www.jpmorganchase.com/ir" }),
  c("WMT", "Walmart Inc.", "NYSE", "Consumer Staples", "Consumer Staples Merchandise Retail", 700, 0.05, 0.25, 0.043, 0.028, 98, 8.0, 0.009, 18, { fye: 1, capex: 0.03, debt: 0.12, cash: 0.02, eq: 0.2, cr: 0.85, site: "https://corporate.walmart.com", ir: "https://stock.walmart.com" }),
  c("SPOT", "Spotify Technology S.A.", "NYSE", "Communication Services", "Entertainment", 17.5, 0.16, 0.32, 0.11, 0.12, 620, 0.205, 0, 2, { sub: "Music Streaming", cur: "EUR", fx: 1.08, fye: 12, capex: 0.005, debt: 0.05, cash: 0.35, eq: 0.45, tax: 0.2, site: "https://www.spotify.com", ir: "https://investors.spotify.com" }),
  // ── wider universe for medians, peers, screener ──
  c("META", "Meta Platforms, Inc.", "NASDAQ", "Communication Services", "Interactive Media & Services", 200, 0.2, 0.82, 0.41, 0.35, 700, 2.52, 0.003, 12, { capex: 0.28 }),
  c("NFLX", "Netflix, Inc.", "NASDAQ", "Communication Services", "Entertainment", 45, 0.15, 0.48, 0.3, 0.24, 1100, 0.42, 0, 3),
  c("DIS", "The Walt Disney Company", "NYSE", "Communication Services", "Entertainment", 95, 0.04, 0.37, 0.13, 0.08, 115, 1.8, 0.008, 10, { fye: 9, debt: 0.4 }),
  c("TSLA", "Tesla, Inc.", "NASDAQ", "Consumer Discretionary", "Automobile Manufacturers", 95, 0.03, 0.18, 0.07, 0.06, 330, 3.2, 0, 90, { capex: 0.08 }),
  c("HD", "The Home Depot, Inc.", "NYSE", "Consumer Discretionary", "Home Improvement Retail", 165, 0.03, 0.33, 0.13, 0.09, 380, 0.995, 0.022, 4, { fye: 1, debt: 0.4, eq: 0.05 }),
  c("AVGO", "Broadcom Inc.", "NASDAQ", "Technology", "Semiconductors", 62, 0.24, 0.77, 0.38, 0.3, 340, 4.7, 0.006, 25, { fye: 10, debt: 0.7 }),
  c("AMD", "Advanced Micro Devices, Inc.", "NASDAQ", "Technology", "Semiconductors", 34, 0.28, 0.52, 0.12, 0.1, 165, 1.62, 0, 45, { debt: 0.06, eq: 1.6 }),
  c("ORCL", "Oracle Corporation", "NYSE", "Technology", "Application Software", 62, 0.12, 0.7, 0.31, 0.21, 240, 2.8, 0.007, 9, { fye: 5, debt: 1.3, eq: 0.3 }),
  c("CRM", "Salesforce, Inc.", "NYSE", "Technology", "Application Software", 41, 0.09, 0.77, 0.21, 0.17, 250, 0.96, 0.006, 6, { fye: 1, debt: 0.12, eq: 1.1 }),
  c("COST", "Costco Wholesale Corporation", "NASDAQ", "Consumer Staples", "Consumer Staples Merchandise Retail", 275, 0.08, 0.13, 0.038, 0.03, 950, 0.443, 0.005, 2.2, { fye: 8, debt: 0.04, eq: 0.15 }),
  c("KO", "The Coca-Cola Company", "NYSE", "Consumer Staples", "Soft Drinks & Non-alcoholic Beverages", 47, 0.03, 0.61, 0.3, 0.24, 70, 4.3, 0.028, 14, { debt: 1.0, eq: 0.9 }),
  c("PEP", "PepsiCo, Inc.", "NASDAQ", "Consumer Staples", "Soft Drinks & Non-alcoholic Beverages", 92, 0.01, 0.54, 0.14, 0.09, 145, 1.37, 0.038, 6.5, { debt: 0.5, eq: 0.2 }),
  c("PG", "The Procter & Gamble Company", "NYSE", "Consumer Staples", "Household Products", 84, 0.02, 0.51, 0.23, 0.18, 155, 2.35, 0.025, 7, { fye: 6, debt: 0.3, eq: 0.5 }),
  c("BAC", "Bank of America Corporation", "NYSE", "Financials", "Diversified Banks", 100, 0.05, null, 0.3, 0.24, 48, 7.5, 0.022, 40, { bank: true, debt: 2.0, eq: 2.4 }),
  c("GS", "The Goldman Sachs Group, Inc.", "NYSE", "Financials", "Investment Banking & Brokerage", 58, 0.1, null, 0.3, 0.24, 750, 0.31, 0.018, 2.5, { bank: true, debt: 3.0, eq: 1.5 }),
  c("V", "Visa Inc.", "NYSE", "Financials", "Transaction & Payment Processing Services", 38, 0.1, 0.8, 0.67, 0.55, 345, 1.94, 0.007, 7, { fye: 9, capex: 0.03, debt: 0.25, eq: 0.55 }),
  c("JNJ", "Johnson & Johnson", "NYSE", "Health Care", "Pharmaceuticals", 90, 0.05, 0.69, 0.27, 0.2, 175, 2.4, 0.03, 7, { debt: 0.3, eq: 0.6 }),
  c("LLY", "Eli Lilly and Company", "NYSE", "Health Care", "Pharmaceuticals", 62, 0.4, 0.82, 0.45, 0.33, 780, 0.9, 0.006, 3.5, { capex: 0.15, debt: 0.55, eq: 0.5 }),
  c("UNH", "UnitedHealth Group Incorporated", "NYSE", "Health Care", "Managed Health Care", 450, 0.08, 0.22, 0.08, 0.05, 310, 0.91, 0.028, 4, { debt: 0.1, eq: 0.2 }),
  c("XOM", "Exxon Mobil Corporation", "NYSE", "Energy", "Integrated Oil & Gas", 330, -0.03, 0.32, 0.11, 0.09, 115, 4.3, 0.035, 15, { capex: 0.09, debt: 0.1, eq: 0.45 }),
  c("CVX", "Chevron Corporation", "NYSE", "Energy", "Integrated Oil & Gas", 190, -0.05, 0.3, 0.08, 0.07, 152, 1.97, 0.043, 8, { capex: 0.12, debt: 0.12, eq: 0.6 }),
];

export const MOCK_TICKERS = new Set(MOCK_COMPANIES.map((x) => x.t));

/** Approximate total float-adjusted S&P 500 market cap used only to derive mock weights. */
export const MOCK_INDEX_TOTAL_CAP = 58e12;
