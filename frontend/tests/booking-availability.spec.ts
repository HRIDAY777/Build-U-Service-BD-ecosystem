import { test, expect } from "@playwright/test";

test("booking times refresh by area and show bilingual provider availability guidance", async ({ page }) => {
  const requests: (string | null)[] = [];
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.route("**/api/v1/offerings/156/booking_times/?*", r => {
    const area = new URL(r.request().url()).searchParams.get("area");
    requests.push(area);
    return r.fulfill({ json: { mode: "hours", availability_checked: !!area, duration_minutes: 60,
      slots: area === "Dhanmondi" ? [] : [{ start: "2026-12-01T09:00:00+06:00", end: "2026-12-01T10:00:00+06:00" }] } });
  });
  await page.goto("/book/156");
  await page.locator('[name="scheduled_at"]').fill("2026-12-01T09:00");
  const times = page.getByRole("region", { name: "Suggested booking times" });
  await times.getByRole("button", { name: "View day times" }).click();
  await expect(times.getByRole("button", { name: "09:00–10:00" })).toBeVisible();
  await page.locator('[name="area"]').selectOption("Dhanmondi");
  await expect(times.getByRole("button", { name: "09:00–10:00" })).toHaveCount(0);
  await times.getByRole("button", { name: "View day times" }).click();
  await expect(times).toContainText("No eligible providers");
  expect(requests).toEqual([null, "Dhanmondi"]);
  await page.locator(".lang-switch").click();
  await expect(times).toContainText("উপযুক্ত কর্মী পাওয়া যাচ্ছে না");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
