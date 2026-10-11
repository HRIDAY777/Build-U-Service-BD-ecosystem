import { test, expect } from "@playwright/test";

test("customer signs back in using their email address", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.goto("/login");
  await page.getByRole("button", { name: /New here/ }).click();
  const username = `email_login_${Date.now()}`;
  const email = `${username}@example.invalid`;
  await page.locator('[name="first_name"]').fill("Email Login Demo");
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="username"]').fill(username);
  await page.locator('[name="password"]').fill("Local-test-password-482!");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page).toHaveURL(/\/account/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(email.toUpperCase());
  await page.locator('[name="password"]').fill("Local-test-password-482!");
  await page.getByRole("button", { name: /Sign in/ }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(
    page.getByRole("heading", { name: /Email Login Demo/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  const history = page.getByRole("region", { name: "Security history" });
  await expect(history).toContainText("Successful sign-in");
  await expect(history).toContainText("Account created");
  await history.getByRole("button", { name: "Refresh history" }).click();
  await expect(history).toContainText("Signed out");
});
