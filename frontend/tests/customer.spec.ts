import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
async function fillAddress(page: Page, prefix = "") {
  await page.locator(`[name="${prefix}recipient"]`).fill("E2E Demo Customer");
  await page.locator(`[name="${prefix}phone"]`).fill("01712345678");
  await page.locator(`[name="${prefix}area"]`).selectOption("Dhanmondi");
  await page
    .locator(`[name="${prefix}line"]`)
    .fill("Demo test address, Dhanmondi");
}
test("customer can register, purchase, book and request delivery", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("প্রতিদিনের");
  await page.getByRole("button", { name: "Change language" }).click();
  await expect(page.locator("h1")).toContainText("Life happens");
  await page.goto("/login");
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  const username = `e2e_${Date.now()}`;
  await page.locator('[name="first_name"]').fill("E2E Demo");
  await page.locator('[name="email"]').fill(`${username}@example.invalid`);
  await page.locator('[name="username"]').fill(username);
  await page.locator('[name="password"]').fill("Local-test-password-482!");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page).toHaveURL(/\/account/);
  await page.goto("/catalog?division=shop");
  await page
    .getByRole("button", { name: "Add Everyday cotton tote to bag" })
    .click();
  await page.goto("/checkout");
  await fillAddress(page);
  await page.getByRole("button", { name: /Review total/ }).click();
  await expect(page.getByText("Total to pay: ৳350.00")).toBeVisible();
  await page.getByRole("button", { name: /Confirm order/ }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.locator(".record").first()).toContainText(
    "Everyday cotton tote",
  );
  await page.getByRole("button", { name: "Status history" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Status history" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel request" }).first().click();
  await expect(page.locator(".record .status").first()).toHaveText("cancelled");
  await page.goto("/catalog?division=electrician");
  await page.getByRole("link", { name: "Book Ceiling fan repair" }).click();
  const future = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16);
  await page.locator('[name="scheduled_at"]').fill(future);
  await fillAddress(page);
  await page.getByRole("button", { name: /Request booking/ }).click();
  await expect(page).toHaveURL(/\/account/);
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await expect(page.locator(".record").first()).toContainText(
    "Ceiling fan repair",
  );
  await page.goto("/delivery");
  await fillAddress(page, "pickup_");
  await fillAddress(page, "dropoff_");
  const pickupLocation = page.locator(".location-picker").first();
  await pickupLocation
    .getByRole("combobox", { name: "বিভাগ / Division", exact: true })
    .fill("Dhaka");
  await pickupLocation
    .getByRole("option", { name: "ঢাকা / Dhaka", exact: true })
    .click();
  await pickupLocation
    .getByRole("combobox", { name: "জেলা / District", exact: true })
    .fill("Dhaka");
  await pickupLocation
    .getByRole("option", { name: "ঢাকা / Dhaka", exact: true })
    .click();
  await pickupLocation
    .getByRole("combobox", { name: /Upazila or thana/ })
    .fill("Dhanmondi");
  await pickupLocation.getByRole("option", { name: /Dhanmondi/ }).click();
  await pickupLocation
    .getByRole("textbox", { name: /গ্রাম|Village/ })
    .fill("ডেমো মহল্লা");
  await page.locator('[name="pickup_line"]').fill("বাড়ি ১২, ডেমো মহল্লা");
  await page
    .getByRole("textbox", { name: "পার্সেলের বিবরণ / Package description" })
    .fill("Demo books parcel");
  const quoteRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/deliveries/quote/") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: /Review delivery fee/ }).click();
  const submittedAddress = (await quoteRequest).postDataJSON().pickup
    .line as string;
  expect(submittedAddress.split("ডেমো মহল্লা")).toHaveLength(2);
  expect(submittedAddress).toContain("ধানমন্ডি");
  await expect(
    page.getByText("ডেলিভারি চার্জ / Delivery fee: ৳60.00"),
  ).toBeVisible();
  await page.getByRole("button", { name: /Confirm delivery/ }).click();
  await expect(page).toHaveURL(/\/delivery\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: "Demo books parcel" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "স্ট্যাটাসের ইতিহাস / Status history" }),
  ).toBeVisible();
  await page.goto("/account");
  await page.getByRole("button", { name: "Deliveries", exact: true }).click();
  await expect(page.locator(".record").first()).toContainText(
    "Demo books parcel",
  );
  await page.getByRole("button", { name: "Support", exact: true }).click();
  await page.locator('[name="subject"]').fill("Demo support inquiry");
  await page
    .locator('[name="message"]')
    .fill("This is an automated local test.");
  await page.getByRole("button", { name: "Open support ticket" }).click();
  await expect(
    page.getByRole("heading", { name: "Demo support inquiry" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("desktop and mobile homepage fit without horizontal overflow", async ({
  page,
}) => {
  fs.mkdirSync("../artifacts", { recursive: true });
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(page.locator(".landing-service-link")).toHaveCount(8);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `../artifacts/home-${size.width}.png`,
      fullPage: true,
    });
    if (size.width < 500) {
      await page.getByRole("button", { name: "Toggle navigation" }).click();
      await expect(page.locator("nav")).toBeVisible();
    }
  }
});
test("contact form persists a partner application", async ({ page }) => {
  await page.goto("/contact?interest=partner");
  await page.locator('[name="name"]').fill("Demo Partner E2E");
  await page.locator('[name="email"]').fill("demo-partner@example.invalid");
  await page
    .locator('[name="message"]')
    .fill("Automated local partner application test.");
  await page.getByRole("button", { name: /Send message/ }).click();
  await expect(page.getByText(/Your message has been saved/)).toBeVisible();
});
