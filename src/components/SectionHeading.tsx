import Link from "next/link";

export function SectionHeading({ title, sub, href, cta }: { title: string; sub?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted sm:text-base">{sub}</p>}
      </div>
      {href && cta && <Link href={href} className="shrink-0 text-sm font-semibold text-pandan-700 hover:underline">{cta} →</Link>}
    </div>
  );
}
