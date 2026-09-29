import Link from "next/link";
import { formatDate, formatMyr } from "@/lib/utils";
import { Badge } from "./Badge";

type Deal = {
  id: string; title: string; description: string | null; priceSen: number | null; originalPriceSen: number | null;
  priceUnit: string | null; endsAt: Date; isSponsored: boolean;
  business: { name: string; slug: string };
  branch: { slug: string; branchName: string } | null;
  product?: { name: string; slug: string } | null;
};

export function DealCard({ deal }: { deal: Deal }) {
  const storeHref = deal.branch ? `/stores/${deal.branch.slug}` : `/stores`;
  return (
    <article className="card flex h-full flex-col p-4" data-testid="deal-card">
      <div className="flex items-center gap-2">
        {deal.isSponsored && <Badge variant="sponsored">Sponsored</Badge>}
        <span className="text-xs font-semibold text-chili-700">Ends {formatDate(deal.endsAt, { day: "numeric", month: "short" })}</span>
      </div>
      <h3 className="mt-2 text-lg font-extrabold leading-snug">{deal.title}</h3>
      {deal.priceSen != null && (
        <p className="mt-1 text-2xl font-black text-chili-600">
          {formatMyr(deal.priceSen)}
          {deal.priceUnit && <span className="text-sm font-semibold text-muted"> {deal.priceUnit}</span>}
          {deal.originalPriceSen != null && <span className="ml-2 text-sm font-medium text-muted line-through">{formatMyr(deal.originalPriceSen)}</span>}
        </p>
      )}
      {deal.description && <p className="mt-1 text-sm text-muted">{deal.description}</p>}
      <p className="mt-auto pt-3 text-sm">
        <Link href={storeHref} className="font-semibold text-pandan-700 hover:underline">
          {deal.business.name}{deal.branch ? ` | ${deal.branch.branchName}` : " (all branches)"}
        </Link>
      </p>
    </article>
  );
}
