import { test, expect } from "@playwright/test";

test("reviewer records a document decision (controlled API fixture)", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.route("**/api/v1/auth/me/", (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: "reviewer",
        first_name: "Reviewer",
        is_staff: true,
        roles: [],
      },
    }),
  );
  await page.route("**/api/v1/auth/csrf/", (route) =>
    route.fulfill({ json: { csrfToken: "fixture" } }),
  );
  await page.route("**/api/v1/divisions/", (route) =>
    route.fulfill({
      json: {
        count: 1,
        next: null,
        results: [{ id: 1, name: "Food", name_bn: "খাবার" }],
      },
    }),
  );
  await page.route("**/api/v1/partner-applications/capabilities/", (route) =>
    route.fulfill({ json: { review: true } }),
  );
  const doc = {
    id: 7,
    title: "Trade document",
    active: true,
    expires_on: null,
    review_status: "pending",
    review_note: "",
    reviewed_at: null as string | null,
  };
  const application = {
    id: "test",
    is_owner: false,
    division: 1,
    business_name: "Fixture business",
    phone: "01712345678",
    address: "Dhaka",
    details: "",
    status: "reviewing",
    review_note: "",
    organization: null,
    documents: [doc],
  };
  await page.route("**/api/v1/partner-applications/?*", (route) =>
    route.fulfill({ json: { count: 1, next: null, results: [application] } }),
  );
  await page.route(
    "**/api/v1/partner-applications/test/documents/7/review/",
    async (route) => {
      expect(route.request().method()).toBe("POST");
      const data = route.request().postDataJSON();
      expect(data).toEqual({
        status: "accepted",
        note: "Verified against supplied record",
      });
      doc.review_status = data.status;
      doc.review_note = data.note;
      doc.reviewed_at = "2026-10-11T10:00:00Z";
      await route.fulfill({ json: doc });
    },
  );
  await page.goto("/partner-application");
  await expect(
    page.getByText("Document awaiting review", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Document decision").selectOption("accepted");
  await page
    .getByLabel("Document review note")
    .fill("Verified against supplied record");
  await page.getByRole("button", { name: "Save document decision" }).click();
  await expect(
    page.getByText("Document accepted", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("p").filter({ hasText: /^Verified against supplied record$/ }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
