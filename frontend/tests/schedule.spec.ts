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

test("owner hours reject closed bookings and provider leave saves with a private calendar", async ({
  page,
  context,
}) => {
  const username = `qa_schedule_${Date.now()}`;
  const csrf = await (await context.request.get("/api/v1/auth/csrf/")).json();
  expect(
    (
      await context.request.post("/api/v1/auth/register/", {
        headers: { "X-CSRFToken": csrf.csrfToken },
        data: {
          username,
          email: `${username}@example.invalid`,
          first_name: "DEMO QA",
          password: "Local-schedule-test-2026!",
        },
      })
    ).status(),
  ).toBe(201);
  const fixture = localFixture(`
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from apps.catalog.models import Division,Organization,Offering
assert settings.DEBUG
user=get_user_model().objects.get(username='${username}')
user.groups.add(Group.objects.get_or_create(name='Provider')[0])
division=Division.objects.get(slug='electrician')
merchant=Organization.objects.create(name='DEMO QA ${username}',owner=user,division=division,approved=True)
service=Offering.objects.create(name='DEMO QA Service',name_bn='ডেমো সেবা',slug='${username}',sku='${username}',organization=merchant,division=division,price=100,duration_minutes=90)
print('SERVICE_ID='+str(service.pk))
`);
  const id = fixture.match(/SERVICE_ID=(\d+)/)![1];
  const day = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
  try {
    await page.goto("/portal");
    await page.getByRole("button", { name: "ক্যাটালগ", exact: true }).click();
    await page.getByRole("button", { name: /Manage schedule/ }).click();
    const editor = page.locator('section[aria-label="Schedule settings"]');
    await expect(editor.getByLabel(/Duration/)).toHaveValue("90");
    await editor.getByLabel(/Use weekly hours/).check();
    await editor.getByLabel(/Leave date/).fill(day);
    await editor.getByRole("button", { name: /Add leave/ }).click();
    await editor.getByRole("button", { name: /Save schedule/ }).click();
    await expect(editor.getByRole("status")).toContainText("Schedule saved");
    await page.goto(`/book/${id}`);
    await expect(page.getByText(/Closed dates:/)).toContainText(day);
    await page.locator('[name="scheduled_at"]').fill(`${day}T10:00`);
    await page.locator('[name="recipient"]').fill("Demo customer");
    await page.locator('[name="phone"]').fill("01712345678");
    await page.locator('[name="area"]').selectOption("Dhanmondi");
    await page.locator('[name="line"]').fill("Demo road");
    await page.getByRole("button", { name: /Request booking/ }).click();
    await expect(page.locator(".error")).toContainText("Service is closed");
    await page.goto("/provider");
    await page.getByRole("button", { name: /Manage schedule/ }).click();
    const providerEditor = page.locator(
      'section[aria-label="Schedule settings"]',
    );
    await providerEditor.getByLabel(/Leave date/).fill(day);
    await providerEditor.getByRole("button", { name: /Add leave/ }).click();
    await providerEditor.getByRole("button", { name: /Save schedule/ }).click();
    await expect(providerEditor.getByRole("status")).toContainText(
      "Schedule saved",
    );
    const calendar = page.locator('section[aria-label="Work calendar"]');
    await calendar.getByLabel(/Start of seven days/).fill(day);
    await calendar.getByRole("button", { name: /View calendar/ }).click();
    await expect(calendar).toContainText("No active appointments");
    await page.reload();
    await page.getByRole("button", { name: /Manage schedule/ }).click();
    await expect(providerEditor).toContainText(day);
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

test("customer selects a duration-aware service time and refreshes changed hours", async ({
  page,
}) => {
  const key = `qa_times_${Date.now()}`;
  const fixture = localFixture(`
from django.conf import settings
from apps.catalog.models import Division,Offering
assert settings.DEBUG
division=Division.objects.get(slug='electrician')
service=Offering.objects.create(name='DEMO QA Times',name_bn='ডেমো সময়',slug='${key}',sku='${key}',division=division,price=100,duration_minutes=90,service_weekly_hours={str(day):[{'open':'09:00','close':'12:00'}] for day in range(7)})
print('SERVICE_ID='+str(service.pk))
`);
  const id = fixture.match(/SERVICE_ID=(\d+)/)![1];
  const day = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
  try {
    await page.goto(`/book/${id}`);
    const input = page.locator('[name="scheduled_at"]');
    await input.fill(`${day}T10:00`);
    const times = page.locator('section[aria-label="Suggested booking times"]');
    await times.getByRole("button", { name: /View day times/ }).click();
    await expect(
      times.getByRole("button", { name: "10:30–12:00", exact: true }),
    ).toBeVisible();
    await expect(
      times.getByRole("button", { name: "10:45–12:15", exact: true }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await times
      .getByRole("button", { name: "09:15–10:45", exact: true })
      .click();
    await expect(input).toHaveValue(`${day}T09:15`);
    localFixture(`
from apps.catalog.models import Offering
Offering.objects.filter(sku='${key}').update(service_leave_dates=['${day}'])
`);
    await times.getByRole("button", { name: /View day times/ }).click();
    await expect(times.getByRole("status")).toContainText("No service times");
    localFixture(`
from apps.catalog.models import Offering
Offering.objects.filter(sku='${key}').update(service_leave_dates=[],service_weekly_hours={})
`);
    await times.getByRole("button", { name: /View day times/ }).click();
    await expect(times.getByRole("status")).toContainText(
      "Schedule is unconfigured",
    );
  } finally {
    localFixture(`
from apps.catalog.models import Offering
Offering.objects.filter(sku='${key}').update(active=False)
`);
  }
});
