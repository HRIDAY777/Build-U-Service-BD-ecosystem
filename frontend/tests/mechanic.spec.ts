import { test, expect } from "@playwright/test";
test("mechanic vehicle details survive booking and language changes", async ({
  page,
  context,
}) => {
  const csrf = await (await context.request.get("/api/v1/auth/csrf/")).json(),
    username = "qa_mechanic_" + Date.now();
  expect(
    (
      await context.request.post("/api/v1/auth/register/", {
        headers: { "X-CSRFToken": csrf.csrfToken },
        data: {
          username,
          email: username + "@example.invalid",
          first_name: "QA Mechanic",
          password: "Local-mechanic-2026!",
        },
      })
    ).status(),
  ).toBe(201);
  const result = await (
    await context.request.get("/api/v1/offerings/?division=mechanic")
  ).json();
  const item = result.results.find(
    (o: { service_weekly_hours: object }) =>
      !Object.keys(o.service_weekly_hours || {}).length,
  );
  expect(item).toBeTruthy();
  await page.goto("/book/" + item.id);
  await expect(
    page.getByRole("group", { name: "যানবাহন ও সমস্যার তথ্য" }),
  ).toBeVisible();
  await page.locator(".lang-switch").click();
  await expect(
    page.getByRole("group", { name: "Vehicle and problem details" }),
  ).toBeVisible();
  for (const [name, value] of Object.entries({
    scheduled_at: new Date(Date.now() + 86400000 * 7)
      .toISOString()
      .slice(0, 16),
    recipient: "QA Mechanic",
    phone: "01712345678",
    line: "Demo house 12",
    vehicle_model: "Demo 150",
    registration: "DEMO-123",
    odometer_km: "12000",
    notes: "Brake noise",
  }))
    await page.locator("[name=" + name + "]").fill(value);
  await expect(
    page.locator('[name=area] option[value="Dhanmondi"]'),
  ).toHaveCount(1);
  for (const [name, value] of Object.entries({
    area: "Dhanmondi",
    vehicle_type: "motorbike",
    problem_type: "brakes",
    mobility: "unsafe",
  }))
    await page.locator("[name=" + name + "]").selectOption(value);
  await page
    .getByRole("button", { name: "Request booking", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  const record = page.locator(".record").filter({ hasText: "Demo 150" });
  await expect(record).toContainText("Request received");
  await expect(record.locator("[aria-current=step]")).toHaveText("1Request");
  await expect(record).toContainText("Brakes");
  await expect(record).toContainText("Unsafe to drive");
  await page.reload();
  await page.getByRole("button", { name: "Bookings", exact: true }).click();
  await expect(record).toContainText("DEMO-123");
  await page.locator(".lang-switch").click();
  await expect(record).toContainText("ব্রেক");
  await expect(record).toContainText("চালানো নিরাপদ নয়");
  const saved = await (await context.request.get("/api/v1/bookings/")).json();
  expect(saved.results[0].service_details.odometer_km).toBe(12000);
  await record
    .locator("input[type=file]")
    .setInputFiles({
      name: "problem.png",
      mimeType: "image/png",
      buffer: await page.screenshot(),
    });
  await record.getByRole("button", { name: "ছবি সংরক্ষণ" }).click();
  await expect(record.locator(".mechanic-photo img")).toBeVisible();
  const photo = await context.request.get(
    "/api/v1/bookings/" + saved.results[0].id + "/problem-photo/",
  );
  expect(photo.status()).toBe(200);
  expect(photo.headers()["content-type"]).toBe("image/jpeg");
  await record.getByRole("button", { name: "ছবি সরান" }).click();
  await expect(record.locator(".mechanic-photo img")).toHaveCount(0);
  await record.getByRole("button", { name: "বুকিংয়ের সময় পরিবর্তন" }).click();
  const newTime = new Date(Date.now() + 86400000 * 9)
    .toISOString()
    .slice(0, 16);
  await record
    .locator(".booking-reschedule input[type=datetime-local]")
    .fill(newTime);
  await record.getByRole("button", { name: "নতুন সময় সংরক্ষণ" }).click();
  await expect(record.locator(".booking-reschedule")).toHaveCount(0);
  const updated = await (await context.request.get("/api/v1/bookings/")).json();
  expect(new Date(updated.results[0].scheduled_at).getTime()).toBe(
    new Date(newTime + "+06:00").getTime(),
  );
  let status = "waiting_for_parts";
  await page.route("**/api/v1/bookings/", (route) =>
    route.fulfill({
      json: { ...saved, results: [{ ...saved.results[0], status }] },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [value, label] of [
    ["waiting_for_parts", "যন্ত্রাংশের অপেক্ষায়"],
    ["cancelled", "বুকিং বাতিল হয়েছে"],
    ["failed", "কাজ সম্পন্ন করা যায়নি"],
    ["completed", "কাজ সম্পন্ন হয়েছে"],
  ]) {
    status = value;
    await page.getByRole("button", { name: "রিফ্রেশ", exact: true }).click();
    await expect(record.locator(".mechanic-progress")).toContainText(label);
    await expect(record.locator("[aria-current=step]")).toHaveCount(
      value === "cancelled" || value === "failed" ? 0 : 1,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("mechanic landing shows bookable services on mobile in both languages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mechanic");
  await expect(page.locator(".offering-card").first()).toBeVisible();
  await expect(page.locator("h1")).toContainText("যানবাহনের যত্ন");
  await page.locator(".lang-switch").click();
  await expect(page.locator("h1")).toContainText("Vehicle care");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("assigned mechanic can record and view the work report", async ({
  page,
}) => {
  let report = {
    diagnosis: "",
    work_performed: "",
    parts_used: "",
    follow_up: "",
  };
  await page.route("**/api/v1/auth/me/", (r) =>
    r.fulfill({
      json: {
        id: 99999,
        username: "QA",
        first_name: "QA",
        roles: ["Provider"],
      },
    }),
  );
  await page.route("**/api/v1/bookings/provider_profile/", (r) =>
    r.fulfill({
      json: {
        name: "QA mechanic",
        available: true,
        active_jobs: 1,
        completed_jobs: 0,
        failed_jobs: 0,
      },
    }),
  );
  await page.route("**/api/v1/bookings/?*", (r) =>
    r.fulfill({
      json: {
        count: 1,
        next: null,
        results: [
          {
            id: "qa-mechanic-job",
            service: "Bike inspection",
            scheduled_at: "2026-12-01T10:00:00+06:00",
            duration_minutes: 60,
            status: "in_progress",
            address: {
              recipient: "QA",
              phone: "01712345678",
              line: "Demo house",
              area: "Dhaka",
            },
            notes: "Brake noise",
            service_details: {
              vehicle_type: "motorbike",
              vehicle_model: "Demo 150",
              problem_type: "brakes",
              mobility: "unsafe",
            },
            mechanic_report: report,
            available_actions: ["completed"],
          },
        ],
      },
    }),
  );
  await page.route(
    "**/api/v1/bookings/qa-mechanic-job/mechanic_report/",
    (r) => {
      expect(r.request().method()).toBe("PUT");
      report = r.request().postDataJSON();
      return r.fulfill({ json: { mechanic_report: report } });
    },
  );
  await page.goto("/provider");
  await expect(
    page.getByRole("heading", { name: "QA mechanic", exact: true }),
  ).toBeVisible();
  await page.locator(".lang-switch").click();
  await page.getByLabel("Diagnosis", { exact: true }).fill("Worn brake cable");
  await page
    .getByLabel("Work performed", { exact: true })
    .fill("Cable replaced and tested");
  await page.getByLabel("Parts used", { exact: true }).fill("Brake cable");
  await page.getByLabel("Follow-up", { exact: true }).fill("Recheck next week");
  await page
    .getByRole("button", { name: "Save work report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mechanic work report", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mechanic-summary").last()).toContainText(
    "Cable replaced and tested",
  );
  expect(report.parts_used).toBe("Brake cable");
});

test("service search works across languages and sort and reset preserve the listing", async ({
  page,
  context,
}) => {
  const data = await (
    await context.request.get("/api/v1/offerings/?division=mechanic")
  ).json();
  await page.goto("/mechanic");
  const search = page.getByRole("searchbox", { name: "মেকানিক সেবা খুঁজুন" });
  await search.fill("ব্রেক");
  await expect(page.locator(".offering-card").first()).toContainText("ব্রেক");
  await page.locator(".lang-switch").click();
  await expect(
    page.getByRole("searchbox", { name: "Search mechanic services" }),
  ).toHaveValue("ব্রেক");
  await expect(page.locator(".offering-card").first()).toContainText(/brake/i);
  await page
    .getByRole("searchbox", { name: "Search mechanic services" })
    .fill("no-such-service-qa");
  await expect(
    page.getByRole("heading", { name: "No matching services" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Sort services" })
    .selectOption("price_low");
  const first = [...data.results].sort(
    (a, b) => Number(a.price) - Number(b.price),
  )[0];
  await expect(
    page.locator(".offering-card").first().locator("a").first(),
  ).toHaveAttribute("href", "/catalog/" + first.id);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Sort services" }),
  ).toHaveValue("recommended");
  if (data.results.length > 8) {
    await expect(page.locator(".offering-card")).toHaveCount(8);
    await page
      .getByRole("button", { name: "Show more services", exact: true })
      .click();
    await expect(page.locator(".offering-card")).toHaveCount(
      Math.min(16, data.results.length),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
