import { test, expect } from "@playwright/test";

test("partner applicant submits a private document and cancels their application", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.goto("/login");
  await page.getByRole("button", { name: /New here/ }).click();
  const username = `partner_application_${Date.now()}`;
  await page.locator('[name="first_name"]').fill("Partner Test");
  await page.locator('[name="email"]').fill(`${username}@example.invalid`);
  await page.locator('[name="username"]').fill(username);
  await page.locator('[name="password"]').fill("Local-test-password-482!");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page).toHaveURL(/\/account/);
  await page.goto("/partner-application");
  await page.getByText("New application", { exact: true }).click();
  const form = page.locator("details").first().locator("form");
  await form.locator('[name="division"]').selectOption({ index: 1 });
  await form.getByLabel("Business name").fill(`Test ${username}`);
  await form.getByLabel("Mobile number").fill("01712345678");
  await form.getByLabel("Area", { exact: true }).fill("Dhanmondi");
  await form.getByLabel("Full address").fill("Test address, Dhaka");
  await form.getByRole("button", { name: "Submit application" }).click();
  const application = page
    .locator("section.form-panel")
    .filter({ hasText: `Test ${username}` });
  await expect(application).toContainText("Submitted");
  await application.getByLabel("Document title").fill("Demo document");
  await application.locator('input[type="file"]').setInputFiles({
    name: "demo.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await application.getByRole("button", { name: "Upload document" }).click();
  await expect(
    application.getByRole("link", { name: "Demo document" }),
  ).toBeVisible();
  const href = await application
    .getByRole("link", { name: "Demo document" })
    .getAttribute("href");
  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  await page.reload();
  await expect(application).toContainText("Demo document");
  await page
    .getByLabel("Search business, area, phone or reference")
    .fill("No matching business xyz");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByText("No matching applications.", { exact: true }),
  ).toBeVisible();
  await expect(application).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(application).toContainText("Demo document");
  await application.getByRole("button", { name: "Cancel application" }).click();
  await expect(application).toContainText("Cancelled");
  await application.getByText("Application history", { exact: true }).click();
  await expect(application).toContainText("Application cancelled");
  await expect(application).toContainText("Document uploaded");
  await expect(application).toContainText("Application submitted");
  await application.getByRole("button", { name: "Refresh history" }).click();
  await expect(application).toContainText("Application cancelled");
  await expect(
    application.getByRole("button", { name: "Upload document" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Check renewal reminders" }).click();
  await expect(page.getByRole("status")).toContainText(
    "0 new reminders created",
  );
});
