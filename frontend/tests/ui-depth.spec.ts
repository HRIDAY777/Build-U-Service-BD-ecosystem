import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("page titles use one typography system across public and account routes", async ({
  page,
}) => {
  const routes = ["/events", "/login", "/catalog", "/wishlist"];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    let sharedTypography: { size: string; family: string } | undefined;
    for (const route of routes) {
      await page.goto(route);
      const heading = page.locator("main h1").first();
      await expect(heading).toBeVisible();
      const typography = await heading.evaluate((element) => ({
        size: getComputedStyle(element).fontSize,
        family: getComputedStyle(element).fontFamily,
      }));
      if (sharedTypography) {
        expect(typography, `${route} at ${width}px`).toEqual(sharedTypography);
      } else {
        sharedTypography = typography;
      }
    }
  }
});

test("clean static design fits public and workspace routes on desktop and mobile", async ({
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
      await expect(page.locator("body")).toHaveAttribute("data-motion", "paused");
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
