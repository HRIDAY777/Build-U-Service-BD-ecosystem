import { test, expect } from "@playwright/test";

test("reviewer can retry and load project choices beyond the first page", async ({
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
        groups: [],
      },
    }),
  );
  await page.route("**/api/v1/project-applications/capabilities/", (route) =>
    route.fulfill({ json: { review: true, ledger: false, manage: true } }),
  );
  await page.route("**/api/v1/project-applications/?*", (route) =>
    route.fulfill({
      json: {
        count: 1,
        next: null,
        results: [
          {
            id: "test",
            name: "Review Applicant",
            kind: "client",
            status: "reviewing",
            amount: "10000",
            expected_total: "10000",
            months: 40,
            project: null,
            entries: [],
            updates: [],
            payment_schedule: [],
            term: {
              progress_percent: 0,
              remaining_months: 40,
              elapsed_months: 0,
              maturity_date: null,
            },
            is_owner: false,
          },
        ],
      },
    }),
  );
  let attempts = 0;
  await page.route("**/api/v1/managed-projects/?*", async (route) => {
    const second =
      new URL(route.request().url()).searchParams.get("page") === "2";
    if (second && attempts++ === 0)
      return route.fulfill({
        status: 503,
        json: { detail: "Temporary project error" },
      });
    await route.fulfill({
      json: {
        count: 2,
        next: second ? null : "page-two",
        results: [
          {
            id: second ? 2 : 1,
            title: second ? "Later project" : "First project",
            title_bn: "",
          },
        ],
      },
    });
  });
  await page.goto("/project-account");
  await page.getByRole("button", { name: /Review Applicant/ }).click();
  await expect(page.locator('[name="project"] option')).toHaveCount(2);
  await page.getByRole("button", { name: "Load more projects" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(
    "Temporary project error",
  );
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator('[name="project"] option')).toHaveCount(3);
  await page.locator('[name="project"]').selectOption("2");
  await expect(page.locator('[name="project"]')).toHaveValue("2");
  await expect(
    page.getByRole("button", { name: "Load more projects" }),
  ).toHaveCount(0);
});
