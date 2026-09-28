-- Sample catalog data for local development / demos.
-- Safe to delete or replace entirely for a real client launch.

insert into public.products
  (name, description, category, price, unit, stock_status, featured)
values
  ('猪五花肉', '肥瘦均匀，适合红烧、卤肉、烧烤', 'pork', 26.90, '斤', 'in_stock', true),
  ('猪里肌肉', '肉质嫩滑，适合快炒、煎炸', 'pork', 24.50, '斤', 'in_stock', false),
  ('猪肉碎', '新鲜绞制，适合包饺子、煮汤', 'pork', 22.00, '斤', 'in_stock', false),
  ('猪排骨', '适合炖汤、糖醋排骨', 'pork', 28.00, '斤', 'low_stock', false),

  ('鸡全鸡', '农场新鲜整鸡，约1.5-1.8公斤', 'chicken', 16.90, '只', 'in_stock', true),
  ('鸡胸肉', '低脂高蛋白，健身首选', 'chicken', 14.90, '斤', 'in_stock', false),
  ('鸡翅膀', '适合烧烤、炸鸡翅', 'chicken', 15.50, '斤', 'in_stock', false),
  ('鸡腿肉', '去骨鸡腿，肉质多汁', 'chicken', 17.00, '斤', 'out_of_stock', false),

  ('牛肉片', '火锅、快炒适用，薄切', 'beef', 42.00, '斤', 'in_stock', true),
  ('牛腩', '炖煮首选，适合咖喱牛腩', 'beef', 38.50, '斤', 'in_stock', false),
  ('牛肉碎', '新鲜绞制牛肉碎', 'beef', 40.00, '斤', 'low_stock', false),

  ('冷冻猪扒', '腌制即煎猪扒，方便快捷', 'frozen-meat', 19.90, '包', 'in_stock', false),
  ('冷冻鸡块', '香脆炸鸡块，即炸即食', 'frozen-meat', 18.50, '包', 'in_stock', true),
  ('冷冻牛肉丸', '弹牙牛肉丸，煮汤火锅皆宜', 'frozen-meat', 21.00, '包', 'in_stock', false),

  ('火锅综合拼盘', '什锦火锅料，多种配料组合', 'hotpot', 32.00, '份', 'in_stock', true),
  ('鱼豆腐', '火锅必备，口感嫩滑', 'hotpot', 9.90, '包', 'in_stock', false),
  ('蟹柳', '火锅、沙拉皆可', 'hotpot', 11.50, '包', 'in_stock', false),
  ('墨鱼滑', '手工墨鱼浆，弹性十足', 'hotpot', 15.90, '包', 'low_stock', false),

  ('冷冻薯条', '香脆金黄薯条', 'frozen-food', 8.90, '包', 'in_stock', false),
  ('冷冻水饺', '猪肉白菜水饺，即煮即食', 'frozen-food', 13.90, '包', 'in_stock', true),
  ('冷冻烧卖', '经典港式烧卖', 'frozen-food', 12.50, '包', 'in_stock', false),

  ('新鲜虾', '中型鲜虾，适合白灼、蒜蓉蒸', 'seafood', 35.00, '斤', 'in_stock', true),
  ('鲜鱼', '本地鲜鱼，每日到货', 'seafood', 22.00, '尾', 'low_stock', false),
  ('鱿鱼', '新鲜鱿鱼，适合快炒、烧烤', 'seafood', 28.00, '斤', 'in_stock', false),

  ('鸡蛋', '本地新鲜鸡蛋，30粒装', 'other', 14.90, '盘', 'in_stock', false),
  ('腌料包', '自家调配腌料，方便入味', 'other', 6.50, '包', 'in_stock', false)
on conflict do nothing;
