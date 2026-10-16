import { test, expect } from "@playwright/test";
import type { MechanicQuoteData } from "../src/components/mechanic-quote";

test("repair quotation editor and customer consent work in both languages on mobile", async ({
  page,
}) => {
  let customer = false;
  let quote: MechanicQuoteData = {};
  const job = () => ({
    id: "quote-ui",
    service: "Brake repair",
    scheduled_at: "2026-12-01T10:00:00+06:00",
    duration_minutes: 60,
    status: "arrived",
    price: "500.00",
    address: {
      recipient: "QA",
      phone: "01712345678",
      line: "Demo house",
      area: "Dhaka",
    },
    service_details: {
      vehicle_type: "motorbike",
      vehicle_model: "Demo 150",
      problem_type: "brakes",
      mobility: "unsafe",
    },
    mechanic_quote: quote,
    can_quote: !customer,
    can_decide_quote: customer && quote.status === "pending",
    available_actions: [],
    notes: "",
  });
  await page.route("**/api/v1/auth/me/", (r) =>
    r.fulfill({
      json: {
        id: customer ? 1 : 2,
        username: "QA",
        first_name: "QA",
        roles: customer ? [] : ["Provider"],
      },
    }),
  );
  await page.route("**/api/v1/bookings/provider_profile/", (r) =>
    r.fulfill({
      json: {
        name: "QA mechanic",
        available: true,
        active_jobs: 1,
        completed_jobs: 0,
        failed_jobs: 0,
      },
    }),
  );
  await page.route(/\/api\/v1\/bookings\/\?.*/, (r) =>
    r.fulfill({ json: { count: 1, next: null, results: [job()] } }),
  );
  await page.route("**/api/v1/bookings/", (r) =>
    r.fulfill({ json: { count: 1, next: null, results: [job()] } }),
  );
  await page.route("**/api/v1/bookings/quote-ui/mechanic_quote/", async (r) => {
    const body = r.request().postDataJSON();
    if (r.request().method() === "PUT") {
      expect(body.items).toEqual([
        { description: "Brake cable", quantity: 2, unit_price: "100.25" },
      ]);
      expect(body.revision).toBe("");
      quote = {
        ...body,
        revision: "revision-one",
        status: "pending",
        extra_total: "200.50",
        items: [{ ...body.items[0], total: "200.50" }],
      };
    } else {
      expect(body).toEqual({ revision: "revision-one", decision: "accepted" });
      quote = { ...quote, status: "accepted" };
    }
    await r.fulfill({ json: job() });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/provider");
  await expect(page.locator(".mechanic-quote")).toContainText(
    "মেরামত ও যন্ত্রাংশের কোটেশন",
  );
  await page.locator(".lang-switch").click();
  await page.getByLabel("Work or part", { exact: true }).fill("Brake cable");
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByLabel("Unit price (BDT)", { exact: true }).fill("100.25");
  await page
    .getByRole("button", { name: "Send quotation", exact: true })
    .click();
  await expect(page.locator(".mechanic-quote")).toContainText("200.50");
  customer = true;
  await page.goto("/account");
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await expect(page.locator(".mechanic-quote")).toContainText(
    "Awaiting acceptance",
  );
  await page
    .getByRole("button", { name: "Accept these costs", exact: true })
    .click();
  await expect(page.locator(".mechanic-quote")).toContainText("Accepted");
  await expect(
    page.getByRole("button", { name: "Accept these costs", exact: true }),
  ).toHaveCount(0);
  await page.locator(".lang-switch").click();
  await expect(page.locator(".mechanic-quote")).toContainText("সম্মত");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
