import { test, expect } from "@playwright/test";
test("Bangla labels change with the selected language and survive reload", async ({
  page,
  context,
}) => {
  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "পছন্দের তালিকা",
  );
  await expect(
    page.locator("footer").getByRole("link", { name: "ব্যবসায়িক অংশীদার হোন" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change language" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wishlist");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wishlist");
  const csrf = await (await context.request.get("/api/v1/auth/csrf/")).json();
  const username = `qa_language_${Date.now()}`;
  const registered = await context.request.post("/api/v1/auth/register/", {
    headers: { "X-CSRFToken": csrf.csrfToken },
    data: {
      username,
      email: `${username}@example.invalid`,
      first_name: "DEMO QA Language",
      password: "Local-language-test-password-2026!",
    },
  });
  expect(registered.status()).toBe(201);
  await page.goto("/events");
  await expect(
    page.getByRole("combobox", { name: "Event type", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change language" }).click();
  await expect(
    page.getByRole("combobox", { name: "অনুষ্ঠানের ধরন", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("অতিথির সংখ্যা", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("ভেন্যু প্রস্তুতি", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ইভেন্ট পরিকল্পনার অনুরোধ পাঠান" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(
    page.getByRole("combobox", { name: "অনুষ্ঠানের ধরন", exact: true }),
  ).toBeVisible();
  await page.goto("/account");
  await expect(
    page.getByRole("button", { name: "বুকিং", exact: true }),
  ).toBeVisible();
});
