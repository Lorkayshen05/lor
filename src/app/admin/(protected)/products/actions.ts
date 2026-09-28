"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation/product";

export interface ProductFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }
  return supabase;
}

function parseForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    price: formData.get("price"),
    unit: formData.get("unit"),
    image_url: formData.get("image_url"),
    stock_status: formData.get("stock_status"),
    featured: formData.get("featured") === "on",
  });
}

export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const supabase = await requireAdmin();
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: "请检查表单内容", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { error } = await supabase.from("products").insert(parsed.data);

  if (error) {
    return { error: `保存失败：${error.message}` };
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const supabase = await requireAdmin();
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: "请检查表单内容", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { error } = await supabase.from("products").update(parsed.data).eq("id", id);

  if (error) {
    return { error: `更新失败：${error.message}` };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    throw new Error(`删除失败：${error.message}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
}
