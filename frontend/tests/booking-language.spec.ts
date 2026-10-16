import { test, expect } from "@playwright/test";

test("booking 156 shows weekday names in the selected language", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("us-lang", "en"));
  await page.goto("/book/156");
  await expect(page.locator("h1")).toHaveText("Tyre inspection");
  const hours = page.locator(".notice").filter({ hasText: "Booking hours" });
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
    await expect(hours).toContainText(day);
  }
  await expect(hours).not.toContainText(/[\u0980-\u09ff]/);
  await expect(page.locator(".page-intro")).toContainText("60 minutes");
  await page.locator(".lang-switch").click();
  await expect(page.locator("h1")).toHaveText("টায়ার পরীক্ষা");
  const banglaHours = page.locator(".notice").filter({ hasText: "বুকিংয়ের সময়" });
  await expect(banglaHours).toContainText("সোমবার");
  await expect(banglaHours).toContainText("রবিবার");
  await expect(banglaHours).not.toContainText("Monday");
});
