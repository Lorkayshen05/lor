import {
  Code2,
  Grid3x3,
  Table2,
  Sigma,
  Database,
  Brain,
  Network,
  Sparkles,
  Bot,
  Rocket,
  Book,
  Flame,
  Star,
  Trophy,
  Swords,
  Footprints,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  code: Code2,
  grid: Grid3x3,
  table: Table2,
  sigma: Sigma,
  database: Database,
  brain: Brain,
  network: Network,
  sparkles: Sparkles,
  bot: Bot,
  rocket: Rocket,
  book: Book,
  flame: Flame,
  star: Star,
  trophy: Trophy,
  swords: Swords,
  footprints: Footprints,
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Book;
  return <Cmp className={className} aria-hidden="true" />;
}
