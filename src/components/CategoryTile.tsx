import Link from "next/link";

const TONES = ["bg-chili-50 border-chili-100", "bg-turmeric-100/60 border-turmeric-400/40", "bg-pandan-50 border-pandan-200", "bg-ice-100 border-ice-700/15"];

export function CategoryTile({ href, emoji, name, nameZh, index }: { href: string; emoji: string; name: string; nameZh?: string | null; index: number }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${TONES[index % TONES.length]}`}>
      <span className="text-3xl sm:text-4xl" aria-hidden="true">{emoji}</span>
      <span className="text-sm font-bold leading-tight">{name}</span>
      {nameZh && <span className="text-xs text-muted">{nameZh}</span>}
    </Link>
  );
}
