import { expect, test } from "@playwright/test";
import { alerts, eventCount } from "./helpers";

test.describe("homepage", () => {
  test("renders hero, search and every required section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find frozen food, fresh meat & groceries near you.");
    await expect(page.getByPlaceholder("Search stores, meat, seafood, hotpot ingredients...")).toBeVisible();
    await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Near Me/ })).toBeVisible();
    for (const h of ["Popular categories", "Nearby stores", "Browse stores", "Latest deals", "High-protein grocery discovery", "Student meal-prep guides", "Buying frozen food and fresh meat in the Klang Valley", "Own or manage a shop?"]) {
      await expect(page.getByRole("heading", { name: h }), h).toBeVisible();
    }
    await expect(page.getByLabel("Advertising space")).toBeVisible();
    // No deals were invented: the empty state is honest and points to the business flow.
    await expect(page.getByText("No live deals yet.")).toBeVisible();
    await expect(page.getByTestId("store-card")).toHaveCount(9); // 3 nearby + 6 browse
    // No fabricated ratings or prices anywhere on the page.
    await expect(page.locator("main").getByText(/★|RM\s?\d/)).toHaveCount(0);
  });

  test("category tiles link to category pages", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Chicken breast/ }).first().click();
    await expect(page).toHaveURL(/\/categories\/chicken-breast$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chicken breast");
    await expect(page.getByText("We haven’t verified what each branch stocks today")).toBeVisible();
  });
});

test.describe("search & filters", () => {
  test("search box submits to the directory", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Search stores, meat, seafood, hotpot ingredients...").fill("puchong");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/stores\?q=puchong/);
    await expect(page.getByTestId("store-card")).toHaveCount(1);
    await expect(page.getByTestId("store-card")).toContainText("Bandar Puteri Puchong");
  });

  test("product word finds shop TYPES with an honest banner; Chinese name works", async ({ page }) => {
    await page.goto("/stores?q=chicken+breast");
    await expect(page.getByTestId("store-card")).toHaveCount(11);
    await expect(page.getByText(/We haven’t verified what each branch has today/)).toBeVisible();
    await page.goto("/stores?q=" + encodeURIComponent("永隆"));
    await expect(page.getByTestId("store-card")).toHaveCount(11);
  });

  test("no results shows an empty state with reset", async ({ page }) => {
    await page.goto("/stores?q=zzzzqqq");
    await expect(page.getByText("No stores match those filters.")).toBeVisible();
    await page.getByRole("link", { name: "Reset filters" }).click();
    await expect(page.getByTestId("store-card")).toHaveCount(11);
  });

  test("area and category filters", async ({ page }) => {
    await page.goto("/stores");
    await page.getByText("Filters & sorting").click();
    await page.getByLabel("Area").selectOption({ label: "PJ SS2" });
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/area=pj-ss2/);
    await expect(page.getByTestId("store-card")).toHaveCount(1);
    await expect(page.getByTestId("store-card")).toContainText("PJ SS2");

    await page.goto("/stores?category=seafood-shop");
    await expect(page.getByText("No stores match those filters.")).toBeVisible();
    await page.goto("/stores?category=fresh-meat");
    await expect(page.getByTestId("store-card")).toHaveCount(11);
  });

  test("filters that have no data behind them are hidden, not broken", async ({ page }) => {
    await page.goto("/stores");
    await page.getByText("Filters & sorting").click();
    await expect(page.getByLabel("Price level")).toHaveCount(0);
    await expect(page.getByLabel("Open now")).toHaveCount(0);
    await expect(page.getByText("“Open now” appears once shops have verified opening hours.")).toBeVisible();
  });

  test("Near Me sorts by distance from the visitor's location", async ({ browser }) => {
    const context = await browser.newContext({ geolocation: { latitude: 3.2, longitude: 101.72 }, permissions: ["geolocation"] }); // Setapak
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: /Near Me/ }).click();
    await expect(page).toHaveURL(/lat=3\.2000&lng=101\.7200&sort=distance/);
    const first = page.getByTestId("store-card").first();
    await expect(first).toContainText("Prima Setapak");
    await expect(first).toContainText("< 1 km away");
    await context.close();
  });

  test("Near Me handles denied permission gracefully", async ({ browser }) => {
    const context = await browser.newContext({ permissions: [] });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: /Near Me/ }).click();
    await expect(alerts(page)).toContainText("Couldn't get your location");
    await context.close();
  });
});

