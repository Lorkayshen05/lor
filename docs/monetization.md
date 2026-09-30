# Monetization

## Principles
1. **Paid never masquerades as organic.** Paid placements carry a visible "Featured" or "Sponsored" label, live in
   separate slots, and never change organic ordering (organic = distance or A–Z; asserted by an e2e test).
2. **Pricing is data.** `Plan.priceSen` is edited in `/admin/plans`; the `/business` page and dashboard read it live.
   Code checks capabilities (`src/lib/plans.ts`), never prices. The seeded RM49 / RM99 are *examples*.
3. **No mandatory payments in the MVP.** Plans are activated by an admin (`/admin/subscriptions`) after the owner
   pays by bank transfer/DuitNow/FPX link. `Subscription.currentPeriodEnd` switches features off automatically.

## Revenue streams (in the order I'd try them)
| # | Stream | How it works in the code | When it makes sense |
|---|---|---|---|
| 1 | **Featured / Premium listing** | `Plan` + `Subscription`. Featured = badge, promo text, more photos. Premium adds homepage slot, featured deals, full analytics, lead tracking | After 3–5 owners *use* the free dashboard weekly |
| 2 | **Sponsored placement** | `SponsoredListing` (placement, category/area, dates, priority). Renders in a labelled block | Sell per month to a few shops; simplest to explain |
| 3 | **Sponsored deals** | `Deal.isSponsored` → "Sponsored" label | Suppliers/brands wanting shelf visibility |
| 4 | **Sponsored articles** | `Article.isSponsored/sponsorName/sponsorUrl` → labelled, `rel=sponsored nofollow` | Needs traffic on guides |
| 5 | **Lead generation** | `Lead` (quotation/contact) only on *claimed* listings; inbox is free | Caterers/F&B buying in bulk are the valuable segment |
| 6 | **Display / affiliate** | `Advertisement` (slot, DISPLAY/AFFILIATE), one labelled ad per slot | Only worth it at ~10k+ monthly sessions |

Deliberate choice: the lead **inbox is free**. Charging owners to read enquiries customers already sent creates
resentment. Premium sells lead *tracking* and analytics instead.

## Adding payments later
`Subscription.provider` supports `MANUAL | STRIPE | BILLPLZ`. For Malaysia, FPX/DuitNow QR matter more than cards:
prefer Billplz/Toyyibpay/Stripe-FPX. Implement a webhook route that verifies the provider signature, then upserts the
`Subscription` (status, `currentPeriodEnd`, `providerRef`). Do not build this until manual sales prove demand.
