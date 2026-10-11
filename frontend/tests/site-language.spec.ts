import { test, expect, request } from "@playwright/test";
let cookies: Awaited<
  ReturnType<import("@playwright/test").APIRequestContext["storageState"]>
>["cookies"];
test.beforeAll(async () => {
  const api = await request.newContext({ baseURL: "http://127.0.0.1:3000" });
  const csrf = await (await api.get("/api/v1/auth/csrf/")).json();
  const username = "qa_site_language_" + Date.now();
  const result = await api.post("/api/v1/auth/register/", {
    headers: { "X-CSRFToken": csrf.csrfToken },
    data: {
      username,
      email: username + "@example.invalid",
      first_name: "QA Language",
      password: "Local-language-audit-2026!",
    },
  });
  expect(result.status()).toBe(201);
  cookies = (await api.storageState()).cookies;
  await api.dispose();
});
const routes = [
  "/",
  "/catalog",
  "/events",
  "/delivery",
  "/checkout",
  "/login",
  "/account",
  "/wishlist",
  "/projects",
  "/project-account",
  "/partner-application",
  "/returns",
  "/reviews",
  "/loyalty",
  "/contact",
  "/support",
  "/provider",
  "/rider",
  "/portal",
  "/stores",
  "/reset-password",
  "/verify-email",
  "/delivery/track",
  "/pages/about",
  "/pages/privacy",
  "/pages/terms",
];
for (const route of routes)
  test("English UI " + route, async ({ page, context }) => {
    await context.addCookies(cookies);
    await page.addInitScript(() => {
      if (!localStorage.getItem("us-lang"))
        localStorage.setItem("us-lang", "en");
    });
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.waitForTimeout(400);
    const leftovers = await page.evaluate(() => {
      const nodes = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );
      const found: string[] = [];
      while (nodes.nextNode()) {
        const n = nodes.currentNode;
        const e = n.parentElement;
        if (
          !e ||
          e.closest("script,style,.lang-switch") ||
          !e.getClientRects().length
        )
          continue;
        const t = n.textContent?.trim() || "";
        if (/[\u0985-\u09e3]/u.test(t)) found.push(t);
      }
      return [...new Set(found)];
    });
    expect(leftovers).toEqual([]);
    await page.locator(".lang-switch").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.locator("header")).toContainText("আমাদের সেবা");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  });

test("product detail and service booking preserve the selected language", async ({
  page,
  context,
}) => {
  await context.addCookies(cookies);
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  for (const division of ["shop", "services"]) {
    const result = await (
      await context.request.get("/api/v1/offerings/?division=" + division)
    ).json();
    const item = result.results[0];
    expect(item).toBeTruthy();
    await page.goto((division === "shop" ? "/catalog/" : "/book/") + item.id);
    await expect(page.locator("main")).not.toContainText(item.name_bn);
    await expect(page.locator("main")).toContainText(item.name);
  }
});
test("district photo captions follow the language while retaining original author credits", async ({
  page,
  context,
}) => {
  await context.addCookies(cookies);
  await page.goto("/photo-credits");
  await expect(page.locator(".page-wrap")).toContainText("জেলার");
  await page.locator(".lang-switch").click();
  await expect(page.locator(".page-wrap")).toContainText("District");
});
