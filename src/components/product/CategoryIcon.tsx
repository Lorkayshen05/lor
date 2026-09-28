import {
  Beef,
  Drumstick,
  Snowflake,
  Soup,
  Fish,
  Package,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { CategorySlug } from "@/config/categories";

const iconMap: Record<CategorySlug, LucideIcon> = {
  pork: Beef,
  chicken: Drumstick,
  beef: Beef,
  "frozen-meat": Snowflake,
  hotpot: Soup,
  "frozen-food": Snowflake,
  seafood: Fish,
  other: Package,
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = iconMap[slug as CategorySlug] ?? UtensilsCrossed;
  return <Icon className={className} aria-hidden />;
}
