import { test, expect } from "@playwright/test";
for (const workspace of ["provider", "rider"])
  test(workspace + " workspace uses the chosen language", async ({ page }) => {
    await page.route("**/api/v1/auth/me/", (r) =>
      r.fulfill({
        json: {
          id: 99999,
          username: "QA",
          first_name: "QA",
          roles: [workspace === "provider" ? "Provider" : "Rider"],
        },
      }),
    );
    await page.route("**/api/v1/bookings/provider_profile/", (r) =>
      r.fulfill({
        json: {
          name: "QA",
          available: true,
          active_jobs: 0,
          completed_jobs: 0,
          failed_jobs: 0,
        },
      }),
    );
    await page.route("**/api/v1/bookings/?*", (r) =>
      r.fulfill({
        json: { count: 0, next: null, previous: null, results: [] },
      }),
    );
    await page.route("**/api/v1/deliveries/rider_profile/", (r) =>
      r.fulfill({
        json: {
          name: "QA",
          available: true,
          active_jobs: 0,
          completed_jobs: 0,
          pending_cod: 0,
          recorded_earnings: 0,
          average_rating: null,
          rating_count: 0,
        },
      }),
    );
    await page.route("**/api/v1/deliveries/?*", (r) =>
      r.fulfill({
        json: { count: 0, next: null, previous: null, results: [] },
      }),
    );
    await page.goto("/" + workspace);
    await expect(
      page.getByRole("heading", { name: "QA", exact: true }),
    ).toBeVisible();
    await page.locator(".lang-switch").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const copy = await page.locator("main").innerText();
    expect(copy).not.toMatch(/[\u0985-\u09e3]/u);
    await page.locator(".lang-switch").click();
    await expect(page.locator("main")).toContainText(
      workspace === "provider" ? "প্রোভাইডার" : "রাইডার",
    );
  });

test("operations event packages use one language at a time", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/me/", (r) =>
    r.fulfill({
      json: { id: 99999, username: "QA", first_name: "QA", roles: ["Admin"] },
    }),
  );
  await page.route("**/api/v1/orders/", (r) =>
    r.fulfill({ json: { count: 0, results: [] } }),
  );
  await page.route("**/api/v1/events/", (r) =>
    r.fulfill({
      json: {
        count: 1,
        results: [
          {
            id: "qa-event",
            title: "QA event",
            event_type: "wedding",
            event_date: "2026-12-01",
            guest_count: 50,
            venue: "QA venue",
            area: "Dhaka",
            budget: null,
            quoted_budget: null,
            services: ["Catering", "Decoration"],
            package_selection: {
              bundle: "wedding",
              tiers: { Catering: "gold" },
            },
            notes: "",
            staff_notes: "",
            status: "requested",
          },
        ],
      },
    }),
  );
  await page.goto("/portal");
  await page.locator(".lang-switch").click();
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await expect(page.getByRole("heading", { name: "QA event" })).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(
    /[\u0985-\u09e3]/u,
  );
  await expect(page.locator("main")).toContainText("Gold");
});
