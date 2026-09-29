import "server-only";
import { redirect } from "next/navigation";
import { requireBusinessPage } from "@/lib/auth/guards";
import { managedBusinesses } from "@/lib/services/access";
import { effectiveTier } from "@/lib/plans";

export async function getDashboardContext(bParam?: string) {
  const session = await requireBusinessPage();
  const businesses = await managedBusinesses(session);
  if (businesses.length === 0) redirect("/business/claim");
  const business = businesses.find((b) => b.id === bParam) ?? businesses[0];
  return { session, businesses, business, tier: effectiveTier(business.subscription) };
}

export type DashboardContext = Awaited<ReturnType<typeof getDashboardContext>>;
