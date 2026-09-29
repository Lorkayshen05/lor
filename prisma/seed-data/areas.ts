// Area centres are APPROXIMATE neighbourhood-level points (used for distance sorting and SEO radius only).
// They are not surveyed coordinates and must never be used for navigation; directions use the written address.
export const areas = [
  { slug: "kuala-lumpur", name: "Kuala Lumpur", city: "Kuala Lumpur", state: "Kuala Lumpur", lat: 3.139, lng: 101.6869, radiusKm: 15, blurb: "Kuala Lumpur city and the surrounding Klang Valley suburbs." },
  { slug: "sri-petaling", name: "Sri Petaling", city: "Kuala Lumpur", state: "Kuala Lumpur", lat: 3.072, lng: 101.696, radiusKm: 5, blurb: "Bandar Baru Sri Petaling, a dense residential and commercial area in south Kuala Lumpur, close to Bukit Jalil." },
  { slug: "bukit-jalil", name: "Bukit Jalil", city: "Kuala Lumpur", state: "Kuala Lumpur", lat: 3.056, lng: 101.696, radiusKm: 5, blurb: "Bukit Jalil in south Kuala Lumpur. No branches are listed inside Bukit Jalil itself yet; the nearest listed shops are in neighbouring Sri Petaling." },
  { slug: "seri-kembangan", name: "Seri Kembangan & Serdang", city: "Seri Kembangan", state: "Selangor", lat: 3.03, lng: 101.707, radiusKm: 5, blurb: "Kampung Baru Seri Kembangan and the Serdang area in Selangor." },
  { slug: "taman-oug", name: "Taman OUG", city: "Kuala Lumpur", state: "Kuala Lumpur", lat: 3.082, lng: 101.664, radiusKm: 5, blurb: "Taman Overseas Union Garden (OUG) in south-west Kuala Lumpur." },
  { slug: "bandar-mahkota-cheras", name: "Bandar Mahkota Cheras", city: "Kajang", state: "Selangor", lat: 3.037, lng: 101.811, radiusKm: 6, blurb: "Bandar Mahkota Cheras, a township on the Kajang side of Cheras." },
  { slug: "bandar-puteri-puchong", name: "Bandar Puteri Puchong", city: "Puchong", state: "Selangor", lat: 3.025, lng: 101.618, radiusKm: 6, blurb: "Bandar Puteri, a township in Puchong, Selangor." },
  { slug: "taman-muda-ampang", name: "Taman Muda, Ampang", city: "Ampang", state: "Selangor", lat: 3.12, lng: 101.764, radiusKm: 5, blurb: "Taman Muda, a residential neighbourhood in Ampang." },
  { slug: "pj-ss2", name: "PJ SS2", city: "Petaling Jaya", state: "Selangor", lat: 3.118, lng: 101.622, radiusKm: 5, blurb: "SS2 in Petaling Jaya, a long-established neighbourhood with many food and grocery businesses." },
  { slug: "ss15-subang-jaya", name: "SS15 Subang Jaya", city: "Subang Jaya", state: "Selangor", lat: 3.077, lng: 101.588, radiusKm: 5, blurb: "SS15 in Subang Jaya, near the university and college area." },
  { slug: "setapak", name: "Setapak", city: "Kuala Lumpur", state: "Kuala Lumpur", lat: 3.2, lng: 101.72, radiusKm: 5, blurb: "Taman Setapak and Prima Setapak in north-east Kuala Lumpur." },
  { slug: "menjalara-kepong", name: "Menjalara, Kepong", city: "Kepong", state: "Kuala Lumpur", lat: 3.193, lng: 101.63, radiusKm: 5, blurb: "Bandar Menjalara in Kepong, north-west Kuala Lumpur." },
  { slug: "metro-prima-kepong", name: "Metro Prima, Kepong", city: "Kuala Lumpur", state: "Kuala Lumpur", lat: 3.199, lng: 101.639, radiusKm: 5, blurb: "Metro Prima in Kepong, north-west Kuala Lumpur." },
] as const;
