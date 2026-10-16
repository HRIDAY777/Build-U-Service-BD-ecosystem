import { test, expect } from "@playwright/test";
import type { MechanicQuoteData } from "../src/components/mechanic-quote";

test("operations portal uses mechanic capabilities and authoritative action list", async ({ page }) => {
  let editable = true;
  let quote: MechanicQuoteData = {};
  const job = () => ({ id: "portal-mechanic", service: "Repair", status: "in_progress", price: "500", created_at: "2026-10-16T10:00:00Z", service_details: { vehicle_type: "motorbike", vehicle_model: "Demo", problem_type: "brakes", mobility: "unsafe" }, mechanic_quote: quote, can_quote: editable, can_report: editable, can_decide_quote: false, available_actions: [] });
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.route("**/api/v1/auth/me/", r => r.fulfill({ json: { id: 9, username: "operator", first_name: "QA", is_staff: true, roles: ["Operations"] } }));
  await page.route("**/api/v1/orders/", r => r.fulfill({ json: { count: 0, next: null, results: [] } }));
  await page.route("**/api/v1/bookings/", r => r.fulfill({ json: { count: 1, next: null, results: [job()] } }));
  await page.route("**/api/v1/bookings/portal-mechanic/mechanic_quote/", r => {
    expect(r.request().method()).toBe("PUT");
    const body = r.request().postDataJSON();
    expect(body.items).toEqual([{ description: "Labour", quantity: 1, unit_price: "250" }]);
    quote = { ...body, revision: "portal-v1", status: "pending", extra_total: "250.00", items: [{ ...body.items[0], total: "250.00" }] };
    return r.fulfill({ json: job() });
  });
  await page.goto("/portal");
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save work report", exact: true })).toBeVisible();
  await page.getByLabel("Work or part", { exact: true }).fill("Labour");
  await page.getByLabel("Unit price (BDT)", { exact: true }).fill("250");
  await page.getByRole("button", { name: "Send quotation", exact: true }).click();
  await expect(page.locator(".mechanic-quote")).toContainText("250.00");
  await expect(page.getByRole("button", { name: "Accept these costs", exact: true })).toHaveCount(0);
  await expect(page.locator(".record-actions").getByRole("button", { name: "completed", exact: true })).toHaveCount(0);
  editable = false;
  await page.reload();
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await expect(page.locator(".mechanic-quote")).toContainText("250.00");
  await expect(page.getByRole("button", { name: "Send quotation", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save work report", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
