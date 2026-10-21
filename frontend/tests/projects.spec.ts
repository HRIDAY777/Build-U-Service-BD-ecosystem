import { test, expect } from "@playwright/test";

test("project plans calculate distributions and submit an enquiry", async ({
  page,
}) => {
  await page.goto("/projects");
  await page.getByRole("button", { name: /Regular|রেগুলার/ }).click();
  await page.locator('[name="units"]').fill("2");
  await expect(page.getByTestId("investment-total")).toContainText(
    /250,000|২,৫০,০০০/,
  );
  await expect(page.getByText(/6,250|৬,২৫০/)).toBeVisible();
  await page.locator('[name="units"]').fill("0");
  await expect(
    page.getByRole("button", { name: /Send enquiry|আগ্রহের আবেদন পাঠান/ }),
  ).toBeDisabled();
  await page.locator('[name="units"]').fill("2");
  await page.locator('[name="name"]').fill("Demo Project Enquiry");
  await page.locator('[name="email"]').fill("project-test@example.invalid");
  await page.locator('[name="phone"]').fill("01712345678");
  await page.getByRole("checkbox").check();
  const response = page.waitForResponse(
    (r) => r.url().includes("/leads/") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: /Send enquiry|আগ্রহের আবেদন পাঠান/ })
    .click();
  expect((await response).status()).toBe(201);
  await expect(page.getByRole("status")).toContainText(/saved|জমা হয়েছে/);
  await expect(
    page.getByRole("button", { name: /Submitted|জমা হয়েছে/ }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("project gallery clears stale cards and recovers from a failed category request", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  let solarAttempts = 0;
  await page.route("**/api/v1/managed-projects/?*", (route) => {
    const solar =
      new URL(route.request().url()).searchParams.get("category") === "solar";
    if (solar && ++solarAttempts === 1)
      return route.fulfill({
        status: 503,
        json: { detail: "Temporarily unavailable" },
      });
    return route.fulfill({
      json: {
        count: 1,
        next: null,
        results: [
          {
            id: solar ? 2 : 1,
            title: solar ? "Demo solar review" : "Demo building review",
            title_bn: "ডেমো প্রকল্প",
            category: solar ? "solar" : "construction",
            area: "Dhaka",
            description: "Fictional project for testing",
            description_bn: "পরীক্ষার নমুনা",
            image: "",
            progress: 20,
            updates: [],
          },
        ],
      },
    });
  });
  await page.goto("/projects");
  const gallery = page.locator(".investor-gallery");
  await expect(
    gallery.getByRole("heading", { name: "Demo building review" }),
  ).toBeVisible();
  await gallery.getByRole("combobox").selectOption("solar");
  await expect(gallery.getByRole("alert")).toBeVisible();
  await expect(
    gallery.getByRole("heading", { name: "Demo building review" }),
  ).toHaveCount(0);
  await gallery.getByRole("button", { name: "Try again" }).click();
  await expect(
    gallery.getByRole("heading", { name: "Demo solar review" }),
  ).toBeVisible();
  await expect(gallery.getByRole("alert")).toHaveCount(0);
});
