import { expect, test, type Page } from '@playwright/test';

// These drive the store directly (through ?debug=1) to test the learner model's rules in the running game.
const state = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState());
const answer = (page: Page, treeId: string, choice: number) =>
  page.evaluate(([id, c]) => (window as any).__mg.store.getState().answerTreeQuestion(id, c, 'Fairly sure'), [treeId, choice] as const);
const act = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, a]) => (window as any).__mg.store.getState()[name as string](...(a as unknown[])), [fn, args] as const);
const treeState = async (page: Page, id: string) => (await state(page)).trees.find((t: any) => t.id === id)?.state;

async function start(page: Page) {
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await expect(page.locator('canvas').first()).toBeVisible();
}

test.describe('learner loop', () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name === 'phone', 'Rules are the same on every screen.'));

  test('a tree answered right stays grown and cannot be answered again', async ({ page }) => {
    await start(page);
    await answer(page, 't1_1', 0); // 1/2 is right
    await act(page, 'dismissFeedback');
    const tree = (await state(page)).trees.find((t: any) => t.id === 't1_1');

    await act(page, 'openTree', tree);

    expect((await state(page)).selectedTree).toBeNull();
    await expect(page.getByText('You already grew this one.')).toBeVisible();
  });

  test('a missed tree comes back as a sapling after two other answers, and fixing it regrows the tree', async ({ page }) => {
    await start(page);
    await answer(page, 't1_1', 3); // 1/8: wrong
    await expect.poll(async () => (await state(page)).isDiagnosing).toBe(false);
    await act(page, 'dismissFeedback');

    // The wilted tree itself stays closed.
    await act(page, 'openTree', (await state(page)).trees.find((t: any) => t.id === 't1_1'));
    expect((await state(page)).selectedTree).toBeNull();

    // Two other answers later, its sapling opens.
    await answer(page, 't1_2', 0);
    await act(page, 'dismissFeedback');
    await answer(page, 't1_3', 0);
    await act(page, 'dismissFeedback');
    const sapling = (await state(page)).trees.find((t: any) => t.isSapling && t.sourceTreeId === 't1_1');
    expect(sapling.answersSinceMiss).toBeGreaterThanOrEqual(2);

    await answer(page, sapling.id, sapling.answerIndex);

    expect(await treeState(page, sapling.id)).toBe('regrown');
    expect(await treeState(page, 't1_1')).toBe('regrown');
  });

  test('progress survives a reload, with a welcome back', async ({ page }) => {
    await start(page);
    await answer(page, 't1_1', 3);
    await expect.poll(async () => (await state(page)).thoughtProcessRecords.length).toBe(1);
    await page.waitForTimeout(600); // the save runs a moment after the change

    await start(page);

    const s = await state(page);
    expect(s.attempts).toHaveLength(1); // saved once, not twice
    expect(s.thoughtProcessRecords).toHaveLength(1);
    expect(s.trees.find((t: any) => t.id === 't1_1').state).toBe('withered');
    await expect(page.getByTestId('dismiss-welcome-back')).toBeVisible();
  });
});
