import { test, expect } from "@playwright/test";

test("subject photos load on home, product detail, weddings and business directory", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const districtManifest = await (
    await page.request.get("/images/districts/manifest.json")
  ).json();
  expect(Object.keys(districtManifest)).toHaveLength(64);
  await page.evaluate(
    async (sources: string[]) => {
      await Promise.all(
        sources.map(
          (src) =>
            new Promise<void>((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve();
              image.onerror = () =>
                reject(new Error(`District image failed: ${src}`));
              image.src = src;
            }),
        ),
      );
    },
    Object.values(districtManifest).map(
      (value) => (value as { src: string }).src,
    ),
  );
  await expect(page.locator(".hero-mosaic img")).toHaveCount(3);
  await expect
    .poll(() =>
      page
        .locator(".hero-mosaic img")
        .first()
        .evaluate((node) => (node as HTMLImageElement).currentSrc),
    )
    .toContain("/_next/image?");
  await expect(page.locator(".occasion-feature img")).toHaveAttribute(
    "src",
    /\/images\/photos\/wedding\.jpg$/,
  );
  await expect(page.locator(".provider-preview")).toHaveCount(3);
  const images = page.locator("img.subject-photo");
  for (let index = 0; index < (await images.count()); index++) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await page.screenshot({
    path: "../artifacts/photos-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const image of await page.locator("img.subject-photo").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "../artifacts/photos-mobile.png",
    fullPage: true,
  });
  await page.goto("/events");
  await expect(page.locator(".event-cover img")).toHaveAttribute(
    "src",
    /\/images\/photos\/wedding\.jpg$/,
  );
  await page.goto("/delivery");
  const brandedPhoto = page.locator(".delivery-brand-photo img");
  await expect(brandedPhoto).toHaveAttribute("src", /delivery-branded\.png$/);
  await expect
    .poll(() =>
      brandedPhoto.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.goto("/catalog?division=shop");
  const card = page.locator(".offering-card").first();
  await expect(card.locator("img")).toBeVisible();
  await card.locator("a").first().click();
  await expect(page.locator(".detail-grid img")).toBeVisible();
  await page.goto("/stores");
  await expect(page.locator(".store-photo").first()).toBeVisible();
  await expect(page.locator(".store-photo-card").first()).toContainText(
    "ডেমো ঠিকানা",
  );
});
