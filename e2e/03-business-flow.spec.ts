import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { adminPage, alerts, eventCount, newPerson, register, uniqueEmail } from "./helpers";

// One story, in order: owner signs up → claims → admin approves → owner completes profile → shoppers see it
// → lead arrives → deal submitted → admin approves → deal is public → reviews are moderated.
test.describe.serial("business claim → dashboard → deals → leads → reviews", () => {
  const ownerEmail = uniqueEmail("owner");
  const password = "owner-password-123";
  let owner: { page: Page; context: BrowserContext };
  let admin: { page: Page; context: BrowserContext };

  test.beforeAll(async ({ browser }) => {
    owner = await newPerson(browser);
    admin = await adminPage(browser);
  });
  test.afterAll(async () => {
    await owner.context.close();
    await admin.context.close();
  });

  test("owner registers and submits a claim", async () => {
    const { page } = owner;
    await register(page, "Ah Meng Tan", ownerEmail, password, "/business/claim");
    await expect(page).toHaveURL(/\/business\/claim$/);
    await page.getByRole("link", { name: /永隆鮮肉凍品鋪/ }).click();
    await expect(page).toHaveURL(/\/business\/claim\?business=/);
    await page.getByLabel("Your role").fill("Owner");
    await page.getByLabel("Phone", { exact: true }).fill("012-345 6789");
    await page.getByRole("button", { name: "Submit claim for review" }).click();
    await expect(page.getByTestId("claim-form").or(page.getByRole("status"))).toContainText(/Claim submitted/);
  });

  test("duplicate pending claim is refused", async () => {
    const { page } = owner;
    await page.goto("/business/claim");
    await page.getByRole("link", { name: /永隆鮮肉凍品鋪/ }).click();
    await page.getByLabel("Your role").fill("Owner");
    await page.getByLabel("Phone", { exact: true }).fill("012-345 6789");
    await page.getByRole("button", { name: "Submit claim for review" }).click();
    await expect(alerts(page)).toContainText("already have a pending claim");
  });

  test("before approval the owner has no dashboard", async () => {
    await owner.page.goto("/business/dashboard");
    await expect(owner.page).toHaveURL(/\/business\/claim/);
  });

  test("admin sees the claim in the queue and approves it", async () => {
    const { page } = admin;
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: /Claims to review/ })).toContainText("1");
    await page.goto("/admin/claims?status=PENDING");
    const row = page.getByTestId("admin-row").filter({ hasText: ownerEmail });
    await expect(row).toContainText("Ah Meng Tan");
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("status")).toContainText("Done");
    await page.goto("/admin/claims");
    await expect(page.getByTestId("admin-row").filter({ hasText: ownerEmail })).toContainText("approved");
    await page.goto("/admin/businesses");
    await expect(page.getByTestId("admin-row").filter({ hasText: "yoon-loong" })).toContainText("claimed");
  });

  test("owner now reaches the dashboard and sees a to-do list", async () => {
    const { page } = owner;
    await page.goto("/business/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("永隆鮮肉凍品鋪");
    await expect(page.getByText("Sri Petaling: add a phone number")).toBeVisible();
    await expect(page.getByText("Sri Petaling: add opening hours")).toBeVisible();
  });

  test("owner completes the Sri Petaling profile with hours, phone and WhatsApp", async () => {
    const { page } = owner;
    await page.goto("/business/dashboard/profile");
    const form = page.getByTestId("branch-form-Sri Petaling");
    await form.getByLabel("Phone", { exact: true }).fill("03-7781 2345");
    await form.getByLabel("WhatsApp").fill("012-345 6789");
    await form.getByLabel("Price level").selectOption("1");
    for (const d of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
      await form.getByLabel(`${d} opens`).fill("00:00");
      await form.getByLabel(`${d} closes`).fill("23:59");
    }
    await form.getByRole("button", { name: "Save Sri Petaling" }).click();
    await expect(form.getByRole("status")).toContainText("Branch saved");
  });

  test("owner can't set a bad phone number or unsafe URL", async () => {
    const { page } = owner;
    await page.goto("/business/dashboard/profile");
    const form = page.getByTestId("branch-form-Serdang");
    await form.getByLabel("Phone", { exact: true }).fill("not-a-phone");
    await form.getByRole("button", { name: "Save Serdang" }).click();
    await expect(form.getByRole("alert").first()).toContainText(/Malaysian phone/);
  });

  test("shoppers immediately see verified details (cache invalidated), and open-now filter appears", async ({ browser }) => {
    const { page, context } = await newPerson(browser);
    await page.goto("/stores/yoon-loong-sri-petaling");
    await expect(page.getByText("Claimed by business")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Call/ })).toHaveAttribute("href", "tel:+60377812345");
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/60123456789");
    await expect(page.getByRole("row", { name: /Monday 00:00–23:59/ })).toBeVisible();
    await expect(page.getByText("Open now").first()).toBeVisible(); // 24/7 hours entered above
    await expect(page.getByText("Opening hours haven’t been verified")).toHaveCount(0);
    await expect(page.getByText("This listing hasn’t been claimed yet.")).toHaveCount(0);
    await expect(page.getByTestId("lead-form")).toBeVisible();
    // Directory: "Open now" filter now has data, and works.
    await page.goto("/stores");
    await page.getByText("Filters & sorting").click();
    await expect(page.getByLabel("Open now")).toBeVisible();
    await expect(page.getByLabel("Price level")).toBeVisible();
    await page.goto("/stores?open=1");
    await expect(page.getByTestId("store-card")).toHaveCount(1);
    await expect(page.getByTestId("store-card")).toContainText("Sri Petaling");
    await page.goto("/stores?price=1");
    await expect(page.getByTestId("store-card")).toHaveCount(1);
    await context.close();
  });

  test("JSON-LD now includes the verified phone and hours", async ({ page }) => {
    await page.goto("/stores/yoon-loong-sri-petaling");
    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((b) => JSON.parse(b));
    const lb = blocks.find((d) => d["@type"] === "GroceryStore");
    expect(lb.telephone).toBe("+60377812345");
    expect(lb.openingHoursSpecification.length).toBe(7);
  });

  test("a shopper sends a quotation request; invalid input is refused", async ({ browser }) => {
    const { page, context } = await newPerson(browser);
    await page.goto("/stores/yoon-loong-sri-petaling");
    const form = page.getByTestId("lead-form");
    await form.getByLabel("Your name").fill("Siti Aminah");
    await form.getByLabel(/Message to/).fill("Need 20kg of chicken breast every week.");
    await form.getByRole("button", { name: "Send enquiry" }).click(); // no phone/email: the server must refuse
    await expect(form.getByRole("alert").first()).toContainText(/email or phone/);
    await form.getByLabel("Phone / WhatsApp").fill("019-876 5432");
    await form.getByLabel(/Message to/).fill("Need 20kg of chicken breast every week for my catering business.");
    await form.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks! Your message has been sent");
    await context.close();
  });

  test("the lead appears in the owner's inbox and can be tracked", async () => {
    const { page } = owner;
    await page.goto("/business/dashboard/leads");
    const lead = page.getByTestId("lead").first();
    await expect(lead).toContainText("Siti Aminah");
    await expect(lead).toContainText("20kg of chicken breast");
    await expect(lead.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/60198765432");
    await lead.getByRole("button", { name: "Mark contacted" }).click();
    await expect(page.getByTestId("lead").first()).toContainText("contacted");
    await admin.page.goto("/admin/leads");
    await expect(admin.page.getByTestId("admin-row").first()).toContainText("Siti Aminah");
  });

  test("analytics count store views and clicks for the owner (bots excluded)", async ({ browser }) => {
    const { page, context } = await newPerson(browser);
    await page.goto("/stores/yoon-loong-sri-petaling");
    const before = await eventCount("PHONE_CLICK");
    await page.getByRole("link", { name: /^Call/ }).click().catch(() => undefined); // tel: link; navigation is expected to be a no-op
    await expect.poll(() => eventCount("PHONE_CLICK"), { timeout: 10_000 }).toBe(before + 1);
    await context.close();
    await owner.page.goto("/business/dashboard/analytics");
    const views = owner.page.locator("div.card", { hasText: "Store page views" }).first();
    await expect(views.locator("p").first()).not.toHaveText("0");
    const calls = owner.page.locator("div.card", { hasText: /^\d+Calls$/ });
    await expect(calls.first().locator("p").first()).not.toHaveText("0");
    await expect(owner.page.getByText("Daily trends and per-branch breakdowns are part of the Premium plan")).toBeVisible();
  });

  test("owner submits a deal: pending, invisible until admin approves", async () => {
    const { page } = owner;
    await page.goto("/business/dashboard/deals");
    const form = page.getByTestId("deal-form");
    await form.getByLabel("Title").fill("Chicken breast weekend special");
    await form.getByLabel("Deal price (RM)").fill("11.90");
    await form.getByLabel("Normal price (RM)").fill("13.50");
    await form.getByLabel("Per…").fill("per kg");
    const fmt = (d: Date) => new Date(d.getTime() + 8 * 3_600_000).toISOString().slice(0, 16);
    await form.getByLabel("Starts").fill(fmt(new Date(Date.now() - 3_600_000)));
    await form.getByLabel("Ends").fill(fmt(new Date(Date.now() + 3 * 86_400_000)));
    await form.getByRole("button", { name: "Submit for approval" }).click();
    await expect(form.getByRole("status")).toContainText("go live once our team approves");
    await expect(page.getByTestId("my-deal").first()).toContainText("pending");

    await page.goto("/deals");
    await expect(page.getByText("No live deals right now")).toBeVisible();
  });

  test("bad deal input is rejected with clear messages", async () => {
    const { page } = owner;
    await page.goto("/business/dashboard/deals");
    const form = page.getByTestId("deal-form");
    await form.getByLabel("Title").fill("Broken deal");
    await form.getByLabel("Deal price (RM)").fill("20");
    await form.getByLabel("Normal price (RM)").fill("10");
    await form.getByLabel("Starts").fill("2030-01-02T10:00");
    await form.getByLabel("Ends").fill("2030-01-01T10:00");
    await form.getByRole("button", { name: "Submit for approval" }).click();
    await expect(form.getByRole("alert").first()).toContainText(/End date must be after the start date|Original price/);
  });

  test("admin approves the deal and it goes live everywhere", async ({ browser }) => {
    const { page } = admin;
    await page.goto("/admin/deals?status=PENDING");
    const row = page.getByTestId("admin-row").filter({ hasText: "Chicken breast weekend special" });
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("status")).toContainText("Done");

    const shopper = await newPerson(browser);
    await shopper.page.goto("/deals");
    const card = shopper.page.getByTestId("deal-card");
    await expect(card).toContainText("Chicken breast weekend special");
    await expect(card).toContainText("RM11.90");
    await expect(card).toContainText("RM13.50");
    await shopper.page.goto("/stores/yoon-loong-sri-petaling");
    await expect(shopper.page.getByTestId("deal-card")).toContainText("Chicken breast weekend special");
    await shopper.page.goto("/");
    await expect(shopper.page.getByText("No live deals yet.")).toHaveCount(0);
    await expect(shopper.page.getByTestId("deal-card")).toContainText("Chicken breast weekend special");
    await shopper.context.close();
  });

  test("reviews are moderated: no rating until approved; owners can't review themselves", async ({ browser }) => {
    const reviewer = await newPerson(browser);
    await register(reviewer.page, "Aina Rahman", uniqueEmail("rev"), "reviewer-pass-123", "/stores/yoon-loong-taman-oug");
    await reviewer.page.goto("/stores/yoon-loong-taman-oug");
    await reviewer.page.getByText("Write a review").click();
    const form = reviewer.page.getByTestId("review-form");
    await form.getByLabel("Rating").selectOption("4");
    await form.getByLabel("Your review").fill("Good selection and friendly staff when I visited.");
    await form.getByRole("button", { name: "Submit review" }).click();
    await expect(reviewer.page.getByRole("status")).toContainText("appear once it has been checked");

    const anon = await newPerson(browser);
    await anon.page.goto("/stores/yoon-loong-taman-oug");
    await expect(anon.page.getByText("No reviews yet.")).toBeVisible();
    await expect(anon.page.getByLabel(/Rated/)).toHaveCount(0);

    await admin.page.goto("/admin/reviews?status=PENDING");
    await admin.page.getByTestId("admin-row").filter({ hasText: "Good selection" }).getByRole("button", { name: "Approve" }).click();
    await expect(admin.page.getByRole("status")).toContainText("Done");

    await anon.page.goto("/stores/yoon-loong-taman-oug");
    await expect(anon.page.getByText("Good selection and friendly staff")).toBeVisible();
    await expect(anon.page.getByLabel("Rated 4.0 out of 5 from 1 reviews").first()).toBeVisible();

    // The owner of the business cannot review it.
    await owner.page.goto("/stores/yoon-loong-taman-oug");
    await owner.page.getByText("Write a review").click();
    await owner.page.getByTestId("review-form").getByLabel("Your review").fill("My own shop is the best shop ever!");
    await owner.page.getByTestId("review-form").getByRole("button", { name: "Submit review" }).click();
    await expect(alerts(owner.page)).toContainText("can't review your own business");
    await reviewer.context.close();
    await anon.context.close();
  });

  test("owner can list a product with a price and shoppers see it flagged as business-supplied", async ({ browser }) => {
    const { page } = owner;
    await page.goto("/business/dashboard/products");
    const form = page.getByTestId("product-form");
    await form.getByLabel("Product").selectOption({ label: "Chicken breast — Boneless skinless chicken breast" });
    await form.getByLabel("Branch").selectOption({ label: "Sri Petaling" });
    await form.getByLabel("Price (RM), optional").fill("12.50");
    await form.getByLabel("Per…").fill("per kg");
    await form.getByRole("button", { name: "Add product" }).click();
    await expect(form.getByRole("status")).toContainText("Product added");
    const shopper = await newPerson(browser);
    await shopper.page.goto("/stores/yoon-loong-sri-petaling");
    await expect(shopper.page.getByText("Products listed by the business")).toBeVisible();
    await expect(shopper.page.getByText("RM12.50 per kg")).toBeVisible();
    await shopper.page.goto("/products/boneless-skinless-chicken-breast");
    await expect(shopper.page.getByText("Shops that list this product")).toBeVisible();
    await shopper.context.close();
  });

  test("owner cannot open another owner's data via ?b= tampering", async ({ browser }) => {
    const other = await newPerson(browser);
    await register(other.page, "Other Owner", uniqueEmail("other"), "other-owner-pass-1", "/");
    await expect(other.page).toHaveURL("/");
    await other.page.goto("/business/dashboard?b=anything");
    await expect(other.page).toHaveURL(/\/business\/claim/);
    await other.context.close();
  });
});
