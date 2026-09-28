import { expect, test, type Page } from '@playwright/test';

async function openFirstTree(page: Page) {
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await page.getByTestId('toggle-quest-list-btn').click();
  await page.getByTestId('quest-tree-t1_1').click();
  // The tree list shows the same words, so wait for the question card itself.
  await expect(page.getByRole('dialog')).toContainText('Simplify the fraction 4/8');
}

const standAt = (page: Page, x: number, z: number) =>
  page.evaluate(([px, pz]) => (window as any).__mg.store.setState({ avatarPosition: [px, 0, pz] }), [x, z]);

test('stepping onto an answer stone answers the question', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Phones answer by tapping the card; checked on desktop.');
  await openFirstTree(page);

  // The fox's question takes the number keys.
  await page.keyboard.press('3');
  await expect(page.getByTestId('confidence-very-sure')).toHaveClass(/btn-sun/);

  // Stone D is "1/8", the divide-only-the-top mistake.
  const stones = await page.evaluate(() => (window as any).__mg.store.getState().answerStones);
  expect(stones).toHaveLength(4);
  await standAt(page, stones[3].x, stones[3].z);

  await expect(page.getByText('Not quite.')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__mg.store.getState().attempts[0].choiceIndex)).toBe(3);
});

test('walking away from a tree puts its question away', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Checked on desktop.');
  await openFirstTree(page);
  const tree = await page.evaluate(() => (window as any).__mg.store.getState().selectedTree.position);

  await standAt(page, tree[0] - 12, tree[2] + 12);

  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__mg.store.getState().answerStones)).toBeNull();
});
