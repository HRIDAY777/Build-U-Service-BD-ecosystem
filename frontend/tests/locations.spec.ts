import { test, expect } from "@playwright/test";

test("Bangladesh locations cascade, search in Bangla, and isolate pickup from drop-off", async ({
  page,
}) => {
  await page.goto("/delivery");
  const pickup = page.locator(".location-picker").first();
  const dropoff = page.locator(".location-picker").nth(1);
  const division = pickup.getByRole("combobox", {
    name: "বিভাগ",
    exact: true,
  });
  await expect(division).toBeEnabled();
  await division.click();
  await expect(pickup.getByRole("option")).toHaveCount(8);
  await division.fill("চট্টগ্রাম");
  await pickup.getByRole("option", { name: "চট্টগ্রাম", exact: true }).click();
  const district = pickup.getByRole("combobox", {
    name: "জেলা",
    exact: true,
  });
  await district.fill("Comilla");
  await district.press("ArrowDown");
  await district.press("Enter");
  const districtPhoto = pickup.locator(".district-photo img");
  await expect(districtPhoto).toHaveAttribute("alt", /কুমিল্লা/);
  await districtPhoto.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      districtPhoto.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const upazila = pickup.getByRole("combobox", {
    name: "উপজেলা · থানা",
    exact: true,
  });
  await upazila.fill("Barura");
  await pickup.getByRole("option", { name: /বরুড়া/ }).click();
  const union = pickup.getByRole("combobox", {
    name: "ইউনিয়ন · পৌর এলাকা",
    exact: true,
  });
  await union.fill("আড্ডা");
  await pickup.getByRole("option", { name: /আড্ডা/ }).click();
  await pickup.getByRole("textbox", { name: /গ্রাম/ }).fill("আমার গ্রাম");
  await expect(page.locator('[name="pickup_geo_address"]')).toHaveValue(
    /আমার গ্রাম.*আড্ডা.*বরুড়া.*কুমিল্লা.*চট্টগ্রাম/,
  );
  await expect(page.locator('[name="pickup_district"]')).toHaveValue("Comilla");
  await expect(page.locator('[name="pickup_area"] option')).toHaveCount(1);
  await expect(page.locator('[name="pickup_area"]')).toHaveValue("");
  await expect(
    dropoff.getByRole("combobox", { name: "জেলা", exact: true }),
  ).toBeDisabled();
  await expect(page.locator('[name="dropoff_geo_address"]')).toHaveValue("");
  await division.fill("Dhaka");
  await pickup.getByRole("option", { name: "ঢাকা", exact: true }).click();
  await expect(district).toHaveValue("");
  await expect(upazila).toBeDisabled();
  await expect(union).toBeDisabled();
  await expect(pickup.getByRole("textbox", { name: /গ্রাম/ })).toHaveValue("");
  await expect(page.locator('[name="pickup_geo_address"]')).not.toHaveValue(
    /আড্ডা/,
  );
  await district.fill("Shariatpur");
  await pickup.getByRole("option", { name: /শরীয়তপুর/ }).click();
  await expect(page.locator('[name="pickup_area"] option')).toHaveCount(1);
  await expect(page.getByText(/বাছাই করা ঠিকানা ঠিক আছে/)).toBeVisible();
  await district.fill("Dhaka");
  await pickup.getByRole("option", { name: "ঢাকা", exact: true }).click();
  await upazila.fill("Dhanmondi");
  await pickup.getByRole("option", { name: /ধানমন্ডি/ }).click();
  await expect(page.locator('[name="pickup_area"]')).toHaveValue("Dhanmondi");
  await page.setViewportSize({ width: 390, height: 844 });
  await division.click();
  await expect(pickup.getByRole("listbox")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "test-results/location-picker-mobile.png" });
});
