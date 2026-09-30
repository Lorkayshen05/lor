import { expect, test } from "@playwright/test";
import { adminPage, alerts } from "./helpers";

test.describe.serial("admin dashboard", () => {
  test("overview and analytics load with real numbers", async ({ browser }) => {
    const { page, context } = await adminPage(browser);
    await expect(page.getByText(/\d+ businesses · \d+ branches/)).toBeVisible();
    await page.goto("/admin/analytics?days=7");
    await expect(page.getByRole("heading", { name: /Analytics — last 7 days/ })).toBeVisible();
    for (const label of ["Page views", "Searches", "Store views", "Directions clicks", "Phone clicks", "WhatsApp clicks", "Business claims", "Lead submissions", "Sponsored clicks"]) {
      await expect(page.locator("p", { hasText: new RegExp(`^${label}$`) }).first(), label).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Top search terms" })).toBeVisible();
    await context.close();
  });

  test("every admin section renders without error", async ({ browser }) => {
    const { page, context } = await adminPage(browser);
    for (const key of ["claims", "deals", "reviews", "photos", "businesses", "branches", "categories", "products", "areas", "leads", "sponsored", "ads", "articles", "plans", "subscriptions", "users"]) {
      const res = await page.goto(`/admin/${key}`);
      expect(res?.status(), key).toBe(200);
      await expect(page.locator("h2").first(), key).toBeVisible();
    }
    expect((await page.goto("/admin/not-a-resource"))?.status()).toBe(404);
    await context.close();
  });

  test("create, edit and delete a business and a branch", async ({ browser }) => {
    const { page, context } = await adminPage(browser);
    await page.goto("/admin/businesses/new");
    await page.getByLabel("Name *").fill("Ah Seng Seafood");
    await page.getByLabel("Alternative / English name").fill("Ah Seng Frozen Seafood");
    await page.getByRole("button", { name: "Create business" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    const row = page.getByTestId("admin-row").filter({ hasText: "ah-seng-seafood" });
    await expect(row).toContainText("unclaimed");

    await page.goto("/admin/branches/new");
    await page.getByLabel("Business *").selectOption({ label: "Ah Seng Seafood" });
    await page.getByLabel("Area *").selectOption({ label: "Taman OUG" });
    await page.getByLabel("Branch name *").fill("OUG Wet Market");
    await page.getByLabel("Address *").fill("1, Jalan Test 1, Taman OUG");
    await page.getByLabel("Postcode *").fill("58200");
    await page.getByLabel("City *").fill("Kuala Lumpur");
    await page.getByLabel("State *").fill("Kuala Lumpur");
    await page.getByLabel("Seafood shops").check();
    await page.getByRole("button", { name: "Create branch" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");

    // The new branch is live on the public site, and the gated SEO page now exists because a real listing does.
    const pub = await context.newPage();
    await pub.goto("/stores/oug-wet-market");
    await expect(pub.getByRole("heading", { level: 1 })).toContainText("Ah Seng Seafood | OUG Wet Market");
    const seo = await pub.goto("/taman-oug/seafood-shop");
    expect(seo?.status()).toBe(200);
    await pub.close();

    // Edit
    await page.goto("/admin/branches?q=OUG+Wet");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await page.getByLabel("Phone (verified only)").fill("03-2222 3333");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");

    // Delete branch then business
    await page.goto("/admin/branches?q=OUG+Wet");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await page.getByText("Delete this branch…").click();
    await page.getByRole("button", { name: "Yes, delete permanently" }).click();
    await expect(page.getByRole("status")).toContainText("Deleted");
    await page.goto("/admin/businesses?q=Ah+Seng");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await page.getByText("Delete this business…").click();
    await page.getByRole("button", { name: "Yes, delete permanently" }).click();
    await expect(page.getByRole("status")).toContainText("Deleted");
    const gone = await context.newPage();
    expect((await gone.goto("/stores/oug-wet-market"))?.status()).toBe(404);
    await gone.close();
    await context.close();
  });

  test("form validation errors are shown and duplicates are refused", async ({ browser }) => {
    const { page, context } = await adminPage(browser);
    await page.goto("/admin/categories/new");
    await page.getByRole("button", { name: "Create category" }).click();
    await expect(alerts(page).first()).toContainText("is required");
    await page.getByLabel("Name *").fill("Tofu duplicate");
    await page.getByLabel("Slug *").fill("tofu");
    await page.getByLabel("Description *").fill("dupe");
    await page.getByRole("button", { name: "Create category" }).click();
    await expect(alerts(page).first()).toContainText("already exists");
    await context.close();
  });

  test("pricing is configurable: changing a plan's price updates /business immediately", async ({ browser }) => {
    const { page, context } = await adminPage(browser);
    const pub = await context.newPage();
    await pub.goto("/business");
    await expect(pub.getByTestId("plan-card").filter({ has: pub.getByRole("heading", { name: "Featured", exact: true }) })).toContainText("RM49");
    await page.goto("/admin/plans");
    await page.getByTestId("admin-row").filter({ hasText: "Featured" }).getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Price (RM) per interval *").fill("59");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    await pub.goto("/business");
    await expect(pub.getByTestId("plan-card").filter({ has: pub.getByRole("heading", { name: "Featured", exact: true }) })).toContainText("RM59");
    await expect(pub.getByTestId("plan-card").filter({ has: pub.getByRole("heading", { name: "Featured", exact: true }) })).not.toContainText("RM49");
    await context.close();
  });

  test("subscription + sponsored listing: labelled, separate from organic results", async ({ browser }) => {
    const { page, context } = await adminPage(browser);
    // Featured subscription for the business → "Featured" badge on its cards.
    await page.goto("/admin/subscriptions/new");
    await page.getByLabel("Business *").selectOption({ label: "永隆鮮肉凍品鋪" });
    await page.getByLabel("Plan *").selectOption({ label: "Featured" });
    await page.getByRole("button", { name: "Create subscription" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");

    // Sponsored listing on the directory for one branch.
    await page.goto("/admin/sponsored/new");
    await page.getByLabel("Business *").selectOption({ label: "永隆鮮肉凍品鋪" });
    await page.getByLabel(/Branch \(blank/).selectOption({ label: "永隆鮮肉凍品鋪 | SS15" });
    await page.getByLabel("Placement *").selectOption("STORE_DIRECTORY");
    const fmt = (d: Date) => new Date(d.getTime() + 8 * 3_600_000).toISOString().slice(0, 16);
    await page.getByLabel("Starts (Malaysia time) *").fill(fmt(new Date(Date.now() - 3_600_000)));
    await page.getByLabel("Ends (Malaysia time) *").fill(fmt(new Date(Date.now() + 86_400_000)));
    await page.getByRole("button", { name: "Create sponsored listing" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");

    const shopper = await context.newPage();
    await shopper.goto("/stores");
    const sponsored = shopper.getByRole("region", { name: "Sponsored" });
    await expect(sponsored).toBeVisible();
    await expect(sponsored.getByTestId("store-card")).toHaveCount(1);
    await expect(sponsored.getByTestId("store-card")).toContainText("Sponsored");
    await expect(sponsored.getByTestId("store-card")).toContainText("SS15");
    // Organic results are still alphabetical by branch and unaffected by payment.
    const organic = shopper.getByRole("region", { name: "Results" }).getByTestId("store-card");
    await expect(organic).toHaveCount(11);
    const names = await organic.locator("h2, h3").allInnerTexts();
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
    // Featured badge appears on organic cards for the subscribed business and is a distinct label.
    await expect(organic.first()).toContainText("Featured");
    // "Featured only" filter now exists.
    await shopper.getByText("Filters & sorting").click();
    await expect(shopper.getByLabel("Featured & sponsored only")).toBeVisible();
    await shopper.close();

    // Homepage / directory data reset so later specs see a neutral state.
    await page.goto("/admin/subscriptions");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await page.getByText("Delete this subscription…").click();
    await page.getByRole("button", { name: "Yes, delete permanently" }).click();
    await page.goto("/admin/sponsored");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await page.getByText("Delete this sponsored listing…").click();
    await page.getByRole("button", { name: "Yes, delete permanently" }).click();
    await context.close();
  });

  test("advertisement placeholder becomes a labelled ad; unsafe URLs are refused", async ({ browser }) => {
    const { page, context } = await adminPage(browser);
    await page.goto("/admin/ads/new");
    await page.getByLabel("Advertiser *").fill("FreezerPro");
    await page.getByLabel("Headline *").fill("Chest freezers on sale");
    await page.getByLabel("Destination URL *").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Create advertisement" }).click();
    await expect(alerts(page).first()).toContainText("valid http(s) URL");
    await page.getByLabel("Destination URL *").fill("https://freezerpro.example/offer");
    await page.getByRole("button", { name: "Create advertisement" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    const shopper = await context.newPage();
    await shopper.goto("/");
    const ad = shopper.getByLabel("Advertisement", { exact: true });
    await expect(ad).toContainText("Advertisement · FreezerPro");
    await expect(ad.getByRole("link", { name: "Chest freezers on sale" })).toHaveAttribute("rel", /sponsored/);
    await shopper.close();
    await page.goto("/admin/ads");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await page.getByText("Delete this advertisement…").click();
    await page.getByRole("button", { name: "Yes, delete permanently" }).click();
    await context.close();
  });

  test("articles: draft is hidden, published appears with sponsored label", async ({ browser }) => {
    const { page, context } = await adminPage(browser);
    await page.goto("/admin/articles/new");
    await page.getByLabel("Title *").fill("Sponsored freezer buying tips");
    await page.getByLabel("Excerpt *").fill("Tips from a sponsor.");
    await page.getByLabel(/^Body/).fill("## Hello\n\nSome **markdown** <script>alert(1)</script> and a [link](/stores).");
    await page.getByLabel("Sponsored article").check();
    await page.getByLabel("Sponsor name").fill("FreezerPro");
    await page.getByRole("button", { name: "Create article" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    const shopper = await context.newPage();
    expect((await shopper.goto("/guides/sponsored-freezer-buying-tips"))?.status()).toBe(404); // draft
    await page.goto("/admin/articles?q=Sponsored+freezer");
    await page.getByRole("link", { name: "Edit" }).first().click();
    await page.getByLabel("Status *").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Save changes" }).click();
    await shopper.goto("/guides/sponsored-freezer-buying-tips");
    await expect(shopper.getByText("Sponsored content · FreezerPro")).toBeVisible();
    await expect(shopper.locator("article script")).toHaveCount(0); // raw HTML is not rendered
    // The raw HTML is shown as inert, escaped text — never executed or rendered as markup.
    await expect(shopper.locator("article").getByText("<script>alert(1)</script>")).toBeVisible();
    await shopper.close();
    await context.close();
  });
});
