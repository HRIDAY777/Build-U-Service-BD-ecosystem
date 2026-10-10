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
