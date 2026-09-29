import { z } from "zod";
import { normalizeMyPhone, safeHttpUrl } from "@/lib/utils";
import { openingHoursSchema } from "@/lib/hours";

const trimmed = (max: number, min = 1) => z.string().trim().min(min).max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

/** Empty string → undefined so blank form fields count as "not provided". */
const blank = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => safeHttpUrl(v) !== null, "Must be a valid http(s) URL")
  .transform((v) => safeHttpUrl(v) as string);

export const myPhone = z
  .string()
  .trim()
  .refine((v) => normalizeMyPhone(v) !== null, "Enter a valid Malaysian phone number, e.g. 012-345 6789")
  .transform((v) => normalizeMyPhone(v) as string);

export const emailField = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  name: trimmed(80, 2),
  email: emailField,
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(200),
});

export const claimSchema = z.object({
  businessId: z.string().min(1),
  claimantName: trimmed(80, 2),
  claimantRole: trimmed(60, 2),
  phone: myPhone,
  email: emailField,
  note: optionalText(1000),
});

export const leadSchema = z
  .object({
    businessId: z.string().min(1),
    branchId: blank(z.string().min(1)),
    type: z.enum(["QUOTATION", "CONTACT"]),
    name: trimmed(80, 2),
    email: blank(emailField),
    phone: blank(myPhone),
    message: trimmed(2000, 10),
    sourcePath: blank(z.string().max(300)),
  })
  .refine((v) => v.email || v.phone, { message: "Provide an email or phone number so the business can reply", path: ["email"] });

export const reviewSchema = z.object({
  branchId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: trimmed(2000, 10),
});

const ringgit = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce.number().min(0).max(100000).optional(),
);

export const dealSchema = z
  .object({
    branchId: blank(z.string().min(1)),
    productId: blank(z.string().min(1)),
    title: trimmed(120, 4),
    description: blank(z.string().trim().max(1000)),
    priceRm: ringgit,
    originalPriceRm: ringgit,
    priceUnit: blank(z.string().trim().max(30)),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "End date must be after the start date", path: ["endsAt"] })
  .refine((v) => v.priceRm == null || v.originalPriceRm == null || v.originalPriceRm >= v.priceRm, {
    message: "Original price must be at least the deal price",
    path: ["originalPriceRm"],
  });

export const branchProfileSchema = z.object({
  phone: blank(myPhone),
  whatsapp: blank(myPhone),
  email: blank(emailField),
  website: blank(httpUrl),
  promoDescription: blank(z.string().trim().max(600)),
  priceLevel: blank(z.coerce.number().int().min(1).max(3)),
  openingHours: blank(z.string().transform((s, ctx) => {
    try {
      const parsed = openingHoursSchema.safeParse(JSON.parse(s));
      if (!parsed.success) throw new Error();
      return parsed.data;
    } catch {
      ctx.addIssue({ code: "custom", message: "Opening hours must be valid" });
      return z.NEVER;
    }
  })),
});

export const businessProfileSchema = z.object({
  description: blank(z.string().trim().max(1500)),
  website: blank(httpUrl),
});

export const businessProductSchema = z.object({
  productId: z.string().min(1),
  branchId: blank(z.string().min(1)),
  priceRm: ringgit,
  priceUnit: blank(z.string().trim().max(30)),
});

export const trackSchema = z.object({
  type: z.enum([
    "PAGE_VIEW", "SEARCH", "STORE_VIEW", "DIRECTIONS_CLICK", "PHONE_CLICK", "WHATSAPP_CLICK",
    "WEBSITE_CLICK", "SPONSORED_CLICK", "AD_CLICK",
  ]),
  path: z.string().max(300).optional(),
  branchId: z.string().max(40).optional(),
  businessId: z.string().max(40).optional(),
  searchTerm: z.string().trim().max(100).optional(),
  meta: z.record(z.string(), z.union([z.string().max(100), z.number(), z.boolean()])).optional(),
});

export type TrackInput = z.infer<typeof trackSchema>;

/** Flatten zod errors to { field: [messages] } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
