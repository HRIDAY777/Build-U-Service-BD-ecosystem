import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

function localFixture(script: string) {
  const target = new URL(process.env.E2E_URL || "http://127.0.0.1:3000");
  if (!["127.0.0.1", "localhost"].includes(target.hostname))
    throw new Error("Restaurant fixture requires local test servers.");
  const root = path.resolve(process.cwd(), "..");
  const python = path.join(
    root,
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  return execFileSync(python, ["manage.py", "shell", "--command", script], {
    cwd: path.join(root, "backend"),
    encoding: "utf8",
    env: { ...process.env, DJANGO_DEBUG: "true" },
  });
}

test("food choices price distinct cart lines and preserve order details", async ({
  page,
  context,
}) => {
  const username = `qa_options_${Date.now()}`;
  const csrf = await (await context.request.get("/api/v1/auth/csrf/")).json();
  const response = await context.request.post("/api/v1/auth/register/", {
    headers: { "X-CSRFToken": csrf.csrfToken },
    data: {
      username,
      email: `${username}@example.invalid`,
      first_name: "DEMO QA",
      password: "Local-options-test-2026!",
    },
  });
  expect(response.status()).toBe(201);
  const fixture = localFixture(`
from django.conf import settings
from django.contrib.auth import get_user_model
from apps.catalog.models import Division,Organization,Offering,FoodOptionGroup,FoodOption
assert settings.DEBUG
user=get_user_model().objects.get(username='${username}')
food=Division.objects.get(slug='food')
merchant=Organization.objects.create(name='DEMO QA ${username}',owner=user,division=food,approved=True)
meal=Offering.objects.create(name='DEMO QA Meal',name_bn='ডেমো খাবার',slug='${username}',sku='${username}',organization=merchant,division=food,price=100,stock=10)
group=FoodOptionGroup.objects.create(offering=meal,name='Size',name_bn='সাইজ',min_choices=1,max_choices=1)
FoodOption.objects.create(group=group,name='Small',name_bn='ছোট',price=0)
FoodOption.objects.create(group=group,name='Large',name_bn='বড়',price=50)
print('MEAL_ID='+str(meal.pk))
`);
  const id = fixture.match(/MEAL_ID=(\d+)/)![1];
  try {
    await page.goto("/portal");
    await page.getByRole("button", { name: "ক্যাটালগ", exact: true }).click();
    await page.getByRole("button", { name: /Manage food options/ }).click();
    const editor = page.locator('section[aria-label="Food options"]');
    await expect(
      editor.getByLabel("English name", { exact: true }),
    ).toHaveValue("Size");
    await editor.getByRole("button", { name: /Save options/ }).click();
    await expect(editor.getByRole("status")).toContainText("Saved");
    await page.goto(`/catalog/${id}`);
    const add = page.getByRole("button", { name: /Add to bag/ });
    await expect(add).toBeDisabled();
    await page.getByLabel(/ছোট/).check();
    await add.click();
    await page.getByLabel(/বড়/).check();
    await add.click();
    await page.goto("/checkout");
    await expect(page.locator(".cart-line")).toHaveCount(2);
    await page.locator('[name="recipient"]').fill("Demo customer");
    await page.locator('[name="phone"]').fill("01712345678");
    await page.locator('[name="area"]').selectOption("Dhanmondi");
    await page.locator('[name="line"]').fill("Demo road");
    await page.getByRole("button", { name: /Review total/ }).click();
    await expect(
      page.getByText("Subtotal: ৳250.00", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Confirm order/ }).click();
    await expect(page).toHaveURL(/account/);
    await expect(page.locator(".record").first()).toContainText("ছোট");
    await expect(page.locator(".record").first()).toContainText("বড়");
  } finally {
    localFixture(`
from django.contrib.auth import get_user_model
from apps.catalog.models import Organization,Offering
Offering.objects.filter(sku='${username}').update(active=False)
Organization.objects.filter(owner__username='${username}').update(approved=False)
get_user_model().objects.filter(username='${username}').update(is_active=False)
`);
  }
});
