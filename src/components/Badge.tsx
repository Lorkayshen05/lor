import { cn } from "@/lib/utils";

const styles = {
  featured: "bg-turmeric-100 text-turmeric-700 border-turmeric-400/60",
  sponsored: "bg-ice-100 text-ice-700 border-ice-700/20",
  neutral: "bg-pandan-50 text-pandan-800 border-pandan-200",
  unclaimed: "bg-stone-100 text-stone-600 border-stone-300",
  open: "bg-pandan-100 text-pandan-800 border-pandan-200",
  closed: "bg-chili-50 text-chili-700 border-chili-100",
  unknown: "bg-stone-100 text-stone-600 border-stone-200",
} as const;

export function Badge({ variant = "neutral", children, title }: { variant?: keyof typeof styles; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold leading-5", styles[variant])}>
      {children}
    </span>
  );
}
