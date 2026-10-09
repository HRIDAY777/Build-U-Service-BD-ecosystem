import { test, expect } from "@playwright/test";

test("wishlist saves alert preferences and shares a revocable public list", async ({
  page,
  context,
  browser,
}) => {
  const csrf = await (await context.request.get("/api/v1/auth/csrf/")).json();
  const username = `qa_wishlist_${Date.now()}`;
  const registered = await context.request.post("/api/v1/auth/register/", {
    headers: { "X-CSRFToken": csrf.csrfToken },
    data: {
      username,
      email: `${username}@example.invalid`,
      first_name: "DEMO QA Wishlist",
      password: "Local-QA-wishlist-password-2026!",
    },
  });
  expect(registered.status()).toBe(201);
  const csrf2 = await (await context.request.get("/api/v1/auth/csrf/")).json();
  const catalog = await (
    await context.request.get("/api/v1/offerings/?division=shop")
  ).json();
  const offering = catalog.results[0];
  const saved = await context.request.post("/api/v1/wishlist/", {
    headers: { "X-CSRFToken": csrf2.csrfToken },
    data: { offering: offering.id },
  });
  expect(saved.status()).toBe(201);
  await page.goto("/wishlist");
  const card = page
    .locator(".wishlist-record")
    .filter({ hasText: offering.name });
  await expect(card).toBeVisible();
  await card.getByLabel("দাম কমলে জানাবেন").click();
  await expect(card.getByLabel("দাম কমলে জানাবেন")).toBeChecked();
  await expect(card.getByLabel("দাম কমলে জানাবেন")).toBeEnabled();
  await card.getByLabel("স্টক এলে জানাবেন").click();
  await expect(card.getByLabel("স্টক এলে জানাবেন")).toBeChecked();
  await expect(card.getByLabel("স্টক এলে জানাবেন")).toBeEnabled();
  await page.reload();
  await expect(card.getByLabel("দাম কমলে জানাবেন")).toBeChecked();
  await page
    .getByRole("button", { name: "তালিকা শেয়ার করুন", exact: true })
    .click();
  const shareUrl = await page.locator("input[readonly]").inputValue();
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(shareUrl);
  await expect(publicPage.locator(".offering-card")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "শেয়ার লিংক বন্ধ করুন", exact: true })
    .click();
  await expect(page.locator("input[readonly]")).toHaveCount(0);
  await publicPage.reload();
  await expect(publicPage.locator("p.error[role=alert]")).toContainText(
    "বন্ধ করা হয়েছে",
  );
  await card.getByRole("button", { name: "সরান", exact: true }).click();
  await expect(page.locator(".wishlist-empty")).toBeVisible();
  await publicContext.close();
});
