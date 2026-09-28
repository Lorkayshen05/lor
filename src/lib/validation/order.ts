import { z } from "zod";

export const cartItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(999),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "请输入姓名").max(80),
  phone: z
    .string()
    .trim()
    .min(7, "请输入有效电话号码")
    .max(20, "电话号码过长")
    .regex(/^[0-9+\-\s]+$/, "电话号码格式不正确"),
  address: z.string().trim().min(5, "请输入完整地址").max(500),
  notes: z.string().trim().max(500).optional().default(""),
  items: z.array(cartItemInputSchema).min(1, "购物车是空的"),
  // Honeypot: a hidden field real customers never see or fill. Left as a
  // plain string (not refined to empty) so a filled value still parses and
  // the server action can quietly drop the submission instead of leaking
  // "spam detected" behavior back to whatever filled it in.
  company: z.string().optional().default(""),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const orderStatusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["new", "confirmed", "preparing", "completed", "cancelled"]),
});
