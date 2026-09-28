/**
 * Product categories — canonical slugs are used in the database and URLs so
 * they must stay stable. Labels are what customers see and can be freely
 * edited for a rebrand/translation without touching any other code.
 */
export type CategorySlug =
  | "pork"
  | "chicken"
  | "beef"
  | "frozen-meat"
  | "hotpot"
  | "frozen-food"
  | "seafood"
  | "other";

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  shortLabel: string;
  description: string;
}

export const categories: CategoryDef[] = [
  {
    slug: "pork",
    label: "新鲜猪肉",
    shortLabel: "猪肉",
    description: "每日新鲜猪肉，多种部位选择",
  },
  {
    slug: "chicken",
    label: "新鲜鸡肉",
    shortLabel: "鸡肉",
    description: "新鲜鸡肉及鸡件",
  },
  {
    slug: "beef",
    label: "牛肉",
    shortLabel: "牛肉",
    description: "优质牛肉部位",
  },
  {
    slug: "frozen-meat",
    label: "冷冻肉类",
    shortLabel: "冷冻肉",
    description: "急冻肉类，方便保存",
  },
  {
    slug: "hotpot",
    label: "火锅食材",
    shortLabel: "火锅料",
    description: "火锅配料一站购齐",
  },
  {
    slug: "frozen-food",
    label: "冷冻食品",
    shortLabel: "冷冻食品",
    description: "即煮冷冻食品",
  },
  {
    slug: "seafood",
    label: "海鲜",
    shortLabel: "海鲜",
    description: "新鲜及冷冻海鲜",
  },
  {
    slug: "other",
    label: "其他",
    shortLabel: "其他",
    description: "其他精选商品",
  },
];

export const categoryMap: Record<CategorySlug, CategoryDef> = Object.fromEntries(
  categories.map((c) => [c.slug, c])
) as Record<CategorySlug, CategoryDef>;

export function getCategoryLabel(slug: string): string {
  return categoryMap[slug as CategorySlug]?.label ?? slug;
}

export function isCategorySlug(value: string): value is CategorySlug {
  return Object.prototype.hasOwnProperty.call(categoryMap, value);
}
