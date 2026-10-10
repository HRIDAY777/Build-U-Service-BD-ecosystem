import { test, expect } from "@playwright/test";

test("event packages survive sign-in and are saved with the customer's request", async ({
  page,
  context,
}) => {
  await page.goto("/events");
  const catering = page.locator(".service-package-group").filter({
    has: page.getByRole("heading", { name: "ক্যাটারিং", exact: true }),
  });
  await catering.locator(".tier-1").getByRole("button").click();
  await expect(catering.locator(".tier-1").getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const csrf = await (await context.request.get("/api/v1/auth/csrf/")).json();
  const username = `qa_event_package_${Date.now()}`;
  const response = await context.request.post("/api/v1/auth/register/", {
    headers: { "X-CSRFToken": csrf.csrfToken },
    data: {
      username,
      email: `${username}@example.invalid`,
      password: "Local-event-package-test-2026!",
      first_name: "DEMO QA Event package",
    },
  });
  expect(response.status()).toBe(201);
  await page.reload();
  await expect(
    page.locator('input[name="services"][value="Catering"]'),
  ).toBeChecked();
  await expect(
    page.getByRole("status").filter({ hasText: "নির্বাচিত প্যাকেজ" }),
  ).toContainText("সিলভার");
  await page.locator('[name="title"]').fill("DEMO QA Package request");
  const date = new Date();
  date.setDate(date.getDate() + 30);
  await page
    .locator('[name="event_date"]')
    .fill(date.toISOString().slice(0, 10));
  await page.locator('[name="guest_count"]').fill("50");
  await page.locator('[name="venue"]').fill("DEMO venue");
  await page.locator('[name="area"]').fill("Dhanmondi");
  const savedResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/events/") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "ইভেন্ট পরিকল্পনার অনুরোধ পাঠান" })
    .click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(201);
  expect((await saved.json()).package_selection.tiers).toEqual({
    Catering: "silver",
  });
  await expect(
    page.locator(".record").filter({ hasText: "DEMO QA Package request" }),
  ).toContainText("সিলভার");
  await page.reload();
  await expect(
    page.locator('input[name="services"][value="Catering"]'),
  ).not.toBeChecked();
});