test.describe("store page", () => {
  test("shows only verified facts and offers the claim path", async ({ page }) => {
    await page.goto("/stores/yoon-loong-sri-petaling");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("永隆鮮肉凍品鋪 | Sri Petaling");
    await expect(page.getByText("No. 52-G, Jalan Radin Anum 1, Bandar Baru Sri Petaling, 57000 Kuala Lumpur, Kuala Lumpur").first()).toBeVisible();
    await expect(page.getByText("Unclaimed listing").first()).toBeVisible();
    await expect(page.getByText("Opening hours haven’t been verified")).toBeVisible();
    await expect(page.getByText("Not listed yet")).toBeVisible(); // phone
    await expect(page.getByRole("link", { name: /^Call/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveCount(0);
    await expect(page.getByText("No approved deals for this store right now.")).toBeVisible();
    await expect(page.getByText("No reviews yet.")).toBeVisible();
    await expect(page.getByTestId("lead-form")).toHaveCount(0); // no enquiries for unclaimed businesses
    const directions = page.getByRole("link", { name: "Directions" }).first();
    await expect(directions).toHaveAttribute("href", /google\.com\/maps\/dir\/\?api=1&destination=.*Radin%20Anum/);
    await expect(page.locator("iframe[title^='Map of']")).toHaveAttribute("src", /output=embed/);
    await expect(page.getByRole("link", { name: "Claim this listing", exact: true })).toHaveAttribute("href", /\/business\/claim\?business=/);
    await expect(page.getByText("Nearby stores")).toBeVisible();
  });

  test("directions click is recorded in analytics (end to end)", async ({ page, context }) => {
    const before = await eventCount("DIRECTIONS_CLICK");
    await page.goto("/stores/yoon-loong-taman-oug");
    const popup = context.waitForEvent("page");
    await page.getByRole("link", { name: "Directions" }).first().click();
    await (await popup).close();
    await expect.poll(() => eventCount("DIRECTIONS_CLICK"), { timeout: 10_000 }).toBe(before + 1);
  });

  test("unknown store is a real 404", async ({ page }) => {
    const res = await page.goto("/stores/does-not-exist");
    expect(res?.status()).toBe(404);
  });
});

test.describe("content pages", () => {
  test("product page is category-level, never claims stock", async ({ page }) => {
    await page.goto("/products/boneless-skinless-chicken-breast");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Boneless skinless chicken breast");
    await expect(page.getByText(/We haven’t verified that any of them has boneless skinless chicken breast in stock/)).toBeVisible();
    await expect(page.getByText("USDA FoodData Central")).toBeVisible();
  });

  test("guide renders markdown, live listings and FAQ", async ({ page }) => {
    await page.goto("/guides/frozen-food-shops-sri-petaling-bukit-jalil");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Frozen food shops in Sri Petaling & Bukit Jalil");
    await expect(page.getByRole("heading", { name: /Shops in our directory near Sri Petaling/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /永隆鮮肉凍品鋪 \| Sri Petaling/ }).first()).toBeVisible();
    await expect(page.getByText("Frequently asked questions")).toBeVisible();
  });

  test("location page is useful and honest when the area itself has no shop", async ({ page }) => {
    await page.goto("/bukit-jalil/frozen-food");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Frozen food shops in Bukit Jalil");
    await expect(page.getByText(/None are inside Bukit Jalil itself yet/)).toBeVisible();
    await expect(page.getByTestId("store-card").first()).toContainText("Sri Petaling");
    await expect(page.getByRole("heading", { name: "What to check before you buy" })).toBeVisible();
  });

  test("deals page has an honest empty state", async ({ page }) => {
    await page.goto("/deals");
    await expect(page.getByText("No live deals right now")).toBeVisible();
  });
});

test.describe("technical SEO", () => {
  test("every indexable page has unique title, description, canonical and OG tags", async ({ page }) => {
    const paths = ["/", "/stores", "/stores/yoon-loong-sri-petaling", "/categories/chicken-breast", "/products/whole-chicken", "/guides", "/guides/student-meal-prep-grocery-guide-malaysia", "/sri-petaling/fresh-meat", "/deals", "/business", "/about"];
    const titles = new Set<string>();
    const descs = new Set<string>();
    for (const p of paths) {
      await page.goto(p);
      const title = await page.title();
      const desc = await page.locator('meta[name="description"]').getAttribute("content");
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(title.length, p).toBeGreaterThan(10);
      expect(desc?.length ?? 0, p).toBeGreaterThan(40);
      expect(desc!.length, p).toBeLessThanOrEqual(160);
      expect(canonical, p).toMatch(new RegExp(`^http://localhost:3100${p === "/" ? "/?" : p.replace(/\//g, "\\/")}$`));
      await expect(page.locator('meta[property="og:title"]'), p).toHaveCount(1);
      await expect(page.locator('meta[property="og:url"]'), p).toHaveCount(1);
      await expect(page.locator('meta[name="robots"][content*="noindex"]'), p).toHaveCount(0);
      titles.add(title);
      descs.add(desc!);
    }
    expect(titles.size).toBe(paths.length);
    expect(descs.size).toBe(paths.length);
  });

  test("structured data: LocalBusiness, BreadcrumbList, FAQ, Article — and nothing unverified", async ({ page }) => {
    const ld = async (path: string) => {
      await page.goto(path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      return blocks.map((b) => JSON.parse(b));
    };
    const store = await ld("/stores/yoon-loong-sri-petaling");
    const lb = store.find((d) => d["@type"] === "GroceryStore");
    expect(lb.address.streetAddress).toContain("Radin Anum");
    for (const k of ["telephone", "openingHoursSpecification", "aggregateRating", "geo"]) expect(lb[k], `${k} must not be emitted without verified data`).toBeUndefined();
    expect(store.find((d) => d["@type"] === "BreadcrumbList").itemListElement).toHaveLength(3);
    const article = await ld("/guides/hotpot-ingredients-checklist-bukit-jalil");
    expect(article.map((d) => d["@type"])).toEqual(expect.arrayContaining(["Article", "FAQPage", "BreadcrumbList"]));
    const area = await ld("/sri-petaling/frozen-food");
    expect(area.map((d) => d["@type"])).toEqual(expect.arrayContaining(["FAQPage", "ItemList", "BreadcrumbList"]));
    const home = await ld("/");
    expect(home.some((d) => d["@type"] === "WebSite" && d.potentialAction)).toBe(true);
  });

  test("filtered directory views are noindex; clean one is indexable", async ({ page }) => {
    await page.goto("/stores?q=chicken");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/stores");
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  });

  test("sitemap lists real pages only; robots protects private areas", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("/stores/yoon-loong-sri-petaling");
    expect(xml).toContain("/sri-petaling/frozen-food");
    expect(xml).toContain("/bukit-jalil/frozen-food");
    expect(xml).toContain("/guides/hotpot-ingredients-checklist-bukit-jalil");
    expect(xml).not.toContain("/categories/seafood-shop"); // empty shop-type page stays out
    expect(xml).not.toContain("/taman-oug/seafood-shop");
    expect(xml).not.toMatch(/\/admin|\/login/);
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap: http://localhost:3100/sitemap.xml");
  });

  test("gated location pages 404 instead of becoming doorway pages", async ({ page }) => {
    for (const p of ["/taman-oug/seafood-shop", "/nowhere/frozen-food", "/sri-petaling/not-a-topic"]) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(404);
    }
  });
});
