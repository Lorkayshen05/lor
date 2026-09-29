// STORE_TYPE categories tag branches. PRODUCT categories group products and point to the store types
// where that kind of product is *worth checking* (availability is never asserted per branch).
export const storeTypes = [
  { slug: "frozen-food", name: "Frozen food shops", nameZh: "冷凍食品", emoji: "🧊", sortOrder: 1, description: "Shops selling frozen meat, seafood, dumplings, fish balls and ready-to-cook frozen items, often by the pack or in bulk." },
  { slug: "fresh-meat", name: "Fresh meat shops", nameZh: "鮮肉", emoji: "🥩", sortOrder: 2, description: "Shops selling fresh (chilled) chicken, pork and beef, usually cut to order." },
  { slug: "seafood-shop", name: "Seafood shops", nameZh: "海鲜", emoji: "🦐", sortOrder: 3, description: "Shops specialising in fresh or frozen fish, prawns, squid and shellfish." },
  { slug: "greengrocer", name: "Vegetable & produce shops", nameZh: "蔬菜", emoji: "🥬", sortOrder: 4, description: "Shops selling fresh vegetables, mushrooms, tofu and produce." },
] as const;

export const productCategories = [
  { slug: "chicken-breast", name: "Chicken breast", nameZh: "鸡胸肉", emoji: "🍗", sortOrder: 1, storeTypes: ["fresh-meat", "frozen-food"], description: "A lean, high-protein cut popular with meal-preppers and gym-goers. Sold fresh or frozen, whole or sliced." },
  { slug: "chicken", name: "Chicken", nameZh: "鸡肉", emoji: "🐔", sortOrder: 2, storeTypes: ["fresh-meat", "frozen-food"], description: "Whole chickens and parts such as thigh, drumstick and wings, fresh or frozen." },
  { slug: "pork", name: "Pork", nameZh: "猪肉", emoji: "🥓", sortOrder: 3, storeTypes: ["fresh-meat", "frozen-food"], description: "Pork belly, ribs, minced pork and sliced pork for stir-fries and hotpot. Not halal." },
  { slug: "beef", name: "Beef", nameZh: "牛肉", emoji: "🥩", sortOrder: 4, storeTypes: ["fresh-meat", "frozen-food"], description: "Beef cuts for stewing, grilling and hotpot, fresh or frozen. Check halal certification if you need it." },
  { slug: "seafood", name: "Seafood", nameZh: "海鲜", emoji: "🦐", sortOrder: 5, storeTypes: ["seafood-shop", "frozen-food"], description: "Prawns, squid, fish fillets and other seafood, fresh or frozen." },
  { slug: "shabu-shabu", name: "Shabu-shabu", nameZh: "涮涮锅", emoji: "🍲", sortOrder: 6, storeTypes: ["fresh-meat", "frozen-food"], description: "Thinly sliced meats for quick-cook shabu-shabu and hotpot." },
  { slug: "hotpot", name: "Hotpot & steamboat", nameZh: "火锅", emoji: "🫕", sortOrder: 7, storeTypes: ["frozen-food", "fresh-meat", "greengrocer"], description: "Everything for a steamboat night: sliced meat, balls, tofu, mushrooms and vegetables." },
  { slug: "dumplings", name: "Dumplings", nameZh: "饺子", emoji: "🥟", sortOrder: 8, storeTypes: ["frozen-food"], description: "Frozen dumplings, wontons and gyoza that cook in minutes." },
  { slug: "fish-balls", name: "Fish balls & fish cake", nameZh: "鱼丸", emoji: "🍢", sortOrder: 9, storeTypes: ["frozen-food"], description: "Fish balls, fish cake and similar processed seafood, a hotpot and noodle-soup staple." },
  { slug: "tofu", name: "Tofu", nameZh: "豆腐", emoji: "🧈", sortOrder: 10, storeTypes: ["greengrocer", "frozen-food"], description: "Silken, firm and fried tofu, a cheap plant-based protein." },
  { slug: "mushrooms", name: "Mushrooms", nameZh: "菇类", emoji: "🍄", sortOrder: 11, storeTypes: ["greengrocer", "frozen-food"], description: "Enoki, shiitake and oyster mushrooms for soups, stir-fries and hotpot." },
  { slug: "vegetables", name: "Vegetables", nameZh: "蔬菜", emoji: "🥬", sortOrder: 12, storeTypes: ["greengrocer", "frozen-food"], description: "Leafy greens and vegetables, fresh or frozen." },
  { slug: "frozen-meals", name: "Frozen meals", nameZh: "冷冻餐", emoji: "🍱", sortOrder: 13, storeTypes: ["frozen-food"], description: "Ready-to-heat or ready-to-cook frozen meals and snacks such as roti canai." },
] as const;
