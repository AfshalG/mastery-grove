import { expect, test, type Page } from '@playwright/test';

// The retention loop in the running game, driven through ?debug=1.
const state = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState());
const call = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, a]) => (window as any).__mg.store.getState()[name as string](...(a as unknown[])), [fn, args] as const);

/** Answers a tree right (or wrong) through the store, then closes the feedback. */
async function answer(page: Page, treeId: string, right: boolean, confidence = 'Fairly sure') {
  const tree = (await state(page)).trees.find((t: any) => t.id === treeId);
  if (tree.kind === 'serve') {
    const { targetNumerator, targetDenominator, totalSlices } = tree.serveConfig;
    const good = (targetNumerator / targetDenominator) * totalSlices;
    await call(page, 'answerServeQuestion', treeId, right ? good : good + 1, confidence);
  } else {
    await call(page, 'answerTreeQuestion', treeId, right ? tree.answerIndex : (tree.answerIndex + 1) % tree.choices.length, confidence);
  }
  await expect.poll(async () => (await state(page)).isDiagnosing).toBe(false);
  await call(page, 'dismissFeedback');
}

async function start(page: Page) {
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await expect(page.locator('canvas').first()).toBeVisible();
}

test.describe('retention loop', () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name === 'phone', 'Rules are the same on every screen.'));

  test('a grown tree comes back next session as a memory check, answered from memory', async ({ page }) => {
    await start(page);
    await answer(page, 't1_1', true);
    expect((await state(page)).cards.t1_1.box).toBe(2);

    // The teacher starts the next session.
    await page.getByTestId('teacher-btn').click();
    await page.getByTestId('next-session-btn').click();
    await expect(page.getByTestId('next-session-btn')).toContainText('Session 2 started');
    await page.getByTestId('back-to-forest-btn').click();

    expect((await state(page)).trees.find((t: any) => t.id === 't1_1').memoryDue).toBe(true);
    await page.getByTestId('toggle-quest-list-btn').click();
    await expect(page.getByTestId('quest-tree-t1_1')).toContainText('Memory check');

    // From memory: the choices wait until the kid has an answer in mind.
    await page.getByTestId('quest-tree-t1_1').click();
    await expect(page.getByTestId('reveal-choices-btn')).toBeVisible();
    await expect(page.getByTestId('choice-0')).toHaveCount(0);
    await page.getByTestId('reveal-choices-btn').click();
    await page.getByTestId('confidence-very-sure').click();
    await page.getByTestId('choice-0').click(); // 1/2

    await expect(page.getByText('You were sure, and you were right.')).toBeVisible();
    const s = await state(page);
    expect(s.cards.t1_1.box).toBe(3);
    expect(s.trees.find((t: any) => t.id === 't1_1').memoryDue).toBe(false);
  });

  test('the next grove opens once 60% of this one is grown', async ({ page }) => {
    await start(page);
    await answer(page, 't1_1', true);
    await answer(page, 't1_2', true);
    expect(await call(page, 'getUnlockedConcepts')).toEqual(['c1']);

    await answer(page, 't1_3', true);

    expect(await call(page, 'getUnlockedConcepts')).toContain('c2');
  });

  test('finishing a grove asks the kid to reflect, and answers a doubtful kid kindly', async ({ page }) => {
    await start(page);
    for (const id of (await state(page)).trees.filter((t: any) => t.conceptId === 'c1').map((t: any) => t.id)) {
      await answer(page, id, true);
    }

    await expect(page.getByText('How well do you know it now?')).toBeVisible();
    await page.getByTestId('reflect-1').click(); // "Still confused", with every answer right
    await page.getByTestId('reflect-note').fill('Top and bottom change together.');
    await page.getByTestId('reflect-save').click();
    await expect(page.getByText(/You know more than you think/)).toBeVisible();
    await page.getByTestId('reflect-done').click();

    await expect(page.getByText('How well do you know it now?')).toHaveCount(0);
    const [r] = (await state(page)).reflections;
    expect(r).toMatchObject({ conceptId: 'c1', rating: 1, note: 'Top and bottom change together.', accuracy: 1 });
  });

  test('a very-sure wrong answer is named as the moment to slow down', async ({ page }) => {
    await start(page);
    await call(page, 'answerTreeQuestion', 't1_1', 3, 'Very sure');

    await expect(page.getByText(/slow down and check/)).toBeVisible();
  });
});
