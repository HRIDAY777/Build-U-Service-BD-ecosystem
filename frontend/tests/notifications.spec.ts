import { test, expect } from "@playwright/test";

test("notification pages recover and read changes persist only after success", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.route("**/api/v1/auth/me/", (route) =>
    route.fulfill({
      json: {
        id: 1,
        username: "notice-test",
        first_name: "Customer",
        is_staff: false,
        roles: [],
      },
    }),
  );
  await page.route("**/api/v1/orders/", (route) =>
    route.fulfill({ json: { count: 0, next: null, results: [] } }),
  );
  await page.route("**/api/v1/dashboard/", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route("**/api/v1/auth/csrf/", (route) =>
    route.fulfill({ json: {} }),
  );
  let pageFailure = true;
  let writeFailure = true;
  const notices = [1, 2].map((id) => ({
    id,
    title: `Notice ${id}`,
    body: "Your application was reviewed.",
    read: false,
    created_at: "2026-10-23T10:00:00Z",
  }));
  await page.route("**/api/v1/notifications/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "PATCH") {
      if (writeFailure) {
        writeFailure = false;
        await route.fulfill({
          status: 503,
          json: { error: "Temporary failure" },
        });
        return;
      }
      const notice = notices.find((item) =>
        url.pathname.endsWith(`/${item.id}/`),
      )!;
      notice.read = request.postDataJSON().read;
      await route.fulfill({ json: notice });
      return;
    }
    if (request.method() === "POST") {
      notices.forEach((item) => {
        item.read = true;
      });
      await route.fulfill({ json: { updated: notices.length } });
      return;
    }
    const second = url.searchParams.get("page") === "2";
    if (second && pageFailure) {
      pageFailure = false;
      await route.fulfill({
        status: 503,
        json: { error: "Temporary failure" },
      });
      return;
    }
    await route.fulfill({
      json: {
        count: 2,
        next: second ? null : "?page=2",
        results: [notices[second ? 1 : 0]],
      },
    });
  });
  await page.goto("/account");
  await page.getByRole("button", { name: /Notifications/ }).click();
  const center = page.getByRole("region", { name: "Notification center" });
  await expect(
    center.getByRole("heading", { name: "Notice 1", exact: true }),
  ).toBeVisible();
  await center.getByRole("button", { name: "Next", exact: true }).click();
  await expect(center.getByRole("alert")).toContainText(
    "Messages could not be loaded",
  );
  await expect(
    center.getByRole("heading", { name: "Notice 1", exact: true }),
  ).toHaveCount(0);
  await center.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    center.getByRole("heading", { name: "Notice 2", exact: true }),
  ).toBeVisible();
  await center
    .getByRole("button", { name: "Mark as read", exact: true })
    .click();
  await expect(center.getByRole("alert")).toContainText("could not be saved");
  await expect(center.getByText("Unread", { exact: true })).toBeVisible();
  await center
    .getByRole("button", { name: "Mark as read", exact: true })
    .click();
  await expect(
    center.getByRole("button", { name: "Mark as unread", exact: true }),
  ).toBeEnabled();
  await center
    .getByRole("button", { name: "Mark as unread", exact: true })
    .click();
  await expect(center.getByText("Unread", { exact: true })).toBeVisible();
  await center
    .getByRole("button", { name: "Mark all as read", exact: true })
    .click();
  await expect(
    center.getByRole("button", { name: "Previous", exact: true }),
  ).toBeEnabled();
  await center.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(center.getByText("Read", { exact: true })).toBeVisible();
  await center.screenshot({ path: "../artifacts/notifications-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.locator(".lang-switch").click();
  await expect(
    page.getByRole("heading", { name: "আপনার নোটিফিকেশন" }),
  ).toBeVisible();
  await page.getByRole("region", { name: "নোটিফিকেশন কেন্দ্র" }).screenshot({ path: "../artifacts/notifications-mobile-bn.png" });
});
