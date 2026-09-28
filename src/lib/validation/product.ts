import { z } from "zod";
import { categories } from "@/config/categories";
import { STOCK_STATUS_VALUES } from "@/config/stock-status";

const categorySlugs = categories.map((c) => c.slug) as [string, ...string[]];

export const productSchema = z.object({
  name: z.string().trim().min(1, "请输入商品名称").max(120),
  description: z.string().trim().max(2000).optional().default(""),
  category: z.enum(categorySlugs, { message: "请选择商品分类" }),
  price: z.coerce
    .number({ message: "请输入有效价格" })
    .min(0, "价格不可小于0")
    .max(999999, "价格过高"),
  unit: z.string().trim().min(1, "请输入单位，例如：斤 / 包 / 份").max(20),
  image_url: z
    .string()
    .trim()
    .url("图片链接格式不正确")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  stock_status: z.enum(STOCK_STATUS_VALUES),
  featured: z.coerce.boolean().optional().default(false),
});

export type ProductFormValues = z.infer<typeof productSchema>;
