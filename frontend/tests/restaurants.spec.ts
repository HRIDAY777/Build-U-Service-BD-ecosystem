import { test, expect } from "@playwright/test";
import { localFixture } from "./local-fixture";

test("restaurant owner controls ordering and customer sees the saved rules", async ({
  page,
  context,
}) => {
  const username = `qa_restaurant_${Date.now()}`;
  const csrf = await (await context.request.get("/api/v1/auth/csrf/")).json();
  const response = await context.request.post("/api/v1/auth/register/", {
    headers: { "X-CSRFToken": csrf.csrfToken },
    data: {
      username,
      email: `${username}@example.invalid`,
      first_name: "DEMO QA Restaurant",
      password: "Local-restaurant-test-2026!",
    },
  });
  expect(response.status()).toBe(201);
  localFixture(`
from django.conf import settings
from django.contrib.auth import get_user_model
from apps.catalog.models import Division, Organization
assert settings.DEBUG
user = get_user_model().objects.get(username='${username}', email='${username}@example.invalid')
food = Division.objects.get(slug='food')
Organization.objects.create(name='DEMO QA Restaurant ${username}', owner=user, division=food, approved=True, area='Dhanmondi')
`);
  try {
    await page.goto("/portal");
    await page.getByRole("button", { name: "ক্যাটালগ", exact: true }).click();
    const settings = page.locator("article.record").filter({
      has: page.getByRole("heading", {
        name: `DEMO QA Restaurant ${username}`,
        exact: true,
      }),
    });
    await settings.locator('[name="minimum_order"]').fill("450");
    await settings.locator('[name="preparation_minutes"]').fill("45");
    await settings.getByLabel("নতুন অর্ডার নিন", { exact: true }).uncheck();
    await settings
      .getByLabel("সাপ্তাহিক সময়সূচি ব্যবহার করুন", { exact: true })
      .check();
    const monday = settings
      .locator("fieldset.field-group")
      .filter({ has: page.getByText("সোমবার", { exact: true }) });
    await monday.getByRole("button", { name: "খোলার সময় যোগ করুন" }).click();
    await monday.getByLabel("খোলার সময়", { exact: true }).fill("22:00");
    await monday.getByLabel("বন্ধের সময়", { exact: true }).fill("02:00");
    await settings
      .getByRole("button", { name: "রেস্টুরেন্ট সেটিংস সংরক্ষণ" })
      .click();
    await expect(settings.getByRole("status")).toContainText(
      "সেটিংস সংরক্ষিত হয়েছে",
    );
    await expect(settings).toContainText("অর্ডার সাময়িক বন্ধ");
    await page.reload();
    await page.getByRole("button", { name: "ক্যাটালগ", exact: true }).click();
    await expect(settings.locator('[name="minimum_order"]')).toHaveValue(
      "450.00",
    );
    await expect(
      settings.getByLabel("নতুন অর্ডার নিন", { exact: true }),
    ).not.toBeChecked();
    const listed = await (
      await context.request.get("/api/v1/partner-restaurants/")
    ).json();
    const restaurant = listed.results.find(
      (item: { name: string }) =>
        item.name === `DEMO QA Restaurant ${username}`,
    );
    expect(restaurant.weekly_hours["0"]).toEqual([
      { open: "22:00", close: "02:00" },
    ]);
    await monday.getByLabel("২৪ ঘণ্টা খোলা", { exact: true }).check();
    await settings
      .getByRole("button", { name: "রেস্টুরেন্ট সেটিংস সংরক্ষণ" })
      .click();
    await expect(settings.getByRole("status")).toContainText(
      "সেটিংস সংরক্ষিত হয়েছে",
    );
    const allDay = await (
      await context.request.get(`/api/v1/partner-restaurants/${restaurant.id}/`)
    ).json();
    expect(allDay.weekly_hours["0"]).toEqual([
      { open: "00:00", close: "24:00" },
    ]);
    await page.goto(`/catalog?division=food&organization=${restaurant.id}`);
    await expect(
      page.getByLabel("Restaurant ordering information"),
    ).toContainText("অর্ডার সাময়িক বন্ধ");
    await expect(
      page.getByLabel("Restaurant ordering information"),
    ).toContainText("450.00");
  } finally {
    localFixture(`
from django.contrib.auth import get_user_model
from apps.catalog.models import Organization
user = get_user_model().objects.get(username='${username}', email='${username}@example.invalid')
Organization.objects.filter(owner=user, name='DEMO QA Restaurant ${username}').update(approved=False)
user.is_active = False
user.save(update_fields=['is_active'])
`);
  }
});

