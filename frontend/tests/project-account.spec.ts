import { test, expect } from "@playwright/test";

test("customer submits, reloads and cancels a private project application", async ({
  page,
}) => {
  await page.goto("/project-account");
  await expect(
    page.locator("main").getByRole("link", { name: /Log in|লগইন/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change language" }).click();
  await page.goto("/login");
  await page.getByRole("button", { name: /New here|নতুন/ }).click();
  const username = `project_e2e_${Date.now()}`;
  await page.locator('[name="first_name"]').fill("Demo Project Customer");
  await page.locator('[name="email"]').fill(`${username}@example.invalid`);
  await page.locator('[name="username"]').fill(username);
  await page.locator('[name="password"]').fill("Local-test-password-482!");
  await page
    .getByRole("button", { name: /Create account|অ্যাকাউন্ট তৈরি/ })
    .click();
  await expect(page).toHaveURL(/\/account/);
  await page.goto("/project-account");
  await page.locator('[name="name"]').fill("Demo Project Investor");
  await page.locator('[name="phone"]').fill("01712345678");
  await page.locator('[name="address"]').fill("Demo address, Dhaka");
  await page.locator('[name="details"]').fill("Test solar project enquiry");
  await page.locator('[name="consent"]').check();
  await page
    .getByRole("button", { name: /Submit application|আবেদন জমা দিন/ })
    .click();
  await expect(
    page.getByRole("heading", { name: /Application details|আবেদনের বিবরণ/ }),
  ).toBeVisible();
  await expect(page.locator(".project-statement")).toContainText(
    /Not started|এখনো শুরু হয়নি/,
  );
  await page.reload();
  await page.locator('[name="search"]').fill("Demo Project Investor");
  await page.getByRole("button", { name: /Find applications|আবেদন খুঁজুন/ }).click();
  await expect(page.getByRole("button", { name: /Demo Project Investor/ })).toBeVisible();
  await page.locator('[name="status"]').first().selectOption("active");
  await page.getByRole("button", { name: /Find applications|আবেদন খুঁজুন/ }).click();
  await expect(page.getByText(/No applications match|এই বাছাইয়ে কোনো আবেদন/)).toBeVisible();
  await page.getByRole("button", { name: /Show all|সব দেখুন/ }).click();
  await page.getByRole("button", { name: /Demo Project Investor/ }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download statement|হিসাব ডাউনলোড/ }).click();
  const statement = await downloaded;
  expect(statement.suggestedFilename()).toMatch(/^project-.*-statement\.csv$/);
  expect(await statement.failure()).toBeNull();
  await page
    .getByRole("button", { name: /Cancel application|আবেদন বাতিল করুন/ })
    .click();
  await expect(page.locator(".project-statement")).toContainText(
    /cancelled|বাতিল/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
