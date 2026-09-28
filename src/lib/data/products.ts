import "server-only";
import { createClient } from "@/lib/supabase/server";
import { escapePostgrestValue } from "@/lib/supabase/postgrest";
import type { Product } from "@/lib/types/database";

export type ProductSort = "newest" | "price-asc" | "price-desc";

export interface ProductFilters {
  category?: string;
  q?: string;
  sort?: ProductSort;
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select("*");

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.q && filters.q.trim().length > 0) {
    const term = filters.q.trim().replace(/[%_]/g, "");
    const pattern = escapePostgrestValue(`%${term}%`);
    query = query.or(`name.ilike.${pattern},description.ilike.${pattern}`);
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`无法读取商品列表：${error.message}`);
  }

  return data ?? [];
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`无法读取精选商品：${error.message}`);
  }

  return data ?? [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`无法读取商品详情：${error.message}`);
  }

  return data;
}

export async function getRelatedProducts(category: string, excludeId: string, limit = 4): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", category)
    .neq("id", excludeId)
    .limit(limit);

  if (error) {
    throw new Error(`无法读取相关商品：${error.message}`);
  }

  return data ?? [];
}
