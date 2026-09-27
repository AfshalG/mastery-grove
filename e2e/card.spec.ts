import { expect, test } from '@playwright/test';

test('a serve-the-cake question shows an uncut cake, not the answer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Checked once on desktop.');
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await page.getByTestId('toggle-quest-list-btn').click();
  await page.getByTestId('quest-tree-t1_serve').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Serve');
  await expect(dialog.locator('svg path[fill="#f472b6"]')).toHaveCount(0);
});

test('a two-cake question fits a phone screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone only.');
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await expect(page.locator('canvas').first()).toBeVisible();

  // Open a comparison question directly; its grove is still locked at the start.
  await page.evaluate(() => {
    const store = (window as any).__mg.store;
    const tree = store.getState().trees.find((t: any) => t.visual?.kind === 'two-cakes');
    store.setState({ selectedTree: tree });
  });

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('VS');
  const box = await dialog.boundingBox();
  const width = await page.evaluate(() => window.innerWidth);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
