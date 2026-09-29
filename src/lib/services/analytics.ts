import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { trackSchema, type TrackInput } from "@/lib/validation/schemas";
import type { AnalyticsEventType } from "@/generated/prisma/enums";

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|facebookexternalhit|preview/i;
export const isBot = (ua: string | null | undefined) => !ua || BOT_RE.test(ua);

/** Daily-rotating salted hash: approximate unique visitors without storing IP or raw user agent. */
export function visitorHash(ip: string, ua: string, day = new Date().toISOString().slice(0, 10)): string {
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}|${day}|${ip}|${ua}`).digest("hex").slice(0, 24);
}

export async function recordEvent(raw: unknown, ctx: { ip: string; userAgent: string | null; referrer?: string | null }) {
  if (isBot(ctx.userAgent)) return { recorded: false as const, reason: "bot" };
  const parsed = trackSchema.safeParse(raw);
  if (!parsed.success) return { recorded: false as const, reason: "invalid" };
  const e: TrackInput = parsed.data;
  if (e.path && !e.path.startsWith("/")) return { recorded: false as const, reason: "invalid" };

  // Never trust a client-supplied businessId: derive it from the branch.
  let businessId: string | null = null;
  let branchId: string | null = null;
  if (e.branchId) {
    const b = await db.branch.findUnique({ where: { id: e.branchId }, select: { id: true, businessId: true } });
    if (!b) return { recorded: false as const, reason: "unknown-branch" };
    branchId = b.id;
    businessId = b.businessId;
  } else if (e.businessId) {
    const b = await db.business.findUnique({ where: { id: e.businessId }, select: { id: true } });
    businessId = b?.id ?? null;
  }
  await db.analyticsEvent.create({
    data: {
      type: e.type,
      businessId,
      branchId,
      path: e.path ?? null,
      searchTerm: e.type === "SEARCH" ? (e.searchTerm?.toLowerCase() ?? null) : null,
      referrer: ctx.referrer ? ctx.referrer.slice(0, 200) : null,
      visitorHash: visitorHash(ctx.ip, ctx.userAgent ?? ""),
      meta: e.meta ?? undefined,
    },
  });
  return { recorded: true as const };
}

export const STAT_TYPES: AnalyticsEventType[] = ["STORE_VIEW", "DIRECTIONS_CLICK", "PHONE_CLICK", "WHATSAPP_CLICK", "WEBSITE_CLICK"];

export type BusinessStats = {
  since: Date;
  totals: Record<"STORE_VIEW" | "DIRECTIONS_CLICK" | "PHONE_CLICK" | "WHATSAPP_CLICK" | "WEBSITE_CLICK" | "LEADS", number>;
  daily: { day: string; views: number }[];
  byBranch: { branchId: string; branchName: string; views: number; directions: number }[];
};

export async function getBusinessStats(businessId: string, days = 30, full = false): Promise<BusinessStats> {
  const since = new Date(Date.now() - days * 86_400_000);
  const grouped = await db.analyticsEvent.groupBy({
    by: ["type"],
    where: { businessId, createdAt: { gte: since }, type: { in: STAT_TYPES } },
    _count: { _all: true },
  });
  const count = (t: AnalyticsEventType) => grouped.find((g) => g.type === t)?._count._all ?? 0;
  const leads = await db.lead.count({ where: { businessId, createdAt: { gte: since } } });
  const stats: BusinessStats = {
    since,
    totals: {
      STORE_VIEW: count("STORE_VIEW"), DIRECTIONS_CLICK: count("DIRECTIONS_CLICK"), PHONE_CLICK: count("PHONE_CLICK"),
      WHATSAPP_CLICK: count("WHATSAPP_CLICK"), WEBSITE_CLICK: count("WEBSITE_CLICK"), LEADS: leads,
    },
    daily: [],
    byBranch: [],
  };
  if (full) {
    const rows = await db.$queryRaw<{ day: Date; views: bigint }[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kuala_Lumpur') AS day, count(*)::bigint AS views
      FROM "AnalyticsEvent"
      WHERE "businessId" = ${businessId} AND type = 'STORE_VIEW' AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`;
    stats.daily = rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), views: Number(r.views) }));
    const per = await db.analyticsEvent.groupBy({
      by: ["branchId", "type"],
      where: { businessId, createdAt: { gte: since }, branchId: { not: null }, type: { in: ["STORE_VIEW", "DIRECTIONS_CLICK"] } },
      _count: { _all: true },
    });
    const branches = await db.branch.findMany({ where: { businessId }, select: { id: true, branchName: true } });
    stats.byBranch = branches.map((b) => ({
      branchId: b.id,
      branchName: b.branchName,
      views: per.find((p) => p.branchId === b.id && p.type === "STORE_VIEW")?._count._all ?? 0,
      directions: per.find((p) => p.branchId === b.id && p.type === "DIRECTIONS_CLICK")?._count._all ?? 0,
    }));
  }
  return stats;
}

export async function getAdminStats(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [byType, topSearches, topStoresRaw, visitors] = await Promise.all([
    db.analyticsEvent.groupBy({ by: ["type"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    db.analyticsEvent.groupBy({
      by: ["searchTerm"], where: { type: "SEARCH", createdAt: { gte: since }, searchTerm: { not: null } },
      _count: { _all: true }, orderBy: { _count: { searchTerm: "desc" } }, take: 15,
    }),
    db.analyticsEvent.groupBy({
      by: ["branchId"], where: { type: "STORE_VIEW", createdAt: { gte: since }, branchId: { not: null } },
      _count: { _all: true }, orderBy: { _count: { branchId: "desc" } }, take: 10,
    }),
    db.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT "visitorHash")::bigint AS n FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} AND "visitorHash" IS NOT NULL`,
  ]);
  const branches = await db.branch.findMany({
    where: { id: { in: topStoresRaw.map((t) => t.branchId!).filter(Boolean) } },
    select: { id: true, branchName: true, business: { select: { name: true } } },
  });
  return {
    since,
    byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])) as Partial<Record<AnalyticsEventType, number>>,
    uniqueVisitors: Number(visitors[0]?.n ?? 0),
    topSearches: topSearches.map((s) => ({ term: s.searchTerm!, count: s._count._all })),
    topStores: topStoresRaw.map((t) => {
      const b = branches.find((x) => x.id === t.branchId);
      return { branchId: t.branchId!, label: b ? `${b.business.name} | ${b.branchName}` : t.branchId!, views: t._count._all };
    }),
  };
}
