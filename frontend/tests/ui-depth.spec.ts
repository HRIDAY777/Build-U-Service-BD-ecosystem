import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("spatial design fits public and workspace routes on desktop and mobile", async ({
  page,
}) => {
  fs.mkdirSync("../artifacts", { recursive: true });
  const routes = [
    "/",
    "/catalog?division=shop",
    "/mechanic",
    "/book/156",
    "/events",
    "/delivery",
    "/checkout",
    "/login",
    "/projects",
    "/support",
    "/wishlist",
    "/account",
    "/portal",
    "/provider",
    "/rider",
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("body")).toHaveClass(/depth-ui/);
      await expect(page.locator(".spatial-motion-control")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBeTruthy();
      if (
        (route === "/" && width === 1440) ||
        (route === "/book/156" && width === 1440) ||
        (route === "/events" && width === 390)
      ) {
        await page.screenshot({
          path: `../artifacts/spatial-${route === "/" ? "home" : route.startsWith("/book") ? "booking" : "events"}-${width}.png`,
          animations: "disabled",
        });
      }
    }
  }
});

test("sitewide animation preference persists and respects reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Reduce animation", exact: true })
    .click();
  await expect(page.locator("body")).toHaveAttribute("data-motion", "paused");
  await page.goto("/book/156");
  await expect(page.locator("body")).toHaveAttribute("data-motion", "paused");
  await expect(
    page.getByRole("button", { name: "Enable animation", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".spatial-orb")
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
});
