import { expect, test } from "@playwright/test";
import { ADMIN, alerts, login, newPerson, register, uniqueEmail } from "./helpers";

test.describe("authentication & authorization", () => {
  test("anonymous visitors are sent to login for admin and dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await page.goto("/business/dashboard/leads");
    await expect(page).toHaveURL(/\/login\?next=%2Fbusiness%2Fdashboard%2Fleads/);
    await page.goto("/admin/businesses/new");
    await expect(page).toHaveURL(/\/login/);
  });

  test("wrong password shows a generic error; unknown email looks identical", async ({ page }) => {
    await login(page, ADMIN.email, "definitely-wrong");
    const a = await alerts(page).innerText();
    await login(page, "nobody@e2e.my", "definitely-wrong");
    const b = await alerts(page).innerText();
    expect(a).toBe("Incorrect email or password.");
    expect(b).toBe(a);
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin can log in and out", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a normal user cannot see admin (404) or another business's dashboard", async ({ browser }) => {
    const { page, context } = await newPerson(browser);
    const email = uniqueEmail("plain");
    await register(page, "Plain User", email, "a-very-long-password", "/");
    await expect(page).toHaveURL("/");
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
    for (const p of ["/admin/users", "/admin/claims", "/admin/businesses/new", "/admin/analytics"]) {
      expect((await page.goto(p))?.status(), p).toBe(404);
    }
    await page.goto("/business/dashboard");
    await expect(page).toHaveURL(/\/business\/claim/); // no business → sent to claim, not shown someone else's data
    await context.close();
  });

  test("registration validates input and rejects weak passwords", async ({ page }) => {
    await register(page, "Weak", uniqueEmail("weak"), "short");
    await expect(page.getByText("Use at least 10 characters")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("login redirect target cannot leave the site", async ({ browser }) => {
    const { page, context } = await newPerson(browser);
    const email = uniqueEmail("redir");
    await register(page, "Redir", email, "a-very-long-password", "//evil.example.com");
    await expect(page).toHaveURL("http://localhost:3100/business/claim");
    await context.close();
  });

  test("session cookie is HttpOnly, SameSite=Lax and not readable from JS", async ({ browser }) => {
    const { page, context } = await newPerson(browser);
    await register(page, "Cookie", uniqueEmail("cookie"), "a-very-long-password", "/");
    await expect(page).toHaveURL("/");
    const cookie = (await context.cookies()).find((c) => c.name === "bs_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("bs_session");
    await context.close();
  });

  test("a forged session cookie grants nothing", async ({ browser }) => {
    const { page, context } = await newPerson(browser);
    await context.addCookies([{ name: "bs_session", value: "eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiIsInN2IjowfQ.", url: "http://localhost:3100" }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  test("tracking endpoint rejects cross-origin posts and oversized bodies", async ({ request }) => {
    const cross = await request.post("/api/track", { headers: { origin: "https://evil.example.com", "content-type": "application/json" }, data: { type: "PAGE_VIEW" } });
    expect(cross.status()).toBe(403);
    const big = await request.post("/api/track", { headers: { "content-type": "application/json" }, data: JSON.stringify({ type: "PAGE_VIEW", path: "/" + "a".repeat(5000) }) });
    expect(big.status()).toBe(413);
    const junk = await request.post("/api/track", { headers: { "content-type": "application/json" }, data: Buffer.from("not json") });
    expect(junk.status()).toBe(400);
  });

  test("nearby API validates coordinates", async ({ request }) => {
    expect((await request.get("/api/stores/nearby?lat=abc&lng=1")).status()).toBe(400);
    expect((await request.get("/api/stores/nearby?lat=999&lng=1")).status()).toBe(400);
    const ok = await request.get("/api/stores/nearby?lat=3.07&lng=101.69");
    expect(ok.status()).toBe(200);
    expect((await ok.json()).stores[0].branchName).toBe("Sri Petaling");
  });

  test("security headers are present", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("geolocation=(self)");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("protected pages are never cacheable and noindex", async ({ browser }) => {
    const { page, context } = await newPerson(browser);
    await register(page, "Cache", uniqueEmail("cache"), "a-very-long-password", "/");
    await expect(page).toHaveURL("/");
    const r2 = await context.request.get("/admin", { maxRedirects: 0 });
    expect(r2.headers()["cache-control"]).toContain("no-store");
    expect(r2.headers()["x-robots-tag"]).toContain("noindex");
    await context.close();
  });

  test("registration is rate limited per IP (6th sign-up from one address is refused)", async ({ browser }) => {
    const { page, context } = await newPerson(browser); // one fixed IP for this context
    let blocked = false;
    for (let i = 0; i < 6 && !blocked; i++) {
      await register(page, `Spam ${i}`, uniqueEmail("spam"), "a-very-long-password", "/");
      // Wait for the attempt to settle: either we were signed in (redirect) or the limiter refused us.
      const refused = page.getByText("Too many sign-ups");
      await Promise.race([page.waitForURL((u) => !u.pathname.startsWith("/register")), refused.waitFor()]);
      if (await refused.isVisible()) blocked = true;
      else await context.clearCookies();
    }
    expect(blocked).toBe(true);
    await context.close();
  });
});
