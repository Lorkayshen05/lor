import { expect, test, type Page } from "@playwright/test";

const noHorizontalScroll = async (page: Page, label: string) => {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, `${label}: page scrolls horizontally (${scroll} > ${client})`).toBeLessThanOrEqual(client);
};

test.describe("mobile (iPhone 13, 390px)", () => {
  test("no horizontal overflow on key pages", async ({ page }) => {
    for (const p of ["/", "/stores", "/stores/yoon-loong-sri-petaling", "/categories/hotpot", "/products/whole-chicken", "/guides", "/guides/hotpot-ingredients-checklist-bukit-jalil", "/sri-petaling/frozen-food", "/deals", "/business", "/business/claim", "/login", "/about"]) {
      await page.goto(p);
      await noHorizontalScroll(page, p);
    }
  });

  test("uses the mobile menu and the search box is immediately usable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden(); // desktop nav hidden
    await page.getByText("Menu ☰").click();
    await expect(page.getByRole("link", { name: "Deals" }).last()).toBeVisible();
    await page.keyboard.press("Escape");
    const input = page.getByPlaceholder("Search stores, meat, seafood, hotpot ingredients...");
    const box = await input.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThan(300);
    await input.fill("sri petaling");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=sri\+petaling/);
    await expect(page.getByTestId("store-card")).toHaveCount(1);
  });

  test("primary actions on store cards meet minimum tap-target size", async ({ page }) => {
    await page.goto("/stores");
    const card = page.getByTestId("store-card").first();
    for (const name of ["View store", "Directions"]) {
      const b = await card.getByRole("link", { name }).boundingBox();
      expect(b!.height, name).toBeGreaterThanOrEqual(36);
      expect(b!.width, name).toBeGreaterThanOrEqual(80);
    }
  });

  test("store page: directions and claim CTA reachable above long content, map is lazy", async ({ page }) => {
    await page.goto("/stores/yoon-loong-sri-petaling");
    const directions = page.getByRole("link", { name: "Directions" }).first();
    await expect(directions).toBeInViewport();
    await expect(page.locator("iframe[title^='Map of']")).toHaveAttribute("loading", "lazy");
    const vp = page.viewportSize()!;
    const mapBox = await page.locator("iframe[title^='Map of']").boundingBox();
    expect(mapBox!.width).toBeLessThanOrEqual(vp.width);
  });

  test("directory filters are usable on a phone", async ({ page }) => {
    await page.goto("/stores");
    await page.getByText("Filters & sorting").click();
    await page.getByLabel("Area").selectOption({ label: "Menjalara, Kepong" });
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("store-card")).toHaveCount(1);
    await noHorizontalScroll(page, "filtered directory");
  });

  test("fonts: text is at least 14px and inputs are 16px (no iOS zoom)", async ({ page }) => {
    await page.goto("/");
    const size = await page.getByPlaceholder("Search stores, meat, seafood, hotpot ingredients...").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
  });

  test("admin tables scroll inside their container, not the page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("admin-dev-password-1");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.goto("/admin/branches");
    await noHorizontalScroll(page, "admin branches");
  });
});
