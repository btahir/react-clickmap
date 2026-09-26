import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("real capture, inspect, export, cohort invalidation and import", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const studio = page.getByRole("region", { name: "Clickmap Studio" });
  await expect(studio.locator(".cm-stat strong").nth(1)).toHaveText("24");
  await page.getByRole("button", { name: "Capture my session" }).click();
  await page.getByRole("button", { name: "Start a project" }).click();
  await expect(studio.locator(".cm-stat strong").first()).not.toHaveText("0", { timeout: 10000 });
  await studio
    .getByRole("button", { name: '[data-clickmap-id="start-project"]', exact: true })
    .click();
  await expect(studio.getByRole("status")).toContainText("Located");
  await studio.getByRole("button", { name: "Show current-page heatmap" }).click();
  await expect(page.getByRole("button", { name: "Close heatmap · Esc" })).toBeVisible();
  for (const name of ["Markdown", "CSV", "Overlay PNG"]) {
    const output = page.waitForEvent("download");
    await studio.getByRole("button", { name, exact: true }).click();
    const bytes = await readFile((await (await output).path())!);
    if (name === "Overlay PNG") expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    else if (name === "CSV") expect(bytes.toString()).toContain('"target","clicks"');
    else expect(bytes.toString()).toContain("# Clickmap evidence");
  }
  const download = page.waitForEvent("download");
  await studio.getByRole("button", { name: "Export JSON", exact: true }).click();
  const path = await (await download).path();
  const json = JSON.parse(await readFile(path!, "utf8"));
  expect(json.schema).toBe("react-clickmap/evidence");
  expect(json.source).toBe("captured");
  expect(json.events.length).toBeGreaterThan(0);
  await studio.getByLabel("Page path").fill("/not-this-page");
  await expect(page.getByRole("button", { name: "Close heatmap · Esc" })).toHaveCount(0);
  await expect(studio.getByRole("button", { name: "Overlay PNG" })).toBeDisabled();
  await expect(studio.getByText("No events match this cohort.")).toBeVisible();
  await studio.locator("input[type=file]").setInputFiles({
    name: "evidence.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(json)),
  });
  await expect(studio.getByText("Imported evidence", { exact: true })).toBeVisible();
  await expect(studio.getByRole("status")).toContainText("Nothing uploaded");
  expect(errors).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
});
test("DNT blocks collection; invalid imports are reported", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Capture my session" }).click();
  await page.getByRole("button", { name: "Start a project" }).click();
  const studio = page.getByRole("region", { name: "Clickmap Studio" });
  await page.waitForTimeout(3500);
  await expect(studio.locator(".cm-stat strong").first()).toHaveText("0");
  await studio.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(studio.getByRole("status")).toContainText("Invalid evidence");
});
test("docs have useful server text, canonical and working discovery routes", async ({
  request,
}) => {
  const res = await request.get("/docs/guides/measurement");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain("Measurement definitions");
  expect(html).toContain('rel="canonical"');
  for (const path of ["/robots.txt", "/sitemap.xml", "/llms.txt"])
    expect((await request.get(path)).status()).toBe(200);
});
