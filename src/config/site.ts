/**
 * Business configuration — replace these placeholder values when reusing this
 * template for a different client. Nothing else in the codebase should need
 * to change for a rebrand.
 */
export const siteConfig = {
  name: "永隆鮮肉凍品鋪",
  shortName: "永隆鮮肉",
  tagline: "新鲜直送，信誉之选",
  description:
    "永隆鮮肉凍品鋪提供新鲜猪肉、鸡肉、牛肉、海鲜及各类冷冻食材，品质新鲜，价格实惠，欢迎WhatsApp下单。",
  locale: "zh-Hans",
  currency: "MYR",
  currencySymbol: "RM",

  // Placeholder contact details — replace with the real business info.
  phone: "+60 12-345 6789",
  whatsappNumber: "60123456789", // digits only, country code without "+"
  email: "hello@example.com",
  address: "12, Jalan Contoh 1, Taman Contoh, 47000 Sungai Buloh, Selangor",
  businessHours: "每日 7:00am - 7:00pm",

  // Used for absolute URLs (metadata, sitemap, OG images).
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  social: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
  },

  // Minimum order subtotal (RM) required to check out. Set to 0 to disable.
  minOrderAmount: 0,

  deliveryNote: "本地配送 / 门市自取，详情请通过WhatsApp咨询。",
} as const;
