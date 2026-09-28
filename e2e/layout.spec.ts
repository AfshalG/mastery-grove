import { expect, test, type Page } from '@playwright/test';

// Spacing in the running game, read from the store through the ?debug=1 hook.
async function spacing(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__mg.store.getState();
    const trees = s.trees.map((t: any) => ({ id: t.id, x: t.position[0], z: t.position[2] }));
    let minTreeGap = Infinity;
    trees.forEach((a: any, i: number) =>
      trees.slice(i + 1).forEach((b: any) => (minTreeGap = Math.min(minTreeGap, Math.hypot(a.x - b.x, a.z - b.z))))
    );
    const minSignGap = Math.min(
      ...s.layout.groves.flatMap((g: any) => trees.map((t: any) => Math.hypot(t.x - g.sign.x, t.z - g.sign.z)))
    );
    return { count: trees.length, minTreeGap, minSignGap, groves: s.layout.groves.map((g: any) => ({ x: g.sign.x, z: g.sign.z })) };
  });
}

test('trees keep clear of each other and the signs, even after saplings and made-for-you trees grow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Layout is the same on every screen; checked once.');
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await expect(page.locator('canvas').first()).toBeVisible();

  const start = await spacing(page);
  expect(start.count).toBe(15);
  expect(start.minTreeGap).toBeGreaterThanOrEqual(3);
  expect(start.minSignGap).toBeGreaterThan(3);

  // A wrong answer plants a sapling; confirming the guess plants two made-for-you trees.
  await page.getByTestId('toggle-quest-list-btn').click();
  await page.getByTestId('quest-tree-t1_1').click();
  await page.getByTestId('confidence-very-sure').click();
  await page.getByTestId('choice-3').click();
  await page.getByTestId('confirm-thought-yes').click();
  await expect.poll(async () => (await spacing(page)).count).toBe(18);

  const after = await spacing(page);
  expect(after.minTreeGap).toBeGreaterThanOrEqual(3);
  expect(after.minSignGap).toBeGreaterThan(3);
  await page.getByTestId('continue-btn').click();

  // A look at each grove from the trail, for the record.
  for (const [i, sign] of start.groves.entries()) {
    await page.evaluate(
      ([x, z]) => (window as any).__mg.store.setState({ avatarPosition: [x, 0, z], targetPosition: null, targetTreeToOpen: null }),
      [0, sign.z + 9]
    );
    await page.waitForTimeout(1500); // let the chase camera settle
    await page.screenshot({ path: testInfo.outputPath(`grove-${i + 1}.png`) });
  }
});
