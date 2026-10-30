import { test, expect } from "@playwright/test";
import { localFixture } from "./local-fixture";

test("partner can browse catalog pages and Dhaka coverage spans the district", async ({
  page,
  context,
}) => {
  const username = `qa_pager_${Date.now()}`;
  const csrf = await (await context.request.get("/api/v1/auth/csrf/")).json();
  expect(
    (
      await context.request.post("/api/v1/auth/register/", {
        headers: { "X-CSRFToken": csrf.csrfToken },
        data: {
          username,
          email: `${username}@example.invalid`,
          first_name: "DEMO QA",
          password: "Local-pagination-test-2026!",
        },
      })
    ).status(),
  ).toBe(201);
  localFixture(`
from django.conf import settings
from django.contrib.auth import get_user_model
from apps.catalog.models import Division,Organization,Offering
assert settings.DEBUG
user=get_user_model().objects.get(username='${username}')
division=Division.objects.get(slug='shop')
org=Organization.objects.create(name='DEMO QA Pager ${username}',division=division,owner=user,approved=True,area='Dhanmondi')
for index in range(1,26):
 Offering.objects.create(name='DEMO Pager '+str(index),name_bn='ডেমো পেজার '+str(index),sku='${username}-'+str(index),slug='${username}-'+str(index),division=division,organization=org,price=100,stock=5)
`);
  try {
    await page.goto("/portal");
    await page.getByRole("button", { name: "ক্যাটালগ", exact: true }).click();
    const offerings = page
      .locator(".record h3")
      .filter({ hasText: "DEMO Pager" });
    await expect(offerings).toHaveCount(24);
    const pages = page.getByRole("navigation", {
      name: "Partner catalog pages",
    });
    await pages.getByRole("button", { name: "পরের পৃষ্ঠা" }).click();
    await expect(offerings).toHaveCount(1);
    await expect(offerings.first()).toContainText("DEMO Pager 1");
    await expect(
      pages.getByRole("button", { name: "পরের পৃষ্ঠা" }),
    ).toBeDisabled();
    await pages.getByRole("button", { name: "আগের পৃষ্ঠা" }).click();
    await expect(offerings).toHaveCount(24);
    const areas: string[] = [];
    let number = 1,
      more = true;
    while (more) {
      const response = await context.request.get(
        `/api/v1/areas/?division=delivery&page=${number++}`,
      );
      expect(response.status()).toBe(200);
      const data = await response.json();
      areas.push(...data.results.map((area: { name: string }) => area.name));
      more = !!data.next;
    }
    for (const name of [
      "Dhanmondi",
      "Uttara Sector 18",
      "Aminbazar",
      "Savar",
      "Dhamrai",
      "Keraniganj",
      "Nawabganj",
      "Dohar",
    ]) {
      expect(areas).toContain(name);
    }
    expect(areas.length).toBeGreaterThanOrEqual(152);
  } finally {
    localFixture(`
from django.contrib.auth import get_user_model
from apps.catalog.models import Offering,Organization
Offering.objects.filter(organization__owner__username='${username}').update(active=False)
Organization.objects.filter(owner__username='${username}').update(approved=False)
get_user_model().objects.filter(username='${username}').update(is_active=False)
`);
  }
});
