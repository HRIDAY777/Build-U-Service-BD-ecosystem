import { test, expect } from "@playwright/test";

test("homepage follows the service booking reference on desktop and mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".home-reference-hero")).toBeVisible();
  await expect(page.locator(".home-booking-card")).toBeVisible();
  await expect(page.locator(".home-category-rail a")).toHaveCount(9);
  await expect(page.locator(".home-service-card").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /জনপ্রিয় হোম সার্ভিস/ })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".home-booking-card")).toBeVisible();
  await expect(page.locator(".home-service-card").first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
