/**
 * Curated analysis for the launch tickers. This is qualitative, editorial
 * content stored as data (and Zod-validated on load), not provider output.
 * Every claim points at a source id; sources are filing indexes and IR pages
 * the claim should be checked against. Treat as draft copy until reviewed.
 */
import type { StoredAnalysis } from "../contracts/analysis";

const UPDATED = "2026-09-01T00:00:00.000Z";

type Cat = StoredAnalysis["risks"][number]["category"];
type Sev = StoredAnalysis["risks"][number]["severity"];
type Assess = StoredAnalysis["moat"][number]["assessment"];
type Dir = StoredAnalysis["catalysts"][number]["direction"];

interface Spec {
  t: string;
  name: string;
  foreign?: boolean;
  ir: string;
  summary: string;
  streams: string[];
  segments: string[];
  moat: Array<[string, Assess, string]>;
  risks: Array<[Cat, Sev, string, string]>;
  catalysts: Array<[Dir, string, string, string?]>;
}

function build(s: Spec): StoredAnalysis {
  const t = s.t.toLowerCase();
  const filing = `sec-${t}-annual`;
  const ir = `company-ir-${t}`;
  return {
    ticker: s.t,
    updatedAt: UPDATED,
    businessModel: { summary: s.summary, revenueStreams: s.streams, customerSegments: s.segments, sourceIds: [filing, ir] },
    moat: s.moat.map(([category, assessment, explanation]) => ({ category, assessment, explanation, sourceIds: [filing] })),
    risks: s.risks.map(([category, severity, title, description], i) => ({ id: `${t}-risk-${i + 1}`, category, severity, title, description, sourceIds: [filing] })),
    catalysts: s.catalysts.map(([direction, title, description, expectedWindow], i) => ({
      id: `${t}-cat-${i + 1}`, direction, title, description, ...(expectedWindow ? { expectedWindow } : {}), sourceIds: [ir],
    })),
    sources: [
      { id: filing, name: `${s.name} ${s.foreign ? "Form 20-F" : "Form 10-K"} (risk factors and business sections)`, url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${s.t}&type=${s.foreign ? "20-F" : "10-K"}`, accessedAt: UPDATED, type: "sec" },
      { id: ir, name: `${s.name} investor relations`, url: s.ir, accessedAt: UPDATED, type: "company" },
    ],
  };
}

const SPECS: Spec[] = [
  {
    t: "NVDA", name: "NVIDIA", ir: "https://investor.nvidia.com",
    summary: "Designs accelerated-computing platforms: GPUs, networking and the CUDA software stack, sold chiefly into data centers, plus gaming, professional visualization and automotive.",
    streams: ["Data center compute and networking", "Gaming GPUs", "Professional visualization", "Automotive and robotics"],
    segments: ["Cloud and hyperscale operators", "Enterprises and AI developers", "PC gamers and creators", "Automakers"],
    moat: [["Software ecosystem (CUDA)", "strong", "A large developer base and libraries built on CUDA raise switching costs for AI workloads."], ["Scale in advanced silicon design", "moderate", "R&D scale and supply-chain access help, but large customers are developing in-house accelerators."]],
    risks: [["concentration", "high", "Customer concentration", "A small number of cloud and hyperscale customers account for a large share of data center revenue."], ["regulatory", "high", "Export controls", "Restrictions on shipments of advanced chips to certain regions can limit addressable demand."], ["execution", "medium", "Supply dependence", "Leading-edge manufacturing and packaging are concentrated at a few third-party suppliers."]],
    catalysts: [["positive", "New platform ramps", "Volume ramps of next-generation data center platforms.", "next 2–4 quarters"], ["uncertain", "Hyperscaler capex cadence", "Cloud capital-spending plans drive order visibility.", "each earnings season"]],
  },
  {
    t: "AAPL", name: "Apple", ir: "https://investor.apple.com",
    summary: "Sells iPhone, Mac, iPad and wearables, and monetizes the installed base through services such as the App Store, iCloud, advertising and payments.",
    streams: ["iPhone", "Services", "Mac and iPad", "Wearables, home and accessories"],
    segments: ["Consumers", "Small and mid-size businesses", "Enterprise and education"],
    moat: [["Ecosystem and brand", "strong", "Integrated hardware, software and services keep users within the ecosystem."], ["Services attach", "moderate", "Recurring services revenue deepens engagement but faces regulatory pressure on fees."]],
    risks: [["regulatory", "high", "App store and platform rules", "Antitrust and digital-market rules may change commission and distribution practices."], ["concentration", "medium", "iPhone dependence", "A single product line drives a large share of revenue and profit."], ["macro", "medium", "Supply chain and tariffs", "Manufacturing is concentrated in a few countries, exposing costs to trade policy."]],
    catalysts: [["positive", "Product upgrade cycles", "New device and on-device AI features can lift replacement rates.", "annual fall launch"], ["uncertain", "Regulatory rulings", "Court and regulator decisions on services fees.", "ongoing"]],
  },
  {
    t: "MSFT", name: "Microsoft", ir: "https://www.microsoft.com/investor",
    summary: "Software and cloud platform company: Azure and server products, Microsoft 365 productivity and business applications, and Windows, devices and gaming.",
    streams: ["Intelligent Cloud (Azure)", "Productivity and business processes", "More personal computing"],
    segments: ["Enterprises and governments", "Developers", "Consumers and gamers"],
    moat: [["Enterprise switching costs", "strong", "Deep integration of Microsoft 365, identity and Azure makes replacement costly."], ["Cloud scale", "strong", "Global datacenter footprint and distribution through existing enterprise contracts."]],
    risks: [["financial", "medium", "AI infrastructure spending", "Large capital commitments may pressure margins if demand lags capacity."], ["competition", "medium", "Hyperscale cloud rivals", "Competitors compete on price and AI capabilities."], ["regulatory", "medium", "Bundling scrutiny", "Regulators examine product bundling and cloud licensing practices."]],
    catalysts: [["positive", "Copilot adoption", "Seat and usage growth for AI features across products.", "next 4 quarters"], ["positive", "Azure growth", "Cloud consumption growth and new AI workloads.", "each earnings season"]],
  },
  {
    t: "AMZN", name: "Amazon", ir: "https://ir.aboutamazon.com",
    summary: "E-commerce marketplace and logistics network, third-party seller services, subscriptions, advertising, and AWS cloud infrastructure.",
    streams: ["Online and physical stores", "Third-party seller services", "Advertising", "Subscriptions", "AWS"],
    segments: ["Consumers", "Sellers and brands", "Enterprises and developers (AWS)"],
    moat: [["Logistics and marketplace scale", "strong", "Fulfillment network and seller base reinforce selection and delivery speed."], ["AWS position", "strong", "Broad service catalog and customer inertia in cloud infrastructure."]],
    risks: [["regulatory", "high", "Antitrust and marketplace rules", "Scrutiny of marketplace practices and cloud commitments."], ["financial", "medium", "Capital intensity", "Fulfillment and datacenter buildouts require sustained heavy investment."], ["competition", "medium", "Cloud and retail rivals", "Price and feature competition across segments."]],
    catalysts: [["positive", "AWS re-acceleration", "AI workloads and migrations can lift cloud growth.", "next 2–4 quarters"], ["positive", "Advertising growth", "Retail media and streaming ads add high-margin revenue.", "ongoing"]],
  },
  {
    t: "GOOGL", name: "Alphabet", ir: "https://abc.xyz/investor",
    summary: "Monetizes Search, YouTube and a network of partner sites through advertising; also sells Google Cloud and subscriptions, and funds long-horizon Other Bets.",
    streams: ["Search and other", "YouTube ads", "Google Network", "Subscriptions, platforms and devices", "Google Cloud"],
    segments: ["Advertisers", "Consumers", "Cloud customers"],
    moat: [["Search distribution and data", "strong", "Scale of queries and defaults sustain relevance and advertiser demand."], ["Cloud position", "moderate", "Growing but smaller than the two largest cloud rivals."]],
    risks: [["regulatory", "high", "Antitrust remedies", "Court remedies may restrict distribution deals or require changes to products."], ["technology", "high", "AI-driven search disruption", "Generative-AI interfaces could shift query volume and ad formats."], ["financial", "medium", "AI capital spending", "Elevated infrastructure investment weighs on free cash flow."]],
    catalysts: [["positive", "Cloud backlog conversion", "Growth in Cloud revenue and operating margin.", "next 2–4 quarters"], ["uncertain", "Remedy decisions", "Outcomes of pending antitrust cases.", "next 12 months"]],
  },
  {
    t: "JPM", name: "JPMorgan Chase", ir: "https://www.jpmorganchase.com/ir",
    summary: "Universal bank: consumer and community banking, corporate and investment banking, commercial banking, and asset and wealth management.",
    streams: ["Net interest income", "Investment banking and markets fees", "Card and payments", "Asset management fees"],
    segments: ["Consumers and small businesses", "Corporations and institutions", "Wealth clients"],
    moat: [["Scale and deposit franchise", "strong", "Large low-cost deposit base and diversified fee businesses."], ["Regulatory barriers", "moderate", "Capital and licensing requirements limit new entrants but also constrain returns."]],
    risks: [["macro", "high", "Credit cycle", "Loan losses rise in downturns; reserves and provisions are sensitive to unemployment and rates."], ["financial", "medium", "Rate sensitivity", "Net interest income depends on the rate path and deposit mix."], ["regulatory", "medium", "Capital requirements", "Higher capital rules could limit buybacks and lending capacity."]],
    catalysts: [["positive", "Capital markets activity", "Deal and trading volumes drive fee income.", "ongoing"], ["uncertain", "Rate path", "Changes in policy rates affect net interest income.", "next 12 months"]],
  },
  {
    t: "WMT", name: "Walmart", ir: "https://stock.walmart.com",
    summary: "Operates large-format retail, Sam's Club and international businesses, and is growing e-commerce, marketplace and advertising.",
    streams: ["Walmart U.S. stores and eCommerce", "Walmart International", "Sam's Club", "Advertising and membership"],
    segments: ["Value-focused households", "Small businesses (Sam's Club)", "Third-party sellers"],
    moat: [["Scale purchasing and logistics", "strong", "Buying scale and store-based fulfillment support everyday low prices."], ["Store footprint for delivery", "moderate", "Proximity to customers enables fast pickup and delivery."]],
    risks: [["competition", "medium", "Discount and online rivals", "Price competition from grocers, discounters and e-commerce."], ["macro", "medium", "Tariffs and consumer spending", "Imported goods costs and shifts in household budgets affect margins."], ["execution", "low", "Labor and wage costs", "Retail is labor intensive; wage inflation compresses thin margins."]],
    catalysts: [["positive", "Advertising and membership mix", "Higher-margin income lifts operating margin.", "ongoing"], ["positive", "eCommerce profitability", "Scale and automation improve online unit economics.", "next 4 quarters"]],
  },
  {
    t: "SPOT", name: "Spotify Technology", foreign: true, ir: "https://investors.spotify.com",
    summary: "Audio streaming platform monetized through Premium subscriptions and an ad-supported tier; reports in euros while listing in the U.S.",
    streams: ["Premium subscriptions", "Ad-supported revenue"],
    segments: ["Individual and family subscribers", "Free-tier listeners", "Advertisers"],
    moat: [["Scale and personalization", "moderate", "Large user base and recommendation data improve engagement, though content is largely licensed."], ["Content bargaining power", "limited", "Reliance on major labels' catalogs limits control over the largest cost line."]],
    risks: [["competition", "high", "Larger platform rivals", "Competitors bundle music with broader ecosystems."], ["financial", "medium", "Licensing costs", "Royalty rates and renegotiations directly affect gross margin."], ["macro", "medium", "Currency exposure", "Reports in EUR but earns in many currencies; USD-quoted shares add FX sensitivity."]],
    catalysts: [["positive", "Price increases and tier expansion", "Pricing power and new tiers can lift ARPU.", "next 4 quarters"], ["uncertain", "Label licensing renewals", "Outcome of catalog agreements.", "ongoing"]],
  },
];

export const ANALYSIS_FIXTURES: StoredAnalysis[] = SPECS.map(build);
