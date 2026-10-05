# Ruby Dessert House · 芝麻糊大王

Mobile-first ordering web app for **Kan Brothers Ruby Dessert House — since 1927**.
React 19 + TypeScript + Vite, i18next (50 languages, RTL), no backend required to run.

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # 82 unit + UI tests (vitest, jsdom)
npm run build          # typecheck + production build
npm run check:mobile   # real-browser layout audit (see below)
```

## ⚠️ Read this first: the menu is sample data

No Ruby menu, prices or photos were available when this was built. `src/data/menu.ts` holds
**17 clearly flagged placeholder items** (`placeholder: true`) and generated bowl illustrations.
A banner says so on every page. To go live: replace the array with the real menu (same `MenuItem`
shape), swap `image` for real photos, and remove the `placeholder` flags — the banner disappears
on its own. Outlet details live in `src/data/restaurant.ts` (`OUTLETS` is empty until supplied).

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/data/` | Menu (only place with names/prices), brand and checkout config |
| `src/services/` | Pure, tested business logic: `pricing`, `cart`, `recommendations`, `budgetPlanner`, `bestSellers`, `orderHistory`, `checkout`, `search`, `discovery`, `visit` |
| `src/state/AppContext.tsx` | One provider: order type, table, cart, wizard/planner progress, history. Lives **outside** i18n, so changing language cannot reset anything |
| `src/i18n/` | Language registry (50), lazy-loaded locales, `setLanguage` (sets `<html lang/dir>`) |
| `src/components`, `src/pages` | UI only; no pricing or recommendation logic |

Key rules enforced in code and tests:

- **Money is integer sen.** `getUnitPrice()` is the single place that picks dine-in vs takeaway price.
- **Recommendations are rule-based** (history, cart, flavour preference, budget, curation flags) over real,
  available menu items. No ML is claimed or implemented.
- **Budget planner never exceeds the budget** (checked for every people × budget × order type).
- **"Best seller" is evidence-based.** `computeBestSellers` returns `null` below 50 real orders, and the UI
  shows *Our Signatures*. Wire a backend into `SalesDataSource` and it flips to ranked *Best Sellers* automatically.
  Customer-device history is never used as sales data.
- **Order history** sits behind `OrderRepository` (localStorage today; swap for a secure backend). Only an
  anonymous device id, items, totals, order type and table number are stored; name/phone go to the
  `OrderGateway` for that order only and are never persisted.

## Languages

All 50 requested languages are registered and selectable (searchable sheet). Honest coverage today:

- **Full UI** (strings + dish names): English, 简体中文, 繁體中文, Bahasa Melayu, العربية
- **Core flows** (navigation, order buttons, language picker; rest falls back to English): 43 more, incl. Cantonese (falls back to zh-TW)
- **Hokkien**: no own strings yet, shows Traditional Chinese.

**None of the non-English translations are professionally verified**, and the UI says so. Cantonese and Hokkien
need native-speaker validation. RTL (Arabic, Persian, Hebrew, Urdu) uses logical CSS properties, mirrored icons
and isolated LTR price/number runs.

## Mobile verification

`npm run check:mobile` drives headless Chromium over 8 routes × 7 widths (375/390/393/412/768/1024/1440) × 4
languages (en, ar, ms, zh-CN), plus the language sheet, and fails on: horizontal scroll, any element outside the
viewport, controls under 44×44px, or console errors. Set `CHROMIUM_PATH` if Playwright's browser isn't installed
and `SHOTS=dir` to save screenshots. This is a layout check, **not a substitute for testing on real phones**.
