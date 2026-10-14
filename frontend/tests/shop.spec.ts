import { expect, test } from "@playwright/test";

test("U Shop filters, product media and discovery work in Bangla and English", async ({
  page,
}) => {
  await page.goto("/catalog?division=shop");

  const category = page.getByLabel("ক্যাটাগরি");
  await expect(
    category.getByRole("option", { name: "— দৈনন্দিন পোশাক" }),
  ).toHaveCount(1);
  await expect(
    page
      .getByLabel("ব্র্যান্ড")
      .getByRole("option", { name: "ইউ সার্ভিস লাইফস্টাইল" }),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("কালেকশন").getByRole("option", { name: "নতুন পণ্য" }),
  ).toHaveCount(1);

  await page.getByLabel("ব্র্যান্ড").selectOption({
    label: "ইউ সার্ভিস লাইফস্টাইল",
  });
  await page.getByLabel("কালেকশন").selectOption({ label: "নতুন পণ্য" });
  await page.getByRole("button", { name: "খুঁজুন" }).click();
  await expect(page).toHaveURL(/brand=\d+.*collection=\d+|collection=\d+.*brand=\d+/);

  await page.getByRole("link", { name: "কটন টি-শার্ট", exact: true }).first().click();
  await expect(page).toHaveURL(/\/catalog\/\d+$/);
  await expect(page.getByText("ইউ সার্ভিস লাইফস্টাইল", { exact: true })).toBeVisible();
  await expect(page.getByText("বারকোড", { exact: true })).toBeVisible();
  await expect(page.getByText("নতুন পণ্য", { exact: false })).toBeVisible();

  const firstImage = page.getByRole("button", { name: "ছবি 1" });
  const secondImage = page.getByRole("button", { name: "ছবি 2" });
  await expect(firstImage).toHaveAttribute("aria-pressed", "true");
  await secondImage.click();
  await expect(secondImage).toHaveAttribute("aria-pressed", "true");

  await expect(page.getByRole("heading", { name: "একই ধরনের পণ্য" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "আরও পণ্য দেখুন" })).toBeVisible();

  await page.getByRole("button", { name: "Change language" }).click();
  await expect(page.getByRole("link", { name: "← Back to U Shop" })).toBeVisible();
  await expect(page.getByText("Collections", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Size / Color / Option")).toContainText(
    "size: M, color: Black",
  );
});
