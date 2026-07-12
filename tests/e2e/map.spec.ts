import { expect, test } from "@playwright/test";

// C.1 AC: exactly 15 metro paths (the fixture map's full join — pinned at the
// Phase C plan checkpoint; the >500 live-map sanity check lives in D.1).
test("choropleth renders all 15 fixture metros and click reveals the ratio in-page", async ({
  page,
}) => {
  await page.goto("/");

  const paths = page.locator("path[data-region-id]");
  await expect(paths).toHaveCount(15);

  // Click reveals the metro's ratio in the pinned panel (NOT navigation —
  // metro pages arrive in C.2).
  const first = paths.first();
  const regionId = await first.getAttribute("data-region-id");
  await first.click({ force: true });

  const panel = page.locator("#metro-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/price-to-rent ratio \d+(\.\d+)?/);
  expect(regionId).toMatch(/^\d+$/);

  // National-view screenshot for the SUPERVISED verification pass.
  await page.screenshot({
    path: "test-results/national-view.png",
    fullPage: true,
  });
});

test("metro search filters the index without hiding matches", async ({
  page,
}) => {
  await page.goto("/");

  const items = page.locator("#metro-list li");
  await expect(items).toHaveCount(15);

  await page.locator("#metro-search").fill("atlanta");
  await expect(page.locator("#metro-list li:visible")).toHaveCount(1);
  await expect(page.locator("#metro-list li:visible")).toContainText("Atlanta");

  await page.locator("#metro-search").fill("");
  await expect(page.locator("#metro-list li:visible")).toHaveCount(15);
});
