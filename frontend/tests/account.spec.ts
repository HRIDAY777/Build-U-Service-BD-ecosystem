import { test, expect } from "@playwright/test";

test("a late order response cannot replace the selected bookings", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.route("**/api/v1/auth/me/", (r) =>
    r.fulfill({
      json: {
        id: 99998,
        username: "QA",
        first_name: "QA",
        roles: ["Customer"],
      },
    }),
  );
  await page.route("**/api/v1/notifications/", (r) =>
    r.fulfill({ json: { results: [] } }),
  );
  await page.route("**/api/v1/dashboard/", (r) =>
    r.fulfill({ json: { orders: 1, bookings: 1, deliveries: 0 } }),
  );
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const orderStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/v1/orders/", async (r) => {
    started();
    await held;
    await r.fulfill({
      json: {
        results: [
          {
            id: "old-order",
            service: "Old order response",
            status: "pending",
            created_at: "2026-10-12T10:00:00Z",
            total: "100",
          },
        ],
      },
    });
  });
  await page.route("**/api/v1/bookings/", (r) =>
    r.fulfill({
      json: {
        results: [
          {
            id: "current-booking",
            service: "Current mechanic booking",
            status: "pending",
            created_at: "2026-10-12T10:00:00Z",
            price: "500",
            service_details: {
              vehicle_type: "car",
              vehicle_model: "Demo car",
              problem_type: "brakes",
              mobility: "running",
            },
          },
        ],
      },
    }),
  );
  await page.goto("/account");
  await orderStarted;
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await expect(page.locator(".record")).toContainText(
    "Current mechanic booking",
  );
  const oldResponse = page.waitForResponse("**/api/v1/orders/");
  release();
  await oldResponse;
  await expect(page.locator(".record")).toContainText(
    "Current mechanic booking",
  );
  await expect(
    page.getByText("Old order response", { exact: true }),
  ).toHaveCount(0);
  await page.locator(".lang-switch").click();
  await expect(page.locator(".mechanic-progress")).toContainText(
    "অনুরোধ জমা হয়েছে",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("searchbox", { name: "বুকিং খুঁজুন", exact: true })
    .fill("Demo car");
  await expect(page.locator(".record")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "বুকিংয়ের অবস্থা" })
    .selectOption("cancelled");
  await expect(page.locator(".record")).toHaveCount(0);
  await expect(page.locator(".booking-list-tools")).toContainText(
    "এই খোঁজে কোনো বুকিং পাওয়া যায়নি",
  );
  await page.getByRole("button", { name: "সব বুকিং দেখুন" }).click();
  await expect(page.locator(".record")).toHaveCount(1);
  await page.locator(".lang-switch").click();
  await page
    .getByRole("searchbox", { name: "Find a booking" })
    .fill("does not exist");
  await expect(page.locator(".booking-list-tools")).toContainText(
    "No bookings match.",
  );
  await page.getByRole("button", { name: "Show all bookings" }).click();
  await page
    .getByRole("combobox", { name: "Booking status" })
    .selectOption("active");
  await expect(page.locator(".record")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("empty account messages switch fully between Bangla and English", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/me/", (r) =>
    r.fulfill({
      json: {
        id: 99998,
        username: "QA",
        first_name: "QA",
        roles: ["Customer"],
      },
    }),
  );
  for (const endpoint of ["orders", "bookings", "deliveries", "notifications"])
    await page.route("**/api/v1/" + endpoint + "/", (r) =>
      r.fulfill({ json: { results: [] } }),
    );
  await page.route("**/api/v1/dashboard/", (r) => r.fulfill({ json: {} }));
  await page.goto("/account");
  await expect(page.locator(".empty")).toContainText("এখনও কোনো অর্ডার নেই।");
  await page.locator(".lang-switch").click();
  await expect(page.locator(".empty")).toContainText("No orders yet.");
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await expect(page.locator(".empty")).toContainText("No bookings yet.");
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await expect(page.locator(".empty")).toContainText("No deliveries yet.");
});
