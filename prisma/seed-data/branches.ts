// Seed information for Yoon Loong Frozen & Fresh Meat Wholesale Mart branches (name + address only).
// Coordinates are area-level approximations copied from the area centre. Nothing else is asserted:
// no phone numbers, opening hours, prices, ratings or stock.
export const business = {
  slug: "yoon-loong",
  name: "永隆鮮肉凍品鋪",
  nameAlt: "Yoon Loong Frozen & Fresh Meat Wholesale Mart",
  description:
    "Frozen food and fresh meat wholesale mart with multiple branches around Kuala Lumpur and Selangor.",
} as const;

export const branches = [
  { slug: "yoon-loong-sri-petaling", branchName: "Sri Petaling", area: "sri-petaling", addressLine: "No. 52-G, Jalan Radin Anum 1, Bandar Baru Sri Petaling", postcode: "57000", city: "Kuala Lumpur", state: "Kuala Lumpur" },
  { slug: "yoon-loong-serdang", branchName: "Serdang", area: "seri-kembangan", addressLine: "No. 35-G, 36-G, Jalan SK 10/1, Kampung Baru Seri Kembangan", postcode: "43300", city: "Seri Kembangan", state: "Selangor" },
  { slug: "yoon-loong-taman-oug", branchName: "Taman OUG", area: "taman-oug", addressLine: "56, Jalan Hujan Rahmat 2, Taman Overseas Union", postcode: "58200", city: "Kuala Lumpur", state: "Kuala Lumpur" },
  { slug: "yoon-loong-bandar-mahkota-cheras", branchName: "Bandar Mahkota Cheras", area: "bandar-mahkota-cheras", addressLine: "Jalan Temenggung 19/9, Bandar Mahkota Cheras", postcode: "43200", city: "Kajang", state: "Selangor" },
  { slug: "yoon-loong-bandar-puteri-puchong", branchName: "Bandar Puteri Puchong", area: "bandar-puteri-puchong", addressLine: "No. 5 & 7, Jalan Puteri 4/7A, Bandar Puteri", postcode: "47100", city: "Puchong", state: "Selangor" },
  { slug: "yoon-loong-taman-muda", branchName: "Taman Muda", area: "taman-muda-ampang", addressLine: "46, Jalan Bunga Tanjung 9, Taman Muda", postcode: "68000", city: "Ampang", state: "Selangor" },
  { slug: "yoon-loong-pj-ss2", branchName: "PJ SS2", area: "pj-ss2", addressLine: "No. 26-G, Jalan SS2/63, SS2", postcode: "47300", city: "Petaling Jaya", state: "Selangor" },
  { slug: "yoon-loong-ss15", branchName: "SS15", area: "ss15-subang-jaya", addressLine: "44, Jalan SS15/4, SS15", postcode: "47500", city: "Subang Jaya", state: "Selangor" },
  { slug: "yoon-loong-prima-setapak", branchName: "Prima Setapak", area: "setapak", addressLine: "No. 9 & 11, Jalan Prima Setapak 5, Taman Setapak", postcode: "53300", city: "Kuala Lumpur", state: "Kuala Lumpur" },
  { slug: "yoon-loong-menjalara", branchName: "Menjalara", area: "menjalara-kepong", addressLine: "85, Jalan 3/62A, Bandar Menjalara", postcode: "52200", city: "Kepong", state: "Kuala Lumpur" },
  { slug: "yoon-loong-metro-prima-kepong", branchName: "Metro Prima Kepong", area: "metro-prima-kepong", addressLine: "No. 11-G, Jalan Prima 1, Metro Prima", postcode: "52100", city: "Kuala Lumpur", state: "Kuala Lumpur" },
] as const;
