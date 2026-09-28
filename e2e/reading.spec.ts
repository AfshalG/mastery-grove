import { expect, test, type Page } from '@playwright/test';

// The reading world: a reading topic grows the autumn forest, with passages to read and reading mix-ups.
const state = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState());
const call = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, a]) => (window as any).__mg.store.getState()[name as string](...(a as unknown[])), [fn, args] as const);

async function answerRight(page: Page, treeId: string) {
  const tree = (await state(page)).trees.find((t: any) => t.id === treeId);
  await call(page, 'answerTreeQuestion', treeId, tree.answerIndex, 'Fairly sure');
  await expect.poll(async () => (await state(page)).isDiagnosing).toBe(false);
  await call(page, 'dismissFeedback');
}

test.describe('reading world', () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name === 'phone', 'Checked on desktop; the phone layout is shared.'));

  test('a reading topic grows the autumn reading forest, with a passage to read', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByLabel('Topic').fill('Primary 4 English: Reading');
    await page.getByTestId('grow-world-btn').click();
    await expect(page.locator('[data-skin="autumn"]')).toBeVisible({ timeout: 20_000 });

    const world = (await state(page)).world;
    expect(world.subject).toBe('Primary 4 English: Reading');
    expect(world.trees.every((t: any) => t.passage?.text)).toBe(true);

    await page.getByTestId('toggle-quest-list-btn').click();
    await page.getByTestId('quest-tree-rd1_1').click();
    await expect(page.getByTestId('passage-card')).toContainText('Flowers of the night');
    await expect(page.getByTestId('passage-card')).toContainText('moonflower');
  });

  test('a reading mix-up gets a reading answer back from Byte', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByTestId('play-reading-btn').click();
    await page.getByTestId('toggle-quest-list-btn').click();
    await page.getByTestId('quest-tree-rd1_1').click();
    await expect(page.getByTestId('passage-card')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('confidence-very-sure').click();
    await page.getByTestId('choice-1').click(); // "Moonflowers have white petals": a detail

    await expect(page.getByText(/a detail that stood out/)).toBeVisible();
    expect((await state(page)).attempts[0]).toMatchObject({ correct: false, misconceptionId: 'rm1' });
  });

  test('it plays through: grow the grove, then explain the main idea to Mia', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByTestId('play-reading-btn').click();
    for (const id of ['rd1_1', 'rd1_2', 'rd1_3']) await answerRight(page, id);
    expect(await call(page, 'getUnlockedConcepts')).toContain('r2');

    await page.getByTestId('toggle-quest-list-btn').click();
    await page.getByTestId('quest-mia-r1').click();
    await expect(page.getByTestId('mia-says')).toContainText('first sentence', { timeout: 20_000 });
    await page
      .getByTestId('mia-text')
      .fill('The main idea is what the whole passage is about. Check that most sentences fit it. The first sentence is only a hook question.');
    await page.getByTestId('mia-send').click();
    await expect(page.getByTestId('mia-got-it')).toBeVisible();
  });
});
