import { test, expect } from "@playwright/test";

test("approved applicant opens a separate renewal (controlled API fixture)", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.route("**/api/v1/auth/me/", (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: "partner",
        first_name: "Partner",
        is_staff: false,
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
    route.fulfill({ json: { review: false } }),
  );
  const source = {
    id: "original",
    is_owner: true,
    division: 1,
    business_name: "Fixture business",
    phone: "01712345678",
    area: "Dhaka",
    address: "Dhaka",
    details: "",
    status: "approved",
    review_note: "Approved",
    organization: 3,
    renewal_of: null,
    documents: [],
  };
  const renewal = {
    ...source,
    id: "renewal",
    status: "submitted",
    review_note: "",
    organization: null,
    renewal_of: "original",
  };
  let opened = false;
  await page.route("**/api/v1/partner-applications/?*", (route) =>
    route.fulfill({
      json: {
        count: opened ? 2 : 1,
        next: null,
        results: opened ? [renewal, source] : [source],
      },
    }),
  );
  await page.route(
    "**/api/v1/partner-applications/original/renew/",
    async (route) => {
      expect(route.request().method()).toBe("POST");
      opened = true;
      await route.fulfill({ status: 201, json: renewal });
    },
  );
  await page.goto("/partner-application");
  await page.getByRole("button", { name: "Open renewal application" }).click();
  const card = page
    .locator("section")
    .filter({ hasText: "Document renewal application" });
  await expect(card).toContainText("Submitted");
  await expect(
    card.getByRole("button", { name: "Upload document" }),
  ).toBeVisible();
  await card.getByText("Edit and resubmit", { exact: true }).click();
  await expect(card.getByLabel("Business name")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(
    page.getByText("Approved", { exact: true }).first(),
  ).toBeVisible();
});
