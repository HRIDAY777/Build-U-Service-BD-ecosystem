import { test, expect } from "@playwright/test";

test("staff route support tickets with bilingual mobile controls", async ({
  page,
}) => {
  let ticket = {
    id: 91,
    subject: "Delivery help",
    message: "Parcel delayed",
    response: "",
    status: "open",
    created_at: "2026-10-16T10:00:00Z",
    is_owner: false,
    can_respond: true,
    can_route: true,
    category: "general",
    priority: "normal",
    assigned_to: null as number | null,
    assigned_name: "",
  };
  await page.route("**/api/v1/auth/me/", (r) =>
    r.fulfill({
      json: {
        id: 2,
        username: "QA",
        first_name: "QA",
        is_staff: true,
        roles: ["Support"],
      },
    }),
  );
  await page.route(/\/api\/v1\/tickets\/\?.*/, (r) =>
    r.fulfill({ json: { count: 1, next: null, results: [ticket] } }),
  );
  await page.route("**/api/v1/tickets/responders/?page=1", (r) =>
    r.fulfill({
      json: { count: 1, next: null, results: [{ id: 2, name: "Support QA" }] },
    }),
  );
  await page.route("**/api/v1/tickets/91/route_ticket/", (r) => {
    const data = r.request().postDataJSON();
    expect(data).toEqual({
      category: "delivery",
      priority: "urgent",
      assigned_to: 2,
    });
    ticket = { ...ticket, ...data, assigned_name: "Support QA" };
    return r.fulfill({ json: ticket });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/support");
  await expect(page.locator(".support-routing summary")).toContainText(
    "দায়িত্ব ও জরুরিতা নির্ধারণ",
  );
  await page.locator(".lang-switch").click();
  await page.locator(".support-routing summary").click();
  const routing = page.locator(".support-routing");
  await routing
    .getByRole("combobox", { name: "Issue category", exact: true })
    .selectOption("delivery");
  await routing
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption("urgent");
  await routing
    .getByRole("combobox", { name: "Assigned team member", exact: true })
    .selectOption("2");
  await routing
    .getByRole("button", { name: "Save routing", exact: true })
    .click();
  await expect(page.locator("article.record")).toContainText("Urgent");
  await expect(page.locator("article.record")).toContainText("Support QA");
  await page.locator(".lang-switch").click();
  await expect(page.locator("article.record")).toContainText("জরুরি");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
