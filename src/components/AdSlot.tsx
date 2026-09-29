import { db } from "@/lib/db";
import { safeHttpUrl } from "@/lib/utils";
import { TrackedLink } from "./TrackedLink";
import type { AdSlot as Slot } from "@/generated/prisma/enums";
import Link from "next/link";

/**
 * Renders at most ONE clearly-labelled ad per slot. With no active ad, only the homepage slot shows a
 * small "advertise here" placeholder (it doubles as our sales pitch); every other slot renders nothing.
 */
export async function AdSlot({ slot }: { slot: Slot }) {
  const now = new Date();
  const ad = await db.advertisement.findFirst({
    where: { slot, isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
    orderBy: { createdAt: "desc" },
  });
  if (!ad) {
    if (slot !== "HOME_MID") return null;
    return (
      <aside aria-label="Advertising space" className="rounded-xl border border-dashed border-line bg-white/60 p-4 text-center text-sm text-muted">
        <span className="mr-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Advertisement</span>
        Reach local shoppers here. <Link href="/business#advertise" className="font-semibold text-pandan-700 underline">Advertise with us</Link>
      </aside>
    );
  }
  const href = safeHttpUrl(ad.linkUrl);
  if (!href) return null;
  const rel = ad.type === "AFFILIATE" ? "sponsored nofollow noopener noreferrer" : "sponsored noopener noreferrer";
  return (
    <aside aria-label="Advertisement" className="card overflow-hidden p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">{ad.type === "AFFILIATE" ? "Affiliate link · " : ""}Advertisement · {ad.advertiser}</p>
      <TrackedLink href={href} target="_blank" rel={rel} event={{ type: "AD_CLICK", meta: { adId: ad.id } }} className="block">
        {ad.imageUrl && safeHttpUrl(ad.imageUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={safeHttpUrl(ad.imageUrl)!} alt={ad.title} loading="lazy" className="mb-2 max-h-40 w-full rounded-lg object-cover" />
        )}
        <span className="font-bold text-pandan-800 underline">{ad.title}</span>
        {ad.body && <span className="mt-1 block text-sm text-muted">{ad.body}</span>}
      </TrackedLink>
    </aside>
  );
}
